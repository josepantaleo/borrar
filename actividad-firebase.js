import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
      import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
      import { getFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, collectionGroup, query, orderBy, limit, onSnapshot, getDocs, increment, runTransaction, writeBatch } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
      import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-check.js";
      import { getAI, getTemplateGenerativeModel, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-ai.js";
      import * as Y from "https://cdn.jsdelivr.net/npm/yjs@13.6.31/+esm";
      import {
        Compartment,
        Decoration,
        EditorState,
        EditorView,
        keymap,
        lineNumbers,
        highlightActiveLine,
        drawSelection,
        defaultKeymap,
        indentWithTab,
        javascript,
        closeBrackets,
        closeBracketsKeymap,
        autocompletion,
        completionKeymap,
        startCompletion
} from "./codemirror-bundle.js?v=20260918-9";

      window.CodeMirror6 = {
        Compartment,
        Decoration,
        EditorState,
        EditorView,
        keymap,
        lineNumbers,
        highlightActiveLine,
        drawSelection,
        defaultKeymap,
        indentWithTab,
        javascript,
        closeBrackets,
        closeBracketsKeymap,
        autocompletion,
        completionKeymap,
        startCompletion
      };

      // ============================================================
      // PEGA AQUÍ LA CONFIGURACIÓN DE TU PROYECTO FIREBASE
      // Firebase Console -> Configuración del proyecto -> Tus apps -> Web
      // ============================================================
  const firebaseConfig = {
    apiKey: "AIzaSyA9Xvz6_NoyWIcl2gU2rLYsNzj_6uwB3hA",
    authDomain: "ipem146js.firebaseapp.com",
    projectId: "ipem146js",
    storageBucket: "ipem146js.firebasestorage.app",
    messagingSenderId: "572464024232",
    appId: "1:572464024232:web:a30ef451228ac9109d509d",
    measurementId: "G-WBDVFLQD73"
  };

      // Esta clave identifica el sitio ante reCAPTCHA Enterprise y es pública.
      // No pegues aquí claves de Gemini, Vertex AI, cuentas de servicio ni secretos.
      const APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY = "6Ld7l5stAAAAABjs2OrNxeDMaKZ6oAGERjopw3U9";
      const FIREBASE_AI_TEMPLATE_ID = "tutor-javascript-ipem146-v1-0-0";
      const FIREBASE_AI_MODEL_NAME = "gemini-2.5-flash";
      const VERSION_SCRIPT = (() => {
        try {
          const src = [...document.scripts].find(script => /actividad-app\.js(?:\?|$)/.test(script.src || ""));
          return src ? (new URL(src.src, document.baseURI).searchParams.get("v") || "local") : "local";
        } catch (_) {
          return "local";
        }
      })();
      window.VERSION_SCRIPT_FIREBASE = VERSION_SCRIPT;
      // Versión funcional del código que se sube y se revisa en ambos modos.
      const VERSION_CODIGO_SUBIDO = "1.0";
      window.VERSION_CODIGO_SUBIDO = VERSION_CODIGO_SUBIDO;

      const firebaseConfigured = !Object.values(firebaseConfig).some(v => String(v).includes("REEMPLAZAR_"));
      const PRIMARY_TEACHER_ADMIN_EMAIL = "ipem146centenario@gmail.com";
      const INITIAL_TEACHER_EMAILS = Object.freeze([
        PRIMARY_TEACHER_ADMIN_EMAIL,
        "josepantaleo@gmail.com"
      ]);
      const TEACHER_EMAILS = Object.freeze([PRIMARY_TEACHER_ADMIN_EMAIL]);
      window.PRIMARY_TEACHER_ADMIN_EMAIL = PRIMARY_TEACHER_ADMIN_EMAIL;
      window.INITIAL_TEACHER_EMAILS = INITIAL_TEACHER_EMAILS;
      // La lista visible se actualiza desde Firestore. El administrador principal
      // queda fijo como raíz de confianza para recuperar y gestionar accesos.
      window.TEACHER_EMAILS = TEACHER_EMAILS;
      let auth = null, db = null, googleProvider = null;
      let teacherAuth = null, teacherDb = null, teacherProvider = null;
      let firebaseAITemplateModel = null;
      let firebaseAIDirectModel = null;
      let firebaseAIInitError = "";
      let teacherPersistenceReady = Promise.resolve();

      if (firebaseConfigured) {
        const app = initializeApp(firebaseConfig);
        const appCheckConfigured = !APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY.includes("REEMPLAZAR_");
        if (appCheckConfigured) {
          try {
            initializeAppCheck(app, {
              provider: new ReCaptchaEnterpriseProvider(APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY),
              isTokenAutoRefreshEnabled: true
            });
          } catch (error) {
            console.warn("Firebase App Check no pudo inicializarse; se continuará sin bloquear el acceso.", error);
            window.firebaseAppCheckError = error?.message || String(error);
          }
          try {
            const ai = getAI(app, { backend: new GoogleAIBackend() });
            firebaseAITemplateModel = getTemplateGenerativeModel(ai);
            firebaseAIDirectModel = getGenerativeModel(ai, {
              model: FIREBASE_AI_MODEL_NAME,
              generationConfig: {
                temperature: 0.25,
                topP: 0.85,
                maxOutputTokens: 700
              }
            });
          } catch (error) {
            console.warn("Firebase AI Logic no pudo inicializarse; se usará el tutor local.", error);
          }
        }
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: "select_account" });
        const teacherApp = initializeApp(firebaseConfig, "teacherAuthorization");
        teacherAuth = getAuth(teacherApp);
        teacherDb = getFirestore(teacherApp);
        teacherProvider = new GoogleAuthProvider();
        teacherProvider.setCustomParameters({ prompt: "select_account" });
        teacherPersistenceReady = setPersistence(teacherAuth, browserSessionPersistence).catch(error => {
          console.warn("No se pudo activar la persistencia temporal docente:", error);
          return null;
        });
        onAuthStateChanged(teacherAuth, async user => {
          if (user && !(await verificarUsuarioDocente(user, true))) {
            await signOut(teacherAuth).catch(() => null);
            window.firebaseTeacherUser = null;
            window.dispatchEvent(new CustomEvent("firebase-teacher-auth-changed", { detail: null }));
            return;
          }
          window.firebaseTeacherUser = user || null;
          window.dispatchEvent(new CustomEvent("firebase-teacher-auth-changed", { detail: user || null }));
        });
      } else {
        window.firebaseConfigError = "Hay valores REEMPLAZAR_ en firebaseConfig.";
      }

      window.firebaseAIRealConfigurada = Boolean(firebaseAITemplateModel || firebaseAIDirectModel);
      window.consultarTutorIAFirebase = async function(payload = {}) {
        if (!firebaseAITemplateModel && !firebaseAIDirectModel) {
          throw new Error("Firebase AI Logic todavía no está configurado.");
        }
        const user = auth?.currentUser;
        if (!user) {
          throw new Error("El estudiante debe iniciar sesión para consultar la IA.");
        }
        const textoSeguro = (valor, limite) => String(valor || "").slice(0, limite);
        const parametros = {
            nombreModulo: textoSeguro(payload.nombreModulo, 180),
            consigna: textoSeguro(payload.consigna, 1800),
            pregunta: textoSeguro(payload.pregunta, 500),
            modo: textoSeguro(payload.modo, 40),
            codigo: textoSeguro(payload.codigo, 5000),
            conceptos: textoSeguro(payload.conceptos, 800),
            diagnosticoLocal: textoSeguro(payload.diagnosticoLocal, 1200),
            historialReciente: textoSeguro(payload.historialReciente, 1800)
        };
        const instrucciones = [
          "Sos un tutor de JavaScript para estudiantes de nivel secundario.",
          "Respondé en español rioplatense, con tono claro y respetuoso.",
          "Ayudá con pistas progresivas; no entregues la solución completa ni código listo para copiar.",
          "Usá el diagnóstico local y el código del estudiante para señalar un único próximo paso verificable.",
          `Módulo: ${parametros.nombreModulo}`,
          `Consigna: ${parametros.consigna}`,
          `Modo: ${parametros.modo}`,
          `Pregunta: ${parametros.pregunta}`,
          `Código del estudiante:\n${parametros.codigo}`,
          `Conceptos esperados: ${parametros.conceptos}`,
          `Diagnóstico local: ${parametros.diagnosticoLocal}`,
          `Historial reciente:\n${parametros.historialReciente}`
        ].join("\n\n");
        const response = firebaseAITemplateModel
          ? await firebaseAITemplateModel.generateContent(FIREBASE_AI_TEMPLATE_ID, parametros)
          : await firebaseAIDirectModel.generateContent(instrucciones);
        const texto = String(
          response?.response?.text?.() ||
          response?.text?.() ||
          response?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("") ||
          ""
        ).trim();
        if (!texto) throw new Error("La IA no devolvió una respuesta utilizable.");
        return texto;
      };

      window.firebaseAuthReady = new Promise(resolve => {
        if (!firebaseConfigured) return resolve(null);
        let first = true;
        onAuthStateChanged(auth, user => {
          if (first) { first = false; resolve(user); }
          window.firebaseCurrentUser = user || null;
          window.dispatchEvent(new CustomEvent("firebase-auth-changed", { detail: user || null }));
        });
      });

      window.firebaseConfigured = firebaseConfigured;
      window.firebaseCurrentUser = null;
      window.firebaseTeacherUser = null;
      const SESION_ESTUDIANTE_ID = sessionStorage.getItem("app_student_session_id") ||
        (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem("app_student_session_id", SESION_ESTUDIANTE_ID);
      const SESION_INICIADA_EN_CLIENTE = Date.now();
      let fallosPresenciaConsecutivos = 0;
      let ultimaComprobacionSesiones = 0;
      let otraSesionRecienteCache = false;
      let otraSesionIdCache = "";

      function emitirDiagnosticoPresencia(detalle = {}) {
        const diagnostico = {
            sesionId: SESION_ESTUDIANTE_ID,
            autenticado: Boolean(window.firebaseCurrentUser),
            conectadoInternet: navigator.onLine !== false,
            fallosConsecutivos: fallosPresenciaConsecutivos,
            ...detalle
        };
        window.ultimoDiagnosticoPresencia = diagnostico;
        window.dispatchEvent(new CustomEvent("diagnostico-presencia-estudiante", {
          detail: diagnostico
        }));
      }

      function correoNormalizado(user) {
        return String(user?.email || "").trim().toLowerCase();
      }

      function mensajeErrorAutenticacion(error, contexto = "iniciar sesion") {
        const codigo = String(error?.code || "");
        const mensajes = {
          "auth/unauthorized-domain": "Este dominio no esta autorizado en Firebase Authentication. Agregalo en Authentication > Settings > Authorized domains.",
          "auth/operation-not-allowed": "El proveedor Google no esta habilitado. Activalo en Firebase Authentication > Sign-in method.",
          "auth/popup-blocked": "El navegador bloqueo la ventana de Google. Habilita las ventanas emergentes para este sitio e intenta nuevamente.",
          "auth/popup-closed-by-user": "La ventana de Google se cerro antes de completar el ingreso.",
          "auth/cancelled-popup-request": "Ya habia una ventana de ingreso abierta. Cerrala e intenta nuevamente.",
          "auth/network-request-failed": "No se pudo conectar con Firebase. Revisa la conexion a Internet.",
          "auth/operation-not-supported-in-this-environment": "Firebase no admite el ingreso desde este entorno. Abri la pagina desde un sitio http:// o https://, no directamente como archivo local."
        };
        const detalle = mensajes[codigo] || error?.message || codigo || "Error desconocido.";
        const ayudaLocal = window.location.protocol === "file:"
          ? "\n\nLa pagina esta abierta como archivo local. Publicala o servila mediante http://localhost para usar Google."
          : "";
        return `No se pudo ${contexto}.\n\n${detalle}${ayudaLocal}`;
      }

      async function verificarUsuarioDocente(user, forzarActualizacion = false) {
        if (!user) return false;
        try {
          const token = await user.getIdTokenResult(forzarActualizacion);
          const correoVerificado = user.emailVerified === true || token?.claims?.email_verified === true;
          const correo = correoNormalizado(user);
          const administradorPrincipal = correo === PRIMARY_TEACHER_ADMIN_EMAIL;
          let registroDocente = null;
          if (correoVerificado && !administradorPrincipal) {
            const database = user === teacherAuth?.currentUser ? teacherDb : db;
            if (database) {
              const snap = await getDoc(doc(database, "docentesAutorizados", correo));
              registroDocente = snap.exists() ? snap.data() : null;
            }
          }
          const autorizado = correoVerificado && (
            administradorPrincipal ||
            (registroDocente?.activo === true && registroDocente?.email === correo)
          );
          window.estadoAutorizacionDocente = {
            autorizado,
            correo,
            correoVerificado,
            administradorPrincipal,
            rol: administradorPrincipal ? 'administrador' : (registroDocente?.rol || 'docente'),
            metodo: administradorPrincipal ? 'administrador-principal' : (registroDocente?.activo === true ? 'firestore' : 'ninguno')
          };
          return autorizado;
        } catch (error) {
          console.warn("No se pudo verificar la autorización docente:", error);
          window.estadoAutorizacionDocente = {
            autorizado: false,
            correo: correoNormalizado(user),
            correoVerificado: false,
            metodo: 'error'
          };
          return false;
        }
      }

      window.esDocenteAutorizadoFirebase = async function() {
        if (await verificarUsuarioDocente(window.firebaseTeacherUser)) return true;
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        return verificarUsuarioDocente(user);
      };

      window.autorizarDocenteFirebase = async function() {
        if (await window.esDocenteAutorizadoFirebase()) return true;
        if (!teacherAuth || !teacherProvider) return false;
        if (window.location.protocol === "file:") {
          alert(mensajeErrorAutenticacion(
            { code: "auth/operation-not-supported-in-this-environment" },
            "autorizar la cuenta docente"
          ));
          return false;
        }
        try {
          await teacherPersistenceReady;
          const credential = await signInWithPopup(teacherAuth, teacherProvider);
          const autorizado = await verificarUsuarioDocente(credential.user, true);
          if (!autorizado) {
            await signOut(teacherAuth);
            const estado = window.estadoAutorizacionDocente || {};
            alert(estado.correoVerificado === false
              ? "La cuenta seleccionada no tiene el correo verificado y no puede autorizarse como docente."
              : `La cuenta ${estado.correo || 'seleccionada'} no está autorizada como docente.`);
            return false;
          }
          window.firebaseTeacherUser = credential.user;
          window.dispatchEvent(new CustomEvent("firebase-teacher-auth-changed", { detail: credential.user }));
          return true;
        } catch (error) {
          console.error("Error de autorización docente:", error);
          if (error?.code !== "auth/popup-closed-by-user") {
            alert(mensajeErrorAutenticacion(error, "autorizar la cuenta docente"));
          }
          return false;
        }
      };

      window.cerrarAutorizacionDocenteFirebase = async function() {
        if (!teacherAuth?.currentUser) {
          alert("No hay una autorización docente temporal activa.");
          return false;
        }
        try {
          if (window.__profesorUnsubscribe) {
            window.__profesorUnsubscribe();
            window.__profesorUnsubscribe = null;
          }
          if (window.__desafiosProfesorUnsubscribe) {
            window.__desafiosProfesorUnsubscribe();
            window.__desafiosProfesorUnsubscribe = null;
          }
          await signOut(teacherAuth);
          window.firebaseTeacherUser = null;
          window.dispatchEvent(new CustomEvent("firebase-teacher-auth-changed", { detail: null }));
          return true;
        } catch (error) {
          console.error("Error cerrando la autorización docente:", error);
          alert("No se pudo cerrar la autorización docente temporal.");
          return false;
        }
      };

      function contextoDocenteFirebase() {
        if (window.firebaseTeacherUser && teacherDb) {
          return { user: window.firebaseTeacherUser, database: teacherDb };
        }
        return { user: window.firebaseCurrentUser, database: db };
      }

      function normalizarEmailDocente(valor) {
        return String(valor || "").trim().toLowerCase();
      }

      function resumenAuditoriaDocente(datos = {}) {
        return {
          email: normalizarEmailDocente(datos.email),
          nombre: String(datos.nombre || "").trim(),
          rol: datos.rol === "administrador" ? "administrador" : "docente",
          activo: datos.activo === true
        };
      }

      function crearIdAuditoriaDocente() {
        const aleatorio = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
        return `${Date.now()}-${aleatorio}`;
      }

      function usuarioEsAdministradorPrincipal(user) {
        return normalizarEmailDocente(user?.email) === PRIMARY_TEACHER_ADMIN_EMAIL &&
          (user?.emailVerified === true || window.estadoAutorizacionDocente?.correoVerificado === true);
      }

      window.esAdministradorPrincipalDocente = function() {
        const { user } = contextoDocenteFirebase();
        return usuarioEsAdministradorPrincipal(user);
      };

      async function asegurarDocentesInicialesFirebase() {
        const { user, database } = contextoDocenteFirebase();
        if (!database || !usuarioEsAdministradorPrincipal(user)) return;
        const administradorEmail = normalizarEmailDocente(user.email);
        for (const emailInicial of INITIAL_TEACHER_EMAILS) {
          const email = normalizarEmailDocente(emailInicial);
          const referencia = doc(database, "docentesAutorizados", email);
          const existente = await getDoc(referencia);
          if (existente.exists()) continue;
          const nombre = email === PRIMARY_TEACHER_ADMIN_EMAIL ? "Administración institucional" : "Docente autorizado";
          const nuevo = {
            email,
            nombre,
            rol: email === PRIMARY_TEACHER_ADMIN_EMAIL ? "administrador" : "docente",
            activo: true,
            creadoEn: serverTimestamp(),
            creadoPor: administradorEmail,
            actualizadoEn: serverTimestamp(),
            actualizadoPor: administradorEmail,
            bajaEn: null,
            bajaPor: "",
            motivoBaja: ""
          };
          const eventoId = crearIdAuditoriaDocente();
          const lote = writeBatch(database);
          lote.set(referencia, nuevo);
          lote.set(doc(database, "historialDocentes", eventoId), {
            id: eventoId,
            tipo: "migracion_inicial",
            docenteEmailAnterior: "",
            docenteEmailNuevo: email,
            anterior: resumenAuditoriaDocente(),
            nuevo: resumenAuditoriaDocente({ ...nuevo, creadoEn: null, actualizadoEn: null }),
            administradorEmail,
            administradorUid: user.uid,
            cambiadoEn: serverTimestamp()
          });
          await lote.commit();
        }
      }

      window.obtenerDocentesAutorizadosFirebase = async function() {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return [];
        const { user, database } = contextoDocenteFirebase();
        if (!database || !user) return [];
        if (usuarioEsAdministradorPrincipal(user)) await asegurarDocentesInicialesFirebase();
        const snap = await getDocs(collection(database, "docentesAutorizados"));
        const docentes = snap.docs.map(item => ({ id: item.id, ...item.data() }));
        docentes.sort((a, b) => {
          if (a.email === PRIMARY_TEACHER_ADMIN_EMAIL) return -1;
          if (b.email === PRIMARY_TEACHER_ADMIN_EMAIL) return 1;
          if (a.activo !== b.activo) return a.activo ? -1 : 1;
          return String(a.nombre || a.email).localeCompare(String(b.nombre || b.email), "es");
        });
        window.TEACHER_EMAILS = docentes.filter(item => item.activo === true).map(item => normalizarEmailDocente(item.email));
        window.dispatchEvent(new CustomEvent("docentes-autorizados-data", { detail: docentes }));
        return docentes;
      };

      window.obtenerHistorialDocentesFirebase = async function() {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return [];
        const { user, database } = contextoDocenteFirebase();
        if (!database || !user) return [];
        const snap = await getDocs(collection(database, "historialDocentes"));
        return snap.docs
          .map(item => ({ id: item.id, ...item.data() }))
          .sort((a, b) => {
            const fechaA = a.cambiadoEn?.toMillis?.() || a.cambiadoEn?.seconds * 1000 || 0;
            const fechaB = b.cambiadoEn?.toMillis?.() || b.cambiadoEn?.seconds * 1000 || 0;
            return fechaB - fechaA;
          });
      };

      window.guardarDocenteAutorizadoFirebase = async function(datos = {}, emailAnterior = "") {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return { ok: false, error: "no-autorizado" };
        const { user, database } = contextoDocenteFirebase();
        if (!database || !usuarioEsAdministradorPrincipal(user)) return { ok: false, error: "solo-administrador-principal" };
        const email = normalizarEmailDocente(datos.email);
        const anteriorEmail = normalizarEmailDocente(emailAnterior);
        const nombre = String(datos.nombre || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "email-invalido" };
        if (!nombre || nombre.length > 120) return { ok: false, error: "nombre-invalido" };
        if (anteriorEmail === PRIMARY_TEACHER_ADMIN_EMAIL && email !== PRIMARY_TEACHER_ADMIN_EMAIL) {
          return { ok: false, error: "administrador-protegido" };
        }
        const administradorEmail = normalizarEmailDocente(user.email);
        const referenciaNueva = doc(database, "docentesAutorizados", email);
        const snapNuevo = await getDoc(referenciaNueva);
        const datosNuevosExistentes = snapNuevo.exists() ? snapNuevo.data() : null;
        const referenciaAnterior = anteriorEmail ? doc(database, "docentesAutorizados", anteriorEmail) : null;
        const snapAnterior = referenciaAnterior ? await getDoc(referenciaAnterior) : null;
        const datosAnteriores = snapAnterior?.exists() ? snapAnterior.data() : null;
        if (!anteriorEmail && datosNuevosExistentes?.activo === true) return { ok: false, error: "docente-existente" };
        if (anteriorEmail && email !== anteriorEmail && datosNuevosExistentes?.activo === true) {
          return { ok: false, error: "email-en-uso" };
        }
        const rol = email === PRIMARY_TEACHER_ADMIN_EMAIL ? "administrador" : "docente";
        const nuevo = {
          email,
          nombre,
          rol,
          activo: true,
          creadoEn: datosNuevosExistentes?.creadoEn || serverTimestamp(),
          creadoPor: datosNuevosExistentes?.creadoPor || administradorEmail,
          actualizadoEn: serverTimestamp(),
          actualizadoPor: administradorEmail,
          bajaEn: null,
          bajaPor: "",
          motivoBaja: ""
        };
        const tipo = anteriorEmail
          ? (email === anteriorEmail ? (datosAnteriores?.activo === false ? "reactivacion" : "modificacion") : "cambio_email")
          : (datosNuevosExistentes ? "reactivacion" : "alta");
        const eventoId = crearIdAuditoriaDocente();
        const lote = writeBatch(database);
        if (referenciaAnterior && email !== anteriorEmail && datosAnteriores) {
          lote.set(referenciaAnterior, {
            activo: false,
            actualizadoEn: serverTimestamp(),
            actualizadoPor: administradorEmail,
            bajaEn: serverTimestamp(),
            bajaPor: administradorEmail,
            motivoBaja: `Correo reemplazado por ${email}`
          }, { merge: true });
        }
        lote.set(referenciaNueva, nuevo, { merge: true });
        lote.set(doc(database, "historialDocentes", eventoId), {
          id: eventoId,
          tipo,
          docenteEmailAnterior: anteriorEmail,
          docenteEmailNuevo: email,
          anterior: resumenAuditoriaDocente(datosAnteriores || datosNuevosExistentes || {}),
          nuevo: resumenAuditoriaDocente(nuevo),
          administradorEmail,
          administradorUid: user.uid,
          cambiadoEn: serverTimestamp()
        });
        await lote.commit();
        return { ok: true, tipo };
      };

      window.cambiarEstadoDocenteFirebase = async function(emailValor, activar, motivo = "") {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return { ok: false, error: "no-autorizado" };
        const { user, database } = contextoDocenteFirebase();
        if (!database || !usuarioEsAdministradorPrincipal(user)) return { ok: false, error: "solo-administrador-principal" };
        const email = normalizarEmailDocente(emailValor);
        if (email === PRIMARY_TEACHER_ADMIN_EMAIL && activar !== true) return { ok: false, error: "administrador-protegido" };
        const referencia = doc(database, "docentesAutorizados", email);
        const snap = await getDoc(referencia);
        if (!snap.exists()) return { ok: false, error: "docente-no-encontrado" };
        const anterior = snap.data();
        const administradorEmail = normalizarEmailDocente(user.email);
        const nuevo = {
          ...anterior,
          activo: activar === true,
          rol: email === PRIMARY_TEACHER_ADMIN_EMAIL ? "administrador" : "docente"
        };
        const eventoId = crearIdAuditoriaDocente();
        const lote = writeBatch(database);
        lote.set(referencia, {
          activo: activar === true,
          rol: nuevo.rol,
          actualizadoEn: serverTimestamp(),
          actualizadoPor: administradorEmail,
          bajaEn: activar === true ? null : serverTimestamp(),
          bajaPor: activar === true ? "" : administradorEmail,
          motivoBaja: activar === true ? "" : String(motivo || "Baja dispuesta por el administrador principal").slice(0, 300)
        }, { merge: true });
        lote.set(doc(database, "historialDocentes", eventoId), {
          id: eventoId,
          tipo: activar === true ? "reactivacion" : "baja",
          docenteEmailAnterior: email,
          docenteEmailNuevo: email,
          anterior: resumenAuditoriaDocente(anterior),
          nuevo: resumenAuditoriaDocente(nuevo),
          administradorEmail,
          administradorUid: user.uid,
          cambiadoEn: serverTimestamp()
        });
        await lote.commit();
        return { ok: true, tipo: activar === true ? "reactivacion" : "baja" };
      };

      function idClaseActual() {
        const partes = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).formatToParts(new Date());
        const valores = Object.fromEntries(partes.map(parte => [parte.type, parte.value]));
        return `${valores.year}-${valores.month}-${valores.day}`;
      }
      window.idClaseActual = idClaseActual;

      window.escucharInicioClaseFirebase = function() {
        const { user, database } = contextoDocenteFirebase();
        if (!database || !user) return;
        if (window.__inicioClaseUnsubscribe) window.__inicioClaseUnsubscribe();
        const referencia = doc(database, "controlClase", idClaseActual());
        window.__inicioClaseUnsubscribe = onSnapshot(referencia, snapshot => {
          const datos = snapshot.exists() ? snapshot.data() : {};
          window.dispatchEvent(new CustomEvent("estado-inicio-clase", {
            detail: {
              iniciada: datos.iniciada === true,
              iniciadaEn: datos.iniciadaEn || null,
              iniciadaPor: datos.iniciadaPor || "",
              finalizadaEn: datos.finalizadaEn || null,
              finalizadaPor: datos.finalizadaPor || "",
              cronometrosPausados: datos.cronometrosPausados === true,
              cronometrosReinicioId: datos.cronometrosReinicioId || "",
              cronometrosActualizadosPor: datos.cronometrosActualizadosPor || "",
              configuracionSeguimiento: datos.configuracionSeguimiento || {},
              rubricaSocratica: datos.rubricaSocratica || {}
            }
          }));
        }, error => {
          console.error("Error escuchando el inicio de clase:", error);
          window.dispatchEvent(new CustomEvent("estado-inicio-clase-error", { detail: error.message }));
        });
      };

      window.escucharReinicioSalidasFirebase = function() {
        if (!db || !window.firebaseCurrentUser) return;
        if (window.__reinicioSalidasUnsubscribe) window.__reinicioSalidasUnsubscribe();
        if (window.__comentariosDocenteEstudianteUnsubscribe) window.__comentariosDocenteEstudianteUnsubscribe();
        const comentariosRef = collection(db, "estudiantes", window.firebaseCurrentUser.uid, "comentariosDocente");
        window.__comentariosDocenteEstudianteUnsubscribe = onSnapshot(comentariosRef, snapshot => {
          const comentarios = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
          comentarios.sort((a, b) => (b.creadoEn?.toMillis?.() || Date.parse(b.creadoEn || "") || 0) - (a.creadoEn?.toMillis?.() || Date.parse(a.creadoEn || "") || 0));
          window.dispatchEvent(new CustomEvent("comentarios-docente-estudiante", { detail: comentarios }));
        }, error => console.error("Error escuchando comentarios docentes:", error));
        const referencia = doc(db, "estudiantes", window.firebaseCurrentUser.uid);
        window.__reinicioSalidasUnsubscribe = onSnapshot(referencia, snapshot => {
          if (!snapshot.exists()) return;
          const datos = snapshot.data();
          window.ultimoDocumentoEstudianteFirebase = datos;
          if (datos.finalizadas && typeof datos.finalizadas === "object") {
            window.dispatchEvent(new CustomEvent("actividades-desbloqueadas-estudiante", {
              detail: { finalizadas: datos.finalizadas, desbloqueo: datos.desbloqueoActividades || null }
            }));
          }
          const colaboracion = datos.colaboracionDocente || {};
          if (colaboracion.sectionId && typeof colaboracion.codigo === "string") {
            const editorColaborativo = document.getElementById(`editor-${colaboracion.sectionId}`);
            if (editorColaborativo && editorColaborativo.dataset.crdtActivo !== "true" && document.activeElement !== editorColaborativo && !editorColaborativo.__codeMirrorView?.hasFocus && editorColaborativo.value !== colaboracion.codigo) {
              editorColaborativo.value = colaboracion.codigo;
              editorColaborativo.__syncCodeMirror?.(colaboracion.codigo);
              setLocalStorage(`draft_editor-${colaboracion.sectionId}`, colaboracion.codigo);
              if (typeof actualizarMetricasEditor === "function") actualizarMetricasEditor(colaboracion.sectionId);
              if (typeof actualizarEstadoEditorEstudiante === "function") actualizarEstadoEditorEstudiante(colaboracion.sectionId, "saved", `Actualizado por ${colaboracion.actualizadoPor || "docente"}`);
            }
            window.dispatchEvent(new CustomEvent("codigo-colaborativo-docente", { detail: colaboracion }));
          }
          const programacion = datos.programacionDocente || null;
          if (programacion && !window.__programacionDocentePanel) {
            const panel = document.createElement("aside");
            panel.id = "programacionDocentePanel";
            panel.style.cssText = "position:fixed;right:1rem;bottom:1rem;z-index:9000;width:min(360px,calc(100vw - 2rem));padding:1rem;border:1px solid rgba(56,189,248,.55);border-radius:10px;background:#0f172a;color:#e2e8f0;box-shadow:0 18px 45px rgba(0,0,0,.35)";
            document.body.appendChild(panel);
            window.__programacionDocentePanel = panel;
          }
          if (window.__programacionDocentePanel) {
            const estado = { pendiente: "Pendiente", en_curso: "En curso", revisar: "Revisar", completada: "Completada" }[programacion?.estado] || "Sin programación";
            window.__programacionDocentePanel.innerHTML = programacion ? `<div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center"><strong><i class="fa-solid fa-clipboard-list"></i> Programación docente</strong><span style="font-size:.7rem;color:#7dd3fc">${estado}</span></div><h3 style="margin:.55rem 0 .35rem;font-size:1rem">${String(programacion.titulo || "Actividad asignada").replace(/[<>&"]/g, "")}</h3><p style="margin:0;white-space:pre-wrap;font-size:.78rem;line-height:1.45">${String(programacion.instrucciones || "").replace(/[<>&"]/g, "")}</p>${programacion.fechaEntrega ? `<small style="display:block;margin-top:.55rem;color:#fbbf24"><i class="fa-solid fa-calendar"></i> Entrega: ${String(programacion.fechaEntrega).replace(/[<>&"]/g, "")}</small>` : ""}<div id="comentariosDocenteEstudiantePanel" style="margin-top:.75rem;padding-top:.65rem;border-top:1px solid rgba(148,163,184,.2)"><strong style="display:block;font-size:.75rem;color:#bae6fd;margin-bottom:.4rem"><i class="fa-solid fa-comments"></i> Comentarios del docente</strong><div id="comentariosDocenteEstudianteLista"><small style="color:#94a3b8">Cargando comentarios...</small></div></div>` : "";
            window.__programacionDocentePanel.hidden = !programacion;
          }
          window.dispatchEvent(new CustomEvent("estado-cuenta-estudiante", {
            detail: {
              estadoCuenta: datos.estadoCuenta || "activo",
              bajaMotivo: datos.bajaMotivo || "",
              rechazoMotivo: datos.rechazoMotivo || "",
              estudiante: datos.estudiante || {},
              aprobadoEn: datos.aprobadoEn || null,
              aprobadoPor: datos.aprobadoPor || ""
            }
          }));
          const reinicio = datos.reinicioSalidas || null;
          if (reinicio?.id) {
            window.dispatchEvent(new CustomEvent("reinicio-salidas-estudiante", {
              detail: {
                id: reinicio.id,
                solicitadoEn: reinicio.solicitadoEn || null,
                salidasPestana: Number(datos.salidasPestana ?? datos["salidasPesta\u00f1a"] ?? 0)
              }
            }));
          }
          const controlCronometro = datos.controlCronometroIndividual || {};
          window.dispatchEvent(new CustomEvent("control-cronometro-individual", {
            detail: {
              pausado: controlCronometro.pausado === true,
              reinicioId: controlCronometro.reinicioId || "",
              actualizadoPor: controlCronometro.actualizadoPor || ""
            }
          }));
          const bloqueoRemoto = datos.pantallaBloqueada === true;
          const bloqueoId = String(datos.pantallaBloqueadaEn || "");
          const ultimoBloqueo = getLocalStorage("app_last_screen_lock_event") || "";
          if (bloqueoRemoto && bloqueoId && bloqueoId !== ultimoBloqueo) {
            setLocalStorage("app_last_screen_lock_event", bloqueoId);
            window.dispatchEvent(new CustomEvent("pantalla-bloqueada-estudiante"));
          }
          const desbloqueoPantalla = datos.desbloqueoPantalla || null;
          const ultimoDesbloqueo = getLocalStorage("app_last_screen_unlock_event") || "";
          if (desbloqueoPantalla?.id && String(desbloqueoPantalla.id) !== ultimoDesbloqueo) {
            setLocalStorage("app_last_screen_unlock_event", String(desbloqueoPantalla.id));
            window.dispatchEvent(new CustomEvent("desbloqueo-pantalla-estudiante", {
              detail: { id: desbloqueoPantalla.id, por: desbloqueoPantalla.por || "" }
            }));
          }
          if (datos.chatIABorradoId) {
            window.dispatchEvent(new CustomEvent("borrado-chat-ia-estudiante", {
              detail: {
                id: datos.chatIABorradoId,
                borradoPor: datos.chatIABorradoPor || ""
              }
            }));
          }
          if (datos.mensajeDocenteActual?.id) {
            window.ultimoMensajeDocenteCompatible = {
              ...datos.mensajeDocenteActual,
              canal: "documento-estudiante"
            };
            window.dispatchEvent(new CustomEvent("mensaje-docente-compatible", {
              detail: window.ultimoMensajeDocenteCompatible
            }));
          }
        }, error => {
          console.error("Error escuchando reinicio de cambios de pestaña:", error);
        });
      };

      window.addEventListener("comentarios-docente-estudiante", event => {
        const lista = document.getElementById("comentariosDocenteEstudianteLista");
        if (!lista) return;
        const comentarios = Array.isArray(event.detail) ? event.detail : [];
        lista.innerHTML = comentarios.length
          ? comentarios.map(item => {
              const texto = String(item.texto || "").replace(/[<>&"]/g, "");
              const autor = String(item.autor || "Docente").replace(/[<>&"]/g, "");
              const fecha = item.creadoEn?.toDate ? item.creadoEn.toDate().toLocaleString("es-AR") : "Ahora";
              return `<article style="padding:.45rem .5rem;margin-top:.35rem;border-radius:6px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.16)"><p style="margin:0;font-size:.73rem;line-height:1.4;white-space:pre-wrap">${texto}</p><small style="display:block;margin-top:.25rem;color:#94a3b8;font-size:.6rem">${autor} · ${fecha}</small></article>`;
            }).join("")
          : '<small style="color:#94a3b8">Todavía no hay comentarios.</small>';
      });

      window.iniciarClaseFirebase = async function() {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        const { user, database } = contextoDocenteFirebase();
        if (!user || !database) return false;
        try {
          await setDoc(doc(database, "controlClase", idClaseActual()), {
            iniciada: true,
            iniciadaEn: serverTimestamp(),
            iniciadaPor: user.email || user.displayName || user.uid,
            cronometrosPausados: false,
            cronometrosActualizadosEn: serverTimestamp(),
            cronometrosActualizadosPor: user.email || user.displayName || user.uid,
            zonaHoraria: "America/Argentina/Buenos_Aires"
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error iniciando la clase:", error);
          alert("No se pudo iniciar la clase. Verificá las reglas de Firestore.");
          return false;
        }
      };

      window.finalizarClaseFirebase = async function() {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        if (!confirm("Se bloquearán las actividades y se detendrán los cronómetros de todos los estudiantes conectados. ¿Finalizar la clase?")) {
          return false;
        }
        const { user, database } = contextoDocenteFirebase();
        if (!user || !database) return false;
        try {
          await setDoc(doc(database, "controlClase", idClaseActual()), {
            iniciada: false,
            finalizadaEn: serverTimestamp(),
            finalizadaPor: user.email || user.displayName || user.uid,
            zonaHoraria: "America/Argentina/Buenos_Aires"
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error finalizando la clase:", error);
          alert("No se pudo finalizar la clase. Verificá las reglas de Firestore.");
          return false;
        }
      };

      window.controlarCronometrosFirebase = async function(accion) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        const { user, database } = contextoDocenteFirebase();
        if (!user || !database) return false;
        try {
          const referencia = doc(database, "controlClase", idClaseActual());
          const estadoActual = await getDoc(referencia);
          if (!estadoActual.exists() || estadoActual.data()?.iniciada !== true) {
            alert("Primero iniciá la clase. Después podrás pausar, continuar o reiniciar los cronómetros.");
            return false;
          }
          const payload = {
            cronometrosActualizadosEn: serverTimestamp(),
            cronometrosActualizadosPor: user.email || user.displayName || user.uid,
            zonaHoraria: "America/Argentina/Buenos_Aires"
          };
          if (accion === "pausar" || accion === "reanudar") {
            payload.cronometrosPausados = accion === "pausar";
          } else if (accion === "reiniciar") {
            payload.cronometrosReinicioId = `${Date.now()}-${user.uid}`;
          } else {
            return false;
          }
          await setDoc(referencia, payload, { merge: true });
          return true;
        } catch (error) {
          console.error("Error controlando los cronómetros:", error);
          alert("No se pudo actualizar el cronómetro. Verificá las reglas de Firestore.");
          return false;
        }
      };

      window.iniciarSesionGoogle = async function() {
        if (!firebaseConfigured) {
          alert("Firebase todavía no está configurado. Reemplaza los valores REEMPLAZAR_ en la configuración del archivo.");
          return;
        }
        if (window.location.protocol === "file:") {
          alert("Esta página está abierta como archivo local. Para ingresar con Google, abrila desde:\n\nhttp://localhost:5500/actividad.html");
          return;
        }
        try {
          await signInWithPopup(auth, googleProvider);
          window.location.reload();
        } catch (error) {
          console.error(error);
          alert(mensajeErrorAutenticacion(error, "iniciar sesion con Google"));
        }
      };

      window.cerrarSesionGoogle = async function() {
        const sesionesActivas = [];
        if (auth?.currentUser) {
          await window.marcarDesconexionEstudianteFirebase?.("cierre_sesion");
        }
        if (auth?.currentUser) sesionesActivas.push(signOut(auth));
        if (teacherAuth?.currentUser) sesionesActivas.push(signOut(teacherAuth));
        try {
          if (window.__profesorUnsubscribe) {
            window.__profesorUnsubscribe();
            window.__profesorUnsubscribe = null;
          }
          if (window.__desafiosProfesorUnsubscribe) {
            window.__desafiosProfesorUnsubscribe();
            window.__desafiosProfesorUnsubscribe = null;
          }
          await Promise.all(sesionesActivas);
        } catch (error) {
          console.error("Error cerrando las sesiones de Firebase:", error);
          alert("No se pudo cerrar la sesión completamente. Intenta nuevamente.");
          return;
        }
        // El estado local está aislado por UID. No se comparte con otra cuenta.
        // Firebase conserva el avance definitivo en Firestore.
        localStorage.removeItem('firebase_active_uid');
        firebaseStorageUid = null;
        window.firebaseCurrentUser = null;
        window.firebaseTeacherUser = null;
        window.dispatchEvent(new CustomEvent("firebase-auth-changed", { detail: null }));
        window.dispatchEvent(new CustomEvent("firebase-teacher-auth-changed", { detail: null }));
        window.location.reload();
      };

      window.cargarProgresoFirebase = async function() {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db) return null;
        const ref = doc(db, "estudiantes", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const datos = snap.data();
        const recuperacion = {};
        if (!datos.uid) recuperacion.uid = user.uid;
        if (!datos.email) recuperacion.email = user.email || "";
        if (!datos.estadoCuenta) recuperacion.estadoCuenta = "pendiente";
        if (datos.emailVerificado !== (user.emailVerified === true)) {
          recuperacion.emailVerificado = user.emailVerified === true;
        }
        if (!datos.nombreGoogle && user.displayName) recuperacion.nombreGoogle = user.displayName;
        if (!datos.fotoGoogle && user.photoURL) recuperacion.fotoGoogle = user.photoURL;
        if (Object.keys(recuperacion).length) {
          try {
            await setDoc(ref, { ...recuperacion, actualizadoEn: serverTimestamp() }, { merge: true });
            Object.assign(datos, recuperacion);
          } catch (error) {
            console.warn("No se pudo recuperar automáticamente el perfil antiguo:", error);
          }
        }
        return datos;
      };

      window.guardarProgresoFirebase = async function(payload) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user) {
          window.ultimoErrorGuardadoFirebase = {
            code: "auth-required",
            message: "No hay una sesión autenticada.",
            projectId: firebaseConfig.projectId
          };
          return false;
        }
        if (!db) {
          window.ultimoErrorGuardadoFirebase = {
            code: "firebase-not-initialized",
            message: "Firestore no está inicializado.",
            projectId: firebaseConfig.projectId
          };
          return false;
        }
        try {
          const ref = doc(db, "estudiantes", user.uid);
          await runTransaction(db, async transaction => {
            const snapshot = await transaction.get(ref);
            const remoto = snapshot.exists() ? snapshot.data() : {};
            const versionRemota = Math.max(0, Number(remoto?.versionLocal) || 0);
            const incluyeVersion = Object.prototype.hasOwnProperty.call(payload || {}, "versionLocal");
            const versionLocal = Math.max(0, Number(payload?.versionLocal) || 0);
            if (incluyeVersion && versionRemota > versionLocal) {
              const conflicto = new Error("Existe una version remota mas nueva.");
              conflicto.code = "sync-conflict";
              conflicto.remoteVersion = versionRemota;
              conflicto.localVersion = versionLocal;
              throw conflicto;
            }
            transaction.set(ref, {
              ...payload,
              uid: user.uid,
              email: user.email || "",
              emailVerificado: user.emailVerified === true,
              nombreGoogle: user.displayName || "",
              fotoGoogle: user.photoURL || "",
              actualizadoEn: serverTimestamp()
            }, { merge: true });
          });
          window.ultimoErrorGuardadoFirebase = null;
          return true;
        } catch (error) {
          console.error("Firebase save error:", error);
          window.ultimoErrorGuardadoFirebase = {
            code: error?.code || '',
            message: error?.message || 'Error desconocido',
            projectId: firebaseConfig.projectId,
            uid: user.uid,
            email: user.email || '',
            emailVerified: user.emailVerified === true,
            operation: "create-or-update-student",
            remoteVersion: Number(error?.remoteVersion) || 0,
            localVersion: Number(error?.localVersion) || 0
          };
          return false;
        }
      };

      window.registrarIntentosPortapapelesFirebase = async function(eventos = []) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db) return false;

        const entradas = (Array.isArray(eventos) ? eventos : [eventos])
          .filter(evento => ["copiar", "cortar", "pegar"].includes(evento?.accion))
          .slice(0, 25);
        if (!entradas.length) return false;

        try {
          const referencia = doc(db, "estudiantes", user.uid);
          const auditoriaRef = collection(db, "estudiantes", user.uid, "auditoriaPortapapeles");
          await runTransaction(db, async transaccion => {
            const snapshot = await transaccion.get(referencia);
            const anterior = snapshot.exists()
              ? (snapshot.data().intentosPortapapeles || {})
              : {};
            const conteosAnteriores = anterior.conteos && typeof anterior.conteos === "object"
              ? anterior.conteos
              : {};
            const conteos = {
              copiar: Math.max(0, Number(conteosAnteriores.copiar) || 0),
              cortar: Math.max(0, Number(conteosAnteriores.cortar) || 0),
              pegar: Math.max(0, Number(conteosAnteriores.pegar) || 0)
            };
            const nuevosRegistros = entradas.map(evento => {
              const ahora = Number(evento.fechaEpoch) || Date.now();
              const registro = {
                id: String(evento.id || `${ahora}-${Math.random().toString(36).slice(2, 9)}`).slice(0, 80),
                accion: evento.accion,
                seccionId: String(evento.seccionId || "").slice(0, 80),
                seccionTitulo: String(evento.seccionTitulo || "").slice(0, 160),
                metodo: String(evento.metodo || "evento").slice(0, 40),
                eventoOrigen: String(evento.eventoOrigen || "").slice(0, 40),
                tecla: String(evento.tecla || "").slice(0, 20),
                modificadores: String(evento.modificadores || "").slice(0, 80),
                seleccionCaracteres: Math.max(0, Number(evento.seleccionCaracteres) || 0),
                visibilidad: String(evento.visibilidad || document.visibilityState || "visible").slice(0, 20),
                conectado: evento.conectado !== false,
                versionScript: String(evento.versionScript || VERSION_SCRIPT).slice(0, 80),
                fechaISO: new Date(ahora).toISOString(),
                fechaEpoch: ahora
              };
              conteos[registro.accion] += 1;
              return registro;
            });
            const total = conteos.copiar + conteos.cortar + conteos.pegar;
            const ahora = Date.now();
            const ultimosDosMinutos = nuevosRegistros.filter(item => ahora - Number(item.fechaEpoch || 0) <= 120000).length
              + Math.max(0, Number(anterior.intentosUltimosDosMinutos) || 0);
            const riesgo = total >= 6 || ultimosDosMinutos >= 4
              ? "alto"
              : (total >= 3 || ultimosDosMinutos >= 2 ? "medio" : (total > 0 ? "bajo" : "sin-datos"));

            transaccion.set(referencia, {
              uid: user.uid,
              email: user.email || "",
              nombreGoogle: user.displayName || "",
              intentosPortapapeles: {
                total,
                conteos,
                riesgo,
                intentosUltimosDosMinutos: ultimosDosMinutos,
                versionScript: String(nuevosRegistros[nuevosRegistros.length - 1]?.versionScript || VERSION_SCRIPT),
                ultimoIntento: nuevosRegistros[nuevosRegistros.length - 1]
              },
              actualizadoEn: serverTimestamp()
            }, { merge: true });
            nuevosRegistros.forEach(registro => {
              const auditoria = doc(auditoriaRef, registro.id);
              transaccion.set(auditoria, {
                ...registro,
                uid: user.uid,
                email: user.email || "",
                registradoEn: serverTimestamp()
              }, { merge: false });
            });
          });
          return true;
        } catch (error) {
          console.warn("No se pudo registrar el intento de portapapeles:", error);
          window.ultimoErrorIntentoPortapapeles = {
            code: error?.code || "",
            message: error?.message || "Error desconocido"
          };
          return false;
        }
      };

      window.registrarIntentoPortapapelesFirebase = async function(evento = {}) {
        return window.registrarIntentosPortapapelesFirebase([evento]);
      };

      window.cargarHistorialPortapapelesFirebase = async function(uid, limite = 100) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado || !uid || !db) return [];
        try {
          const referencia = collection(db, "estudiantes", uid, "auditoriaPortapapeles");
          const snapshot = await getDocs(query(referencia, orderBy("fechaEpoch", "desc"), limit(Math.min(200, Math.max(1, Number(limite) || 100)))));
          return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        } catch (error) {
          console.warn("No se pudo cargar la auditoría de portapapeles:", error);
          return [];
        }
      };

      function mostrarAlertaMensajeRecibido(mensaje = {}, rolReceptor = "") {
        if (!mensaje || mensaje.propio) return;
        const autor = String(mensaje.autorNombre || (rolReceptor === "docente" ? "Estudiante" : "Docente"));
        const texto = String(mensaje.texto || "").trim();
        let aviso = document.getElementById("mensajeRecibidoToast");
        if (!aviso) {
          aviso = document.createElement("div");
          aviso.id = "mensajeRecibidoToast";
          aviso.setAttribute("role", "status");
          aviso.setAttribute("aria-live", "polite");
          Object.assign(aviso.style, {
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            zIndex: "100000",
            maxWidth: "min( min(92vw, 380px), 380px )",
            padding: ".8rem 1rem",
            borderRadius: "10px",
            border: "1px solid rgba(125,211,252,.45)",
            background: "rgba(15,23,42,.97)",
            color: "#e0f2fe",
            boxShadow: "0 14px 36px rgba(0,0,0,.35)",
            font: "600 .88rem/1.35 system-ui, sans-serif",
            cursor: "pointer"
          });
          document.body.appendChild(aviso);
        }
        aviso.innerHTML = `<strong style="display:block;color:#7dd3fc">Nuevo mensaje de ${String(autor).replace(/[<>&"]/g, "")}</strong><span>${texto.replace(/[<>&"]/g, "").slice(0, 220)}</span>`;
        aviso.hidden = false;
        clearTimeout(aviso.__timer);
        aviso.__timer = setTimeout(() => { aviso.hidden = true; }, 6500);
        aviso.onclick = () => { aviso.hidden = true; };
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          try { new Notification(`Nuevo mensaje de ${autor}`, { body: texto.slice(0, 160), tag: `mensaje-${mensaje.id || Date.now()}` }); } catch (_) {}
        }
      }
      window.mostrarAlertaMensajeRecibido = mostrarAlertaMensajeRecibido;

      // Señal liviana e independiente del progreso y del código completo.
      // Permite que el panel docente detecte al estudiante aunque no haya un guardado pendiente.
      window.actualizarControlEstudianteFirebase = async function(estado = {}) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db) return false;
        let documentoEstudianteListo =
          window.__uidPresenciaEstudianteListo === user.uid;
        if (!documentoEstudianteListo) {
          try {
            const snapEstudiante = await getDoc(doc(db, "estudiantes", user.uid));
            documentoEstudianteListo = Boolean(
              snapEstudiante.exists() && snapEstudiante.data().estadoCuenta
            );
            if (documentoEstudianteListo) {
              window.__uidPresenciaEstudianteListo = user.uid;
            }
          } catch (_) {}
        }
        try {
          const controlRef = doc(db, "controlEstudiantes", user.uid);
          const sesionRef = doc(db, "controlEstudiantes", user.uid, "sesiones", SESION_ESTUDIANTE_ID);
          if (Date.now() - ultimaComprobacionSesiones > 60000) {
            const controlAnterior = await getDoc(controlRef).catch(() => null);
            const datosAnteriores = controlAnterior?.exists?.() ? controlAnterior.data() : {};
            otraSesionRecienteCache = Boolean(
              datosAnteriores.sesionId &&
              datosAnteriores.sesionId !== SESION_ESTUDIANTE_ID &&
              Date.now() - Number(datosAnteriores.activoEnCliente || 0) < 120000
            );
            otraSesionIdCache = otraSesionRecienteCache
              ? String(datosAnteriores.sesionId).slice(0, 100)
              : "";
            ultimaComprobacionSesiones = Date.now();
          }
          const otraSesionReciente = otraSesionRecienteCache;
          const estadoConexionActual = document.visibilityState === "hidden" ? "segundo_plano" : "en_linea";
          const latidoCliente = Date.now();
          await setDoc(sesionRef, {
            uid: user.uid,
            email: user.email || "",
            nombre: user.displayName || "",
            sesionId: SESION_ESTUDIANTE_ID,
            seccionActiva: String(estado.seccionActiva || "").slice(0, 100),
            visibilidad: document.visibilityState || "visible",
            estadoConexion: estadoConexionActual,
            versionCodigo: VERSION_CODIGO_SUBIDO,
            versionScript: VERSION_SCRIPT,
            iniciadoEnCliente: SESION_INICIADA_EN_CLIENTE,
            ultimoLatidoCliente: latidoCliente,
            ultimoLatido: serverTimestamp()
          }, { merge: true });
          await setDoc(controlRef, {
            uid: user.uid,
            email: user.email || "",
            nombre: user.displayName || "",
            seccionActiva: String(estado.seccionActiva || "").slice(0, 100),
            escribiendo: estado.escribiendo === true,
            sesionId: SESION_ESTUDIANTE_ID,
            sesionIniciadaEnCliente: SESION_INICIADA_EN_CLIENTE,
            visibilidad: document.visibilityState || "visible",
            estadoConexion: estadoConexionActual,
            motivoDesconexion: "",
            sesionesDuplicadas: otraSesionReciente,
            otraSesionId: otraSesionIdCache,
            versionCodigo: VERSION_CODIGO_SUBIDO,
            versionScript: VERSION_SCRIPT,
            activoEn: serverTimestamp(),
            // Respaldo inmediato mientras serverTimestamp termina de resolverse.
            activoEnCliente: latidoCliente
          });
          if (documentoEstudianteListo) {
            await setDoc(doc(db, "estudiantes", user.uid), {
              presenciaEnLinea: true,
              presenciaActualizadaEn: serverTimestamp(),
              presenciaActualizadaEnCliente: Date.now(),
              versionScript: VERSION_SCRIPT
            }, { merge: true });
          }
          fallosPresenciaConsecutivos = 0;
          emitirDiagnosticoPresencia({
            perfilEncontrado: documentoEstudianteListo,
            presenciaEnviada: true,
            estadoConexion: estadoConexionActual,
            sesionesDuplicadas: otraSesionReciente,
            ultimoLatido: Date.now()
          });
          if (!window.__accesoInicioRegistradoUid && documentoEstudianteListo) {
            window.__accesoInicioRegistradoUid = user.uid;
            window.registrarEventoAccesoFirebase?.("inicio_sesion", {
              sesionesDuplicadas: otraSesionReciente
            });
          }
          return true;
        } catch (error) {
          fallosPresenciaConsecutivos += 1;
          emitirDiagnosticoPresencia({
            perfilEncontrado: documentoEstudianteListo,
            presenciaEnviada: false,
            estadoConexion: navigator.onLine === false ? "sin_conexion" : "inestable",
            error: error?.code || error?.message || "Error de presencia",
            ultimoLatido: Date.now()
          });
          console.warn("No se pudo actualizar la señal de conexión del estudiante:", error);
          return false;
        }
      };

      window.registrarEventoAccesoFirebase = async function(tipo, detalle = {}) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db || !["inicio_sesion", "cierre_sesion"].includes(tipo)) return false;
        try {
          const eventoRef = doc(collection(db, "estudiantes", user.uid, "historialAccesos"));
          await setDoc(eventoRef, {
            tipo,
            uid: user.uid,
            email: user.email || "",
            sesionId: SESION_ESTUDIANTE_ID,
            versionScript: VERSION_SCRIPT,
            visibilidad: document.visibilityState || "visible",
            navegador: String(navigator.userAgentData?.brands?.[0]?.brand || navigator.userAgent || "").slice(0, 160),
            sesionesDuplicadas: detalle.sesionesDuplicadas === true,
            duracionSesionSegundos: tipo === "cierre_sesion"
              ? Math.max(0, Math.round((Date.now() - SESION_INICIADA_EN_CLIENTE) / 1000))
              : 0,
            fechaCliente: Date.now(),
            registradoEn: serverTimestamp()
          });
          return true;
        } catch (error) {
          console.warn("No se pudo registrar el evento de acceso:", error);
          return false;
        }
      };

      window.marcarDesconexionEstudianteFirebase = async function(motivo = "cierre") {
        const user = window.firebaseCurrentUser || auth?.currentUser;
        if (!user || !db) return false;
        try {
          const controlRef = doc(db, "controlEstudiantes", user.uid);
          await runTransaction(db, async transaction => {
            const snapshot = await transaction.get(controlRef);
            if (!snapshot.exists() || snapshot.data().sesionId !== SESION_ESTUDIANTE_ID) return;
            transaction.set(controlRef, {
              estadoConexion: "desconectado",
              motivoDesconexion: String(motivo).slice(0, 40),
              escribiendo: false,
              visibilidad: document.visibilityState || "hidden",
              sesionesDuplicadas: false,
              otraSesionId: "",
              activoEn: serverTimestamp(),
              activoEnCliente: Date.now()
            }, { merge: true });
          });
          await setDoc(sesionRef, {
            estadoConexion: "desconectado",
            visibilidad: document.visibilityState || "hidden",
            ultimoLatido: serverTimestamp(),
            ultimoLatidoCliente: Date.now(),
            cerradoEn: serverTimestamp()
          }, { merge: true });
          await window.registrarEventoAccesoFirebase?.("cierre_sesion");
          return true;
        } catch (_) {
          return false;
        }
      };

      window.cargarHistorialAccesosProfesorFirebase = async function(uid) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado || !uid) return [];
        const { database } = contextoDocenteFirebase();
        if (!database) return [];
        const snapshot = await getDocs(collection(database, "estudiantes", uid, "historialAccesos"));
        return snapshot.docs
          .map(item => ({ id: item.id, ...item.data() }))
          .sort((a, b) => Number(b.fechaCliente || 0) - Number(a.fechaCliente || 0))
          .slice(0, 50);
      };

      window.cargarEstudianteProfesorFirebase = async function(uid) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado || !uid) return null;
        const { database } = contextoDocenteFirebase();
        if (!database) return null;
        try {
          const [estudianteSnap, controlSnap] = await Promise.all([
            getDoc(doc(database, "estudiantes", uid)),
            getDoc(doc(database, "controlEstudiantes", uid))
          ]);
          if (!estudianteSnap.exists()) return null;
          return {
            ...estudianteSnap.data(),
            uid: estudianteSnap.data().uid || estudianteSnap.id,
            __controlEstudiante: controlSnap.exists() ? controlSnap.data() : null
          };
        } catch (error) {
          console.error("No se pudo actualizar el detalle del estudiante:", error);
          return null;
        }
      };

      window.guardarCodigoColaborativoDocenteFirebase = async function(uid, sectionId, codigo = "") {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !sectionId) return false;
        try {
          if (!(await verificarUsuarioDocente(user))) return false;
          const estudianteRef = doc(database, "estudiantes", uid);
          const snapshot = await getDoc(estudianteRef);
          if (!snapshot.exists()) return false;
          const datos = snapshot.data();
          const colaboracionAnterior = datos.colaboracionDocente || {};
          const versionNueva = Number(colaboracionAnterior.version || 0) + 1;
          const codigos = { ...(datos.codigos || {}), [sectionId]: String(codigo).slice(0, 30000) };
          await setDoc(estudianteRef, {
            codigos,
            colaboracionDocente: {
              sectionId,
              codigo: codigos[sectionId],
              version: versionNueva,
              actualizadoEn: serverTimestamp(),
              actualizadoPor: user.email || user.displayName || user.uid
            },
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("No se pudo guardar el código colaborativo:", error);
          return false;
        }
      };

      window.guardarCodigoColaborativoDocenteConControlFirebase = async function(uid, sectionId, codigo, versionBase) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !sectionId || !(await verificarUsuarioDocente(user))) return { ok: false, conflict: false };
        const referencia = doc(database, "estudiantes", uid);
        const snapshot = await getDoc(referencia);
        if (!snapshot.exists()) return { ok: false, conflict: false };
        const datos = snapshot.data();
        const actual = datos.colaboracionDocente || {};
        if (versionBase !== undefined && Number(actual.version || 0) !== Number(versionBase || 0)) {
          return { ok: false, conflict: true, codigoActual: datos.codigos?.[sectionId] || "" };
        }
        const ok = await window.guardarCodigoColaborativoDocenteFirebase(uid, sectionId, codigo);
        return { ok, conflict: false };
      };

      const ORIGEN_FIRESTORE_CRDT = Symbol("firestore-crdt");
      const sesionesCodigoCRDT = new Map();

      function bytesABase64(bytes) {
        let binario = "";
        const bloque = 0x8000;
        for (let i = 0; i < bytes.length; i += bloque) {
          binario += String.fromCharCode(...bytes.subarray(i, i + bloque));
        }
        return btoa(binario);
      }

      function base64ABytes(valor) {
        const binario = atob(String(valor || ""));
        const bytes = new Uint8Array(binario.length);
        for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
        return bytes;
      }

      function diferenciaTextoCRDT(anterior, siguiente) {
        let inicio = 0;
        const limite = Math.min(anterior.length, siguiente.length);
        while (inicio < limite && anterior[inicio] === siguiente[inicio]) inicio++;
        let finAnterior = anterior.length;
        let finSiguiente = siguiente.length;
        while (
          finAnterior > inicio &&
          finSiguiente > inicio &&
          anterior[finAnterior - 1] === siguiente[finSiguiente - 1]
        ) {
          finAnterior--;
          finSiguiente--;
        }
        return {
          inicio,
          eliminar: finAnterior - inicio,
          insertar: siguiente.slice(inicio, finSiguiente)
        };
      }

      async function describirErrorDecisionCooperacion(error, user = window.firebaseCurrentUser) {
        const codigo = String(error?.code || "");
        if (codigo.includes("permission-denied")) {
          try {
            const estudiante = user?.uid
              ? await getDoc(doc(db, "estudiantes", user.uid))
              : null;
            const estadoCuenta = estudiante?.exists()
              ? estudiante.data()?.estadoCuenta
              : "sin_registro";
            if (estadoCuenta !== "activo") {
              return `Firestore rechazó la decisión porque la cuenta figura como "${estadoCuenta || "pendiente"}". El docente debe aprobar o reactivar la cuenta.`;
            }
          } catch (_) {}
          return "Firestore rechazó la decisión. Las reglas publicadas no coinciden con esta versión: publicá el archivo reglas.txt actualizado en Firebase.";
        }
        if (codigo.includes("unavailable") || codigo.includes("network") || navigator.onLine === false) {
          return "No hay conexión con Firebase. Verificá Internet e intentá nuevamente.";
        }
        const detalle = String(error?.message || codigo || "error desconocido").slice(0, 240);
        return `No se pudo registrar la decisión: ${detalle}`;
      }

      async function iniciarSesionCodigoCRDT({ uid, sectionId, codigoInicial = "", rol = "estudiante" }) {
        if (!uid || !sectionId) throw new Error("crdt-invalid-target");
        if (rol === "docente" && !(await window.autorizarDocenteFirebase?.())) {
          throw new Error("teacher-not-authorized");
        }
        const contexto = rol === "docente"
          ? contextoDocenteFirebase()
          : { user: window.firebaseCurrentUser, database: db };
        const { user, database } = contexto;
        if (!user || !database) throw new Error("firebase-not-ready");
        const clave = `${rol}:${uid}:${sectionId}:${user.uid}`;
        if (sesionesCodigoCRDT.has(clave)) return sesionesCodigoCRDT.get(clave);

        const documento = new Y.Doc();
        const texto = documento.getText("codigo");
        const clienteId = `${rol}-${user.uid}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
        const metaRef = doc(database, "estudiantes", uid, "colaboracionCodigo", sectionId);
        const actualizacionesRef = collection(database, "estudiantes", uid, "colaboracionCodigo", sectionId, "actualizaciones");
        const presenciaRef = doc(database, "estudiantes", uid, "colaboracionCodigo", sectionId, "presencia", clienteId);
        const mensajesRef = collection(database, "estudiantes", uid, "colaboracionCodigo", sectionId, "mensajes");
        const vistos = new Set();
        const estadoListeners = new Set();
        const presenciaListeners = new Set();
        const modoCooperacionListeners = new Set();
        let participantesActuales = [];
        const normalizarModoCooperacion = datos => ({
          activa: datos?.modoCooperacionActiva === true,
          pausada: datos?.edicionCooperativaPausada === true,
          consentimiento: ["pendiente", "aceptado", "rechazado", "finalizado"].includes(datos?.estadoConsentimiento)
            ? datos.estadoConsentimiento
            : "sin_solicitud",
          objetivo: String(datos?.objetivoCooperacion || ""),
          solicitadoPor: String(datos?.solicitadoPor || "")
        });
        let modoCooperacionActual = normalizarModoCooperacion({});
        let cola = [];
        let temporizador = null;
        let destruida = false;
        const colaRespaldoClave = `cooperation_pending:${rol}:${uid}:${sectionId}:${user.uid}`;
        const persistirColaPendiente = () => {
          try {
            if (!cola.length) {
              localStorage.removeItem(colaRespaldoClave);
              return;
            }
            localStorage.setItem(colaRespaldoClave, JSON.stringify({
              update: cola.length ? bytesABase64(Y.mergeUpdates(cola)) : "",
              guardadoEn: Date.now()
            }));
          } catch (error) {
            console.warn("No se pudo respaldar localmente la cola cooperativa:", error);
          }
        };

        const notificar = (estado, detalle = "") => estadoListeners.forEach(fn => fn({ estado, detalle }));
        const notificarPresencia = participantes => {
          participantesActuales = participantes;
          presenciaListeners.forEach(fn => fn(participantes));
        };
        const estadoInicial = await runTransaction(database, async transaction => {
          const snapshot = await transaction.get(metaRef);
          if (snapshot.exists() && snapshot.data().semilla) {
            return { semilla: snapshot.data().semilla, datos: snapshot.data() };
          }
          const temporal = new Y.Doc();
          temporal.getText("codigo").insert(0, String(codigoInicial || ""));
          const semillaNueva = bytesABase64(Y.encodeStateAsUpdate(temporal));
          const datosNuevos = {
            uid,
            sectionId,
            semilla: semillaNueva,
            creadoEn: serverTimestamp(),
            creadoPor: user.email || user.uid,
            actualizadoEn: serverTimestamp()
          };
          transaction.set(metaRef, datosNuevos, { merge: true });
          return { semilla: semillaNueva, datos: datosNuevos };
        });
        modoCooperacionActual = normalizarModoCooperacion(estadoInicial.datos);
        Y.applyUpdate(documento, base64ABytes(estadoInicial.semilla), ORIGEN_FIRESTORE_CRDT);

        const iniciales = await getDocs(actualizacionesRef);
        iniciales.docs.forEach(item => {
          vistos.add(item.id);
          const datosIniciales = item.data();
          const update = datosIniciales.update;
          if (update) Y.applyUpdate(documento, base64ABytes(update), ORIGEN_FIRESTORE_CRDT);
        });
        try {
          const respaldo = JSON.parse(localStorage.getItem(colaRespaldoClave) || "null");
          if (respaldo?.update) {
            const updateRecuperado = base64ABytes(respaldo.update);
            Y.applyUpdate(documento, updateRecuperado, { tipo: "local-recovery", rol });
            cola.push(updateRecuperado);
          }
        } catch (error) {
          console.warn("No se pudo recuperar la cola cooperativa local:", error);
        }

        const publicarCola = async () => {
          temporizador = null;
          if (destruida || !cola.length) return true;
          const lote = Y.mergeUpdates(cola);
          cola = [];
          const id = `${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
          notificar("syncing", "Sincronizando cambios");
          try {
            const loteFirestore = writeBatch(database);
            loteFirestore.set(doc(actualizacionesRef, id), {
              id,
              uid,
              sectionId,
              update: bytesABase64(lote),
              clienteId,
              rol,
              autorUid: user.uid,
              autorEmail: user.email || "",
              creadoEn: serverTimestamp()
            });
            loteFirestore.set(metaRef, {
              actualizadoEn: serverTimestamp(),
              actualizadoPor: user.email || user.uid
            }, { merge: true });
            await loteFirestore.commit();
            localStorage.removeItem(colaRespaldoClave);
            notificar("synced", "Cambios sincronizados");
            return true;
          } catch (error) {
            console.error("No se pudo publicar la actualización CRDT:", error);
            cola.unshift(lote);
            persistirColaPendiente();
            notificar("error", "Cambios pendientes; se reintentarán");
            return false;
          }
         };

        documento.on("update", (update, origen) => {
          if (origen === ORIGEN_FIRESTORE_CRDT || origen?.tipo === "firestore-crdt" || destruida) return;
          cola.push(update);
          persistirColaPendiente();
          clearTimeout(temporizador);
          temporizador = setTimeout(publicarCola, 90);
        });

        const detenerActualizaciones = onSnapshot(actualizacionesRef, snapshot => {
          snapshot.docChanges().forEach(cambio => {
            if (cambio.type === "removed" || vistos.has(cambio.doc.id)) return;
            vistos.add(cambio.doc.id);
            const datosCambio = cambio.doc.data();
            const update = datosCambio.update;
            if (update) Y.applyUpdate(documento, base64ABytes(update), {
              tipo: "firestore-crdt",
              rol: datosCambio.rol === "docente" ? "docente" : "estudiante",
              autorUid: datosCambio.autorUid || "",
              autorEmail: datosCambio.autorEmail || ""
            });
          });
        }, error => {
          console.error("Error escuchando actualizaciones CRDT:", error);
          notificar("error", "Conexión colaborativa interrumpida");
        });

        let detenerPresencia = null;
        const detenerEscuchaPresencia = () => {
          if (detenerPresencia) detenerPresencia();
          detenerPresencia = null;
          notificarPresencia([]);
        };
        const iniciarEscuchaPresencia = () => {
          if (detenerPresencia) return;
          detenerPresencia = onSnapshot(
            collection(database, "estudiantes", uid, "colaboracionCodigo", sectionId, "presencia"),
            snapshot => {
              const ahora = Date.now();
              const participantes = snapshot.docs.map(item => {
                const datos = item.data();
                const activoMs = datos.activoEn?.toMillis?.()
                  || Number(datos.activoEn?.seconds || 0) * 1000
                  || Date.parse(datos.activoEn || "")
                  || 0;
                return {
                  id: item.id,
                  clienteId: datos.clienteId || item.id,
                  nombre: datos.nombre || datos.rol || "Participante",
                  rol: datos.rol === "docente" ? "docente" : "estudiante",
                  propio: datos.clienteId === clienteId,
                  inactivo: !activoMs || ahora - activoMs > 45000,
                  activoMs
                };
              }).filter(item => !item.activoMs || ahora - item.activoMs < 120000)
                .sort((a, b) => Number(b.propio) - Number(a.propio) || b.activoMs - a.activoMs);
              notificarPresencia(participantes);
            },
            error => {
              console.error("Error escuchando presencia colaborativa:", error);
              detenerEscuchaPresencia();
            }
          );
        };
        const notificarModoCooperacion = datos => {
          const modoAnterior = modoCooperacionActual;
          modoCooperacionActual = normalizarModoCooperacion(datos);
          modoCooperacionListeners.forEach(fn => fn({ ...modoCooperacionActual }));
          const aceptada = modoCooperacionActual.consentimiento === "aceptado" &&
            modoCooperacionActual.activa;
          if (aceptada) {
            iniciarEscuchaPresencia();
            void actualizarPresencia({}, true);
          } else {
            detenerEscuchaPresencia();
            deleteDoc(presenciaRef).catch(() => {});
          }
          if (
            aceptada &&
            !modoCooperacionActual.pausada &&
            (modoAnterior.pausada || modoAnterior.consentimiento !== "aceptado") &&
            cola.length
          ) {
            clearTimeout(temporizador);
            temporizador = setTimeout(publicarCola, 0);
          }
        };
        const detenerModoCooperacion = onSnapshot(
          metaRef,
          snapshot => notificarModoCooperacion(snapshot.exists() ? snapshot.data() : {}),
          error => {
            console.error("Error escuchando el modo de cooperación:", error);
            notificar("error", "No se pudo consultar el consentimiento");
          }
        );

        let ultimaPresenciaPublicada = "";
        const actualizarPresencia = (cursor = {}, forzar = false) => {
          const cooperacionAceptada = modoCooperacionActual.consentimiento === "aceptado" &&
            modoCooperacionActual.activa;
          if (!cooperacionAceptada) {
            return deleteDoc(presenciaRef).catch(() => {});
          }
          const inicio = Math.max(0, Number(cursor.inicio) || 0);
          const fin = Math.max(0, Number(cursor.fin) || 0);
          const clavePresencia = `${inicio}:${fin}`;
          if (!forzar && clavePresencia === ultimaPresenciaPublicada) return Promise.resolve();
          ultimaPresenciaPublicada = clavePresencia;
          return setDoc(presenciaRef, {
          clienteId,
          uid,
          sectionId,
          rol,
          nombre: user.displayName || user.email || rol,
          autorUid: user.uid,
          cursorInicio: inicio,
          cursorFin: fin,
          escribiendo: forzar !== true,
          activoEn: serverTimestamp()
          }, { merge: true }).catch(() => {});
        };

        if (modoCooperacionActual.consentimiento === "aceptado" && modoCooperacionActual.activa) {
          iniciarEscuchaPresencia();
          await actualizarPresencia();
        }
        const latido = setInterval(() => actualizarPresencia({}, true), 20000);
        const sesion = {
          clave,
          documento,
          texto,
          clienteId,
          rol,
          onStatus(fn) { estadoListeners.add(fn); return () => estadoListeners.delete(fn); },
          onPresence(fn) {
            presenciaListeners.add(fn);
            fn(participantesActuales);
            return () => presenciaListeners.delete(fn);
          },
           onModoCooperacion(fn) {
             modoCooperacionListeners.add(fn);
             fn({ ...modoCooperacionActual });
             return () => modoCooperacionListeners.delete(fn);
           },
           getModoCooperacion() {
             return { ...modoCooperacionActual };
           },
           async solicitarCooperacion(objetivo = "") {
            if (rol !== "docente") return false;
            const descripcion = String(objetivo || "Acompañamiento docente sobre la actividad actual").trim().slice(0, 500);
            await setDoc(metaRef, {
              modoCooperacionActiva: true,
              edicionCooperativaPausada: false,
              estadoConsentimiento: "aceptado",
               objetivoCooperacion: descripcion,
               solicitadoPor: user.displayName || user.email || "Docente",
               solicitudEn: serverTimestamp(),
              respondidoEn: serverTimestamp(),
              respondidoPor: user.email || user.uid,
               motivoRechazo: "",
               actualizadoEn: serverTimestamp(),
               actualizadoPor: user.email || user.uid
             }, { merge: true });
             return true;
           },
           async responderCooperacion(aceptar, motivo = "") {
             if (rol !== "estudiante" || user.uid !== uid) return false;
             const aceptada = aceptar === true;
             await setDoc(metaRef, {
               modoCooperacionActiva: aceptada,
               edicionCooperativaPausada: !aceptada,
               estadoConsentimiento: aceptada ? "aceptado" : "rechazado",
               respondidoEn: serverTimestamp(),
               respondidoPor: user.email || user.displayName || user.uid,
               motivoRechazo: aceptada ? "" : String(motivo || "").trim().slice(0, 300),
               actualizadoEn: serverTimestamp(),
               actualizadoPor: user.email || user.uid
             }, { merge: true });
             return true;
           },
           async establecerPausaCooperacion(pausada) {
             if (rol !== "docente" || modoCooperacionActual.consentimiento !== "aceptado") return false;
             await setDoc(metaRef, {
               edicionCooperativaPausada: pausada === true,
               actualizadoEn: serverTimestamp(),
               actualizadoPor: user.email || user.uid
             }, { merge: true });
             return true;
           },
           async finalizarCooperacion() {
             if (rol !== "docente") return false;
             await setDoc(metaRef, {
               modoCooperacionActiva: false,
               edicionCooperativaPausada: true,
               estadoConsentimiento: "finalizado",
               actualizadoEn: serverTimestamp(),
               actualizadoPor: user.email || user.uid
             }, { merge: true });
             return true;
           },
           escucharMensajes(fn) {
            if (typeof fn !== "function") return () => {};
            return onSnapshot(
              query(mensajesRef, orderBy("creadoEn", "desc"), limit(60)),
              snapshot => {
                const mensajes = snapshot.docs.map(item => {
                  const datos = item.data();
                  return {
                    id: item.id,
                    ...datos,
                    propio: datos.autorUid === user.uid,
                    creadoMs: datos.creadoEn?.toMillis?.()
                      || Number(datos.creadoEn?.seconds || 0) * 1000
                      || Number(datos.creadoMs || 0)
                  };
                }).sort((a, b) => a.creadoMs - b.creadoMs);
                fn(mensajes, null);
              },
              error => fn([], error)
            );
          },
          async actualizarEstadoMensajes(mensajes = [], marcarLeidos = false) {
            const campoEntrega = rol === "docente" ? "entregadoDocenteEn" : "entregadoEstudianteEn";
            const campoLectura = rol === "docente" ? "leidoDocenteEn" : "leidoEstudianteEn";
            const pendientes = mensajes.filter(mensaje =>
              !mensaje.propio &&
              (!mensaje[campoEntrega] || (marcarLeidos && !mensaje[campoLectura]))
            );
            if (!pendientes.length) return true;
            await Promise.all(pendientes.slice(-60).map(mensaje => {
              const cambios = {};
              if (!mensaje[campoEntrega]) cambios[campoEntrega] = serverTimestamp();
              if (marcarLeidos && !mensaje[campoLectura]) cambios[campoLectura] = serverTimestamp();
              return setDoc(doc(mensajesRef, mensaje.id), cambios, { merge: true });
            }));
            return true;
          },
          async enviarMensaje(contenido, cita = null) {
            const textoMensaje = String(contenido || "").trim().slice(0, 600);
            if (!textoMensaje) return false;
            const id = `${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
            const citaLimpia = cita && Number(cita.lineaInicio) > 0 ? {
              lineaInicio: Math.max(1, Number(cita.lineaInicio) || 1),
              lineaFin: Math.max(1, Number(cita.lineaFin) || Number(cita.lineaInicio) || 1),
              texto: String(cita.texto || "").slice(0, 1200)
            } : null;
            await setDoc(doc(mensajesRef, id), {
              id,
              uid,
              sectionId,
              texto: textoMensaje,
              cita: citaLimpia,
              rol,
              autorUid: user.uid,
              autorNombre: user.displayName || user.email || (rol === "docente" ? "Docente" : "Estudiante"),
              creadoMs: Date.now(),
              creadoEn: serverTimestamp()
            });
            return true;
          },
          actualizarPresencia,
           async flush() {
             clearTimeout(temporizador);
             return publicarCola();
           },
          async destroy() {
            if (destruida) return;
            const sincronizada = await this.flush();
            if (!sincronizada || cola.length) {
              persistirColaPendiente();
              return false;
            }
            destruida = true;
            clearInterval(latido);
             detenerActualizaciones();
             detenerEscuchaPresencia();
             detenerModoCooperacion();
            documento.destroy();
            sesionesCodigoCRDT.delete(clave);
            try { await deleteDoc(presenciaRef); } catch (_) {}
            return true;
          }
        };
        sesionesCodigoCRDT.set(clave, sesion);
        notificar("synced", "Colaboración activa");
        return sesion;
      }

      function vincularTextareaCodigoCRDT(textarea, sesion, sectionId, estadoElemento = null) {
        if (!textarea || !sesion) return () => {};
        if (textarea.__desvincularCRDT) textarea.__desvincularCRDT();
        const origenLocal = { tipo: "textarea", clienteId: sesion.clienteId };
        const autorCambioElemento = document.createElement("span");
        autorCambioElemento.className = "collaboration-change-author";
        autorCambioElemento.setAttribute("aria-live", "polite");
        if (estadoElemento) {
          estadoElemento.insertAdjacentElement("afterend", autorCambioElemento);
        } else {
          textarea.parentElement?.insertBefore(autorCambioElemento, textarea);
        }
        let quitarModoCooperacion = () => {};
        if (sesion.rol === "estudiante") {
          quitarModoCooperacion = sesion.onModoCooperacion(modo => {
            const aceptada = modo.consentimiento === "aceptado" && modo.activa;
            actualizarBloqueoEditorEstudiante(sectionId, aceptada && modo.pausada);
          });
        }
        let temporizadorAutorCambio = null;
        const marcarCambio = (rol, nombre = "") => {
          const esDocente = rol === "docente";
          clearTimeout(temporizadorAutorCambio);
          textarea.classList.remove("crdt-change-teacher", "crdt-change-student");
          autorCambioElemento.className = `collaboration-change-author ${esDocente ? "is-teacher" : "is-student"} is-visible`;
          const iconoCambio = document.createElement("i");
          iconoCambio.className = `fa-solid ${esDocente ? "fa-chalkboard-user" : "fa-user-graduate"}`;
          const textoCambio = document.createElement("span");
          textoCambio.textContent = `Cambio de ${esDocente ? "docente" : "alumno"}${nombre ? ` · ${String(nombre).split("@")[0]}` : ""}`;
          autorCambioElemento.replaceChildren(iconoCambio, textoCambio);
          textarea.classList.add(esDocente ? "crdt-change-teacher" : "crdt-change-student");
          temporizadorAutorCambio = setTimeout(() => {
            textarea.classList.remove("crdt-change-teacher", "crdt-change-student");
            autorCambioElemento.classList.remove("is-visible");
          }, 1800);
        };
        const aplicarRemoto = (_, transaccion) => {
          if (transaccion.origin === origenLocal) return;
          const siguiente = sesion.texto.toString();
          if (textarea.value === siguiente) return;
          const inicio = textarea.selectionStart || 0;
          const fin = textarea.selectionEnd || inicio;
          textarea.value = siguiente;
          const posicion = Math.min(siguiente.length, inicio);
          textarea.setSelectionRange(posicion, Math.min(siguiente.length, fin));
          if (sesion.rol === "estudiante") {
            setLocalStorage(`draft_editor-${sectionId}`, siguiente);
            actualizarMetricasEditor(sectionId);
            programarGuardadoFirebase();
          }
          textarea.dispatchEvent(new CustomEvent("crdt-remote-change", { bubbles: true }));
          marcarCambio(
            transaccion.origin?.rol || (sesion.rol === "docente" ? "estudiante" : "docente"),
            transaccion.origin?.autorEmail || ""
          );
        };
        const sincronizarTextoLocal = () => {
          const anterior = sesion.texto.toString();
          const siguiente = textarea.value;
          if (anterior === siguiente) return;
          const cambio = diferenciaTextoCRDT(anterior, siguiente);
          sesion.documento.transact(() => {
            if (cambio.eliminar) sesion.texto.delete(cambio.inicio, cambio.eliminar);
            if (cambio.insertar) sesion.texto.insert(cambio.inicio, cambio.insertar);
          }, origenLocal);
          marcarCambio(sesion.rol);
          sesion.actualizarPresencia({ inicio: textarea.selectionStart, fin: textarea.selectionEnd });
        };
        const aplicarLocal = () => sincronizarTextoLocal();
        let temporizadorPresencia = null;
        const actualizarCursor = () => {
          clearTimeout(temporizadorPresencia);
          temporizadorPresencia = setTimeout(() => sesion.actualizarPresencia({
            inicio: textarea.selectionStart,
            fin: textarea.selectionEnd
          }), 250);
        };
        textarea.value = sesion.texto.toString();
        if (sesion.rol === "estudiante") {
          setLocalStorage(`draft_editor-${sectionId}`, textarea.value);
          actualizarMetricasEditor(sectionId);
        }
        textarea.dataset.crdtActivo = "true";
        textarea.addEventListener("input", aplicarLocal);
        textarea.addEventListener("keyup", actualizarCursor);
        textarea.addEventListener("click", actualizarCursor);
        textarea.addEventListener("cm-selection-change", actualizarCursor);
        sesion.texto.observe(aplicarRemoto);
        const quitarEstado = sesion.onStatus(info => {
          if (!estadoElemento) return;
          estadoElemento.className = `student-editor-state crdt-${info.estado}`;
          estadoElemento.innerHTML = `<i class="fa-solid ${info.estado === "synced" ? "fa-people-arrows" : info.estado === "error" ? "fa-triangle-exclamation" : "fa-arrows-rotate fa-spin"}"></i> ${info.detalle}`;
        });
        const presenciaElemento = document.createElement("span");
        presenciaElemento.className = "collaboration-presence";
        presenciaElemento.setAttribute("aria-live", "polite");
        presenciaElemento.setAttribute("aria-label", "Participantes del modo cooperación");
        if (estadoElemento) {
          estadoElemento.insertAdjacentElement("afterend", presenciaElemento);
        } else {
          textarea.parentElement?.insertBefore(presenciaElemento, textarea);
        }
        const quitarPresencia = sesion.onPresence(participantes => {
          const activos = participantes.filter(item => !item.inactivo);
          const otrosActivos = activos.filter(item => !item.propio);
          presenciaElemento.replaceChildren();

          const resumen = document.createElement("span");
          resumen.className = `collaboration-presence-summary${otrosActivos.length ? "" : " is-alone"}`;
          resumen.title = otrosActivos.length
            ? `${otrosActivos.length} participante${otrosActivos.length === 1 ? "" : "s"} conectado${otrosActivos.length === 1 ? "" : "s"} contigo`
            : "Esperando a otro participante";
          resumen.innerHTML = `<i class="fa-solid ${otrosActivos.length ? "fa-user-group" : "fa-user-clock"}"></i><span>${otrosActivos.length ? `${otrosActivos.length + 1} conectados` : "Solo vos"}</span>`;
          presenciaElemento.appendChild(resumen);

          participantes.slice(0, 4).forEach(item => {
            const persona = document.createElement("span");
            persona.className = `collaboration-presence-person${item.inactivo ? " is-idle" : ""}`;
            const nombre = item.propio ? "Vos" : String(item.nombre || "Participante");
            const rol = item.rol === "docente" ? "Docente" : "Estudiante";
            persona.title = `${nombre} · ${rol} · ${item.inactivo ? "señal demorada" : "en línea"}`;
            const punto = document.createElement("i");
            punto.className = "fa-solid fa-circle";
            const etiqueta = document.createElement("span");
            etiqueta.textContent = `${nombre} · ${rol}`;
            persona.append(punto, etiqueta);
            presenciaElemento.appendChild(persona);
          });

          if (participantes.length > 4) {
            const restantes = document.createElement("span");
            restantes.className = "collaboration-presence-person";
            restantes.textContent = `+${participantes.length - 4}`;
            restantes.title = `${participantes.length - 4} participantes adicionales`;
            presenciaElemento.appendChild(restantes);
          }
        });
        const chatElemento = document.createElement("section");
        chatElemento.className = "collaboration-chat";
        chatElemento.innerHTML = `
          <button class="collaboration-chat-toggle" type="button" aria-expanded="false">
            <span><i class="fa-solid fa-comments"></i> Mensajes de cooperación</span>
            <span>
              <span class="collaboration-chat-unread" hidden>0</span>
              <i class="fa-solid fa-chevron-down"></i>
            </span>
          </button>
          <div class="collaboration-chat-body" hidden>
            <div class="collaboration-chat-messages" aria-live="polite"></div>
            <div class="collaboration-chat-quick"></div>
            <div class="collaboration-chat-tools">
              <button class="collaboration-chat-tool collaboration-chat-cite" type="button" title="Citar el texto seleccionado en el editor">
                <i class="fa-solid fa-code"></i><span>Citar líneas</span>
              </button>
              <button class="collaboration-chat-tool collaboration-chat-sound" type="button" aria-pressed="false" title="Activar sonido para mensajes nuevos">
                <i class="fa-solid fa-volume-xmark"></i><span>Sonido</span>
              </button>
            </div>
            <div class="collaboration-chat-citation" hidden>
              <div><strong></strong><code></code></div>
              <button type="button" aria-label="Quitar cita" title="Quitar cita"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <form class="collaboration-chat-composer">
              <textarea maxlength="600" rows="2" placeholder="Escribí un mensaje sobre esta actividad…" aria-label="Mensaje de cooperación"></textarea>
              <button class="btn btn-primary collaboration-chat-send" type="submit" title="Enviar mensaje" aria-label="Enviar mensaje">
                <i class="fa-solid fa-paper-plane"></i>
              </button>
            </form>
            <div class="collaboration-chat-footer">
              <span class="collaboration-chat-status">Enter para enviar · Shift+Enter para nueva línea</span>
              <span class="collaboration-chat-counter">0/600</span>
            </div>
          </div>`;
        textarea.insertAdjacentElement("afterend", chatElemento);
        const chatToggle = chatElemento.querySelector(".collaboration-chat-toggle");
        const chatBody = chatElemento.querySelector(".collaboration-chat-body");
        const chatMensajes = chatElemento.querySelector(".collaboration-chat-messages");
        const chatRapidos = chatElemento.querySelector(".collaboration-chat-quick");
        const chatCitar = chatElemento.querySelector(".collaboration-chat-cite");
        const chatSonido = chatElemento.querySelector(".collaboration-chat-sound");
        const chatCita = chatElemento.querySelector(".collaboration-chat-citation");
        const chatCitaTitulo = chatCita.querySelector("strong");
        const chatCitaCodigo = chatCita.querySelector("code");
        const chatQuitarCita = chatCita.querySelector("button");
        const chatFormulario = chatElemento.querySelector(".collaboration-chat-composer");
        const chatEntrada = chatFormulario.querySelector("textarea");
        const chatEnviar = chatFormulario.querySelector("button");
        const chatEstado = chatElemento.querySelector(".collaboration-chat-status");
        const chatContador = chatElemento.querySelector(".collaboration-chat-counter");
        const chatNoLeidos = chatElemento.querySelector(".collaboration-chat-unread");
        const chatChevron = chatToggle.querySelector(".fa-chevron-down");
        let detenerMensajes = null;
        let mensajesInicializados = false;
        let mensajesConocidos = new Set();
        let mensajesActuales = [];
        let cantidadNoLeidos = 0;
        let ultimoEnvioMensaje = 0;
        let citaPendiente = null;
        let sonidoMensajesActivo = localStorage.getItem("cooperation_message_sound") === "true";
        let contextoAudioMensajes = null;

        const actualizarBotonSonido = () => {
          chatSonido.classList.toggle("is-active", sonidoMensajesActivo);
          chatSonido.setAttribute("aria-pressed", String(sonidoMensajesActivo));
          chatSonido.title = sonidoMensajesActivo
            ? "Desactivar sonido para mensajes nuevos"
            : "Activar sonido para mensajes nuevos";
          const icono = chatSonido.querySelector("i");
          if (icono) icono.className = `fa-solid ${sonidoMensajesActivo ? "fa-volume-high" : "fa-volume-xmark"}`;
        };
        const reproducirSonidoMensaje = () => {
          if (!sonidoMensajesActivo) return;
          try {
            const AudioContexto = window.AudioContext || window.webkitAudioContext;
            if (!AudioContexto) return;
            contextoAudioMensajes = contextoAudioMensajes || new AudioContexto();
            contextoAudioMensajes.resume?.();
            const oscilador = contextoAudioMensajes.createOscillator();
            const ganancia = contextoAudioMensajes.createGain();
            oscilador.type = "sine";
            oscilador.frequency.value = sesion.rol === "docente" ? 720 : 620;
            ganancia.gain.setValueAtTime(.0001, contextoAudioMensajes.currentTime);
            ganancia.gain.exponentialRampToValueAtTime(.12, contextoAudioMensajes.currentTime + .02);
            ganancia.gain.exponentialRampToValueAtTime(.0001, contextoAudioMensajes.currentTime + .22);
            oscilador.connect(ganancia);
            ganancia.connect(contextoAudioMensajes.destination);
            oscilador.start();
            oscilador.stop(contextoAudioMensajes.currentTime + .24);
          } catch (error) {
            console.warn("No se pudo reproducir el aviso de mensaje:", error);
          }
        };
        actualizarBotonSonido();

        const actualizarNoLeidos = () => {
          chatNoLeidos.textContent = String(cantidadNoLeidos);
          chatNoLeidos.hidden = cantidadNoLeidos === 0;
        };
        const mostrarEstadoChat = (texto, clase = "") => {
          chatEstado.textContent = texto;
          chatEstado.className = `collaboration-chat-status${clase ? ` ${clase}` : ""}`;
        };
        const conversacionVisible = () => (
          !chatBody.hidden &&
          !document.hidden &&
          document.hasFocus()
        );
        const marcarMensajesVisibles = () => {
          if (!conversacionVisible() || !mensajesActuales.length) return;
          cantidadNoLeidos = 0;
          actualizarNoLeidos();
          void sesion.actualizarEstadoMensajes(mensajesActuales, true).catch(error => {
            console.error("No se pudieron marcar los mensajes como leídos:", error);
          });
        };
        const revisarVisibilidadChat = () => {
          if (!document.hidden) marcarMensajesVisibles();
        };
        document.addEventListener("visibilitychange", revisarVisibilidadChat);
        window.addEventListener("focus", marcarMensajesVisibles);
        const renderizarMensajes = mensajes => {
          const abierto = !chatBody.hidden;
          const visible = conversacionVisible();
          const nuevosRemotos = mensajesInicializados
            ? mensajes.filter(mensaje => !mensaje.propio && !mensajesConocidos.has(mensaje.id))
            : [];
          if (mensajesInicializados && !visible) {
            cantidadNoLeidos += nuevosRemotos.length;
          }
          if (nuevosRemotos.length) {
            reproducirSonidoMensaje();
            mostrarAlertaMensajeRecibido(nuevosRemotos[nuevosRemotos.length - 1], sesion.rol);
          }
          mensajesActuales = mensajes;
          mensajesConocidos = new Set(mensajes.map(mensaje => mensaje.id));
          mensajesInicializados = true;
          actualizarNoLeidos();
          void sesion.actualizarEstadoMensajes(mensajes, visible).catch(error => {
            console.error("No se pudo actualizar el estado de los mensajes:", error);
          });
          chatMensajes.replaceChildren();
          if (!mensajes.length) {
            const vacio = document.createElement("div");
            vacio.className = "collaboration-chat-empty";
            vacio.textContent = "Todavía no hay mensajes en esta actividad.";
            chatMensajes.appendChild(vacio);
            return;
          }
          mensajes.forEach(mensaje => {
            const elemento = document.createElement("article");
            elemento.className = `collaboration-chat-message${mensaje.rol === "docente" ? " is-teacher" : ""}${mensaje.propio ? " is-own" : ""}`;
            const cabecera = document.createElement("div");
            cabecera.className = "collaboration-chat-message-head";
            const autor = document.createElement("span");
            autor.textContent = mensaje.propio
              ? "Vos"
              : String(mensaje.autorNombre || (mensaje.rol === "docente" ? "Docente" : "Alumno"));
            const hora = document.createElement("time");
            hora.textContent = mensaje.creadoMs
              ? new Date(mensaje.creadoMs).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
              : "Enviando…";
            cabecera.append(autor, hora);
            const contenido = document.createElement("div");
            contenido.textContent = String(mensaje.texto || "");
            elemento.appendChild(cabecera);
            if (mensaje.cita?.texto) {
              const cita = document.createElement("div");
              cita.className = "collaboration-chat-quote";
              const citaTitulo = document.createElement("strong");
              const lineaInicio = Math.max(1, Number(mensaje.cita.lineaInicio) || 1);
              const lineaFin = Math.max(lineaInicio, Number(mensaje.cita.lineaFin) || lineaInicio);
              citaTitulo.textContent = lineaInicio === lineaFin
                ? `Línea ${lineaInicio}`
                : `Líneas ${lineaInicio}-${lineaFin}`;
              const citaTexto = document.createElement("span");
              citaTexto.textContent = String(mensaje.cita.texto || "");
              cita.append(citaTitulo, citaTexto);
              elemento.appendChild(cita);
            }
            elemento.appendChild(contenido);
            if (mensaje.propio) {
              const campoLeido = sesion.rol === "docente" ? "leidoEstudianteEn" : "leidoDocenteEn";
              const campoEntregado = sesion.rol === "docente" ? "entregadoEstudianteEn" : "entregadoDocenteEn";
              const leido = Boolean(mensaje[campoLeido]);
              const entregado = Boolean(mensaje[campoEntregado]);
              const estado = document.createElement("div");
              estado.className = `collaboration-chat-message-status${leido ? " is-read" : ""}`;
              estado.innerHTML = `<i class="fa-solid ${leido ? "fa-check-double" : entregado ? "fa-check-double" : "fa-check"}"></i><span>${leido ? "Leído" : entregado ? "Entregado" : "Enviado"}</span>`;
              elemento.appendChild(estado);
            }
            chatMensajes.appendChild(elemento);
          });
          if (abierto) chatMensajes.scrollTop = chatMensajes.scrollHeight;
        };
        const iniciarMensajes = () => {
          if (detenerMensajes) return;
          mostrarEstadoChat("Conectando mensajes…", "is-sending");
          detenerMensajes = sesion.escucharMensajes((mensajes, error) => {
            if (error) {
              mostrarEstadoChat("No se pudieron cargar los mensajes", "is-error");
              return;
            }
            mostrarEstadoChat("Mensajes sincronizados");
            renderizarMensajes(mensajes);
          });
        };
        const alternarChat = () => {
          const abrir = chatBody.hidden;
          chatBody.hidden = !abrir;
          chatToggle.setAttribute("aria-expanded", String(abrir));
          chatChevron.className = `fa-solid ${abrir ? "fa-chevron-up" : "fa-chevron-down"}`;
          if (abrir) {
            cantidadNoLeidos = 0;
            actualizarNoLeidos();
            iniciarMensajes();
            marcarMensajesVisibles();
            setTimeout(() => {
              chatMensajes.scrollTop = chatMensajes.scrollHeight;
              chatEntrada.focus({ preventScroll: true });
            }, 0);
          }
        };
        chatToggle.addEventListener("click", alternarChat);
        const limpiarCita = () => {
          citaPendiente = null;
          chatCita.hidden = true;
          chatCitaTitulo.textContent = "";
          chatCitaCodigo.textContent = "";
        };
        chatCitar.addEventListener("click", () => {
          const codigo = textarea.value;
          let inicio = Math.max(0, Number(textarea.selectionStart) || 0);
          let fin = Math.max(inicio, Number(textarea.selectionEnd) || inicio);
          if (inicio === fin) {
            const inicioLinea = codigo.lastIndexOf("\n", Math.max(0, inicio - 1)) + 1;
            const finLineaEncontrado = codigo.indexOf("\n", inicio);
            inicio = inicioLinea;
            fin = finLineaEncontrado === -1 ? codigo.length : finLineaEncontrado;
          }
          const lineaInicio = codigo.slice(0, inicio).split("\n").length;
          const lineaFin = lineaInicio + codigo.slice(inicio, fin).split("\n").length - 1;
          const textoCitado = codigo.slice(inicio, fin).trimEnd().slice(0, 1200);
          if (!textoCitado) {
            mostrarEstadoChat("Seleccioná una línea de código para citar", "is-error");
            textarea.focus();
            return;
          }
          citaPendiente = { lineaInicio, lineaFin, texto: textoCitado };
          chatCitaTitulo.textContent = lineaInicio === lineaFin
            ? `Citando línea ${lineaInicio}`
            : `Citando líneas ${lineaInicio}-${lineaFin}`;
          chatCitaCodigo.textContent = textoCitado;
          chatCita.hidden = false;
          chatEntrada.focus();
        });
        chatQuitarCita.addEventListener("click", limpiarCita);
        chatSonido.addEventListener("click", () => {
          sonidoMensajesActivo = !sonidoMensajesActivo;
          localStorage.setItem("cooperation_message_sound", String(sonidoMensajesActivo));
          actualizarBotonSonido();
          if (sonidoMensajesActivo) {
            reproducirSonidoMensaje();
            mostrarEstadoChat("Sonido de mensajes activado");
          } else {
            mostrarEstadoChat("Sonido de mensajes desactivado");
          }
        });

        const respuestasRapidas = sesion.rol === "docente"
          ? ["Revisá esta línea", "Probá nuevamente", "Está correcto", "Explicame esta parte"]
          : ["Necesito ayuda", "Ya lo corregí", "¿Está bien así?", "No entiendo el error"];
        respuestasRapidas.forEach(textoRapido => {
          const boton = document.createElement("button");
          boton.type = "button";
          boton.textContent = textoRapido;
          boton.addEventListener("click", () => {
            chatEntrada.value = textoRapido;
            chatEntrada.dispatchEvent(new Event("input"));
            chatEntrada.focus();
          });
          chatRapidos.appendChild(boton);
        });
        chatEntrada.addEventListener("input", () => {
          chatContador.textContent = `${chatEntrada.value.length}/600`;
        });
        chatEntrada.addEventListener("keydown", evento => {
          if (evento.key === "Enter" && !evento.shiftKey) {
            evento.preventDefault();
            chatFormulario.requestSubmit();
          }
        });
        chatFormulario.addEventListener("submit", async evento => {
          evento.preventDefault();
          const contenido = chatEntrada.value.trim();
          if (!contenido || chatEnviar.disabled) return;
          if (Date.now() - ultimoEnvioMensaje < 800) {
            mostrarEstadoChat("Esperá un momento antes de enviar otro mensaje", "is-error");
            return;
          }
          ultimoEnvioMensaje = Date.now();
          chatEnviar.disabled = true;
          chatEntrada.disabled = true;
          mostrarEstadoChat("Enviando…", "is-sending");
          try {
            await sesion.enviarMensaje(contenido, citaPendiente);
            chatEntrada.value = "";
            chatContador.textContent = "0/600";
            limpiarCita();
            mostrarEstadoChat("Mensaje enviado");
          } catch (error) {
            console.error("No se pudo enviar el mensaje colaborativo:", error);
            mostrarEstadoChat("No se pudo enviar. Intentá nuevamente.", "is-error");
          } finally {
            chatEnviar.disabled = false;
            chatEntrada.disabled = false;
            chatEntrada.focus();
          }
        });
        const desvincular = () => {
          clearTimeout(temporizadorPresencia);
          clearTimeout(temporizadorAutorCambio);
          textarea.classList.remove("crdt-change-teacher", "crdt-change-student");
          textarea.removeEventListener("input", aplicarLocal);
          textarea.removeEventListener("keyup", actualizarCursor);
          textarea.removeEventListener("click", actualizarCursor);
          textarea.removeEventListener("cm-selection-change", actualizarCursor);
          sesion.texto.unobserve(aplicarRemoto);
          quitarEstado();
          quitarPresencia();
          presenciaElemento.remove();
          autorCambioElemento.remove();
          quitarModoCooperacion();
          if (detenerMensajes) detenerMensajes();
          document.removeEventListener("visibilitychange", revisarVisibilidadChat);
          window.removeEventListener("focus", marcarMensajesVisibles);
          contextoAudioMensajes?.close?.().catch?.(() => {});
          contextoAudioMensajes = null;
          chatElemento.remove();
          delete textarea.__desvincularCRDT;
        };
        textarea.__desvincularCRDT = desvincular;
        return desvincular;
      }

      window.iniciarEditorCRDTDocente = async function({ uid, sectionId, codigoInicial, textarea, estado }) {
        const sesion = await iniciarSesionCodigoCRDT({ uid, sectionId, codigoInicial, rol: "docente" });
        vincularTextareaCodigoCRDT(textarea, sesion, sectionId, estado);
        const chatEmbebido = textarea?.parentElement?.querySelector?.(".collaboration-chat");
        if (chatEmbebido) chatEmbebido.hidden = true;
        return sesion;
      };

      window.iniciarColaboracionCRDTEstudiante = async function() {
        const user = window.firebaseCurrentUser;
        if (!user || !cuentaEstudianteActiva) return;
        const sectionId = document.querySelector(".section-card.active")?.id || seccionesData[0]?.id;
        const sec = seccionesData.find(item => item.id === sectionId);
        const textarea = sec ? document.getElementById(`editor-${sec.id}`) : null;
        if (!sec || !textarea || (textarea.disabled && textarea.dataset.cooperationLocked !== "true")) return;
        const activa = window.__sesionCRDTEstudianteActiva;
        if (activa?.uid === user.uid && activa.sectionId === sec.id && activa.sesion) return;
        if (activa?.sesion) {
          const cerrada = await activa.sesion.destroy().catch(error => {
            console.warn("No se pudo cerrar la sesión cooperativa anterior:", error);
            return false;
          });
          if (cerrada === false) {
            const estadoAnterior = document.getElementById(`editor-state-${activa.sectionId}`);
            if (estadoAnterior) {
              estadoAnterior.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Hay cambios pendientes de sincronizar';
            }
            return;
          }
        }
        if (activa?.textarea) activa.textarea.__desvincularCRDT?.();
        const estado = document.getElementById(`editor-state-${sec.id}`);
        try {
          const sesion = await iniciarSesionCodigoCRDT({
            uid: user.uid,
            sectionId: sec.id,
            codigoInicial: textarea.value,
            rol: "estudiante"
          });
          vincularTextareaCodigoCRDT(textarea, sesion, sec.id, estado);
          const chatEmbebido = textarea?.parentElement?.querySelector?.(".collaboration-chat");
          if (chatEmbebido) chatEmbebido.hidden = true;
          window.__sesionCRDTEstudianteActiva = { uid: user.uid, sectionId: sec.id, textarea, sesion };
        } catch (error) {
          console.error(`No se pudo iniciar CRDT en ${sec.id}:`, error);
          if (estado) estado.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Colaboración no disponible';
        }
      };
      window.addEventListener("seccion-estudiante-cambiada", () => {
        window.setTimeout(() => {
          void window.iniciarColaboracionCRDTEstudiante?.();
        }, 0);
      });

      function contextoChatColaborativoFirebase(rolSolicitado = "") {
        if (rolSolicitado === "docente" && window.firebaseTeacherUser && teacherDb) {
          return { user: window.firebaseTeacherUser, database: teacherDb, rol: "docente" };
        }
        if (rolSolicitado === "estudiante") {
          return { user: window.firebaseCurrentUser, database: db, rol: "estudiante" };
        }
        if (window.firebaseTeacherUser && teacherDb) {
          return { user: window.firebaseTeacherUser, database: teacherDb, rol: "docente" };
        }
        return { user: window.firebaseCurrentUser, database: db, rol: "estudiante" };
      }

      window.escucharModoCooperacionFirebase = function(uid, sectionId, alActualizar, opciones = {}) {
        const { user, database, rol } = contextoChatColaborativoFirebase(opciones.rol);
        if (!user || !database || !uid || !sectionId || typeof alActualizar !== "function") {
          const error = new Error("No hay una sesion Firebase valida para consultar la cooperacion.");
          error.code = "cooperation/session-unavailable";
          if (typeof alActualizar === "function") alActualizar(null, error);
          return null;
        }
        if (rol === "estudiante" && user.uid !== uid) {
          const error = new Error("La cuenta del estudiante no coincide con la solicitud.");
          error.code = "cooperation/student-uid-mismatch";
          alActualizar(null, error);
          return null;
        }
        const referencia = doc(database, "estudiantes", uid, "colaboracionCodigo", sectionId);
        return onSnapshot(
          referencia,
          snapshot => {
            const datos = snapshot.exists() ? snapshot.data() : {};
            alActualizar({
              activa: datos.modoCooperacionActiva === true,
              pausada: datos.edicionCooperativaPausada === true,
              consentimiento: ["pendiente", "aceptado", "rechazado", "finalizado"].includes(datos.estadoConsentimiento)
                ? datos.estadoConsentimiento
                : "sin_solicitud",
              objetivo: String(datos.objetivoCooperacion || ""),
              solicitadoPor: String(datos.solicitadoPor || ""),
              solicitudEn: datos.solicitudEn || null,
              respondidoEn: datos.respondidoEn || null
            }, null);
          },
          error => alActualizar(null, error)
        );
      };

      window.responderCooperacionFirebase = async function({
        uid,
        sectionId,
        aceptar,
        motivo = ""
      } = {}) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db || !uid || !sectionId || user.uid !== uid) return false;
        try {
          const referencia = doc(db, "estudiantes", uid, "colaboracionCodigo", sectionId);
          const snapshot = await getDoc(referencia);
          if (!snapshot.exists() || snapshot.data()?.estadoConsentimiento !== "pendiente") return false;
          const aceptada = aceptar === true;
          await setDoc(referencia, {
            modoCooperacionActiva: aceptada,
            edicionCooperativaPausada: !aceptada,
            estadoConsentimiento: aceptada ? "aceptado" : "rechazado",
            respondidoEn: serverTimestamp(),
            respondidoPor: user.email || user.displayName || user.uid,
            motivoRechazo: aceptada ? "" : String(motivo || "").trim().slice(0, 300),
            actualizadoEn: serverTimestamp(),
            actualizadoPor: user.email || user.uid
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("No se pudo responder la solicitud de cooperacion:", error);
          window.ultimoErrorCooperacion = {
            code: error?.code || "",
            message: await describirErrorDecisionCooperacion(error, user)
          };
          return false;
        }
      };

      window.escucharChatColaborativoFirebase = function(uid, sectionId, alActualizar, opciones = {}) {
        const { user, database, rol } = contextoChatColaborativoFirebase(opciones.rol);
        if (!user || !database || !uid || !sectionId || typeof alActualizar !== "function") {
          const error = new Error("No hay una sesion Firebase valida para el chat cooperativo.");
          error.code = "chat/session-unavailable";
          window.ultimoErrorChatColaborativo = { code: error.code, message: error.message, uid, sectionId, rol };
          if (typeof alActualizar === "function") alActualizar([], error);
          return null;
        }
        const referencia = collection(database, "estudiantes", uid, "colaboracionCodigo", sectionId, "mensajes");
        let ultimosMensajes = [];
        const actualizarConfirmaciones = mensajes => {
          const campoEntrega = rol === "docente" ? "entregadoDocenteEn" : "entregadoEstudianteEn";
          const campoLectura = rol === "docente" ? "leidoDocenteEn" : "leidoEstudianteEn";
          const debeMarcarLeido = typeof opciones.marcarLeidos === "function"
            ? opciones.marcarLeidos() === true
            : opciones.marcarLeidos === true;
          mensajes
            .filter(mensaje =>
              mensaje.autorUid !== user.uid &&
              (!mensaje[campoEntrega] || (debeMarcarLeido && !mensaje[campoLectura]))
            )
            .slice(-60)
            .forEach(mensaje => {
              const cambios = {};
              if (!mensaje[campoEntrega]) cambios[campoEntrega] = serverTimestamp();
              if (debeMarcarLeido && !mensaje[campoLectura]) cambios[campoLectura] = serverTimestamp();
              setDoc(doc(referencia, mensaje.id), cambios, { merge: true }).catch(error => {
                if (error?.code !== "permission-denied") {
                  console.warn("No se pudo confirmar el mensaje cooperativo:", error);
                }
              });
            });
        };
        const revisarVisibilidad = () => {
          if (!document.hidden && ultimosMensajes.length) actualizarConfirmaciones(ultimosMensajes);
        };
        document.addEventListener("visibilitychange", revisarVisibilidad);
        window.addEventListener("focus", revisarVisibilidad);
        const detenerSnapshot = onSnapshot(
          query(referencia, orderBy("creadoMs", "desc"), limit(60)),
          snapshot => {
            const mensajes = snapshot.docs.map(item => {
              const datos = item.data();
              return {
                id: item.id,
                ...datos,
                creadoMs: datos.creadoEn?.toMillis?.()
                  || Number(datos.creadoEn?.seconds || 0) * 1000
                  || Number(datos.creadoMs || 0)
              };
            }).sort((a, b) => a.creadoMs - b.creadoMs);
            ultimosMensajes = mensajes;
            alActualizar(mensajes, null);
            actualizarConfirmaciones(mensajes);
          },
          error => {
            window.ultimoErrorChatColaborativo = {
              code: error?.code || "chat/listen-failed",
              message: error?.message || "No se pudo escuchar la conversacion.",
              uid,
              sectionId,
              rol
            };
            alActualizar([], error);
          }
        );
        return () => {
          detenerSnapshot();
          document.removeEventListener("visibilitychange", revisarVisibilidad);
          window.removeEventListener("focus", revisarVisibilidad);
        };
      };

      window.enviarChatColaborativoFirebase = async function({
        uid,
        sectionId,
        texto,
        rol = "estudiante",
        autorNombre = "",
        cita = null
      } = {}) {
        const contexto = rol === "docente"
          ? { ...contextoDocenteFirebase(), rol: "docente" }
          : { user: window.firebaseCurrentUser, database: db, rol: "estudiante" };
        const { user, database } = contexto;
        const contenido = String(texto || "").trim().slice(0, 1200);
        window.ultimoErrorChatColaborativo = null;
        if (!user || !database || !uid || !sectionId || !contenido) {
          window.ultimoErrorChatColaborativo = {
            code: "chat/invalid-context",
            message: "Falta la sesion, el estudiante, el desafio o el texto del mensaje.",
            uid,
            sectionId,
            rol
          };
          return false;
        }
        if (rol === "estudiante" && user.uid !== uid) {
          window.ultimoErrorChatColaborativo = {
            code: "chat/student-uid-mismatch",
            message: "La cuenta del estudiante no coincide con la conversacion abierta.",
            uid,
            sectionId,
            rol
          };
          return false;
        }
        if (rol === "docente" && !(await verificarUsuarioDocente(user))) {
          window.ultimoErrorChatColaborativo = {
            code: "chat/teacher-not-authorized",
            message: "La cuenta docente no esta autorizada o su correo no esta verificado.",
            uid,
            sectionId,
            rol
          };
          return false;
        }
        const id = `${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
        const citaLimpia = cita && Number(cita.lineaInicio) > 0 ? {
          lineaInicio: Math.max(1, Math.trunc(Number(cita.lineaInicio) || 1)),
          lineaFin: Math.max(1, Math.trunc(Number(cita.lineaFin) || Number(cita.lineaInicio) || 1)),
          texto: String(cita.texto || "").trim().slice(0, 1200)
        } : null;
        try {
          await setDoc(doc(database, "estudiantes", uid, "colaboracionCodigo", sectionId, "mensajes", id), {
            id,
            uid,
            sectionId,
            texto: contenido,
            cita: citaLimpia,
            rol: rol === "docente" ? "docente" : "estudiante",
            autorUid: user.uid,
            autorNombre: String(autorNombre || user.displayName || user.email || (rol === "docente" ? "Docente" : "Estudiante")).slice(0, 254),
            creadoMs: Date.now(),
            creadoEn: serverTimestamp()
          });
          return true;
        } catch (error) {
          console.error("No se pudo enviar el chat cooperativo:", error);
          window.ultimoErrorChatColaborativo = {
            code: error?.code || "",
            message: error?.message || "Error desconocido",
            uid,
            sectionId,
            rol
          };
          return false;
        }
      };

      window.marcarMensajeChatColaborativoLeidoFirebase = async function({
        uid,
        sectionId,
        mensajeId,
        rol = "estudiante"
      } = {}) {
        const { user, database } = contextoChatColaborativoFirebase(rol);
        if (!user || !database || !uid || !sectionId || !mensajeId) return false;
        if (rol === "estudiante" && user.uid !== uid) return false;
        const campoEntrega = rol === "docente" ? "entregadoDocenteEn" : "entregadoEstudianteEn";
        const campoLectura = rol === "docente" ? "leidoDocenteEn" : "leidoEstudianteEn";
        const referencia = doc(
          database,
          "estudiantes",
          uid,
          "colaboracionCodigo",
          sectionId,
          "mensajes",
          mensajeId
        );
        try {
          const snapshot = await getDoc(referencia);
          if (!snapshot.exists()) return false;
          if (!snapshot.data()?.[campoEntrega]) {
            await setDoc(referencia, { [campoEntrega]: serverTimestamp() }, { merge: true });
          }
          if (!snapshot.data()?.[campoLectura]) {
            await setDoc(referencia, { [campoLectura]: serverTimestamp() }, { merge: true });
          }
          return true;
        } catch (error) {
          console.error("No se pudo registrar la lectura del mensaje cooperativo:", error);
          return false;
        }
      };

      window.escucharPresenciaColaborativaFirebase = function(uid, sectionId, alActualizar, opciones = {}) {
        const { user, database, rol } = contextoChatColaborativoFirebase(opciones.rol);
        if (!user || !database || !uid || !sectionId || typeof alActualizar !== "function") {
          const error = new Error("No hay una sesion Firebase valida para consultar presencia.");
          error.code = "presence/session-unavailable";
          if (typeof alActualizar === "function") alActualizar([], error);
          return null;
        }
        return onSnapshot(
          collection(database, "estudiantes", uid, "colaboracionCodigo", sectionId, "presencia"),
          snapshot => alActualizar(snapshot.docs.map(item => ({ id: item.id, ...item.data() })), null),
          error => {
            window.ultimoErrorChatColaborativo = {
              code: error?.code || "presence/listen-failed",
              message: error?.message || "No se pudo consultar la presencia.",
              uid,
              sectionId,
              rol
            };
            alActualizar([], error);
          }
        );
      };

      window.vaciarChatColaborativoFirebase = async function(uid, sectionId) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado || !uid || !sectionId) return { ok: false, error: "Docente no autorizado." };
        const { database } = contextoDocenteFirebase();
        if (!database) return { ok: false, error: "Firebase no está disponible." };
        try {
          const referencia = collection(database, "estudiantes", uid, "colaboracionCodigo", sectionId, "mensajes");
          const snapshot = await getDocs(referencia);
          let eliminados = 0;
          for (let inicio = 0; inicio < snapshot.docs.length; inicio += 400) {
            const lote = writeBatch(database);
            snapshot.docs.slice(inicio, inicio + 400).forEach(item => {
              lote.delete(item.ref);
              eliminados += 1;
            });
            await lote.commit();
          }
          return { ok: true, eliminados };
        } catch (error) {
          console.error("No se pudo vaciar el chat cooperativo:", error);
          return { ok: false, error: error?.message || "Firebase rechazó la eliminación." };
        }
      };

      window.guardarProgramacionDocenteFirebase = async function(uid, programacion = {}) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid) return false;
        try {
          if (!(await verificarUsuarioDocente(user))) return false;
          const estudianteRef = doc(database, "estudiantes", uid);
          const anteriorSnap = await getDoc(estudianteRef);
          const anterior = anteriorSnap.exists() ? (anteriorSnap.data().programacionDocente || null) : null;
          if (anterior && (anterior.titulo || anterior.instrucciones || anterior.fechaEntrega || anterior.estado)) {
            const historialId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            await setDoc(doc(database, "estudiantes", uid, "historialProgramacionDocente", historialId), {
              versionAnterior: anterior,
              guardadoEn: serverTimestamp(),
              guardadoPor: user.email || user.displayName || user.uid
            });
          }
          await setDoc(doc(database, "estudiantes", uid), {
            programacionDocente: {
              titulo: String(programacion.titulo || "").trim().slice(0, 160),
              instrucciones: String(programacion.instrucciones || "").trim().slice(0, 4000),
              fechaEntrega: String(programacion.fechaEntrega || "").trim().slice(0, 40),
              estado: ["pendiente", "en_curso", "revisar", "completada"].includes(programacion.estado) ? programacion.estado : "pendiente",
              actualizadoEn: serverTimestamp(),
              actualizadoPor: user.email || user.displayName || user.uid
            },
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("No se pudo guardar la programación docente:", error);
          return false;
        }
      };

      window.escucharComentariosDocenteFirebase = function(uid, alActualizar) {
        const contexto = contextoDocenteFirebase();
        const database = contexto.database;
        if (!database || !uid || typeof alActualizar !== "function") return null;
        return onSnapshot(
          collection(database, "estudiantes", uid, "comentariosDocente"),
          snapshot => {
            const comentarios = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
            comentarios.sort((a, b) => (b.creadoEn?.toMillis?.() || Date.parse(b.creadoEn || "") || 0) - (a.creadoEn?.toMillis?.() || Date.parse(a.creadoEn || "") || 0));
            alActualizar(comentarios);
          },
          error => console.error("No se pudieron cargar los comentarios docentes:", error)
        );
      };

      window.agregarComentarioDocenteFirebase = async function(uid, comentario = {}) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !String(comentario.texto || "").trim()) return false;
        try {
          if (!(await verificarUsuarioDocente(user))) return false;
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await setDoc(doc(database, "estudiantes", uid, "comentariosDocente", id), {
            texto: String(comentario.texto).trim().slice(0, 1200),
            autor: user.email || user.displayName || "Docente",
            creadoEn: serverTimestamp()
          });
          return true;
        } catch (error) {
          console.error("No se pudo agregar el comentario docente:", error);
          return false;
        }
      };

      window.obtenerHistorialProgramacionDocenteFirebase = async function(uid) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return [];
        try {
          const snap = await getDocs(collection(database, "estudiantes", uid, "historialProgramacionDocente"));
          return snap.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.guardadoEn?.toMillis?.() || 0) - (a.guardadoEn?.toMillis?.() || 0));
        } catch (error) {
          console.error("No se pudo cargar el historial de programación:", error);
          return [];
        }
      };

      window.actualizarSolicitudEstudianteFirebase = async function(estudiante, reenviar = false) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db || !estudiante) return false;
        try {
          const referencia = doc(db, "estudiantes", user.uid);
          const snapshot = await getDoc(referencia);
          if (!snapshot.exists()) return false;
          const actual = snapshot.data();
          const payload = {
            estudiante,
            emailVerificado: user.emailVerified === true,
            actualizadoEn: serverTimestamp()
          };
          if (reenviar) {
            const antecedentes = Array.isArray(actual.antecedentesRechazo)
              ? actual.antecedentesRechazo.slice(-9)
              : [];
            if (actual.rechazoMotivo) {
              antecedentes.push({
                motivo: actual.rechazoMotivo,
                rechazadoEn: actual.rechazadoEn || null,
                rechazadoPor: actual.rechazadoPor || ""
              });
            }
            payload.estadoCuenta = "pendiente";
            payload.solicitudAprobacionEn = serverTimestamp();
            payload.antecedentesRechazo = antecedentes;
          }
          await setDoc(referencia, payload, { merge: true });
          return true;
        } catch (error) {
          console.error("No se pudo actualizar la solicitud del estudiante:", error);
          return false;
        }
      };

      window.guardarSalidasPestanaFirebase = async function(salidas, eventos, bloqueo = {}) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db) return false;
        try {
          const payload = {
            salidasPestana: Number(salidas) || 0,
            eventosSalidasPestana: Array.isArray(eventos) ? eventos : [],
            uid: user.uid,
            email: user.email || "",
            actualizadoEn: serverTimestamp()
          };
          if (bloqueo?.pantallaBloqueada === true) {
            payload.pantallaBloqueada = true;
            payload.pantallaBloqueadaEn = bloqueo.pantallaBloqueadaEn || new Date().toISOString();
            payload.pantallaBloqueadaSalidas = Number(bloqueo.pantallaBloqueadaSalidas || salidas) || 0;
            payload.pantallaBloqueadaSeccion = String(bloqueo.pantallaBloqueadaSeccion || "");
          }
          await setDoc(doc(db, "estudiantes", user.uid), payload, { merge: true });
          return true;
        } catch (error) {
          console.error("Error guardando el cambio de pestaña:", error);
          window.ultimoErrorSalidasPestana = {
            code: error?.code || "",
            message: error?.message || ""
          };
          return false;
        }
      };

      window.guardarRevisionDocenteFirebase = async function(uid, revision) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !revision) return false;
        try {
          if (!(await verificarUsuarioDocente(user))) {
            window.ultimoErrorRevisionDocente = { code: "teacher-not-authorized", message: "La cuenta no está autorizada como docente." };
            return false;
          }
          const estudianteRef = doc(database, "estudiantes", uid);
          const historialId = `${Date.now()}-${uid}`;
          const historialRef = doc(collection(database, "estudiantes", uid, "historialDescuentos"), historialId);
          const responsable = user.email || user.displayName || user.uid;
          const penalizacionNueva = Math.max(0, Math.min(10, Number(revision.penalizacion) || 0));
          const motivoNuevo = String(revision.motivo || "").trim();
          const estadoNuevo = String(revision.estado || (penalizacionNueva > 0 ? "penalizacion" : "sin_observaciones"));
          await runTransaction(database, async transaction => {
            const snapshot = await transaction.get(estudianteRef);
            if (!snapshot.exists()) throw new Error("student-not-found");
            const datos = snapshot.data();
            const revisionAnterior = datos.revisionSalidas || {};
            const penalizacionAnterior = Math.max(0, Math.min(10, Number(revisionAnterior.penalizacion) || 0));
            const motivoAnterior = String(revisionAnterior.motivo || "").trim();
            const historialResultadosActual = datos.historialResultados || {};
            const notasDesafiosActual = datos.notasDesafiosDocente || {};
            const idsConNota = [...new Set([
              ...Object.keys(historialResultadosActual),
              ...Object.keys(notasDesafiosActual)
            ])];
            const notasAcademicas = idsConNota
              .map(sectionId => {
                const resultado = historialResultadosActual[sectionId] || {};
                const ajuste = datos.notasDesafiosDocente?.[sectionId];
                const notaDocente = ajuste?.nota === null || ajuste?.nota === undefined || ajuste?.nota === ""
                  ? NaN
                  : Number(ajuste.nota);
                return Number.isFinite(notaDocente)
                  ? notaDocente
                  : Number(resultado?.notaFinal ?? resultado?.notaIA);
              })
              .filter(nota => Number.isFinite(nota));
            const promedioAcademico = notasAcademicas.length
              ? notasAcademicas.reduce((total, nota) => total + nota, 0) / notasAcademicas.length
              : null;
            const notaCalculada = promedioAcademico === null
              ? null
              : Number(Math.max(0, promedioAcademico - penalizacionNueva).toFixed(1));
            const notaConfirmada = revision.notaConfirmada === true && notaCalculada !== null;
            const notaDocenteSolicitada = revision.notaFinalDocente === null ||
              revision.notaFinalDocente === undefined ||
              revision.notaFinalDocente === ""
              ? NaN
              : Number(revision.notaFinalDocente);
            const notaDefinitiva = notaConfirmada
              ? Number(Math.max(0, Math.min(10,
                  Number.isFinite(notaDocenteSolicitada) ? notaDocenteSolicitada : notaCalculada
                )).toFixed(1))
              : null;
            const descuentoModificado =
              penalizacionAnterior !== penalizacionNueva ||
              motivoAnterior !== motivoNuevo;
            transaction.set(estudianteRef, {
              revisionSalidas: {
                estado: estadoNuevo,
                penalizacion: penalizacionNueva,
                motivo: motivoNuevo,
                revisadoPor: responsable,
                revisadoPorUid: user.uid,
                revisadoEn: serverTimestamp(),
                notaConfirmada,
                notaFinalDocente: notaDefinitiva,
                notaConfirmadaValor: notaDefinitiva,
                notaCalculadaAlConfirmar: notaConfirmada ? notaCalculada : null,
                notaModificadaManualmente: notaConfirmada && notaDefinitiva !== notaCalculada,
                notaConfirmadaPor: notaConfirmada ? responsable : "",
                notaConfirmadaPorUid: notaConfirmada ? user.uid : "",
                notaConfirmadaEn: notaConfirmada ? serverTimestamp() : null
              },
              actualizadoEn: serverTimestamp()
            }, { merge: true });
            if (descuentoModificado) {
              transaction.set(historialRef, {
                id: historialId,
                estudianteUid: uid,
                estudianteNombre: datos.estudiante?.nombre || datos.nombreGoogle || "",
                estudianteEmail: datos.email || "",
                docente: responsable,
                docenteUid: user.uid,
                cambiadoEn: serverTimestamp(),
                valorAnterior: penalizacionAnterior,
                valorNuevo: penalizacionNueva,
                motivoAnterior,
                motivoNuevo,
                estadoAnterior: revisionAnterior.estado || "pendiente",
                estadoNuevo
              });
            }
          });
          return true;
        } catch (error) {
          console.error("Error guardando revisión docente:", error);
          window.ultimoErrorRevisionDocente = { code: error?.code || "", message: error?.message || "Error desconocido" };
          return false;
        }
      };

      window.guardarNotaDesafioDocenteFirebase = async function(uid, sectionId, cambio = {}) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !sectionId) return false;
        try {
          if (!(await verificarUsuarioDocente(user))) {
            window.ultimoErrorNotaDesafioDocente = {
              code: "teacher-not-authorized",
              message: "La cuenta no está autorizada como docente."
            };
            return false;
          }
          const estudianteRef = doc(database, "estudiantes", uid);
          await runTransaction(database, async transaction => {
            const snapshot = await transaction.get(estudianteRef);
            if (!snapshot.exists()) throw new Error("student-not-found");
            const datos = snapshot.data();
            const notasDocente = { ...(datos.notasDesafiosDocente || {}) };
            const ajusteAnterior = notasDocente[sectionId] || null;
            const resultado = datos.historialResultados?.[sectionId] || {};
            const notaAutomatica = Number(resultado.notaFinal ?? resultado.notaIA);
            const notaAnteriorValor = ajusteAnterior?.notaDocente ??
              ajusteAnterior?.notaFinalCalculada ??
              ajusteAnterior?.nota;
            const notaAnteriorDocente = notaAnteriorValor === null ||
              notaAnteriorValor === undefined ||
              notaAnteriorValor === ""
              ? NaN
              : Number(notaAnteriorValor);
            const valorAnterior = Number.isFinite(notaAnteriorDocente)
              ? notaAnteriorDocente
              : (Number.isFinite(notaAutomatica) ? notaAutomatica : null);
            let valorNuevo = null;
            let motivoNuevo = String(cambio.motivo || "").trim().slice(0, 1000);
            const normalizarRubrica = rubrica => {
              const criterios = Array.isArray(rubrica?.criterios) ? rubrica.criterios : [];
              return {
                version: 1,
                criterios: criterios.slice(0, 20).map(item => {
                  const maximo = Math.max(0, Math.min(100, Number(item?.puntajeMaximo) || 0));
                  return {
                    criterio: String(item?.criterio || "").trim().slice(0, 120),
                    descripcion: String(item?.descripcion || "").trim().slice(0, 500),
                    puntajeMaximo: maximo,
                    puntajeObtenido: Math.max(0, Math.min(maximo, Number(item?.puntajeObtenido) || 0)),
                    comentarioDocente: String(item?.comentarioDocente || "").trim().slice(0, 1000),
                    evidenciaAsociada: String(item?.evidenciaAsociada || "").trim().slice(0, 500)
                  };
                }).filter(item => item.criterio || item.descripcion)
              };
            };
            const rubricaNueva = normalizarRubrica(cambio.rubrica);
            if (cambio.restaurar === true) {
              delete notasDocente[sectionId];
              valorNuevo = Number.isFinite(notaAutomatica) ? notaAutomatica : null;
              motivoNuevo = motivoNuevo || "Restauración de la calificación automática";
            } else {
              const maximoRubrica = rubricaNueva.criterios.reduce(
                (suma, item) => suma + Number(item.puntajeMaximo || 0),
                0
              );
              const obtenidoRubrica = rubricaNueva.criterios.reduce(
                (suma, item) => suma + Number(item.puntajeObtenido || 0),
                0
              );
              const notaCalculadaRubrica = maximoRubrica > 0
                ? Number((obtenidoRubrica * 10 / maximoRubrica).toFixed(1))
                : NaN;
              const nota = Number.isFinite(notaCalculadaRubrica)
                ? notaCalculadaRubrica
                : Number(cambio.nota);
              if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
                throw new Error("invalid-challenge-grade");
              }
              valorNuevo = Number(nota.toFixed(1));
              notasDocente[sectionId] = {
                nota: valorNuevo,
                notaDocente: valorNuevo,
                notaFinalCalculada: valorNuevo,
                motivo: motivoNuevo,
                notaAutomatica: Number.isFinite(notaAutomatica) ? notaAutomatica : null,
                rubrica: rubricaNueva.criterios.length
                  ? { ...rubricaNueva, fechaCorreccion: serverTimestamp() }
                  : null,
                fechaCorreccion: serverTimestamp(),
                modificadaPor: user.email || user.displayName || user.uid,
                modificadaPorUid: user.uid,
                modificadaEn: serverTimestamp()
              };
            }
            const revisionAnterior = datos.revisionSalidas || {};
            const historialId = `${Date.now()}-${sectionId}-${user.uid}`;
            const historialRef = doc(
              collection(database, "estudiantes", uid, "historialNotasDesafios"),
              historialId
            );
            transaction.set(estudianteRef, {
              notasDesafiosDocente: notasDocente,
              revisionSalidas: {
                ...revisionAnterior,
                notaConfirmada: false,
                notaFinalDocente: null,
                notaConfirmadaValor: null,
                notaCalculadaAlConfirmar: null,
                notaModificadaManualmente: false,
                notaConfirmadaPor: "",
                notaConfirmadaPorUid: "",
                notaConfirmadaEn: null
              },
              actualizadoEn: serverTimestamp()
            }, { merge: true });
            transaction.set(historialRef, {
              id: historialId,
              estudianteUid: uid,
              sectionId,
              tipo: cambio.restaurar === true ? "restauracion" : "modificacion",
              valorAnterior,
              valorNuevo,
              notaAutomatica: Number.isFinite(notaAutomatica) ? notaAutomatica : null,
              motivo: motivoNuevo,
              rubricaAnterior: ajusteAnterior?.rubrica || null,
              rubricaNueva: rubricaNueva.criterios.length
                ? { ...rubricaNueva, fechaCorreccion: serverTimestamp() }
                : null,
              intento: {
                notaIA: Number.isFinite(Number(resultado.notaIA)) ? Number(resultado.notaIA) : null,
                notaFinal: Number.isFinite(Number(resultado.notaFinal)) ? Number(resultado.notaFinal) : null,
                codigo: String(resultado.codigo || "").slice(0, 20000),
                salida: String(resultado.salida || "").slice(0, 5000),
                evaluadoEn: String(resultado.fecha || resultado.evaluadoEn || "")
              },
              docente: user.email || "",
              docenteUid: user.uid,
              cambiadoEn: serverTimestamp()
            });
          });
          return true;
        } catch (error) {
          console.error("Error guardando nota docente del desafío:", error);
          window.ultimoErrorNotaDesafioDocente = {
            code: error?.code || "",
            message: error?.message || "Error desconocido"
          };
          return false;
        }
      };

      window.desbloquearActividadesEstudianteFirebase = async function(uid, sectionId = "") {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return false;
        try {
          const estudianteRef = doc(database, "estudiantes", uid);
          await runTransaction(database, async transaction => {
            const snapshot = await transaction.get(estudianteRef);
            if (!snapshot.exists()) throw new Error("student-not-found");
            const datos = snapshot.data();
            const finalizadas = { ...(datos.finalizadas || {}) };
            const ids = Array.isArray(sectionId) ? sectionId.filter(Boolean).map(String) : (sectionId ? [String(sectionId)] : []);
            if (ids.length) ids.forEach(id => delete finalizadas[id]);
            else Object.keys(finalizadas).forEach(id => delete finalizadas[id]);
            transaction.set(estudianteRef, {
              finalizadas,
              desbloqueoActividades: {
                id: `${Date.now()}-${uid}`,
                seccion: ids.length ? ids : "todas",
                por: user.email || user.displayName || user.uid,
                porUid: user.uid,
                en: serverTimestamp()
              },
              actualizadoEn: serverTimestamp()
            }, { merge: true });
          });
          return true;
        } catch (error) {
          console.error("Error desbloqueando actividades del estudiante:", error);
          return false;
        }
      };

      window.obtenerHistorialNotasDesafiosFirebase = async function(uid, sectionId = "") {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return [];
        try {
          const referencia = collection(database, "estudiantes", uid, "historialNotasDesafios");
          const snapshot = await getDocs(referencia);
          return snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(item => !sectionId || item.sectionId === sectionId)
            .sort((a, b) => {
              const fechaA = a.cambiadoEn?.toDate
                ? a.cambiadoEn.toDate().getTime()
                : new Date(a.cambiadoEn || 0).getTime();
              const fechaB = b.cambiadoEn?.toDate
                ? b.cambiadoEn.toDate().getTime()
                : new Date(b.cambiadoEn || 0).getTime();
              return fechaB - fechaA;
            });
        } catch (error) {
          console.error("Error consultando historial de notas por desafío:", error);
          window.ultimoErrorHistorialNotasDesafios = {
            code: error?.code || "",
            message: error?.message || "Error desconocido"
          };
          return [];
        }
      };

      window.escucharNotasDocenteEstudianteFirebase = async function() {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db) return;
        if (window.__notasDocenteEstudianteUnsubscribe) {
          window.__notasDocenteEstudianteUnsubscribe();
        }
        window.__notasDocenteEstudianteUnsubscribe = onSnapshot(
          doc(db, "estudiantes", user.uid),
          snapshot => {
            const datos = snapshot.exists() ? snapshot.data() : {};
            window.dispatchEvent(new CustomEvent("notas-desafios-docente", {
              detail: datos.notasDesafiosDocente || {}
            }));
          },
          error => console.warn("No se pudieron sincronizar las notas docentes:", error)
        );
      };

      window.guardarConfiguracionSeguimientoFirebase = async function(configuracion) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        const { user, database } = contextoDocenteFirebase();
        if (!user || !database) return false;
        const listaDominios = valor => [...new Set(
          String(valor || "")
            .split(/[\n,;]+/)
            .map(item => item.trim().toLowerCase().replace(/^www\./, ""))
            .filter(Boolean)
        )].slice(0, 100);
        const duracionMinima = Number(configuracion?.duracionMinimaSegundos);
        const normalizada = {
          limiteSalidas: Math.max(1, Math.min(50, Number(configuracion?.limiteSalidas) || 5)),
          duracionMinimaSegundos: Math.max(0, Math.min(300, Number.isFinite(duracionMinima) ? duracionMinima : 3)),
          bloqueoAutomatico: configuracion?.bloqueoAutomatico !== false,
          avisoSinConexionSegundos: Math.max(15, Math.min(600, Number(configuracion?.avisoSinConexionSegundos) || 30)),
          alertaSinConexionSegundos: Math.max(60, Math.min(3600, Number(configuracion?.alertaSinConexionSegundos) || 120)),
          retencionDias: Math.max(1, Math.min(3650, Number(configuracion?.retencionDias) || 180)),
          tutorHabilitado: configuracion?.tutorHabilitado !== false,
          evaluacionFormal: configuracion?.evaluacionFormal === true,
          nivelMaximoTutor: Math.max(1, Math.min(6, Number(configuracion?.nivelMaximoTutor) || 6)),
          limiteConsultasTutor: Math.max(1, Math.min(50, Number(configuracion?.limiteConsultasTutor) || 12)),
          dominiosPermitidos: listaDominios(configuracion?.dominiosPermitidos),
          dominiosAlerta: listaDominios(configuracion?.dominiosAlerta),
          dominiosIgnorados: listaDominios(configuracion?.dominiosIgnorados),
          actualizadaPor: user.email || user.displayName || user.uid,
          actualizadaEn: new Date().toISOString()
        };
        try {
          const claseId = idClaseActual();
          await setDoc(doc(database, "controlClase", claseId), {
            configuracionSeguimiento: normalizada,
            zonaHoraria: "America/Argentina/Buenos_Aires"
          }, { merge: true });
          const auditoriaId = `${Date.now()}-${user.uid}`.replace(/[^a-zA-Z0-9._-]/g, "_");
          await setDoc(doc(database, "controlClase", claseId, "historialConfiguracion", auditoriaId), {
            id: auditoriaId,
            claseId,
            docenteUid: user.uid,
            docente: user.email || user.displayName || user.uid,
            configuracion: normalizada,
            cambiadoEn: serverTimestamp()
          });
          return true;
        } catch (error) {
          console.error("Error guardando la configuración de seguimiento:", error);
          return false;
        }
      };

      window.guardarRubricaSocraticaFirebase = async function(rubrica) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        const { user, database } = contextoDocenteFirebase();
        if (!user || !database) return false;
        const limitarPunto = (valor, respaldo) => {
          const numero = Number(valor);
          return Number.isFinite(numero) ? Math.max(0, Math.min(1, numero)) : respaldo;
        };
        const limitarNumero = (valor, respaldo, minimo = 0, maximo = 100) => {
          const numero = Number(valor);
          return Number.isFinite(numero) ? Math.max(minimo, Math.min(maximo, numero)) : respaldo;
        };
        const normalizada = {
          puntos: {
            completa: limitarPunto(rubrica?.puntos?.completa, 1),
            incompleta: limitarPunto(rubrica?.puntos?.incompleta, 0.7),
            parcial: limitarPunto(rubrica?.puntos?.parcial, 0.3),
            incorrecta: limitarPunto(rubrica?.puntos?.incorrecta, 0)
          },
          palabrasMinimas: Math.max(6, Math.min(100, Number(rubrica?.palabrasMinimas) || 18)),
          criterios: {
            desarrollo: rubrica?.criterios?.desarrollo !== false,
            justificacion: rubrica?.criterios?.justificacion !== false,
            evidencia: rubrica?.criterios?.evidencia !== false,
            consecuencia: rubrica?.criterios?.consecuencia !== false
          },
          alertas: {
            riesgoMinimo: limitarNumero(rubrica?.alertas?.riesgoMinimo, 30),
            aumentoMinimo: limitarNumero(rubrica?.alertas?.aumentoMinimo, 10),
            muestraMinima: limitarNumero(rubrica?.alertas?.muestraMinima, 5, 1, 500),
            severidadAlta: limitarNumero(rubrica?.alertas?.severidadAlta, 50)
          },
          actualizadaPor: user.email || user.displayName || user.uid,
          actualizadaEn: new Date().toISOString()
        };
        if (!(normalizada.puntos.completa > 0) ||
            !(normalizada.puntos.completa >= normalizada.puntos.incompleta &&
              normalizada.puntos.incompleta >= normalizada.puntos.parcial &&
              normalizada.puntos.parcial >= normalizada.puntos.incorrecta) ||
            !Object.values(normalizada.criterios).some(Boolean) ||
            normalizada.alertas.severidadAlta < normalizada.alertas.riesgoMinimo) {
          return false;
        }
        try {
          const claseId = idClaseActual();
          await setDoc(doc(database, "controlClase", claseId), {
            rubricaSocratica: normalizada,
            zonaHoraria: "America/Argentina/Buenos_Aires"
          }, { merge: true });
          const auditoriaId = `${Date.now()}-${user.uid}`.replace(/[^a-zA-Z0-9._-]/g, "_");
          await setDoc(doc(database, "controlClase", claseId, "historialConfiguracion", auditoriaId), {
            id: auditoriaId,
            claseId,
            tipo: "rubrica-socratica",
            docenteUid: user.uid,
            docente: user.email || user.displayName || user.uid,
            configuracion: normalizada,
            cambiadoEn: serverTimestamp()
          });
          return true;
        } catch (error) {
          console.error("Error guardando la rúbrica socrática:", error);
          return false;
        }
      };

      window.guardarPlanRefuerzoFirebase = async function(uid, plan) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        const { user, database } = contextoDocenteFirebase();
        if (!user || !database || !uid || !plan?.id) return false;
        try {
          const referencia = doc(database, "estudiantes", uid);
          const snapshot = await getDoc(referencia);
          if (!snapshot.exists()) return false;
          const anteriores = snapshot.data()?.planesRefuerzo || {};
          const planes = Array.isArray(anteriores)
            ? Object.fromEntries(anteriores.filter(Boolean).map(item => [item.id, item]))
            : { ...anteriores };
          const texto = valor => String(valor || "").trim();
          const planSeguro = {
            id: texto(plan.id).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100),
            contenido: texto(plan.contenido).slice(0, 180),
            indicaciones: texto(plan.indicaciones).slice(0, 800),
            actividadOrigenId: texto(plan.actividadOrigenId).slice(0, 100),
            actividadOrigenTitulo: texto(plan.actividadOrigenTitulo).slice(0, 180),
            actividadObjetivoId: texto(plan.actividadObjetivoId).slice(0, 100),
            actividadObjetivoTitulo: texto(plan.actividadObjetivoTitulo).slice(0, 180),
            fechaLimite: texto(plan.fechaLimite).slice(0, 20),
            estado: ["asignado", "en_progreso", "completado"].includes(plan.estado) ? plan.estado : "asignado",
            alcance: texto(plan.alcance).slice(0, 240),
            lineaBase: plan.lineaBase || {},
            medicionPosterior: plan.medicionPosterior || null,
            creadoEn: plan.creadoEn || new Date().toISOString(),
            creadoPor: texto(plan.creadoPor || user.email || user.displayName || user.uid).slice(0, 180),
            completadoEn: plan.completadoEn || null,
            actualizadoEn: new Date().toISOString(),
            actualizadoPor: user.email || user.displayName || user.uid
          };
          planes[planSeguro.id] = planSeguro;
          const claves = Object.keys(planes).sort((a, b) =>
            String(planes[b]?.creadoEn || "").localeCompare(String(planes[a]?.creadoEn || ""))
          );
          const limitados = Object.fromEntries(claves.slice(0, 40).map(clave => [clave, planes[clave]]));
          const mensaje = {
            id: `mensaje-${planSeguro.id}`,
            tipo: "refuerzo",
            asunto: `Plan de refuerzo: ${planSeguro.contenido}`,
            texto: `${planSeguro.indicaciones}\n\nActividad de comprobación: ${planSeguro.actividadObjetivoTitulo}${planSeguro.fechaLimite ? `\nFecha límite: ${planSeguro.fechaLimite}` : ""}`,
            recibido: false,
            leido: false,
            creadoEn: new Date().toISOString(),
            creadoPor: user.email || user.displayName || user.uid
          };
          await setDoc(referencia, {
            planesRefuerzo: limitados,
            mensajeDocenteActual: mensaje,
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error guardando plan de refuerzo:", error);
          return false;
        }
      };

      let ultimoEstadoExtensionGuardado = 0;
      window.guardarEstadoExtensionSeguimientoFirebase = async function(estado) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        // El heartbeat nunca debe crear el documento antes del alta inicial.
        if (!user || !db || !registroFirebaseExistente) return false;
        const ahora = Date.now();
        if (ahora - ultimoEstadoExtensionGuardado < 8000 && estado?.forzar !== true) return true;
        ultimoEstadoExtensionGuardado = ahora;
        const texto = (valor, maximo) => String(valor || "").trim().slice(0, maximo);
        try {
          await setDoc(doc(db, "estudiantes", user.uid), {
            seguimientoExtension: {
              instalada: estado?.instalada === true,
              activa: estado?.activa === true,
              version: texto(estado?.version, 30),
              ultimaSenalEn: texto(estado?.ultimaSenalEn || new Date().toISOString(), 40),
              dominioActual: texto(estado?.dominioActual, 120),
              tituloActual: texto(estado?.tituloActual, 300),
              visitaIniciadaEn: texto(estado?.visitaIniciadaEn, 40),
              salidaGrupoId: texto(estado?.salidaGrupoId, 160),
              pendientes: Math.max(0, Math.min(500, Number(estado?.pendientes) || 0)),
              claseId: texto(estado?.claseId || idClaseActual(), 120)
            }
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error guardando el estado de la extensión:", error);
          return false;
        }
      };

      window.guardarEstadoEstudianteFirebase = async function(uid, estadoData) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !estadoData) return false;
        try {
          await setDoc(doc(database, "estudiantes", uid), {
            estadoCuenta: estadoData.estadoCuenta,
            bajaMotivo: estadoData.bajaMotivo || "",
            bajaFecha: estadoData.bajaFecha || null,
            bajaPor: estadoData.bajaPor || "",
            rechazoMotivo: estadoData.rechazoMotivo || "",
            rechazadoEn: estadoData.rechazadoEn || null,
            rechazadoPor: estadoData.rechazadoPor || "",
            aprobadoEn: estadoData.aprobadoEn || null,
            aprobadoPor: estadoData.aprobadoPor || "",
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error guardando estado de estudiante:", error);
          return false;
        }
      };

      window.eliminarEstudianteFirebase = async function(uid) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        if (!user || !contexto.database || !uid) return false;
        try {
          if (!(await verificarUsuarioDocente(user))) return false;
          const database = contexto.database;
          const subcoleccionesEstudiante = [
            "historialDesbloqueos",
            "historialDescuentos",
            "historialNotasDesafios",
            "historialPestanas",
            "revisionesPestanas",
            "revisionesPestanasEstudiante",
            "mensajesDocente",
            "historialRevisionesPestanas"
          ];
          let documentosAsociadosEliminados = 0;

          for (const nombreSubcoleccion of subcoleccionesEstudiante) {
            const referencia = collection(database, "estudiantes", uid, nombreSubcoleccion);
            const snapshot = await getDocs(referencia);
            const documentos = snapshot.docs;

            for (let inicio = 0; inicio < documentos.length; inicio += 450) {
              const lote = writeBatch(database);
              documentos.slice(inicio, inicio + 450).forEach(documento => {
                lote.delete(documento.ref);
              });
              await lote.commit();
            }
            documentosAsociadosEliminados += documentos.length;
          }

          await deleteDoc(doc(database, "estudiantes", uid));
          window.ultimoResumenEliminacionEstudiante = {
            uid,
            documentoPrincipalEliminado: true,
            documentosAsociadosEliminados,
            subcoleccionesEliminadas: [...subcoleccionesEstudiante],
            eliminadoPor: user.email || user.displayName || user.uid,
            eliminadoEn: new Date().toISOString()
          };
          return true;
        } catch (error) {
          console.error("Error eliminando estudiante:", error);
          window.ultimoResumenEliminacionEstudiante = {
            uid,
            documentoPrincipalEliminado: false,
            error: error?.message || "Error desconocido",
            codigo: error?.code || ""
          };
          return false;
        }
      };

      window.reiniciarSalidasEstudianteFirebase = async function(uid) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) {
          window.ultimoErrorReinicioSalidas = {
            code: "teacher-not-authorized",
            message: "No hay una sesión docente autorizada activa."
          };
          return false;
        }
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid) return false;
        try {
          const referencia = doc(database, "estudiantes", uid);
          await setDoc(referencia, {
            salidasPestana: 0,
            reinicioSalidas: {
              id: `${Date.now()}-${uid}`,
              solicitadoPor: user.email || user.displayName || user.uid,
              solicitadoEn: serverTimestamp()
            },
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error reiniciando el contador de cambios de pestaña:", error);
          if (error?.code === "permission-denied") {
            try {
              await setDoc(doc(database, "estudiantes", uid), {
                salidasPestana: 0
              }, { merge: true });
              window.ultimoErrorReinicioSalidas = {
                code: "diagnostic-minimal-write-ok",
                message: "La escritura mínima funcionó; la regla rechazó reinicioSalidas o actualizadoEn.",
                email: user?.email || "",
                emailVerified: user?.emailVerified === true
              };
              return true;
            } catch (errorMinimo) {
              console.error("También falló la escritura mínima del contador:", errorMinimo);
              window.ultimoErrorReinicioSalidas = {
                code: errorMinimo?.code || "",
                message: errorMinimo?.message || "",
                email: user?.email || "",
                emailVerified: user?.emailVerified === true,
                projectId: firebaseConfig.projectId
              };
              return false;
            }
          }
          window.ultimoErrorReinicioSalidas = {
            code: error?.code || '',
            message: error?.message || '',
            email: user?.email || '',
            emailVerified: user?.emailVerified === true,
            projectId: firebaseConfig.projectId
          };
          return false;
        }
      };

      window.controlarCronometroEstudianteFirebase = async function(uid, accion) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid) return false;
        try {
          const referencia = doc(database, "estudiantes", uid);
          const snapshot = await getDoc(referencia);
          const controlActual = snapshot.exists() ? (snapshot.data().controlCronometroIndividual || {}) : {};
          let pausado = controlActual.pausado === true;
          let reinicioId = String(controlActual.reinicioId || "");
          if (accion === "pausar") pausado = true;
          else if (accion === "reanudar") pausado = false;
          else if (accion === "reiniciar") reinicioId = `${Date.now()}-${uid}`;
          else return false;
          await setDoc(referencia, {
            controlCronometroIndividual: {
              pausado,
              reinicioId,
              actualizadoPor: user.email || user.displayName || user.uid,
              actualizadoEn: serverTimestamp()
            },
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error controlando el cronómetro individual:", error);
          return false;
        }
      };

      window.actualizarJitsiGrupalFirebase = async function(estudiantes, configuracion = {}) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !(await verificarUsuarioDocente(user))) return false;
        const lista = Array.isArray(estudiantes)
          ? estudiantes.filter(item => item?.uid)
          : [];
        if (!lista.length) return false;
        try {
          const responsable = user.email || user.displayName || user.uid;
          const grupos = [];
          for (let inicio = 0; inicio < lista.length; inicio += 400) {
            grupos.push(lista.slice(inicio, inicio + 400));
          }
          for (const grupo of grupos) {
            const batch = writeBatch(database);
            grupo.forEach(estudiante => {
              batch.set(doc(database, "estudiantes", estudiante.uid), {
                jitsiGrupal: {
                  disponible: configuracion.disponible === true,
                  id: String(configuracion.id || ""),
                  sala: String(configuracion.sala || ""),
                  enlace: String(configuracion.enlace || ""),
                  curso: String(configuracion.curso || ""),
                  division: String(configuracion.division || ""),
                  turno: String(configuracion.turno || ""),
                  duracionMinutos: Number(configuracion.duracionMinutos || 0),
                  expiraEn: configuracion.disponible === true ? String(configuracion.expiraEn || "") : "",
                  actualizadoPor: responsable,
                  actualizadoPorUid: user.uid,
                  actualizadoEn: serverTimestamp()
                },
                jitsiParticipacion: configuracion.disponible === true ? {
                  llamadaId: String(configuracion.id || ""),
                  tipo: "grupal",
                  estado: "invitado",
                  actualizadoEn: serverTimestamp()
                } : {
                  llamadaId: String(configuracion.id || estudiante.jitsiGrupal?.id || ""),
                  tipo: "grupal",
                  estado: "finalizada",
                  actualizadoEn: serverTimestamp()
                },
                actualizadoEn: serverTimestamp()
              }, { merge: true });
            });
            await batch.commit();
          }
          return true;
        } catch (error) {
          console.error("Error actualizando la sala Jitsi grupal:", error);
          window.ultimoErrorJitsiGrupal = {
            code: error?.code || "",
            message: error?.message || "Error desconocido"
          };
          return false;
        }
      };
      window.actualizarDisponibilidadJitsiFirebase = async function(uid, disponible, configuracion = {}) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return false;
        try {
          const responsable = user.email || user.displayName || user.uid;
          await setDoc(doc(database, "estudiantes", uid), {
            jitsiDisponible: disponible === true,
            jitsiSala: {
              disponible: disponible === true,
              id: disponible === true ? String(configuracion.id || `${Date.now()}-${uid}`) : "",
              duracionMinutos: Number(configuracion.duracionMinutos || 0),
              expiraEn: disponible === true ? String(configuracion.expiraEn || "") : "",
              actualizadoPor: responsable,
              actualizadoPorUid: user.uid,
              actualizadoEn: serverTimestamp()
            },
            jitsiParticipacion: disponible === true ? {
              llamadaId: String(configuracion.id || `${Date.now()}-${uid}`),
              tipo: "individual",
              estado: "invitado",
              actualizadoEn: serverTimestamp()
            } : {
              llamadaId: String(configuracion.id || ""),
              tipo: "individual",
              estado: "finalizada",
              actualizadoEn: serverTimestamp()
            },
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error actualizando la disponibilidad de Jitsi:", error);
          window.ultimoErrorJitsi = {
            code: error?.code || "",
            message: error?.message || "Error desconocido"
          };
          return false;
        }
      };
      window.guardarConfiguracionJitsiFirebase = async function(configuracion = {}) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !(await verificarUsuarioDocente(user))) return false;
        try {
          const individual = Math.max(1, Math.min(120, Number(configuracion.individual) || 5));
          const grupal = Math.max(1, Math.min(120, Number(configuracion.grupal) || 60));
          await setDoc(doc(database, "controlClase", idClaseActual(), "configuracion", "jitsi"), {
            individual,
            grupal,
            actualizadoPor: user.email || user.displayName || user.uid,
            actualizadoPorUid: user.uid,
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error guardando la configuración Jitsi:", error);
          return false;
        }
      };
      window.cargarConfiguracionJitsiFirebase = async function() {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || window.firebaseCurrentUser || await window.firebaseAuthReady;
        const database = contexto.database || db;
        if (!user || !database) return null;
        try {
          const snapshot = await getDoc(doc(database, "controlClase", idClaseActual(), "configuracion", "jitsi"));
          return snapshot.exists() ? snapshot.data() : null;
        } catch (error) {
          console.error("Error cargando la configuración Jitsi:", error);
          return null;
        }
      };
      window.escucharConfiguracionJitsiFirebase = function() {
        const contexto = contextoDocenteFirebase();
        const database = contexto.database || db;
        if (!database) return;
        if (window.__jitsiConfiguracionUnsubscribe) window.__jitsiConfiguracionUnsubscribe();
        window.__jitsiConfiguracionUnsubscribe = onSnapshot(
          doc(database, "controlClase", idClaseActual(), "configuracion", "jitsi"),
          snapshot => {
            if (!snapshot.exists()) return;
            window.dispatchEvent(new CustomEvent("jitsi-configuracion-remota", { detail: snapshot.data() }));
          },
          error => console.error("Error escuchando configuración Jitsi:", error)
        );
      };
      const JITSI_HISTORY_ENABLED = false;
      window.guardarHistorialJitsiFirebase = async function(llamada = {}) {
        if (!JITSI_HISTORY_ENABLED) return true;
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        const id = String(llamada.id || "").replace(/[^a-zA-Z0-9._-]/g, "_");
        if (!user || !database || !id || !(await verificarUsuarioDocente(user))) return false;
        try {
          const participantes = Array.isArray(llamada.participantes)
            ? llamada.participantes.slice(0, 350).map(item => ({
                uid: String(item.uid || ""),
                email: String(item.email || ""),
                nombre: String(item.nombre || ""),
                estado: String(item.estado || "invitado")
              }))
            : [];
          const datosHistorial = {
            id,
            tipo: llamada.tipo === "grupal" ? "grupal" : "individual",
            sala: String(llamada.sala || ""),
            curso: String(llamada.curso || ""),
            division: String(llamada.division || ""),
            turno: String(llamada.turno || ""),
            estudianteUid: String(llamada.estudianteUid || ""),
            estudianteEmail: String(llamada.estudianteEmail || ""),
            estudianteNombre: String(llamada.estudianteNombre || ""),
            duracionMinutos: Number(llamada.duracionMinutos || 0),
            expiraEn: String(llamada.expiraEn || ""),
            estado: String(llamada.estado || "activa"),
            motivoFinalizacion: String(llamada.motivoFinalizacion || ""),
            participantes,
            invitados: Number(llamada.invitados ?? participantes.length ?? 0),
            notificados: Number(llamada.notificados || 0),
            unidos: Number(llamada.unidos || 0),
            rechazados: Number(llamada.rechazados || 0),
            salieron: Number(llamada.salieron || 0),
            docente: user.email || user.displayName || user.uid,
            docenteUid: user.uid,
            actualizadoEn: serverTimestamp()
          };
          if (llamada.registrarInicio === true) datosHistorial.iniciadaEn = serverTimestamp();
          if (llamada.estado === "finalizada" || llamada.estado === "cancelada") datosHistorial.finalizadaEn = serverTimestamp();
          await setDoc(doc(database, "controlClase", idClaseActual(), "historialJitsi", id), datosHistorial, { merge: true });
          return true;
        } catch (error) {
          console.error("Error guardando historial Jitsi:", error);
          return false;
        }
      };
      window.obtenerHistorialJitsiFirebase = async function() {
        if (!JITSI_HISTORY_ENABLED) return [];
        window.ultimoErrorHistorialJitsi = null;
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database) {
          window.ultimoErrorHistorialJitsi = { code: "not-authenticated", message: "No hay una cuenta docente autorizada activa." };
          return [];
        }
        if (!(await verificarUsuarioDocente(user))) {
          window.ultimoErrorHistorialJitsi = { code: "not-authorized", message: "La cuenta actual no está autorizada como docente o el correo no está verificado." };
          return [];
        }
        try {
          const snapshot = await getDocs(collection(database, "controlClase", idClaseActual(), "historialJitsi"));
          return snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => {
            const fechaA = a.iniciadaEn?.toMillis?.() || a.iniciadaEn?.seconds * 1000 || new Date(a.expiraEn || 0).getTime();
            const fechaB = b.iniciadaEn?.toMillis?.() || b.iniciadaEn?.seconds * 1000 || new Date(b.expiraEn || 0).getTime();
            return fechaB - fechaA;
          });
        } catch (error) {
          console.error("Error consultando historial Jitsi:", error);
          window.ultimoErrorHistorialJitsi = { code: error?.code || "unknown", message: error?.message || "No se pudo consultar el historial Jitsi." };
          return [];
        }
      };
      window.buscarLlamadasJitsiAntiguasFirebase = async function(opciones = {}) {
        if (!JITSI_HISTORY_ENABLED) return { llamadas: [], antiguedadHoras: 0 };
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !(await verificarUsuarioDocente(user))) return { llamadas: [], error: "No autorizado" };
        const antiguedadHoras = Math.max(1, Math.min(8760, Number(opciones.antiguedadHoras) || 24));
        const limite = Date.now() - antiguedadHoras * 60 * 60 * 1000;
        try {
          const snapshot = await getDocs(collection(database, "controlClase", idClaseActual(), "historialJitsi"));
          const llamadas = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => {
            const actualizado = item.actualizadoEn?.toMillis?.() || item.actualizadoEn?.seconds * 1000 || item.iniciadaEn?.toMillis?.() || item.iniciadaEn?.seconds * 1000 || 0;
            const expira = new Date(String(item.expiraEn || '')).getTime();
            const estadoFinal = ["finalizada", "cancelada"].includes(String(item.estado || ""));
            const vencida = Number.isFinite(expira) && expira > 0 && expira <= Date.now();
            return actualizado > 0 && actualizado <= limite && (estadoFinal || vencida);
          }).sort((a, b) => {
            const fechaA = a.actualizadoEn?.toMillis?.() || a.actualizadoEn?.seconds * 1000 || 0;
            const fechaB = b.actualizadoEn?.toMillis?.() || b.actualizadoEn?.seconds * 1000 || 0;
            return fechaA - fechaB;
          });
          return { llamadas, antiguedadHoras };
        } catch (error) {
          console.error("Error revisando llamadas Jitsi antiguas:", error);
          return { llamadas: [], error: error?.message || "No se pudo consultar el historial" };
        }
      };
      window.eliminarLlamadasJitsiAntiguasFirebase = async function(llamadas = []) {
        if (!JITSI_HISTORY_ENABLED) return { eliminadas: 0 };
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !(await verificarUsuarioDocente(user))) return { eliminadas: 0, error: "No autorizado" };
        const ids = [...new Set((Array.isArray(llamadas) ? llamadas : []).map(item => String(item?.id || "").replace(/[^a-zA-Z0-9._-]/g, "_")).filter(Boolean))].slice(0, 350);
        if (!ids.length) return { eliminadas: 0 };
        try {
          for (let inicio = 0; inicio < ids.length; inicio += 400) {
            const batch = writeBatch(database);
            ids.slice(inicio, inicio + 400).forEach(id => batch.delete(doc(database, "controlClase", idClaseActual(), "historialJitsi", id)));
            await batch.commit();
          }
          return { eliminadas: ids.length };
        } catch (error) {
          console.error("Error eliminando llamadas Jitsi antiguas:", error);
          return { eliminadas: 0, error: error?.message || "No se pudo eliminar el historial" };
        }
      };
      window.revisarHistorialJitsiAdministradorFirebase = async function() {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database) {
          return { ok: false, error: "No hay una sesión administrativa activa." };
        }
        if (!usuarioEsAdministradorPrincipal(user)) {
          return { ok: false, error: "Solo el administrador principal puede revisar y eliminar este historial." };
        }
        try {
          const snapshot = await getDocs(collectionGroup(database, "historialJitsi"));
          const documentos = snapshot.docs
            .map(item => ({ id: item.id, path: item.ref.path }))
            .filter(item => /^controlClase\/[^/]+\/historialJitsi\/[^/]+$/.test(item.path));
          return {
            ok: true,
            claseId: "*",
            cantidad: documentos.length,
            documentos
          };
        } catch (error) {
          console.error("Error revisando el historial Jitsi administrativo:", error);
          return {
            ok: false,
            code: error?.code || "unknown",
            error: error?.message || "No se pudo consultar el historial Jitsi."
          };
        }
      };
      window.eliminarHistorialJitsiAdministradorFirebase = async function(documentos = []) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database) {
          return { ok: false, eliminadas: 0, error: "No hay una sesión administrativa activa." };
        }
        if (!usuarioEsAdministradorPrincipal(user)) {
          return { ok: false, eliminadas: 0, error: "Solo el administrador principal puede ejecutar esta operación." };
        }
        const rutas = [...new Set(
          (Array.isArray(documentos) ? documentos : [])
            .map(item => String(item?.path || ""))
            .filter(path => /^controlClase\/[^/]+\/historialJitsi\/[^/]+$/.test(path))
        )];
        if (!rutas.length) return { ok: true, eliminadas: 0, claseId: "*" };
        let eliminadas = 0;
        const operacionId = crearIdAuditoriaDocente();
        try {
          for (let inicio = 0; inicio < rutas.length; inicio += 450) {
            const grupo = rutas.slice(inicio, inicio + 450);
            const lote = writeBatch(database);
            grupo.forEach(path => {
              lote.delete(doc(database, path));
            });
            await lote.commit();
            eliminadas += grupo.length;
          }
          try {
            await setDoc(doc(database, "historialAdministracion", operacionId), {
              id: operacionId,
              tipo: "eliminacion_historial_jitsi",
              claseId: "*",
              documentosEliminados: eliminadas,
              administradorEmail: normalizarEmailDocente(user.email),
              administradorUid: user.uid,
              ejecutadoEn: serverTimestamp()
            });
            return {
              ok: true,
              eliminadas,
              claseId: "*",
              operacionId,
              auditoriaRegistrada: true
            };
          } catch (errorAuditoria) {
            console.error("El historial Jitsi se eliminó, pero falló la auditoría administrativa:", errorAuditoria);
            return {
              ok: true,
              eliminadas,
              claseId: "*",
              operacionId,
              auditoriaRegistrada: false,
              advertencia: errorAuditoria?.message || "No se pudo registrar la auditoría."
            };
          }
        } catch (error) {
          console.error("Error eliminando definitivamente el historial Jitsi:", error);
          return {
            ok: false,
            eliminadas,
            code: error?.code || "unknown",
            error: error?.message || "No se pudo completar la eliminación definitiva."
          };
        }
      };
      window.eliminarHistorialAportesAdministradorFirebase = async function() {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !usuarioEsAdministradorPrincipal(user)) {
          return { ok: false, eliminadas: 0, error: "Solo el administrador principal puede ejecutar esta operación." };
        }
        let eliminadas = 0;
        try {
          const snapshot = await getDocs(collectionGroup(database, "historialAportes"));
          const rutas = snapshot.docs
            .map(item => item.ref.path)
            .filter(path => /^estudiantes\/[^/]+\/colaboracionCodigo\/[^/]+\/historialAportes\/[^/]+$/.test(path));
          for (let inicio = 0; inicio < rutas.length; inicio += 450) {
            const lote = writeBatch(database);
            rutas.slice(inicio, inicio + 450).forEach(path => lote.delete(doc(database, path)));
            await lote.commit();
            eliminadas += Math.min(450, rutas.length - inicio);
          }
          return { ok: true, eliminadas };
        } catch (error) {
          console.error("Error eliminando el historial colaborativo antiguo:", error);
          return { ok: false, eliminadas, error: error?.message || "No se pudo eliminar el historial colaborativo." };
        }
      };
      window.registrarEstadoJitsiEstudianteFirebase = async function(tipo, llamadaId, estado) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!db || !user || !llamadaId) return false;
        const estadosPermitidos = ["notificado", "unido", "rechazado", "salio", "finalizada"];
        const estadoSeguro = estadosPermitidos.includes(estado) ? estado : "notificado";
        try {
          await setDoc(doc(db, "estudiantes", user.uid), {
            jitsiParticipacion: {
              llamadaId: String(llamadaId),
              tipo: tipo === "grupal" ? "grupal" : "individual",
              estado: estadoSeguro,
              actualizadoEn: serverTimestamp()
            },
            actualizadoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error registrando participación Jitsi:", error);
          return false;
        }
      };
      window.bloquearPantallaEstudianteFirebase = async function(uid, detalle = {}) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return false;
        try {
          const estudianteRef = doc(database, "estudiantes", uid);
          const responsable = user.email || user.displayName || user.uid;
          const motivo = String(detalle.motivo || "Bloqueo manual solicitado por el docente").trim();
          const bloqueoId = `${Date.now()}-${uid}`;
          const bloqueado = await runTransaction(database, async transaction => {
            const snapshot = await transaction.get(estudianteRef);
            if (!snapshot.exists() || snapshot.data().pantallaBloqueada === true) return false;
            const datos = snapshot.data();
            transaction.set(estudianteRef, {
              pantallaBloqueada: true,
              pantallaBloqueadaEn: new Date().toISOString(),
              pantallaBloqueadaSalidas: Number(datos.salidasPestana || 0),
              pantallaBloqueadaSeccion: String(detalle.seccion || datos.seccionActiva || ""),
              bloqueoManual: true,
              ultimoBloqueoManual: {
                id: bloqueoId,
                por: responsable,
                porUid: user.uid,
                motivo,
                en: serverTimestamp()
              },
              actualizadoEn: serverTimestamp()
            }, { merge: true });
            return true;
          });
          return bloqueado === true;
        } catch (error) {
          console.error("Error bloqueando manualmente la pantalla:", error);
          return false;
        }
      };

      window.desbloquearPantallaEstudianteFirebase = async function(uid, detalle = {}) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid) return false;
        try {
          const estudianteRef = doc(database, "estudiantes", uid);
          const eventoId = `${Date.now()}-${uid}`;
          const historialRef = doc(collection(database, "estudiantes", uid, "historialDesbloqueos"), eventoId);
          const responsable = user.email || user.displayName || user.uid;
          const motivo = String(detalle.motivo || "Desbloqueo autorizado por el docente").trim();

          const desbloqueado = await runTransaction(database, async transaction => {
            const snapshot = await transaction.get(estudianteRef);
            if (!snapshot.exists() || snapshot.data().pantallaBloqueada !== true) return false;

            const datos = snapshot.data();
            const ultimoDesbloqueo = {
              id: eventoId,
              por: responsable,
              porUid: user.uid,
              motivo,
              en: serverTimestamp()
            };

            transaction.set(estudianteRef, {
              pantallaBloqueada: false,
              cantidadDesbloqueos: increment(1),
              ultimoDesbloqueo,
              // Se conserva este campo para notificar al navegador del estudiante.
              desbloqueoPantalla: ultimoDesbloqueo,
              actualizadoEn: serverTimestamp()
            }, { merge: true });

            transaction.set(historialRef, {
              id: eventoId,
              estudianteUid: uid,
              estudianteNombre: datos.estudiante?.nombre || datos.nombreGoogle || detalle.nombre || "",
              estudianteEmail: datos.email || "",
              desbloqueadoPor: responsable,
              desbloqueadoPorUid: user.uid,
              desbloqueadoEn: serverTimestamp(),
              motivo,
              bloqueoEn: datos.pantallaBloqueadaEn || null,
              bloqueoSalidas: Number(datos.pantallaBloqueadaSalidas || datos.salidasPestana || 0),
              bloqueoSeccion: String(datos.pantallaBloqueadaSeccion || "")
            });

            return true;
          });

          return desbloqueado === true;
        } catch (error) {
          console.error("Error desbloqueando la pantalla:", error);
          return false;
        }
      };

      window.obtenerHistorialDesbloqueosFirebase = async function(uid) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return [];
        try {
          const referencia = collection(database, "estudiantes", uid, "historialDesbloqueos");
          const snapshot = await getDocs(referencia);
          return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => {
              const fechaA = a.desbloqueadoEn?.toDate ? a.desbloqueadoEn.toDate().getTime() : new Date(a.desbloqueadoEn || 0).getTime();
              const fechaB = b.desbloqueadoEn?.toDate ? b.desbloqueadoEn.toDate().getTime() : new Date(b.desbloqueadoEn || 0).getTime();
              return fechaB - fechaA;
            });
        } catch (error) {
          console.error("Error consultando historial de desbloqueos:", error);
          return [];
        }
      };

      window.obtenerHistorialDescuentosFirebase = async function(uid) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return [];
        try {
          const referencia = collection(database, "estudiantes", uid, "historialDescuentos");
          const snapshot = await getDocs(referencia);
          return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => {
              const fechaA = a.cambiadoEn?.toDate ? a.cambiadoEn.toDate().getTime() : new Date(a.cambiadoEn || 0).getTime();
              const fechaB = b.cambiadoEn?.toDate ? b.cambiadoEn.toDate().getTime() : new Date(b.cambiadoEn || 0).getTime();
              return fechaB - fechaA;
            });
        } catch (error) {
          console.error("Error consultando historial de descuentos:", error);
          window.ultimoErrorHistorialDescuentos = {
            code: error?.code || "",
            message: error?.message || "Error desconocido"
          };
          return [];
        }
      };

      window.guardarEventoPestanaExternaFirebase = async function(evento) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db || !evento?.id) return false;
        const texto = (valor, maximo) => String(valor || "").trim().slice(0, maximo);
        const salidaEn = texto(evento.salidaEn, 40);
        const regresoEn = texto(evento.regresoEn, 40);
        const salidaFecha = new Date(salidaEn);
        const regresoFecha = new Date(regresoEn);
        if (
          Number.isNaN(salidaFecha.getTime()) ||
          Number.isNaN(regresoFecha.getTime()) ||
          regresoFecha < salidaFecha
        ) return false;
        const eventoId = texto(evento.id, 160).replace(/[^a-zA-Z0-9._-]/g, "_");
        if (!eventoId) return false;
        try {
          await setDoc(doc(db, "estudiantes", user.uid, "historialPestanas", eventoId), {
            id: eventoId,
            estudianteUid: user.uid,
            estudianteEmail: user.email || "",
            claseId: texto(evento.claseId, 120),
            salidaGrupoId: texto(evento.salidaGrupoId || evento.id, 160),
            tituloOrigen: texto(evento.tituloOrigen, 300),
            seccionOrigen: texto(evento.seccionOrigen, 120),
            seccionTitulo: texto(evento.seccionTitulo, 200),
            tituloDestino: texto(evento.tituloDestino || "Sin título", 300),
            dominioDestino: texto(evento.dominioDestino || "desconocido", 120),
            salidaEn,
            regresoEn,
            duracionSegundos: Math.max(0, Math.min(86400, Number(evento.duracionSegundos) || 0)),
            extensionVersion: texto(evento.extensionVersion, 30),
            expiraEn: new Date(Date.now() + Math.max(
              1,
              Math.min(3650, Number(window.configuracionSeguimientoActual?.retencionDias) || 180)
            ) * 86400000),
            registradoEn: serverTimestamp()
          });
          return true;
        } catch (error) {
          console.error("Error guardando historial de pestañas:", error);
          window.ultimoErrorHistorialPestanas = {
            code: error?.code || "",
            message: error?.message || "Error desconocido"
          };
          return false;
        }
      };

      window.obtenerHistorialPestanasFirebase = async function(uid) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return [];
        try {
          const referencia = collection(database, "estudiantes", uid, "historialPestanas");
          const snapshot = await getDocs(referencia);
          return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => new Date(b.salidaEn || 0).getTime() - new Date(a.salidaEn || 0).getTime());
        } catch (error) {
          console.error("Error consultando historial de pestañas:", error);
          window.ultimoErrorHistorialPestanas = {
            code: error?.code || "",
            message: error?.message || "Error desconocido"
          };
          return [];
        }
      };

      window.obtenerRevisionesPestanasFirebase = async function(uid) {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return [];
        try {
          const snapshot = await getDocs(collection(database, "estudiantes", uid, "revisionesPestanas"));
          return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        } catch (error) {
          console.error("Error consultando revisiones de pestañas:", error);
          window.ultimoErrorRevisionesPestanas = { code: error?.code || "", message: error?.message || "" };
          return [];
        }
      };

      window.obtenerResumenPestanasEstudianteFirebase = async function() {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db) return { historial: [], revisiones: [] };
        try {
          const [historialSnapshot, revisionesSnapshot] = await Promise.all([
            getDocs(collection(db, "estudiantes", user.uid, "historialPestanas")),
            getDocs(collection(db, "estudiantes", user.uid, "revisionesPestanasEstudiante"))
          ]);
          const historial = historialSnapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => new Date(b.salidaEn || 0).getTime() - new Date(a.salidaEn || 0).getTime());
          const revisiones = revisionesSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
          return { historial, revisiones };
        } catch (error) {
          console.error("Error consultando el resumen de pestañas del estudiante:", error);
          window.ultimoErrorResumenPestanasEstudiante = {
            code: error?.code || "",
            message: error?.message || ""
          };
          return { historial: [], revisiones: [] };
        }
      };

      window.sincronizarRevisionesPublicasPestanasFirebase = async function(uid, revisiones = []) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        const { user, database } = contextoDocenteFirebase();
        if (!user || !database || !uid || !Array.isArray(revisiones)) return false;
        const estadosPermitidos = ["pendiente", "revisada", "justificada", "no_justificada", "permitida", "advertencia"];
        try {
          for (const revision of revisiones) {
            const grupoId = String(revision?.salidaGrupoId || "").trim().slice(0, 160);
            if (!grupoId) continue;
            const documentoId = grupoId.replace(/[^a-zA-Z0-9._-]/g, "_");
            const estado = estadosPermitidos.includes(revision.estado) ? revision.estado : "pendiente";
            await setDoc(doc(database, "estudiantes", uid, "revisionesPestanasEstudiante", documentoId), {
              salidaGrupoId: grupoId,
              estado,
              revisado: estado !== "pendiente",
              contabiliza: revision.contabiliza !== false,
              revisadoEn: revision.revisadoEn || serverTimestamp(),
              actualizadoEn: serverTimestamp()
            }, { merge: true });
          }
          return true;
        } catch (error) {
          console.error("Error sincronizando revisiones públicas de pestañas:", error);
          return false;
        }
      };

      window.obtenerHistorialRevisionesPestanasFirebase = async function(uid, salidaGrupoId = "") {
        const contexto = contextoDocenteFirebase();
        const user = contexto.user || await window.firebaseAuthReady;
        const database = contexto.database;
        if (!user || !database || !uid || !(await verificarUsuarioDocente(user))) return [];
        try {
          const snapshot = await getDocs(collection(database, "estudiantes", uid, "historialRevisionesPestanas"));
          return snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .filter(item => !salidaGrupoId || item.salidaGrupoId === salidaGrupoId)
            .sort((a, b) => {
              const fechaA = a.cambiadoEn?.toMillis ? a.cambiadoEn.toMillis() : new Date(a.cambiadoEn || 0).getTime();
              const fechaB = b.cambiadoEn?.toMillis ? b.cambiadoEn.toMillis() : new Date(b.cambiadoEn || 0).getTime();
              return fechaB - fechaA;
            });
        } catch (error) {
          console.error("Error consultando auditoría de revisiones:", error);
          return [];
        }
      };

      window.guardarRevisionPestanaFirebase = async function(uid, salidaGrupoId, revision = {}) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        const { user, database } = contextoDocenteFirebase();
        if (!user || !database || !uid || !salidaGrupoId) return false;
        const texto = (valor, maximo) => String(valor || "").trim().slice(0, maximo);
        const grupoId = texto(salidaGrupoId, 160);
        const documentoId = grupoId.replace(/[^a-zA-Z0-9._-]/g, "_");
        const estadosPermitidos = ["pendiente", "revisada", "justificada", "no_justificada", "permitida", "advertencia"];
        const estado = estadosPermitidos.includes(revision.estado) ? revision.estado : "pendiente";
        const etiquetas = [...new Set((Array.isArray(revision.etiquetas) ? revision.etiquetas : [])
          .map(item => texto(item, 40))
          .filter(Boolean))].slice(0, 10);
        const referencia = doc(database, "estudiantes", uid, "revisionesPestanas", documentoId);
        try {
          const anteriorSnapshot = await getDoc(referencia);
          const anterior = anteriorSnapshot.exists() ? anteriorSnapshot.data() : {};
          const responsable = user.email || user.displayName || user.uid;
          const actual = {
            salidaGrupoId: grupoId,
            estado,
            motivo: texto(revision.motivo, 120),
            observacion: texto(revision.observacion, 1000),
            etiquetas,
            contabiliza: revision.contabiliza !== false,
            docente: responsable,
            docenteUid: user.uid,
            revisadoEn: serverTimestamp()
          };
          const eventoId = `${Date.now()}-${user.uid}`.replace(/[^a-zA-Z0-9._-]/g, "_");
          const historialReferencia = doc(database, "estudiantes", uid, "historialRevisionesPestanas", eventoId);
          const resumenPublicoReferencia = doc(
            database,
            "estudiantes",
            uid,
            "revisionesPestanasEstudiante",
            documentoId
          );
          const lote = writeBatch(database);
          lote.set(referencia, actual);
          lote.set(resumenPublicoReferencia, {
            salidaGrupoId: grupoId,
            estado,
            revisado: estado !== "pendiente",
            contabiliza: actual.contabiliza,
            revisadoEn: serverTimestamp(),
            actualizadoEn: serverTimestamp()
          });
          lote.set(historialReferencia, {
            id: eventoId,
            estudianteUid: uid,
            salidaGrupoId: grupoId,
            docente: responsable,
            docenteUid: user.uid,
            estadoAnterior: texto(anterior.estado || "pendiente", 40),
            estadoNuevo: estado,
            motivoAnterior: texto(anterior.motivo, 120),
            motivoNuevo: actual.motivo,
            observacionAnterior: texto(anterior.observacion, 1000),
            observacionNueva: actual.observacion,
            contabilizabaAntes: anterior.contabiliza !== false,
            contabilizaAhora: actual.contabiliza,
            etiquetasAnteriores: Array.isArray(anterior.etiquetas) ? anterior.etiquetas.slice(0, 10) : [],
            etiquetasNuevas: etiquetas,
            cambiadoEn: serverTimestamp()
          });
          await lote.commit();
          return true;
        } catch (error) {
          console.error("Error guardando revisión de pestaña:", error);
          window.ultimoErrorRevisionPestana = { code: error?.code || "", message: error?.message || "" };
          return false;
        }
      };

      window.enviarMensajeDocenteFirebase = async function(uids = [], mensaje = {}) {
        window.ultimoErrorMensajeDocente = null;
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) {
          window.ultimoErrorMensajeDocente = {
            code: "docente-no-autorizado",
            message: "No se pudo validar una sesión docente autorizada."
          };
          return { ok: false, enviados: 0 };
        }
        const { user, database } = contextoDocenteFirebase();
        const destinatarios = [...new Set((Array.isArray(uids) ? uids : [])
          .map(uid => String(uid || "").trim())
          .filter(Boolean))];
        if (!user || !database || !destinatarios.length) {
          window.ultimoErrorMensajeDocente = {
            code: "destinatarios-no-disponibles",
            message: "No hay una sesión Firebase o destinatarios válidos."
          };
          return { ok: false, enviados: 0 };
        }
        const texto = (valor, maximo) => String(valor || "").trim().slice(0, maximo);
        const tiposPermitidos = ["todos", "grupo", "individual"];
        const prioridadesPermitidas = ["normal", "urgente"];
        const tipoDestino = tiposPermitidos.includes(mensaje.tipoDestino)
          ? mensaje.tipoDestino
          : "individual";
        const prioridad = prioridadesPermitidas.includes(mensaje.prioridad)
          ? mensaje.prioridad
          : "normal";
        const contenido = texto(mensaje.contenido, 1000);
        if (!contenido) {
          window.ultimoErrorMensajeDocente = {
            code: "mensaje-vacio",
            message: "El contenido del mensaje está vacío."
          };
          return { ok: false, enviados: 0 };
        }
        const mensajeId = `${Date.now()}-${user.uid}`.replace(/[^a-zA-Z0-9._-]/g, "_");
        const responsable = user.email || user.displayName || user.uid;
        let enviados = 0;
        try {
          for (let inicio = 0; inicio < destinatarios.length; inicio += 400) {
            const lote = writeBatch(database);
            destinatarios.slice(inicio, inicio + 400).forEach(uid => {
              lote.set(doc(database, "estudiantes", uid, "mensajesDocente", mensajeId), {
                id: mensajeId,
                estudianteUid: uid,
                tipoDestino,
                destinoDescripcion: texto(mensaje.destinoDescripcion, 200),
                asunto: texto(mensaje.asunto, 120),
                contenido,
                prioridad,
                docente: responsable,
                docenteUid: user.uid,
                enviadoEn: serverTimestamp(),
                recibido: false,
                recibidoEn: null,
                leido: false,
                leidoEn: null
              });
            });
            await lote.commit();
            enviados += Math.min(400, destinatarios.length - inicio);
          }
          return { ok: true, enviados, mensajeId, canal: "personal" };
        } catch (error) {
          console.error("Error enviando mensaje docente:", error);
          window.ultimoErrorMensajeDocente = {
            code: error?.code || "",
            message: error?.message || ""
          };
          if (enviados > 0) return { ok: false, enviados };
          try {
            for (let inicio = 0; inicio < destinatarios.length; inicio += 400) {
              const loteCompatible = writeBatch(database);
              destinatarios.slice(inicio, inicio + 400).forEach(uid => {
                loteCompatible.set(doc(database, "estudiantes", uid), {
                  mensajeDocenteActual: {
                    id: mensajeId,
                    estudianteUid: uid,
                    tipoDestino,
                    destinoDescripcion: texto(mensaje.destinoDescripcion, 200),
                    asunto: texto(mensaje.asunto, 120),
                    contenido,
                    prioridad,
                    docente: responsable,
                    docenteUid: user.uid,
                    enviadoEn: serverTimestamp(),
                    recibido: false,
                    recibidoEn: null,
                    leido: false,
                    leidoEn: null
                  }
                }, { merge: true });
              });
              await loteCompatible.commit();
            }
            window.ultimoErrorMensajeDocente = null;
            return {
              ok: true,
              enviados: destinatarios.length,
              mensajeId,
              canal: "documento-estudiante",
              modoCompatibilidad: true
            };
          } catch (errorCompatible) {
            console.error("Error enviando mensaje docente por el canal compatible:", errorCompatible);
            window.ultimoErrorMensajeDocente = {
              code: errorCompatible?.code || error?.code || "",
              message: errorCompatible?.message || error?.message || ""
            };
            return { ok: false, enviados: 0 };
          }
        }
      };

      window.marcarMensajeDocenteRecibidoFirebase = async function(mensajeId) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db || !mensajeId) return false;
        try {
          await setDoc(doc(db, "estudiantes", user.uid, "mensajesDocente", mensajeId), {
            recibido: true,
            recibidoEn: serverTimestamp()
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error confirmando la recepción del mensaje:", error);
          return false;
        }
      };

      window.escucharMensajesDocenteEstudianteFirebase = async function() {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db) return;
        if (window.__mensajesDocenteEstudianteUnsubscribe) {
          window.__mensajesDocenteEstudianteUnsubscribe();
        }
        const referencia = collection(db, "estudiantes", user.uid, "mensajesDocente");
        window.__mensajesDocenteEstudianteUnsubscribe = onSnapshot(referencia, snapshot => {
          const mensajes = snapshot.docs
            .map(item => ({ id: item.id, ...item.data(), canal: "personal" }))
            .filter(item => item.leido !== true)
            .sort((a, b) => {
              const fechaA = a.enviadoEn?.toMillis ? a.enviadoEn.toMillis() : new Date(a.enviadoEn || 0).getTime();
              const fechaB = b.enviadoEn?.toMillis ? b.enviadoEn.toMillis() : new Date(b.enviadoEn || 0).getTime();
              return fechaA - fechaB;
            });
          mensajes
            .filter(item => item.recibido !== true)
            .forEach(item => {
              void window.marcarMensajeDocenteRecibidoFirebase?.(item.id);
            });
          window.dispatchEvent(new CustomEvent("mensajes-docente-estudiante", {
            detail: mensajes
          }));
        }, error => {
          console.error("Error escuchando mensajes del docente:", error);
        });
      };

      window.marcarMensajeDocenteLeidoFirebase = async function(mensaje = {}) {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        const mensajeId = typeof mensaje === "string" ? mensaje : mensaje?.id;
        if (!user || !db || !mensajeId) return false;
        try {
          const cambios = {
            leido: true,
            leidoEn: serverTimestamp()
          };
          if (typeof mensaje !== "string" && mensaje?.recibido !== true) {
            cambios.recibido = true;
            cambios.recibidoEn = serverTimestamp();
          }
          await setDoc(doc(db, "estudiantes", user.uid, "mensajesDocente", mensajeId), cambios, { merge: true });
          return true;
        } catch (error) {
          console.error("Error confirmando la lectura del mensaje:", error);
          return false;
        }
      };

      window.marcarMensajeDocenteCompatibleFirebase = async function(mensaje = {}, estado = "recibido") {
        const user = window.firebaseCurrentUser || await window.firebaseAuthReady;
        if (!user || !db || !mensaje?.id || mensaje.estudianteUid !== user.uid) return false;
        const actualizado = { ...mensaje, canal: undefined };
        delete actualizado.canal;
        if (actualizado.recibido !== true || estado === "leido") {
          actualizado.recibido = true;
          actualizado.recibidoEn = actualizado.recibidoEn || serverTimestamp();
        }
        if (estado === "leido") {
          actualizado.leido = true;
          actualizado.leidoEn = serverTimestamp();
        }
        try {
          await setDoc(doc(db, "estudiantes", user.uid), {
            mensajeDocenteActual: actualizado
          }, { merge: true });
          return true;
        } catch (error) {
          console.error("Error actualizando el estado del mensaje compatible:", error);
          return false;
        }
      };

      window.escucharHistorialMensajesDocenteFirebase = async function(alActualizar) {
        const autorizado = await window.esDocenteAutorizadoFirebase?.();
        if (!autorizado || typeof alActualizar !== "function") return null;
        const { database } = contextoDocenteFirebase();
        if (!database) return null;
        return onSnapshot(collectionGroup(database, "mensajesDocente"), snapshot => {
          const mensajes = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data(),
            canal: "personal",
            ruta: item.ref.path
          }));
          alActualizar(mensajes);
        }, error => {
          console.error("Error cargando estados de mensajes docentes:", error);
          window.ultimoErrorHistorialMensajesDocente = {
            code: error?.code || "",
            message: error?.message || ""
          };
          alActualizar([]);
        });
      };

      window.borrarConsultasIAEstudiantesFirebase = async function(uids) {
        const autorizado = await window.autorizarDocenteFirebase?.();
        if (!autorizado) return false;
        const { user, database } = contextoDocenteFirebase();
        const ids = [...new Set((Array.isArray(uids) ? uids : []).filter(Boolean))];
        if (!user || !database || !ids.length) return false;
        try {
          for (const uid of ids) {
            await setDoc(doc(database, "estudiantes", uid), {
              chatIA: {},
              chatIABorradoId: `${Date.now()}-${uid}`,
              chatIABorradoPor: user.email || user.displayName || user.uid,
              chatIABorradoEn: serverTimestamp(),
              actualizadoEn: serverTimestamp()
            }, { merge: true });
          }
          return true;
        } catch (error) {
          console.error("Error borrando consultas IA:", error);
          return false;
        }
      };
    
      window.__cerrarPanelProfesorFirestore = function() {
        const detener = window.__profesorUnsubscribe;
        window.__profesorUnsubscribe = null;
        window.__profesorPanelActivo = false;
        if (typeof detener === "function") {
          try { detener(); } catch (error) {
            console.warn("No se pudo cerrar el listener del panel docente:", error);
          }
        }
      };

      window.__abrirPanelProfesorFirestore = async function() {
        const { database } = contextoDocenteFirebase();
        if (!database) return;
        if (!(await window.esDocenteAutorizadoFirebase?.())) {
          window.dispatchEvent(new CustomEvent("profesor-data-error", {
            detail: "La cuenta actual no está autorizada para consultar los estudiantes."
          }));
          return;
        }
        // Evita duplicar listeners si el panel se abre varias veces antes de
        // que termine el ciclo de renderizado de la interfaz.
        if (window.__profesorPanelActivo && window.__profesorUnsubscribe) return;
        window.__cerrarPanelProfesorFirestore?.();
        window.__profesorPanelActivo = true;
        if (window.__profesorRefreshInterval) {
          clearInterval(window.__profesorRefreshInterval);
          window.__profesorRefreshInterval = null;
        }
        let estudiantesActuales = [];
        let controlesActuales = new Map();
        let ultimaEmision = "";
        let emisionPendiente = false;
        let cancelado = false;
        const normalizarValor = valor => {
          if (valor && typeof valor.toMillis === "function") return valor.toMillis();
          if (valor && typeof valor.toDate === "function") return valor.toDate().toISOString();
          return valor;
        };
        const firmaDatos = datos => {
          try {
            return JSON.stringify(datos, (_clave, valor) => normalizarValor(valor));
          } catch {
            return String(datos?.uid || "");
          }
        };
        const emitirPanel = () => {
          if (cancelado || emisionPendiente) return;
          emisionPendiente = true;
          requestAnimationFrame(() => {
            emisionPendiente = false;
            if (cancelado) return;
            const estudiantes = estudiantesActuales.map(item => ({
            ...item.datos,
            uid: item.datos.uid || item.id,
            __controlEstudiante: controlesActuales.get(item.id) || null
            }));
            const firma = firmaDatos(estudiantes);
            if (firma === ultimaEmision) return;
            ultimaEmision = firma;
            window.dispatchEvent(new CustomEvent("profesor-data", { detail: estudiantes }));
          });
        };
        const manejarError = error => {
          if (cancelado) return;
          window.dispatchEvent(new CustomEvent("profesor-data-error", {
            detail: error?.message || "No se pudo actualizar el panel."
          }));
        };
        const detenerEstudiantes = onSnapshot(
          collection(database, "estudiantes"),
          snapshot => {
            estudiantesActuales = snapshot.docs.map(item => ({
              id: item.id,
              datos: item.data()
            }));
            emitirPanel();
          },
          manejarError
        );
        const detenerControles = onSnapshot(
          collection(database, "controlEstudiantes"),
          snapshot => {
            controlesActuales = new Map(
              snapshot.docs.map(item => [item.id, item.data()])
            );
            emitirPanel();
          },
          manejarError
        );
        window.__profesorUnsubscribe = () => {
          cancelado = true;
          detenerEstudiantes();
          detenerControles();
          window.__profesorRefreshInterval = null;
          window.__profesorUnsubscribe = null;
          window.__profesorPanelActivo = false;
        };
      };
      
      // ============================================================
      // DESAFÍOS EDITABLES EN FIREBASE
      // Colección: desafios / Documentos: sec-1 ... sec-19
      // ============================================================
      window.cargarDesafiosFirebase = async function() {
        if (!db) return null;
        try {
          const snap = await getDocs(collection(db, 'desafios'));
          if (snap.empty) return null;
          return snap.docs.map(d => ({ id:d.id, ...d.data() }));
        } catch (error) {
          console.error(error);
          window.dispatchEvent(new CustomEvent('desafios-firebase-error', { detail:error.message }));
          return null;
        }
      };

      window.guardarDesafioFirebase = async function(desafio) {
        const { user, database } = contextoDocenteFirebase();
        if (!database || !user || !desafio?.id) return false;
        try {
          await setDoc(doc(database,'desafios',desafio.id), {
            ...desafio,
            id:desafio.id,
            actualizadoEn:serverTimestamp(),
            actualizadoPor:user.email || ''
          }, {merge:true});
          return true;
        } catch(error) {
          console.error(error);
          window.dispatchEvent(new CustomEvent('desafio-firebase-error',{detail:error.message}));
          return false;
        }
      };

      window.guardarTodosDesafiosFirebase = async function(desafios) {
        const { user, database } = contextoDocenteFirebase();
        if (!database || !user || !Array.isArray(desafios)) return false;
        try {
          for (const desafio of desafios) {
            if (!desafio?.id) continue;
            await setDoc(doc(database,'desafios',desafio.id), {
              ...desafio,
              id:desafio.id,
              actualizadoEn:serverTimestamp(),
              actualizadoPor:user.email || ''
            }, {merge:true});
          }
          return true;
        } catch(error) {
          console.error(error);
          return false;
        }
      };

      window.__abrirDesafiosProfesorRealtime = function() {
        const { database } = contextoDocenteFirebase();
        if (!database) return;
        if (window.__desafiosProfesorUnsubscribe) window.__desafiosProfesorUnsubscribe();
        window.__desafiosProfesorUnsubscribe = onSnapshot(collection(database,'desafios'), snap => {
          const remotos=snap.docs.map(d=>({id:d.id,...d.data()}));
          if(remotos.length===19) window.dispatchEvent(new CustomEvent('desafios-profesor-data',{detail:remotos}));
        }, err => window.dispatchEvent(new CustomEvent('desafios-firebase-error',{detail:err.message})));
      };









