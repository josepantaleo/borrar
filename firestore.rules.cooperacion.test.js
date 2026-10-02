const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  getFirestore,
  Timestamp,
  serverTimestamp,
} = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

const PROJECT_ID = "formacion-profesional-rules-test";
let testEnv;

const now = Timestamp.fromDate(new Date("2026-09-28T12:00:00Z"));
const studentUid = "student-1";
const teacherUid = "teacher-1";
const sectionId = "seccion-1";
const teacherEmail = "docente@example.com";

function studentDb() {
  return getFirestore(testEnv.authenticatedContext(studentUid, {
    email: "alumno@example.com",
    email_verified: true,
  }));
}

function teacherDb() {
  return getFirestore(testEnv.authenticatedContext(teacherUid, {
    email: teacherEmail,
    email_verified: true,
  }));
}

function collabRef(db) {
  return doc(db, "estudiantes", studentUid, "colaboracionCodigo", sectionId);
}

function baseCollab(overrides = {}) {
  return {
    uid: studentUid,
    sectionId,
    semilla: "seed",
    creadoEn: now,
    creadoPor: "alumno@example.com",
    actualizadoEn: now,
    actualizadoPor: "alumno@example.com",
    modoCooperacionActiva: false,
    edicionCooperativaPausada: true,
    estadoConsentimiento: "pendiente",
    objetivoCooperacion: "Ayuda",
    solicitadoPor: "alumno@example.com",
    solicitudEn: now,
    respondidoEn: null,
    respondidoPor: "",
    motivoRechazo: "",
    solicitanteRol: "estudiante",
    ...overrides,
  };
}

async function seedBase() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "estudiantes", studentUid), {
      uid: studentUid,
      email: "alumno@example.com",
      estadoCuenta: "activo",
      emailVerificado: true,
    });
    await setDoc(doc(db, "docentesAutorizados", teacherEmail), {
      email: teacherEmail,
      activo: true,
      rol: "docente",
    });
    await setDoc(collabRef(db), baseCollab());
  });
}

beforeEach(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(
        path.join(__dirname, "firestore.rules"),
        "utf8"
      ),
    },
  });
  await seedBase();
});


test("docente puede escribir Yjs sin consentimiento para intervención directa", async () => {
  const db = teacherDb();
  await assertSucceeds(setDoc(doc(
    db,
    "estudiantes", studentUid,
    "colaboracionCodigo", sectionId,
    "actualizaciones", "direct-1"
  ), {
    id: "direct-1",
    uid: studentUid,
    sectionId,
    update: "AQID",
    clienteId: "teacher-client",
    rol: "docente",
    autorUid: teacherUid,
    autorEmail: teacherEmail,
    creadoEn: serverTimestamp(),
  }));
});

test("docente puede publicar presencia en intervención directa", async () => {
  const db = teacherDb();
  await assertSucceeds(setDoc(doc(
    db,
    "estudiantes", studentUid,
    "colaboracionCodigo", sectionId,
    "presencia", "teacher-client"
  ), {
    clienteId: "teacher-client",
    uid: studentUid,
    sectionId,
    rol: "docente",
    nombre: "Docente",
    autorUid: teacherUid,
    cursorInicio: 0,
    cursorFin: 0,
    escribiendo: false,
    activoEn: serverTimestamp(),
  }));
});

test("estudiante no puede escribir Yjs si la solicitud pendiente fue hecha por docente", async () => {
  const db = studentDb();
  await assertFails(setDoc(doc(
    db,
    "estudiantes", studentUid,
    "colaboracionCodigo", sectionId,
    "actualizaciones", "student-pending"
  ), {
    id: "student-pending",
    uid: studentUid,
    sectionId,
    update: "AQID",
    clienteId: "client-1",
    rol: "estudiante",
    autorUid: studentUid,
    autorEmail: "alumno@example.com",
    creadoEn: serverTimestamp(),
  }));
});

afterEach(async () => {
  await testEnv.cleanup();
});

test("un estudiante no puede aceptar su propia solicitud", async () => {
  const db = studentDb();
  await assertFails(updateDoc(collabRef(db), {
    estadoConsentimiento: "aceptado",
    modoCooperacionActiva: true,
    edicionCooperativaPausada: false,
    respondidoEn: serverTimestamp(),
    respondidoPor: "alumno@example.com",
    actualizadoEn: serverTimestamp(),
    actualizadoPor: "alumno@example.com",
  }));
});

