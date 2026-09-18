/* =====================================================
           BANCO DE PREGUNTAS MULTIPLE CHOICE POR TEMA
        ====================================================== */

      const QUIZ_DATA = {
        introduccion: [
          {
            pregunta: "¿Qué es JavaScript?",
            opciones: [
              "Un lenguaje de programación para dar interactividad a las páginas web",
              "Un lenguaje para diseñar el aspecto visual de la página",
              "Un programa para crear bases de datos",
              "Un sistema operativo",
            ],
            correcta: 0,
          },
          {
            pregunta:
              "¿Cuáles son las formas de incluir JavaScript en una página?",
            opciones: [
              "Solo en un archivo externo",
              "En atributos HTML, en etiqueta <script> y en archivo externo",
              "Únicamente con la etiqueta <style>",
              "Solo dentro del <head>",
            ],
            correcta: 1,
          },
          {
            pregunta:
              "¿Qué lenguaje se encarga de la estructura de una página web?",
            opciones: ["CSS", "JavaScript", "HTML", "JSON"],
            correcta: 2,
          },
        ],

        variables: [
          {
            pregunta:
              "¿Qué palabra clave se usa para una variable que NO puede cambiar su valor?",
            opciones: ["let", "var", "const", "static"],
            correcta: 2,
          },
          {
            pregunta:
              "¿Qué palabra clave se recomienda evitar usar hoy en día?",
            opciones: ["let", "const", "var", "function"],
            correcta: 2,
          },
          {
            pregunta:
              'Si declaramos const persona = { nombre: "Ana" }, ¿podemos hacer persona.nombre = "Juan"?',
            opciones: [
              "No, nunca se puede modificar",
              "Sí, porque const no impide modificar las propiedades del objeto",
              "Solo si usamos let",
              "Solo dentro de una función",
            ],
            correcta: 1,
          },
        ],

        tipos: [
          {
            pregunta: '¿Qué tipo de dato es "Hola mundo"?',
            opciones: ["Number", "String", "Boolean", "Object"],
            correcta: 1,
          },
          {
            pregunta: "¿Qué devuelve typeof al aplicarse sobre 25?",
            opciones: ['"string"', '"boolean"', '"number"', '"object"'],
            correcta: 2,
          },
          {
            pregunta: "¿Cuál de estos es un valor Boolean?",
            opciones: ['"true"', "true", "1", "null"],
            correcta: 1,
          },
        ],

        operadores: [
          {
            pregunta:
              "¿Qué operador se usa para calcular el resto de una división?",
            opciones: ["/", "%", "*", "//"],
            correcta: 1,
          },
          {
            pregunta: "¿Qué diferencia hay entre == y ===?",
            opciones: [
              "No hay diferencia",
              "=== compara valor y tipo, == solo compara valor",
              "== es más moderno",
              "=== solo funciona con números",
            ],
            correcta: 1,
          },
          {
            pregunta: "¿Qué devuelve la expresión true && false?",
            opciones: ["true", "false", "undefined", "Error"],
            correcta: 1,
          },
        ],

        condicionales: [
          {
            pregunta:
              "¿Qué palabra se usa para ejecutar un bloque cuando la condición del if es falsa?",
            opciones: ["then", "else", "default", "catch"],
            correcta: 1,
          },
          {
            pregunta:
              "¿Qué instrucción permite comparar un valor con varios casos posibles?",
            opciones: ["if", "switch", "for", "function"],
            correcta: 1,
          },
          {
            pregunta:
              "En un switch, ¿qué palabra evita que se sigan ejecutando los siguientes casos?",
            opciones: ["return", "stop", "break", "end"],
            correcta: 2,
          },
        ],

        funciones: [
          {
            pregunta: "¿Qué palabra clave se usa para crear una función?",
            opciones: ["func", "function", "def", "method"],
            correcta: 1,
          },
          {
            pregunta: "¿Qué diferencia hay entre parámetro y argumento?",
            opciones: [
              "Son lo mismo",
              "El parámetro es la variable de la función, el argumento es el valor enviado",
              "El argumento se define en la función y el parámetro se envía",
              "No existe diferencia real",
            ],
            correcta: 1,
          },
          {
            pregunta: "¿Para qué sirve la palabra return?",
            opciones: [
              "Para declarar una variable",
              "Para devolver un valor desde la función",
              "Para crear un bucle",
              "Para importar un archivo",
            ],
            correcta: 1,
          },
        ],

        arrays: [
          {
            pregunta:
              "¿Cómo se accede al primer elemento de un array llamado frutas?",
            opciones: ["frutas[1]", "frutas[0]", "frutas.primero", "frutas{0}"],
            correcta: 1,
          },
          {
            pregunta: "¿Qué método agrega un elemento al final de un array?",
            opciones: ["push()", "add()", "append()", "insert()"],
            correcta: 0,
          },
          {
            pregunta:
              "¿Qué propiedad indica la cantidad de elementos de un array?",
            opciones: ["size", "count", "length", "total"],
            correcta: 2,
          },
        ],

        bucles: [
          {
            pregunta: "¿Cuál de estos es un bucle en JavaScript?",
            opciones: ["if", "for", "switch", "function"],
            correcta: 1,
          },
          {
            pregunta:
              "¿Qué bucle es ideal cuando no sabemos cuántas veces se repetirá pero sí la condición?",
            opciones: ["for", "while", "switch", "if"],
            correcta: 1,
          },
          {
            pregunta: "¿Qué instrucción detiene por completo un bucle?",
            opciones: ["continue", "break", "return", "stop"],
            correcta: 1,
          },
        ],

        objetos: [
          {
            pregunta: "¿Cómo se representa un objeto en JavaScript?",
            opciones: [
              "Con corchetes []",
              "Con llaves {}",
              "Con paréntesis ()",
              'Con comillas ""',
            ],
            correcta: 1,
          },
          {
            pregunta:
              "¿Cómo se accede a una propiedad de un objeto llamado persona.nombre?",
            opciones: [
              "persona->nombre",
              'persona.nombre o persona["nombre"]',
              "persona::nombre",
              "persona(nombre)",
            ],
            correcta: 1,
          },
          {
            pregunta: "¿Qué es una propiedad de un objeto?",
            opciones: [
              "Un tipo de bucle",
              "Un par clave-valor dentro del objeto",
              "Una función global",
              "Un array",
            ],
            correcta: 1,
          },
        ],

        "arrays-avanzados": [
          {
            pregunta: "¿Qué hace el método map()?",
            opciones: [
              "Filtra elementos que cumplen una condición",
              "Crea un nuevo array transformando cada elemento",
              "Suma todos los elementos",
              "Ordena el array",
            ],
            correcta: 1,
          },
          {
            pregunta: "¿Qué hace el método filter()?",
            opciones: [
              "Devuelve un nuevo array con los elementos que cumplen una condición",
              "Modifica el array original eliminando elementos",
              "Suma los elementos del array",
              "Convierte el array en string",
            ],
            correcta: 0,
          },
          {
            pregunta: "¿Qué hace el método reduce()?",
            opciones: [
              "Elimina elementos duplicados",
              "Reduce el array a un único valor acumulado",
              "Invierte el orden del array",
              "Cuenta cuántos elementos tiene el array",
            ],
            correcta: 1,
          },
        ],

        strings: [
          {
            pregunta: "¿Qué método convierte un string a mayúsculas?",
            opciones: [
              "toUpperCase()",
              "upperCase()",
              "mayusculas()",
              "toCaps()",
            ],
            correcta: 0,
          },
          {
            pregunta:
              "¿Qué propiedad indica la cantidad de caracteres de un string?",
            opciones: ["length", "size", "count", "chars"],
            correcta: 0,
          },
          {
            pregunta: "¿Qué permiten los template strings (con backticks)?",
            opciones: [
              "Solo concatenar números",
              "Insertar variables dentro del texto con ${}",
              "Convertir strings a números",
              "Crear arrays automáticamente",
            ],
            correcta: 1,
          },
        ],

        scope: [
          {
            pregunta: '¿Qué es el "scope" en JavaScript?',
            opciones: [
              "Un tipo de dato",
              "El alcance o ámbito donde una variable es accesible",
              "Un método de array",
              "Una etiqueta HTML",
            ],
            correcta: 1,
          },
          {
            pregunta:
              "¿Una variable declarada con let dentro de un bloque {} es accesible afuera de ese bloque?",
            opciones: [
              "Sí, siempre",
              "No, su alcance es el bloque",
              "Solo si es const",
              "Solo dentro de funciones",
            ],
            correcta: 1,
          },
          {
            pregunta: "¿Qué es una variable global?",
            opciones: [
              "Una variable que solo existe dentro de una función",
              "Una variable accesible desde cualquier parte del código",
              "Una variable que no se puede leer",
              "Un tipo de array",
            ],
            correcta: 1,
          },
        ],

        dom: [
          {
            pregunta: "¿Qué significa DOM?",
            opciones: [
              "Document Object Model",
              "Data Object Method",
              "Document Order Model",
              "Dynamic Object Manager",
            ],
            correcta: 0,
          },
          {
            pregunta:
              "¿Qué método se usa para seleccionar un elemento por su id?",
            opciones: [
              "document.getElementById()",
              "document.selectId()",
              "document.findById()",
              "document.id()",
            ],
            correcta: 0,
          },
          {
            pregunta:
              "¿Qué propiedad se usa para cambiar el texto de un elemento?",
            opciones: ["innerHTML o textContent", "value", "style", "content"],
            correcta: 0,
          },
        ],

        formularios: [
          {
            pregunta: "¿Qué evento se dispara al enviar un formulario?",
            opciones: ["click", "submit", "change", "load"],
            correcta: 1,
          },
          {
            pregunta:
              "¿Qué método evita que el formulario recargue la página al enviarse?",
            opciones: [
              "preventDefault()",
              "stopSubmit()",
              "cancel()",
              "avoidReload()",
            ],
            correcta: 0,
          },
          {
            pregunta: "¿Cómo se obtiene el valor escrito en un input?",
            opciones: [
              "input.text",
              "input.value",
              "input.data",
              "input.content",
            ],
            correcta: 1,
          },
        ],

        localstorage: [
          {
            pregunta: "¿Para qué sirve localStorage?",
            opciones: [
              "Para guardar información en el navegador de forma persistente",
              "Para hacer peticiones al servidor",
              "Para crear animaciones",
              "Para validar formularios",
            ],
            correcta: 0,
          },
          {
            pregunta:
              "¿Qué método se usa para guardar un dato en localStorage?",
            opciones: [
              "localStorage.save()",
              "localStorage.setItem()",
              "localStorage.add()",
              "localStorage.write()",
            ],
            correcta: 1,
          },
          {
            pregunta:
              "¿En qué formato conviene guardar un objeto en localStorage?",
            opciones: [
              "Como objeto directamente",
              "Como texto usando JSON.stringify()",
              "Como array",
              "No se pueden guardar objetos",
            ],
            correcta: 1,
          },
        ],

        "json-fetch": [
          {
            pregunta: "¿Qué significa JSON?",
            opciones: [
              "JavaScript Object Notation",
              "Java Standard Object Network",
              "JavaScript Online Node",
              "Java Serialized Object Name",
            ],
            correcta: 0,
          },
          {
            pregunta:
              "¿Qué función se usa para hacer peticiones a un servidor?",
            opciones: ["request()", "fetch()", "get()", "load()"],
            correcta: 1,
          },
          {
            pregunta:
              "¿Qué método convierte un objeto JavaScript en texto JSON?",
            opciones: [
              "JSON.parse()",
              "JSON.stringify()",
              "JSON.toText()",
              "JSON.convert()",
            ],
            correcta: 1,
          },
        ],

        errores: [
          {
            pregunta: "¿Qué bloque se usa para capturar errores en JavaScript?",
            opciones: ["if/else", "try/catch", "switch/case", "for/while"],
            correcta: 1,
          },
          {
            pregunta: "¿Qué bloque se ejecuta siempre, haya o no un error?",
            opciones: ["catch", "finally", "try", "throw"],
            correcta: 1,
          },
          {
            pregunta:
              "¿Qué palabra clave permite lanzar un error personalizado?",
            opciones: ["error()", "throw", "catch()", "fail()"],
            correcta: 1,
          },
        ],

        proyecto: [
          {
            pregunta:
              "¿Cuál de estos NO es parte de las tecnologías vistas en el curso?",
            opciones: ["HTML", "CSS", "JavaScript", "Base de datos SQL"],
            correcta: 3,
          },
          {
            pregunta: "¿Qué archivo define la estructura del proyecto?",
            opciones: ["style.css", "index.html", "script.js", "README.md"],
            correcta: 1,
          },
          {
            pregunta:
              "¿Qué tres tecnologías se combinaron a lo largo del curso?",
            opciones: [
              "HTML, CSS y JavaScript",
              "Python, HTML y SQL",
              "Java, CSS y PHP",
              "JavaScript, PHP y XML",
            ],
            correcta: 0,
          },
        ],

        eventos: [
          {
            pregunta:
              "¿Qué método se usa para escuchar un evento en JavaScript?",
            opciones: [
              "addEventListener()",
              "listenEvent()",
              "onEvent()",
              "catchEvent()",
            ],
            correcta: 0,
          },
          {
            pregunta: "¿Qué evento se dispara al hacer clic en un elemento?",
            opciones: ["hover", "click", "press", "touch"],
            correcta: 1,
          },
          {
            pregunta:
              "¿Qué objeto contiene información sobre el evento ocurrido, como el elemento que lo generó?",
            opciones: ["event", "window", "document", "target"],
            correcta: 0,
          },
        ],
      };

      const OBJETIVOS_CLASE = {
        introduccion: [
          "Comprender qué función cumple JavaScript en una página web.",
          "Distinguir HTML, CSS y JavaScript.",
          "Vincular correctamente un archivo JavaScript externo.",
        ],
        variables: [
          "Declarar datos con const y let.",
          "Distinguir reasignación de modificación de objetos.",
          "Elegir nombres de variables claros.",
        ],
        tipos: [
          "Reconocer los tipos de datos principales.",
          "Consultar un tipo con typeof.",
          "Diferenciar null, undefined y NaN.",
        ],
        operadores: [
          "Realizar cálculos y comparaciones.",
          "Usar igualdad estricta.",
          "Combinar condiciones con operadores lógicos.",
        ],
        condicionales: [
          "Tomar decisiones con if, else if y else.",
          "Usar switch cuando se comparan casos concretos.",
          "Construir condiciones legibles.",
        ],
        funciones: [
          "Crear funciones reutilizables.",
          "Distinguir parámetros, argumentos y retorno.",
          "Dividir un problema en tareas pequeñas.",
        ],
        arrays: [
          "Crear, modificar y recorrer listas.",
          "Elegir métodos de búsqueda y transformación.",
          "Trabajar con arrays de objetos.",
        ],
        bucles: [
          "Elegir entre for, while y for...of.",
          "Usar contadores y acumuladores.",
          "Evitar bucles infinitos.",
        ],
        objetos: [
          "Modelar entidades mediante propiedades.",
          "Leer, actualizar y eliminar propiedades.",
          "Crear métodos y recorrer un objeto.",
        ],
        "arrays-avanzados": [
          "Transformar datos sin modificar el array original.",
          "Buscar, filtrar, comprobar y acumular valores.",
          "Ordenar números y objetos correctamente.",
        ],
        strings: [
          "Limpiar, buscar y transformar texto.",
          "Separar y unir cadenas.",
          "Usar plantillas literales para construir mensajes.",
        ],
        scope: [
          "Distinguir scope global, de función y de bloque.",
          "Reducir variables globales.",
          "Aplicar nombres claros y funciones pequeñas.",
        ],
        dom: [
          "Seleccionar elementos de forma segura.",
          "Modificar texto, atributos y clases.",
          "Crear y eliminar elementos.",
        ],
        eventos: [
          "Escuchar acciones con addEventListener.",
          "Usar el objeto event y event.target.",
          "Reconocer eventos frecuentes.",
        ],
        formularios: [
          "Leer datos enviados por el usuario.",
          "Evitar el envío automático cuando sea necesario.",
          "Validar y mostrar errores comprensibles.",
        ],
        localstorage: [
          "Guardar y recuperar datos persistentes.",
          "Convertir objetos con JSON.",
          "Manejar datos ausentes o dañados.",
        ],
        "json-fetch": [
          "Convertir entre objetos y texto JSON.",
          "Realizar solicitudes asíncronas.",
          "Comprobar respuestas y manejar errores.",
        ],
        errores: [
          "Distinguir errores de sintaxis, ejecución y lógica.",
          "Usar try, catch, finally y throw.",
          "Depurar con consola y puntos de interrupción.",
        ],
        proyecto: [
          "Planificar una aplicación por etapas.",
          "Integrar datos, funciones, DOM y persistencia.",
          "Probar el proyecto con criterios verificables.",
        ],
      };

      document.addEventListener("DOMContentLoaded", function () {
        const CLAVE_PROGRESO = "js-curso-progreso";
        const CLAVE_ULTIMA_ACTIVIDAD = "js-curso-ultima-actividad";
        const CLAVE_TEMA = "js-curso-tema";

        /* Tema persistente: respeta la preferencia del estudiante y permite
           alternar sin recargar la página. */
        const botonTema = document.getElementById("botonTema");
        const iconoTema = botonTema
          ? botonTema.querySelector(".icono-tema")
          : null;

        function aplicarTema(tema) {
          const modoClaro = tema === "claro";
          document.documentElement.dataset.theme = modoClaro ? "light" : "dark";
          if (!botonTema) return;
          botonTema.setAttribute("aria-pressed", String(modoClaro));
          botonTema.setAttribute(
            "aria-label",
            modoClaro ? "Activar modo oscuro" : "Activar modo claro",
          );
          botonTema.title = modoClaro
            ? "Cambiar a modo oscuro"
            : "Cambiar a modo claro";
          if (iconoTema) iconoTema.textContent = modoClaro ? "☾" : "☀";
        }

        let temaInicial = "dark";
        try {
          const guardado = localStorage.getItem(CLAVE_TEMA);
          if (guardado === "light" || guardado === "dark") {
            temaInicial = guardado;
          } else if (
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: light)").matches
          ) {
            temaInicial = "light";
          }
        } catch (error) {
          /* El curso sigue funcionando aunque el almacenamiento esté bloqueado. */
        }
        aplicarTema(temaInicial);

        if (botonTema) {
          botonTema.addEventListener("click", function () {
            const nuevoTema =
              document.documentElement.dataset.theme === "light"
                ? "dark"
                : "light";
            aplicarTema(nuevoTema);
            try {
              localStorage.setItem(CLAVE_TEMA, nuevoTema);
            } catch (error) {
              /* No impedir la navegación si localStorage no está disponible. */
            }
          });
        }

        document.querySelectorAll(".clase").forEach(function (seccion, indice) {
          const objetivos = OBJETIVOS_CLASE[seccion.id];
          const titulo = seccion.querySelector(".titulo-clase");
          if (!objetivos || !titulo) return;

          const nivel =
            indice <= 5
              ? "Inicial"
              : indice <= 11
                ? "Intermedio"
                : indice <= 17
                  ? "Aplicación web"
                  : "Proyecto";
          const meta = document.createElement("div");
          meta.className = "clase-meta";
          meta.textContent =
            "Clase " +
            String(indice + 1).padStart(2, "0") +
            " · Nivel " +
            nivel;
          titulo.insertAdjacentElement("beforebegin", meta);

          const bloque = document.createElement("div");
          bloque.className = "objetivos-clase";

          const encabezado = document.createElement("strong");
          encabezado.textContent = "Al finalizar esta clase vas a poder:";
          bloque.appendChild(encabezado);

          const lista = document.createElement("ul");
          objetivos.forEach(function (objetivo) {
            const item = document.createElement("li");
            item.textContent = objetivo;
            lista.appendChild(item);
          });

          bloque.appendChild(lista);
          titulo.insertAdjacentElement("afterend", bloque);
        });

        /* =====================================================
               UTILIDADES DE ALMACENAMIENTO
            ====================================================== */

        function leerCompletadas() {
          try {
            const datos = localStorage.getItem(CLAVE_PROGRESO);
            return datos ? JSON.parse(datos) : [];
          } catch (error) {
            return [];
          }
        }

        function guardarCompletadas(lista) {
          try {
            localStorage.setItem(CLAVE_PROGRESO, JSON.stringify(lista));
          } catch (error) {
            console.warn("No se pudo guardar el progreso:", error);
          }
          sincronizarProgresoNube(lista);
        }

        const CONFIG_FIREBASE_CURSO = {
          apiKey: "AIzaSyA9Xvz6_NoyWIcl2gU2rLYsNzj_6uwB3hA",
          authDomain: "ipem146js.firebaseapp.com",
          projectId: "ipem146js",
          storageBucket: "ipem146js.firebasestorage.app",
          messagingSenderId: "572464024232",
          appId: "1:572464024232:web:a30ef451228ac9109d509d",
        };
        const DOCENTES_AUTORIZADOS = [
          "ipem146centenario@gmail.com",
          "josepantaleo@gmail.com",
        ];
        let cursoFirebase = null;
        let cursoAuth = null;
        let cursoDb = null;
        let cursoFirebaseCargando = null;

        async function cargarFirebaseCurso() {
          if (cursoFirebaseCargando) return cursoFirebaseCargando;
          cursoFirebaseCargando = Promise.all([
            import("https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js"),
            import("https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js"),
            import("https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"),
          ]).then(async ([app, auth, firestore]) => {
            cursoFirebase = app.initializeApp(CONFIG_FIREBASE_CURSO, "curso-js");
            cursoAuth = auth.getAuth(cursoFirebase);
            cursoDb = firestore.getFirestore(cursoFirebase);
            return { auth, firestore };
          });
          return cursoFirebaseCargando;
        }

        async function sincronizarProgresoNube(lista) {
          if (window.location.protocol === "file:") return;
          try {
            const modulos = await cargarFirebaseCurso();
            const usuario = cursoAuth.currentUser;
            if (!usuario || !usuario.email) return;
            const ref = modulos.firestore.doc(cursoDb, "cursoProgreso", usuario.uid);
            await modulos.firestore.setDoc(ref, {
              uid: usuario.uid,
              email: usuario.email.toLowerCase(),
              nombre: usuario.displayName || usuario.email,
              completadas: lista,
              totalClases: totalSecciones,
              porcentaje: totalSecciones
                ? Math.round((lista.length / totalSecciones) * 100)
                : 0,
              ultimaActividad: modulos.firestore.serverTimestamp(),
            }, { merge: true });
          } catch (error) {
            console.warn("No se pudo sincronizar el progreso:", error);
          }
        }

        async function cargarPanelDocente() {
          const cuerpo = document.getElementById("tablaDocenteCuerpo");
          const estado = document.getElementById("estadoPanelDocente");
          if (!cuerpo || !estado) return;
          try {
            const modulos = await cargarFirebaseCurso();
            const usuario = cursoAuth.currentUser;
            const email = usuario && usuario.email
              ? usuario.email.toLowerCase()
              : "";
            if (!email || !DOCENTES_AUTORIZADOS.includes(email)) {
              estado.textContent = "Acceso restringido: cuenta no autorizada.";
              return;
            }
            const consulta = await modulos.firestore.getDocs(
              modulos.firestore.collection(cursoDb, "cursoProgreso"),
            );
            cuerpo.textContent = "";
            if (consulta.empty) {
              cuerpo.innerHTML = '<tr><td colspan="4">No hay avances sincronizados todavía.</td></tr>';
              estado.textContent = "Sin registros para mostrar.";
              return;
            }
            consulta.forEach((docSnap) => {
              const dato = docSnap.data();
              const fila = document.createElement("tr");
              const fecha = dato.ultimaActividad && dato.ultimaActividad.toDate
                ? dato.ultimaActividad.toDate().toLocaleString("es-AR")
                : "Sin actividad";
              fila.innerHTML =
                `<td><strong>${dato.nombre || dato.email || "Estudiante"}</strong><small>${dato.email || ""}</small></td>` +
                `<td><div class="mini-progreso"><span style="width:${Number(dato.porcentaje) || 0}%"></span></div><b>${Number(dato.porcentaje) || 0}%</b></td>` +
                `<td>${Array.isArray(dato.completadas) ? dato.completadas.length : 0} / ${totalSecciones}</td>` +
                `<td>${fecha}</td>`;
              cuerpo.appendChild(fila);
            });
            estado.textContent = `${consulta.size} estudiante(s) sincronizado(s).`;
          } catch (error) {
            estado.textContent = "No se pudo cargar el panel. Revisá Firebase y las reglas.";
            console.error(error);
          }
        }

        const abrirPanelDocente = document.getElementById("abrirPanelDocente");
        const panelDocente = document.getElementById("panelDocente");
        const cerrarPanelDocente = document.getElementById("cerrarPanelDocente");
        const iniciarSesionDocente = document.getElementById("iniciarSesionDocente");
        const actualizarPanelDocente = document.getElementById("actualizarPanelDocente");
        if (abrirPanelDocente && panelDocente) {
          abrirPanelDocente.addEventListener("click", () => {
            panelDocente.hidden = false;
            panelDocente.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
        if (cerrarPanelDocente && panelDocente) {
          cerrarPanelDocente.addEventListener("click", () => { panelDocente.hidden = true; });
        }
        if (iniciarSesionDocente) {
          iniciarSesionDocente.addEventListener("click", async () => {
            const modulos = await cargarFirebaseCurso();
            await modulos.auth.signInWithPopup(new modulos.auth.GoogleAuthProvider());
            actualizarPanelDocente.disabled = false;
            await cargarPanelDocente();
          });
        }
        if (actualizarPanelDocente) {
          actualizarPanelDocente.addEventListener("click", cargarPanelDocente);
        }

        let completadas = new Set(leerCompletadas());

        const ultimaActividad = document.getElementById("ultimaActividad");

        function mostrarUltimaActividad() {
          if (!ultimaActividad) return;

          const valor = localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD);
          if (!valor) {
            ultimaActividad.textContent = "Todavía no hay actividad guardada.";
            return;
          }

          const fecha = new Date(valor);
          ultimaActividad.textContent =
            "Última actividad: " +
            new Intl.DateTimeFormat("es-AR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(fecha);
        }

        function registrarActividad() {
          try {
            localStorage.setItem(
              CLAVE_ULTIMA_ACTIVIDAD,
              new Date().toISOString(),
            );
          } catch (error) {
            console.warn("No se pudo guardar la fecha de actividad:", error);
          }
          mostrarUltimaActividad();
        }

        mostrarUltimaActividad();

        /* =====================================================
               1. BOTÓN COPIAR + BOTÓN EJECUTAR EN CADA BLOQUE
            ====================================================== */

        const bloquesCodigo = document.querySelectorAll(".codigo");

        bloquesCodigo.forEach(function (bloque) {
          const codigoEl = bloque.querySelector("code");
          if (!codigoEl) return;

          let header = bloque.querySelector(".codigo-header");

          if (!header) {
            header = document.createElement("div");
            header.className = "codigo-header";

            const titulo = document.createElement("span");
            titulo.textContent = codigoEl.classList.contains("language-html")
              ? "HTML"
              : "JavaScript";
            header.appendChild(titulo);

            bloque.insertBefore(header, bloque.firstChild);
          }

          if (header.querySelector(".btn-copiar")) return;

          /* --------- grupo de botones --------- */

          const grupoBotones = document.createElement("div");
          grupoBotones.className = "codigo-botones";

          const textoOriginal = codigoEl.textContent.trim();

          /* El ejecutor usa un Web Worker: el código no puede modificar el curso. */
          const requiereNavegador =
            codigoEl.classList.contains("language-html") ||
            /\b(document|window|localStorage|sessionStorage|alert|prompt|confirm)\b/.test(
              textoOriginal,
            ) || /<\/?[a-z][\s\S]*>/i.test(textoOriginal);

          let panelSalida = null;

          if (!requiereNavegador) {
            const botonEjecutar = document.createElement("button");
            botonEjecutar.type = "button";
            botonEjecutar.className = "btn-ejecutar";
            botonEjecutar.textContent = "Ejecutar";

            panelSalida = document.createElement("div");
            panelSalida.className = "salida";
            panelSalida.setAttribute("aria-live", "polite");
            panelSalida.hidden = true;
            bloque.appendChild(panelSalida);

            botonEjecutar.addEventListener("click", function () {
              panelSalida.hidden = false;
              panelSalida.textContent = "Ejecutando...";

              const workerSource = `
                function textoSeguro(valor) {
                  if (typeof valor === "string") return valor;
                  try { return JSON.stringify(valor); }
                  catch (error) { return String(valor); }
                }

                ["log", "warn", "error"].forEach(function (tipo) {
                  console[tipo] = function (...valores) {
                    postMessage({
                      tipo,
                      texto: valores.map(textoSeguro).join(" ")
                    });
                  };
                });

                onmessage = async function (evento) {
                  try {
                    const ejecutar = new Function(
                      "return (async function () {\\n" +
                      evento.data +
                      "\\n})();"
                    );
                    await ejecutar();
                    postMessage({ tipo: "fin" });
                  } catch (error) {
                    postMessage({
                      tipo: "error",
                      texto: error.name + ": " + error.message
                    });
                    postMessage({ tipo: "fin" });
                  }
                };
              `;

              const blob = new Blob([workerSource], {
                type: "text/javascript",
              });
              const urlWorker = URL.createObjectURL(blob);
              const worker = new Worker(urlWorker);
              const lineas = [];

              const finalizar = function () {
                worker.terminate();
                URL.revokeObjectURL(urlWorker);
                panelSalida.textContent = "";

                if (lineas.length === 0) {
                  lineas.push({
                    tipo: "info",
                    texto: "Código ejecutado sin mensajes en consola.",
                  });
                }

                lineas.forEach(function (linea) {
                  const p = document.createElement("div");
                  p.className = "salida-linea salida-" + linea.tipo;
                  p.textContent = linea.texto;
                  panelSalida.appendChild(p);
                });
              };

              const limite = setTimeout(function () {
                lineas.push({
                  tipo: "error",
                  texto: "Ejecución detenida: superó el límite de 3 segundos.",
                });
                finalizar();
              }, 3000);

              worker.onmessage = function (evento) {
                if (evento.data.tipo === "fin") {
                  clearTimeout(limite);
                  finalizar();
                  return;
                }

                lineas.push(evento.data);
              };

              worker.onerror = function (evento) {
                clearTimeout(limite);
                lineas.push({
                  tipo: "error",
                  texto: evento.message || "No se pudo ejecutar el ejemplo.",
                });
                finalizar();
              };

              worker.postMessage(textoOriginal);
            });

            grupoBotones.appendChild(botonEjecutar);
          } else {
            const aviso = document.createElement("span");
            aviso.className = "codigo-requiere-navegador";
            aviso.textContent = "Requiere un archivo HTML";
            aviso.title =
              "Este ejemplo usa elementos del navegador y debe probarse dentro de un proyecto.";
            grupoBotones.appendChild(aviso);
          }

          /* --------- botón copiar --------- */

          const botonCopiar = document.createElement("button");
          botonCopiar.type = "button";
          botonCopiar.className = "btn-copiar";
          botonCopiar.textContent = "📋 Copiar";

          botonCopiar.addEventListener("click", async function () {
            const texto = codigoEl.textContent.trim();

            async function marcarCopiado() {
              botonCopiar.textContent = "✓ Copiado";
              botonCopiar.classList.add("copiado");
              setTimeout(function () {
                botonCopiar.textContent = "📋 Copiar";
                botonCopiar.classList.remove("copiado");
              }, 1800);
            }

            try {
              await navigator.clipboard.writeText(texto);
              await marcarCopiado();
            } catch (error) {
              const textarea = document.createElement("textarea");
              textarea.value = texto;
              textarea.style.position = "fixed";
              textarea.style.opacity = "0";
              document.body.appendChild(textarea);
              textarea.select();

              try {
                document.execCommand("copy");
                await marcarCopiado();
              } catch (errorAlternativo) {
                botonCopiar.textContent = "❌ Error";
              }

              document.body.removeChild(textarea);
            }
          });

          grupoBotones.appendChild(botonCopiar);
          header.appendChild(grupoBotones);
        });

        /* =====================================================
               2. PREGUNTAS MULTIPLE CHOICE POR TEMA
            ====================================================== */

        function crearQuiz(idSeccion, preguntas) {
          const contenedor = document.createElement("div");
          contenedor.className = "quiz";

          const titulo = document.createElement("div");
          titulo.className = "quiz-titulo";
          titulo.textContent = "Poné a prueba lo aprendido";
          contenedor.appendChild(titulo);

          const respuestas = {};

          preguntas.forEach(function (pregunta, indicePregunta) {
            const bloque = document.createElement("div");
            bloque.className = "quiz-pregunta";

            const enunciado = document.createElement("p");
            enunciado.className = "quiz-enunciado";
            enunciado.textContent =
              indicePregunta + 1 + ". " + pregunta.pregunta;
            bloque.appendChild(enunciado);

            const opcionesCont = document.createElement("div");
            opcionesCont.className = "quiz-opciones";

            pregunta.opciones.forEach(function (textoOpcion, indiceOpcion) {
              const label = document.createElement("label");
              label.className = "quiz-opcion";

              const input = document.createElement("input");
              input.type = "radio";
              input.name = idSeccion + "-pregunta-" + indicePregunta;
              input.value = indiceOpcion;

              input.addEventListener("change", function () {
                respuestas[indicePregunta] = indiceOpcion;
              });

              const span = document.createElement("span");
              span.textContent = textoOpcion;

              label.appendChild(input);
              label.appendChild(span);
              opcionesCont.appendChild(label);
            });

            bloque.appendChild(opcionesCont);

            const explicacion = document.createElement("p");
            explicacion.className = "quiz-explicacion";
            explicacion.hidden = true;
            bloque.appendChild(explicacion);

            contenedor.appendChild(bloque);
          });

          const acciones = document.createElement("div");
          acciones.className = "quiz-acciones";

          const botonCorregir = document.createElement("button");
          botonCorregir.type = "button";
          botonCorregir.className = "btn-corregir";
          botonCorregir.textContent = "Corregir respuestas";

          const puntaje = document.createElement("span");
          puntaje.className = "quiz-puntaje";
          puntaje.setAttribute("aria-live", "polite");

          botonCorregir.addEventListener("click", function () {
            let correctas = 0;

            const bloques = contenedor.querySelectorAll(".quiz-pregunta");

            bloques.forEach(function (bloque, indicePregunta) {
              const opciones = bloque.querySelectorAll(".quiz-opcion");
              const correcta = preguntas[indicePregunta].correcta;
              const elegida = respuestas[indicePregunta];
              const explicacion = bloque.querySelector(".quiz-explicacion");

              opciones.forEach(function (opcionEl, indiceOpcion) {
                opcionEl.classList.remove("correcta", "incorrecta");

                if (indiceOpcion === correcta) {
                  opcionEl.classList.add("correcta");
                } else if (indiceOpcion === elegida && elegida !== correcta) {
                  opcionEl.classList.add("incorrecta");
                }
              });

              if (elegida === correcta) correctas++;

              explicacion.hidden = false;
              explicacion.textContent =
                elegida === correcta
                  ? "Correcto. " +
                    preguntas[indicePregunta].opciones[correcta] +
                    "."
                  : "La respuesta correcta es: " +
                    preguntas[indicePregunta].opciones[correcta] +
                    ".";
            });

            puntaje.textContent =
              "Puntaje: " + correctas + " / " + preguntas.length;

            puntaje.classList.remove("bien", "regular", "mal");

            const proporcion = correctas / preguntas.length;

            if (proporcion === 1) {
              puntaje.classList.add("bien");
            } else if (proporcion >= 0.5) {
              puntaje.classList.add("regular");
            } else {
              puntaje.classList.add("mal");
            }

            if (
              Object.keys(respuestas).length === preguntas.length &&
              proporcion >= 0.66
            ) {
              const seccion = document.getElementById(idSeccion);
              const checkbox = seccion
                ? seccion.querySelector('.check-completado input[type="checkbox"]')
                : null;

              if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event("change"));
              }
            }
          });

          acciones.appendChild(botonCorregir);
          acciones.appendChild(puntaje);
          contenedor.appendChild(acciones);

          return contenedor;
        }

        document.querySelectorAll(".clase").forEach(function (seccion) {
          const preguntas = QUIZ_DATA[seccion.id];

          if (!preguntas || preguntas.length === 0) return;

          seccion.appendChild(crearQuiz(seccion.id, preguntas));
        });

        /* =====================================================
               3. MARCAR CLASE COMO COMPLETADA + PROGRESO GENERAL
            ====================================================== */

        const secciones = document.querySelectorAll(".clase");
        const totalSecciones = secciones.length;

        const barraProgreso = document.getElementById("barraProgreso");
        const progresoTexto = document.getElementById("progresoTexto");
        const barraCurso = document.getElementById("barraCurso");

        function actualizarProgreso() {
          const porcentaje =
            totalSecciones > 0
              ? Math.round((completadas.size / totalSecciones) * 100)
              : 0;

          if (barraProgreso) barraProgreso.style.width = porcentaje + "%";
          if (progresoTexto) {
            progresoTexto.textContent = porcentaje + "%";
            progresoTexto.title =
              completadas.size + " de " + totalSecciones + " clases completadas";
          }
          if (barraCurso) {
            barraCurso.setAttribute("aria-valuenow", String(porcentaje));
            barraCurso.setAttribute(
              "aria-valuetext",
              completadas.size +
                " de " +
                totalSecciones +
                " clases completadas",
            );
          }

          secciones.forEach(function (seccion) {
            const enlace = document.querySelector(
              '.sidebar a[href="#' + seccion.id + '"]',
            );
            if (!enlace) return;

            let marca = enlace.querySelector(".marca-completada");

            if (completadas.has(seccion.id)) {
              if (!marca) {
                marca = document.createElement("span");
                marca.className = "marca-completada";
                marca.textContent = "✓";
                enlace.appendChild(marca);
              }
            } else if (marca) {
              marca.remove();
            }
          });
        }

        secciones.forEach(function (seccion) {
          const barraCompletado = document.createElement("div");
          barraCompletado.className = "barra-completado";

          const label = document.createElement("label");
          label.className = "check-completado";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = completadas.has(seccion.id);

          const textoLabel = document.createElement("span");
          textoLabel.textContent = "Marcar esta clase como completada";

          label.appendChild(checkbox);
          label.appendChild(textoLabel);
          barraCompletado.appendChild(label);

          seccion.appendChild(barraCompletado);

          checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
              completadas.add(seccion.id);
            } else {
              completadas.delete(seccion.id);
            }
            guardarCompletadas(Array.from(completadas));
            registrarActividad();
            actualizarProgreso();
          });
        });

        actualizarProgreso();

        /* =====================================================
               4. MENÚ MÓVIL, BÚSQUEDA Y NAVEGACIÓN
            ====================================================== */

        const sidebar = document.getElementById("sidebar");
        const botonMenu = document.getElementById("botonMenu");
        const cerrarMenu = document.getElementById("cerrarMenu");
        const overlayMenu = document.getElementById("overlayMenu");

        function cambiarMenu(abierto) {
          if (!sidebar || !botonMenu || !overlayMenu) return;

          sidebar.classList.toggle("abierta", abierto);
          document.body.classList.toggle("menu-abierto", abierto);
          botonMenu.setAttribute("aria-expanded", String(abierto));
          botonMenu.setAttribute(
            "aria-label",
            abierto ? "Cerrar menú de clases" : "Abrir menú de clases",
          );
          overlayMenu.hidden = !abierto;

          if (abierto && cerrarMenu) cerrarMenu.focus();
        }

        if (botonMenu) {
          botonMenu.addEventListener("click", function () {
            cambiarMenu(!sidebar.classList.contains("abierta"));
          });
        }

        if (cerrarMenu) {
          cerrarMenu.addEventListener("click", function () {
            cambiarMenu(false);
            botonMenu.focus();
          });
        }

        if (overlayMenu) {
          overlayMenu.addEventListener("click", function () {
            cambiarMenu(false);
          });
        }

        document.addEventListener("keydown", function (evento) {
          if (evento.key === "Escape" && sidebar.classList.contains("abierta")) {
            cambiarMenu(false);
            botonMenu.focus();
          }
        });

        const enlacesSidebar = document.querySelectorAll(".sidebar a");

        enlacesSidebar.forEach(function (enlace) {
          enlace.addEventListener("click", function () {
            if (window.innerWidth <= 800) cambiarMenu(false);
          });
        });

        const busquedaCurso = document.getElementById("busquedaCurso");
        const resultadosBusqueda =
          document.getElementById("resultadosBusqueda");

        function normalizar(texto) {
          return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
        }

        const limpiarBusqueda = document.getElementById("limpiarBusqueda");

        function actualizarBusqueda() {
          if (limpiarBusqueda) {
            limpiarBusqueda.hidden = !busquedaCurso.value.trim();
          }
        }

        if (limpiarBusqueda && busquedaCurso) {
          limpiarBusqueda.addEventListener("click", function () {
            busquedaCurso.value = "";
            resultadosBusqueda.textContent = "";
            resultadosBusqueda.hidden = true;
            actualizarBusqueda();
            busquedaCurso.focus();
          });
        }

        if (busquedaCurso && resultadosBusqueda) {
          busquedaCurso.addEventListener("input", function () {
            actualizarBusqueda();
            const consulta = normalizar(busquedaCurso.value.trim());
            resultadosBusqueda.textContent = "";

            if (consulta.length < 2) {
              resultadosBusqueda.hidden = true;
              return;
            }

            const coincidencias = Array.from(secciones)
              .filter(function (seccion) {
                return normalizar(seccion.textContent).includes(consulta);
              })
              .slice(0, 8);

            if (coincidencias.length === 0) {
              resultadosBusqueda.textContent =
                "No se encontraron temas con ese texto.";
              resultadosBusqueda.hidden = false;
              return;
            }

            const resumen = document.createElement("p");
            resumen.textContent =
              coincidencias.length +
              (coincidencias.length === 1
                ? " clase encontrada"
                : " clases encontradas");
            resultadosBusqueda.appendChild(resumen);

            coincidencias.forEach(function (seccion) {
              const enlace = document.createElement("a");
              enlace.className = "resultado-enlace";
              enlace.href = "#" + seccion.id;
              enlace.textContent =
                seccion.querySelector(".titulo-clase").textContent;
              enlace.addEventListener("click", function () {
                resultadosBusqueda.hidden = true;
                busquedaCurso.value = "";
              });
              resultadosBusqueda.appendChild(enlace);
            });

            resultadosBusqueda.hidden = false;
          });
          actualizarBusqueda();
        }

        const reiniciarProgreso =
          document.getElementById("reiniciarProgreso");

        if (reiniciarProgreso) {
          reiniciarProgreso.addEventListener("click", function () {
            const confirmado = window.confirm(
              "¿Querés borrar el progreso guardado de las 19 clases?",
            );
            if (!confirmado) return;

            completadas.clear();
            guardarCompletadas([]);
            localStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD);

            document
              .querySelectorAll('.check-completado input[type="checkbox"]')
              .forEach(function (checkbox) {
                checkbox.checked = false;
              });

            actualizarProgreso();
            mostrarUltimaActividad();
          });
        }

        const claseAnterior = document.getElementById("claseAnterior");
        const claseSiguiente = document.getElementById("claseSiguiente");
        const nombreClaseAnterior =
          document.getElementById("nombreClaseAnterior");
        const nombreClaseSiguiente =
          document.getElementById("nombreClaseSiguiente");
        const estadoCurso = document.getElementById("estadoCurso");
        let indiceClaseActiva = 0;

        function nombreDeClase(indice) {
          const seccion = secciones[indice];
          const titulo = seccion
            ? seccion.querySelector(".titulo-clase")
            : null;
          return titulo ? titulo.textContent : "";
        }

        function actualizarNavegacion(indice) {
          indiceClaseActiva = indice;

          claseAnterior.disabled = indice <= 0;
          claseSiguiente.disabled = indice >= totalSecciones - 1;
          nombreClaseAnterior.textContent =
            indice > 0 ? nombreDeClase(indice - 1) : "Primera clase";
          nombreClaseSiguiente.textContent =
            indice < totalSecciones - 1
              ? nombreDeClase(indice + 1)
              : "Curso finalizado";
          if (estadoCurso) {
            estadoCurso.textContent =
              "Clase actual: " +
              (indice + 1) +
              " de " +
              totalSecciones +
              " · " +
              nombreDeClase(indice);
          }
        }

        function irAClase(indice) {
          const seccion = secciones[indice];
          if (!seccion) return;
          seccion.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", "#" + seccion.id);
        }

        claseAnterior.addEventListener("click", function () {
          irAClase(indiceClaseActiva - 1);
        });

        claseSiguiente.addEventListener("click", function () {
          irAClase(indiceClaseActiva + 1);
        });

        const indiceInicial = Array.from(secciones).findIndex(function (seccion) {
          return "#" + seccion.id === window.location.hash;
        });
        actualizarNavegacion(indiceInicial >= 0 ? indiceInicial : 0);

        /* =====================================================
               5. NAVEGACIÓN LATERAL ACTIVA SEGÚN SCROLL
            ====================================================== */

        const observador = new IntersectionObserver(
          function (entradas) {
            entradas.forEach(function (entrada) {
              if (!entrada.isIntersecting) return;

              enlacesSidebar.forEach(function (enlace) {
                enlace.classList.remove("activo");
              });

              const enlaceActivo = document.querySelector(
                '.sidebar a[href="#' + entrada.target.id + '"]',
              );

              if (enlaceActivo) enlaceActivo.classList.add("activo");

              const indice = Array.from(secciones).indexOf(entrada.target);
              if (indice >= 0) actualizarNavegacion(indice);
            });
          },
          { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
        );

        secciones.forEach(function (seccion) {
          observador.observe(seccion);
        });

      });
