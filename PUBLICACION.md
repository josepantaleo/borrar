# Publicacion estable

## Modulo docente oficial

El modulo docente oficial es `modulo-profesor.html`. Es la version completa que conserva la integracion actual con Firebase. No esta enlazada desde `index.html` ni `actividad.html`; se abre de forma independiente cuando corresponde.

## Archivos heredados conservados

Estos archivos no se eliminan porque no se encontro una referencia interna concluyente que permita descartar su uso externo:

- `modulo-profeso.html`: version anterior; referencia `desafios_ia.js`, que no existe en la carpeta actual, y contiene configuracion Firebase de reemplazo.
- `actividad_analista_viabilidad_excelencia (8).html`: borrador HTML independiente no enlazado por la aplicacion principal.
- `ejerciciosbucles.html`: ejercicio HTML independiente no enlazado por la aplicacion principal.
- `mejoras-seguimiento-codemirror.js`: implementacion auxiliar no cargada por `actividad.html`.

No deben considerarse entradas de produccion sin una revision especifica.

## Versionado de recursos

Los recursos locales cargados por `actividad.html` usan el formato `?v=YYYYMMDD-N`.

El script `versionar-publicacion.ps1` actualiza en conjunto:

- hojas de estilo de la actividad;
- scripts de actividad;
- scripts auxiliares cargados por `actividad.html`;
- la importacion de `codemirror-bundle.js`.

Antes de publicar:

```powershell
.\versionar-publicacion.ps1
npm.cmd run validate
```

La validacion comprueba:

- archivos obligatorios;
- referencias locales inexistentes en HTML y JavaScript;
- formato de las versiones;
- scripts JavaScript con errores de sintaxis;
- registros de Firebase presentes localmente y su exclusion mediante `.gitignore`.

Los registros pueden existir durante el desarrollo, pero no deben formar parte del paquete publicado.
