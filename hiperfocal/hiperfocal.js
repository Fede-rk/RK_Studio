// hiperfocal/hiperfocal.js
// Lógica de cálculo óptico, submenús y experiencia guiada para RK Hiperfocal

import { SENSOR_TYPES, POPULAR_CAMERAS } from './cameras.js';

// Application State
const state = {
  activeMode: 'landscape', // 'landscape', 'astro', 'street', 'custom'
  selectedSensor: 'full_frame',
  cameraDisplayName: 'Full Frame (35mm)',
  focalLength: 24, // mm
  aperture: 8.0,   // f/number
  strictCoc: false,
  unit: 'm',       // 'm' or 'ft'
};

// Mode presets configuration
const MODE_PRESETS = {
  landscape: {
    name: 'Paisaje Diurno',
    icon: '🏔️',
    focal: 24,
    aperture: 8.0,
    strictCoc: false,
    subtitle: 'Máxima nitidez desde el primer plano hasta el horizonte',
    focals: [14, 16, 20, 24, 28, 35, 50, 70],
    focalRange: { min: 14, max: 70 },
    apertures: [5.6, 8.0, 11.0],
    curatedNote: '<strong>Opciones curadas para Paisaje:</strong> Focales angulares (14mm–70mm) y aperturas de punto dulce (f/5.6–f/11). Evitamos f/16–f/22 por difracción óptica. Si usás teleobjetivo (ej. 70-300mm), enfocá directo a tu sujeto principal.',
    guide: `
      <p><strong>🎯 Regla del Paisaje:</strong> Usá la hiperfocal si tenés suelo cercano (rocas, flores a 1-2 metros) y horizonte al fondo. Si estás en un mirador sin primer plano cercano, enfocá directo al infinito o tercio medio.</p>
    `
  },
  astro: {
    name: 'Paisaje Nocturno (con suelo)',
    icon: '🌌',
    focal: 16,
    aperture: 2.8,
    strictCoc: true,
    subtitle: 'Vía Láctea o estrellas junto a rocas, carpas o árboles',
    focals: [14, 16, 20, 24],
    focalRange: { min: 14, max: 24 },
    apertures: [1.4, 1.8, 2.0, 2.8],
    curatedNote: '<strong>Opciones curadas para Noche:</strong> Solo grandes angulares luminosos (f/1.4 a f/2.8) para captar luz estelar con el suelo. Si querés fotografiar <strong>solo la Luna o el espacio</strong>, usá la guía de Luna arriba.',
    guide: `
      <p><strong>🌌 Regla Nocturna:</strong> Con la hiperfocal en f/2.8 asegurás nitidez en la tierra y en las estrellas. Para objetos celestes puros sin suelo, nunca uses hiperfocal: enfocá al infinito.</p>
    `
  },
  street: {
    name: 'Fotografía Callejera (Street)',
    icon: '🏙️',
    focal: 35,
    aperture: 8.0,
    strictCoc: false,
    subtitle: 'Disparo instantáneo sin retardo de autofocus ("Zone Focusing")',
    focals: [24, 28, 35, 50],
    focalRange: { min: 24, max: 50 },
    apertures: [5.6, 8.0, 11.0],
    curatedNote: '<strong>Opciones curadas para Street:</strong> Focales clásicas de calle (24mm–50mm) en f/5.6–f/11 para <em>Zone Focusing</em>. Consejo clave: usá velocidad mínima de <strong>1/250s</strong> (con Auto ISO) para congelar a los peatones en movimiento.',
    guide: `
      <p><strong>⚡ Enfoque por Zonas (Zone Focusing):</strong> Dejás tu lente fijado en la hiperfocal y disparás al instante sin esperar el autoenfoque. Todo lo que cruce la zona nítida saldrá enfocado.</p>
    `
  },
  custom: {
    name: 'Modo Libre / Personalizado',
    icon: '⚙️',
    focal: 24,
    aperture: 8.0,
    strictCoc: false,
    subtitle: 'Control total de sensor, focal de 8mm a 600mm y diafragma',
    focals: [14, 16, 20, 24, 28, 35, 50, 70, 135, 200, 250, 400, 600],
    focalRange: { min: 8, max: 600 },
    apertures: [1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0],
    curatedNote: '<strong>⚙️ Modo Libre sin restricciones:</strong> Calculadora abierta con rango de 8mm a 600mm y diafragmas de f/1.4 a f/16 para calcular cualquier objetivo o experimentar libremente.',
    guide: `
      <p><strong>Modo Libre:</strong> Exploración geométrica libre. <em>Nota:</em> En teleobjetivos largos (>100mm) la hiperfocal suele superar los 100m–300m, por lo que para aves, retratos o deportes siempre se enfoca al sujeto.</p>
    `
  }
};

