(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }

  function textoSeguro(value, max = 2000) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function debounce(fn, wait = 250) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  window.appUtils = Object.freeze({
    escapeHtml,
    textoSeguro,
    debounce
  });
})();
