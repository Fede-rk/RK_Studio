// hiperfocal/hiperfocal.js
// Lógica de cálculo óptico y experiencia guiada para RK Hiperfocal

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
    guide: `
      <p><strong>🎯 La Regla de Oro del Paisajista:</strong> Nunca enfoques al infinito ($\infty$) en un paisaje. Si enfocas al horizonte, desperdicias la mitad de la profundidad de campo útil hacia atrás.</p>
      <p>Enfocando a la <strong>distancia hiperfocal calculada</strong>, tus flores o rocas cercanas quedarán nítidas y las montañas del horizonte no perderán nitidez.</p>
      <ul>
        <li><strong>Apertura recomendada:</strong> Mantente entre <strong>f/8 y f/11</strong>. Diafragmas más cerrados como f/16 o f/22 introducen <em>difracción óptica</em>, que resta nitidez general.</li>
        <li><strong>Lentes angulares:</strong> Cuanto más angular sea tu lente (ej. 16mm o 24mm), más cerca estará la hiperfocal y más fácil será tener todo a foco.</li>
      </ul>
    `
  },
  astro: {
    name: 'Astrofotografía & Luna',
    icon: '🌌',
    focal: 16,
    aperture: 2.8,
    strictCoc: true,
    subtitle: 'Paisajes nocturnos con cielo estrellado y suelo enfocado',
    guide: `
      <p><strong>⚠️ Aclaración clave para novatos (¿Fotografiar la Luna o Estrellas solas?):</strong></p>
      <ul>
        <li><strong>Si solo fotografías la Luna o constelaciones en el cielo:</strong> <strong>¡NO uses la hiperfocal!</strong> La Luna está a 384.000 km (en el infinito absoluto). Apunta directo a la Luna, activa el zoom digital en pantalla al 100% y ajusta el foco manual hasta ver los cráteres nítidos.</li>
        <li><strong>Si fotografías Paisaje Nocturno (Vía Láctea con suelo/árboles/rocas):</strong> <strong>Aquí SÍ es fundamental la hiperfocal</strong>. Usa tu diafragma más luminoso (f/1.4 a f/2.8) y enfoca a la distancia indicada para que la roca del primer plano esté nítida y las estrellas no se vuelvan borrosas.</li>
        <li><strong>Ajuste de alta exigencia:</strong> Hemos activado el modo de <em>Alta Exigencia</em> para que las estrellas se mantengan como puntos finos sin halos.</li>
      </ul>
    `
  },
  street: {
    name: 'Fotografía Callejera (Street)',
    icon: '🏙️',
    focal: 35,
    aperture: 8.0,
    strictCoc: false,
    subtitle: 'Disparo instantáneo sin retardo de autofocus ("Zone Focusing")',
    guide: `
      <p><strong>⚡ Enfoque por Zonas (Zone Focusing):</strong> Los fotógrafos de calle más rápidos no usan autoenfoque; calibran su lente a la hiperfocal antes de empezar a caminar.</p>
      <ul>
        <li><strong>¿Cómo funciona?</strong> Con tu lente ajustado a la hiperfocal, todo sujeto que pase dentro de la <em>Zona Nítida</em> saldrá enfocado de forma instantánea al apretar el disparador.</li>
        <li><strong>Focales reinas:</strong> 28mm o 35mm en f/8 te darán una zona de confort enorme (aproximadamente desde 1.5 a 2 metros hasta el infinito).</li>
        <li>Dispara desde la cadera o sin mirar la pantalla sabiendo que el foco está 100% garantizado.</li>
      </ul>
    `
  },
  custom: {
    name: 'Modo Libre / Personalizado',
    icon: '⚙️',
    focal: 24,
    aperture: 8.0,
    strictCoc: false,
    subtitle: 'Control total de sensor, focal y diafragma para cualquier disciplina',
    guide: `
      <p><strong>Configuración manual completa:</strong> Ajusta libremente cualquier sensor, distancia focal milimétrica y número f para calcular la hiperfocal exacta y explorar la profundidad de campo geométrica.</p>
    `
  }
};

// DOM Elements
const screenDisciplines   = document.getElementById('screen-disciplines');
const screenCalculator    = document.getElementById('screen-calculator');
const btnChangeMode       = document.getElementById('btn-change-mode');
const modeIconEl          = document.getElementById('mode-icon');
const modeNameEl          = document.getElementById('mode-name');
const modeHintEl          = document.getElementById('mode-hint');

// Camera search & sensors
const cameraSearchInput   = document.getElementById('camera-search-input');
const suggestionsDropdown = document.getElementById('suggestions-dropdown');
const sensorChips         = document.querySelectorAll('.sensor-chip');
const selectedCamBadge    = document.getElementById('selected-camera-badge');
const selectedCamTitle    = document.getElementById('selected-camera-title');
const selectedCamMeta     = document.getElementById('selected-camera-meta');
const cocPills            = document.querySelectorAll('.coc-pill');

// Focal & Aperture controls
const focalSlider         = document.getElementById('focal-slider');
const focalValBadge       = document.getElementById('focal-val-badge');
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

// Guide container
const guideContentBox     = document.getElementById('guide-content-box');

// Standard Apertures list for slider mapping
const APERTURES = [1.2, 1.4, 1.8, 2.0, 2.8, 4.0, 5.6, 8.0, 11.0, 16.0, 22.0];

// Initialize UI
function init() {
  setupEventListeners();
  // Check if URL or hash has a preselected mode
  const hash = window.location.hash.replace('#', '');
  if (['landscape', 'astro', 'street', 'custom'].includes(hash)) {
    selectMode(hash);
  } else {
    // Show discipline selection by default
    showDisciplineScreen();
  }
}

function showDisciplineScreen() {
  screenDisciplines.style.display = 'flex';
  screenCalculator.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Update guide content
  guideContentBox.innerHTML = preset.guide;

  // Switch to calculator view
  screenDisciplines.style.display = 'none';
  screenCalculator.classList.remove('hidden');

  // Sync inputs and calculate
  syncControlsFromState();
  recalculate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Sync controls to current state
function syncControlsFromState() {
  // Focal
  focalSlider.value = state.focalLength;
  focalValBadge.textContent = `${state.focalLength} mm`;
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
  // We represent the visual scale with near limit around ~32% and H around ~64%
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
      selectMode(mode);
    });
  });

  // Change mode button
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

  // Focal slider
  focalSlider.addEventListener('input', (e) => {
    state.focalLength = parseInt(e.target.value, 10);
    focalValBadge.textContent = `${state.focalLength} mm`;
    focalPresetBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.focal, 10) === state.focalLength);
    });
    recalculate();
  });

  // Focal preset buttons
  focalPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.focalLength = parseInt(btn.dataset.focal, 10);
      focalSlider.value = state.focalLength;
      focalValBadge.textContent = `${state.focalLength} mm`;
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