// DOM Screens
const screenDisciplines   = document.getElementById('screen-disciplines');
const screenAstroSub      = document.getElementById('screen-astro-sub');
const screenMoonGuide     = document.getElementById('screen-moon-guide');
const screenCalculator    = document.getElementById('screen-calculator');

// Banner & Navigation
const btnChangeMode       = document.getElementById('btn-change-mode');
const btnBackDisciplines  = document.getElementById('btn-back-disciplines');
const btnSwitchToNightLand= document.getElementById('btn-switch-to-night-landscape');
const btnMoonChangeMode   = document.getElementById('btn-moon-change-mode');
const btnSwitchMoon       = document.getElementById('btn-switch-moon');
const modeIconEl          = document.getElementById('mode-icon');
const modeNameEl          = document.getElementById('mode-name');
const modeHintEl          = document.getElementById('mode-hint');

// Moon Support Switcher Elements (Tripod vs Handheld)
const btnMoonTripod       = document.getElementById('btn-moon-tripod');
const btnMoonHandheld     = document.getElementById('btn-moon-handheld');
const moonValAperture     = document.getElementById('moon-val-aperture');
const moonWhyAperture     = document.getElementById('moon-why-aperture');
const moonValShutter      = document.getElementById('moon-val-shutter');
const moonWhyShutter      = document.getElementById('moon-why-shutter');
const moonValIso          = document.getElementById('moon-val-iso');
const moonWhyIso          = document.getElementById('moon-why-iso');
const moonValStab         = document.getElementById('moon-val-stab');
const moonWhyStab         = document.getElementById('moon-why-stab');
const moonStep1Title      = document.getElementById('moon-step1-title');
const moonStep1Desc       = document.getElementById('moon-step1-desc');

// Camera search & sensors
const cameraSearchInput   = document.getElementById('camera-search-input');
const suggestionsDropdown = document.getElementById('suggestions-dropdown');
const sensorChips         = document.querySelectorAll('.sensor-chip');
const selectedCamBadge    = document.getElementById('selected-camera-badge');
const selectedCamTitle    = document.getElementById('selected-camera-title');
const selectedCamMeta     = document.getElementById('selected-camera-meta');
const cocPills            = document.querySelectorAll('.coc-pill');

// Focal & Aperture controls
const focalInput          = document.getElementById('focal-input');
const focalSlider         = document.getElementById('focal-slider');
const focalPresetBtns     = document.querySelectorAll('.focal-btn');
const apertureSlider      = document.getElementById('aperture-slider');
const apertureValBadge    = document.getElementById('aperture-val-badge');
const aperturePresetBtns  = document.querySelectorAll('.aperture-btn');

// Results & Diagram
const resultNumberEl      = document.getElementById('result-number');
const resultUnitEl        = document.getElementById('result-unit');
const metricNearEl        = document.getElementById('metric-near');
const metricFarEl         = document.getElementById('metric-far');
const metricDofEl         = document.getElementById('metric-dof');
const metricCocEl         = document.getElementById('metric-coc');
const unitBtns            = document.querySelectorAll('.unit-btn');

// Diagram Elements
const barBlur             = document.getElementById('bar-blur');
const barSharp            = document.getElementById('bar-sharp');
const focusPin            = document.getElementById('focus-pin');
const pinDistanceLabel    = document.getElementById('pin-distance-label');
const diagramNearLabel    = document.getElementById('diagram-near-label');

