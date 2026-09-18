(function () {
  "use strict";

  let rafPendiente = false;

  function autorizado() {
    return Boolean(
      document.body?.classList.contains("teacher-authorized") &&
      document.body?.classList.contains("teacher-temporary") &&
      window.firebaseTeacherUser
    );
  }

  function render() {
    if (!autorizado() || typeof window.renderPanelProfesorCore !== "function") return;
    if (rafPendiente) return;
    rafPendiente = true;
    requestAnimationFrame(() => {
      rafPendiente = false;
      window.renderPanelProfesorCore();
    });
  }

  window.panelProfesor = Object.freeze({
    render,
    autorizado
  });
  window.renderPanelProfesorModular = render;
})();
