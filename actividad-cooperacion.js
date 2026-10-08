(() => {
        let enlaceJitsiActual = '';
        let invitacionJitsiActual = null;
        let jitsiApiActual = null;
        let jitsiVentanaExterna = null;
        let jitsiOpcionesPendientes = null;
        let jitsiConfirmacionAnfitrionEnCurso = false;
        let jitsiTemporizadorIntervalo = null;
        let jitsiTemporizadorVencido = false;
        let jitsiVencimientoActual = 0;
        let jitsiAlVencerActual = null;
        let jitsiAlExtenderActual = null;
        let jitsiAvisoUltimoMinutoEmitido = false;
        let jitsiRecordatorioTimeout = null;
        let jitsiVentanaMonitorIntervalo = null;
        let jitsiFinalizadaTimeout = null;
        let jitsiInvitacionAbiertaId = '';
        let jitsiFinAlumnoAvisadoId = '';
        let historialJitsiCache = [];
        let historialJitsiActualizacionPendiente = false;
        let ultimaSincronizacionHistorialJitsi = 0;
        const DURACION_JITSI_CLAVE = 'teacher_jitsi_duration_minutes';
        const DURACION_JITSI_PREDETERMINADA = 5;
        const DURACION_JITSI_GRUPAL_CLAVE = 'teacher_jitsi_group_duration_minutes';
        const DURACION_JITSI_GRUPAL_PREDETERMINADA = 60;

        function obtenerDuracionJitsi() {
          try {
            const valor = Number(localStorage.getItem(DURACION_JITSI_CLAVE));
            return Number.isInteger(valor) && valor >= 1 && valor <= 120 ? valor : DURACION_JITSI_PREDETERMINADA;
          } catch (error) {
            return DURACION_JITSI_PREDETERMINADA;
          }
        }

        function obtenerDuracionJitsiGrupal() {
          try {
            const valor = Number(localStorage.getItem(DURACION_JITSI_GRUPAL_CLAVE));
            return Number.isInteger(valor) && valor >= 1 && valor <= 120 ? valor : DURACION_JITSI_GRUPAL_PREDETERMINADA;
          } catch (error) {
            return DURACION_JITSI_GRUPAL_PREDETERMINADA;
          }
        }
        let tipoDuracionJitsiConfigurada = 'individual';

        function mostrarDuracionJitsi() {
          const valorIndividual = obtenerDuracionJitsi();
          const valorGrupal = obtenerDuracionJitsiGrupal();
          const etiquetaIndividual = document.getElementById('duracionJitsiProfesorValor');
          const etiquetaGrupal = document.getElementById('duracionJitsiGrupalProfesorValor');
          if (etiquetaIndividual) etiquetaIndividual.textContent = String(valorIndividual);
          if (etiquetaGrupal) etiquetaGrupal.textContent = String(valorGrupal);
          return valorIndividual;
        }

        function cerrarConfiguracionDuracionJitsi() {
          const modal = document.getElementById('configuracionDuracionJitsiModal');
          if (!modal) return;
          modal.classList.remove('active');
          modal.style.display = 'none';
        }

        window.abrirConfiguracionDuracionJitsi = function(tipo = 'individual') {
          const modal = document.getElementById('configuracionDuracionJitsiModal');
          const entrada = document.getElementById('duracionJitsiMinutos');
          const titulo = document.getElementById('configuracionDuracionJitsiTitulo');
          const descripcion = document.getElementById('configuracionDuracionJitsiDescripcion');
          const error = document.getElementById('duracionJitsiError');
          if (!modal || !entrada) return;
          tipoDuracionJitsiConfigurada = tipo === 'grupal' ? 'grupal' : 'individual';
          const esGrupal = tipoDuracionJitsiConfigurada === 'grupal';
          entrada.value = String(esGrupal ? obtenerDuracionJitsiGrupal() : obtenerDuracionJitsi());
          if (titulo) titulo.textContent = esGrupal ? 'Duración Jitsi grupal' : 'Duración Jitsi individual';
          if (descripcion) descripcion.textContent = esGrupal
            ? 'Este límite se aplicará a las próximas llamadas grupales.'
            : 'Este límite se aplicará a las próximas llamadas individuales.';
          if (error) error.textContent = '';
          modal.style.display = 'flex';
          modal.classList.add('active');
          entrada.focus({ preventScroll: true });
          entrada.select();
        };

        async function guardarConfiguracionDuracionJitsi() {
          const entrada = document.getElementById('duracionJitsiMinutos');
          const error = document.getElementById('duracionJitsiError');
          const minutos = Number(entrada?.value);
          if (!Number.isInteger(minutos) || minutos < 1 || minutos > 120) {
            if (error) error.textContent = 'Ingresá una duración completa entre 1 y 120 minutos.';
            entrada?.focus();
            return;
          }
          const claveDuracion = tipoDuracionJitsiConfigurada === 'grupal' ? DURACION_JITSI_GRUPAL_CLAVE : DURACION_JITSI_CLAVE;
          try { localStorage.setItem(claveDuracion, String(minutos)); } catch (errorGuardado) {}
          mostrarDuracionJitsi();
          const guardadoRemoto = await window.guardarConfiguracionJitsiFirebase?.({
            individual: obtenerDuracionJitsi(),
            grupal: obtenerDuracionJitsiGrupal()
          });
          cerrarConfiguracionDuracionJitsi();
          if (guardadoRemoto === false) {
            alert('La duración se guardó en este dispositivo, pero no se pudo sincronizar con Firebase.');
          }
        }

        function aplicarConfiguracionJitsiRemota(configuracion = {}) {
          const individual = Number(configuracion.individual);
          const grupal = Number(configuracion.grupal);
          try {
            if (Number.isInteger(individual) && individual >= 1 && individual <= 120) {
              localStorage.setItem(DURACION_JITSI_CLAVE, String(individual));
            }
            if (Number.isInteger(grupal) && grupal >= 1 && grupal <= 120) {
              localStorage.setItem(DURACION_JITSI_GRUPAL_CLAVE, String(grupal));
            }
          } catch (error) {}
          mostrarDuracionJitsi();
        }

        async function iniciarSincronizacionConfiguracionJitsi() {
          const configuracion = await window.cargarConfiguracionJitsiFirebase?.();
          if (configuracion) aplicarConfiguracionJitsiRemota(configuracion);
          window.escucharConfiguracionJitsiFirebase?.();
        }

        function fechaJitsiValida(valor) {
          const tiempo = new Date(String(valor || '')).getTime();
          return Number.isFinite(tiempo) ? tiempo : 0;
        }

        function formatearTiempoJitsi(milisegundos) {
          const segundos = Math.max(0, Math.ceil(milisegundos / 1000));
          const minutos = Math.floor(segundos / 60);
          return `${String(minutos).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
        }

        function detenerCuentaRegresivaJitsi() {
          if (jitsiTemporizadorIntervalo) clearInterval(jitsiTemporizadorIntervalo);
          jitsiTemporizadorIntervalo = null;
        }

        function detenerRecordatorioJitsi() {
          if (jitsiRecordatorioTimeout) clearTimeout(jitsiRecordatorioTimeout);
          jitsiRecordatorioTimeout = null;
        }

        function detenerMonitorVentanaJitsi() {
          if (jitsiVentanaMonitorIntervalo) clearInterval(jitsiVentanaMonitorIntervalo);
          jitsiVentanaMonitorIntervalo = null;
        }

        function ocultarAvisoFinAlumnoJitsi() {
          const alerta = document.getElementById('jitsiFinAlerta');
          if (alerta) alerta.hidden = true;
        }

        function mostrarAvisoFinAlumnoJitsi(invitacion) {
          if (!invitacion?.id || jitsiFinAlumnoAvisadoId === invitacion.id) return;
          jitsiFinAlumnoAvisadoId = invitacion.id;
          const alerta = document.getElementById('jitsiFinAlerta');
          const titulo = document.getElementById('jitsiFinTitulo');
          const mensaje = document.getElementById('jitsiFinMensaje');
          if (titulo) titulo.textContent = 'Quedan 30 segundos';
          if (mensaje) mensaje.textContent = 'La videollamada finalizará automáticamente.';
          if (alerta) alerta.hidden = false;
          reproducirSonidoLlamadaJitsi();
        }

        function mostrarAvisoJitsiFinalizada() {
          const aviso = document.getElementById('jitsiFinalizadaAviso');
          if (!aviso) return;
          if (jitsiFinalizadaTimeout) clearTimeout(jitsiFinalizadaTimeout);
          aviso.hidden = false;
          jitsiFinalizadaTimeout = setTimeout(() => { aviso.hidden = true; }, 4500);
        }

        function claveJitsiAlumno(prefijo) {
          const datos = datosEstudianteActual();
          return `${prefijo}_${window.firebaseCurrentUser?.uid || datos.email || 'estudiante'}`;
        }

        function programarRecordatorioJitsi(invitacion) {
          detenerRecordatorioJitsi();
          if (!invitacion?.id) return;
          const claveRecordatorio = claveJitsiAlumno('jitsi_invitacion_recordada');
          let recordada = '';
          try { recordada = localStorage.getItem(claveRecordatorio) || ''; } catch (error) {}
          if (recordada === invitacion.id) return;
          jitsiRecordatorioTimeout = setTimeout(() => {
            const vigente = obtenerInvitacionJitsi();
            const alerta = document.getElementById('jitsiLlamadaAlerta');
            if (!vigente || vigente.id !== invitacion.id || alerta?.hidden) return;
            try { localStorage.setItem(claveRecordatorio, invitacion.id); } catch (error) {}
            const mensaje = document.getElementById('jitsiLlamadaMensaje');
            if (mensaje) mensaje.textContent = 'Recordatorio: la invitación sigue pendiente. Podés unirte ahora o rechazarla.';
            reproducirSonidoLlamadaJitsi();
          }, 30000);
        }

        function iniciarMonitorVentanaJitsi(invitacion) {
          detenerMonitorVentanaJitsi();
          if (!invitacion?.id) return;
          jitsiInvitacionAbiertaId = invitacion.id;
          jitsiVentanaMonitorIntervalo = setInterval(async () => {
            if (!jitsiVentanaExterna || !jitsiVentanaExterna.closed) return;
            detenerMonitorVentanaJitsi();
            try { localStorage.setItem(claveJitsiAlumno('jitsi_invitacion_salida'), invitacion.id); } catch (error) {}
            await window.registrarEstadoJitsiEstudianteFirebase?.(invitacion.tipo, invitacion.id, 'salio');
            jitsiInvitacionAbiertaId = '';
          }, 1200);
        }

        function ocultarAlertaUltimoMinutoJitsi() {
          const alerta = document.getElementById('jitsiAlertaUltimoMinuto');
          if (alerta) alerta.hidden = true;
        }

        function mostrarAlertaUltimoMinutoJitsi() {
          if (jitsiAvisoUltimoMinutoEmitido) return;
          jitsiAvisoUltimoMinutoEmitido = true;
          const alerta = document.getElementById('jitsiAlertaUltimoMinuto');
          if (alerta) alerta.hidden = false;
          reproducirSonidoLlamadaJitsi();
        }

        function iniciarCuentaRegresivaJitsi(expiraEn, alVencer, alExtender = null) {
          detenerCuentaRegresivaJitsi();
          jitsiTemporizadorVencido = false;
          jitsiAvisoUltimoMinutoEmitido = false;
          jitsiVencimientoActual = fechaJitsiValida(expiraEn);
          jitsiAlVencerActual = typeof alVencer === 'function' ? alVencer : null;
          jitsiAlExtenderActual = typeof alExtender === 'function' ? alExtender : null;
          ocultarAlertaUltimoMinutoJitsi();
          const indicador = document.getElementById('jitsiTiempoRestante');
          const valor = indicador?.querySelector('strong');
          const botonExtender = document.getElementById('sumarTiempoJitsi');
          if (botonExtender) botonExtender.hidden = !jitsiAlExtenderActual;
          if (!jitsiVencimientoActual) {
            if (valor) valor.textContent = '--:--';
            indicador?.classList.remove('is-warning', 'is-expired');
            return;
          }
          const actualizar = async () => {
            const restante = jitsiVencimientoActual - Date.now();
            if (valor) valor.textContent = formatearTiempoJitsi(restante);
            indicador?.classList.toggle('is-warning', restante > 0 && restante <= 30000);
            if (restante > 0 && restante <= 30000) mostrarAlertaUltimoMinutoJitsi();
            if (restante > 0 || jitsiTemporizadorVencido) return;
            jitsiTemporizadorVencido = true;
            detenerCuentaRegresivaJitsi();
            indicador?.classList.add('is-expired');
            const estado = document.getElementById('jitsiEstado');
            if (estado) estado.textContent = 'Tiempo finalizado. Cerrando la videollamada...';
            try { await jitsiAlVencerActual?.(); } catch (error) { console.error('No se pudo finalizar Jitsi automáticamente.', error); }
            cerrarJitsi();
          };
          actualizar();
          jitsiTemporizadorIntervalo = setInterval(actualizar, 1000);
        }

        async function sumarCincoMinutosJitsi() {
          const boton = document.getElementById('sumarTiempoJitsi');
          if (!jitsiVencimientoActual || !jitsiAlExtenderActual || !boton) return;
          const vencimientoAnterior = jitsiVencimientoActual;
          const nuevoVencimiento = Math.max(Date.now(), vencimientoAnterior) + 5 * 60000;
          const nuevoExpiraEn = new Date(nuevoVencimiento).toISOString();
          const contenidoOriginal = boton.innerHTML;
          boton.disabled = true;
          boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Guardando</span>';
          try {
            const actualizado = await jitsiAlExtenderActual(nuevoExpiraEn);
            if (actualizado === false) throw new Error('Firebase rechazó la extensión.');
            const finalizar = jitsiAlVencerActual;
            const extender = jitsiAlExtenderActual;
            iniciarCuentaRegresivaJitsi(nuevoExpiraEn, finalizar, extender);
            const estado = document.getElementById('jitsiEstado');
            if (estado) estado.textContent = 'Se agregaron 5 minutos a la videollamada.';
          } catch (error) {
            console.error('No se pudo extender la llamada Jitsi:', error);
            alert('No se pudieron agregar los 5 minutos. Verificá la conexión con Firebase.');
          } finally {
            boton.disabled = false;
            boton.innerHTML = contenidoOriginal;
          }
        }
        async function alternarPantallaCompletaJitsi() {
          const caja = document.querySelector('#jitsiModal .jitsi-box');
          if (!caja) return;
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await caja.requestFullscreen();
          } catch (error) {
            alert('El navegador no permitió activar la pantalla completa.');
          }
        }
        function datosEstudianteActual() {
          const usuario = window.firebaseCurrentUser;
          const datosGuardados = window.ultimoDocumentoEstudianteFirebase?.estudiante || {};
          return {
            email: String(usuario?.email || '').trim().toLowerCase(),
            nombre: String(
              datosGuardados.nombre ||
              document.getElementById('studentName')?.value ||
              usuario?.displayName ||
              'Estudiante'
            ).trim()
          };
        }

        function crearDatosSalaJitsi(email) {
          const correo = String(email || '').trim().toLowerCase();
          if (!correo.includes('@')) return null;
          const slug = btoa(unescape(encodeURIComponent(correo)))
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 30);
          const sala = 'ipem146-clase-' + slug;
          return { correo, sala, enlace: 'https://meet.jit.si/' + sala };
        }

        function crearSlugJitsiGrupo(texto) {
          return btoa(unescape(encodeURIComponent(String(texto || 'curso').toLowerCase())))
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 34) || 'curso';
        }

        function obtenerInvitacionJitsi(documento = window.ultimoDocumentoEstudianteFirebase || {}) {
          const grupal = documento.jitsiGrupal || {};
          if (grupal.disponible === true && (!grupal.expiraEn || fechaJitsiValida(grupal.expiraEn) > Date.now()) && /^https:\/\/meet\.jit\.si\//.test(String(grupal.enlace || ''))) {
            return {
              tipo: 'grupal',
              id: String(grupal.id || grupal.sala || 'grupal'),
              enlace: String(grupal.enlace),
              titulo: 'Videollamada grupal del curso',
              mensaje: [grupal.curso, grupal.division, grupal.turno].filter(Boolean).join(' · '),
              docente: String(grupal.actualizadoPor || ''),
              expiraEn: String(grupal.expiraEn || '')
            };
          }
          const individualDisponible = documento.jitsiDisponible === true || documento.jitsiSala?.disponible === true;
          if (individualDisponible && (!documento.jitsiSala?.expiraEn || fechaJitsiValida(documento.jitsiSala.expiraEn) > Date.now())) {
            const datos = crearDatosSalaJitsi(window.firebaseCurrentUser?.email || '');
            if (datos) {
              return {
                tipo: 'individual',
                id: String(documento.jitsiSala?.id || 'individual-' + datos.correo),
                enlace: datos.enlace,
                titulo: 'El docente inició una videollamada',
                mensaje: 'Sala individual con el docente',
                docente: String(documento.jitsiSala?.actualizadoPor || ''),
                expiraEn: String(documento.jitsiSala?.expiraEn || '')
              };
            }
          }
          return null;
        }

        function estadoParticipacionJitsi(estudiante, llamadaId) {
          const participacion = estudiante?.jitsiParticipacion || {};
          if (String(participacion.llamadaId || '') !== String(llamadaId || '')) return 'invitado';
          const estado = String(participacion.estado || 'invitado');
          return ['invitado', 'notificado', 'unido', 'rechazado', 'salio', 'finalizada'].includes(estado) ? estado : 'invitado';
        }
        window.estadoParticipacionJitsi = estadoParticipacionJitsi;

        function participantesHistorialJitsi(estudiantes, llamadaId) {
          return (Array.isArray(estudiantes) ? estudiantes : []).map(item => ({
            uid: item.uid || '',
            email: item.email || '',
            nombre: item.estudiante?.nombre || item.nombreGoogle || item.email || 'Estudiante',
            estado: estadoParticipacionJitsi(item, llamadaId)
          }));
        }

        function metricasParticipantesJitsi(participantes) {
          const lista = Array.isArray(participantes) ? participantes : [];
          const contar = estado => lista.filter(item => item.estado === estado).length;
          return {
            invitados: lista.length,
            notificados: contar('notificado'),
            unidos: contar('unido'),
            rechazados: contar('rechazado'),
            salieron: contar('salio'),
            finalizados: contar('finalizada')
          };
        }

        function llamadasJitsiActivasProfesor() {
          const mapa = new Map();
          (window.estudiantesProfesor || estudiantesProfesor || []).forEach(estudiante => {
            const grupal = estudiante.jitsiGrupal || {};
            const individual = estudiante.jitsiSala || {};
            let tipo = '';
            let datos = null;
            if (grupal.disponible === true && fechaJitsiValida(grupal.expiraEn) > Date.now()) {
              tipo = 'grupal';
              datos = grupal;
            } else if ((estudiante.jitsiDisponible === true || individual.disponible === true) && (!individual.expiraEn || fechaJitsiValida(individual.expiraEn) > Date.now())) {
              tipo = 'individual';
              datos = individual;
            }
            const id = String(datos?.id || '');
            if (!id) return;
            if (!mapa.has(id)) mapa.set(id, { id, tipo, datos, estudiantes: [] });
            mapa.get(id).estudiantes.push(estudiante);
          });
          return [...mapa.values()];
        }

        async function sincronizarHistorialJitsiActivo(forzar = false) {
          const ahora = Date.now();
          if (historialJitsiActualizacionPendiente || (!forzar && ahora - ultimaSincronizacionHistorialJitsi < 5000)) return;
          historialJitsiActualizacionPendiente = true;
          ultimaSincronizacionHistorialJitsi = ahora;
          try {
            for (const llamada of llamadasJitsiActivasProfesor()) {
              const participantes = participantesHistorialJitsi(llamada.estudiantes, llamada.id);
              const metricas = metricasParticipantesJitsi(participantes);
              const primero = llamada.estudiantes[0] || {};
              await window.guardarHistorialJitsiFirebase?.({
                id: llamada.id,
                tipo: llamada.tipo,
                sala: llamada.datos.sala || '',
                curso: llamada.datos.curso || primero.estudiante?.curso || '',
                division: llamada.datos.division || primero.estudiante?.division || '',
                turno: llamada.datos.turno || primero.estudiante?.turno || '',
                estudianteUid: llamada.tipo === 'individual' ? primero.uid : '',
                estudianteEmail: llamada.tipo === 'individual' ? primero.email : '',
                estudianteNombre: llamada.tipo === 'individual' ? (primero.estudiante?.nombre || primero.nombreGoogle || primero.email || '') : '',
                duracionMinutos: llamada.datos.duracionMinutos || 0,
                expiraEn: llamada.datos.expiraEn || '',
                estado: 'activa',
                participantes,
                ...metricas
              });
            }
          } finally {
            historialJitsiActualizacionPendiente = false;
          }
        }

        function actualizarResumenJitsiProfesor() {
          const resumen = document.getElementById('resumenJitsiProfesor');
          if (!resumen) return;
          const llamadas = llamadasJitsiActivasProfesor();
          const participantes = llamadas.flatMap(llamada => participantesHistorialJitsi(llamada.estudiantes, llamada.id));
          const metricas = metricasParticipantesJitsi(participantes);
          const activos = metricas.unidos;
          resumen.innerHTML = `<i class="fa-solid fa-video"></i><strong>${activos}</strong><span>se unieron</span>`;
          resumen.classList.toggle('is-active', llamadas.length > 0);
          resumen.title = llamadas.length
            ? `${llamadas.length} llamada(s) activa(s). Invitados: ${metricas.invitados}. Notificados: ${metricas.notificados}. Se unieron: ${metricas.unidos}. Rechazaron: ${metricas.rechazados}. Salieron: ${metricas.salieron}.`
            : 'No hay llamadas Jitsi activas.';
          if (llamadas.length) sincronizarHistorialJitsiActivo();
        }
        window.actualizarResumenJitsiProfesor = actualizarResumenJitsiProfesor;

        function fechaHistorialJitsi(valor) {
          const fecha = valor?.toDate?.() || (valor?.seconds ? new Date(valor.seconds * 1000) : new Date(valor || 0));
          return Number.isFinite(fecha.getTime()) ? fecha.toLocaleString('es-AR') : 'Sin fecha';
        }

        function renderHistorialJitsiProfesor() {
          const lista = document.getElementById('listaHistorialJitsi');
          const resumen = document.getElementById('resumenHistorialJitsi');
          if (!lista || !resumen) return;
          const tipo = document.getElementById('filtroHistorialJitsiTipo')?.value || '';
          const texto = String(document.getElementById('filtroHistorialJitsiTexto')?.value || '').toLowerCase().trim();
          const filtrado = historialJitsiCache.filter(item => {
            const bolsa = [item.curso, item.division, item.turno, item.estudianteNombre, item.estudianteEmail, item.docente, item.sala].join(' ').toLowerCase();
            return (!tipo || item.tipo === tipo) && (!texto || bolsa.includes(texto));
          });
          const totales = filtrado.reduce((acc, item) => {
            acc.unidos += Number(item.unidos || 0);
            acc.rechazados += Number(item.rechazados || 0);
            acc.salieron += Number(item.salieron || 0);
            return acc;
          }, { unidos: 0, rechazados: 0, salieron: 0 });
          resumen.innerHTML = `<span><strong>${filtrado.length}</strong> llamadas</span><span><strong>${totales.unidos}</strong> ingresos</span><span><strong>${totales.rechazados}</strong> rechazos</span><span><strong>${totales.salieron}</strong> salidas</span>`;
          lista.innerHTML = filtrado.map(item => {
            const destino = item.tipo === 'grupal'
              ? [item.curso, item.division, item.turno].filter(Boolean).join(' · ') || 'Grupo'
              : item.estudianteNombre || item.estudianteEmail || 'Estudiante';
            const estado = String(item.estado || 'activa');
            const participantes = Array.isArray(item.participantes) ? item.participantes : [];
            const detalleParticipantes = participantes.length
              ? `<details><summary>Ver ${participantes.length} participante(s)</summary><div class="jitsi-history-participants">${participantes.map(p => `<span><i class="fa-solid fa-user"></i>${escapeHtml(p.nombre || p.email || 'Estudiante')} <strong>${escapeHtml(p.estado || 'invitado')}</strong></span>`).join('')}</div></details>`
              : '';
            return `<article class="jitsi-history-item">
              <div class="jitsi-history-item-head"><span class="jitsi-history-type is-${escapeHtml(item.tipo || 'individual')}"><i class="fa-solid ${item.tipo === 'grupal' ? 'fa-users' : 'fa-user'}"></i>${item.tipo === 'grupal' ? 'Grupal' : 'Individual'}</span><span class="jitsi-history-status is-${escapeHtml(estado)}">${escapeHtml(estado)}</span></div>
              <h4>${escapeHtml(destino)}</h4>
              <p><i class="fa-solid fa-calendar"></i> ${escapeHtml(fechaHistorialJitsi(item.iniciadaEn))} · <i class="fa-solid fa-clock"></i> ${Number(item.duracionMinutos || 0)} min</p>
              <p><i class="fa-solid fa-chalkboard-user"></i> ${escapeHtml(item.docente || 'Docente')}</p>
              <div class="jitsi-history-stats"><span>Invitados <strong>${Number(item.invitados || 0)}</strong></span><span>Notificados <strong>${Number(item.notificados || 0)}</strong></span><span>Se unieron <strong>${Number(item.unidos || 0)}</strong></span><span>Rechazaron <strong>${Number(item.rechazados || 0)}</strong></span><span>Salieron <strong>${Number(item.salieron || 0)}</strong></span></div>
              ${detalleParticipantes}
            </article>`;
          }).join('') || '<p class="jitsi-history-empty">No hay llamadas que coincidan con los filtros.</p>';
        }

        window.abrirHistorialJitsiProfesor = async function() {
          const modal = document.getElementById('historialJitsiModal');
          const lista = document.getElementById('listaHistorialJitsi');
          if (!modal || !lista) return;
          const autorizado = await window.esDocenteAutorizadoFirebase?.();
          if (!autorizado) {
            const ingreso = await window.autorizarDocenteFirebase?.();
            if (!ingreso) {
              modal.style.display = 'flex';
              modal.classList.add('active');
              lista.innerHTML = '<div class="jitsi-history-empty jitsi-history-error"><i class="fa-solid fa-user-lock"></i><strong>Se necesita una cuenta docente autorizada.</strong><span>Ingresá con la cuenta docente y volvé a abrir el historial.</span></div>';
              return;
            }
          }
          modal.style.display = 'flex';
          modal.classList.add('active');
          lista.innerHTML = '<p class="jitsi-history-empty"><i class="fa-solid fa-spinner fa-spin"></i> Cargando historial...</p>';
          await sincronizarHistorialJitsiActivo(true);
          historialJitsiCache = await window.obtenerHistorialJitsiFirebase?.() || [];
          if (!historialJitsiCache.length && window.ultimoErrorHistorialJitsi) {
            const error = window.ultimoErrorHistorialJitsi;
            lista.innerHTML = `<div class="jitsi-history-empty jitsi-history-error"><i class="fa-solid fa-triangle-exclamation"></i><strong>No se pudo cargar el historial Jitsi.</strong><span>${escapeHtml(error.message || error.code || 'Error desconocido')}</span><small>Verificá que la cuenta docente esté autorizada y que las reglas Firestore estén publicadas.</small></div>`;
            modal.querySelector('.jitsi-history-box')?.focus({ preventScroll: true });
            return;
          }
          renderHistorialJitsiProfesor();
          modal.querySelector('.jitsi-history-box')?.focus({ preventScroll: true });
        };

        window.abrirHistorialJitsiEstudianteProfesor = async function(indice) {
          const estudiante = window.estudiantesProfesor?.[indice] || estudiantesProfesor?.[indice];
          await window.abrirHistorialJitsiProfesor();
          const filtro = document.getElementById('filtroHistorialJitsiTexto');
          if (!filtro || !estudiante) return;
          filtro.value = estudiante.email || estudiante.estudiante?.nombre || estudiante.nombreGoogle || '';
          renderHistorialJitsiProfesor();
        };

        window.abrirLimpiezaHistorialJitsi = async function() {
          const boton = document.getElementById('btnLimpiarHistorialJitsi');
          const original = boton?.innerHTML || '';
          if (boton) {
            boton.disabled = true;
            boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Revisando...';
          }
          const resultado = await window.buscarLlamadasJitsiAntiguasFirebase?.({ antiguedadHoras: 24 });
          if (boton) {
            boton.disabled = false;
            boton.innerHTML = original;
          }
          if (!resultado || resultado.error) {
            alert(resultado?.error || 'No se pudo revisar el historial Jitsi.');
            return;
          }
          const llamadas = resultado.llamadas || [];
          if (!llamadas.length) {
            alert('No se encontraron documentos Jitsi antiguos para limpiar. Las llamadas activas quedaron protegidas.');
            return;
          }
          const resumen = llamadas.slice(0, 12).map(item => {
            const destino = item.tipo === 'grupal'
              ? [item.curso, item.division, item.turno].filter(Boolean).join(' · ') || 'Grupo'
              : item.estudianteNombre || item.estudianteEmail || 'Estudiante';
            return `${item.id} · ${destino} · ${item.estado || 'vencida'}`;
          });
          const confirmacion = await mostrarConfirmacionDocente({
            tipo: 'warning',
            icono: 'fa-broom',
            titulo: 'Limpiar historial Jitsi antiguo',
            mensaje: `Se encontraron ${llamadas.length} documento(s) antiguos, finalizados, cancelados o vencidos.`,
            detalles: [
              'No se eliminarán llamadas activas.',
              'No se eliminarán documentos de estudiantes ni historiales de bloqueos, descuentos o pestañas.',
              `Criterio aplicado: más de ${resultado.antiguedadHoras} horas de antigüedad.`,
              ...resumen,
              llamadas.length > resumen.length ? `... y ${llamadas.length - resumen.length} documento(s) más.` : ''
            ].filter(Boolean),
            campoLabel: 'Escribí LIMPIAR para confirmar',
            campoPlaceholder: 'LIMPIAR',
            campoRequerido: true,
            valorEsperado: 'LIMPIAR',
            requiereCheck: true,
            checkTexto: 'Confirmo que solo se borrará el historial Jitsi antiguo detectado.',
            confirmarTexto: 'Eliminar historial antiguo',
            confirmarIcono: 'fa-trash-can',
            confirmarClase: 'btn-danger'
          });
          if (!confirmacion?.confirmado) return;
          const borrado = await window.eliminarLlamadasJitsiAntiguasFirebase?.(llamadas);
          if (!borrado || borrado.error) {
            alert(borrado?.error || 'No se pudo completar la limpieza.');
            return;
          }
          historialJitsiCache = (historialJitsiCache || []).filter(item => !llamadas.some(viejo => viejo.id === item.id));
          renderHistorialJitsiProfesor();
          alert(`Limpieza completada. Se eliminaron ${borrado.eliminadas} documento(s) Jitsi antiguos.`);
        };

        function cerrarHistorialJitsiProfesor() {
          const modal = document.getElementById('historialJitsiModal');
          if (!modal) return;
          modal.classList.remove('active');
          modal.style.display = 'none';
        }

        function cerrarJitsi() {
          const modal = document.getElementById('jitsiModal');
          const frame = document.getElementById('jitsiFrame');
          const copiarEstado = document.getElementById('jitsiCopiarEstado');
          try { jitsiApiActual?.dispose?.(); } catch (error) { console.warn('No se pudo cerrar la instancia Jitsi.', error); }
          jitsiApiActual = null;
          try {
            if (jitsiVentanaExterna && !jitsiVentanaExterna.closed) jitsiVentanaExterna.close();
          } catch (error) {}
          jitsiVentanaExterna = null;
          detenerMonitorVentanaJitsi();
          jitsiInvitacionAbiertaId = '';
          jitsiOpcionesPendientes = null;
          if (modal) { modal.dataset.hostConfirmation = 'false'; modal.dataset.jitsiRole = ''; }
          jitsiConfirmacionAnfitrionEnCurso = false;
          if (copiarEstado) copiarEstado.textContent = '';
          ocultarAlertaUltimoMinutoJitsi();
          ocultarAvisoFinAlumnoJitsi();
          const botonExtender = document.getElementById('sumarTiempoJitsi');
          if (botonExtender) botonExtender.hidden = true;
          if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
          }
        }

        function abrirJitsiEnNuevaPestana() {
          const estadoExterno = document.getElementById('jitsiExternalEstado');
          if (!enlaceJitsiActual) return false;
          try {
            jitsiVentanaExterna = window.open(enlaceJitsiActual, 'jitsi_sala_actividad');
            if (!jitsiVentanaExterna) {
              if (estadoExterno) estadoExterno.textContent = 'El navegador bloqueó la pestaña. Habilitá las ventanas emergentes y volvé a intentar.';
              return false;
            }
            jitsiVentanaExterna.focus?.();
            if (estadoExterno) estadoExterno.textContent = jitsiOpcionesPendientes?.requerirModerador
              ? 'Iniciá sesión dentro de Jitsi. Cuando figure que administrás la sala, regresá y presioná “Confirmar docente anfitrión”.'
              : 'Sala abierta. Si no la ves, revisá las pestañas del navegador.';
            return true;
          } catch (error) {
            console.error('No se pudo abrir Jitsi en una pestaña nueva:', error);
            if (estadoExterno) estadoExterno.textContent = 'No se pudo abrir la pestaña Jitsi.';
            return false;
          }
        }

        async function confirmarAnfitrionJitsiManual() {
          const opciones = jitsiOpcionesPendientes;
          const boton = document.getElementById('confirmarAnfitrionJitsi');
          const estado = document.getElementById('jitsiEstado');
          const estadoExterno = document.getElementById('jitsiExternalEstado');
          if (!opciones?.requerirModerador || typeof opciones.alConfirmarModerador !== 'function' || jitsiConfirmacionAnfitrionEnCurso) return;

          const usuarioDocente = window.firebaseTeacherUser || window.firebaseCurrentUser;
          const autorizado = Boolean(usuarioDocente && await window.esDocenteAutorizadoFirebase?.());
          if (!autorizado) {
            alert('Solo una cuenta docente autorizada puede confirmar el rol de anfitrión y habilitar estudiantes.');
            return;
          }
          if (!jitsiVentanaExterna || jitsiVentanaExterna.closed) {
            alert('Primero abrí la sala Jitsi e ingresá con la cuenta docente.');
            abrirJitsiEnNuevaPestana();
            return;
          }

          const confirmacion = await mostrarConfirmacionDocente({
            tipo: 'warning',
            icono: 'fa-user-shield',
            titulo: 'Confirmar docente anfitrión',
            mensaje: 'Los estudiantes recibirán el enlace solamente después de esta confirmación.',
            detalles: [
              `Cuenta docente: ${usuarioDocente.email || usuarioDocente.displayName || 'Docente autorizado'}`,
              'La pestaña Jitsi debe permanecer abierta.',
              'Dentro de Jitsi, tu cuenta debe figurar como moderador o administrador de la sala.'
            ],
            requiereCheck: true,
            checkTexto: 'Confirmo que ingresé con la cuenta docente y Jitsi me muestra como moderador/anfitrión.',
            confirmarTexto: 'Confirmar e invitar',
            confirmarIcono: 'fa-user-shield',
            confirmarClase: 'btn-success'
          });
          if (!confirmacion?.confirmado) return;

          jitsiConfirmacionAnfitrionEnCurso = true;
          if (boton) {
            boton.disabled = true;
            boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Habilitando estudiantes...';
          }
          if (estado) estado.textContent = 'Docente anfitrión confirmado. Habilitando estudiantes...';
          try {
            const resultado = await opciones.alConfirmarModerador();
            if (resultado === false) throw new Error('Firebase rechazó la habilitación.');
            if (resultado?.expiraEn) iniciarCuentaRegresivaJitsi(resultado.expiraEn, resultado.alVencer, resultado.alExtender);
            if (estado) estado.textContent = opciones.estadoConfirmado || 'Docente confirmado como anfitrión';
            if (estadoExterno) estadoExterno.textContent = 'El docente es el anfitrión. Los estudiantes ya recibieron la invitación.';
            if (boton) boton.hidden = true;
            jitsiOpcionesPendientes = {
              ...opciones,
              anfitrionConfirmado: true,
              anfitrionEmail: usuarioDocente.email || '',
              anfitrionUid: usuarioDocente.uid || ''
            };
          } catch (error) {
            console.error('No se pudo habilitar a los estudiantes:', error);
            if (estado) estado.textContent = 'No se pudo habilitar la invitación de los estudiantes.';
            if (estadoExterno) estadoExterno.textContent = 'Verificá Firebase y volvé a confirmar cuando estés dentro de la sala.';
            if (boton) {
              boton.disabled = false;
              boton.innerHTML = '<i class="fa-solid fa-user-shield"></i> Confirmar docente anfitrión';
            }
            jitsiConfirmacionAnfitrionEnCurso = false;
          }
        }
        window.abrirJitsiConSala = function(enlace, nombre, email, estadoTexto, opciones = {}) {
          const enlaceSeguro = String(enlace || '').split('#')[0];
          const coincidencia = enlaceSeguro.match(/^https:\/\/meet\.jit\.si\/([a-zA-Z0-9_-]+)$/);
          if (!coincidencia) {
            alert('No se encontró un enlace válido para la sala Jitsi.');
            return false;
          }
          const modal = document.getElementById('jitsiModal');
          const frame = document.getElementById('jitsiFrame');
          const estado = document.getElementById('jitsiEstado');
          const nombreElemento = document.getElementById('jitsiEstudianteNombre');
          const emailElemento = document.getElementById('jitsiEstudianteEmail');
          const copiarEstado = document.getElementById('jitsiCopiarEstado');
          const botonConfirmar = document.getElementById('confirmarAnfitrionJitsi');
          const mensajeExterno = document.getElementById('jitsiExternalMensaje');
          const estadoExterno = document.getElementById('jitsiExternalEstado');
          if (!modal || !frame) return false;
          detenerCuentaRegresivaJitsi();
          cerrarJitsi();
          const nombreVisible = String(nombre || 'Participante').trim() || 'Participante';
          enlaceJitsiActual = enlaceSeguro;
          const modoDocenteJitsi = opciones.requerirModerador === true && opciones.rol !== 'estudiante';
          jitsiOpcionesPendientes = { ...opciones, requerirModerador: modoDocenteJitsi, estadoConfirmado: estadoTexto };
          modal.dataset.hostConfirmation = modoDocenteJitsi ? 'true' : 'false';
          modal.dataset.jitsiRole = modoDocenteJitsi ? 'teacher' : 'student';
          if (nombreElemento) nombreElemento.textContent = nombreVisible;
          if (emailElemento) emailElemento.textContent = String(email || '');
          if (copiarEstado) copiarEstado.textContent = '';
          if (estadoExterno) estadoExterno.textContent = '';
          if (mensajeExterno) mensajeExterno.textContent = modoDocenteJitsi
            ? 'Abrí la sala, iniciá sesión en Jitsi y confirmá que sos anfitrión antes de invitar a los estudiantes.'
            : 'Abrí la sala Jitsi en una pestaña nueva para participar de la videollamada.';
          if (botonConfirmar) {
            botonConfirmar.hidden = !modoDocenteJitsi;
            botonConfirmar.disabled = false;
            botonConfirmar.innerHTML = '<i class="fa-solid fa-user-shield"></i> Confirmar docente anfitrión';
          }
          if (estado) estado.textContent = modoDocenteJitsi
            ? 'Paso 1: abrí Jitsi. Paso 2: ingresá como anfitrión. Paso 3: confirmalo en esta ventana.'
            : (estadoTexto || 'Encuentro en vivo por Jitsi Meet');
          modal.style.display = 'flex';
          modal.classList.add('active');
          modal.querySelector('.jitsi-box')?.focus({ preventScroll: true });
          abrirJitsiEnNuevaPestana();
          return true;
        };
        window.abrirJitsiConEstudiante = function(email, nombre) {
          const datosSala = crearDatosSalaJitsi(email);
          if (!datosSala) {
            alert('No se encontró un correo válido del estudiante.');
            return;
          }
          window.abrirJitsiConSala(
            datosSala.enlace,
            nombre || 'Estudiante',
            datosSala.correo,
            'Encuentro en vivo entre docente y estudiante'
          );
        };

        window.abrirJitsiDocente = async function(indice) {
          const estudiante = window.estudiantesProfesor?.[indice] || estudiantesProfesor?.[indice];
          if (!estudiante?.uid) {
            alert('No se pudo identificar al estudiante seleccionado.');
            return;
          }
          const nombre = estudiante.estudiante?.nombre || estudiante.nombreGoogle || estudiante.email || 'Estudiante';
          const datosSala = crearDatosSalaJitsi(estudiante.email);
          if (!datosSala) {
            alert('No se encontró un correo válido del estudiante.');
            return;
          }
          const docente = window.firebaseTeacherUser || window.firebaseCurrentUser || {};
          window.abrirJitsiConSala(
            datosSala.enlace,
            docente.displayName || 'Docente',
            docente.email || '',
            `Docente anfitrión · Llamada con ${nombre}`,
            {
              requerirModerador: true,
              alConfirmarModerador: async () => {
                const duracionMinutos = obtenerDuracionJitsi();
                const expiraEn = new Date(Date.now() + duracionMinutos * 60000).toISOString();
                const idLlamada = `${Date.now()}-${estudiante.uid}`;
                const habilitado = await window.actualizarDisponibilidadJitsiFirebase?.(estudiante.uid, true, { id: idLlamada, duracionMinutos, expiraEn });
                if (!habilitado) return false;
                const cancelarManualmente = async () => {
                  const participantes = participantesHistorialJitsi([estudiante], idLlamada);
                  const retirado = await window.actualizarDisponibilidadJitsiFirebase?.(estudiante.uid, false, { id: idLlamada });
                  if (!retirado) return false;
                  await window.guardarHistorialJitsiFirebase?.({
                    id: idLlamada,
                    tipo: 'individual',
                    estudianteUid: estudiante.uid,
                    estudianteEmail: estudiante.email || '',
                    estudianteNombre: nombre,
                    duracionMinutos,
                    expiraEn,
                    estado: 'cancelada',
                    motivoFinalizacion: 'Cerrada por el docente',
                    participantes,
                    ...metricasParticipantesJitsi(participantes)
                  });
                  estudiante.jitsiDisponible = false;
                  estudiante.jitsiSala = { ...(estudiante.jitsiSala || {}), disponible: false, expiraEn: '' };
                  estudiante.jitsiParticipacion = { llamadaId: idLlamada, tipo: 'individual', estado: 'finalizada' };
                  renderPanelProfesor?.();
                  return true;
                };
                if (jitsiOpcionesPendientes) jitsiOpcionesPendientes.alCerrarManual = cancelarManualmente;
                estudiante.jitsiDisponible = true;
                estudiante.jitsiSala = { ...(estudiante.jitsiSala || {}), disponible: true, id: idLlamada, duracionMinutos, expiraEn };
                estudiante.jitsiParticipacion = { llamadaId: idLlamada, tipo: 'individual', estado: 'invitado' };
                await window.guardarHistorialJitsiFirebase?.({
                  id: idLlamada,
                  tipo: 'individual',
                  estudianteUid: estudiante.uid,
                  estudianteEmail: estudiante.email || '',
                  estudianteNombre: nombre,
                  curso: estudiante.estudiante?.curso || '',
                  division: estudiante.estudiante?.division || '',
                  turno: estudiante.estudiante?.turno || '',
                  duracionMinutos,
                  expiraEn,
                  estado: 'activa',
                  registrarInicio: true,
                  participantes: participantesHistorialJitsi([estudiante], idLlamada),
                  invitados: 1
                });
                renderPanelProfesor?.();
                return {
                  expiraEn,
                  alVencer: async () => {
                    const participantes = participantesHistorialJitsi([estudiante], idLlamada);
                    await window.actualizarDisponibilidadJitsiFirebase?.(estudiante.uid, false, { id: idLlamada });
                    await window.guardarHistorialJitsiFirebase?.({
                      id: idLlamada,
                      tipo: 'individual',
                      estudianteUid: estudiante.uid,
                      estudianteEmail: estudiante.email || '',
                      estudianteNombre: nombre,
                      duracionMinutos,
                      expiraEn,
                      estado: 'finalizada',
                      motivoFinalizacion: 'Tiempo agotado',
                      participantes,
                      ...metricasParticipantesJitsi(participantes)
                    });
                    estudiante.jitsiDisponible = false;
                    estudiante.jitsiSala = { ...(estudiante.jitsiSala || {}), disponible: false, expiraEn: '' };
                    estudiante.jitsiParticipacion = { llamadaId: idLlamada, tipo: 'individual', estado: 'finalizada' };
                    renderPanelProfesor?.();
                  },
                  alExtender: async nuevoExpiraEn => {
                    const duracionRestante = Math.max(1, Math.ceil((fechaJitsiValida(nuevoExpiraEn) - Date.now()) / 60000));
                    const actualizado = await window.actualizarDisponibilidadJitsiFirebase?.(estudiante.uid, true, {
                      id: idLlamada,
                      duracionMinutos: duracionRestante,
                      expiraEn: nuevoExpiraEn
                    });
                    if (!actualizado) return false;
                    estudiante.jitsiSala = { ...(estudiante.jitsiSala || {}), disponible: true, id: idLlamada, duracionMinutos: duracionRestante, expiraEn: nuevoExpiraEn };
                    await window.guardarHistorialJitsiFirebase?.({
                      id: idLlamada,
                      tipo: 'individual',
                      duracionMinutos: duracionRestante,
                      expiraEn: nuevoExpiraEn,
                      estado: 'activa',
                      participantes: participantesHistorialJitsi([estudiante], idLlamada),
                      ...metricasParticipantesJitsi(participantesHistorialJitsi([estudiante], idLlamada))
                    });
                    renderPanelProfesor?.();
                    return true;
                  }
                };
              }
            }
          );
        };
        window.cerrarSalaJitsiProfesor = async function(indice) {
          const estudiante = window.estudiantesProfesor?.[indice] || estudiantesProfesor?.[indice];
          if (!estudiante?.uid) {
            alert('No se pudo identificar al estudiante seleccionado.');
            return;
          }
          const nombre = estudiante.estudiante?.nombre || estudiante.nombreGoogle || estudiante.email || 'Estudiante';
          const confirmacion = await mostrarConfirmacionDocente({
            tipo: 'danger',
            icono: 'fa-video-slash',
            titulo: 'Finalizar llamada Jitsi',
            mensaje: `La videollamada finalizará y dejará de estar disponible para ${nombre}.`,
            detalles: [
              'El botón para ingresar desaparecerá de la pantalla del estudiante.',
              'Si el estudiante tiene la sala abierta, la ventana se cerrará automáticamente.'
            ],
            confirmarTexto: 'Finalizar llamada',
            confirmarIcono: 'fa-video-slash',
            confirmarClase: 'btn-danger'
          });
          if (!confirmacion?.confirmado) return;
          const grupalActiva = estudiante.jitsiGrupal?.disponible === true;
          const individualActiva = estudiante.jitsiDisponible === true || estudiante.jitsiSala?.disponible === true;
          const idGrupal = String(estudiante.jitsiGrupal?.id || '');
          const idIndividual = String(estudiante.jitsiSala?.id || '');
          const cerrarGrupal = grupalActiva || (!individualActiva && Boolean(idGrupal));
          if (cerrarGrupal && idGrupal) {
            const grupo = (window.estudiantesProfesor || estudiantesProfesor || []).filter(item =>
              String(item.jitsiGrupal?.id || '') === idGrupal
            );
            const salaGrupal = estudiante.jitsiGrupal || {};
            const participantesGrupales = participantesHistorialJitsi(grupo, idGrupal);
            const cerradoGrupal = await window.actualizarJitsiGrupalFirebase?.(grupo, {
              disponible: false,
              id: idGrupal,
              sala: salaGrupal.sala || '',
              enlace: salaGrupal.enlace || '',
              duracionMinutos: salaGrupal.duracionMinutos || 0,
              expiraEn: '',
              curso: salaGrupal.curso || '',
              division: salaGrupal.division || '',
              turno: salaGrupal.turno || ''
            });
            if (!cerradoGrupal) {
              alert('No se pudo limpiar la llamada grupal anterior. Verificá la autorización docente y las reglas de Firestore.');
              return;
            }
            await window.guardarHistorialJitsiFirebase?.({
              id: idGrupal,
              tipo: 'grupal',
              sala: salaGrupal.sala || '',
              curso: salaGrupal.curso || '',
              division: salaGrupal.division || '',
              turno: salaGrupal.turno || '',
              duracionMinutos: salaGrupal.duracionMinutos || 0,
              expiraEn: salaGrupal.expiraEn || '',
              estado: 'cancelada',
              motivoFinalizacion: 'Llamada anterior limpiada por el docente',
              participantes: participantesGrupales,
              ...metricasParticipantesJitsi(participantesGrupales)
            });
            grupo.forEach(item => {
              item.jitsiGrupal = { ...(item.jitsiGrupal || {}), disponible: false, expiraEn: '' };
              item.jitsiParticipacion = { llamadaId: idGrupal, tipo: 'grupal', estado: 'finalizada' };
            });
            cerrarJitsi();
            renderPanelProfesor?.();
            alert('La llamada grupal anterior fue limpiada y dejó de estar disponible.');
            return;
          }
          const idLlamada = idIndividual;
          if (!idLlamada && !individualActiva) {
            alert('No se encontró una invitación Jitsi activa o anterior para este estudiante. El panel se actualizará para quitar el estado desactualizado.');
            estudiante.jitsiDisponible = false;
            estudiante.jitsiSala = { ...(estudiante.jitsiSala || {}), disponible: false };
            renderPanelProfesor?.();
            return;
          }
          const participantes = participantesHistorialJitsi([estudiante], idLlamada);
          const cerrado = await window.actualizarDisponibilidadJitsiFirebase?.(estudiante.uid, false, { id: idLlamada });
          if (!cerrado) {
            alert('No se pudo cerrar la sala Jitsi. Verificá la autorización docente y las reglas de Firestore.');
            return;
          }
          if (idLlamada) {
            await window.guardarHistorialJitsiFirebase?.({
              id: idLlamada,
              tipo: 'individual',
              estudianteUid: estudiante.uid,
              estudianteEmail: estudiante.email || '',
              estudianteNombre: nombre,
              duracionMinutos: estudiante.jitsiSala?.duracionMinutos || 0,
              expiraEn: estudiante.jitsiSala?.expiraEn || '',
              estado: 'cancelada',
              motivoFinalizacion: 'Cancelada por el docente',
              participantes,
              ...metricasParticipantesJitsi(participantes)
            });
          }
          estudiante.jitsiDisponible = false;
          estudiante.jitsiSala = { ...(estudiante.jitsiSala || {}), disponible: false };
          estudiante.jitsiParticipacion = { llamadaId: idLlamada, tipo: 'individual', estado: 'finalizada' };
          cerrarJitsi();
          renderPanelProfesor?.();
          alert('La videollamada Jitsi finalizó y ya no está disponible para el estudiante.');
        };

        function estudiantesActivosProfesor() {
          // La cooperación no requiere aprobación administrativa de la cuenta.
          // Se excluyen únicamente registros sin identidad o dados de baja/rechazados.
          return estudiantesProfesor.filter(item =>
            item?.uid &&
            !['rechazado', 'inactivo'].includes(String(item.estadoCuenta || '').toLowerCase())
          );
        }

        function obtenerGrupoProfesor(seleccion = null) {
          const curso = String(seleccion?.curso ?? document.getElementById('filtroCursoProfesor')?.value ?? '').trim();
          const division = String(seleccion?.division ?? document.getElementById('filtroDivisionProfesor')?.value ?? '').trim();
          const turno = String(seleccion?.turno ?? document.getElementById('filtroTurnoProfesor')?.value ?? '').trim();
          if (!curso) return { error: 'Seleccioná un curso antes de iniciar la llamada grupal.' };
          const estudiantes = estudiantesActivosProfesor().filter(item => {
            const datos = item.estudiante || {};
            return String(datos.curso || '') === curso &&
              (!division || String(datos.division || '') === division) &&
              (!turno || String(datos.turno || '') === turno);
          });
          const descripcion = [curso, division, turno].filter(Boolean).join(' · ');
          return { curso, division, turno, estudiantes, descripcion };
        }

        function completarSelectorJitsi(select, valores, textoTodos, seleccionado = '') {
          if (!select) return '';
          const opciones = [...new Set(valores.filter(Boolean).map(valor => String(valor).trim()))]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es'));
          select.innerHTML = `<option value="">${textoTodos}</option>` +
            opciones.map(valor => `<option value="${escapeHtml(valor)}">${escapeHtml(valor)}</option>`).join('');
          if (seleccionado && opciones.includes(seleccionado)) select.value = seleccionado;
          return select.value;
        }

        function actualizarSelectorJitsiGrupal(preferencias = {}) {
          const cursoSelect = document.getElementById('selectorJitsiCurso');
          const divisionSelect = document.getElementById('selectorJitsiDivision');
          const turnoSelect = document.getElementById('selectorJitsiTurno');
          const resumen = document.getElementById('selectorJitsiResumen');
          const vistaPrevia = document.getElementById('selectorJitsiVistaPrevia');
          const confirmar = document.getElementById('confirmarSelectorJitsiGrupal');
          if (!cursoSelect || !divisionSelect || !turnoSelect || !resumen || !vistaPrevia || !confirmar) return;

          const activos = estudiantesActivosProfesor();
          const cursoPreferido = String(preferencias.curso ?? cursoSelect.value ?? '').trim();
          completarSelectorJitsi(cursoSelect, activos.map(item => item.estudiante?.curso), 'Seleccionar curso', cursoPreferido);
          const curso = cursoSelect.value;
          const porCurso = activos.filter(item => String(item.estudiante?.curso || '') === curso);

          const divisionPreferida = String(preferencias.division ?? divisionSelect.value ?? '').trim();
          completarSelectorJitsi(divisionSelect, porCurso.map(item => item.estudiante?.division), 'Todas las divisiones', divisionPreferida);
          divisionSelect.disabled = !curso;
          const division = divisionSelect.value;
          const porDivision = porCurso.filter(item => !division || String(item.estudiante?.division || '') === division);

          const turnoPreferido = String(preferencias.turno ?? turnoSelect.value ?? '').trim();
          completarSelectorJitsi(turnoSelect, porDivision.map(item => item.estudiante?.turno), 'Todos los turnos', turnoPreferido);
          turnoSelect.disabled = !curso;
          const turno = turnoSelect.value;
          const grupo = obtenerGrupoProfesor({ curso, division, turno });
          const cantidad = grupo.error ? 0 : grupo.estudiantes.length;

          confirmar.disabled = !curso || cantidad === 0;
          resumen.className = `jitsi-group-selector-summary ${cantidad > 0 ? 'is-ready' : 'is-empty'}`;
          resumen.innerHTML = curso
            ? `<i class="fa-solid ${cantidad > 0 ? 'fa-users' : 'fa-user-slash'}"></i><span><strong>${cantidad}</strong> estudiante(s) activo(s) recibirán la invitación.</span>`
            : '<i class="fa-solid fa-circle-info"></i><span>Seleccioná un curso para consultar los estudiantes disponibles.</span>';

          if (cantidad > 0) {
            const nombres = grupo.estudiantes.slice(0, 8).map(item => escapeHtml(item.estudiante?.nombre || item.nombreGoogle || item.email || 'Estudiante'));
            const restantes = Math.max(0, cantidad - nombres.length);
            vistaPrevia.hidden = false;
            vistaPrevia.innerHTML = `<strong>Grupo seleccionado:</strong><div>${nombres.map(nombre => `<span><i class="fa-solid fa-user"></i>${nombre}</span>`).join('')}${restantes ? `<span class="is-more">+${restantes} más</span>` : ''}</div>`;
          } else {
            vistaPrevia.hidden = true;
            vistaPrevia.innerHTML = '';
          }
        }

        function cerrarSelectorJitsiGrupal() {
          const modal = document.getElementById('selectorJitsiGrupalModal');
          if (!modal) return;
          modal.classList.remove('active');
          modal.style.display = 'none';
        }

        window.abrirSelectorJitsiGrupal = function() {
          const modal = document.getElementById('selectorJitsiGrupalModal');
          if (!modal) return;
          const preferencias = {
            curso: document.getElementById('filtroCursoProfesor')?.value || '',
            division: document.getElementById('filtroDivisionProfesor')?.value || '',
            turno: document.getElementById('filtroTurnoProfesor')?.value || ''
          };
          actualizarSelectorJitsiGrupal(preferencias);
          modal.style.display = 'flex';
          modal.classList.add('active');
          modal.querySelector('.jitsi-group-selector')?.focus({ preventScroll: true });
        };

        window.confirmarSelectorJitsiGrupal = async function() {
          const seleccion = {
            curso: document.getElementById('selectorJitsiCurso')?.value || '',
            division: document.getElementById('selectorJitsiDivision')?.value || '',
            turno: document.getElementById('selectorJitsiTurno')?.value || ''
          };
          const grupo = obtenerGrupoProfesor(seleccion);
          if (grupo.error || !grupo.estudiantes.length) {
            actualizarSelectorJitsiGrupal(seleccion);
            return;
          }
          cerrarSelectorJitsiGrupal();
          await window.iniciarJitsiGrupalProfesor(seleccion);
        };

        window.iniciarJitsiGrupalProfesor = async function(seleccion = null) {
          const grupo = obtenerGrupoProfesor(seleccion);
          const llamadaExistente = grupo.estudiantes?.find(item =>
            item.jitsiGrupal?.disponible === true &&
            fechaJitsiValida(item.jitsiGrupal?.expiraEn) > Date.now()
          );
          if (llamadaExistente) {
            const horaFin = new Date(llamadaExistente.jitsiGrupal.expiraEn).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            });
            alert(`Ya existe una llamada Jitsi grupal activa para esta seleccion. Finaliza aproximadamente a las ${horaFin}.`);
            return;
          }
          if (grupo.error) { alert(grupo.error); return; }
          if (!grupo.estudiantes.length) { alert('No hay estudiantes activos que coincidan con la selección.'); return; }
          const confirmacion = await mostrarConfirmacionDocente({
            tipo: 'warning',
            icono: 'fa-users-viewfinder',
            titulo: 'Preparar llamada Jitsi grupal',
            mensaje: `Primero ingresarás como anfitrión. Luego se invitará a ${grupo.estudiantes.length} estudiante(s) de ${grupo.descripcion}.`,
            detalles: [
              'Jitsi puede solicitar que autentiques tu cuenta para crear la sala.',
              'Ningún estudiante recibirá la notificación hasta que Jitsi confirme tu rol de moderador.'
            ],
            confirmarTexto: 'Ingresar como anfitrión',
            confirmarIcono: 'fa-user-shield',
            confirmarClase: 'btn-success'
          });
          if (!confirmacion?.confirmado) return;
          const momento = Date.now();
          const id = `${momento}-${crearSlugJitsiGrupo(grupo.descripcion)}`;
          const sala = `ipem146-grupo-${crearSlugJitsiGrupo(grupo.descripcion)}-${momento}`;
          const enlace = 'https://meet.jit.si/' + sala;
          const docente = window.firebaseTeacherUser || window.firebaseCurrentUser || {};
          window.abrirJitsiConSala(
            enlace,
            docente.displayName || 'Docente',
            docente.email || '',
            `Docente anfitrión · Sala grupal: ${grupo.descripcion}`,
            {
              requerirModerador: true,
              alConfirmarModerador: async () => {
                const duracionMinutos = obtenerDuracionJitsiGrupal();
                const expiraEn = new Date(Date.now() + duracionMinutos * 60000).toISOString();
                const guardado = await window.actualizarJitsiGrupalFirebase?.(grupo.estudiantes, {
                  disponible: true, id, sala, enlace, duracionMinutos, expiraEn,
                  curso: grupo.curso, division: grupo.division, turno: grupo.turno
                });
                if (!guardado) return false;
                const cancelarManualmente = async () => {
                  const participantes = participantesHistorialJitsi(grupo.estudiantes, id);
                  const retirado = await window.actualizarJitsiGrupalFirebase?.(grupo.estudiantes, {
                    disponible: false, id, sala, enlace, duracionMinutos, expiraEn: '',
                    curso: grupo.curso, division: grupo.division, turno: grupo.turno
                  });
                  if (!retirado) return false;
                  await window.guardarHistorialJitsiFirebase?.({
                    id,
                    tipo: 'grupal',
                    sala,
                    curso: grupo.curso,
                    division: grupo.division,
                    turno: grupo.turno,
                    duracionMinutos,
                    expiraEn,
                    estado: 'cancelada',
                    motivoFinalizacion: 'Cerrada por el docente',
                    participantes,
                    ...metricasParticipantesJitsi(participantes)
                  });
                  grupo.estudiantes.forEach(item => {
                    item.jitsiGrupal = { ...(item.jitsiGrupal || {}), disponible: false, expiraEn: '' };
                    item.jitsiParticipacion = { llamadaId: id, tipo: 'grupal', estado: 'finalizada' };
                  });
                  renderPanelProfesor?.();
                  return true;
                };
                if (jitsiOpcionesPendientes) jitsiOpcionesPendientes.alCerrarManual = cancelarManualmente;
                grupo.estudiantes.forEach(item => {
                  item.jitsiGrupal = { disponible: true, id, sala, enlace, duracionMinutos, expiraEn, curso: grupo.curso, division: grupo.division, turno: grupo.turno };
                  item.jitsiParticipacion = { llamadaId: id, tipo: 'grupal', estado: 'invitado' };
                });
                const participantesIniciales = participantesHistorialJitsi(grupo.estudiantes, id);
                await window.guardarHistorialJitsiFirebase?.({
                  id,
                  tipo: 'grupal',
                  sala,
                  curso: grupo.curso,
                  division: grupo.division,
                  turno: grupo.turno,
                  duracionMinutos,
                  expiraEn,
                  estado: 'activa',
                  registrarInicio: true,
                  participantes: participantesIniciales,
                  ...metricasParticipantesJitsi(participantesIniciales)
                });
                renderPanelProfesor?.();
                return {
                  expiraEn,
                  alVencer: async () => {
                    const participantes = participantesHistorialJitsi(grupo.estudiantes, id);
                    await window.actualizarJitsiGrupalFirebase?.(grupo.estudiantes, {
                      disponible: false, id, sala, enlace, duracionMinutos, expiraEn: '',
                      curso: grupo.curso, division: grupo.division, turno: grupo.turno
                    });
                    await window.guardarHistorialJitsiFirebase?.({
                      id,
                      tipo: 'grupal',
                      sala,
                      curso: grupo.curso,
                      division: grupo.division,
                      turno: grupo.turno,
                      duracionMinutos,
                      expiraEn,
                      estado: 'finalizada',
                      motivoFinalizacion: 'Tiempo agotado',
                      participantes,
                      ...metricasParticipantesJitsi(participantes)
                    });
                    grupo.estudiantes.forEach(item => {
                      item.jitsiGrupal = { ...(item.jitsiGrupal || {}), disponible: false, expiraEn: '' };
                      item.jitsiParticipacion = { llamadaId: id, tipo: 'grupal', estado: 'finalizada' };
                    });
                    renderPanelProfesor?.();
                  },
                  alExtender: async nuevoExpiraEn => {
                    const duracionRestante = Math.max(1, Math.ceil((fechaJitsiValida(nuevoExpiraEn) - Date.now()) / 60000));
                    const actualizado = await window.actualizarJitsiGrupalFirebase?.(grupo.estudiantes, {
                      disponible: true, id, sala, enlace, duracionMinutos: duracionRestante, expiraEn: nuevoExpiraEn,
                      curso: grupo.curso, division: grupo.division, turno: grupo.turno
                    });
                    if (!actualizado) return false;
                    grupo.estudiantes.forEach(item => {
                      item.jitsiGrupal = { ...(item.jitsiGrupal || {}), disponible: true, id, sala, enlace, duracionMinutos: duracionRestante, expiraEn: nuevoExpiraEn };
                    });
                    const participantes = participantesHistorialJitsi(grupo.estudiantes, id);
                    await window.guardarHistorialJitsiFirebase?.({
                      id,
                      tipo: 'grupal',
                      sala,
                      curso: grupo.curso,
                      division: grupo.division,
                      turno: grupo.turno,
                      duracionMinutos: duracionRestante,
                      expiraEn: nuevoExpiraEn,
                      estado: 'activa',
                      participantes,
                      ...metricasParticipantesJitsi(participantes)
                    });
                    renderPanelProfesor?.();
                    return true;
                  }
                };
              }
            }
          );
        };
        async function copiarEnlaceJitsi() {
          if (!enlaceJitsiActual) return;
          const estado = document.getElementById('jitsiCopiarEstado');
          try {
            if (navigator.clipboard?.writeText && window.isSecureContext) {
              await navigator.clipboard.writeText(enlaceJitsiActual);
            } else {
              const area = document.createElement('textarea');
              area.value = enlaceJitsiActual;
              area.setAttribute('readonly', '');
              area.style.position = 'fixed';
              area.style.opacity = '0';
              document.body.appendChild(area);
              area.select();
              const copiado = document.execCommand('copy');
              area.remove();
              if (!copiado) throw new Error('No se pudo copiar');
            }
            if (estado) estado.textContent = 'Enlace copiado correctamente.';
          } catch (error) {
            if (estado) estado.textContent = 'No se pudo copiar automáticamente. Enlace: ' + enlaceJitsiActual;
          }
        }

        function reproducirSonidoLlamadaJitsi() {
          try {
            const AudioContexto = window.AudioContext || window.webkitAudioContext;
            if (!AudioContexto) return;
            const contexto = window.__jitsiAudioContext || new AudioContexto();
            window.__jitsiAudioContext = contexto;
            contexto.resume?.();
            [0, 0.28, 0.56].forEach((demora, indice) => {
              const oscilador = contexto.createOscillator();
              const ganancia = contexto.createGain();
              oscilador.type = 'sine';
              oscilador.frequency.value = indice === 1 ? 880 : 660;
              ganancia.gain.setValueAtTime(0.0001, contexto.currentTime + demora);
              ganancia.gain.exponentialRampToValueAtTime(0.18, contexto.currentTime + demora + 0.02);
              ganancia.gain.exponentialRampToValueAtTime(0.0001, contexto.currentTime + demora + 0.2);
              oscilador.connect(ganancia); ganancia.connect(contexto.destination);
              oscilador.start(contexto.currentTime + demora);
              oscilador.stop(contexto.currentTime + demora + 0.22);
            });
          } catch (error) {
            console.warn('El navegador bloqueó el aviso sonoro de Jitsi.', error);
          }
        }

        function ocultarAlertaJitsi() {
          const alerta = document.getElementById('jitsiLlamadaAlerta');
          if (alerta) alerta.hidden = true;
        }

        function mostrarAlertaJitsi(invitacion, sonar = true) {
          const alerta = document.getElementById('jitsiLlamadaAlerta');
          const titulo = document.getElementById('jitsiLlamadaTitulo');
          const mensaje = document.getElementById('jitsiLlamadaMensaje');
          if (!alerta || !invitacion) return;
          if (titulo) titulo.textContent = invitacion.titulo;
          if (mensaje) mensaje.textContent = [invitacion.mensaje, invitacion.docente ? `Docente: ${invitacion.docente}` : ''].filter(Boolean).join(' · ');
          alerta.hidden = false;
          if (sonar) reproducirSonidoLlamadaJitsi();
          programarRecordatorioJitsi(invitacion);
        }

        async function abrirInvitacionJitsiActual() {
          const invitacion = obtenerInvitacionJitsi();
          if (!invitacion) { alert('La videollamada ya no está disponible.'); actualizarInvitacionJitsiEstudiante(); return; }
          ocultarAlertaJitsi();
          detenerRecordatorioJitsi();
          cerrarJitsi();
          enlaceJitsiActual = String(invitacion.enlace || '').split('#')[0];
          const modal = document.getElementById('jitsiModal');
          if (modal) {
            modal.dataset.jitsiRole = 'student';
            modal.dataset.hostConfirmation = 'false';
            modal.classList.remove('active');
            modal.style.display = 'none';
          }
          jitsiOpcionesPendientes = { rol: 'estudiante', requerirModerador: false, expiraEn: invitacion.expiraEn };
          try {
            jitsiVentanaExterna = window.open(enlaceJitsiActual, 'jitsi_sala_actividad');
            if (!jitsiVentanaExterna) {
              alert('El navegador bloqueó la pestaña Jitsi. Habilitá las ventanas emergentes y volvé a intentar.');
              cerrarJitsi();
              return;
            }
            jitsiVentanaExterna.focus?.();
          } catch (error) {
            console.error('No se pudo abrir Jitsi para el estudiante:', error);
            alert('No se pudo abrir la sala Jitsi.');
            cerrarJitsi();
            return;
          }
          await window.registrarEstadoJitsiEstudianteFirebase?.(invitacion.tipo, invitacion.id, 'unido');
          try { localStorage.setItem(claveJitsiAlumno('jitsi_invitacion_aceptada'), invitacion.id); } catch (error) {}
          iniciarMonitorVentanaJitsi(invitacion);
          if (invitacion.expiraEn) iniciarCuentaRegresivaJitsi(invitacion.expiraEn, async () => {
            await window.registrarEstadoJitsiEstudianteFirebase?.(invitacion.tipo, invitacion.id, 'finalizada');
            ocultarAlertaJitsi();
            ocultarAvisoFinAlumnoJitsi();
            mostrarAvisoJitsiFinalizada();
            cerrarJitsi();
          }, null);
        }

        async function descartarInvitacionJitsiActual() {
          const invitacion = obtenerInvitacionJitsi();
          detenerRecordatorioJitsi();
          ocultarAlertaJitsi();
          if (!invitacion?.id) return;
          try { localStorage.setItem(claveJitsiAlumno('jitsi_invitacion_descartada'), invitacion.id); } catch (error) {}
          await window.registrarEstadoJitsiEstudianteFirebase?.(invitacion.tipo, invitacion.id, 'rechazado');
        }

        function actualizarInvitacionJitsiEstudiante() {
          const datos = datosEstudianteActual();
          const esDocente = Boolean(window.firebaseTeacherUser || (window.firebaseCurrentUser && document.body.classList.contains('teacher-authorized')));
          const invitacionPendienteDocente = Boolean(jitsiOpcionesPendientes?.requerirModerador);
          const invitacionAnterior = invitacionJitsiActual;
          const invitacion = obtenerInvitacionJitsi();
          invitacionJitsiActual = invitacion;

          if (!invitacion) {
            detenerRecordatorioJitsi();
            ocultarAlertaJitsi();
            ocultarAvisoFinAlumnoJitsi();
            const modalJitsi = document.getElementById('jitsiModal');
            const modoEstudianteJitsi = modalJitsi?.dataset.jitsiRole === 'student';
            const teniaInvitacionAlumno = !esDocente && Boolean(invitacionAnterior?.id);
            if (modoEstudianteJitsi || (!esDocente && !invitacionPendienteDocente && modalJitsi?.classList.contains('active')) || (teniaInvitacionAlumno && jitsiVentanaExterna)) cerrarJitsi();
            if (teniaInvitacionAlumno) {
              window.registrarEstadoJitsiEstudianteFirebase?.(invitacionAnterior.tipo, invitacionAnterior.id, 'finalizada');
              mostrarAvisoJitsiFinalizada();
            }
            return;
          }
          if (esDocente) return;
          const clave = `jitsi_invitacion_notificada_${window.firebaseCurrentUser?.uid || datos.email}`;
          const claveDescartada = claveJitsiAlumno('jitsi_invitacion_descartada');
          const claveAceptada = claveJitsiAlumno('jitsi_invitacion_aceptada');
          const claveSalida = claveJitsiAlumno('jitsi_invitacion_salida');
          let ultima = '';
          let descartada = '';
          let aceptada = '';
          let salida = '';
          try { ultima = localStorage.getItem(clave) || ''; } catch (error) {}
          try { descartada = localStorage.getItem(claveDescartada) || ''; } catch (error) {}
          try { aceptada = localStorage.getItem(claveAceptada) || ''; } catch (error) {}
          try { salida = localStorage.getItem(claveSalida) || ''; } catch (error) {}
          if (descartada === invitacion.id) return;
          const esNueva = Boolean(invitacion.id && invitacion.id !== ultima);
          if (esNueva) {
            try { localStorage.setItem(clave, invitacion.id); } catch (error) {}
            mostrarAlertaJitsi(invitacion, true);
            window.registrarEstadoJitsiEstudianteFirebase?.(invitacion.tipo, invitacion.id, 'notificado');
          } else if (!jitsiInvitacionAbiertaId && salida !== invitacion.id) {
            mostrarAlertaJitsi(invitacion, false);
          }
          const restante = fechaJitsiValida(invitacion.expiraEn) - Date.now();
          if (restante > 0 && restante <= 30000 && (jitsiInvitacionAbiertaId === invitacion.id || aceptada === invitacion.id)) {
            mostrarAvisoFinAlumnoJitsi(invitacion);
          } else if (restante > 30000) {
            ocultarAvisoFinAlumnoJitsi();
          }
        }

        document.querySelectorAll('[data-jitsi-minutos]').forEach(boton => {
          boton.addEventListener('click', () => {
            const entrada = document.getElementById('duracionJitsiMinutos');
            if (entrada) entrada.value = boton.dataset.jitsiMinutos || '5';
          });
        });
        document.getElementById('guardarDuracionJitsi')?.addEventListener('click', guardarConfiguracionDuracionJitsi);
        document.getElementById('cancelarDuracionJitsi')?.addEventListener('click', cerrarConfiguracionDuracionJitsi);
        document.getElementById('configuracionDuracionJitsiModal')?.addEventListener('click', event => {
          if (event.target?.id === 'configuracionDuracionJitsiModal') cerrarConfiguracionDuracionJitsi();
        });
        document.getElementById('abrirJitsiNuevaPestana')?.addEventListener('click', abrirJitsiEnNuevaPestana);
        document.getElementById('confirmarAnfitrionJitsi')?.addEventListener('click', confirmarAnfitrionJitsiManual);
        document.getElementById('sumarTiempoJitsi')?.addEventListener('click', sumarCincoMinutosJitsi);
        document.getElementById('pantallaCompletaJitsi')?.addEventListener('click', alternarPantallaCompletaJitsi);
        document.addEventListener('fullscreenchange', () => {
          const boton = document.getElementById('pantallaCompletaJitsi');
          const icono = boton?.querySelector('i');
          const activo = Boolean(document.fullscreenElement);
          if (icono) icono.className = `fa-solid ${activo ? 'fa-compress' : 'fa-expand'}`;
          if (boton) boton.title = activo ? 'Salir de pantalla completa' : 'Pantalla completa';
        });
        mostrarDuracionJitsi();
        document.getElementById('selectorJitsiCurso')?.addEventListener('change', () => actualizarSelectorJitsiGrupal({ curso: document.getElementById('selectorJitsiCurso')?.value || '', division: '', turno: '' }));
        document.getElementById('selectorJitsiDivision')?.addEventListener('change', () => actualizarSelectorJitsiGrupal({ curso: document.getElementById('selectorJitsiCurso')?.value || '', division: document.getElementById('selectorJitsiDivision')?.value || '', turno: '' }));
        document.getElementById('selectorJitsiTurno')?.addEventListener('change', () => actualizarSelectorJitsiGrupal());
        document.getElementById('cerrarSelectorJitsiGrupal')?.addEventListener('click', cerrarSelectorJitsiGrupal);
        document.getElementById('cancelarSelectorJitsiGrupal')?.addEventListener('click', cerrarSelectorJitsiGrupal);
        document.getElementById('confirmarSelectorJitsiGrupal')?.addEventListener('click', confirmarSelectorJitsiGrupal);
        document.getElementById('selectorJitsiGrupalModal')?.addEventListener('click', event => {
          if (event.target?.id === 'selectorJitsiGrupalModal') cerrarSelectorJitsiGrupal();
        });
        document.getElementById('cerrarHistorialJitsi')?.addEventListener('click', cerrarHistorialJitsiProfesor);
        document.getElementById('filtroHistorialJitsiTipo')?.addEventListener('change', renderHistorialJitsiProfesor);
        document.getElementById('filtroHistorialJitsiTexto')?.addEventListener('input', renderHistorialJitsiProfesor);
        document.getElementById('historialJitsiModal')?.addEventListener('click', event => {
          if (event.target?.id === 'historialJitsiModal') cerrarHistorialJitsiProfesor();
        });
        document.getElementById('jitsiLlamadaAceptar')?.addEventListener('click', abrirInvitacionJitsiActual);
        document.getElementById('jitsiLlamadaDescartar')?.addEventListener('click', descartarInvitacionJitsiActual);
        document.getElementById('copiarEnlaceJitsi')?.addEventListener('click', copiarEnlaceJitsi);
        async function cerrarJitsiDesdeUsuario() {
          const modal = document.getElementById('jitsiModal');
          const esEstudiante = modal?.dataset.jitsiRole === 'student';
          const esDocente = modal?.dataset.jitsiRole === 'teacher' || jitsiOpcionesPendientes?.requerirModerador === true;
          const invitacion = invitacionJitsiActual || obtenerInvitacionJitsi();
          const id = invitacion?.id || jitsiInvitacionAbiertaId;
          if (esDocente && typeof jitsiOpcionesPendientes?.alCerrarManual === 'function') {
            const confirmacion = await mostrarConfirmacionDocente({
              tipo: 'warning',
              icono: 'fa-video-slash',
              titulo: 'Cerrar llamada Jitsi',
              mensaje: 'La sala Jitsi se cerrará en esta pestaña.',
              detalles: [
                'Los estudiantes podrán seguir viendo la invitación hasta que la finalices desde Acciones.',
                'Para retirar el acceso y registrar la finalización, usá “Cancelar invitación / finalizar”.'
              ],
              confirmarTexto: 'Cerrar sala',
              confirmarIcono: 'fa-video-slash',
              confirmarClase: 'btn-danger'
            });
            if (!confirmacion?.confirmado) return;
            const revocada = await jitsiOpcionesPendientes?.alCerrarManual?.();
            if (revocada === false) {
              alert('No se pudo retirar la invitación del estudiante. Verificá Firebase e intentá nuevamente.');
              return;
            }
          }
          if (esEstudiante && id && jitsiVentanaExterna && !jitsiVentanaExterna.closed) {
            await window.registrarEstadoJitsiEstudianteFirebase?.(invitacion?.tipo || 'individual', id, 'salio');
            try { localStorage.setItem(claveJitsiAlumno('jitsi_invitacion_salida'), id); } catch (error) {}
          }
          cerrarJitsi();
        }
        document.getElementById('cerrarJitsi')?.addEventListener('click', cerrarJitsiDesdeUsuario);
        document.getElementById('jitsiModal')?.addEventListener('click', event => {
          if (event.target?.id === 'jitsiModal') cerrarJitsiDesdeUsuario();
        });
        window.addEventListener('keydown', event => {
          if (event.key !== 'Escape') return;
          if (document.getElementById('configuracionDuracionJitsiModal')?.classList.contains('active')) {
            cerrarConfiguracionDuracionJitsi();
            return;
          }
          if (document.getElementById('selectorJitsiGrupalModal')?.classList.contains('active')) {
            cerrarSelectorJitsiGrupal();
            return;
          }
          if (document.getElementById('historialJitsiModal')?.classList.contains('active')) {
            cerrarHistorialJitsiProfesor();
            return;
          }
          if (document.getElementById('jitsiModal')?.classList.contains('active')) cerrarJitsi();
        });
        window.addEventListener('firebase-auth-changed', actualizarInvitacionJitsiEstudiante);
        window.addEventListener('firebase-teacher-auth-changed', actualizarInvitacionJitsiEstudiante);
        window.addEventListener('estado-cuenta-estudiante', actualizarInvitacionJitsiEstudiante);
        window.addEventListener('jitsi-configuracion-remota', event => aplicarConfiguracionJitsiRemota(event.detail || {}));
        window.addEventListener('focus', actualizarInvitacionJitsiEstudiante);
        window.addEventListener('online', actualizarInvitacionJitsiEstudiante);
        window.addEventListener('pageshow', actualizarInvitacionJitsiEstudiante);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') actualizarInvitacionJitsiEstudiante();
        });
        window.setTimeout(actualizarInvitacionJitsiEstudiante, 0);
        window.setTimeout(iniciarSincronizacionConfiguracionJitsi, 500);
         window.setInterval(() => {
           actualizarInvitacionJitsiEstudiante();
           const modal = document.getElementById('jitsiModal');
           if (modal?.dataset.jitsiRole !== 'student') return;
           const invitacion = obtenerInvitacionJitsi();
           if (!invitacion || (invitacion.expiraEn && fechaJitsiValida(invitacion.expiraEn) <= Date.now())) {
             ocultarAlertaJitsi();
             cerrarJitsi();
           }
         }, 1500);
      })();