// Guide container & Curated notes
const guideContentBox       = document.getElementById('guide-content-box');
const curatedDisciplineNote = document.getElementById('curated-discipline-note');
const curatedNoteText       = document.getElementById('curated-note-text');

// Standard Apertures list for slider mapping
const APERTURES = [1.2, 1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0, 22.0];

// Initialize UI
function init() {
  setupEventListeners();

  const hash = window.location.hash.replace('#', '');
  if (hash === 'moon') {
    showMoonGuideScreen();
  } else if (['landscape', 'astro', 'street', 'custom'].includes(hash)) {
    selectMode(hash);
  } else {
    showDisciplineScreen();
  }
}

// Navigation helpers
function hideAllScreens() {
  screenDisciplines.style.display = 'none';
  screenAstroSub.classList.add('hidden');
  screenMoonGuide.classList.add('hidden');
  screenCalculator.classList.add('hidden');
}

function showDisciplineScreen() {
  hideAllScreens();
  screenDisciplines.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAstroSubScreen() {
  hideAllScreens();
  screenAstroSub.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showMoonGuideScreen() {
  hideAllScreens();
  screenMoonGuide.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Switch Moon parameters between Tripod and Handheld support
function setMoonSupport(supportType) {
  if (btnMoonTripod && btnMoonHandheld) {
    btnMoonTripod.classList.toggle('active', supportType === 'tripod');
    btnMoonHandheld.classList.toggle('active', supportType === 'handheld');
  }

  if (supportType === 'handheld') {
    if (moonValAperture) moonValAperture.textContent = 'f/5.6 a f/8';
    if (moonWhyAperture) moonWhyAperture.textContent = 'Abre más el diafragma para permitir una velocidad ultra-rápida sin subir tanto el ISO.';
    
    if (moonValShutter)  moonValShutter.textContent = '1/500s a 1/1000s';
    if (moonWhyShutter)  moonWhyShutter.textContent = '¡Ultra rápida! Imprescindible para congelar el pulso a 250mm o 600mm y evitar fotos trepidadas.';
    
    if (moonValIso)      moonValIso.textContent = 'ISO 400 a 800';
    if (moonWhyIso)      moonWhyIso.textContent = 'Compensa la velocidad extrema de 1/500s. En sensores modernos el ruido a ISO 400 es imperceptible.';
    
    if (moonValStab)     moonValStab.textContent = 'VR ON · Ráfaga Corta';
    if (moonWhyStab)     moonWhyStab.textContent = 'Estabilizador (VR/IS/IBIS) ENCENDIDO y disparo en ráfaga de 3 fotos conteniendo la respiración.';
    
    if (moonStep1Title)  moonStep1Title.textContent = 'Cámara en mano (Trípode humano)';
    if (moonStep1Desc)   moonStep1Desc.innerHTML = '<strong>Encendé el estabilizador (VR/IS/IBIS)</strong>, pegá los codos a las costillas, sostené el lente firmemente por debajo con la palma y <strong>dispará en ráfaga corta (3 fotos)</strong>. La segunda foto de la ráfaga siempre sale más nítida porque no sufre el golpe del dedo sobre el disparador.';
  } else {
    if (moonValAperture) moonValAperture.textContent = 'f/8 o f/11';
    if (moonWhyAperture) moonWhyAperture.textContent = 'Punto dulce del teleobjetivo (evita f/22 por difracción).';
    
    if (moonValShutter)  moonValShutter.textContent = '1/125s o 1/250s';
    if (moonWhyShutter)  moonWhyShutter.textContent = 'Sobre trípode firme congela el movimiento de rotación aparente.';
    
    if (moonValIso)      moonValIso.textContent = 'ISO 100 o 200';
    if (moonWhyIso)      moonWhyIso.textContent = 'Cero grano ni ruido digital (la Luna refleja mucha luz solar).';
    
    if (moonValStab)     moonValStab.textContent = 'VR OFF · Retardo 2s';
    if (moonWhyStab)     moonWhyStab.textContent = 'En trípode desactivá el VR/IS y activá el retardo de 2 segundos.';
    
    if (moonStep1Title)  moonStep1Title.textContent = 'Trípode firme y sin vibraciones';
    if (moonStep1Desc)   moonStep1Desc.innerHTML = 'Montá la cámara en trípode, <strong>apagá el estabilizador (VR/IS/IBIS)</strong> para evitar micro-vibraciones falsas del motor giroscópico y activá el temporizador a <strong>2 segundos</strong>.';
  }
}

// Update dynamic curated options and technical note for active mode
function updateCuratedControlsForMode(preset) {
  // 1. Filter focal buttons
  const allowedFocals = preset.focals || [14, 16, 20, 24, 28, 35, 50, 70, 135, 200, 250, 400, 600];
  focalPresetBtns.forEach(btn => {
    const fVal = parseInt(btn.dataset.focal, 10);
    btn.style.display = allowedFocals.includes(fVal) ? '' : 'none';
  });

  // 2. Adjust slider & number input ranges
  if (preset.focalRange) {
    focalSlider.min = preset.focalRange.min;
    focalSlider.max = preset.focalRange.max;
    if (focalInput) {
      focalInput.min = preset.focalRange.min;
      focalInput.max = preset.focalRange.max;
    }
  }

  // 3. Filter aperture buttons
  const allowedApertures = preset.apertures || [1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0];
  aperturePresetBtns.forEach(btn => {
    const aVal = parseFloat(btn.dataset.aperture);
    btn.style.display = allowedApertures.includes(aVal) ? '' : 'none';
  });

  // 4. Update Curated Note
  if (curatedNoteText && preset.curatedNote) {
    curatedNoteText.innerHTML = preset.curatedNote;
  }
}

function selectMode(modeKey) {
  state.activeMode = modeKey;
  const preset = MODE_PRESETS[modeKey] || MODE_PRESETS.landscape;

  // Apply mode defaults
  state.focalLength = preset.focal;
  state.aperture = preset.aperture;
  state.strictCoc = preset.strictCoc;

  // Update mode banner UI
  modeIconEl.textContent = preset.icon;
  modeNameEl.textContent = preset.name;
  modeHintEl.textContent = preset.subtitle;

  // If in Astro mode, show the button to switch to Moon guide
  if (modeKey === 'astro') {
    btnSwitchMoon.classList.remove('hidden');
  } else {
    btnSwitchMoon.classList.add('hidden');
  }

  // Update guide content
  guideContentBox.innerHTML = preset.guide;

  // Update curated controls and note
  updateCuratedControlsForMode(preset);

  // Switch to calculator view
  hideAllScreens();
  screenCalculator.classList.remove('hidden');

  // Sync inputs and calculate
  syncControlsFromState();
  recalculate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Sync controls to current state
function syncControlsFromState() {
  // Focal
  if (focalInput) focalInput.value = state.focalLength;
  focalSlider.value = state.focalLength;
  focalPresetBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.focal, 10) === state.focalLength);
  });

  // Aperture
  const aptIdx = APERTURES.indexOf(state.aperture);
  apertureSlider.value = aptIdx !== -1 ? aptIdx : 7;
  apertureValBadge.textContent = `f/${state.aperture}`;
  aperturePresetBtns.forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.aperture) === state.aperture);
  });

  // Strictness
  cocPills.forEach(pill => {
    const isStrict = pill.dataset.strict === 'true';
    pill.classList.toggle('active', isStrict === state.strictCoc);
  });

  // Units
  unitBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === state.unit);
  });

  // Sensor chips
  sensorChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.sensor === state.selectedSensor);
  });

  // Camera badge
  const sensor = SENSOR_TYPES[state.selectedSensor] || SENSOR_TYPES.full_frame;
  selectedCamTitle.textContent = state.cameraDisplayName;
  selectedCamMeta.textContent = `${sensor.name} (Crop ${sensor.crop}×)`;
}