test("estudiante puede aceptar una solicitud originada por docente", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(collabRef(context.firestore()), { solicitanteRol: "docente" });
  });
  const db = studentDb();
  await assertSucceeds(updateDoc(collabRef(db), {
    estadoConsentimiento: "aceptado",
    modoCooperacionActiva: true,
    edicionCooperativaPausada: false,
    respondidoEn: serverTimestamp(),
    respondidoPor: "alumno@example.com",
    actualizadoEn: serverTimestamp(),
    actualizadoPor: "alumno@example.com",
    motivoRechazo: "",
  }));
});

test("solo un docente autorizado puede aceptar", async () => {
  const db = teacherDb();
  await assertSucceeds(updateDoc(collabRef(db), {
    estadoConsentimiento: "aceptado",
    modoCooperacionActiva: true,
    edicionCooperativaPausada: false,
    respondidoEn: serverTimestamp(),
    respondidoPor: teacherEmail,
    actualizadoEn: serverTimestamp(),
    actualizadoPor: teacherEmail,
    motivoRechazo: "",
  }));
});

test("un estudiante no puede responder una solicitud propia", async () => {
  const db = studentDb();
  await assertFails(updateDoc(collabRef(db), {
    estadoConsentimiento: "aceptado",
    modoCooperacionActiva: true,
    edicionCooperativaPausada: false,
    respondidoEn: serverTimestamp(),
    respondidoPor: "alumno@example.com",
    actualizadoEn: serverTimestamp(),
    actualizadoPor: "alumno@example.com",
  }));
});

test("Yjs se rechaza cuando la cooperacion esta pausada", async () => {
  const db = studentDb();
  await assertFails(setDoc(doc(
    db,
    "estudiantes", studentUid,
    "colaboracionCodigo", sectionId,
    "actualizaciones", "u-1"
  ), {
    id: "u-1",
    uid: studentUid,
    sectionId,
    update: "AQID",
    clienteId: "client-1",
    rol: "estudiante",
    autorUid: studentUid,
    autorEmail: "alumno@example.com",
    creadoEn: serverTimestamp(),
  }));
});

test("Yjs se permite tras aprobacion docente", async () => {
  await assertSucceeds(updateDoc(collabRef(teacherDb()), {
    estadoConsentimiento: "aceptado",
    modoCooperacionActiva: true,
    edicionCooperativaPausada: false,
    respondidoEn: serverTimestamp(),
    respondidoPor: teacherEmail,
    actualizadoEn: serverTimestamp(),
    actualizadoPor: teacherEmail,
    motivoRechazo: "",
  }));
  const db = studentDb();
  await assertSucceeds(setDoc(doc(
    db,
    "estudiantes", studentUid,
    "colaboracionCodigo", sectionId,
    "actualizaciones", "u-2"
  ), {
    id: "u-2",
    uid: studentUid,
    sectionId,
    update: "AQID",
    clienteId: "client-1",
    rol: "estudiante",
    autorUid: studentUid,
    autorEmail: "alumno@example.com",
    creadoEn: serverTimestamp(),
  }));
});

test("mensajes y presencia se rechazan fuera de una colaboracion activa", async () => {
  const db = studentDb();
  await assertFails(addDoc(collection(
    db,
    "estudiantes", studentUid,
    "colaboracionCodigo", sectionId,
    "mensajes"
  ), {
    id: "m-1",
    uid: studentUid,
    sectionId,
    texto: "hola",
    rol: "estudiante",
    autorUid: studentUid,
    autorNombre: "Alumno",
    creadoMs: 1,
    creadoEn: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(
    db,
    "estudiantes", studentUid,
    "colaboracionCodigo", sectionId,
    "presencia", "client-1"
  ), {
    clienteId: "client-1",
    uid: studentUid,
    sectionId,
    rol: "estudiante",
    nombre: "Alumno",
    autorUid: studentUid,
    cursorInicio: 0,
    cursorFin: 0,
    escribiendo: false,
    activoEn: serverTimestamp(),
  }));
});
