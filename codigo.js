const respuestasCorrectas = {
  1: 'a',
  2: 'b',
  3: 'a',
  4: 'b',
  5: 'b',
  6: 'b',
  7: 'b',
  8: 'a',
  9: 'c',
  10: 'a',
  11: 'c',
  12: 'a',
  13: 'c',
  14: 'a',
  15: 'a'
};

const respuestasUsuario = {};

const botonesPreguntas = document.querySelectorAll("button[data-pregunta]");
const botonVerResultado = document.getElementById("verResultado");
const botonReiniciar = document.getElementById("reiniciar");
const resultadoDiv = document.getElementById("resultado");

botonesPreguntas.forEach(boton => {
  boton.addEventListener("click", () => {
    const pregunta = boton.getAttribute("data-pregunta");
    const respuesta = boton.getAttribute("data-respuesta");

    respuestasUsuario[pregunta] = respuesta;

    const contenedor = document.getElementById(`pregunta-${pregunta}`);
    const botones = contenedor.querySelectorAll("button");

    // Reset botones
    botones.forEach(btn => {
      btn.style.border = "none";
      btn.style.backgroundColor = "#2979ff";
    });

    // Destacar botón seleccionado
    boton.style.border = "2px solid #fff";
    boton.style.backgroundColor = "#5393ff";
  });
});

botonVerResultado.addEventListener("click", () => {
  // Validar que respondieron todas
  const totalPreguntas = Object.keys(respuestasCorrectas).length;
  if(Object.keys(respuestasUsuario).length < totalPreguntas) {
    alert("Por favor, responde todas las preguntas antes de ver el resultado.");
    return;
  }

  let correctas = 0;

  for(let i = 1; i <= totalPreguntas; i++) {
    const respuestaUsuario = respuestasUsuario[i];
    const correcta = respuestasCorrectas[i];
    const contenedor = document.getElementById(`pregunta-${i}`);
    const botones = contenedor.querySelectorAll("button");
    const feedback = document.getElementById(`feedback-${i}`);

    botones.forEach(btn => {
      const valor = btn.getAttribute("data-respuesta");
      btn.disabled = true;

      if(valor === correcta) {
        btn.style.backgroundColor = "#4caf50"; // verde
      }
      if(valor === respuestaUsuario && respuestaUsuario !== correcta) {
        btn.style.backgroundColor = "#ef5350"; // rojo
      }
    });

    if(respuestaUsuario === correcta) {
      correctas++;
      feedback.textContent = "✔️ ¡Correcto!";
      feedback.classList.remove("incorrecto");
      feedback.classList.add("correcto");
    } else {
      feedback.textContent = `❌ Incorrecto. La respuesta correcta era "${correcta}".`;
      feedback.classList.remove("correcto");
      feedback.classList.add("incorrecto");
    }
  }

  resultadoDiv.textContent = `Resultado final: ${correctas} de ${totalPreguntas} correctas.`;
  botonVerResultado.style.display = "none";
  botonReiniciar.style.display = "inline-block";
});

botonReiniciar.addEventListener("click", () => {
  // Limpiar respuestas
  Object.keys(respuestasUsuario).forEach(key => delete respuestasUsuario[key]);

  const totalPreguntas = Object.keys(respuestasCorrectas).length;
  for(let i = 1; i <= totalPreguntas; i++) {
    const contenedor = document.getElementById(`pregunta-${i}`);
    const botones = contenedor.querySelectorAll("button");
    const feedback = document.getElementById(`feedback-${i}`);

    botones.forEach(btn => {
      btn.disabled = false;
      btn.style.backgroundColor = "#2979ff";
      btn.style.border = "none";
    });
    feedback.textContent = "";
    feedback.classList.remove("correcto", "incorrecto");
  }

  resultadoDiv.textContent = "";
  botonVerResultado.style.display = "inline-block";
  botonReiniciar.style.display = "none";
});