// Calculate Hyperfocal Distance and DoF
function recalculate() {
  const sensor = SENSOR_TYPES[state.selectedSensor] || SENSOR_TYPES.full_frame;
  const coc = state.strictCoc ? sensor.coc_strict : sensor.coc;

  const f = state.focalLength; // in mm
  const N = state.aperture;     // f/number

  // Exact Hyperfocal Formula: H = (f^2 / (N * c)) + f
  const H_mm = ((f * f) / (N * coc)) + f;
  const H_meters = H_mm / 1000;

  // Near limit when focused at hyperfocal distance H:
  // D_near = H^2 / (2H - f) ≈ H / 2
  const near_mm = (H_mm * H_mm) / (2 * H_mm - f);
  const near_meters = near_mm / 1000;

  // Convert to selected units
  const isFeet = state.unit === 'ft';
  const unitLabel = isFeet ? 'ft' : 'm';
  const factor = isFeet ? 3.28084 : 1.0;

  const displayH = (H_meters * factor);
  const displayNear = (near_meters * factor);

  // Format numbers nicely
  function fmt(val) {
    if (val < 10) return val.toFixed(2);
    if (val < 100) return val.toFixed(1);
    return Math.round(val).toString();
  }

  // Update Hero Result
  resultNumberEl.textContent = fmt(displayH);
  resultUnitEl.textContent = unitLabel;

  // Update Metric Boxes
  metricNearEl.textContent = `${fmt(displayNear)} ${unitLabel}`;
  metricFarEl.textContent = 'Infinito (∞)';
  metricDofEl.textContent = 'Infinita (∞)';
  metricCocEl.textContent = `${coc.toFixed(3)} mm`;

  // Update Diagram Graphic
  updateDiagram(H_meters, near_meters, displayH, displayNear, unitLabel);
}

