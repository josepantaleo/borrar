# Publicacion estable

## Modulo docente oficial

El modulo docente oficial es `modulo-profesor.html`. Es la version completa que conserva la integracion actual con Firebase. No esta enlazada desde `index.html` ni `actividad.html`; se abre de forma independiente cuando corresponde.

## Archivos heredados retirados

La carpeta de publicacion ya no incluye borradores HTML, implementaciones auxiliares
sin cargar ni copias divergentes de las reglas de Firestore. El unico archivo de
reglas desplegable es `reglas.txt`.

La carpeta `functions/` es parte del despliegue productivo. GitHub Pages publica
solo el cliente; las funciones callable y las reglas de Firestore deben publicarse
en el proyecto Firebase `ipem146js` siguiendo `BACKEND_SEGURO.md`.

## Versionado de recursos

Los recursos locales cargados por `actividad.html` usan el formato `?v=YYYYMMDD-N`.

El script `versionar-publicacion.ps1` actualiza en conjunto:

- hojas de estilo de la actividad;
- scripts de actividad;
- scripts auxiliares cargados por `actividad.html`;
- la importacion de `codemirror-bundle.js`.
- las funciones de `functions/` y sus dependencias bloqueadas en `functions/package-lock.json`.

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
