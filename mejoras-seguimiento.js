(function(){
"use strict";
if(window.__mejorasSeguimientoInicializadas)return;
window.__mejorasSeguimientoInicializadas=true;
const VERSION_REQUERIDA="1.3.0";
const CLAVE_TEMA_PANEL_DOCENTE="teacher_panel_theme";
let historialActual=[],estudianteHistorial=null,revisionesActuales=new Map(),salidasSeleccionadas=new Set(),grupoRevisionActual="",filtroRapidoHistorial="";
let historialMensajesDocente=[],detenerHistorialMensajesDocente=null;
const txt=v=>String(v??"").trim();
function leerPreferencia(clave,valorPredeterminado=""){
 try{return localStorage.getItem(clave)??valorPredeterminado}catch{return valorPredeterminado}
}
function guardarPreferencia(clave,valor){
 try{localStorage.setItem(clave,valor);return true}catch{return false}
}
function prefiereMovimientoReducido(){
 return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
}
function desplazarA(elemento,bloque="start"){
 elemento?.scrollIntoView?.({block:bloque,behavior:prefiereMovimientoReducido()?"auto":"smooth"});
}
function actualizarViewportMovil(){
 const viewport=window.visualViewport,alto=Math.round(viewport?.height||window.innerHeight||0);
 if(alto>0)document.documentElement.style.setProperty("--app-viewport-height",`${alto}px`);
 const tecladoAbierto=Boolean(viewport&&window.matchMedia("(max-width: 900px)").matches&&window.innerHeight-viewport.height>140);
 document.body.classList.toggle("mobile-virtual-keyboard-open",tecladoAbierto);
}
function iniciarViewportMovil(){
 actualizarViewportMovil();
 window.visualViewport?.addEventListener("resize",actualizarViewportMovil,{passive:true});
 window.visualViewport?.addEventListener("scroll",actualizarViewportMovil,{passive:true});
 window.addEventListener("orientationchange",actualizarViewportMovil,{passive:true});
 window.addEventListener("pagehide",()=>{
  window.visualViewport?.removeEventListener("resize",actualizarViewportMovil);
  window.visualViewport?.removeEventListener("scroll",actualizarViewportMovil);
  window.removeEventListener("orientationchange",actualizarViewportMovil);
 },{once:true});
}
function duracionLegible(segundos){
 const total=Math.max(0,Math.round(Number(segundos)||0)),horas=Math.floor(total/3600),minutos=Math.floor((total%3600)/60),resto=total%60;
 if(horas)return`${horas} h ${minutos} min`;
 if(minutos)return`${minutos} min ${resto} s`;
 return`${resto} s`;
}
function horaLegible(valor){
 const marca=ms(valor);
 if(!marca)return"Sin hora";
 const fecha=new Date(marca);
 return Number.isFinite(fecha.getTime())?fecha.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"Sin hora";
}
function aplicarTemaPanelDocente(tema){
 const claro=tema==="light";
 document.body.classList.toggle("teacher-light-mode",claro);
 document.body.dataset.teacherTheme=claro?"light":"dark";
 document.querySelectorAll("[data-app-theme-toggle]").forEach(boton=>{
  const accion=claro?"oscuro":"claro",icono=claro?"fa-moon":"fa-sun";
  boton.innerHTML=`<i class="fa-solid ${icono}" aria-hidden="true"></i><span>Modo ${accion}</span>`;
  boton.title=`Cambiar a modo ${accion}`;
  boton.setAttribute("aria-label",`Cambiar a modo ${accion}`);
   boton.setAttribute("aria-pressed",String(claro));
  });
}
function alternarTemaAplicacion(){
 const tema=document.body.classList.contains("teacher-light-mode")?"dark":"light";
 guardarPreferencia(CLAVE_TEMA_PANEL_DOCENTE,tema);
 aplicarTemaPanelDocente(tema);
}
function asegurarTemaAplicacion(){
 const contenedor=document.querySelector("header.top-header>div:last-child");if(!contenedor)return;
 let boton=document.getElementById("btnTemaAplicacion");
 if(!boton){
  boton=document.createElement("button");
  boton.id="btnTemaAplicacion";
  boton.type="button";
  boton.className="btn btn-secondary app-theme-toggle";
  boton.dataset.appThemeToggle="";
  const progreso=contenedor.querySelector(".progress-wrapper");
  progreso?contenedor.insertBefore(boton,progreso):contenedor.appendChild(boton);
   boton.onclick=alternarTemaAplicacion;
   }
  aplicarTemaPanelDocente(leerPreferencia(CLAVE_TEMA_PANEL_DOCENTE)==="light"?"light":"dark");
}
function asegurarTemaPanelDocente(){
 const barra=document.querySelector("#panelProfesorModal .teacher-panel-toolbar");if(!barra)return;
 let boton=document.getElementById("btnTemaPanelDocente");
 if(!boton){
  boton=document.createElement("button");
  boton.id="btnTemaPanelDocente";
  boton.type="button";
  boton.className="btn btn-secondary teacher-theme-toggle";
  boton.dataset.appThemeToggle="";
  const cerrar=barra.querySelector(".teacher-panel-close");
  cerrar?barra.insertBefore(boton,cerrar):barra.appendChild(boton);
  boton.onclick=alternarTemaAplicacion;
 }
 aplicarTemaPanelDocente(leerPreferencia(CLAVE_TEMA_PANEL_DOCENTE)==="light"?"light":"dark");
}
function ms(v){
 if(v?.toMillis)return v.toMillis();
 if(v?.seconds)return Number(v.seconds)*1000;
 if(v instanceof Date)return Number.isFinite(v.getTime())?v.getTime():0;
 if(typeof v==="number")return Number.isFinite(v)&&v>0?v:0;
 const n=Date.parse(v??"");
 return Number.isFinite(n)?n:0;
}
function dominioCoincide(dominio,lista){const d=txt(dominio).toLowerCase().replace(/^www\./,"");return(Array.isArray(lista)?lista:[]).some(x=>{x=txt(x).toLowerCase().replace(/^www\./,"");return x&&(d===x||d.endsWith(`.${x}`))})}
function estadoExtension(d){
 const e=d?.seguimientoExtension||{},c=window.configuracionSeguimientoActual||{},ultimo=ms(e.ultimaSenalEn),edad=ultimo?Math.max(0,(Date.now()-ultimo)/1000):Infinity,aviso=Math.max(15,Number(c.avisoSinConexionSegundos)||30),alerta=Math.max(aviso,Number(c.alertaSinConexionSegundos)||120);
 if(!e.instalada&&!ultimo)return{codigo:"no-instalada",clase:"danger",texto:"No informada",icono:"fa-puzzle-piece",edad};
 if(edad>=alerta)return{codigo:"interrumpida",clase:"danger",texto:"Interrumpida",icono:"fa-plug-circle-xmark",edad};
 if(edad>=aviso)return{codigo:"sin-conexion",clase:"warning",texto:"Sin conexión",icono:"fa-signal",edad};
 if(e.activa===true)return{codigo:"activa",clase:"ok",texto:"Activa",icono:"fa-circle-check",edad};
 return{codigo:"detenida",clase:"warning",texto:"Detenida",icono:"fa-circle-pause",edad};
}
function antiguedad(s){if(!Number.isFinite(s))return"sin señal";if(s<60)return`hace ${Math.round(s)} s`;if(s<3600)return`hace ${Math.floor(s/60)} min`;return`hace ${Math.floor(s/3600)} h`}
function claseDominio(d){
 const c=window.configuracionSeguimientoActual||{};
 if(!d)return{clase:"allowed",texto:"En la actividad",icono:"fa-house"};
 if(dominioCoincide(d,c.dominiosIgnorados))return{clase:"",texto:"Ignorado",icono:"fa-eye-slash"};
 if(dominioCoincide(d,c.dominiosAlerta))return{clase:"danger",texto:"Revisar",icono:"fa-triangle-exclamation"};
 if(dominioCoincide(d,c.dominiosPermitidos))return{clase:"allowed",texto:"Permitido",icono:"fa-circle-check"};
 return{clase:"warning",texto:"Sin clasificar",icono:"fa-circle-question"};
}
function cargarFormulario(c={}){
 const poner=(id,v)=>{const x=document.getElementById(id);if(x&&document.activeElement!==x)x.value=v??""};
 poner("configLimiteSalidas",c.limiteSalidas??5);poner("configDuracionMinima",c.duracionMinimaSegundos??3);poner("configAvisoOffline",c.avisoSinConexionSegundos??30);poner("configAlertaOffline",c.alertaSinConexionSegundos??120);poner("configRetencionDias",c.retencionDias??180);
 poner("configDominiosPermitidos",(c.dominiosPermitidos||[]).join("\n"));poner("configDominiosAlerta",(c.dominiosAlerta||[]).join("\n"));poner("configDominiosIgnorados",(c.dominiosIgnorados||[]).join("\n"));
 const b=document.getElementById("configBloqueoAutomatico");if(b&&document.activeElement!==b)b.checked=c.bloqueoAutomatico!==false;
}
async function guardarConfiguracion(){
 const estado=document.getElementById("estadoConfiguracionSeguimiento"),valor=id=>document.getElementById(id)?.value||"";
 const c={limiteSalidas:Number(valor("configLimiteSalidas"))||5,duracionMinimaSegundos:Number(valor("configDuracionMinima"))||0,avisoSinConexionSegundos:Number(valor("configAvisoOffline"))||30,alertaSinConexionSegundos:Number(valor("configAlertaOffline"))||120,retencionDias:Number(valor("configRetencionDias"))||180,bloqueoAutomatico:document.getElementById("configBloqueoAutomatico")?.checked!==false,dominiosPermitidos:valor("configDominiosPermitidos"),dominiosAlerta:valor("configDominiosAlerta"),dominiosIgnorados:valor("configDominiosIgnorados")};
 if(estado)estado.textContent="Guardando...";
 const ok=await window.guardarConfiguracionSeguimientoFirebase?.(c);
 if(estado){estado.className=`tracking-status-badge ${ok?"ok":"danger"}`;estado.textContent=ok?"Configuración guardada":"No se pudo guardar"}
}
function asegurarPaneles(){
 const filtros=document.getElementById("filtrosPanelProfesor");if(!filtros)return;
 if(!document.getElementById("filtroSeguimientoProfesor")){
  const grupoSeguimiento=filtros.querySelector(".teacher-filter-academic>div")||filtros;
  grupoSeguimiento.insertAdjacentHTML("beforeend",`<label>Extensión<select id="filtroSeguimientoProfesor" aria-label="Filtrar por estado de extensión"><option value="">Todas las extensiones</option><option value="activa">Extensión activa</option><option value="detenida">Seguimiento detenido</option><option value="sin-conexion">Sin conexión</option><option value="interrumpida">Seguimiento interrumpido</option><option value="no-instalada">Sin extensión informada</option></select></label><label>Dominio actual<input id="filtroDominioSeguimientoProfesor" placeholder="Ej.: developer.mozilla.org" aria-label="Filtrar por dominio actual"></label>`);
  document.getElementById("filtroSeguimientoProfesor").addEventListener("change",filtrarTabla);document.getElementById("filtroDominioSeguimientoProfesor").addEventListener("input",filtrarTabla);
 }
 if(!document.getElementById("configuracionSeguimientoProfesor")){
  const p=document.createElement("section");p.id="configuracionSeguimientoProfesor";p.className="tracking-config-panel";
  p.innerHTML=`<div class="tracking-panel-heading"><h4><i class="fa-solid fa-shield-halved"></i> Configuración de seguimiento y bloqueo</h4><span id="estadoConfiguracionSeguimiento" class="tracking-status-badge">Clase actual</span></div><div class="tracking-config-grid">
  <div class="tracking-config-field"><label>Salidas antes del bloqueo<input id="configLimiteSalidas" type="number" min="1" max="50"></label></div><div class="tracking-config-field"><label>Duración mínima (segundos)<input id="configDuracionMinima" type="number" min="0" max="300"></label></div><div class="tracking-config-field"><label>Aviso sin conexión (segundos)<input id="configAvisoOffline" type="number" min="15" max="600"></label></div><div class="tracking-config-field"><label>Interrupción después de (segundos)<input id="configAlertaOffline" type="number" min="60" max="3600"></label></div><div class="tracking-config-field"><label>Conservar historial (días)<input id="configRetencionDias" type="number" min="1" max="3650"></label></div><div class="tracking-config-field"><label><input id="configBloqueoAutomatico" type="checkbox"> Bloqueo automático</label></div>
  <div class="tracking-config-field wide"><label>Dominios permitidos<textarea id="configDominiosPermitidos" placeholder="developer.mozilla.org"></textarea></label></div><div class="tracking-config-field wide"><label>Dominios que generan alerta<textarea id="configDominiosAlerta" placeholder="chatgpt.com"></textarea></label></div><div class="tracking-config-field wide"><label>Dominios ignorados<textarea id="configDominiosIgnorados" placeholder="accounts.google.com"></textarea></label></div></div>
  <div class="tracking-config-actions"><button class="btn btn-primary" id="guardarConfiguracionSeguimiento" type="button"><i class="fa-solid fa-floppy-disk"></i> Guardar configuración</button><button class="btn btn-secondary" id="restaurarConfiguracionSeguimiento" type="button"><i class="fa-solid fa-arrow-rotate-left"></i> Restaurar recomendados</button></div><p class="tracking-config-note"><i class="fa-solid fa-user-shield"></i> Las alertas requieren revisión docente y nunca descuentan puntos automáticamente. No se guarda la URL completa.</p>`;
  filtros.parentNode.insertBefore(p,filtros);document.getElementById("guardarConfiguracionSeguimiento").onclick=guardarConfiguracion;document.getElementById("restaurarConfiguracionSeguimiento").onclick=()=>cargarFormulario({limiteSalidas:5,duracionMinimaSegundos:3,bloqueoAutomatico:true,avisoSinConexionSegundos:30,alertaSinConexionSegundos:120,retencionDias:180});
 }
 if(!document.getElementById("incidenciasSeguimientoProfesor")){const p=document.createElement("section");p.id="incidenciasSeguimientoProfesor";p.className="tracking-incidents-panel";const r=document.getElementById("resumenProfesor");r?.parentNode.insertBefore(p,r)}
 cargarFormulario(window.configuracionSeguimientoActual||{});
 asegurarTemaPanelDocente();
 asegurarPopupLimite();
 asegurarMensajeriaDocente();
 actualizarIndicadorLimite();
 asegurarPestanasPanelDocente();
}
function crearPanelDocente(id,titulo,descripcion){
 const panel=document.createElement("section");panel.id=`teacherWorkspacePanel-${id}`;panel.className="teacher-workspace-panel";panel.dataset.teacherPanel=id;panel.innerHTML=`<div class="teacher-workspace-panel-heading"><div><h3>${titulo}</h3><p>${descripcion}</p></div></div>`;return panel;
}
function asegurarPestanasPanelDocente(){
 const contenido=document.querySelector("#panelProfesorModal .teacher-panel-content");if(!contenido)return;
 if(document.getElementById("teacherWorkspaceTabs")){asegurarCentroMovilDocente();actualizarBadgesPestanas();return}
 const referencias={
  estado:document.getElementById("estadoClaseProfesor"),alerta:document.getElementById("alertaNuevaSolicitud"),solicitudes:document.getElementById("solicitudesPendientesProfesor"),docentes:document.getElementById("cantidadDocentesAutorizados")?.closest("details"),leyenda:contenido.querySelector(".teacher-icon-legend"),config:document.getElementById("configuracionSeguimientoProfesor"),incidencias:document.getElementById("incidenciasSeguimientoProfesor"),resumen:document.getElementById("resumenProfesor"),resumenIA:document.getElementById("resumenConsultasIAProfesor"),filtros:document.getElementById("filtrosPanelProfesor"),tabla:contenido.querySelector(".teacher-table-scroll"),estadoPanel:document.getElementById("estadoPanelProfesor"),tituloFiltros:[...contenido.querySelectorAll(".teacher-section-title")].find(x=>x.textContent.includes("Filtros")),calculo:[...contenido.children].find(x=>x.tagName==="DIV"&&x.textContent.includes("Cómo se calcula"))
 };
 const pestañas=[["resumen","fa-chart-pie","Resumen"],["estudiantes","fa-users","Estudiantes"],["seguimiento","fa-shield-halved","Seguimiento"],["solicitudes","fa-user-clock","Solicitudes"],["docentes","fa-user-shield","Docentes"]];
 const nav=document.createElement("nav");nav.id="teacherWorkspaceTabs";nav.className="teacher-workspace-tabs";nav.setAttribute("aria-label","Secciones del panel docente");nav.innerHTML=pestañas.map(x=>`<button class="teacher-workspace-tab" type="button" data-teacher-tab="${x[0]}" data-tab-label="${x[2]}" data-tooltip="${x[2]} · 0" aria-label="${x[2]}: 0" title="${x[2]}" aria-controls="teacherWorkspacePanel-${x[0]}"><i class="fa-solid ${x[1]}" aria-hidden="true"></i><span>${x[2]}</span><span class="teacher-workspace-tab-count" data-tab-count="${x[0]}">0</span></button>`).join("");
 const paneles={
  resumen:crearPanelDocente("resumen","Resumen general","Estado de la clase, alertas y métricas principales."),
  estudiantes:crearPanelDocente("estudiantes","Estudiantes","Filtros, calificaciones, progreso y acciones individuales."),
  seguimiento:crearPanelDocente("seguimiento","Seguimiento y bloqueo","Límite de salidas, conexión de la extensión, dominios y retención."),
  solicitudes:crearPanelDocente("solicitudes","Solicitudes de acceso","Altas pendientes y aprobación de estudiantes."),
  docentes:crearPanelDocente("docentes","Docentes autorizados","Cuentas que pueden administrar el panel y sus registros.")
 };
 contenido.prepend(nav);Object.values(paneles).forEach(p=>contenido.appendChild(p));
 [referencias.estado,referencias.alerta,referencias.incidencias,referencias.resumen,referencias.resumenIA].filter(Boolean).forEach(x=>paneles.resumen.appendChild(x));
 [referencias.leyenda,referencias.tituloFiltros,referencias.filtros,referencias.calculo,referencias.tabla,referencias.estadoPanel].filter(Boolean).forEach(x=>paneles.estudiantes.appendChild(x));
 [referencias.config].filter(Boolean).forEach(x=>paneles.seguimiento.appendChild(x));
 [referencias.solicitudes].filter(Boolean).forEach(x=>paneles.solicitudes.appendChild(x));
 [referencias.docentes].filter(Boolean).forEach(x=>paneles.docentes.appendChild(x));
 [...contenido.children].filter(x=>x!==nav&&!Object.values(paneles).includes(x)).forEach(x=>paneles.resumen.appendChild(x));
 asegurarCentroMovilDocente(paneles.estudiantes);
 nav.querySelectorAll("[data-teacher-tab]").forEach(b=>b.onclick=()=>{activarPestanaDocente(b.dataset.teacherTab);if(window.matchMedia("(max-width: 900px)").matches){nav.querySelectorAll(".show-mobile-tooltip").forEach(x=>x.classList.remove("show-mobile-tooltip"));b.classList.add("show-mobile-tooltip");clearTimeout(b._tooltipTimer);b._tooltipTimer=setTimeout(()=>b.classList.remove("show-mobile-tooltip"),1600)}});
 activarPestanaDocente(leerPreferencia("teacher_panel_active_tab","resumen"));actualizarBadgesPestanas();
}
function cantidadFiltrosMovilesActivos(){
 const valores={filtroProfesor:"",filtroEmailProfesor:"",filtroCursoProfesor:"",filtroDivisionProfesor:"",filtroTurnoProfesor:"",filtroEstadoProfesor:"",filtroBloqueoProfesor:"",filtroProgresoProfesor:"",filtroSalidasProfesor:"",filtroPortapapelesProfesor:"",filtroNotaProfesor:"",filtroDescuentoProfesor:"",filtroActualizacionProfesor:"",filtroSeguimientoProfesor:"",filtroDominioSeguimientoProfesor:"",ordenProfesor:"actualizacion-desc"};
 return Object.entries(valores).filter(([id,inicial])=>{const control=document.getElementById(id);return control&&String(control.value||"")!==inicial}).length;
}
function estudianteEnLineaMovil(d){
 const actualizado=ms(d?.actualizadoEn);return actualizado>0&&Date.now()-actualizado<120000;
}
function actualizarCentroMovilDocente(){
 const centro=document.getElementById("teacherMobileCommandCenter");if(!centro)return;
 const datos=Array.isArray(estudiantesProfesor)?estudiantesProfesor.filter(d=>d.estadoCuenta!=="pendiente"):[],conteos={
  all:datos.length,
   online:datos.filter(estudianteEnLineaMovil).length,
   alerts:datos.filter(d=>d.__panelMeta?.alerta===true).length,
   blocked:datos.filter(d=>d.pantallaBloqueada===true).length,
   paused:datos.filter(d=>d.controlCronometroIndividual?.pausado===true||d.controlCronometros?.pausado===true).length,
   clipboard:datos.filter(d=>Number(d.__panelMeta?.intentosPortapapeles||0)>0).length
 };
 Object.entries(conteos).forEach(([id,valor])=>{const el=centro.querySelector(`[data-mobile-count="${id}"]`);if(el)el.textContent=String(valor)});
  const estado=document.getElementById("filtroEstadoProfesor")?.value||"",bloqueo=document.getElementById("filtroBloqueoProfesor")?.value||"",portapapeles=document.getElementById("filtroPortapapelesProfesor")?.value||"",activo=bloqueo==="bloqueados"?"blocked":estado==="conectados"?"online":estado==="alertas"?"alerts":estado==="pausados"?"paused":portapapeles==="con-intentos"?"clipboard":"all";
 centro.querySelectorAll("[data-mobile-filter]").forEach(b=>{const seleccionado=b.dataset.mobileFilter===activo;b.classList.toggle("is-active",seleccionado);b.setAttribute("aria-pressed",String(seleccionado))});
 const filas=[...document.querySelectorAll("#tablaProfesorBody>tr:not(.teacher-actions-row)")],visibles=filas.filter(f=>f.style.display!=="none").length,resultado=document.getElementById("teacherMobileResults");
 if(resultado)resultado.innerHTML=`<strong>${visibles}</strong> estudiante${visibles===1?"":"s"} visible${visibles===1?"":"s"}`;
 const cantidad=cantidadFiltrosMovilesActivos(),contador=document.getElementById("teacherMobileAdvancedCount"),boton=document.getElementById("teacherMobileAdvancedToggle");
 if(contador){contador.textContent=String(cantidad);contador.hidden=cantidad===0}
 if(boton)boton.classList.toggle("has-active-filters",cantidad>0);
 const buscar=document.getElementById("teacherMobileSearch"),base=document.getElementById("filtroProfesor"),limpiar=document.getElementById("teacherMobileSearchClear");
 if(buscar&&document.activeElement!==buscar&&base)buscar.value=base.value||"";
 if(limpiar)limpiar.hidden=!buscar?.value;
}
function aplicarFiltroMovilDocente(tipo){
 if(tipo==="incidents"){activarPestanaDocente("seguimiento");return}
  const estado=document.getElementById("filtroEstadoProfesor"),bloqueo=document.getElementById("filtroBloqueoProfesor"),portapapeles=document.getElementById("filtroPortapapelesProfesor");
  if(estado)estado.value="";
  if(bloqueo)bloqueo.value="";
  if(portapapeles)portapapeles.value="";
 if(tipo==="online"&&estado)estado.value="conectados";
 if(tipo==="alerts"&&estado)estado.value="alertas";
  if(tipo==="paused"&&estado)estado.value="pausados";
  if(tipo==="blocked"&&bloqueo)bloqueo.value="bloqueados";
  if(tipo==="clipboard"&&portapapeles)portapapeles.value="con-intentos";
 renderPanelProfesor();
}
function asegurarCentroMovilDocente(panel=null){
 panel=panel||document.getElementById("teacherWorkspacePanel-estudiantes");if(!panel||document.getElementById("teacherMobileCommandCenter"))return;
 const centro=document.createElement("section");centro.id="teacherMobileCommandCenter";centro.className="teacher-mobile-command-center";centro.setAttribute("aria-label","Acciones rápidas del panel docente");
  centro.innerHTML=`<div class="teacher-mobile-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input id="teacherMobileSearch" type="search" inputmode="search" autocomplete="off" placeholder="Buscar estudiante o correo" aria-label="Buscar estudiante o correo"><button id="teacherMobileSearchClear" type="button" aria-label="Limpiar búsqueda" title="Limpiar búsqueda" hidden><i class="fa-solid fa-xmark"></i></button></div><div class="teacher-mobile-filter-chips" aria-label="Filtros rápidos"><button type="button" data-mobile-filter="all"><i class="fa-solid fa-users"></i><span>Todos</span><strong data-mobile-count="all">0</strong></button><button type="button" data-mobile-filter="online"><i class="fa-solid fa-signal"></i><span>En línea</span><strong data-mobile-count="online">0</strong></button><button type="button" data-mobile-filter="alerts"><i class="fa-solid fa-triangle-exclamation"></i><span>Alertas</span><strong data-mobile-count="alerts">0</strong></button><button type="button" data-mobile-filter="blocked"><i class="fa-solid fa-lock"></i><span>Bloqueados</span><strong data-mobile-count="blocked">0</strong></button><button type="button" data-mobile-filter="paused"><i class="fa-solid fa-pause"></i><span>Pausados</span><strong data-mobile-count="paused">0</strong></button><button type="button" data-mobile-filter="clipboard"><i class="fa-solid fa-clipboard-list"></i><span>Portapapeles</span><strong data-mobile-count="clipboard">0</strong></button><button type="button" data-mobile-filter="incidents"><i class="fa-solid fa-shield-halved"></i><span>Seguimiento</span></button></div><div class="teacher-mobile-command-footer"><span id="teacherMobileResults"><strong>0</strong> estudiantes visibles</span><button id="teacherMobileAdvancedToggle" type="button" aria-expanded="false"><i class="fa-solid fa-sliders"></i><span>Filtros avanzados</span><strong id="teacherMobileAdvancedCount" hidden>0</strong></button></div>`;
 panel.querySelector(".teacher-workspace-panel-heading")?.after(centro);
 const buscar=centro.querySelector("#teacherMobileSearch"),base=document.getElementById("filtroProfesor"),limpiar=centro.querySelector("#teacherMobileSearchClear");
 buscar?.addEventListener("input",()=>{if(base)base.value=buscar.value;limpiar.hidden=!buscar.value;renderPanelProfesor()});
 limpiar?.addEventListener("click",()=>{buscar.value="";if(base)base.value="";limpiar.hidden=true;renderPanelProfesor();buscar.focus()});
 centro.querySelectorAll("[data-mobile-filter]").forEach(b=>b.addEventListener("click",()=>aplicarFiltroMovilDocente(b.dataset.mobileFilter)));
 centro.querySelector("#teacherMobileAdvancedToggle")?.addEventListener("click",e=>{const expandido=panel.classList.toggle("mobile-filters-expanded");e.currentTarget.setAttribute("aria-expanded",String(expandido));if(expandido)document.getElementById("filtrosPanelProfesor")?.scrollIntoView({block:"start",behavior:"smooth"})});
 actualizarCentroMovilDocente();
}
function activarPestanaDocente(id){
 const valido=["resumen","estudiantes","seguimiento","solicitudes","docentes"].includes(id)?id:"resumen";document.querySelectorAll(".teacher-workspace-tab").forEach(b=>{const activo=b.dataset.teacherTab===valido;b.classList.toggle("active",activo);b.setAttribute("aria-selected",String(activo));b.tabIndex=activo?0:-1});document.querySelectorAll(".teacher-workspace-panel").forEach(p=>{const activo=p.dataset.teacherPanel===valido;p.classList.toggle("active",activo);p.hidden=!activo});guardarPreferencia("teacher_panel_active_tab",valido);const panel=document.querySelector(`#teacherWorkspacePanel-${valido}`);if(window.matchMedia("(max-width: 900px)").matches){document.getElementById("panelProfesorModal")?.scrollTo({top:0,behavior:"auto"});desplazarA(panel)}else desplazarA(panel);
}
function actualizarBadgesPestanas(){
 const datos=Array.isArray(estudiantesProfesor)?estudiantesProfesor:[],activos=datos.filter(x=>x.estadoCuenta==="activo"),pendientes=datos.filter(x=>x.estadoCuenta==="pendiente").length,problemas=activos.filter(x=>{const e=estadoExtension(x);return x.pantallaBloqueada===true||["sin-conexion","interrumpida","no-instalada"].includes(e.codigo)||claseDominio(x.seguimientoExtension?.dominioActual).clase==="danger"}).length,valores={resumen:problemas,estudiantes:datos.length,seguimiento:problemas,solicitudes:pendientes,docentes:Array.isArray(window.TEACHER_EMAILS)?window.TEACHER_EMAILS.length:0};Object.entries(valores).forEach(([id,n])=>{const x=document.querySelector(`[data-tab-count="${id}"]`),boton=document.querySelector(`[data-teacher-tab="${id}"]`);if(x)x.textContent=String(n);if(boton){const etiqueta=boton.dataset.tabLabel||id;boton.dataset.tooltip=`${etiqueta} · ${n}`;boton.setAttribute("aria-label",`${etiqueta}: ${n}`);boton.title=`${etiqueta}: ${n}`}});
}
function limiteActual(){return Math.max(1,Math.min(50,Number(window.configuracionSeguimientoActual?.limiteSalidas)||5))}
function actualizarIndicadorLimite(valor=limiteActual()){
 const numero=Math.max(1,Math.min(50,Number(valor)||5)),etiqueta=document.getElementById("limiteBloqueoProfesorValor"),campo=document.getElementById("configLimiteSalidas");
 if(etiqueta)etiqueta.textContent=String(numero);
 if(campo&&document.activeElement!==campo)campo.value=String(numero);
}
function asegurarPopupLimite(){
 if(document.getElementById("configurarLimiteBloqueoModal"))return;
 const modal=document.createElement("div");modal.id="configurarLimiteBloqueoModal";modal.className="modal-overlay";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","configurarLimiteBloqueoTitulo");
 modal.innerHTML=`<div class="modal-box tracking-limit-box" tabindex="-1"><div class="tracking-limit-header"><div class="tracking-limit-heading"><span class="tracking-limit-icon"><i class="fa-solid fa-lock"></i></span><div><h3 id="configurarLimiteBloqueoTitulo">Cantidad de salidas para bloquear</h3><p>Elegí cuántas veces puede salir el estudiante antes de que su pantalla quede bloqueada.</p></div></div><button class="btn btn-secondary" id="cerrarLimiteBloqueo" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button></div><div class="tracking-limit-presets" aria-label="Cantidades rápidas">${[3,5,7,10].map(n=>`<button class="btn btn-secondary tracking-limit-preset" type="button" data-limit="${n}">${n} salidas</button>`).join("")}</div><div class="tracking-limit-control"><input id="limiteBloqueoRango" type="range" min="1" max="50" step="1" aria-label="Cantidad de salidas"><input id="limiteBloqueoNumero" type="number" min="1" max="50" step="1" aria-label="Cantidad personalizada"></div><div id="limiteBloqueoPreview" class="tracking-limit-preview"></div><div id="limiteBloqueoError" role="alert" style="display:none;color:#fca5a5;font-size:.78rem;margin-bottom:.65rem"></div><div class="tracking-limit-actions"><button class="btn btn-secondary" id="cancelarLimiteBloqueo" type="button">Cancelar</button><button class="btn btn-warning" id="guardarLimiteBloqueo" type="button"><i class="fa-solid fa-floppy-disk"></i> Guardar límite</button></div></div>`;
 document.body.appendChild(modal);
 const rango=modal.querySelector("#limiteBloqueoRango"),numero=modal.querySelector("#limiteBloqueoNumero"),actualizar=valor=>{valor=Math.max(1,Math.min(50,Number(valor)||1));rango.value=numero.value=String(valor);modal.querySelector("#limiteBloqueoPreview").innerHTML=`<i class="fa-solid fa-shield-halved"></i> La pantalla se bloqueará al alcanzar <strong>${valor} salida${valor===1?"":"s"}</strong>. Después necesitará autorización docente.`;modal.querySelectorAll(".tracking-limit-preset").forEach(b=>b.classList.toggle("is-selected",Number(b.dataset.limit)===valor))};
 rango.addEventListener("input",()=>actualizar(rango.value));numero.addEventListener("input",()=>actualizar(numero.value));modal.querySelectorAll(".tracking-limit-preset").forEach(b=>b.onclick=()=>actualizar(b.dataset.limit));
 const cerrar=()=>modal.classList.remove("active");modal.querySelector("#cerrarLimiteBloqueo").onclick=cerrar;modal.querySelector("#cancelarLimiteBloqueo").onclick=cerrar;modal.addEventListener("click",e=>{if(e.target===modal)cerrar()});
 modal.querySelector("#guardarLimiteBloqueo").onclick=async()=>{
  const valor=Math.max(1,Math.min(50,Number(numero.value)||5)),boton=modal.querySelector("#guardarLimiteBloqueo"),error=modal.querySelector("#limiteBloqueoError"),original=boton.innerHTML;error.style.display="none";boton.disabled=true;boton.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
  const ok=await window.guardarConfiguracionSeguimientoFirebase?.({...window.configuracionSeguimientoActual,limiteSalidas:valor});
  boton.disabled=false;boton.innerHTML=original;
  if(!ok){error.textContent="No se pudo guardar. Verificá la autorización docente y las reglas de Firebase.";error.style.display="block";return}
  window.configuracionSeguimientoActual={...window.configuracionSeguimientoActual,limiteSalidas:valor};actualizarIndicadorLimite(valor);cargarFormulario(window.configuracionSeguimientoActual);cerrar();
 };
 modal._actualizarLimite=actualizar;
}
function abrirConfiguracionLimiteBloqueo(){
 asegurarPopupLimite();const modal=document.getElementById("configurarLimiteBloqueoModal");modal._actualizarLimite?.(limiteActual());modal.querySelector("#limiteBloqueoError").style.display="none";modal.classList.add("active");setTimeout(()=>modal.querySelector("#limiteBloqueoNumero")?.focus(),0);
}
window.abrirConfiguracionLimiteBloqueo=abrirConfiguracionLimiteBloqueo;
function estudiantesActivosMensajeria(){
 return (Array.isArray(estudiantesProfesor)?estudiantesProfesor:[]).filter(d=>d?.uid&&d.estadoCuenta!=="pendiente"&&d.estadoCuenta!=="inactivo");
}
function estudianteEnLineaMensajeria(estudiante){
 return typeof estudianteEnLineaProfesor==="function"?estudianteEnLineaProfesor(estudiante):estudianteEnLineaMovil(estudiante);
}
function claveGrupoMensaje(d){
 const e=d?.estudiante||{};
 return [txt(e.curso),txt(e.division),txt(e.turno)].join("|||");
}
function descripcionGrupoMensaje(clave){
 return String(clave||"").split("|||").filter(Boolean).join(" · ")||"Grupo sin identificar";
}
function actualizarDestinosMensajeria(){
 const modal=document.getElementById("mensajeriaDocenteModal");if(!modal)return;const estudiantes=estudiantesActivosMensajeria(),grupos=new Map();
 estudiantes.forEach(d=>{const clave=claveGrupoMensaje(d);if(!clave.replace(/\|/g,""))return;if(!grupos.has(clave))grupos.set(clave,[]);grupos.get(clave).push(d)});
 const grupo=modal.querySelector("#mensajeDocenteGrupo"),individual=modal.querySelector("#mensajeDocenteEstudiante");
 if(grupo)grupo.innerHTML='<option value="">Seleccionar grupo</option>'+[...grupos.entries()].sort((a,b)=>descripcionGrupoMensaje(a[0]).localeCompare(descripcionGrupoMensaje(b[0]),"es",{numeric:true})).map(([clave,lista])=>`<option value="${escapeHtml(clave)}">${escapeHtml(descripcionGrupoMensaje(clave))} (${lista.length})</option>`).join("");
 if(individual)individual.innerHTML='<option value="">Seleccionar estudiante</option>'+estudiantes.sort((a,b)=>txt(a.estudiante?.nombre||a.nombreGoogle||a.email).localeCompare(txt(b.estudiante?.nombre||b.nombreGoogle||b.email),"es")).map(d=>`<option value="${escapeHtml(d.uid)}">${escapeHtml(d.estudiante?.nombre||d.nombreGoogle||d.email||"Estudiante")} · ${escapeHtml(d.email||"Sin correo")}</option>`).join("");
 actualizarResumenDestinatariosMensaje();
}
function destinatariosMensajeActuales(){
 const modal=document.getElementById("mensajeriaDocenteModal"),estudiantes=estudiantesActivosMensajeria(),tipo=modal?.dataset.scope||"todos",soloEnLinea=modal?.querySelector("#mensajeDocenteSoloEnLinea")?.checked===true;
 if(tipo==="grupo"){const clave=modal.querySelector("#mensajeDocenteGrupo")?.value||"";const grupo=estudiantes.filter(d=>claveGrupoMensaje(d)===clave);return soloEnLinea?grupo.filter(estudianteEnLineaMensajeria):grupo}
 if(tipo==="individual"){const uid=modal.querySelector("#mensajeDocenteEstudiante")?.value||"";return estudiantes.filter(d=>d.uid===uid)}
 return soloEnLinea?estudiantes.filter(estudianteEnLineaMensajeria):estudiantes;
}
function actualizarResumenDestinatariosMensaje(){
 const modal=document.getElementById("mensajeriaDocenteModal");if(!modal)return;const tipo=modal.dataset.scope||"todos",destinatarios=destinatariosMensajeActuales(),resumen=modal.querySelector("#mensajeDocenteDestinatariosResumen");
 modal.querySelector(".teacher-message-group-field").hidden=tipo!=="grupo";modal.querySelector(".teacher-message-student-field").hidden=tipo!=="individual";
 modal.querySelectorAll("[data-message-scope]").forEach(b=>{const activo=b.dataset.messageScope===tipo;b.classList.toggle("active",activo);b.setAttribute("aria-pressed",String(activo))});
 if(resumen){const nombres=destinatarios.slice(0,4).map(item=>item.estudiante?.nombre||item.nombreGoogle||item.email||"Estudiante"),restantes=Math.max(0,destinatarios.length-nombres.length);resumen.innerHTML=`<div class="teacher-message-audience-main"><i class="fa-solid fa-users"></i><span>Destinatarios seleccionados</span><strong>${destinatarios.length}</strong></div>${nombres.length?`<div class="teacher-message-audience-preview">${nombres.map(nombre=>`<span>${escapeHtml(nombre)}</span>`).join("")}${restantes?`<span>+${restantes} más</span>`:""}</div>`:'<small>No hay destinatarios disponibles con este filtro.</small>'}`}
}
function activarVistaMensajeria(vista="redactar"){
 const modal=document.getElementById("mensajeriaDocenteModal");if(!modal)return;const elegida=vista==="seguimiento"?"seguimiento":"redactar";modal.dataset.messageView=elegida;modal.querySelectorAll("[data-message-view]").forEach(boton=>{const activo=boton.dataset.messageView===elegida;boton.classList.toggle("active",activo);boton.setAttribute("aria-selected",String(activo))});modal.querySelector(".teacher-message-compose").hidden=elegida!=="redactar";modal.querySelector(".teacher-message-history").hidden=elegida!=="seguimiento";if(elegida==="seguimiento")void iniciarHistorialMensajesDocente();
}
function mensajesCompatiblesDocente(){
 return estudiantesActivosMensajeria().map(item=>item?.mensajeDocenteActual).filter(item=>item?.id).map(item=>({...item,canal:"documento-estudiante"}));
}
function nombreDestinatarioMensaje(uid){
 const item=estudiantesActivosMensajeria().find(estudiante=>estudiante.uid===uid);
 return item?.estudiante?.nombre||item?.nombreGoogle||item?.email||uid||"Estudiante";
}
function estadoEntregaMensaje(item){
 if(item?.leido===true)return{clave:"leido",texto:"Leído",icono:"fa-circle-check",fecha:item.leidoEn};
 if(item?.recibido===true)return{clave:"recibido",texto:"Recibido",icono:"fa-mobile-screen-button",fecha:item.recibidoEn};
 return{clave:"enviado",texto:"Enviado",icono:"fa-paper-plane",fecha:item?.enviadoEn};
}
function renderHistorialMensajesDocente(){
 const lista=document.getElementById("historialMensajesDocenteLista"),resumen=document.getElementById("historialMensajesDocenteResumen");if(!lista||!resumen)return;
 const unicos=new Map();[...historialMensajesDocente,...mensajesCompatiblesDocente()].forEach(item=>{if(!item?.id||!item?.estudianteUid)return;const clave=`${item.id}|||${item.estudianteUid}`,anterior=unicos.get(clave);if(!anterior||item.canal==="personal")unicos.set(clave,item)});
 const grupos=new Map();unicos.forEach(item=>{if(!grupos.has(item.id))grupos.set(item.id,[]);grupos.get(item.id).push(item)});
 const ordenados=[...grupos.values()].sort((a,b)=>ms(b[0]?.enviadoEn)-ms(a[0]?.enviadoEn)).slice(0,40),copias=[...unicos.values()],recibidos=copias.filter(item=>item.recibido===true||item.leido===true).length,leidos=copias.filter(item=>item.leido===true).length;
 resumen.innerHTML=`<span><i class="fa-solid fa-paper-plane"></i><strong>${copias.length}</strong> enviados</span><span><i class="fa-solid fa-mobile-screen-button"></i><strong>${recibidos}</strong> recibidos</span><span><i class="fa-solid fa-circle-check"></i><strong>${leidos}</strong> leídos</span>`;
 if(!ordenados.length){lista.innerHTML='<div class="teacher-message-history-empty"><i class="fa-solid fa-inbox"></i><span>Todavía no hay mensajes enviados.</span></div>';return}
 lista.innerHTML=ordenados.map(copiasMensaje=>{const base=copiasMensaje[0],total=copiasMensaje.length,cantidadRecibida=copiasMensaje.filter(item=>item.recibido===true||item.leido===true).length,cantidadLeida=copiasMensaje.filter(item=>item.leido===true).length,urgente=base.prioridad==="urgente";return`<details class="teacher-message-history-item"><summary><div class="teacher-message-history-main"><strong>${escapeHtml(base.asunto||"Mensaje del docente")}</strong><small>${escapeHtml(base.destinoDescripcion||"Destinatarios")} · ${escapeHtml(new Date(ms(base.enviadoEn)||Date.now()).toLocaleString("es-AR"))}</small></div><div class="teacher-message-history-counts"><span class="sent" title="Enviados"><i class="fa-solid fa-paper-plane"></i>${total}</span><span class="received" title="Recibidos"><i class="fa-solid fa-mobile-screen-button"></i>${cantidadRecibida}</span><span class="read" title="Leídos"><i class="fa-solid fa-circle-check"></i>${cantidadLeida}</span>${urgente?'<span class="urgent" title="Urgente"><i class="fa-solid fa-triangle-exclamation"></i></span>':""}</div></summary><p>${escapeHtml(base.contenido||"")}</p><div class="teacher-message-recipient-list">${copiasMensaje.sort((a,b)=>nombreDestinatarioMensaje(a.estudianteUid).localeCompare(nombreDestinatarioMensaje(b.estudianteUid),"es")).map(item=>{const estado=estadoEntregaMensaje(item),fecha=ms(estado.fecha);return`<div class="teacher-message-recipient"><span class="teacher-message-recipient-name">${escapeHtml(nombreDestinatarioMensaje(item.estudianteUid))}</span><span class="teacher-message-delivery ${estado.clave}"><i class="fa-solid ${estado.icono}"></i>${estado.texto}</span><small>${fecha?escapeHtml(new Date(fecha).toLocaleString("es-AR")):"Pendiente de conexión"}</small></div>`}).join("")}</div></details>`}).join("");
}
async function iniciarHistorialMensajesDocente(){
 if(detenerHistorialMensajesDocente){detenerHistorialMensajesDocente();detenerHistorialMensajesDocente=null}
 const lista=document.getElementById("historialMensajesDocenteLista");if(lista)lista.innerHTML='<div class="teacher-message-history-empty"><i class="fa-solid fa-spinner fa-spin"></i><span>Cargando estados...</span></div>';
 const detener=await window.escucharHistorialMensajesDocenteFirebase?.(mensajes=>{historialMensajesDocente=Array.isArray(mensajes)?mensajes:[];renderHistorialMensajesDocente()});
 if(!detener&&lista){renderHistorialMensajesDocente();if(!historialMensajesDocente.length&&!mensajesCompatiblesDocente().length)lista.innerHTML='<div class="teacher-message-history-empty is-warning"><i class="fa-solid fa-user-lock"></i><div><strong>Seguimiento no conectado</strong><span>Ingresá al panel con una cuenta docente autorizada para consultar los estados.</span></div></div>'}
 if(document.getElementById("mensajeriaDocenteModal")?.classList.contains("active"))detenerHistorialMensajesDocente=typeof detener==="function"?detener:null;else if(typeof detener==="function")detener();
}
function cerrarMensajeriaDocente(){
 document.getElementById("mensajeriaDocenteModal")?.classList.remove("active");if(detenerHistorialMensajesDocente){detenerHistorialMensajesDocente();detenerHistorialMensajesDocente=null}
}
function aplicarPlantillaMensajeDocente(tipo){
 const modal=document.getElementById("mensajeriaDocenteModal");if(!modal)return;const minutos=Math.max(1,Math.min(180,Number(modal.querySelector("#mensajeDocenteMinutos")?.value)||10)),plantillas={
  pausa:{asunto:"Pausa de la actividad",contenido:"Hacé una pausa en la actividad y esperá nuevas indicaciones. No cierres la página ni cambies de pestaña.",prioridad:"normal"},
  consigna:{asunto:"Cambio de consigna",contenido:"Atención: se realizó un cambio en la consigna. Volvé a leer las indicaciones del desafío antes de continuar y consultá si tenés dudas.",prioridad:"normal"},
  tiempo:{asunto:`Quedan ${minutos} minutos`,contenido:`Quedan ${minutos} minutos para finalizar esta etapa. Guardá tu avance, ejecutá las pruebas necesarias y revisá tu entrega antes de enviarla.`,prioridad:minutos<=5?"urgente":"normal"},
  atencion:{asunto:"Llamado de atención",contenido:"Necesito que vuelvas a concentrarte en la actividad indicada. Revisá la consigna y continuá trabajando en el desafío asignado.",prioridad:"urgente"}
 },plantilla=plantillas[tipo];if(!plantilla)return;
 modal.querySelector("#mensajeDocenteAsunto").value=plantilla.asunto;modal.querySelector("#mensajeDocenteContenido").value=plantilla.contenido;modal.querySelector("#mensajeDocenteCaracteres").textContent=String(plantilla.contenido.length);const prioridad=modal.querySelector(`input[name="mensajeDocentePrioridad"][value="${plantilla.prioridad}"]`);if(prioridad)prioridad.checked=true;modal.querySelectorAll("[data-message-template]").forEach(b=>b.classList.toggle("active",b.dataset.messageTemplate===tipo));modal.querySelector("#mensajeDocenteEstado").className="teacher-message-status";modal.querySelector("#mensajeDocenteEstado").textContent="Plantilla aplicada. Podés editarla antes de enviar.";modal.querySelector("#mensajeDocenteContenido").focus();
}
function asegurarMensajeriaDocente(){
 if(document.getElementById("mensajeriaDocenteModal"))return;
 const modal=document.createElement("div");modal.id="mensajeriaDocenteModal";modal.className="modal-overlay";modal.dataset.scope="todos";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");modal.setAttribute("aria-labelledby","mensajeriaDocenteTitulo");
 modal.innerHTML=`<div class="modal-box teacher-message-box" tabindex="-1"><div class="teacher-message-header"><div class="teacher-message-heading"><span><i class="fa-solid fa-bullhorn"></i></span><div><h3 id="mensajeriaDocenteTitulo">Enviar mensaje en pantalla</h3><p>El estudiante deberá confirmar que leyó el aviso.</p></div></div><button class="btn btn-secondary teacher-message-close" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button></div><div class="teacher-message-scope" role="group" aria-label="Destinatarios"><button type="button" data-message-scope="todos" class="active" aria-pressed="true"><i class="fa-solid fa-users"></i><span>Todos</span></button><button type="button" data-message-scope="grupo" aria-pressed="false"><i class="fa-solid fa-people-group"></i><span>Grupo</span></button><button type="button" data-message-scope="individual" aria-pressed="false"><i class="fa-solid fa-user"></i><span>Estudiante</span></button></div><div class="teacher-message-form"><label class="teacher-message-group-field" hidden>Curso, división y turno<select id="mensajeDocenteGrupo"><option value="">Seleccionar grupo</option></select></label><label class="teacher-message-student-field" hidden>Estudiante<select id="mensajeDocenteEstudiante"><option value="">Seleccionar estudiante</option></select></label><label>Asunto<input id="mensajeDocenteAsunto" maxlength="120" placeholder="Ej.: Indicaciones para la actividad"></label><label class="wide">Mensaje<textarea id="mensajeDocenteContenido" maxlength="1000" placeholder="Escribí un mensaje claro y breve para mostrar en pantalla."></textarea><small><span id="mensajeDocenteCaracteres">0</span>/1000 caracteres</small></label><fieldset class="wide teacher-message-priority"><legend>Prioridad</legend><label><input type="radio" name="mensajeDocentePrioridad" value="normal" checked><span><i class="fa-solid fa-circle-info"></i> Normal</span></label><label><input type="radio" name="mensajeDocentePrioridad" value="urgente"><span><i class="fa-solid fa-triangle-exclamation"></i> Urgente</span></label></fieldset></div><div id="mensajeDocenteDestinatariosResumen" class="teacher-message-audience"></div><div id="mensajeDocenteEstado" class="teacher-message-status" role="status"></div><div class="teacher-message-actions"><button class="btn btn-secondary" id="cancelarMensajeDocente" type="button">Cerrar</button><button class="btn btn-primary" id="enviarMensajeDocente" type="button"><i class="fa-solid fa-paper-plane"></i> Enviar mensaje</button></div><section class="teacher-message-history" aria-labelledby="historialMensajesDocenteTitulo"><div class="teacher-message-history-header"><div><strong id="historialMensajesDocenteTitulo"><i class="fa-solid fa-clock-rotate-left"></i> Seguimiento de mensajes</strong><small>Estado actualizado por cada destinatario.</small></div><button class="btn btn-secondary" id="actualizarHistorialMensajesDocente" type="button" title="Reconectar actualización de estados"><i class="fa-solid fa-rotate"></i><span>Actualizar</span></button></div><div id="historialMensajesDocenteResumen" class="teacher-message-history-summary"></div><div id="historialMensajesDocenteLista" class="teacher-message-history-list"></div></section></div>`;
 document.body.appendChild(modal);modal.querySelector(".teacher-message-form").insertAdjacentHTML("beforebegin",`<section class="teacher-message-templates" aria-labelledby="mensajePlantillasTitulo"><div class="teacher-message-templates-heading"><div><strong id="mensajePlantillasTitulo"><i class="fa-solid fa-bolt"></i> Mensajes rápidos</strong><span>Completan el formulario y se pueden editar.</span></div><label title="Minutos utilizados por la plantilla de tiempo restante"><span>Minutos</span><input id="mensajeDocenteMinutos" type="number" min="1" max="180" value="10" aria-label="Minutos restantes"></label></div><div class="teacher-message-template-grid"><button type="button" data-message-template="pausa"><i class="fa-solid fa-mug-hot"></i><span><strong>Pausa</strong><small>Detener y esperar</small></span></button><button type="button" data-message-template="consigna"><i class="fa-solid fa-pen-to-square"></i><span><strong>Cambio de consigna</strong><small>Releer indicaciones</small></span></button><button type="button" data-message-template="tiempo"><i class="fa-solid fa-hourglass-half"></i><span><strong>Tiempo restante</strong><small>Usa los minutos elegidos</small></span></button><button type="button" data-message-template="atencion"><i class="fa-solid fa-triangle-exclamation"></i><span><strong>Llamado de atención</strong><small>Prioridad urgente</small></span></button></div></section>`);modal.querySelector(".teacher-message-close").onclick=cerrarMensajeriaDocente;modal.querySelector("#cancelarMensajeDocente").onclick=cerrarMensajeriaDocente;modal.onclick=e=>{if(e.target===modal)cerrarMensajeriaDocente()};
 const box=modal.querySelector(".teacher-message-box"),history=modal.querySelector(".teacher-message-history"),compose=document.createElement("section");compose.className="teacher-message-compose";compose.setAttribute("aria-label","Redactar mensaje");box.querySelector(".teacher-message-header").insertAdjacentHTML("afterend",`<nav class="teacher-message-view-tabs" role="tablist" aria-label="Vistas de mensajería"><button type="button" data-message-view="redactar" class="active" role="tab" aria-selected="true"><i class="fa-solid fa-pen"></i><span>Redactar</span></button><button type="button" data-message-view="seguimiento" role="tab" aria-selected="false"><i class="fa-solid fa-chart-simple"></i><span>Seguimiento</span></button></nav>`);box.insertBefore(compose,history);[".teacher-message-scope",".teacher-message-templates",".teacher-message-form",".teacher-message-audience",".teacher-message-status",".teacher-message-actions"].forEach(selector=>{const elemento=box.querySelector(selector);if(elemento)compose.appendChild(elemento)});history.hidden=true;
 const filtroEnLinea=document.createElement("label");filtroEnLinea.className="teacher-message-online-filter";filtroEnLinea.innerHTML='<input id="mensajeDocenteSoloEnLinea" type="checkbox"><span><i class="fa-solid fa-signal"></i> Solo estudiantes en línea</span>';compose.insertBefore(filtroEnLinea,compose.querySelector(".teacher-message-templates"));
 modal.querySelectorAll("[data-message-view]").forEach(boton=>boton.onclick=()=>activarVistaMensajeria(boton.dataset.messageView));
 modal.querySelectorAll("[data-message-template]").forEach(b=>b.onclick=()=>aplicarPlantillaMensajeDocente(b.dataset.messageTemplate));
 modal.querySelector("#mensajeDocenteMinutos").onchange=()=>{const activo=modal.querySelector('[data-message-template="tiempo"].active');if(activo)aplicarPlantillaMensajeDocente("tiempo")};
 modal.querySelectorAll("[data-message-scope]").forEach(b=>b.onclick=()=>{modal.dataset.scope=b.dataset.messageScope;const filtro=modal.querySelector("#mensajeDocenteSoloEnLinea");if(filtro){filtro.disabled=b.dataset.messageScope==="individual";filtro.closest(".teacher-message-online-filter")?.classList.toggle("is-disabled",filtro.disabled)}actualizarResumenDestinatariosMensaje()});
 modal.querySelector("#mensajeDocenteGrupo").onchange=actualizarResumenDestinatariosMensaje;modal.querySelector("#mensajeDocenteEstudiante").onchange=actualizarResumenDestinatariosMensaje;modal.querySelector("#mensajeDocenteSoloEnLinea").onchange=actualizarResumenDestinatariosMensaje;
 modal.querySelector("#mensajeDocenteContenido").oninput=e=>modal.querySelector("#mensajeDocenteCaracteres").textContent=String(e.target.value.length);
 modal.querySelector("#enviarMensajeDocente").onclick=enviarMensajeDesdePanelDocente;
 modal.querySelector("#actualizarHistorialMensajesDocente").onclick=iniciarHistorialMensajesDocente;
}
function abrirMensajeriaDocente(uid=""){
 asegurarMensajeriaDocente();const modal=document.getElementById("mensajeriaDocenteModal");actualizarDestinosMensajeria();modal.dataset.scope=uid?"individual":"todos";const filtro=modal.querySelector("#mensajeDocenteSoloEnLinea");if(filtro){filtro.checked=false;filtro.disabled=Boolean(uid);filtro.closest(".teacher-message-online-filter")?.classList.toggle("is-disabled",Boolean(uid))}if(uid)modal.querySelector("#mensajeDocenteEstudiante").value=uid;modal.querySelector("#mensajeDocenteEstado").textContent="";modal.querySelectorAll("[data-message-template]").forEach(b=>b.classList.remove("active"));actualizarResumenDestinatariosMensaje();activarVistaMensajeria("redactar");modal.classList.add("active");setTimeout(()=>modal.querySelector(uid?"#mensajeDocenteContenido":"#mensajeDocenteAsunto")?.focus(),0);
}
window.abrirMensajeriaDocente=abrirMensajeriaDocente;
async function enviarMensajeDesdePanelDocente(){
 const modal=document.getElementById("mensajeriaDocenteModal"),boton=modal.querySelector("#enviarMensajeDocente"),estado=modal.querySelector("#mensajeDocenteEstado"),tipo=modal.dataset.scope||"todos",destinatarios=destinatariosMensajeActuales(),asunto=txt(modal.querySelector("#mensajeDocenteAsunto").value),contenido=txt(modal.querySelector("#mensajeDocenteContenido").value),prioridad=modal.querySelector('input[name="mensajeDocentePrioridad"]:checked')?.value||"normal";
 if(!destinatarios.length){estado.className="teacher-message-status danger";estado.textContent="Seleccioná al menos un destinatario.";return}
 if(!contenido){estado.className="teacher-message-status danger";estado.textContent="Escribí el mensaje que querés enviar.";modal.querySelector("#mensajeDocenteContenido").focus();return}
 const destinoDescripcion=tipo==="todos"?"Toda la clase":tipo==="grupo"?descripcionGrupoMensaje(modal.querySelector("#mensajeDocenteGrupo").value):(destinatarios[0]?.estudiante?.nombre||destinatarios[0]?.email||"Estudiante");
 const confirmado=confirm(`Se enviará un mensaje ${prioridad} a ${destinatarios.length} estudiante${destinatarios.length===1?"":"s"} (${destinoDescripcion}). ¿Continuar?`);if(!confirmado)return;
 const original=boton.innerHTML;boton.disabled=true;boton.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';estado.className="teacher-message-status";estado.textContent="Distribuyendo el aviso...";
 const resultado=await window.enviarMensajeDocenteFirebase?.(destinatarios.map(d=>d.uid),{tipoDestino:tipo,destinoDescripcion,asunto,contenido,prioridad})||{ok:false,enviados:0};boton.disabled=false;boton.innerHTML=original;
 if(!resultado.ok){const error=window.ultimoErrorMensajeDocente||{},codigo=txt(error.code),detalle=txt(error.message);estado.className="teacher-message-status danger";estado.innerHTML=`<strong>No se pudo enviar el mensaje${codigo?` (${escapeHtml(codigo)})`:""}.</strong>${detalle?`<span>${escapeHtml(detalle)}</span>`:""}<span>${codigo.includes("permission-denied")?"Publicá REGLAS.TXT en Firestore y verificá que el docente esté activo.":"Revisá la sesión docente, los destinatarios y la conexión."}</span>`;return}
 estado.className="teacher-message-status success";estado.innerHTML=`<i class="fa-solid fa-circle-check"></i> Mensaje enviado a <strong>${resultado.enviados}</strong> estudiante${resultado.enviados===1?"":"s"}.${resultado.modoCompatibilidad?' <span>Se utilizó el canal compatible.</span>':""}`;modal.querySelector("#mensajeDocenteAsunto").value="";modal.querySelector("#mensajeDocenteContenido").value="";modal.querySelector("#mensajeDocenteCaracteres").textContent="0";modal.querySelectorAll("[data-message-template]").forEach(b=>b.classList.remove("active"));activarVistaMensajeria("seguimiento");
}
let mensajesDocentePendientes=[],mensajeDocenteVisible=null;
function idsMensajesCompatiblesLeidos(){
 try{const datos=JSON.parse(localStorage.getItem("app_mensajes_docente_compatibles_leidos")||"[]");return Array.isArray(datos)?datos.map(String):[]}catch{return[]}
}
function marcarMensajeCompatibleLeido(id){
 const ids=[String(id),...idsMensajesCompatiblesLeidos().filter(item=>item!==String(id))].slice(0,100);try{localStorage.setItem("app_mensajes_docente_compatibles_leidos",JSON.stringify(ids))}catch{}
}
function asegurarAvisoMensajeDocente(){
 if(document.getElementById("mensajeDocentePantalla"))return;const overlay=document.createElement("div");overlay.id="mensajeDocentePantalla";overlay.className="teacher-screen-message";overlay.setAttribute("role","alertdialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","mensajeDocentePantallaTitulo");overlay.hidden=true;
 overlay.innerHTML=`<div class="teacher-screen-message-box" tabindex="-1"><div class="teacher-screen-message-icon"><i class="fa-solid fa-bullhorn"></i></div><div class="teacher-screen-message-content"><div class="teacher-screen-message-meta"><span id="mensajeDocentePantallaPrioridad">Mensaje del docente</span><span id="mensajeDocentePantallaCantidad"></span></div><h2 id="mensajeDocentePantallaTitulo">Mensaje del docente</h2><p id="mensajeDocentePantallaTexto"></p><small id="mensajeDocentePantallaFecha"></small><div id="mensajeDocentePantallaEstado" class="teacher-screen-message-status" role="status"></div><button class="btn btn-primary" id="confirmarMensajeDocentePantalla" type="button"><i class="fa-solid fa-check"></i> Entendido</button></div></div>`;document.body.appendChild(overlay);overlay.querySelector("#confirmarMensajeDocentePantalla").onclick=confirmarLecturaMensajeDocente;
}
function mostrarSiguienteMensajeDocente(){
 asegurarAvisoMensajeDocente();const overlay=document.getElementById("mensajeDocentePantalla");if(mensajeDocenteVisible||!mensajesDocentePendientes.length){if(!mensajeDocenteVisible)overlay.hidden=true;return}
 mensajeDocenteVisible=mensajesDocentePendientes[0];const urgente=mensajeDocenteVisible.prioridad==="urgente";overlay.classList.toggle("urgent",urgente);overlay.hidden=false;overlay.querySelector("#mensajeDocentePantallaPrioridad").textContent=urgente?"Aviso urgente del docente":"Mensaje del docente";overlay.querySelector("#mensajeDocentePantallaTitulo").textContent=mensajeDocenteVisible.asunto||"Mensaje del docente";overlay.querySelector("#mensajeDocentePantallaTexto").textContent=mensajeDocenteVisible.contenido||"";overlay.querySelector("#mensajeDocentePantallaCantidad").textContent=mensajesDocentePendientes.length>1?`${mensajesDocentePendientes.length} mensajes pendientes`:"";const fecha=ms(mensajeDocenteVisible.enviadoEn);overlay.querySelector("#mensajeDocentePantallaFecha").textContent=`Enviado por ${mensajeDocenteVisible.docente||"Docente autorizado"}${fecha?` · ${new Date(fecha).toLocaleString("es-AR")}`:""}`;overlay.querySelector("#mensajeDocentePantallaEstado").textContent="";setTimeout(()=>overlay.querySelector("#confirmarMensajeDocentePantalla")?.focus(),0);
}
async function confirmarLecturaMensajeDocente(){
 if(!mensajeDocenteVisible)return;const overlay=document.getElementById("mensajeDocentePantalla"),boton=overlay.querySelector("#confirmarMensajeDocentePantalla"),estado=overlay.querySelector("#mensajeDocentePantallaEstado"),original=boton.innerHTML;boton.disabled=true;boton.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Confirmando...';const compatible=mensajeDocenteVisible.canal==="documento-estudiante",ok=compatible?await window.marcarMensajeDocenteCompatibleFirebase?.(mensajeDocenteVisible,"leido"):await window.marcarMensajeDocenteLeidoFirebase?.(mensajeDocenteVisible);boton.disabled=false;boton.innerHTML=original;if(!ok){estado.textContent="No se pudo confirmar la lectura. Revisá la conexión e intentá nuevamente.";return}if(compatible)marcarMensajeCompatibleLeido(mensajeDocenteVisible.id);mensajesDocentePendientes=mensajesDocentePendientes.filter(m=>m.id!==mensajeDocenteVisible.id);mensajeDocenteVisible=null;overlay.hidden=true;mostrarSiguienteMensajeDocente();
}
window.addEventListener("mensajes-docente-estudiante",evento=>{if(esSesionDocenteActual())return;const recibidos=Array.isArray(evento.detail)?evento.detail:[],actualId=mensajeDocenteVisible?.id||"";mensajesDocentePendientes=recibidos.filter(m=>m.id!==actualId);if(mensajeDocenteVisible)mensajesDocentePendientes.unshift(mensajeDocenteVisible);mostrarSiguienteMensajeDocente()});
function recibirMensajeDocenteCompatible(mensaje={}){
 if(esSesionDocenteActual())return;const user=window.firebaseCurrentUser;if(!user||!mensaje.id||mensaje.estudianteUid!==user.uid||idsMensajesCompatiblesLeidos().includes(String(mensaje.id)))return;if(mensaje.recibido!==true)void window.marcarMensajeDocenteCompatibleFirebase?.(mensaje,"recibido");if(mensajeDocenteVisible?.id===mensaje.id||mensajesDocentePendientes.some(item=>item.id===mensaje.id))return;mensajesDocentePendientes.push({...mensaje,canal:"documento-estudiante"});mostrarSiguienteMensajeDocente();
}
window.addEventListener("mensaje-docente-compatible",evento=>recibirMensajeDocenteCompatible(evento.detail||{}));
if(window.ultimoMensajeDocenteCompatible)setTimeout(()=>recibirMensajeDocenteCompatible(window.ultimoMensajeDocenteCompatible),0);
function renderIncidencias(){
 const panel=document.getElementById("incidenciasSeguimientoProfesor");if(!panel||!Array.isArray(estudiantesProfesor))return;
 const activos=estudiantesProfesor.filter(x=>x.estadoCuenta==="activo"),items=activos.map(estudiante=>{
  const estado=estadoExtension(estudiante),ext=estudiante.seguimientoExtension||{},dominio=txt(ext.dominioActual),clasificacion=claseDominio(dominio),problemas=[];
  if(["interrumpida","no-instalada","sin-conexion"].includes(estado.codigo))problemas.push(estado.texto);
  if(clasificacion.clase==="danger")problemas.push(`Dominio en alerta: ${dominio}`);
  if(estudiante.pantallaBloqueada===true)problemas.push("Pantalla bloqueada");
  if(Number(ext.pendientes||0)>0)problemas.push(`${ext.pendientes} evento(s) pendiente(s)`);
  return{estudiante,problemas};
 }).filter(x=>x.problemas.length);
 const contar=fn=>activos.filter(fn).length;
 panel.innerHTML=`<div class="tracking-panel-heading"><h4><i class="fa-solid fa-triangle-exclamation"></i> Incidencias de seguimiento</h4><span>${items.length} requieren revisión</span></div><div class="tracking-incidents-summary">
 <div class="tracking-incident-stat"><small>Bloqueados</small><strong>${contar(x=>x.pantallaBloqueada===true)}</strong></div><div class="tracking-incident-stat"><small>Sin conexión</small><strong>${contar(x=>["sin-conexion","interrumpida"].includes(estadoExtension(x).codigo))}</strong></div><div class="tracking-incident-stat"><small>Sin extensión</small><strong>${contar(x=>estadoExtension(x).codigo==="no-instalada")}</strong></div><div class="tracking-incident-stat"><small>Dominios en alerta</small><strong>${contar(x=>claseDominio(x.seguimientoExtension?.dominioActual).clase==="danger")}</strong></div></div>
 <div class="tracking-incident-list">${items.slice(0,20).map(x=>{const n=x.estudiante.estudiante?.nombre||x.estudiante.nombreGoogle||x.estudiante.email||"Estudiante",grave=x.problemas.some(t=>/Interrumpida|No informada|bloqueada|Dominio/.test(t));return`<div class="tracking-incident-item ${grave?"danger":""}"><strong>${escapeHtml(n)}</strong><span>${x.problemas.map(escapeHtml).join(" · ")}</span></div>`}).join("")||'<p style="color:var(--text-muted);margin:0">No hay incidencias de seguimiento.</p>'}</div>`;
}
function mejorarTablaSeguimientoLegacy(){
 const tabla=document.querySelector("#tablaProfesorBody")?.closest("table"),head=tabla?.querySelector("thead tr");if(!head)return;
 if(!head.querySelector('[data-tracking-column]'))head.insertAdjacentHTML("beforeend",'<th data-tracking-column="status">Seguimiento</th><th data-tracking-column="visit">Visita actual</th>');
 [...document.querySelectorAll("#tablaProfesorBody>tr.teacher-actions-row td")].forEach(celda=>celda.colSpan=15);
 [...document.querySelectorAll("#tablaProfesorBody>tr:not(.teacher-actions-row)")].forEach(fila=>{
  if(fila.querySelector("[data-tracking-cell]"))return;
  if(fila.children.length===1){fila.firstElementChild.colSpan=15;return}
  const email=txt(fila.children[3]?.textContent).toLowerCase(),d=estudiantesProfesor.find(x=>txt(x.email).toLowerCase()===email);if(!d)return;
  const ext=d.seguimientoExtension||{},estado=estadoExtension(d),status=document.createElement("td"),visit=document.createElement("td"),dominio=txt(ext.dominioActual),clasificacion=claseDominio(dominio),vieja=ext.version&&ext.version!==VERSION_REQUERIDA;
  status.dataset.trackingCell="status";status.dataset.label="Seguimiento";status.innerHTML=`<span class="tracking-status-badge ${estado.clase}"><i class="fa-solid ${estado.icono}"></i> ${escapeHtml(estado.texto)}</span><span class="tracking-cell-detail">${escapeHtml(antiguedad(estado.edad))} · v${escapeHtml(ext.version||"sin dato")}${vieja?` · actualizar a ${VERSION_REQUERIDA}`:""}</span>${Number(ext.pendientes||0)?`<span class="tracking-cell-detail">${Number(ext.pendientes)} pendiente(s)</span>`:""}`;
  visit.dataset.trackingCell="visit";visit.dataset.label="Visita actual";visit.innerHTML=dominio?`<span class="tracking-domain-badge ${clasificacion.clase}"><i class="fa-solid ${clasificacion.icono}"></i> ${escapeHtml(dominio)}</span><span class="tracking-current-title">${escapeHtml(ext.tituloActual||"Sin título")}</span><span class="tracking-cell-detail">${ext.visitaIniciadaEn?`Desde ${escapeHtml(new Date(ext.visitaIniciadaEn).toLocaleTimeString("es-AR"))}`:""}</span>`:'<span class="tracking-domain-badge allowed"><i class="fa-solid fa-house"></i> En la actividad</span>';
  fila.append(status,visit);
 });
 filtrarTabla();renderIncidencias();
}
function decorarTarjetasMovilesDocente(){
 document.querySelectorAll("#tablaProfesorBody>tr:not(.teacher-actions-row)").forEach(fila=>{
  if(fila.children.length<4)return;
  const email=txt(fila.children[3]?.textContent).toLowerCase(),d=estudiantesProfesor.find(x=>txt(x.email).toLowerCase()===email);if(!d)return;
  const indice=estudiantesProfesor.indexOf(d),celdaNombre=fila.children[2],celdaAcciones=fila.children[0],e=d.estudiante||{},estado=estadoExtension(d),dominio=txt(d.seguimientoExtension?.dominioActual),clasificacion=claseDominio(dominio),pausado=d.controlCronometroIndividual?.pausado===true||d.controlCronometros?.pausado===true,bloqueado=d.pantallaBloqueada===true,enLinea=estudianteEnLineaMovil(d),alerta=d.__panelMeta?.alerta===true;
  fila.classList.toggle("teacher-mobile-online",enLinea);fila.classList.toggle("teacher-mobile-blocked",bloqueado);fila.classList.toggle("teacher-mobile-alert",alerta);fila.classList.toggle("teacher-mobile-paused",pausado);
  if(celdaNombre&&!celdaNombre.querySelector(".teacher-mobile-student-meta")){
    const meta=document.createElement("div");meta.className="teacher-mobile-student-meta";meta.innerHTML=`<span><i class="fa-solid fa-envelope"></i>${escapeHtml(d.email||"Sin correo")}</span><span><i class="fa-solid fa-graduation-cap"></i>${escapeHtml([e.curso,e.division,e.turno].filter(Boolean).join(" · ")||"Curso sin informar")}</span>`;celdaNombre.appendChild(meta);
   const seguimiento=document.createElement("div");seguimiento.className="teacher-mobile-tracking-strip";seguimiento.innerHTML=`<span class="tracking-status-badge ${estado.clase}"><i class="fa-solid ${estado.icono}"></i>${escapeHtml(estado.texto)}</span>${dominio?`<span class="tracking-domain-badge ${clasificacion.clase}"><i class="fa-solid ${clasificacion.icono}"></i>${escapeHtml(dominio)}</span>`:'<span class="tracking-domain-badge allowed"><i class="fa-solid fa-house"></i>En actividad</span>'}`;celdaNombre.appendChild(seguimiento);
  }
  if(celdaAcciones&&!celdaAcciones.querySelector(".teacher-mobile-row-actions")){
   const acciones=document.createElement("div");acciones.className="teacher-mobile-row-actions";
   const crear=(clase,icono,texto,titulo,accion)=>{const b=document.createElement("button");b.type="button";b.className=`teacher-mobile-quick-action ${clase}`;b.title=titulo;b.setAttribute("aria-label",`${titulo}: ${e.nombre||d.nombreGoogle||d.email||"estudiante"}`);b.innerHTML=`<i class="fa-solid ${icono}"></i><span>${texto}</span>`;b.onclick=evento=>{evento.stopPropagation();accion()};return b};
   acciones.append(
    crear("is-jitsi","fa-video","Jitsi","Iniciar o abrir llamada Jitsi",()=>window.abrirJitsiDocente?.(indice)),
    crear(pausado?"is-resume":"is-pause",pausado?"fa-play":"fa-pause",pausado?"Reanudar":"Pausar",pausado?"Reanudar cronómetro":"Pausar cronómetro",()=>window.controlarCronometroEstudianteProfesor?.(indice,pausado?"reanudar":"pausar")),
    crear(bloqueado?"is-unlock":"is-lock",bloqueado?"fa-unlock-keyhole":"fa-lock",bloqueado?"Desbloquear":"Bloquear",bloqueado?"Desbloquear pantalla":"Bloquear pantalla",()=>bloqueado?window.desbloquearPantallaEstudianteProfesor?.(indice):window.bloquearPantallaEstudianteProfesor?.(indice))
   );
   celdaAcciones.appendChild(acciones);
  }
 });
}
function mejorarTabla(){
 const tabla=document.querySelector("#tablaProfesorBody")?.closest("table"),head=tabla?.querySelector("thead tr");if(!head)return;
 while(head.children.length>12)head.lastElementChild.remove();
 document.querySelectorAll("#tablaProfesorBody>tr.teacher-actions-row td").forEach(celda=>celda.colSpan=12);
 document.querySelectorAll("#tablaProfesorBody>tr:not(.teacher-actions-row)").forEach(fila=>{
  if(fila.children.length===1){fila.firstElementChild.colSpan=12;return}
  while(fila.children.length>12)fila.lastElementChild.remove();
 });
 filtrarTabla();
 renderIncidencias();
 decorarTarjetasMovilesDocente();
 actualizarCentroMovilDocente();
}

let detenerComentariosProgramacionDocente=null;
function escaparProgramacion(valor){return String(valor||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function asegurarProgramacionDocenteModal(){
 if(document.getElementById("programacionDocenteModal"))return;
 const modal=document.createElement("div");modal.id="programacionDocenteModal";modal.className="modal-overlay";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
 modal.innerHTML=`<div class="modal-box teacher-program-box"><div class="teacher-program-header"><div><h3><i class="fa-solid fa-clipboard-list"></i> Programación del estudiante</h3><p id="programacionDocenteAlumno"></p></div><button class="btn btn-secondary" id="cerrarProgramacionDocente" type="button"><i class="fa-solid fa-xmark"></i></button></div><div class="teacher-program-grid"><label>Título<input id="programacionDocenteTitulo" maxlength="160"></label><label>Fecha de entrega<input id="programacionDocenteFecha" type="date"></label><label>Estado<select id="programacionDocenteEstado"><option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="revisar">Revisar</option><option value="completada">Completada</option></select></label><label class="wide">Instrucciones<textarea id="programacionDocenteInstrucciones" maxlength="4000" rows="6"></textarea></label></div><div class="teacher-program-actions"><span id="programacionDocenteEstadoGuardado" role="status"></span><button class="btn btn-primary" id="guardarProgramacionDocente" type="button"><i class="fa-solid fa-floppy-disk"></i> Guardar y publicar</button></div><section class="teacher-comments"><h4><i class="fa-solid fa-comments"></i> Comentarios</h4><div id="comentariosProgramacionLista" class="teacher-comments-list"></div><div class="teacher-comment-compose"><textarea id="nuevoComentarioProgramacion" maxlength="1200" rows="3" placeholder="Escribí una devolución para este estudiante..."></textarea><button class="btn btn-secondary" id="agregarComentarioProgramacion" type="button"><i class="fa-solid fa-paper-plane"></i> Comentar</button></div></section><section class="teacher-program-history"><h4><i class="fa-solid fa-clock-rotate-left"></i> Historial de cambios</h4><div id="historialProgramacionLista" class="teacher-comments-list"><small class="teacher-comments-empty">Cargando historial...</small></div></section></div>`;
 document.body.appendChild(modal);
 const cerrar=()=>{modal.classList.remove("active");if(detenerComentariosProgramacionDocente){detenerComentariosProgramacionDocente();detenerComentariosProgramacionDocente=null;}};
 modal.querySelector("#cerrarProgramacionDocente").onclick=cerrar;modal.onclick=e=>{if(e.target===modal)cerrar()};
 modal.querySelector("#guardarProgramacionDocente").onclick=async()=>{const uid=modal.dataset.uid,estado=modal.querySelector("#programacionDocenteEstadoGuardado");estado.textContent="Guardando...";const ok=await window.guardarProgramacionDocenteFirebase?.(uid,{titulo:modal.querySelector("#programacionDocenteTitulo").value,instrucciones:modal.querySelector("#programacionDocenteInstrucciones").value,fechaEntrega:modal.querySelector("#programacionDocenteFecha").value,estado:modal.querySelector("#programacionDocenteEstado").value});estado.textContent=ok?"Publicado en vivo":"No se pudo guardar";estado.className=ok?"success":"danger";if(ok)cargarHistorialProgramacionDocente(uid);};
 modal.querySelector("#agregarComentarioProgramacion").onclick=async()=>{const campo=modal.querySelector("#nuevoComentarioProgramacion"),texto=campo.value.trim();if(!texto)return;const ok=await window.agregarComentarioDocenteFirebase?.(modal.dataset.uid,{texto});if(ok)campo.value="";};
}
function renderComentariosProgramacionDocente(items=[]){
 const lista=document.getElementById("comentariosProgramacionLista");if(!lista)return;
 lista.innerHTML=items.length?items.map(x=>`<article class="teacher-comment-item"><p>${escaparProgramacion(x.texto)}</p><small>${escaparProgramacion(x.autor||"Docente")} · ${x.creadoEn?.toDate?x.creadoEn.toDate().toLocaleString("es-AR"):"Ahora"}</small></article>`).join(""):'<p class="teacher-comments-empty">Todavía no hay comentarios.</p>';
}
async function cargarHistorialProgramacionDocente(uid){
 const lista=document.getElementById("historialProgramacionLista");if(!lista)return;const items=await window.obtenerHistorialProgramacionDocenteFirebase?.(uid)||[];
 lista.innerHTML=items.length?items.map(x=>{const p=x.versionAnterior||{};const fecha=x.guardadoEn?.toDate?x.guardadoEn.toDate().toLocaleString("es-AR"):"Fecha no disponible";return`<article class="teacher-comment-item"><strong>${escaparProgramacion(p.titulo||"Sin título")}</strong><p>${escaparProgramacion(p.instrucciones||"Sin instrucciones")}</p><small>Versión anterior · ${escaparProgramacion(x.guardadoPor||"Docente")} · ${fecha}</small></article>`}).join(""):'<small class="teacher-comments-empty">Todavía no hay cambios anteriores.</small>';
}
function abrirProgramacionDocente(indice){
 const d=estudiantesProfesor?.[indice];if(!d?.uid)return;asegurarProgramacionDocenteModal();const modal=document.getElementById("programacionDocenteModal"),p=d.programacionDocente||{};
 modal.dataset.uid=d.uid;document.getElementById("programacionDocenteAlumno").textContent=`${d.estudiante?.nombre||d.nombreGoogle||d.email||"Estudiante"} · ${d.email||""}`;
 document.getElementById("programacionDocenteTitulo").value=p.titulo||"";document.getElementById("programacionDocenteInstrucciones").value=p.instrucciones||"";document.getElementById("programacionDocenteFecha").value=p.fechaEntrega||"";document.getElementById("programacionDocenteEstado").value=p.estado||"pendiente";document.getElementById("programacionDocenteEstadoGuardado").textContent="";
 if(detenerComentariosProgramacionDocente)detenerComentariosProgramacionDocente();detenerComentariosProgramacionDocente=window.escucharComentariosDocenteFirebase?.(d.uid,renderComentariosProgramacionDocente);modal.classList.add("active");
 cargarHistorialProgramacionDocente(d.uid);
}
window.abrirProgramacionDocente=abrirProgramacionDocente;
let detenerChatColaborativoDocente=null,detenerChatColaborativoEstudiante=null;
let detenerPresenciaChatEstudiante=null;
let detenerAlertasChatEstudiante=[];
const ultimoMensajeDocentePorSeccion=new Map();
let mensajesPopupCooperativoPendientes=[];
const mensajesPopupCooperativoRegistrados=new Set();
let detenerConsentimientosCooperacion=[];
const consentimientosCooperacionPendientes=new Map();
function uidSesionColaborativa(rolActual){
 return rolActual==="docente"
  ? (window.firebaseTeacherUser?.uid||window.firebaseCurrentUser?.uid||"")
  : (window.firebaseCurrentUser?.uid||"");
}
function notificarMensajeColaborativo(mensajes,rolActual){
 if(rolActual==="estudiante")return;
 const ultimo=(mensajes||[]).at(-1);
 if(!ultimo||ultimo.autorUid===uidSesionColaborativa(rolActual))return;
 const clave=`${rolActual}:${ultimo.id}`;
 if(window.__ultimoMensajeColaborativo===clave)return;
 window.__ultimoMensajeColaborativo=clave;
 if("Notification" in window){
  const mostrar=()=>new Notification("Nuevo mensaje de colaboración",{body:ultimo.texto||"Mensaje de audio o estado de llamada",tag:"chat-colaborativo"});
  if(Notification.permission==="granted")mostrar();
  else if(Notification.permission==="default")Notification.requestPermission().then(p=>{if(p==="granted")mostrar()}).catch(()=>{});
 }
}
function asegurarPopupMensajeCooperativoEstudiante(){
 if(document.getElementById("popupMensajeCooperativoEstudiante"))return;
 const popup=document.createElement("aside");
 popup.id="popupMensajeCooperativoEstudiante";
 popup.className="student-collab-message-popup";
 popup.hidden=true;
 popup.setAttribute("role","alertdialog");
 popup.setAttribute("aria-modal","false");
 popup.setAttribute("aria-labelledby","popupMensajeCooperativoTitulo");
 popup.innerHTML=`<div class="student-collab-message-popup-icon"><i class="fa-solid fa-chalkboard-user"></i></div><div class="student-collab-message-popup-content"><div class="student-collab-message-popup-heading"><div><small>Cooperación en vivo</small><h3 id="popupMensajeCooperativoTitulo">Nuevo mensaje del docente</h3></div><button id="cerrarPopupMensajeCooperativo" type="button" aria-label="Cerrar mensaje" title="Cerrar"><i class="fa-solid fa-xmark"></i></button></div><p id="popupMensajeCooperativoTexto"></p><span id="popupMensajeCooperativoMeta"></span><div class="student-collab-message-popup-actions"><button class="btn btn-primary" id="abrirChatDesdePopup" type="button"><i class="fa-solid fa-comments"></i> Abrir conversación</button><button class="btn btn-secondary" id="entendidoPopupMensajeCooperativo" type="button">Entendido</button></div></div>`;
 document.body.appendChild(popup);
 const cerrarBoton=popup.querySelector("#cerrarPopupMensajeCooperativo");
 const contador=document.createElement("span");
 contador.id="popupMensajeCooperativoContador";
 contador.className="student-collab-message-popup-counter";
 contador.setAttribute("aria-live","polite");
 cerrarBoton.replaceWith(contador);
 popup.querySelector("#entendidoPopupMensajeCooperativo").innerHTML='<i class="fa-solid fa-check"></i> Entendido';
 popup.querySelector("#entendidoPopupMensajeCooperativo").onclick=confirmarPopupMensajeCooperativoEstudiante;
 popup.querySelector("#abrirChatDesdePopup").onclick=async()=>{
  const sectionId=popup.dataset.sectionId;
  if(!sectionId)return;
  await confirmarPopupMensajeCooperativoEstudiante();
  window.abrirChatColaborativoEstudiante?.(sectionId);
 };
}
function mostrarPopupMensajeCooperativoEstudianteLegacy(mensaje,sectionId){
 if(!mensaje||!sectionId)return;
 asegurarPopupMensajeCooperativoEstudiante();
 const popup=document.getElementById("popupMensajeCooperativoEstudiante");
 const seccion=(typeof seccionesData!=="undefined"?seccionesData:[]).find(item=>item.id===sectionId);
 popup.dataset.sectionId=sectionId;
 popup.querySelector("#popupMensajeCooperativoTexto").textContent=String(mensaje.texto||"El docente envió una nueva indicación.");
 popup.querySelector("#popupMensajeCooperativoMeta").textContent=`${mensaje.autorNombre||"Docente"} · ${seccion?.title||sectionId} · ${fechaChatColaborativo(mensaje.creadoEn)}`;
 popup.hidden=false;
 requestAnimationFrame(()=>popup.classList.add("active"));
 try{
  const AudioContexto=window.AudioContext||window.webkitAudioContext;
  if(AudioContexto){
   const contexto=window.__audioMensajeCooperativo||new AudioContexto();
   window.__audioMensajeCooperativo=contexto;
   contexto.resume?.();
   const oscilador=contexto.createOscillator(),ganancia=contexto.createGain();
   oscilador.frequency.value=740;
   ganancia.gain.setValueAtTime(.0001,contexto.currentTime);
   ganancia.gain.exponentialRampToValueAtTime(.12,contexto.currentTime+.02);
   ganancia.gain.exponentialRampToValueAtTime(.0001,contexto.currentTime+.22);
   oscilador.connect(ganancia);ganancia.connect(contexto.destination);
   oscilador.start();oscilador.stop(contexto.currentTime+.24);
  }
 }catch(error){}
}
function renderPopupMensajeCooperativoPendiente(){
 asegurarPopupMensajeCooperativoEstudiante();
 const popup=document.getElementById("popupMensajeCooperativoEstudiante");
 const actual=mensajesPopupCooperativoPendientes[0];
 if(!actual){
  popup.classList.remove("active");
  window.setTimeout(()=>{if(!mensajesPopupCooperativoPendientes.length)popup.hidden=true},180);
  return;
 }
 const seccion=(typeof seccionesData!=="undefined"?seccionesData:[]).find(item=>item.id===actual.sectionId);
 const total=mensajesPopupCooperativoPendientes.length;
 popup.dataset.sectionId=actual.sectionId;
 popup.querySelector("#popupMensajeCooperativoTitulo").textContent=total>1?"Mensajes nuevos del docente":"Nuevo mensaje del docente";
 popup.querySelector("#popupMensajeCooperativoTexto").textContent=String(actual.mensaje.texto||"El docente envio una nueva indicacion.");
 popup.querySelector("#popupMensajeCooperativoMeta").textContent=`${actual.mensaje.autorNombre||"Docente"} - ${seccion?.title||actual.sectionId} - ${fechaChatColaborativo(actual.mensaje.creadoEn)}`;
 popup.querySelector("#popupMensajeCooperativoContador").textContent=total===1?"1 pendiente":`1 de ${total}`;
 popup.hidden=false;
 requestAnimationFrame(()=>popup.classList.add("active"));
}
async function confirmarPopupMensajeCooperativoEstudiante(){
 const actual=mensajesPopupCooperativoPendientes[0];
 if(!actual)return false;
 const boton=document.getElementById("entendidoPopupMensajeCooperativo");
 if(boton)boton.disabled=true;
 const leido=await window.marcarMensajeChatColaborativoLeidoFirebase?.({
  uid:window.firebaseCurrentUser?.uid,
  sectionId:actual.sectionId,
  mensajeId:actual.mensaje?.id,
  rol:"estudiante"
 });
 if(leido!==true){
  if(boton)boton.disabled=false;
  return false;
 }
 mensajesPopupCooperativoPendientes.shift();
  renderPopupMensajeCooperativoPendiente();
 if(boton)boton.disabled=false;
 return true;
}
function reproducirSonidoPopupCooperativo(){
 try{
  const AudioContexto=window.AudioContext||window.webkitAudioContext;
  if(!AudioContexto)return;
  const contexto=window.__audioMensajeCooperativo||new AudioContexto();
  window.__audioMensajeCooperativo=contexto;
  contexto.resume?.();
  const oscilador=contexto.createOscillator(),ganancia=contexto.createGain();
  oscilador.frequency.value=740;
  ganancia.gain.setValueAtTime(.0001,contexto.currentTime);
  ganancia.gain.exponentialRampToValueAtTime(.12,contexto.currentTime+.02);
  ganancia.gain.exponentialRampToValueAtTime(.0001,contexto.currentTime+.22);
  oscilador.connect(ganancia);
  ganancia.connect(contexto.destination);
  oscilador.start();
  oscilador.stop(contexto.currentTime+.24);
 }catch(error){}
}
function mostrarPopupMensajeCooperativoEstudiante(mensaje,sectionId){
 if(!mensaje||!sectionId)return;
 const clave=`${sectionId}:${mensaje.id||mensaje.creadoEn?.seconds||mensaje.texto||Date.now()}`;
 if(mensajesPopupCooperativoRegistrados.has(clave))return;
 mensajesPopupCooperativoRegistrados.add(clave);
 mensajesPopupCooperativoPendientes.push({clave,mensaje,sectionId});
 renderPopupMensajeCooperativoPendiente();
 reproducirSonidoPopupCooperativo();
}
function detenerAlertasChatCooperativoEstudiante(limpiarPendientes=true){
 detenerAlertasChatEstudiante.forEach(detener=>{try{detener?.()}catch(error){}});
 detenerAlertasChatEstudiante=[];
 ultimoMensajeDocentePorSeccion.clear();
 window.__firmaAlertasChatCooperativo="";
 if(!limpiarPendientes)return;
 mensajesPopupCooperativoPendientes=[];
 mensajesPopupCooperativoRegistrados.clear();
 const popup=document.getElementById("popupMensajeCooperativoEstudiante");
 if(popup){popup.classList.remove("active");popup.hidden=true}
}
function asegurarConsentimientoCooperacionEstudiante(){
 let panel=document.getElementById("consentimientoCooperacionEstudiante");
 if(panel)return panel;
 panel=document.createElement("aside");
 panel.id="consentimientoCooperacionEstudiante";
 panel.className="cooperation-consent-global";
 panel.hidden=true;
 panel.setAttribute("role","dialog");
 panel.setAttribute("aria-modal","false");
 panel.setAttribute("aria-labelledby","consentimientoCooperacionTitulo");
 panel.innerHTML=`<div class="cooperation-consent-global-icon"><i class="fa-solid fa-people-arrows"></i></div><div class="cooperation-consent-global-content"><small>Solicitud del docente</small><h3 id="consentimientoCooperacionTitulo">Cooperación en vivo</h3><p class="cooperation-consent-global-objective"></p><span class="cooperation-consent-global-section"></span><div class="cooperation-consent-global-actions"><button class="btn btn-success" data-cooperation-response="accept" type="button"><i class="fa-solid fa-check"></i> Aceptar cooperación</button><button class="btn btn-secondary" data-cooperation-response="reject" type="button"><i class="fa-solid fa-xmark"></i> Rechazar</button></div></div>`;
 document.body.appendChild(panel);
 panel.querySelectorAll("[data-cooperation-response]").forEach(boton=>boton.addEventListener("click",async()=>{
  const sectionId=panel.dataset.sectionId,aceptar=boton.dataset.cooperationResponse==="accept";
  if(!sectionId||!window.firebaseCurrentUser?.uid)return;
  panel.querySelectorAll("button").forEach(item=>item.disabled=true);
  const ok=await window.responderCooperacionFirebase?.({uid:window.firebaseCurrentUser.uid,sectionId,aceptar});
  panel.querySelectorAll("button").forEach(item=>item.disabled=false);
  if(!ok){
   alert(window.ultimoErrorCooperacion?.message||"No se pudo registrar la respuesta. Revisá la conexión e intentá nuevamente.");
   return;
  }
  consentimientosCooperacionPendientes.delete(sectionId);
  renderConsentimientoCooperacionEstudiante();
  if(aceptar){
   document.getElementById(sectionId)?.scrollIntoView?.({block:"start",behavior:prefiereMovimientoReducido()?"auto":"smooth"});
   window.setTimeout(()=>window.iniciarColaboracionCRDTEstudiante?.(),0);
  }
 }));
 return panel;
}
function renderConsentimientoCooperacionEstudiante(){
 const panel=asegurarConsentimientoCooperacionEstudiante();
 const pendiente=[...consentimientosCooperacionPendientes.entries()][0];
 if(!pendiente){
  panel.classList.remove("active");
  window.setTimeout(()=>{if(!consentimientosCooperacionPendientes.size)panel.hidden=true},180);
  return;
 }
 const [sectionId,modo]=pendiente,seccion=(typeof seccionesData!=="undefined"?seccionesData:[]).find(item=>item.id===sectionId);
 panel.dataset.sectionId=sectionId;
 panel.querySelector(".cooperation-consent-global-objective").textContent=modo.objetivo||"El docente solicita trabajar en vivo sobre esta actividad.";
 panel.querySelector(".cooperation-consent-global-section").textContent=`${modo.solicitadoPor||"Docente"} · ${seccion?.title||sectionId}`;
 panel.hidden=false;
 requestAnimationFrame(()=>panel.classList.add("active"));
}
function detenerConsentimientosCooperacionEstudiante(){
 detenerConsentimientosCooperacion.forEach(detener=>{try{detener?.()}catch(error){}});
 detenerConsentimientosCooperacion=[];
 consentimientosCooperacionPendientes.clear();
 const panel=document.getElementById("consentimientoCooperacionEstudiante");
 if(panel){panel.classList.remove("active");panel.hidden=true}
 window.__firmaConsentimientosCooperacion="";
}
function iniciarConsentimientosCooperacionEstudiante(){
 // La cooperación se activa directamente por el docente y no requiere autorización adicional del estudiante.
 detenerConsentimientosCooperacionEstudiante();
}
function iniciarAlertasChatCooperativoEstudiante(){
 const user=window.firebaseCurrentUser;
 if(!user||esSesionDocenteActual()||typeof window.escucharChatColaborativoFirebase!=="function"){
  detenerAlertasChatCooperativoEstudiante(true);
  window.__uidPopupCooperativo="";
  return;
 }
 const secciones=(typeof seccionesData!=="undefined"?seccionesData:[]).map(item=>item.id).filter(Boolean);
 if(!secciones.length){
  clearTimeout(window.__reintentoPopupCooperativo);
  window.__reintentoPopupCooperativo=setTimeout(iniciarAlertasChatCooperativoEstudiante,1600);
  return;
 }
 const firma=`${user.uid}:${secciones.join(",")}`;
 if(window.__firmaAlertasChatCooperativo===firma&&detenerAlertasChatEstudiante.length===secciones.length)return;
 const mismaSesion=Boolean(window.__uidPopupCooperativo===user.uid);
 detenerAlertasChatCooperativoEstudiante(!mismaSesion);
 window.__uidPopupCooperativo=user.uid;
 window.__firmaAlertasChatCooperativo=firma;
 asegurarPopupMensajeCooperativoEstudiante();
 secciones.forEach(sectionId=>{
   const detener=window.escucharChatColaborativoFirebase(user.uid,sectionId,(mensajes,error)=>{
   if(error)return;
   const recibidos=(Array.isArray(mensajes)?mensajes:[]).filter(item=>item?.rol==="docente"&&item.autorUid!==user.uid&&item.autorNombre!=="Sistema de llamada");
   const ultimo=recibidos.at(-1)||null;
   if(!ultimoMensajeDocentePorSeccion.has(sectionId)){
    const claveVisto=`cooperation_last_seen_message_${user.uid}_${sectionId}`;
    let ultimoVisto="";
    try{ultimoVisto=sessionStorage.getItem(claveVisto)||localStorage.getItem(claveVisto)||"";}catch(error){}
    const ultimoId=String(ultimo?.id||"");
    ultimoMensajeDocentePorSeccion.set(sectionId,ultimoId||ultimoVisto);
    if(ultimoId&&ultimoId!==ultimoVisto){
      try{sessionStorage.setItem(claveVisto,ultimoId);}catch(error){}
      try{localStorage.setItem(claveVisto,ultimoId);}catch(error){}
    }
    // La carga inicial sincroniza el estado, pero no reabre mensajes históricos.
    return;
   }
   const anterior=ultimoMensajeDocentePorSeccion.get(sectionId);
   if(!ultimo||!ultimo.id||ultimo.id===anterior)return;
   ultimoMensajeDocentePorSeccion.set(sectionId,ultimo.id);
   const claveVisto=`cooperation_last_seen_message_${user.uid}_${sectionId}`;
   try{sessionStorage.setItem(claveVisto,ultimo.id);localStorage.setItem(claveVisto,ultimo.id);}catch(error){}
   mostrarPopupMensajeCooperativoEstudiante(ultimo,sectionId);
    },{rol:"estudiante",marcarLeidos:false});
    if(typeof detener==="function")detenerAlertasChatEstudiante.push(detener);
  });
 }
function fechaChatColaborativo(valor){
 const fecha=valor?.toDate?valor.toDate():valor?.seconds?new Date(valor.seconds*1000):new Date(valor||0);
 return Number.isFinite(fecha.getTime())&&fecha.getTime()>0?fecha.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}):"Ahora";
}
function renderChatColaborativo(contenedor,mensajes=[],rolActual="estudiante",error=null){
 if(!contenedor)return;
 if(error){contenedor.innerHTML='<p class="collab-chat-empty">No se pudo conectar el chat. Revisá la conexión y las reglas de Firebase.</p>';return;}
 const propiosUid=uidSesionColaborativa(rolActual);
 contenedor.innerHTML=mensajes.length?mensajes.map(m=>{
  const propio=m.autorUid===propiosUid;
  const sistema=m.autorNombre==="Sistema de llamada";
  const textoMensaje=String(m.texto||"");
  const estadoLlamada=/conectad|se uni[oó]|acept[oó]/i.test(textoMensaje)?"call-connected":/rechaz/i.test(textoMensaje)?"call-rejected":/finaliz|sali[oó]/i.test(textoMensaje)?"call-finished":"";
  const clase=`collab-chat-message ${propio?"mine":""} ${m.rol==="docente"?"teacher":""} ${sistema?"system":""} ${sistema?estadoLlamada:""}`;
  const autor=propio?"Vos":(m.autorNombre|| (m.rol==="docente"?"Docente":"Estudiante"));
  const campoLeido=rolActual==="docente"?"leidoEstudianteEn":"leidoDocenteEn";
  const campoEntregado=rolActual==="docente"?"entregadoEstudianteEn":"entregadoDocenteEn";
  const estado=propio
    ? (m[campoLeido]?"Leído":m[campoEntregado]?"Entregado":"Enviado")
    : (m[campoLeido]?"Leído":"Recibido");
  const cita=m.cita?.texto
    ? `<blockquote class="collab-chat-quote"><strong>${m.cita.lineaInicio===m.cita.lineaFin?"Línea":"Líneas"} ${Number(m.cita.lineaInicio)||1}${m.cita.lineaInicio!==m.cita.lineaFin?`-${Number(m.cita.lineaFin)||Number(m.cita.lineaInicio)||1}`:""}</strong><code>${escaparProgramacion(m.cita.texto)}</code></blockquote>`
    : "";
  return `<article class="${clase}">${cita}<p>${escaparProgramacion(m.texto)}</p><small>${escaparProgramacion(autor)} · ${fechaChatColaborativo(m.creadoEn)} · <span class="collab-chat-message-state">${estado}</span></small></article>`;
 }).join(""):'<p class="collab-chat-empty">Todavía no hay mensajes. Consultá o explicá el siguiente paso.</p>';
 contenedor.scrollTop=contenedor.scrollHeight;
}
function renderPresenciaChatColaborativo(contenedor,participantes=[],error=null){
 if(!contenedor)return;
 if(error){contenedor.innerHTML='<span class="collab-presence-meta">Presencia no disponible</span>';return;}
 const ahora=Date.now(), visibles=(participantes||[]).filter(item=>{
  const activo=item.activoEn?.toMillis?.()||item.activoEn?.seconds*1000||Date.parse(item.activoEn||"")||0;
  return !activo||ahora-activo<70000;
 });
 if(!visibles.length){contenedor.innerHTML='<span class="collab-presence-meta">Esperando al otro participante…</span>';return;}
 contenedor.innerHTML=visibles.map(item=>{
  const nombre=item.nombre|| (item.rol==="docente"?"Docente":"Estudiante");
  return `<span class="collab-presence-strip"><i class="online-dot"></i><span class="collab-presence-name">${escaparProgramacion(nombre)}</span><span class="collab-presence-meta">${item.escribiendo===true?"está escribiendo":"conectado"}</span></span>`;
 }).join("");
}
function activarChatColaborativoDocente(uid,sectionId){
 const modal=document.getElementById("editorColaborativoDocenteModal"),lista=modal?.querySelector("#chatColaborativoDocenteLista"),estado=modal?.querySelector("#chatColaborativoDocenteEstado");if(!modal||!lista)return;
 if(detenerChatColaborativoDocente)detenerChatColaborativoDocente();
 estado.textContent="Chat en vivo";
 detenerChatColaborativoDocente=window.escucharChatColaborativoFirebase?.(uid,sectionId,(mensajes,error)=>{notificarMensajeColaborativo(mensajes,"docente");renderChatColaborativo(lista,mensajes,"docente",error)},{rol:"docente",marcarLeidos:()=>modal.classList.contains("active")&&!document.hidden&&document.hasFocus()})||null;
}
function renderPresenciaEditorColaborativo(modal,participantes=[]){
 const aviso=modal?.querySelector("#editorColaborativoPresencia");if(!aviso)return;
 const pausada=modal.dataset.edicionCooperativaPausada==="true",consentimiento=modal.dataset.consentimientoCooperativo||"sin_solicitud",uidDocente=uidSesionColaborativa("docente"),activos=(participantes||[]).filter(item=>item?.autorUid);
 const escribiendo=activos.filter(item=>item.escribiendo===true&&item.autorUid!==uidDocente);
 actualizarEstadoCursoCooperativo(modal,consentimiento==="aceptado"?(pausada?"paused":modal.__crdtSession?"active":"waiting"):consentimiento==="finalizado"||consentimiento==="rechazado"?"closed":"waiting");
 aviso.className=`teacher-collab-presence${pausada?" is-paused":escribiendo.length?" is-typing":""}`;
 if(consentimiento==="pendiente"){aviso.innerHTML='<i class="fa-solid fa-arrows-rotate"></i><span>Preparando la cooperación.</span>';return;}
 if(consentimiento==="rechazado"){aviso.innerHTML='<i class="fa-solid fa-circle-xmark"></i><span>La cooperación no está activa.</span>';return;}
 if(consentimiento==="finalizado"){aviso.innerHTML='<i class="fa-solid fa-circle-stop"></i><span>La cooperación fue finalizada.</span>';return;}
 if(pausada){aviso.innerHTML='<i class="fa-solid fa-pause"></i><span>Edición cooperativa pausada por el docente.</span>';return;}
 if(escribiendo.length){
  const nombres=[...new Set(escribiendo.map(item=>item.nombre||"Estudiante"))].join(", ");
  aviso.innerHTML=`<i class="fa-solid fa-keyboard"></i><span><strong>${escaparProgramacion(nombres)}</strong> está escribiendo</span><span class="typing-dots" aria-label="Escribiendo"><b></b><b></b><b></b></span>`;
  return;
 }
 const nombres=[...new Set(activos.map(item=>item.nombre||item.rol||"Participante"))];
 aviso.innerHTML=`<i class="fa-solid fa-people-arrows"></i><span>${nombres.length?`Conectados: ${escaparProgramacion(nombres.join(", "))}`:"Esperando al estudiante…"}</span>`;
}
function actualizarEstadoCursoCooperativo(modal,estado="waiting"){
 const indicador=modal?.querySelector("#estadoCursoCooperativo");if(!indicador)return;
 const datos={
  active:["En curso","fa-circle-play"],
  paused:["Pausada","fa-circle-pause"],
  waiting:["Preparando","fa-clock"],
  error:["Sin conexión","fa-triangle-exclamation"],
  closed:["Finalizada","fa-circle-stop"]
 }[estado]||["Preparando","fa-clock"];
 indicador.className=`teacher-collab-course-status is-${estado}`;
 indicador.innerHTML=`<i class="fa-solid ${datos[1]}"></i><span>${datos[0]}</span>`;
}
function actualizarPausaEditorColaborativo(modal,modo={}){
 if(!modal)return;
 const pausada=modo.pausada===true,aceptada=modo.consentimiento==="aceptado"&&modo.activa===true,pendiente=modo.consentimiento==="pendiente";
 modal.dataset.edicionCooperativaPausada=String(pausada===true);
 modal.dataset.consentimientoCooperativo=modo.consentimiento||"sin_solicitud";
 const boton=modal.querySelector("#pausarEdicionCooperativa"),editor=modal.querySelector("#editorColaborativoCodigo");
 if(boton){boton.disabled=!aceptada;boton.innerHTML=`<i class="fa-solid ${pausada?"fa-play":"fa-pause"}"></i> ${pausada?"Reanudar edición":"Pausar edición"}`;boton.className=`btn ${pausada?"btn-success":"btn-warning"}`;boton.setAttribute("aria-pressed",String(pausada===true));}
 if(editor){const bloqueado=!aceptada||pausada;editor.disabled=bloqueado;editor.__setCodeMirrorDisabled?.(bloqueado);}
 const estado=modal.querySelector("#editorColaborativoEstado");
 if(estado){
  estado.textContent=pendiente?"Solicitud enviada · esperando aceptación":aceptada?(pausada?"Cooperación activa · edición pausada":"Cooperación activa · edición compartida habilitada"):modo.consentimiento==="rechazado"?"El estudiante rechazó la solicitud":modo.consentimiento==="finalizado"?"Cooperación finalizada":"Preparando cooperación";
 }
 renderPresenciaEditorColaborativo(modal,modal.__participantesColaborativos||[]);
}
function asegurarChatColaborativoEstudiante(){
 if(document.getElementById("chatColaborativoEstudianteModal"))return;
 const modal=document.createElement("div");modal.id="chatColaborativoEstudianteModal";modal.className="modal-overlay";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
 modal.innerHTML=`<div class="modal-box teacher-program-box"><div class="teacher-program-header"><div><h3><i class="fa-solid fa-comments"></i> Chat con el docente</h3><p id="chatColaborativoEstudianteAlumno">Conversación de la colaboración en vivo.</p></div><button class="btn btn-secondary" id="cerrarChatColaborativoEstudiante" type="button" aria-label="Cerrar chat"><i class="fa-solid fa-xmark"></i></button></div><section class="collab-chat"><div class="collab-chat-header"><strong><i class="fa-solid fa-people-arrows"></i> Cooperación con código</strong><span id="chatColaborativoEstudianteEstado" class="collab-chat-status">Conectando...</span></div><div id="chatColaborativoEstudiantePresencia"></div><div id="chatColaborativoEstudianteLista" class="collab-chat-messages" aria-live="polite"></div><div class="collab-chat-compose"><textarea id="chatColaborativoEstudianteTexto" maxlength="1200" rows="3" placeholder="Escribí tu consulta para el docente..."></textarea><button class="btn btn-primary" id="enviarChatColaborativoEstudiante" type="button"><i class="fa-solid fa-paper-plane"></i> Enviar</button></div></section></div>`;
 document.body.appendChild(modal);
 const cerrar=()=>{modal.classList.remove("active");if(detenerChatColaborativoEstudiante){detenerChatColaborativoEstudiante();detenerChatColaborativoEstudiante=null;}if(detenerPresenciaChatEstudiante){detenerPresenciaChatEstudiante();detenerPresenciaChatEstudiante=null;}};
 modal.querySelector("#cerrarChatColaborativoEstudiante").onclick=cerrar;modal.onclick=e=>{if(e.target===modal)cerrar()};
  const enviar=async()=>{
   const campo=modal.querySelector("#chatColaborativoEstudianteTexto"),boton=modal.querySelector("#enviarChatColaborativoEstudiante"),estado=modal.querySelector("#chatColaborativoEstudianteEstado"),texto=campo.value.trim();
   if(!texto||boton.disabled)return;
   boton.disabled=true;campo.disabled=true;estado.textContent="Enviando...";
   try{
    const enviarFirebase=window.enviarChatColaborativoFirebase;
    if(typeof enviarFirebase!=="function")throw new Error("El chat todavía no está disponible. Recargá la página.");
    const ok=await enviarFirebase({uid:modal.dataset.uid,sectionId:modal.dataset.sectionId,texto,rol:"estudiante"});
    if(!ok)throw new Error(window.ultimoErrorChatColaborativo?.message||"Firebase rechazó la operación");
    campo.value="";
    estado.textContent="Mensaje enviado";
   }catch(error){
    estado.textContent=`No se pudo enviar: ${error?.message||"revisá la conexión"}`;
   }finally{
    boton.disabled=false;campo.disabled=false;campo.focus();
   }
  };
 modal.querySelector("#enviarChatColaborativoEstudiante").onclick=enviar;modal.querySelector("#chatColaborativoEstudianteTexto").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();enviar();}});
}
window.abrirChatColaborativoEstudiante=function(sectionId){
 const user=window.firebaseCurrentUser;if(!user){alert("Iniciá sesión como estudiante para usar el chat.");return;}
 asegurarChatColaborativoEstudiante();const modal=document.getElementById("chatColaborativoEstudianteModal"),sec=(typeof seccionesData!=="undefined"?seccionesData:[]).find(x=>x.id===sectionId),lista=modal.querySelector("#chatColaborativoEstudianteLista"),estado=modal.querySelector("#chatColaborativoEstudianteEstado");
 modal.dataset.uid=user.uid;modal.dataset.sectionId=sectionId;modal.querySelector("#chatColaborativoEstudianteAlumno").textContent=`${sec?.title||"Desafío"} · mensajes de la sesión de cooperación`;lista.innerHTML='<p class="collab-chat-empty">Conectando el chat…</p>';estado.textContent="Chat en vivo";modal.classList.add("active");
   if(detenerChatColaborativoEstudiante)detenerChatColaborativoEstudiante();if(detenerPresenciaChatEstudiante)detenerPresenciaChatEstudiante();detenerChatColaborativoEstudiante=window.escucharChatColaborativoFirebase?.(user.uid,sectionId,(mensajes,error)=>{notificarMensajeColaborativo(mensajes,"estudiante");renderChatColaborativo(lista,mensajes,"estudiante",error)},{rol:"estudiante",marcarLeidos:()=>modal.classList.contains("active")&&!document.hidden&&document.hasFocus()})||null;detenerPresenciaChatEstudiante=window.escucharPresenciaColaborativaFirebase?.(user.uid,sectionId,(participantes,error)=>renderPresenciaChatColaborativo(modal.querySelector("#chatColaborativoEstudiantePresencia"),participantes,error),{rol:"estudiante"})||null;
};
function asegurarEditorColaborativoDocente(){
 if(document.getElementById("editorColaborativoDocenteModal"))return;
 const modal=document.createElement("div");modal.id="editorColaborativoDocenteModal";modal.className="modal-overlay";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
 modal.innerHTML=`<div class="modal-box teacher-collab-box"><div class="teacher-program-header"><div><h3><i class="fa-solid fa-code-branch"></i> Editor colaborativo en vivo</h3><p id="editorColaborativoAlumno"></p><small id="editorColaborativoEstado">Conectando...</small></div><button class="btn btn-secondary" id="cerrarEditorColaborativo" type="button" aria-label="Cerrar editor colaborativo"><i class="fa-solid fa-xmark"></i></button></div><nav class="teacher-collab-mobile-nav" aria-label="Secciones de cooperación"><button type="button" data-collab-target="editorColaborativoCodigo" aria-pressed="true"><i class="fa-solid fa-code"></i><span>Código</span></button><button type="button" data-collab-target="collabChatDocente" aria-pressed="false"><i class="fa-solid fa-comments"></i><span>Chat</span></button></nav><div class="teacher-collab-presence" id="editorColaborativoPresencia"><i class="fa-solid fa-people-arrows"></i><span>Esperando al estudiante…</span></div><div class="collab-author-legend" aria-label="Referencias de autoría del código"><strong><i class="fa-solid fa-palette"></i> Aportes:</strong><span class="collab-author-key student">Estudiante</span><span class="collab-author-key teacher">Docente</span><span class="collab-author-key base">Código inicial</span></div><textarea id="editorColaborativoCodigo" class="teacher-collab-editor" spellcheck="false" aria-label="Código colaborativo"></textarea><div class="teacher-program-actions"><span id="editorColaborativoGuardado" role="status">Sincronización automática</span><div style="display:flex;gap:.45rem;flex-wrap:wrap"><button class="btn btn-success" id="iniciarAudioCooperativo" type="button" title="Iniciar una llamada de audio con el estudiante"><i class="fa-solid fa-headset"></i> Llamada de audio</button><button class="btn btn-warning" id="pausarEdicionCooperativa" type="button" aria-pressed="false"><i class="fa-solid fa-pause"></i> Pausar edición</button><button class="btn btn-primary" id="guardarEditorColaborativo" type="button"><i class="fa-solid fa-arrows-rotate"></i> Sincronizar ahora</button></div></div><section id="collabChatDocente" class="collab-chat"><div class="collab-chat-header"><strong><i class="fa-solid fa-comments"></i> Chat con el estudiante</strong><span id="chatColaborativoDocenteEstado" class="collab-chat-status">Conectando...</span></div><div class="collab-chat-tools"><button class="btn btn-success" id="iniciarAudioDesdeChat" type="button"><i class="fa-solid fa-headset"></i> Iniciar audio</button><button class="btn btn-secondary" id="compartirSeleccionChat" type="button"><i class="fa-solid fa-share-from-square"></i> Compartir selección</button><button class="btn btn-warning" id="finalizarCooperacionDocente" type="button" title="Finalizar la edición compartida"><i class="fa-solid fa-circle-stop"></i> Finalizar cooperación</button></div><div class="collab-quick-replies"><button type="button" data-quick-reply="Revisá esta parte y contame qué observás.">Revisá esta parte</button><button type="button" data-quick-reply="Probá ejecutar el código y compartime el error.">Probá y compartime el error</button><button type="button" data-quick-reply="Muy bien, continuá con el siguiente paso.">Continuá</button></div><div id="chatColaborativoDocenteLista" class="collab-chat-messages" aria-live="polite"></div><div class="collab-chat-compose"><textarea id="chatColaborativoDocenteTexto" maxlength="1200" rows="3" placeholder="Escribí una indicación o respuesta..." aria-label="Mensaje para el estudiante"></textarea><button class="btn btn-primary" id="enviarChatColaborativoDocente" type="button"><i class="fa-solid fa-paper-plane"></i> Enviar</button></div></section></div>`;
 document.body.appendChild(modal);
 const cabeceraEstado=modal.querySelector("#editorColaborativoEstado");
 if(cabeceraEstado){
  const grupo=document.createElement("div");
  grupo.className="teacher-collab-heading-status";
  cabeceraEstado.parentNode.insertBefore(grupo,cabeceraEstado);
  grupo.appendChild(cabeceraEstado);
  grupo.insertAdjacentHTML("beforeend",'<span id="estadoCursoCooperativo" class="teacher-collab-course-status is-waiting"><i class="fa-solid fa-clock"></i><span>Preparando</span></span>');
 }
 const caja=modal.querySelector(".teacher-collab-box"),cabecera=modal.querySelector(".teacher-program-header"),cerrarBoton=modal.querySelector("#cerrarEditorColaborativo");
 const navegacionMovil=modal.querySelector(".teacher-collab-mobile-nav");
 navegacionMovil?.querySelectorAll("[data-collab-target]").forEach(boton=>boton.addEventListener("click",()=>{
  navegacionMovil.querySelectorAll("[data-collab-target]").forEach(item=>item.setAttribute("aria-pressed",String(item===boton)));
  const objetivo=document.getElementById(boton.dataset.collabTarget);
  desplazarA(objetivo?.closest?.(".codemirror-host")||objetivo);
 }));
 const botonPantalla=document.createElement("button");
 botonPantalla.id="pantallaCompletaEditorCooperativo";
 botonPantalla.type="button";
 botonPantalla.className="btn btn-secondary teacher-collab-fullscreen";
 botonPantalla.title="Pantalla completa";
 botonPantalla.setAttribute("aria-label","Abrir cooperación en pantalla completa");
 botonPantalla.innerHTML='<i class="fa-solid fa-expand"></i><span>Pantalla completa</span>';
 cabecera.insertBefore(botonPantalla,cerrarBoton);
 const actualizarPantallaCompleta=()=>{
  const activa=document.fullscreenElement===caja||modal.classList.contains("is-pseudo-fullscreen");
  const icono=botonPantalla.querySelector("i"),texto=botonPantalla.querySelector("span");
  if(icono)icono.className=`fa-solid ${activa?"fa-compress":"fa-expand"}`;
  if(texto)texto.textContent=activa?"Salir de pantalla completa":"Pantalla completa";
  botonPantalla.title=activa?"Salir de pantalla completa":"Pantalla completa";
  botonPantalla.setAttribute("aria-pressed",String(activa));
 };
 botonPantalla.onclick=async()=>{
  try{
   if(document.fullscreenElement===caja)await document.exitFullscreen();
   else if(modal.classList.contains("is-pseudo-fullscreen"))modal.classList.remove("is-pseudo-fullscreen");
   else if(caja.requestFullscreen)await caja.requestFullscreen();
   else modal.classList.add("is-pseudo-fullscreen");
  }catch(error){modal.classList.toggle("is-pseudo-fullscreen")}
  actualizarPantallaCompleta();
 };
 document.addEventListener("fullscreenchange",actualizarPantallaCompleta);
 cerrarBoton.addEventListener("click",()=>{if(document.fullscreenElement===caja)document.exitFullscreen().catch(()=>{});modal.classList.remove("is-pseudo-fullscreen")},{capture:true});
 window.inicializarEditorCodeMirror?.(modal.querySelector("#editorColaborativoCodigo"));
 const cerrar=async()=>{
  const editor=modal.querySelector("#editorColaborativoCodigo");
  const estadoGuardado=modal.querySelector("#editorColaborativoGuardado");
  if(modal.__crdtSession){
   const cerrada=await modal.__crdtSession.destroy();
   if(cerrada===false){
    if(estadoGuardado){
     estadoGuardado.textContent="No se puede cerrar: hay cambios pendientes de sincronizar";
     estadoGuardado.className="danger";
    }
    return;
   }
   modal.__crdtSession=null;
  }
  modal.classList.remove("active");
  editor?.__desvincularCRDT?.();
  modal.__quitarPresenciaColaborativa?.();modal.__quitarModoCooperacion?.();
  delete modal.__quitarPresenciaColaborativa;delete modal.__quitarModoCooperacion;
  if(detenerChatColaborativoDocente){detenerChatColaborativoDocente();detenerChatColaborativoDocente=null;}
  delete modal.dataset.llamadaAudioColaborativaId;
 };
 modal.querySelector("#cerrarEditorColaborativo").onclick=cerrar;modal.onclick=e=>{if(e.target===modal)cerrar()};
 modal.querySelector("#iniciarAudioCooperativo").onclick=async()=>{const indice=Number(modal.dataset.studentIndex);if(!Number.isInteger(indice)){alert("No se pudo identificar al estudiante para la llamada.");return;}await window.abrirJitsiDocente?.(indice,{soloAudio:true});};
 modal.querySelector("#pausarEdicionCooperativa").onclick=async()=>{const boton=modal.querySelector("#pausarEdicionCooperativa"),pausada=modal.dataset.edicionCooperativaPausada==="true";boton.disabled=true;const ok=await modal.__crdtSession?.establecerPausaCooperacion?.(!pausada);if(!ok)alert("No se pudo actualizar la pausa de edición. Revisá Firebase e intentá nuevamente.");boton.disabled=false;};
 modal.querySelector("#guardarEditorColaborativo").onclick=async()=>{const estado=modal.querySelector("#editorColaborativoGuardado"),boton=modal.querySelector("#guardarEditorColaborativo");boton.disabled=true;estado.textContent="Sincronizando...";try{const ok=await modal.__crdtSession?.flush();if(!ok)throw new Error("sync-pending");estado.textContent="Cambios sincronizados";estado.className="success"}catch{estado.textContent="Hay cambios pendientes; se reintentará automáticamente";estado.className="danger"}finally{boton.disabled=false}};
  const enviar=async()=>{const campo=modal.querySelector("#chatColaborativoDocenteTexto"),boton=modal.querySelector("#enviarChatColaborativoDocente"),estado=modal.querySelector("#chatColaborativoDocenteEstado"),texto=campo.value.trim();if(!texto)return;boton.disabled=true;const ok=await window.enviarChatColaborativoFirebase?.({uid:modal.dataset.uid,sectionId:modal.dataset.sectionId,texto,rol:"docente"});boton.disabled=false;if(ok){campo.value="";estado.textContent="Mensaje enviado";}else{const detalle=window.ultimoErrorChatColaborativo?.message||"Firebase rechazo la operacion";estado.textContent=`No se pudo enviar: ${detalle}`;}};
 modal.querySelector("#enviarChatColaborativoDocente").onclick=enviar;modal.querySelector("#chatColaborativoDocenteTexto").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();enviar();}});
 modal.querySelectorAll("[data-quick-reply]").forEach(boton=>boton.onclick=()=>{modal.querySelector("#chatColaborativoDocenteTexto").value=boton.dataset.quickReply||"";modal.querySelector("#chatColaborativoDocenteTexto").focus();});
 modal.querySelector("#iniciarAudioDesdeChat").onclick=()=>modal.querySelector("#iniciarAudioCooperativo")?.click();
 modal.querySelector("#compartirSeleccionChat").onclick=()=>{const editor=modal.querySelector("#editorColaborativoCodigo"),campo=modal.querySelector("#chatColaborativoDocenteTexto"),rango=editor?.__getCodeMirrorSelection?.()||{inicio:editor?.selectionStart||0,fin:editor?.selectionEnd||0},seleccion=(editor?.__getCodeMirrorSelectedText?.()||editor?.value.slice(rango.inicio,rango.fin)||"").trim();if(!seleccion){alert("Seleccioná primero una parte del código.");return;}if(!campo)return;campo.value=`Te comparto esta parte del código:\n\n\`\`\`javascript\n${seleccion}\n\`\`\``;campo.focus();};
 modal.querySelector("#finalizarCooperacionDocente").onclick=async()=>{
  const boton=modal.querySelector("#finalizarCooperacionDocente"),estado=modal.querySelector("#chatColaborativoDocenteEstado");
  const confirmacion=await mostrarConfirmacionDocente({tipo:"warning",icono:"fa-circle-stop",titulo:"Finalizar cooperación",mensaje:"Se cerrará la edición compartida de esta actividad.",detalles:["El estudiante podrá continuar trabajando individualmente.","El código y los mensajes se conservarán.","Podrás volver a activar la cooperación cuando sea necesario."],confirmarTexto:"Finalizar cooperación",confirmarIcono:"fa-circle-stop",confirmarClase:"btn-warning"});
  if(!confirmacion?.confirmado)return;
  boton.disabled=true;estado.textContent="Finalizando cooperación...";
  const ok=await modal.__crdtSession?.finalizarCooperacion?.();
  boton.disabled=false;
  if(ok){estado.textContent="Cooperación finalizada · evidencias conservadas";}
  else{estado.textContent="No se pudo finalizar la cooperación";alert("Firebase rechazó la actualización. Verificá la cuenta docente y las reglas publicadas.");}
 };
}
async function abrirEditorColaborativoProfesor(referenciaEstudiante,sectionId){
 const indice=typeof referenciaEstudiante==="string"
  ? estudiantesProfesor?.findIndex(item=>item.uid===referenciaEstudiante)
  : Number(referenciaEstudiante);
 const d=estudiantesProfesor?.[indice];
 if(!d?.uid||!sectionId){alert("No se pudo identificar al estudiante o al desafío.");return;}
 asegurarEditorColaborativoDocente();
 const modal=document.getElementById("editorColaborativoDocenteModal"),sec=(typeof seccionesData!=="undefined"?seccionesData:[]).find(x=>x.id===sectionId),codigo=d.codigos?.[sectionId]||d.historialResultados?.[sectionId]?.codigo||"";
 const editor=document.getElementById("editorColaborativoCodigo"),estado=document.getElementById("editorColaborativoEstado"),salida=document.getElementById("editorColaborativoGuardado");
 modal.dataset.uid=d.uid;modal.dataset.sectionId=sectionId;modal.dataset.studentIndex=String(indice);
 actualizarEstadoCursoCooperativo(modal,"waiting");
 document.getElementById("editorColaborativoAlumno").textContent=`${d.estudiante?.nombre||d.nombreGoogle||d.email||"Estudiante"} · ${sec?.title||sectionId}`;
 editor.value=codigo;editor.__syncCodeMirror?.(codigo);editor.disabled=true;editor.__setCodeMirrorDisabled?.(true);
 estado.textContent="Verificando la cuenta docente...";salida.textContent="Preparando colaboración";salida.className="";
 modal.classList.add("active");
 try{
  const autorizado=await window.autorizarDocenteFirebase?.();
  if(!autorizado)throw new Error("teacher-not-authorized");
  if(modal.__crdtSession){
   const cerrada=await modal.__crdtSession.destroy();
   if(cerrada===false)throw new Error("Hay cambios cooperativos pendientes de sincronizar.");
   modal.__crdtSession=null;
  }
  editor.__desvincularCRDT?.();
  modal.__quitarPresenciaColaborativa?.();modal.__quitarModoCooperacion?.();
  delete modal.__quitarPresenciaColaborativa;delete modal.__quitarModoCooperacion;
  if(detenerChatColaborativoDocente){detenerChatColaborativoDocente();detenerChatColaborativoDocente=null;}
  estado.textContent="Conectando al documento colaborativo...";
  modal.__crdtSession=await window.iniciarEditorCRDTDocente?.({uid:d.uid,sectionId,codigoInicial:codigo,textarea:editor,estado});
   if(!modal.__crdtSession)throw new Error("crdt-session-not-created");
   actualizarEstadoCursoCooperativo(modal,"waiting");
   editor.__syncCodeMirror?.(editor.value);
   modal.__quitarPresenciaColaborativa=modal.__crdtSession.onPresence?.(participantes=>{modal.__participantesColaborativos=participantes;editor.__renderRemoteCursors?.(participantes);renderPresenciaEditorColaborativo(modal,participantes);})||null;
   modal.__quitarModoCooperacion=modal.__crdtSession.onModoCooperacion?.(modo=>actualizarPausaEditorColaborativo(modal,modo))||null;
   activarChatColaborativoDocente(d.uid,sectionId);
   const modoActual=modal.__crdtSession.getModoCooperacion?.()||{};
   if(!(modoActual.consentimiento==="aceptado"&&modoActual.activa===true)){
    const objetivo=`Acompañamiento docente en ${sec?.title||sectionId}: revisar el razonamiento, probar el código y acordar el siguiente paso.`;
    await modal.__crdtSession.solicitarCooperacion?.(objetivo);
    salida.textContent="Cooperación activada. Sincronización automática disponible.";
   }else{
    salida.textContent="Sincronización automática activa";
   }
   salida.className="success";
 }catch(error){
  actualizarEstadoCursoCooperativo(modal,"error");
  console.error(error);
  if(detenerChatColaborativoDocente){detenerChatColaborativoDocente();detenerChatColaborativoDocente=null;}
  const codigoError=String(error?.code||error?.message||"");
  const detalle=codigoError.includes("permission-denied")?"Firestore rechazó la colaboración. Publicá la versión actualizada de reglas.txt.":codigoError.includes("teacher-not-authorized")?"La cuenta docente no está autorizada.":codigoError.includes("firebase-not-ready")?"Firebase todavía no está listo. Recargá la página e intentá nuevamente.":String(error?.message||"Revisá la conexión y las reglas de Firestore.");
  estado.textContent="No se pudo iniciar la colaboración";salida.textContent=detalle;salida.className="danger";
  editor.disabled=true;editor.__setCodeMirrorDisabled?.(true);
 }
}
window.abrirEditorColaborativoProfesor=abrirEditorColaborativoProfesor;
const estadosAudioColaborativoReportados=new Map();
window.addEventListener("jitsi-invitacion-audio-enviada",evento=>{
 const detalle=evento.detail||{},modal=document.getElementById("editorColaborativoDocenteModal");
 if(!modal||modal.dataset.uid!==detalle.estudianteUid||!detalle.llamadaId)return;
 modal.dataset.llamadaAudioColaborativaId=detalle.llamadaId;
 estadosAudioColaborativoReportados.set(detalle.llamadaId,"invitado");
 window.enviarChatColaborativoFirebase?.({
  uid:detalle.estudianteUid,
  sectionId:modal.dataset.sectionId,
  texto:`Invitación de llamada de audio enviada a ${detalle.estudianteNombre||"el estudiante"}.`,
  rol:"docente",
  autorNombre:"Sistema de llamada"
 });
});
window.addEventListener("profesor-data",()=>{
 const modal=document.getElementById("editorColaborativoDocenteModal"),llamadaId=modal?.dataset.llamadaAudioColaborativaId;
 if(!modal?.classList.contains("active")||!llamadaId)return;
 const estudiante=estudiantesProfesor?.find(item=>item.uid===modal.dataset.uid),participacion=estudiante?.jitsiParticipacion||{};
 if(String(participacion.llamadaId||"")!==String(llamadaId))return;
 const estado=String(participacion.estado||""),anterior=estadosAudioColaborativoReportados.get(llamadaId);
 if(!estado||estado===anterior)return;
 estadosAudioColaborativoReportados.set(llamadaId,estado);
 const mensajes={unido:"Llamada de audio conectada: el estudiante aceptó y se unió a la sala.",rechazado:"El estudiante rechazó la llamada de audio.",salio:"El estudiante salió de la llamada de audio.",finalizada:"La llamada de audio finalizó."};
 if(!mensajes[estado])return;
 window.enviarChatColaborativoFirebase?.({
  uid:modal.dataset.uid,
  sectionId:modal.dataset.sectionId,
  texto:mensajes[estado],
  rol:"docente",
  autorNombre:"Sistema de llamada"
 });
});
document.addEventListener("click",event=>{
 const boton=event.target.closest?.(".btn-trabajar-vivo,[data-collab-student-index]");
 if(!boton)return;
 event.preventDefault();event.stopPropagation();
 const uid=boton.dataset.collabStudentUid||"",indice=Number(boton.dataset.collabStudentIndex),sectionId=boton.dataset.collabSection;
 const referencia=uid||indice;
 if((!uid&&!Number.isInteger(indice))||!sectionId){alert("El botón no tiene asociado un desafío válido.");return;}
 Promise.resolve(window.abrirEditorColaborativoProfesor?.(referencia,sectionId)).catch(error=>{
  console.error("Error al abrir colaboración",error);
  alert(`No se pudo abrir el editor colaborativo: ${error?.message||"error desconocido"}`);
 });
},true);
window.addEventListener("profesor-data",()=>{
 const modal=document.getElementById("editorColaborativoDocenteModal");if(!modal?.classList.contains("active"))return;
 if(modal.__crdtSession)return;
 const d=estudiantesProfesor?.find(x=>x.uid===modal.dataset.uid),editor=modal.querySelector("#editorColaborativoCodigo");if(!d||!editor||document.activeElement===editor)return;
 const codigo=d.codigos?.[modal.dataset.sectionId]||d.historialResultados?.[modal.dataset.sectionId]?.codigo||"";
 if(editor.value!==codigo){editor.value=codigo;editor.__syncCodeMirror?.(codigo);modal.dataset.version=String(d.colaboracionDocente?.version||0);modal.querySelector("#editorColaborativoEstado").textContent=`Versión ${modal.dataset.version} · actualizado desde el estudiante`;}
});
function filtrarTabla(){
 const ef=document.getElementById("filtroSeguimientoProfesor")?.value||"",df=txt(document.getElementById("filtroDominioSeguimientoProfesor")?.value).toLowerCase();
 [...document.querySelectorAll("#tablaProfesorBody>tr:not(.teacher-actions-row)")].forEach(fila=>{
  if(fila.children.length<4)return;const email=txt(fila.children[3]?.textContent).toLowerCase(),d=estudiantesProfesor.find(x=>txt(x.email).toLowerCase()===email);if(!d)return;
  const visible=(!ef||estadoExtension(d).codigo===ef)&&(!df||txt(d.seguimientoExtension?.dominioActual).toLowerCase().includes(df));fila.style.display=visible?"":"none";const extra=fila.nextElementSibling?.classList.contains("teacher-actions-row")?fila.nextElementSibling:null;if(extra)extra.style.display=visible?"":"none";
 });
}
function agrupar(eventos){
 const mapa=new Map(),grupos=[];[...eventos].sort((a,b)=>ms(a.salidaEn)-ms(b.salidaEn)).forEach(e=>{const id=txt(e.salidaGrupoId)||`legacy-${e.id}`;let g=mapa.get(id);if(!g){g={id,eventos:[]};mapa.set(id,g);grupos.push(g)}g.eventos.push(e)});return grupos.sort((a,b)=>ms(b.eventos[0]?.salidaEn)-ms(a.eventos[0]?.salidaEn));
}
function datosGrupo(g){
 const eventos=g?.eventos||[],segundos=eventos.reduce((s,e)=>s+Math.max(0,Number(e.duracionSegundos)||0),0),dominios=[...new Set(eventos.map(e=>e.dominioDestino).filter(Boolean))],primero=eventos[0]||{},revision=revisionesActuales.get(g.id)||{estado:"pendiente",motivo:"",observacion:"",etiquetas:[],contabiliza:true};
 return{groupId:g?.id||"",eventos,segundos,dominios,primero,revision,inicio:ms(primero.salidaEn),paginas:eventos.length,seccion:primero.seccionTitulo||primero.seccionOrigen||"",clase:primero.claseId||"",version:primero.extensionVersion||""};
}
function analizarAlertasAutomaticas(grupos=agrupar(historialActual)){
 const datos=grupos.map(datosGrupo),porDominio=new Map();
 datos.forEach(d=>d.eventos.forEach(evento=>{const dominio=txt(evento.dominioDestino).toLowerCase();if(!dominio)return;const actual=porDominio.get(dominio)||{visitas:0,segundos:0,grupos:new Set()};actual.visitas++;actual.segundos+=Math.max(0,Number(evento.duracionSegundos)||0);actual.grupos.add(d.groupId);porDominio.set(dominio,actual)}));
 const dominiosRepetidos=new Map([...porDominio.entries()].filter(([,valor])=>valor.visitas>=3));
 const largas=datos.filter(d=>d.segundos>=60),multipagina=datos.filter(d=>d.paginas>=3),frecuenciaMultipagina=datos.length?multipagina.length/datos.length:0;
 const alertas=[];
 dominiosRepetidos.forEach((valor,dominio)=>alertas.push({tipo:"repetido",nivel:valor.visitas>=5?"alta":"media",titulo:`Dominio repetido: ${dominio}`,detalle:`${valor.visitas} visitas en ${valor.grupos.size} salida${valor.grupos.size===1?"":"s"} · ${duracionLegible(valor.segundos)} acumulados`,dominio}));
 if(largas.length)alertas.push({tipo:"larga",nivel:largas.some(d=>d.segundos>=180)?"alta":"media",titulo:`${largas.length} salida${largas.length===1?"":"s"} prolongada${largas.length===1?"":"s"}`,detalle:`Superaron 1 minuto. La mayor duró ${duracionLegible(Math.max(...largas.map(d=>d.segundos)))}.`});
 if(multipagina.length>=3&&frecuenciaMultipagina>=.4)alertas.push({tipo:"multipagina",nivel:frecuenciaMultipagina>=.7?"alta":"media",titulo:"Uso frecuente de varias páginas",detalle:`${multipagina.length} de ${datos.length} salidas recorrieron 3 o más páginas (${Math.round(frecuenciaMultipagina*100)}%).`});
 return{alertas,dominiosRepetidos,largas,multipagina,datos};
}
function atencionGrupo(d,analisis=null){
 analisis=analisis||analizarAlertasAutomaticas();
 const dominiosAlerta=d.dominios.filter(x=>claseDominio(x).clase==="danger");
 if(d.revision.estado==="no_justificada"||d.revision.estado==="advertencia"||dominiosAlerta.length)return{codigo:"alta",texto:"Atención alta",icono:"fa-triangle-exclamation",detalle:dominiosAlerta[0]||"Revisión docente"};
 const repetido=d.dominios.find(x=>analisis.dominiosRepetidos.has(txt(x).toLowerCase()));
 if(repetido)return{codigo:"media",texto:"Patrón repetido",icono:"fa-repeat",detalle:`${repetido} aparece ${analisis.dominiosRepetidos.get(txt(repetido).toLowerCase()).visitas} veces`};
 if(d.segundos>=60||d.paginas>=3)return{codigo:"media",texto:"Revisar",icono:"fa-magnifying-glass",detalle:d.segundos>=60?"Salida prolongada":"Recorrido con varias páginas"};
 if(d.revision.contabiliza===false)return{codigo:"excluida",texto:"Excluida",icono:"fa-eye-slash",detalle:"No integra el conteo"};
 return{codigo:"normal",texto:"Sin alerta",icono:"fa-circle-check",detalle:"Recorrido habitual"};
}
function etiquetaEstado(estado){
 return{pendiente:["Pendiente","pending","fa-clock"],revisada:["Revisada","info","fa-circle-check"],justificada:["Justificada","success","fa-shield-heart"],no_justificada:["No justificada","danger","fa-triangle-exclamation"],permitida:["Permitida","success","fa-circle-check"],advertencia:["Advertencia","danger","fa-flag"]}[estado]||["Pendiente","pending","fa-clock"];
}
function asegurarModalesRevision(){
 if(!document.getElementById("revisionSalidaPestanaModal")){
  const modal=document.createElement("div");modal.id="revisionSalidaPestanaModal";modal.className="modal-overlay";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
  modal.innerHTML=`<div class="modal-box tab-review-box" tabindex="-1"><div class="tracking-limit-header"><div class="tracking-limit-heading"><span class="tracking-limit-icon"><i class="fa-solid fa-clipboard-check"></i></span><div><h3>Revisar salida de pestaña</h3><p id="revisionSalidaResumen">Clasificá la salida y agregá una observación docente.</p></div></div><button class="btn btn-secondary" id="cerrarRevisionSalida" type="button"><i class="fa-solid fa-xmark"></i></button></div><div class="tab-review-form"><div class="tab-review-field"><label>Estado<select id="revisionSalidaEstado"><option value="pendiente">Pendiente</option><option value="revisada">Revisada</option><option value="justificada">Justificada</option><option value="no_justificada">No justificada</option><option value="permitida">Permitida</option><option value="advertencia">Advertencia</option></select></label></div><div class="tab-review-field"><label>Motivo<select id="revisionSalidaMotivo"><option value="">Sin especificar</option><option>Investigación solicitada</option><option>Consulta de documentación</option><option>Acceso autorizado por docente</option><option>Error técnico</option><option>Notificación del sistema</option><option>Cambio accidental</option><option>Distracción</option><option>Uso no autorizado de IA</option><option>Red social o entretenimiento</option><option>Otro</option></select></label></div><div class="tab-review-field wide"><label>Observación docente<textarea id="revisionSalidaObservacion" maxlength="1000" placeholder="Contexto, justificación o medida tomada"></textarea></label></div><div class="tab-review-field wide"><label>Etiquetas</label><div class="tab-review-tags">${["investigación","documentación","IA","red social","video","juego","técnico","accidental","reincidente","autorizada"].map(x=>`<label><input type="checkbox" value="${x}"> ${x}</label>`).join("")}</div></div><div class="tab-review-field wide"><label><input id="revisionSalidaContabiliza" type="checkbox" checked style="width:auto"> Mantener esta salida en el conteo de revisión</label></div></div><div id="revisionSalidaError" style="display:none;color:#fca5a5;font-size:.78rem;margin:.6rem 0"></div><div class="tracking-limit-actions"><button class="btn btn-secondary" id="cancelarRevisionSalida" type="button">Cancelar</button><button class="btn btn-primary" id="guardarRevisionSalida" type="button"><i class="fa-solid fa-floppy-disk"></i> Guardar revisión</button></div></div>`;
  document.body.appendChild(modal);const cerrar=()=>modal.classList.remove("active");modal.querySelector("#cerrarRevisionSalida").onclick=cerrar;modal.querySelector("#cancelarRevisionSalida").onclick=cerrar;modal.onclick=e=>{if(e.target===modal)cerrar()};modal.querySelector("#guardarRevisionSalida").onclick=guardarRevisionSalida;
 }
 if(!document.getElementById("auditoriaSalidaPestanaModal")){
  const modal=document.createElement("div");modal.id="auditoriaSalidaPestanaModal";modal.className="modal-overlay";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
  modal.innerHTML=`<div class="modal-box history-modal-box"><div class="history-modal-header"><div><h3><i class="fa-solid fa-clock-rotate-left"></i> Auditoría de la salida</h3><p id="auditoriaSalidaSubtitulo">Historial inmutable de cambios docentes.</p></div><button class="btn btn-secondary" id="cerrarAuditoriaSalida" type="button"><i class="fa-solid fa-xmark"></i> Cerrar</button></div><div id="auditoriaSalidaContenido" class="tab-audit-list"></div></div>`;
  document.body.appendChild(modal);modal.querySelector("#cerrarAuditoriaSalida").onclick=()=>modal.classList.remove("active");modal.onclick=e=>{if(e.target===modal)modal.classList.remove("active")};
 }
}
function abrirRevisionSalida(grupoId){
 asegurarModalesRevision();grupoRevisionActual=grupoId;const grupo=agrupar(historialActual).find(g=>g.id===grupoId),d=datosGrupo(grupo),r=d.revision,modal=document.getElementById("revisionSalidaPestanaModal");
 modal.querySelector("#revisionSalidaResumen").textContent=`${d.paginas} página(s) · ${d.dominios.join(", ")||"sin dominio"} · ${Math.round(d.segundos)} segundos`;
 modal.querySelector("#revisionSalidaEstado").value=r.estado||"pendiente";modal.querySelector("#revisionSalidaMotivo").value=r.motivo||"";modal.querySelector("#revisionSalidaObservacion").value=r.observacion||"";modal.querySelector("#revisionSalidaContabiliza").checked=r.contabiliza!==false;
 modal.querySelectorAll(".tab-review-tags input").forEach(x=>x.checked=(r.etiquetas||[]).includes(x.value));modal.querySelector("#revisionSalidaError").style.display="none";modal.classList.add("active");
}
async function guardarRevisionSalida(){
 const modal=document.getElementById("revisionSalidaPestanaModal"),boton=modal.querySelector("#guardarRevisionSalida"),error=modal.querySelector("#revisionSalidaError"),revision={estado:modal.querySelector("#revisionSalidaEstado").value,motivo:modal.querySelector("#revisionSalidaMotivo").value,observacion:modal.querySelector("#revisionSalidaObservacion").value.trim(),etiquetas:[...modal.querySelectorAll(".tab-review-tags input:checked")].map(x=>x.value),contabiliza:modal.querySelector("#revisionSalidaContabiliza").checked},original=boton.innerHTML;
 if(["no_justificada","advertencia"].includes(revision.estado)&&!revision.observacion){error.textContent="Agregá una observación para una salida no justificada o con advertencia.";error.style.display="block";return}
 boton.disabled=true;boton.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';const ok=await window.guardarRevisionPestanaFirebase?.(estudianteHistorial?.uid,grupoRevisionActual,revision);boton.disabled=false;boton.innerHTML=original;
 if(!ok){error.textContent=`No se pudo guardar${window.ultimoErrorRevisionPestana?.code?` (${window.ultimoErrorRevisionPestana.code})`:""}. Publicá las reglas actualizadas.`;error.style.display="block";return}
 revisionesActuales.set(grupoRevisionActual,{...revision,docente:window.firebaseTeacherUser?.email||window.firebaseCurrentUser?.email||"",revisadoEn:new Date().toISOString()});modal.classList.remove("active");decorarSalidas();aplicarFiltrosHistorial();
}
async function abrirAuditoriaSalida(grupoId){
 asegurarModalesRevision();const modal=document.getElementById("auditoriaSalidaPestanaModal"),contenido=modal.querySelector("#auditoriaSalidaContenido");modal.classList.add("active");contenido.innerHTML='<p><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</p>';
 const eventos=await window.obtenerHistorialRevisionesPestanasFirebase?.(estudianteHistorial?.uid,grupoId)||[];
 contenido.innerHTML=eventos.length?eventos.map(e=>`<article class="tab-audit-event"><strong>${escapeHtml(e.estadoAnterior||"pendiente")} → ${escapeHtml(e.estadoNuevo||"")}</strong><div class="history-event-meta"><span><b>Fecha:</b> ${escapeHtml(new Date(ms(e.cambiadoEn)).toLocaleString("es-AR"))}</span><span><b>Docente:</b> ${escapeHtml(e.docente||"")}</span><span><b>Conteo:</b> ${e.contabilizabaAntes!==false?"incluida":"excluida"} → ${e.contabilizaAhora!==false?"incluida":"excluida"}</span></div>${e.motivoNuevo?`<p><b>Motivo:</b> ${escapeHtml(e.motivoNuevo)}</p>`:""}${e.observacionNueva?`<p>${escapeHtml(e.observacionNueva)}</p>`:""}</article>`).join(""):'<p style="color:var(--text-muted)">Todavía no hay cambios de revisión para esta salida.</p>';
}
function asegurarFiltrosHistorial(){
 const contenido=document.getElementById("historialPestanasContenido");if(!contenido||document.getElementById("filtrosHistorialPestanasMejoras"))return;
 contenido.insertAdjacentHTML("beforebegin",`<div id="filtrosHistorialPestanasMejoras"><div class="tab-history-quick" role="group" aria-label="Filtros rápidos del historial"><button type="button" data-history-quick="" class="active"><i class="fa-solid fa-list"></i><span>Todas</span><strong data-history-quick-count="todas">0</strong></button><button type="button" data-history-quick="pendientes"><i class="fa-solid fa-clock"></i><span>Pendientes</span><strong data-history-quick-count="pendientes">0</strong></button><button type="button" data-history-quick="alertas"><i class="fa-solid fa-triangle-exclamation"></i><span>Alertas</span><strong data-history-quick-count="alertas">0</strong></button><button type="button" data-history-quick="repetidos"><i class="fa-solid fa-repeat"></i><span>Repetidos</span><strong data-history-quick-count="repetidos">0</strong></button><button type="button" data-history-quick="largas"><i class="fa-solid fa-stopwatch"></i><span>Más de 1 min</span><strong data-history-quick-count="largas">0</strong></button><button type="button" data-history-quick="multipagina"><i class="fa-solid fa-route"></i><span>Varias páginas</span><strong data-history-quick-count="multipagina">0</strong></button><button type="button" data-history-quick="excluidas"><i class="fa-solid fa-eye-slash"></i><span>Excluidas</span><strong data-history-quick-count="excluidas">0</strong></button></div><section id="alertasAutomaticasPestanas" class="tab-auto-alerts" aria-live="polite"></section><details class="tab-history-advanced" open><summary><span><i class="fa-solid fa-sliders"></i> Filtros avanzados</span><strong id="cantidadFiltrosHistorialActivos">0 activos</strong></summary><div class="tab-history-filters"><label>Buscar título o dominio<input id="historialPestanasBuscar" type="search" placeholder="Ej.: chatgpt.com"></label><label>Clase<select id="historialPestanasClase"><option value="">Todas</option></select></label><label>Desde<input id="historialPestanasDesde" type="date"></label><label>Hasta<input id="historialPestanasHasta" type="date"></label><label>Período<select id="historialPestanasPeriodo"><option value="">Todo</option><option value="1">Hoy</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option></select></label></div></details><div class="tab-history-toolbar"><button class="btn btn-secondary" id="limpiarFiltrosHistorialPestanas" type="button"><i class="fa-solid fa-filter-circle-xmark"></i> Limpiar</button><button class="btn btn-secondary" id="exportarHistorialPestanasCsv" type="button"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button><button class="btn btn-secondary" id="imprimirHistorialPestanas" type="button"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button><span id="resumenFiltroHistorialPestanas" class="tab-history-results" role="status"></span></div><div id="resumenDominiosHistorialPestanas" class="tracking-incidents-summary" style="margin:.7rem 0"></div></div>`);
 document.querySelectorAll("[data-history-quick]").forEach(boton=>boton.addEventListener("click",()=>{filtroRapidoHistorial=boton.dataset.historyQuick||"";document.querySelectorAll("[data-history-quick]").forEach(item=>item.classList.toggle("active",item===boton));aplicarFiltrosHistorial()}));
 ["historialPestanasBuscar","historialPestanasClase","historialPestanasDesde","historialPestanasHasta","historialPestanasPeriodo"].forEach(id=>document.getElementById(id).addEventListener(id.includes("Buscar")?"input":"change",aplicarFiltrosHistorial));
 document.getElementById("limpiarFiltrosHistorialPestanas").onclick=()=>{["historialPestanasBuscar","historialPestanasClase","historialPestanasDesde","historialPestanasHasta","historialPestanasPeriodo","historialPestanasDominio","historialPestanasSeccion","historialPestanasEstado","historialPestanasClasificacion","historialPestanasDuracionMin","historialPestanasDuracionMax","historialPestanasPaginas","historialPestanasVersion"].forEach(id=>{const x=document.getElementById(id);if(x)x.value=""});const orden=document.getElementById("historialPestanasOrden");if(orden)orden.value="fecha-desc";filtroRapidoHistorial="";document.querySelectorAll("[data-history-quick]").forEach(b=>b.classList.toggle("active",!b.dataset.historyQuick));aplicarFiltrosHistorial()};
 document.getElementById("exportarHistorialPestanasCsv").onclick=exportarCsv;
 document.getElementById("imprimirHistorialPestanas").onclick=exportarHistorialPestanasPdf;
 const barra=document.querySelector("#filtrosHistorialPestanasMejoras .tab-history-toolbar");
 barra.insertAdjacentHTML("beforeend",`<button class="btn btn-secondary" id="exportarHistorialPestanasJson" type="button"><i class="fa-solid fa-file-code"></i> Exportar JSON</button><button class="btn btn-secondary" id="seleccionarSalidasVisibles" type="button"><i class="fa-solid fa-square-check"></i> Seleccionar visibles</button><button class="btn btn-secondary" id="expandirSalidasPestanas" type="button"><i class="fa-solid fa-angles-down"></i> Expandir todo</button><button class="btn btn-secondary" id="contraerSalidasPestanas" type="button"><i class="fa-solid fa-angles-up"></i> Contraer todo</button>`);
 document.getElementById("exportarHistorialPestanasJson").onclick=exportarJson;document.getElementById("seleccionarSalidasVisibles").onclick=()=>{gruposFiltrados().forEach(g=>salidasSeleccionadas.add(g.id));decorarSalidas()};document.getElementById("expandirSalidasPestanas").onclick=()=>document.querySelectorAll("#historialPestanasContenido .tab-excursion-route").forEach(x=>x.style.display="");document.getElementById("contraerSalidasPestanas").onclick=()=>document.querySelectorAll("#historialPestanasContenido .tab-excursion-route").forEach(x=>x.style.display="none");
 const filtros=document.querySelector("#filtrosHistorialPestanasMejoras .tab-history-filters");
 filtros.insertAdjacentHTML("beforeend",`<label>Dominio<select id="historialPestanasDominio"><option value="">Todos</option></select></label><label>Sección<select id="historialPestanasSeccion"><option value="">Todas</option></select></label><label>Revisión<select id="historialPestanasEstado"><option value="">Todos los estados</option><option value="pendiente">Pendientes</option><option value="revisada">Revisadas</option><option value="justificada">Justificadas</option><option value="no_justificada">No justificadas</option><option value="permitida">Permitidas</option><option value="advertencia">Advertencias</option><option value="excluida">Excluidas del conteo</option></select></label><label>Clasificación<select id="historialPestanasClasificacion"><option value="">Todas</option><option value="allowed">Dominio permitido</option><option value="danger">Dominio en alerta</option><option value="warning">Sin clasificar</option></select></label><label>Duración mínima (s)<input id="historialPestanasDuracionMin" type="number" min="0" placeholder="0"></label><label>Duración máxima (s)<input id="historialPestanasDuracionMax" type="number" min="0" placeholder="Sin límite"></label><label>Páginas por salida<select id="historialPestanasPaginas"><option value="">Cualquier cantidad</option><option value="1">1 página</option><option value="2">2 o más</option><option value="5">5 o más</option><option value="10">10 o más</option></select></label><label>Versión<select id="historialPestanasVersion"><option value="">Todas</option></select></label><label>Orden<select id="historialPestanasOrden"><option value="fecha-desc">Más recientes</option><option value="fecha-asc">Más antiguas</option><option value="duracion-desc">Mayor duración</option><option value="duracion-asc">Menor duración</option><option value="paginas-desc">Más páginas</option><option value="dominio-asc">Dominio A-Z</option><option value="estado-asc">Estado de revisión</option></select></label>`);
 ["historialPestanasDominio","historialPestanasSeccion","historialPestanasEstado","historialPestanasClasificacion","historialPestanasDuracionMin","historialPestanasDuracionMax","historialPestanasPaginas","historialPestanasVersion","historialPestanasOrden"].forEach(id=>document.getElementById(id).addEventListener(id.includes("Duracion")?"input":"change",aplicarFiltrosHistorial));
 const contenedor=document.getElementById("filtrosHistorialPestanasMejoras");
 contenedor.insertAdjacentHTML("beforeend",`<div id="resumenRevisionesPestanas" class="tab-review-summary"></div><div id="resumenAnaliticaPestanas" class="tracking-incidents-summary" style="margin:.6rem 0"></div><div id="accionesMasivasPestanas" class="tab-bulk-bar" hidden><strong id="cantidadSalidasSeleccionadas">0 seleccionadas</strong><select id="estadoMasivoPestanas"><option value="revisada">Marcar revisadas</option><option value="justificada">Marcar justificadas</option><option value="permitida">Marcar permitidas</option><option value="pendiente">Volver a pendientes</option></select><button class="btn btn-primary" id="aplicarEstadoMasivoPestanas" type="button"><i class="fa-solid fa-check-double"></i> Aplicar estado</button><button class="btn btn-secondary" id="incluirMasivoPestanas" type="button">Incluir en conteo</button><button class="btn btn-warning" id="excluirMasivoPestanas" type="button">Excluir del conteo</button><button class="btn btn-secondary" id="cancelarSeleccionPestanas" type="button">Cancelar selección</button></div>`);
 document.getElementById("aplicarEstadoMasivoPestanas").onclick=()=>aplicarRevisionMasiva({estado:document.getElementById("estadoMasivoPestanas").value});
 document.getElementById("incluirMasivoPestanas").onclick=()=>aplicarRevisionMasiva({contabiliza:true});
 document.getElementById("excluirMasivoPestanas").onclick=()=>aplicarRevisionMasiva({contabiliza:false});
 document.getElementById("cancelarSeleccionPestanas").onclick=()=>{salidasSeleccionadas.clear();decorarSalidas();actualizarBarraMasiva()};
}
function decorarSalidas(){
 const grupos=agrupar(historialActual),analisis=analizarAlertasAutomaticas(grupos),tarjetas=[...document.querySelectorAll("#historialPestanasContenido .tab-excursion")];
 tarjetas.forEach((tarjeta,i)=>{
  const grupo=grupos.find(item=>item.id===tarjeta.dataset.grupoId)||grupos[i];if(!grupo)return;const d=datosGrupo(grupo),r=d.revision,[textoEstado,claseEstado,icono]=etiquetaEstado(r.estado);
  tarjeta.dataset.grupoId=grupo.id;tarjeta.classList.remove("review-pending","review-revisada","review-justificada","review-no_justificada","review-permitida","review-advertencia","is-excluded");tarjeta.classList.add(`review-${r.estado||"pendiente"}`);if(r.contabiliza===false)tarjeta.classList.add("is-excluded");
  let selector=tarjeta.querySelector(".tab-excursion-select");if(!selector){selector=document.createElement("label");selector.className="tab-excursion-select";selector.innerHTML='<input type="checkbox"> Seleccionar';tarjeta.querySelector(".tab-excursion-header")?.prepend(selector);selector.querySelector("input").onchange=e=>{e.target.checked?salidasSeleccionadas.add(grupo.id):salidasSeleccionadas.delete(grupo.id);actualizarBarraMasiva()}}selector.querySelector("input").checked=salidasSeleccionadas.has(grupo.id);
   const atencion=atencionGrupo(d,analisis);tarjeta.dataset.attention=atencion.codigo;
   let insight=tarjeta.querySelector(".tab-excursion-insight");if(!insight){insight=document.createElement("div");insight.className="tab-excursion-insight";tarjeta.querySelector(".tab-excursion-header")?.after(insight)}
   insight.innerHTML=`<div class="tab-excursion-primary"><span class="tab-attention-badge ${atencion.codigo}"><i class="fa-solid ${atencion.icono}"></i>${atencion.texto}</span><strong>${escapeHtml(d.dominios[0]||"Dominio desconocido")}</strong><small>${escapeHtml(atencion.detalle)}</small></div><div class="tab-excursion-time"><span><i class="fa-regular fa-clock"></i>${escapeHtml(horaLegible(d.primero.salidaEn))} → ${escapeHtml(horaLegible(d.eventos[d.eventos.length-1]?.regresoEn))}</span><strong>${escapeHtml(duracionLegible(d.segundos))}</strong></div>`;
   let meta=tarjeta.querySelector(".tab-review-meta");if(!meta){meta=document.createElement("div");meta.className="tab-review-meta";insight.after(meta)}
  meta.innerHTML=`<span class="tab-review-badge ${claseEstado}"><i class="fa-solid ${icono}"></i> ${escapeHtml(textoEstado)}</span>${r.contabiliza===false?'<span class="tab-review-badge pending"><i class="fa-solid fa-eye-slash"></i> Excluida del conteo</span>':""}${r.motivo?`<span class="tab-review-badge info">${escapeHtml(r.motivo)}</span>`:""}${(r.etiquetas||[]).map(x=>`<span class="tab-review-tag">${escapeHtml(x)}</span>`).join("")}${r.observacion?`<span class="tracking-cell-detail" style="flex-basis:100%"><b>Observación:</b> ${escapeHtml(r.observacion)}</span>`:""}`;
  let acciones=tarjeta.querySelector(".tab-excursion-actions");if(!acciones){acciones=document.createElement("div");acciones.className="tab-excursion-actions";tarjeta.appendChild(acciones)}
  acciones.innerHTML='<button class="btn btn-primary" data-action="review"><i class="fa-solid fa-clipboard-check"></i> Revisar</button><button class="btn btn-secondary" data-action="audit"><i class="fa-solid fa-clock-rotate-left"></i> Auditoría</button><button class="btn btn-secondary" data-action="copy"><i class="fa-solid fa-copy"></i> Copiar resumen</button><button class="btn btn-secondary" data-action="toggle"><i class="fa-solid fa-route"></i> Ocultar recorrido</button>';
  acciones.querySelector('[data-action="review"]').onclick=()=>abrirRevisionSalida(grupo.id);acciones.querySelector('[data-action="audit"]').onclick=()=>abrirAuditoriaSalida(grupo.id);acciones.querySelector('[data-action="copy"]').onclick=()=>copiarResumenGrupo(grupo);
  acciones.querySelector('[data-action="toggle"]').onclick=e=>{const ruta=tarjeta.querySelector(".tab-excursion-route"),oculta=ruta.style.display==="none";ruta.style.display=oculta?"":"none";e.currentTarget.innerHTML=`<i class="fa-solid fa-route"></i> ${oculta?"Ocultar":"Mostrar"} recorrido`};
 });
 actualizarBarraMasiva();renderResumenRevisiones();
}
function actualizarBarraMasiva(){
 const barra=document.getElementById("accionesMasivasPestanas"),cantidad=document.getElementById("cantidadSalidasSeleccionadas");if(!barra)return;barra.hidden=salidasSeleccionadas.size===0;if(cantidad)cantidad.textContent=`${salidasSeleccionadas.size} seleccionada${salidasSeleccionadas.size===1?"":"s"}`;
}
async function copiarResumenGrupo(grupo){
 const d=datosGrupo(grupo),lineas=[`Salida: ${new Date(d.inicio).toLocaleString("es-AR")}`,`Duración: ${d.segundos} segundos`,`Sección: ${d.seccion||"Sin identificar"}`,`Estado: ${etiquetaEstado(d.revision.estado)[0]}`,`Conteo: ${d.revision.contabiliza===false?"Excluida":"Incluida"}`,...d.eventos.map((e,i)=>`${i+1}. ${e.dominioDestino||"desconocido"} - ${e.tituloDestino||"Sin título"} (${e.duracionSegundos||0}s)`)];try{await navigator.clipboard.writeText(lineas.join("\n"))}catch{const area=document.createElement("textarea");area.value=lineas.join("\n");document.body.appendChild(area);area.select();document.execCommand("copy");area.remove()}
}
async function aplicarRevisionMasiva(cambios){
 if(!salidasSeleccionadas.size)return;const confirmacion=await mostrarConfirmacionDocente({tipo:"warning",icono:"fa-list-check",titulo:"Actualizar salidas seleccionadas",mensaje:`Se modificarán ${salidasSeleccionadas.size} salidas.`,detalles:["El cambio quedará registrado con fecha y docente.","Los registros originales de navegación no se modifican."],confirmarTexto:"Aplicar cambios",confirmarIcono:"fa-check-double",confirmarClase:"btn-warning"});if(!confirmacion.confirmado)return;
 let guardadas=0;for(const id of [...salidasSeleccionadas]){const anterior=revisionesActuales.get(id)||{estado:"pendiente",motivo:"",observacion:"",etiquetas:[],contabiliza:true},revision={...anterior,...cambios};if(await window.guardarRevisionPestanaFirebase?.(estudianteHistorial?.uid,id,revision)){revisionesActuales.set(id,revision);guardadas++}}
 salidasSeleccionadas.clear();decorarSalidas();aplicarFiltrosHistorial();if(guardadas===0)alert("No se pudo actualizar ninguna salida. Publicá las reglas actualizadas de Firestore.");
}
function renderResumenRevisiones(){
 const el=document.getElementById("resumenRevisionesPestanas");if(!el)return;const grupos=agrupar(historialActual),conteo={pendiente:0,revisada:0,justificada:0,no_justificada:0,permitida:0,advertencia:0,excluida:0};grupos.forEach(g=>{const r=datosGrupo(g).revision;conteo[r.estado||"pendiente"]++;if(r.contabiliza===false)conteo.excluida++});
 const items=[["Pendientes",conteo.pendiente,"pendiente"],["Revisadas",conteo.revisada,"revisada"],["Justificadas",conteo.justificada,"justificada"],["No justificadas",conteo.no_justificada,"no_justificada"],["Advertencias",conteo.advertencia,"advertencia"],["Excluidas",conteo.excluida,"excluida"]];
 el.innerHTML=items.map(x=>`<button type="button" data-state="${x[2]}"><small>${x[0]}</small><strong>${x[1]}</strong></button>`).join("");el.querySelectorAll("button").forEach(b=>b.onclick=()=>{document.getElementById("historialPestanasEstado").value=b.dataset.state;aplicarFiltrosHistorial()});
}
function renderAnalitica(grupos){
 const el=document.getElementById("resumenAnaliticaPestanas");if(!el)return;const datos=grupos.map(datosGrupo),duraciones=datos.map(d=>d.segundos).sort((a,b)=>a-b),total=duraciones.reduce((a,b)=>a+b,0),promedio=duraciones.length?Math.round(total/duraciones.length):0,mediana=duraciones.length?duraciones[Math.floor(duraciones.length/2)]:0,maximo=duraciones.length?duraciones[duraciones.length-1]:0,excluidas=datos.filter(d=>d.revision.contabiliza===false).length,alertas=datos.filter(d=>d.dominios.some(x=>claseDominio(x).clase==="danger")).length,multipagina=datos.filter(d=>d.paginas>1).length,horas=new Map();datos.forEach(d=>{if(d.inicio){const h=new Date(d.inicio).getHours();horas.set(h,(horas.get(h)||0)+1)}});const horaPico=[...horas.entries()].sort((a,b)=>b[1]-a[1])[0];
 const items=[["Incluidas",datos.length-excluidas,"fa-list-check"],["Excluidas",excluidas,"fa-eye-slash"],["Promedio fuera",`${promedio}s`,"fa-stopwatch"],["Mediana",`${mediana}s`,"fa-chart-simple"],["Salida más larga",`${maximo}s`,"fa-arrow-up"],["Con varias páginas",multipagina,"fa-route"],["Dominios en alerta",alertas,"fa-triangle-exclamation"],["Hora con más salidas",horaPico?`${String(horaPico[0]).padStart(2,"0")}:00`:"—","fa-clock"]];
 el.innerHTML=items.map(x=>`<div class="tracking-incident-stat"><small><i class="fa-solid ${x[2]}"></i> ${x[0]}</small><strong>${x[1]}</strong></div>`).join("");
}
function renderAlertasAutomaticas(){
 const el=document.getElementById("alertasAutomaticasPestanas");if(!el)return;const analisis=analizarAlertasAutomaticas();
 if(!analisis.alertas.length){el.innerHTML='<div class="tab-auto-alerts-empty"><i class="fa-solid fa-circle-check"></i><div><strong>Sin patrones automáticos relevantes</strong><span>No se detectaron dominios repetidos, salidas largas ni uso frecuente de varias páginas.</span></div></div>';return}
 el.innerHTML=`<div class="tab-auto-alerts-heading"><div><strong><i class="fa-solid fa-wand-magic-sparkles"></i> Alertas automáticas</strong><span>Son indicadores orientativos para revisión docente; no aplican sanciones ni descuentos.</span></div><b>${analisis.alertas.length}</b></div><div class="tab-auto-alerts-list">${analisis.alertas.map(alerta=>`<button type="button" class="${alerta.nivel}" data-auto-alert="${alerta.tipo}" ${alerta.dominio?`data-auto-domain="${escapeHtml(alerta.dominio)}"`:""}><i class="fa-solid ${alerta.tipo==="repetido"?"fa-repeat":alerta.tipo==="larga"?"fa-stopwatch":"fa-route"}"></i><span><strong>${escapeHtml(alerta.titulo)}</strong><small>${escapeHtml(alerta.detalle)}</small></span><i class="fa-solid fa-chevron-right"></i></button>`).join("")}</div>`;
 el.querySelectorAll("[data-auto-alert]").forEach(boton=>boton.onclick=()=>{const tipo=boton.dataset.autoAlert;if(tipo==="repetido"){filtroRapidoHistorial="repetidos";const dominio=document.getElementById("historialPestanasDominio");if(dominio&&[...dominio.options].some(x=>x.value===boton.dataset.autoDomain))dominio.value=boton.dataset.autoDomain}else filtroRapidoHistorial=tipo==="larga"?"largas":"multipagina";document.querySelectorAll("[data-history-quick]").forEach(item=>item.classList.toggle("active",item.dataset.historyQuick===filtroRapidoHistorial));aplicarFiltrosHistorial()});
}
function gruposFiltrados(){
 const valor=id=>document.getElementById(id)?.value||"",q=txt(valor("historialPestanasBuscar")).toLowerCase(),clase=valor("historialPestanasClase"),dominio=valor("historialPestanasDominio"),seccion=valor("historialPestanasSeccion"),estado=valor("historialPestanasEstado"),clasificacion=valor("historialPestanasClasificacion"),version=valor("historialPestanasVersion"),paginas=Number(valor("historialPestanasPaginas"))||0,desde=valor("historialPestanasDesde"),hasta=valor("historialPestanasHasta"),dias=Number(valor("historialPestanasPeriodo"))||0,min=Number(valor("historialPestanasDuracionMin"))||0,maxTexto=valor("historialPestanasDuracionMax"),max=maxTexto===""?Infinity:Math.max(0,Number(maxTexto)||0),orden=valor("historialPestanasOrden")||"fecha-desc";
 const inicioPeriodo=dias?new Date(new Date().setHours(0,0,0,0)).getTime()-(dias-1)*86400000:0,inicio=desde?new Date(`${desde}T00:00:00`).getTime():0,fin=hasta?new Date(`${hasta}T23:59:59.999`).getTime():Infinity;
 const analisis=analizarAlertasAutomaticas(),grupos=agrupar(historialActual).filter(g=>{const d=datosGrupo(g),texto=d.eventos.map(e=>`${e.dominioDestino||""} ${e.tituloDestino||""}`).join(" ").toLowerCase(),clases=d.dominios.map(x=>claseDominio(x).clase),atencion=atencionGrupo(d,analisis),tieneRepetido=d.dominios.some(x=>analisis.dominiosRepetidos.has(txt(x).toLowerCase())),rapido=!filtroRapidoHistorial||(filtroRapidoHistorial==="pendientes"&&d.revision.estado==="pendiente")||(filtroRapidoHistorial==="alertas"&&atencion.codigo==="alta")||(filtroRapidoHistorial==="repetidos"&&tieneRepetido)||(filtroRapidoHistorial==="largas"&&d.segundos>=60)||(filtroRapidoHistorial==="multipagina"&&d.paginas>=3)||(filtroRapidoHistorial==="excluidas"&&d.revision.contabiliza===false);return rapido&&(!q||texto.includes(q))&&(!clase||d.clase===clase)&&(!dominio||d.dominios.includes(dominio))&&(!seccion||d.seccion===seccion)&&(!estado||(estado==="excluida"?d.revision.contabiliza===false:d.revision.estado===estado))&&(!clasificacion||clases.includes(clasificacion))&&(!version||d.version===version)&&(!paginas||(paginas===1?d.paginas===1:d.paginas>=paginas))&&d.segundos>=min&&d.segundos<=max&&(!inicio||d.inicio>=inicio)&&d.inicio<=fin&&(!inicioPeriodo||d.inicio>=inicioPeriodo)});
 grupos.sort((a,b)=>{const da=datosGrupo(a),db=datosGrupo(b);if(orden==="fecha-asc")return da.inicio-db.inicio;if(orden==="duracion-desc")return db.segundos-da.segundos;if(orden==="duracion-asc")return da.segundos-db.segundos;if(orden==="paginas-desc")return db.paginas-da.paginas;if(orden==="dominio-asc")return String(da.dominios[0]||"").localeCompare(String(db.dominios[0]||""),"es");if(orden==="estado-asc")return String(da.revision.estado||"").localeCompare(String(db.revision.estado||""),"es");return db.inicio-da.inicio});
 return grupos;
}
function eventosFiltrados(){return gruposFiltrados().flatMap(g=>g.eventos)}
function aplicarFiltrosHistorial(){
 const grupos=gruposFiltrados(),permitidos=new Set(grupos.map(g=>g.id)),contenedor=document.getElementById("historialPestanasContenido");
 grupos.forEach(g=>{const tarjeta=contenedor?.querySelector(`.tab-excursion[data-grupo-id="${CSS.escape(g.id)}"]`);if(tarjeta)contenedor.appendChild(tarjeta)});
 [...document.querySelectorAll("#historialPestanasContenido .tab-excursion")].forEach(x=>x.style.display=permitidos.has(x.dataset.grupoId)?"":"none");
 const eventos=grupos.flatMap(g=>g.eventos),r=document.getElementById("resumenFiltroHistorialPestanas");if(r)r.innerHTML=`Mostrando <strong>${grupos.length}</strong> salida${grupos.length===1?"":"s"} y <strong>${eventos.length}</strong> visita${eventos.length===1?"":"s"}`;
 const idsFiltros=["historialPestanasBuscar","historialPestanasClase","historialPestanasDesde","historialPestanasHasta","historialPestanasPeriodo","historialPestanasDominio","historialPestanasSeccion","historialPestanasEstado","historialPestanasClasificacion","historialPestanasDuracionMin","historialPestanasDuracionMax","historialPestanasPaginas","historialPestanasVersion"],activos=idsFiltros.filter(id=>txt(document.getElementById(id)?.value)).length+(filtroRapidoHistorial?1:0),contador=document.getElementById("cantidadFiltrosHistorialActivos");if(contador)contador.textContent=`${activos} activo${activos===1?"":"s"}`;
 const analisis=analizarAlertasAutomaticas(),todos=analisis.datos,conteos={todas:todos.length,pendientes:todos.filter(d=>d.revision.estado==="pendiente").length,alertas:todos.filter(d=>atencionGrupo(d,analisis).codigo==="alta").length,repetidos:todos.filter(d=>d.dominios.some(x=>analisis.dominiosRepetidos.has(txt(x).toLowerCase()))).length,largas:todos.filter(d=>d.segundos>=60).length,multipagina:todos.filter(d=>d.paginas>=3).length,excluidas:todos.filter(d=>d.revision.contabiliza===false).length};Object.entries(conteos).forEach(([id,valor])=>{const el=document.querySelector(`[data-history-quick-count="${id}"]`);if(el)el.textContent=String(valor)});
 renderAlertasAutomaticas();
 renderAnalitica(grupos);
 const dominios=new Map();eventos.forEach(e=>{const d=e.dominioDestino||"desconocido",actual=dominios.get(d)||{visitas:0,segundos:0};actual.visitas++;actual.segundos+=Math.max(0,Number(e.duracionSegundos)||0);dominios.set(d,actual)});
 const resumen=document.getElementById("resumenDominiosHistorialPestanas");if(resumen)resumen.innerHTML=[...dominios.entries()].sort((a,b)=>b[1].segundos-a[1].segundos).slice(0,6).map(([d,v])=>`<div class="tracking-incident-stat"><small>${escapeHtml(d)}${v.visitas>1?` · repetido ${v.visitas} veces`:""}</small><strong>${Math.floor(v.segundos/60)}m ${v.segundos%60}s</strong></div>`).join("");
}
function exportarHistorialPestanasPdf(){
 if(!window.jspdf?.jsPDF){alert("No se pudo cargar el generador de PDF. Verificá la conexión e intentá nuevamente.");return}
 const grupos=gruposFiltrados();if(!grupos.length){alert("No hay salidas visibles para exportar.");return}
 const {jsPDF}=window.jspdf,doc=new jsPDF(),datos=grupos.map(datosGrupo),eventos=datos.flatMap(d=>d.eventos),analisis=analizarAlertasAutomaticas(grupos),nombre=txt(estudianteHistorial?.estudiante?.nombre||estudianteHistorial?.nombreGoogle||"Estudiante"),email=txt(estudianteHistorial?.email||""),fechaEmision=new Date();
 const totalSegundos=datos.reduce((s,d)=>s+d.segundos,0),revisadas=datos.filter(d=>d.revision.estado!=="pendiente").length,alertadas=datos.filter(d=>atencionGrupo(d,analisis).codigo==="alta").length,dominios=new Set(eventos.map(e=>e.dominioDestino).filter(Boolean));
 doc.setFillColor(15,23,42);doc.rect(0,0,210,297,"F");doc.setFillColor(14,165,233);doc.rect(0,0,210,8,"F");
 doc.setTextColor(125,211,252);doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text("IPEM 146 · Seguimiento educativo",16,26);
 doc.setTextColor(248,250,252);doc.setFontSize(24);doc.text("Historial de pestañas",16,43);
 doc.setFontSize(12);doc.setFont("helvetica","normal");doc.setTextColor(203,213,225);doc.text("Informe docente de los recorridos visibles según los filtros seleccionados.",16,53);
 doc.setDrawColor(51,65,85);doc.line(16,62,194,62);
 doc.setFontSize(10);doc.setTextColor(226,232,240);doc.text(`Estudiante: ${nombre}`,16,76);doc.text(`Correo: ${email||"Sin correo informado"}`,16,83);doc.text(`Emitido: ${fechaEmision.toLocaleString("es-AR")}`,16,90);
 const tarjetas=[["Salidas visibles",datos.length],["Visitas",eventos.length],["Dominios",dominios.size],["Tiempo fuera",duracionLegible(totalSegundos)],["Revisadas",`${revisadas}/${datos.length}`],["Atención alta",alertadas]];
 tarjetas.forEach((item,indice)=>{const columna=indice%3,fila=Math.floor(indice/3),x=16+columna*60,y=108+fila*29;doc.setFillColor(30,41,59);doc.roundedRect(x,y,54,22,2,2,"F");doc.setTextColor(148,163,184);doc.setFontSize(8);doc.text(item[0],x+4,y+7);doc.setTextColor(248,250,252);doc.setFont("helvetica","bold");doc.setFontSize(13);doc.text(String(item[1]),x+4,y+16);doc.setFont("helvetica","normal")});
 doc.setTextColor(248,250,252);doc.setFont("helvetica","bold");doc.setFontSize(13);doc.text("Resumen de alertas automáticas",16,177);doc.setFont("helvetica","normal");doc.setFontSize(9);
 let portadaY=186;
 if(analisis.alertas.length){analisis.alertas.slice(0,7).forEach(alerta=>{doc.setFillColor(alerta.nivel==="alta"?127:120,alerta.nivel==="alta"?29:53,alerta.nivel==="alta"?29:15);doc.circle(19,portadaY-1.5,1.6,"F");doc.setTextColor(226,232,240);const lineas=doc.splitTextToSize(`${alerta.titulo}. ${alerta.detalle}`,168);doc.text(lineas,24,portadaY);portadaY+=lineas.length*4+4})}else{doc.setTextColor(187,247,208);doc.text("No se detectaron patrones automáticos relevantes en los resultados visibles.",16,portadaY)}
 doc.setTextColor(148,163,184);doc.setFontSize(8);doc.text("Las alertas son orientativas y requieren revisión docente. No generan sanciones automáticas.",16,278);
 let y=20;
 const nuevaPagina=()=>{doc.addPage();y=20};
 nuevaPagina();doc.setTextColor(15,23,42);doc.setFont("helvetica","bold");doc.setFontSize(17);doc.text("Recorridos visibles",14,y);y+=8;doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(71,85,105);doc.text(`${datos.length} salida${datos.length===1?"":"s"} incluidas por los filtros activos.`,14,y);y+=9;
 datos.forEach((d,indice)=>{
  const atencion=atencionGrupo(d,analisis),estado=etiquetaEstado(d.revision.estado)[0],altoBase=25;
  if(y+altoBase>278)nuevaPagina();
  doc.setFillColor(atencion.codigo==="alta"?254:atencion.codigo==="media"?255:248,atencion.codigo==="alta"?242:atencion.codigo==="media"?247:250,atencion.codigo==="alta"?242:atencion.codigo==="media"?237:252);doc.roundedRect(14,y-4,182,21,2,2,"F");
  doc.setTextColor(15,23,42);doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text(`Salida ${indice+1} · ${new Date(d.inicio).toLocaleString("es-AR")}`,18,y+3);
  doc.setFontSize(8.5);doc.setFont("helvetica","normal");doc.setTextColor(71,85,105);doc.text(`${d.paginas} página${d.paginas===1?"":"s"} · ${d.dominios.length} dominio${d.dominios.length===1?"":"s"} · ${duracionLegible(d.segundos)} · ${estado}`,18,y+10);y+=23;
  const resumen=`Atención: ${atencion.texto}. ${atencion.detalle}. Sección: ${d.seccion||"Sin identificar"}. Clase: ${d.clase||"Sin identificar"}.`;
  const lineasResumen=doc.splitTextToSize(resumen,176);if(y+lineasResumen.length*4>280)nuevaPagina();doc.setTextColor(51,65,85);doc.text(lineasResumen,18,y);y+=lineasResumen.length*4+3;
  d.eventos.forEach((evento,paso)=>{
   const textoPaso=`${paso+1}. ${evento.dominioDestino||"Dominio desconocido"} · ${evento.tituloDestino||"Sin título"} · ${horaLegible(evento.salidaEn)} a ${horaLegible(evento.regresoEn)} · ${duracionLegible(evento.duracionSegundos)}`;
   const lineas=doc.splitTextToSize(textoPaso,170);if(y+lineas.length*4+3>282)nuevaPagina();doc.setTextColor(30,41,59);doc.setFontSize(8.5);doc.text(lineas,22,y);y+=lineas.length*4+2;
  });
  if(d.revision.estado!=="pendiente"){const revisionTexto=`Revisión docente: ${estado}${d.revision.motivo?` · ${d.revision.motivo}`:""} · ${d.revision.contabiliza===false?"excluida":"incluida"} en el conteo.`;const lineas=doc.splitTextToSize(revisionTexto,170);if(y+lineas.length*4>282)nuevaPagina();doc.setFont("helvetica","bold");doc.setTextColor(3,105,161);doc.text(lineas,22,y);doc.setFont("helvetica","normal");y+=lineas.length*4+2}
  y+=5;
 });
 const paginas=doc.getNumberOfPages();for(let pagina=1;pagina<=paginas;pagina++){doc.setPage(pagina);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(pagina===1?148:100,pagina===1?163:116,pagina===1?184:139);doc.text(`Página ${pagina} de ${paginas}`,196,290,{align:"right"})}
 const archivo=`historial_pestanas_${nombre||email||"estudiante"}`.replace(/[^\w.-]+/g,"_");doc.save(`${archivo}.pdf`);
}
function exportarCsv(){
 const eventos=eventosFiltrados();if(!eventos.length){alert("No hay visitas que coincidan con los filtros.");return}
 const filas=[["Salida","Dominio","Título","Hora de salida","Hora de regreso","Duración (s)","Sección","Clase","Versión","Estado revisión","Motivo","Observación","Etiquetas","Incluida en conteo","Docente"],...eventos.map(e=>{const r=revisionesActuales.get(e.salidaGrupoId||e.id)||{};return[e.salidaGrupoId||e.id,e.dominioDestino,e.tituloDestino,e.salidaEn,e.regresoEn,e.duracionSegundos,e.seccionTitulo||e.seccionOrigen,e.claseId,e.extensionVersion,r.estado||"pendiente",r.motivo||"",r.observacion||"",(r.etiquetas||[]).join("|"),r.contabiliza===false?"No":"Sí",r.docente||""]})],csv=filas.map(f=>f.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n"),blob=new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download=`historial_pestanas_${txt(estudianteHistorial?.estudiante?.nombre||estudianteHistorial?.email||"estudiante").replace(/[^\w.-]+/g,"_")}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportarJson(){
 const grupos=gruposFiltrados();if(!grupos.length){alert("No hay salidas que coincidan con los filtros.");return}const datos={exportadoEn:new Date().toISOString(),estudiante:{uid:estudianteHistorial?.uid||"",nombre:estudianteHistorial?.estudiante?.nombre||"",email:estudianteHistorial?.email||""},salidas:grupos.map(g=>({salidaGrupoId:g.id,revision:datosGrupo(g).revision,visitas:g.eventos.map(e=>({dominio:e.dominioDestino,titulo:e.tituloDestino,salidaEn:e.salidaEn,regresoEn:e.regresoEn,duracionSegundos:e.duracionSegundos,seccion:e.seccionTitulo||e.seccionOrigen,clase:e.claseId,version:e.extensionVersion}))}))},blob=new Blob([JSON.stringify(datos,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`historial_pestanas_${txt(estudianteHistorial?.estudiante?.nombre||estudianteHistorial?.email||"estudiante").replace(/[^\w.-]+/g,"_")}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function esSesionDocenteActual(){
 const email=txt(window.firebaseCurrentUser?.email).toLowerCase(),docentes=(Array.isArray(window.TEACHER_EMAILS)?window.TEACHER_EMAILS:[]).map(x=>txt(x).toLowerCase());
 return Boolean(window.firebaseTeacherUser||document.body.classList.contains("teacher-authorized")||docentes.includes(email));
}
function asegurarResumenSeguimientoEstudiante(){
 const cabecera=document.querySelector("main>header.top-header");if(!cabecera||document.getElementById("studentTabTrackingSummary"))return;
 const panel=document.createElement("section");panel.id="studentTabTrackingSummary";panel.className="student-tab-summary";panel.hidden=true;panel.innerHTML=`<div class="student-tab-summary-heading"><div class="student-tab-summary-title"><span><i class="fa-solid fa-window-restore"></i></span><div><h2>Mi resumen de pestañas</h2><p>Podés ver cuántas salidas fueron registradas y cuáles ya revisó el docente.</p></div></div><button id="refreshStudentTabSummary" type="button" title="Actualizar resumen" aria-label="Actualizar resumen"><i class="fa-solid fa-rotate"></i></button></div><div id="studentTabSummaryContent" class="student-tab-summary-content"><p>Cargando resumen...</p></div>`;cabecera.after(panel);panel.querySelector("#refreshStudentTabSummary").onclick=cargarResumenSeguimientoEstudiante;
}
function estadoPublicoRevision(estado){
 return{revisada:["Revisada","info","fa-circle-check"],justificada:["Justificada","success","fa-shield-heart"],no_justificada:["No justificada","danger","fa-triangle-exclamation"],permitida:["Permitida","success","fa-circle-check"],advertencia:["Con advertencia","danger","fa-flag"],pendiente:["Pendiente","pending","fa-clock"]}[estado]||["Pendiente","pending","fa-clock"];
}
async function cargarResumenSeguimientoEstudiante(){
 asegurarResumenSeguimientoEstudiante();const panel=document.getElementById("studentTabTrackingSummary"),contenido=document.getElementById("studentTabSummaryContent"),user=window.firebaseCurrentUser;
 if(!panel||!contenido)return;if(!user||esSesionDocenteActual()){panel.hidden=true;return}panel.hidden=false;contenido.innerHTML='<p class="student-tab-loading"><i class="fa-solid fa-spinner fa-spin"></i> Actualizando seguimiento...</p>';window.ultimoErrorResumenPestanasEstudiante=null;
 const resultado=await Promise.resolve(window.obtenerResumenPestanasEstudianteFirebase?.()).catch(error=>{window.ultimoErrorResumenPestanasEstudiante=error;console.warn("No se pudo cargar el resumen de pestañas:",error);return{historial:[],revisiones:[]}})||{historial:[],revisiones:[]},historial=Array.isArray(resultado.historial)?resultado.historial:[],revisiones=Array.isArray(resultado.revisiones)?resultado.revisiones:[],mapa=new Map(revisiones.map(r=>[r.salidaGrupoId,r])),grupos=agrupar(historial),datos=grupos.map(g=>{const d=datosGrupo(g),revision=mapa.get(g.id)||{estado:"pendiente",revisado:false,contabiliza:true};return{...d,revisionPublica:revision}});
 const revisadas=datos.filter(d=>d.revisionPublica.revisado===true||d.revisionPublica.estado!=="pendiente"),pendientes=Math.max(0,datos.length-revisadas.length),tiempo=datos.reduce((s,d)=>s+d.segundos,0),ultimas=datos.slice(0,6);
 if(!historial.length&&window.ultimoErrorResumenPestanasEstudiante){contenido.innerHTML='<div class="student-tab-empty danger"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>No se pudo cargar el resumen</strong><span>Verificá que las reglas actualizadas de Firestore estén publicadas.</span></div></div>';return}
 contenido.innerHTML=`<div class="student-tab-stats"><div><small>Salidas registradas</small><strong>${datos.length||Number(document.getElementById("blurCount")?.textContent)||0}</strong></div><div><small>Revisadas</small><strong>${revisadas.length}</strong></div><div><small>Pendientes</small><strong>${pendientes}</strong></div><div><small>Tiempo registrado</small><strong>${duracionLegible(tiempo)}</strong></div></div>${ultimas.length?`<div class="student-tab-list">${ultimas.map((d,indice)=>{const revision=d.revisionPublica,[etiqueta,clase,icono]=estadoPublicoRevision(revision.estado),dominio=d.dominios[0]||"Pestaña externa";return`<article><span class="student-tab-order">${indice+1}</span><div><strong>${escapeHtml(dominio)}</strong><small>${escapeHtml(new Date(d.inicio).toLocaleString("es-AR"))} · ${escapeHtml(duracionLegible(d.segundos))} · ${d.paginas} página${d.paginas===1?"":"s"}</small></div><span class="tab-review-badge ${clase}"><i class="fa-solid ${icono}"></i>${escapeHtml(etiqueta)}</span></article>`}).join("")}</div><p class="student-tab-privacy"><i class="fa-solid fa-shield-halved"></i> Se muestra el estado general de la revisión. Las observaciones internas permanecen en el panel docente.</p>`:'<div class="student-tab-empty"><i class="fa-solid fa-circle-info"></i><div><strong>Todavía no hay recorridos externos</strong><span>Cuando se registre una salida, aparecerá aquí junto con su estado de revisión.</span></div></div>'}`;
}
window.actualizarResumenSeguimientoEstudiante=cargarResumenSeguimientoEstudiante;

let tableroCursoFiltrosInicializado=false;
let tableroCursoVista=[];
function tableroCursoFecha(d){
 const valores=[d?.ultimaActividad,d?.actualizadoEn,d?.presenciaActualizadaEn,d?.presenciaActualizadaEnCliente];
 for(const valor of valores){const n=ms(valor);if(n)return n}
 return 0;
}
function tableroCursoDificultad(d){
 const alerta=typeof obtenerAlertaConsultasIA==="function"?obtenerAlertaConsultasIA(d):{};
 const progreso=Number(typeof calcularProgresoEstudiante==="function"?calcularProgresoEstudiante(d):0)||0;
 const nota=typeof calcularNotaDefinitivaEstudiante==="function"?calcularNotaDefinitivaEstudiante(d):"—";
 return Boolean(alerta?.activa||d?.pantallaBloqueada===true||(progreso<25&&tableroCursoFecha(d)>0)||(nota!=="—"&&Number(nota)<4));
}
function tableroCursoRegistro(d){
 const e=d?.estudiante||{},actividad=tableroCursoFecha(d),ahora=Date.now(),reciente=actividad>0&&(ahora-actividad)<=15*60*1000;
 const progreso=Math.max(0,Math.min(100,Number(typeof calcularProgresoEstudiante==="function"?calcularProgresoEstudiante(d):0)||0));
 const notaTexto=typeof calcularNotaDefinitivaEstudiante==="function"?calcularNotaDefinitivaEstudiante(d):"—";
 const nota=notaTexto==="—"?null:Number(notaTexto);
 const alerta=typeof obtenerAlertaConsultasIA==="function"?obtenerAlertaConsultasIA(d):{};
 const alertas=(alerta?.activa?1:0)+(d?.pantallaBloqueada===true?1:0)+(d?.estadoCuenta==="pendiente"?1:0);
 return {d,e,nombre:txt(e.nombre||d?.nombreGoogle||d?.email||"Estudiante sin nombre"),email:txt(d?.email),curso:txt(e.curso),division:txt(e.division),turno:txt(e.turno),estado:txt(d?.estadoCuenta||"sin estado"),desafio:txt(d?.seccionActiva||"Sin desafío"),progreso,nota,notaTexto,actividad,reciente,dificultad:tableroCursoDificultad(d),alertas,alerta};
}
function tableroCursoValores(id,items,placeholder){
 const control=document.getElementById(id);if(!control)return;
 const anterior=control.value;const valores=[...new Set(items.map(x=>x||"").filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
 control.innerHTML=`<option value="">${placeholder}</option>`+valores.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
 if(valores.includes(anterior))control.value=anterior;
}
function tableroCursoAsegurarFiltros(){
 const contenedor=document.getElementById("tableroCursoFiltros");if(!contenedor)return;
 if(tableroCursoFiltrosInicializado)return;
 contenedor.innerHTML=`<label>Curso<select id="tableroFiltroCurso"><option value="">Todos</option></select></label>
 <label>División<select id="tableroFiltroDivision"><option value="">Todas</option></select></label>
 <label>Turno<select id="tableroFiltroTurno"><option value="">Todos</option></select></label>
 <label>Estado<select id="tableroFiltroEstado"><option value="">Todos</option><option value="activo">Activos</option><option value="pendiente">Pendientes</option><option value="inactivo">Inactivos</option></select></label>
 <label>Actividad<select id="tableroFiltroActividad"><option value="">Cualquier actividad</option><option value="reciente">Actividad reciente</option><option value="sin-reciente">Sin actividad reciente</option></select></label>
 <label>Dificultades<select id="tableroFiltroDificultad"><option value="">Todos</option><option value="si">Con dificultades</option><option value="no">Sin dificultades</option></select></label>
 <label>Orden<select id="tableroOrden"><option value="nombre">Nombre</option><option value="progreso-desc">Progreso: mayor primero</option><option value="nota-desc">Nota: mayor primero</option><option value="actividad-desc">Última actividad: reciente</option><option value="alertas-desc">Alertas: mayor primero</option></select></label>`;
 contenedor.querySelectorAll("select").forEach(x=>x.addEventListener("change",renderTableroCurso));
 const exportar=document.getElementById("btnExportarTableroCurso");if(exportar)exportar.onclick=exportarTableroCursoCsv;
 tableroCursoFiltrosInicializado=true;
}
function tableroCursoFiltrados(){
 const registros=estudiantesProfesor.map(tableroCursoRegistro);
 tableroCursoValores("tableroFiltroCurso",registros.map(x=>x.curso),"Todos");
 tableroCursoValores("tableroFiltroDivision",registros.map(x=>x.division),"Todas");
 tableroCursoValores("tableroFiltroTurno",registros.map(x=>x.turno),"Todos");
 const valor=id=>document.getElementById(id)?.value||"";
 const curso=valor("tableroFiltroCurso"),division=valor("tableroFiltroDivision"),turno=valor("tableroFiltroTurno"),estado=valor("tableroFiltroEstado"),actividad=valor("tableroFiltroActividad"),dificultad=valor("tableroFiltroDificultad");
 const lista=registros.filter(x=>(!curso||x.curso===curso)&&(!division||x.division===division)&&(!turno||x.turno===turno)&&(!estado||x.estado===estado)&&(!actividad||(actividad==="reciente"?x.reciente:!x.reciente))&&(!dificultad||(dificultad==="si"?x.dificultad:!x.dificultad)));
 const orden=valor("tableroOrden")||"nombre",numero=(a,b)=>Number(a||0)-Number(b||0);
 lista.sort((a,b)=>orden==="progreso-desc"?numero(b.progreso,a.progreso):orden==="nota-desc"?numero(b.nota,a.nota):orden==="actividad-desc"?numero(b.actividad,a.actividad):orden==="alertas-desc"?numero(b.alertas,a.alertas):a.nombre.localeCompare(b.nombre,"es"));
 return lista;
}
function tableroCursoRenderResumen(){
 const contenedor=document.getElementById("tableroCursoResumen");if(!contenedor)return;
 const registros=estudiantesProfesor.map(tableroCursoRegistro),notas=registros.filter(x=>Number.isFinite(x.nota)).map(x=>x.nota);
 const promedioProgreso=registros.length?(registros.reduce((s,x)=>s+x.progreso,0)/registros.length).toFixed(0):0;
 const promedioNota=notas.length?(notas.reduce((s,x)=>s+x,0)/notas.length).toFixed(1):"—";
 const activos=registros.filter(x=>x.estado==="activo").length,pendientes=registros.filter(x=>x.estado==="pendiente").length,sinActividad=registros.filter(x=>!x.reciente).length;
 contenedor.innerHTML=[["Estudiantes",registros.length],["Activos",activos],["Pendientes",pendientes],["Sin actividad reciente",sinActividad],["Progreso medio",`${promedioProgreso}%`],["Nota media",promedioNota]].map(x=>`<div class="course-dashboard-stat"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");
}
function renderTableroCurso(){
 const estado=document.getElementById("tableroCursoProfesorEstado"),tabla=document.getElementById("tableroCursoTabla");if(!estado||!tabla)return;
 tableroCursoAsegurarFiltros();tableroCursoRenderResumen();
 if(!estudiantesProfesor.length){estado.textContent="No hay estudiantes autorizados para mostrar.";tabla.innerHTML='<div class="course-dashboard-empty"><i class="fa-solid fa-users"></i> No hay datos disponibles para este curso.</div>';return}
 tableroCursoVista=tableroCursoFiltrados();estado.textContent=`Mostrando ${tableroCursoVista.length} de ${estudiantesProfesor.length} estudiantes autorizados.`;
 if(!tableroCursoVista.length){tabla.innerHTML='<div class="course-dashboard-empty"><i class="fa-solid fa-filter-circle-xmark"></i> Ningún estudiante coincide con los filtros.</div>';return}
 tabla.innerHTML=`<table class="course-dashboard-table"><thead><tr><th>Estudiante</th><th>Curso / división / turno</th><th>Estado</th><th>Desafío actual</th><th>Progreso</th><th>Última actividad</th><th>Nota media</th><th>Alertas</th><th>Detalle</th></tr></thead><tbody>${tableroCursoVista.map(x=>`<tr><td><strong>${escapeHtml(x.nombre)}</strong><small>${escapeHtml(x.email||"Sin correo")}</small></td><td>${escapeHtml(x.curso||"—")} / ${escapeHtml(x.division||"—")} / ${escapeHtml(x.turno||"—")}</td><td>${escapeHtml(x.estado)}</td><td>${escapeHtml(x.desafio)}</td><td>${x.progreso}%</td><td>${x.actividad?escapeHtml(new Date(x.actividad).toLocaleString("es-AR")):"Sin actividad reciente"}</td><td>${escapeHtml(x.notaTexto)}</td><td class="${x.alertas?"course-dashboard-alert":""}">${x.alertas?`${x.alertas} alerta${x.alertas===1?"":"s"}`:"Sin alertas"}</td><td><button type="button" class="btn btn-secondary btn-tablero-detalle" data-uid="${escapeHtml(x.d.uid||"")}">Ver</button></td></tr>`).join("")}</tbody></table>`;
 tabla.querySelectorAll(".btn-tablero-detalle").forEach(b=>b.onclick=()=>{const item=tableroCursoVista.find(x=>String(x.d.uid)===String(b.dataset.uid));if(!item)return;const detalle=document.getElementById("tableroCursoDetalle");detalle.hidden=false;detalle.innerHTML=`<h4>${escapeHtml(item.nombre)}</h4><div class="course-dashboard-detail-grid"><span><strong>Correo:</strong> ${escapeHtml(item.email||"—")}</span><span><strong>Estado:</strong> ${escapeHtml(item.estado)}</span><span><strong>Progreso:</strong> ${item.progreso}%</span><span><strong>Nota media:</strong> ${escapeHtml(item.notaTexto)}</span><span><strong>Desafío:</strong> ${escapeHtml(item.desafio)}</span><span><strong>Alertas:</strong> ${item.alertas}</span></div>`;});
}
function exportarTableroCursoCsv(){
 if(!tableroCursoVista.length){alert("No hay estudiantes visibles para exportar.");return}
 const filas=[["Nombre","Correo","Curso","Division","Turno","Estado","Desafio actual","Progreso","Ultima actividad","Nota media","Alertas"],...tableroCursoVista.map(x=>[x.nombre,x.email,x.curso,x.division,x.turno,x.estado,x.desafio,`${x.progreso}%`,x.actividad?new Date(x.actividad).toISOString():"",x.notaTexto,x.alertas])];
 const csv=filas.map(f=>f.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n"),blob=new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`tablero_curso_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
window.renderTableroCurso=renderTableroCurso;

const renderOriginal=typeof renderPanelProfesor==="function"?renderPanelProfesor:null;
if(renderOriginal)renderPanelProfesor=function(){renderOriginal();asegurarPaneles();mejorarTabla();renderTableroCurso()};
const limpiarOriginal=typeof limpiarFiltrosProfesor==="function"?limpiarFiltrosProfesor:null;
if(limpiarOriginal)limpiarFiltrosProfesor=function(){limpiarOriginal();const e=document.getElementById("filtroSeguimientoProfesor"),d=document.getElementById("filtroDominioSeguimientoProfesor");if(e)e.value="";if(d)d.value="";filtrarTabla()};
const historialOriginal=typeof abrirHistorialPestanas==="function"?abrirHistorialPestanas:null;
if(historialOriginal)abrirHistorialPestanas=async function(indice){
 await historialOriginal(indice);estudianteHistorial=estudiantesProfesor[indice]||null;if(!estudianteHistorial?.uid)return;
 [historialActual]=await Promise.all([window.obtenerHistorialPestanasFirebase?.(estudianteHistorial.uid)||[]]);const revisiones=await window.obtenerRevisionesPestanasFirebase?.(estudianteHistorial.uid)||[];revisionesActuales=new Map(revisiones.map(r=>[r.salidaGrupoId,r]));void window.sincronizarRevisionesPublicasPestanasFirebase?.(estudianteHistorial.uid,revisiones);salidasSeleccionadas.clear();asegurarFiltrosHistorial();asegurarModalesRevision();
 const cargarSelect=(id,primera,valores)=>{const s=document.getElementById(id);if(s)s.innerHTML=`<option value="">${primera}</option>`+[...new Set(valores.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"es",{numeric:true})).map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")};
 cargarSelect("historialPestanasClase","Todas",historialActual.map(e=>e.claseId));cargarSelect("historialPestanasDominio","Todos",historialActual.map(e=>e.dominioDestino));cargarSelect("historialPestanasSeccion","Todas",historialActual.map(e=>e.seccionTitulo||e.seccionOrigen));cargarSelect("historialPestanasVersion","Todas",historialActual.map(e=>e.extensionVersion));
 decorarSalidas();aplicarFiltrosHistorial();
};
window.addEventListener("estado-inicio-clase",e=>setTimeout(()=>{cargarFormulario(e.detail?.configuracionSeguimiento||window.configuracionSeguimientoActual||{});if(document.getElementById("panelProfesorModal")?.classList.contains("active"))renderPanelProfesor()},0));
window.addEventListener("profesor-data",()=>setTimeout(()=>{mejorarTabla();renderTableroCurso();if(document.getElementById("mensajeriaDocenteModal")?.classList.contains("active"))renderHistorialMensajesDocente()},0));
window.addEventListener("firebase-auth-changed",()=>setTimeout(()=>{cargarResumenSeguimientoEstudiante();iniciarAlertasChatCooperativoEstudiante();iniciarConsentimientosCooperacionEstudiante()},80));
window.addEventListener("estado-cuenta-estudiante",()=>setTimeout(()=>{iniciarAlertasChatCooperativoEstudiante();iniciarConsentimientosCooperacionEstudiante()},80));
window.addEventListener("seccion-estudiante-cambiada",()=>setTimeout(iniciarAlertasChatCooperativoEstudiante,40));
document.addEventListener("keydown",evento=>{
 const actual=evento.target.closest?.(".teacher-workspace-tab");if(!actual||!["ArrowLeft","ArrowRight","Home","End"].includes(evento.key))return;const botones=[...document.querySelectorAll(".teacher-workspace-tab")],indice=botones.indexOf(actual);let siguiente=indice;if(evento.key==="ArrowRight")siguiente=(indice+1)%botones.length;if(evento.key==="ArrowLeft")siguiente=(indice-1+botones.length)%botones.length;if(evento.key==="Home")siguiente=0;if(evento.key==="End")siguiente=botones.length-1;evento.preventDefault();botones[siguiente]?.focus();activarPestanaDocente(botones[siguiente]?.dataset.teacherTab);
});
iniciarViewportMovil();asegurarTemaAplicacion();asegurarPaneles();asegurarResumenSeguimientoEstudiante();setTimeout(cargarResumenSeguimientoEstudiante,1800);setTimeout(()=>{iniciarAlertasChatCooperativoEstudiante();iniciarConsentimientosCooperacionEstudiante()},250);
const intervalosMejoras=[
 setInterval(()=>{if(!document.hidden)mejorarTabla()},10000),
 setInterval(()=>{if(!document.hidden)cargarResumenSeguimientoEstudiante()},60000)
];
window.addEventListener("pagehide",()=>{intervalosMejoras.forEach(clearInterval);detenerAlertasChatCooperativoEstudiante(false);detenerConsentimientosCooperacionEstudiante()},{once:true});
})();
