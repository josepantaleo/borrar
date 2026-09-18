const STORAGE_KEY = "ipem146_tab_tracking_state";
const MAX_PENDING_EVENTS = 500;
const HEARTBEAT_ALARM = "ipem146_tracking_heartbeat";
const SUPPORTED_ACTIVITY_HOSTS = [
  "localhost",
  "127.0.0.1",
  "ipem146js.web.app",
  "ipem146js.firebaseapp.com",
  "josepantaleo.github.io"
];

const emptyState = () => ({
  active: false,
  activityTabId: null,
  activityUrl: "",
  activityTitle: "",
  sectionId: "",
  sectionTitle: "",
  studentUid: "",
  studentEmail: "",
  classId: "",
  startedAt: "",
  lastHeartbeat: "",
  currentExcursionId: "",
  currentVisit: null,
  pendingEvents: []
});

let state = emptyState();
let stateReady = null;

function safeText(value, maxLength = 300) {
  return String(value || "").trim().slice(0, maxLength);
}

function domainFromUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return safeText(url.protocol.replace(":", "") || "navegador", 120);
    }
    return safeText(url.hostname.replace(/^www\./i, ""), 120);
  } catch {
    return "desconocido";
  }
}

async function pageKeyFromUrl(value) {
  const normalized = (() => {
    try {
      const url = new URL(value);
      url.hash = "";
      return url.href;
    } catch {
      return String(value || "");
    }
  })();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function newEventId() {
  return globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function loadState() {
  if (!stateReady) {
    stateReady = chrome.storage.local.get(STORAGE_KEY).then(result => {
      state = { ...emptyState(), ...(result[STORAGE_KEY] || {}) };
      if (!Array.isArray(state.pendingEvents)) state.pendingEvents = [];
      return state;
    });
  }
  return stateReady;
}

async function saveState() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

async function sendToActivity(message) {
  if (!Number.isInteger(state.activityTabId)) return false;
  try {
    await chrome.tabs.sendMessage(state.activityTabId, message);
    return true;
  } catch {
    return false;
  }
}

async function publishLiveStatus() {
  await loadState();
  state.lastHeartbeat = new Date().toISOString();
  await saveState();
  return sendToActivity({
    source: "ipem146-tab-tracker",
    type: "EXTENSION_LIVE_STATUS",
    status: getPublicStatus()
  });
}

async function queueOrSendEvent(event) {
  if (!state.pendingEvents.some(item => item.id === event.id)) {
    state.pendingEvents.push(event);
    state.pendingEvents = state.pendingEvents.slice(-MAX_PENDING_EVENTS);
    await saveState();
  }
  await sendToActivity({
    source: "ipem146-tab-tracker",
    type: "TAB_VISIT_COMPLETED",
    event
  });
}

async function flushPendingEvents() {
  if (!state.pendingEvents.length) return;
  for (const event of [...state.pendingEvents]) {
    const delivered = await sendToActivity({
      source: "ipem146-tab-tracker",
      type: "TAB_VISIT_COMPLETED",
      event
    });
    if (!delivered) break;
  }
}

async function finishCurrentVisit(returnedAt = new Date()) {
  const visit = state.currentVisit;
  if (!visit) return;
  state.currentVisit = null;
  const exitTime = new Date(visit.salidaEn);
  const durationSeconds = Number.isNaN(exitTime.getTime())
    ? 0
    : Math.max(0, Math.round((returnedAt.getTime() - exitTime.getTime()) / 1000));
  await queueOrSendEvent({
    ...visit,
    regresoEn: returnedAt.toISOString(),
    duracionSegundos: durationSeconds
  });
  await publishLiveStatus();
}

function createVisit(tab, startedAt, pageKey) {
  return {
    id: newEventId(),
    estudianteUid: state.studentUid,
    estudianteEmail: state.studentEmail,
    claseId: state.classId,
    salidaGrupoId: state.currentExcursionId,
    tituloOrigen: state.activityTitle,
    seccionOrigen: state.sectionId,
    seccionTitulo: state.sectionTitle,
    tituloDestino: safeText(tab.title || "Sin título"),
    dominioDestino: domainFromUrl(tab.url || ""),
    salidaEn: startedAt.toISOString(),
    regresoEn: null,
    duracionSegundos: null,
    destinationTabId: tab.id,
    destinationPageKey: pageKey,
    extensionVersion: chrome.runtime.getManifest().version
  };
}

async function processActiveTab(tabId) {
  await loadState();
  if (!state.active || !Number.isInteger(tabId)) return;

  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }

  const now = new Date();
  if (state.currentVisit && state.currentVisit.destinationTabId === tabId) {
    state.currentVisit.tituloDestino = safeText(tab.title || state.currentVisit.tituloDestino);
    state.currentVisit.dominioDestino = domainFromUrl(tab.url || "");
    await saveState();
    await publishLiveStatus();
    return;
  }

  await finishCurrentVisit(now);
  if (tabId === state.activityTabId) {
    state.currentExcursionId = "";
    await saveState();
    return;
  }

  if (!state.currentExcursionId) state.currentExcursionId = newEventId();
  state.currentVisit = createVisit(
    tab,
    now,
    await pageKeyFromUrl(tab.url || "")
  );
  await saveState();
  await publishLiveStatus();
}

async function startTracking(message, sender) {
  await loadState();
  if (!sender.tab?.id || !message.studentUid || !message.classId) {
    return { ok: false, error: "missing-session-data" };
  }

  const sameSession =
    state.active &&
    state.activityTabId === sender.tab.id &&
    state.studentUid === safeText(message.studentUid, 128) &&
    state.classId === safeText(message.classId, 120);
  if (sameSession) {
    state.activityTitle = safeText(message.activityTitle || sender.tab.title || state.activityTitle);
    state.sectionId = safeText(message.sectionId, 120);
    state.sectionTitle = safeText(message.sectionTitle, 200);
    state.studentEmail = safeText(message.studentEmail, 254);
    await saveState();
    await flushPendingEvents();
    await publishLiveStatus();
    return { ok: true, status: getPublicStatus() };
  }

  if (state.currentVisit) await finishCurrentVisit(new Date());
  state = {
    ...emptyState(),
    active: true,
    activityTabId: sender.tab.id,
    activityUrl: safeText(sender.tab.url || "", 1000),
    activityTitle: safeText(message.activityTitle || sender.tab.title || "Actividad educativa"),
    sectionId: safeText(message.sectionId, 120),
    sectionTitle: safeText(message.sectionTitle, 200),
    studentUid: safeText(message.studentUid, 128),
    studentEmail: safeText(message.studentEmail, 254),
    classId: safeText(message.classId, 120),
    startedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
    pendingEvents: state.pendingEvents
  };
  await saveState();
  await flushPendingEvents();
  await chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.5 });

  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTab?.id && activeTab.id !== state.activityTabId) {
    await processActiveTab(activeTab.id);
  }
  return { ok: true, status: getPublicStatus() };
}

