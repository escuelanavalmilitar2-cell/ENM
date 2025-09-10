// script.js - lógica separada y mejorada
document.addEventListener('DOMContentLoaded', () => {
  // CONFIG: URL de tu Apps Script (si es necesario cámbiala)
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwCI_TMUY1E9kuImPXIPTAg5gFT6Cgpi7BsSvI1eiG_DvQqhdBEAP3hR-OzM8JmNQpClg/exec";

  // Fondos (ajusta extensión si usas .jpeg / .JPG)
  const fondos = ["IMG/1M.jpg', 'IMG/2M.jpg', 'IMG/3M.jpg', 'IMG/4M.jpg"];
  let fondoIndex = 0;

  // preparar capas de fondo
  const bg1 = document.getElementById('bg1');
  const bg2 = document.getElementById('bg2');
  bg1.className = 'bg-layer visible';
  bg2.className = 'bg-layer';

  // precarga imágenes
  fondos.forEach(src => { const img = new Image(); img.src = src; });

  // inicializar primer fondo
  bg1.style.backgroundImage = `url('${fondos[0]}')`;
  bg2.style.backgroundImage = `url('${fondos[1 % fondos.length]}')`;

  // crossfade function
  let front = 1; // which bg is visible (1 or 2)
  function crossfadeTo(nextIndex) {
    const show = front === 1 ? bg2 : bg1;
    const hide = front === 1 ? bg1 : bg2;
    show.style.backgroundImage = `url('${fondos[nextIndex]}')`;
    show.classList.add('visible');
    hide.classList.remove('visible');
    front = front === 1 ? 2 : 1;
    fondoIndex = nextIndex;
  }

  // steps
  const steps = Array.from(document.querySelectorAll('.form-step'));
  let currentStep = 0;

  // botones next
  const nextButtons = Array.from(document.querySelectorAll('.next-btn'));
  nextButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const stepIdx = currentStep;
      if (!isStepValid(steps[stepIdx])) {
        alert('⚠️ Completa todos los campos del paso antes de continuar.');
        return;
      }
      // avanzar
      steps[stepIdx].classList.remove('active');
      currentStep++;
      if (currentStep >= steps.length) currentStep = steps.length - 1;
      steps[currentStep].classList.add('active');

      // cambiar fondo (siguiente)
      const nextIdx = (fondoIndex + 1) % fondos.length;
      crossfadeTo(nextIdx);
    });
  });

  // utilidad validación de paso (inputs, selects multiple, file)
  function isStepValid(stepEl) {
    const fields = Array.from(stepEl.querySelectorAll('input, select'));
    for (const f of fields) {
      if (f.tagName.toLowerCase() === 'select' && f.multiple) {
        if (f.required && f.selectedOptions.length === 0) return false;
      } else if (f.type === 'file') {
        if (f.required && f.files.length === 0) return false;
      } else {
        if (f.required && !String(f.value).trim()) return false;
      }
    }
    return true;
  }

  // habilitar/deshabilitar botones del paso automáticamente
  steps.forEach((step, idx) => {
    const controls = Array.from(step.querySelectorAll('input, select'));
    const nextBtn = step.querySelector('.next-btn');
    function check() {
      if (nextBtn) nextBtn.disabled = !isStepValid(step);
    }
    controls.forEach(c => c.addEventListener('input', check));
    controls.forEach(c => c.addEventListener('change', check));
    check();
  });

  // generación automática de matrícula (inicial apellido + - + últimos 4 del CI)
  const apellidoPaterno = document.getElementById('apellidoPaterno');
  const ciField = document.getElementById('ci');
  const matriculaInput = document.getElementById('matricula');
  const matriculaDisplay = document.getElementById('matriculaDisplay');

  function generarMatriculaAuto() {
    const ap = (apellidoPaterno.value || '').trim();
    const ci = (ciField.value || '').trim().replace(/\D/g, ''); // solo dígitos
    if (ap && ci.length >= 4) {
      const matric = ap.charAt(0).toUpperCase() + '-' + ci.slice(-4);
      matriculaInput.value = matric;
      matriculaDisplay.textContent = 'Matrícula: ' + matric;
    } else {
      matriculaInput.value = '';
      matriculaDisplay.textContent = '';
    }
  }

  apellidoPaterno.addEventListener('input', generarMatriculaAuto);
  ciField.addEventListener('input', generarMatriculaAuto);

  // botón generar matrícula (manual)
  document.getElementById('btnGenerar').addEventListener('click', () => {
    generarMatriculaAuto();
    if (!matriculaInput.value) alert('Completa Apellido Paterno y C.I. para generar matrícula.');
  });

  // SUBIR DATOS: prevenir doble envío, mostrar "Cargando datos...", enviar FormData
  const btnSubir = document.getElementById('btnSubir');
  const mensajeCarga = document.getElementById('mensajeCarga');
  const registroForm = document.getElementById('registroForm');
  let isSubmitting = false;

  btnSubir.addEventListener('click', async () => {
    // validar último paso
    const lastStepEl = steps[steps.length - 1];
    if (!isStepValid(lastStepEl)) { alert('Completa todos los campos antes de enviar.'); return; }

    // generar matrícula si no existe
    generarMatriculaAuto();
    if (!matriculaInput.value) { alert('Genera la matrícula antes de enviar.'); return; }

    if (isSubmitting) return;
    isSubmitting = true;

    // ocultar botón y mostrar mensaje
    btnSubir.style.display = 'none';
    mensajeCarga.textContent = '⏳ Cargando datos...';

    // deshabilitar inputs para evitar interacción
    registroForm.querySelectorAll('input, select, button').forEach(el => el.disabled = true);

    // preparar FormData
    const fd = new FormData(registroForm);
    fd.append('fechaRegistro', new Date().toISOString());

    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', body: fd });
      const text = await res.text();

      // tratas JSON si tu script devuelve JSON {status:'ok'}
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }

      if (res.ok || (parsed && parsed.status === 'ok')) {
        mensajeCarga.textContent = '✅ Datos enviados correctamente';
        // mantener botón oculto (previene doble registro)
      } else {
        mensajeCarga.textContent = '❌ Error al enviar los datos';
        console.error('Respuesta:', text);
        // permitir reintento
        registroForm.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
        btnSubir.style.display = 'inline-block';
        isSubmitting = false;
      }
    } catch (err) {
      console.error(err);
      mensajeCarga.textContent = '❌ Error de conexión';
      registroForm.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
      btnSubir.style.display = 'inline-block';
      isSubmitting = false;
    }
  });

});
