// ===== Cambiar tema =====
const toggleTema = document.getElementById('toggleTema');
toggleTema.addEventListener('click', () => {
    document.body.classList.toggle('tema-oscuro');
    toggleTema.textContent = document.body.classList.contains('tema-oscuro') ? 'Modo Claro' : 'Modo Oscuro';
});

// ===== Trivia interactiva =====
const respuestas = document.querySelectorAll(".respuesta");
const feedback = document.getElementById("feedback");

respuestas.forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.dataset.correcta === "true") {
            feedback.textContent = "¡Correcto! Argentina obtiene aproximadamente 5% de su energía de fuentes solares.";
            feedback.classList.add("correcto");
            feedback.classList.remove("incorrecto");
        } else {
            feedback.textContent = "Incorrecto. Intenta de nuevo.";
            feedback.classList.add("incorrecto");
            feedback.classList.remove("correcto");
        }
    });
});

// ===== Mapa Leaflet =====
const mapa = L.map('mapa').setView([-31.9586, -65.2150], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(mapa);

L.marker([-31.9586, -65.2150]).addTo(mapa)
    .bindPopup('<b>Usina Solar CEMDO I</b><br>Mina Clavero, Córdoba')
    .openPopup();

// ===== Galería Lightbox =====
const imgs = document.querySelectorAll('.img-galeria');
const lightbox = document.getElementById('lightbox');
const imgLightbox = document.getElementById('imgLightbox');
const cerrar = document.getElementById('cerrar');

imgs.forEach(img => {
    img.addEventListener('click', () => {
        imgLightbox.src = img.src;
        lightbox.style.display = 'flex';
    });
});

cerrar.addEventListener('click', () => { lightbox.style.display = 'none'; });
lightbox.addEventListener('click', e => { if(e.target === lightbox) lightbox.style.display = 'none'; });