async function stopTracking(reason = "class-ended") {
  await loadState();
  await finishCurrentVisit(new Date());
  state.active = false;
  state.currentExcursionId = "";
  state.currentVisit = null;
  await saveState();
  await chrome.alarms.clear(HEARTBEAT_ALARM);
  await publishLiveStatus();
  return { ok: true, reason, status: getPublicStatus() };
}

function getPublicStatus() {
  return {
    installed: true,
    active: state.active,
    classId: state.classId,
    studentEmail: state.studentEmail,
    startedAt: state.startedAt,
    currentDomain: state.currentVisit?.dominioDestino || "",
    currentTitle: state.currentVisit?.tituloDestino || "",
    currentVisitStartedAt: state.currentVisit?.salidaEn || "",
    currentExcursionId: state.currentExcursionId || "",
    lastHeartbeat: state.lastHeartbeat || "",
    pendingCount: state.pendingEvents.length,
    version: chrome.runtime.getManifest().version,
    activityHosts: SUPPORTED_ACTIVITY_HOSTS
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.source !== "ipem146-activity") return false;
  (async () => {
    await loadState();
    if (message.type === "START_TRACKING") {
      sendResponse(await startTracking(message, sender));
      return;
    }
    if (message.type === "STOP_TRACKING") {
      sendResponse(await stopTracking(message.reason));
      return;
    }
    if (message.type === "UPDATE_CONTEXT") {
      if (sender.tab?.id === state.activityTabId) {
        state.sectionId = safeText(message.sectionId, 120);
        state.sectionTitle = safeText(message.sectionTitle, 200);
        state.activityTitle = safeText(message.activityTitle || state.activityTitle);
        await saveState();
        await publishLiveStatus();
      }
      sendResponse({ ok: true, status: getPublicStatus() });
      return;
    }
    if (message.type === "GET_STATUS") {
      if (sender.tab?.id && state.active && state.studentUid === safeText(message.studentUid, 128)) {
        state.activityTabId = sender.tab.id;
        await saveState();
        await flushPendingEvents();
      }
      sendResponse({ ok: true, status: getPublicStatus() });
      return;
    }
    if (message.type === "EVENT_STORED") {
      const eventId = safeText(message.eventId, 160);
      state.pendingEvents = state.pendingEvents.filter(item => item.id !== eventId);
      await saveState();
      await publishLiveStatus();
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: false, error: "unknown-message" });
  })().catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void processActiveTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void (async () => {
    await loadState();
    if (!state.active || !state.currentVisit || state.currentVisit.destinationTabId !== tabId) return;
    if (changeInfo.url) {
      const nextPageKey = await pageKeyFromUrl(changeInfo.url);
      if (nextPageKey !== state.currentVisit.destinationPageKey) {
        const changedAt = new Date();
        await finishCurrentVisit(changedAt);
        state.currentVisit = createVisit(
          { ...tab, id: tabId, url: changeInfo.url },
          changedAt,
          nextPageKey
        );
        await saveState();
        await publishLiveStatus();
        return;
      }
    }
    if (changeInfo.title) {
      state.currentVisit.tituloDestino = safeText(changeInfo.title);
      await saveState();
      await publishLiveStatus();
    }
  })();
});

chrome.tabs.onRemoved.addListener(tabId => {
  void (async () => {
    await loadState();
    if (state.currentVisit?.destinationTabId === tabId) await finishCurrentVisit(new Date());
    if (state.activityTabId === tabId) {
      state.active = false;
      state.activityTabId = null;
      await saveState();
      await chrome.alarms.clear(HEARTBEAT_ALARM);
    }
  })();
});

chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  void chrome.tabs.query({ active: true, windowId }).then(([tab]) => {
    if (tab?.id) return processActiveTab(tab.id);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  void loadState().then(async () => {
    await saveState();
    if (state.active) await chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.5 });
  });
});

chrome.runtime.onStartup.addListener(() => {
  void loadState().then(async () => {
    if (state.active) await chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.5 });
    await publishLiveStatus();
  });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === HEARTBEAT_ALARM) void publishLiveStatus();
});