// Update the Visual Depth of Field Bar / Ruler
function updateDiagram(H_meters, near_meters, displayH, displayNear, unitLabel) {
  const blurPercent = 32;
  const focusPercent = 64;

  barBlur.style.width = `${blurPercent}%`;
  barBlur.textContent = `Desenfoque (< ${displayNear.toFixed(1)}${unitLabel})`;

  focusPin.style.left = `${focusPercent}%`;
  pinDistanceLabel.textContent = `Enfocar aquí: ${displayH.toFixed(1)} ${unitLabel}`;
  diagramNearLabel.textContent = `Inicio nítido: ${displayNear.toFixed(1)} ${unitLabel}`;
}

// Event Listeners Setup
function setupEventListeners() {
  // Mode selection cards on welcome screen
  document.querySelectorAll('.discipline-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      if (mode === 'astro-prompt') {
        // Show Astrophotography choice sub-screen
        showAstroSubScreen();
      } else if (mode) {
        selectMode(mode);
      }
    });
  });

  // Sub-menu Astro options
  document.querySelectorAll('[data-astro-choice]').forEach(card => {
    card.addEventListener('click', () => {
      const choice = card.dataset.astroChoice;
      if (choice === 'moon') {
        showMoonGuideScreen();
      } else {
        selectMode('astro');
      }
    });
  });

  // Back to disciplines from astro sub-screen
  if (btnBackDisciplines) {
    btnBackDisciplines.addEventListener('click', () => {
      showDisciplineScreen();
    });
  }

  // Switch between Moon guide and Night Landscape calculator
  if (btnSwitchToNightLand) {
    btnSwitchToNightLand.addEventListener('click', () => {
      selectMode('astro');
    });
  }
  if (btnMoonChangeMode) {
    btnMoonChangeMode.addEventListener('click', () => {
      showDisciplineScreen();
    });
  }
  if (btnSwitchMoon) {
    btnSwitchMoon.addEventListener('click', () => {
      showMoonGuideScreen();
    });
  }

  // Moon Support Switcher (Tripod vs Handheld)
  if (btnMoonTripod) {
    btnMoonTripod.addEventListener('click', () => {
      setMoonSupport('tripod');
    });
  }
  if (btnMoonHandheld) {
    btnMoonHandheld.addEventListener('click', () => {
      setMoonSupport('handheld');
    });
  }

  // Change mode button from calculator
  if (btnChangeMode) {
    btnChangeMode.addEventListener('click', () => {
      showDisciplineScreen();
    });
  }

  // Sensor chips
  sensorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      state.selectedSensor = chip.dataset.sensor;
      const sensor = SENSOR_TYPES[state.selectedSensor];
      state.cameraDisplayName = sensor ? sensor.name : 'Personalizada';
      cameraSearchInput.value = '';
      syncControlsFromState();
      recalculate();
    });
  });

  // Camera search input
  cameraSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      suggestionsDropdown.classList.remove('open');
      return;
    }
    const matches = POPULAR_CAMERAS.filter(c =>
      c.model.toLowerCase().includes(query) ||
      c.brand.toLowerCase().includes(query)
    ).slice(0, 8);

    if (matches.length > 0) {
      suggestionsDropdown.innerHTML = '';
      matches.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        const sensor = SENSOR_TYPES[item.sensor];
        div.innerHTML = `
          <div>
            <span class="suggestion-brand">${item.brand}</span>
            <span>${item.model}</span>
          </div>
          <span class="suggestion-sensor">${sensor.name}</span>
        `;
        div.addEventListener('click', () => {
          state.selectedSensor = item.sensor;
          state.cameraDisplayName = `${item.brand} ${item.model}`;
          cameraSearchInput.value = `${item.brand} ${item.model}`;
          suggestionsDropdown.classList.remove('open');
          syncControlsFromState();
          recalculate();
        });
        suggestionsDropdown.appendChild(div);
      });
      suggestionsDropdown.classList.add('open');
    } else {
      suggestionsDropdown.classList.remove('open');
    }
  });

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!cameraSearchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
      suggestionsDropdown.classList.remove('open');
    }
  });

  // CoC Strictness pills
  cocPills.forEach(pill => {
    pill.addEventListener('click', () => {
      state.strictCoc = pill.dataset.strict === 'true';
      syncControlsFromState();
      recalculate();
    });
  });

  // Units switcher
  unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.unit = btn.dataset.unit;
      syncControlsFromState();
      recalculate();
    });
  });

  // Direct numeric focal length input
  if (focalInput) {
    focalInput.addEventListener('input', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) return;
      const preset = MODE_PRESETS[state.activeMode] || MODE_PRESETS.landscape;
      const minF = preset.focalRange ? preset.focalRange.min : 8;
      const maxF = preset.focalRange ? preset.focalRange.max : 600;
      val = Math.max(minF, Math.min(maxF, val));
      state.focalLength = val;
      focalSlider.value = val;
      focalPresetBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.focal, 10) === state.focalLength);
      });
      recalculate();
    });
  }

  // Focal slider (up to 600mm)
  focalSlider.addEventListener('input', (e) => {
    state.focalLength = parseInt(e.target.value, 10);
    if (focalInput) focalInput.value = state.focalLength;
    focalPresetBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.focal, 10) === state.focalLength);
    });
    recalculate();
  });

  // Focal preset buttons
  focalPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.focalLength = parseInt(btn.dataset.focal, 10);
      focalSlider.value = Math.min(600, state.focalLength);
      if (focalInput) focalInput.value = state.focalLength;
      focalPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      recalculate();
    });
  });

  // Aperture slider
  apertureSlider.addEventListener('input', (e) => {
    const idx = parseInt(e.target.value, 10);
    state.aperture = APERTURES[idx] || 8.0;
    apertureValBadge.textContent = `f/${state.aperture}`;
    aperturePresetBtns.forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.aperture) === state.aperture);
    });
    recalculate();
  });

  // Aperture preset buttons
  aperturePresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.aperture = parseFloat(btn.dataset.aperture);
      const idx = APERTURES.indexOf(state.aperture);
      if (idx !== -1) apertureSlider.value = idx;
      apertureValBadge.textContent = `f/${state.aperture}`;
      aperturePresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      recalculate();
    });
  });
}

// Start app
init();
