// doble/doble.js — Motor de Doble Exposición Fotográfica para RK Studio

// Application State
const state = {
  ratio: '4:5', // '4:5', '1:1', '9:16', 'free'
  canvasWidth: 1080,
  canvasHeight: 1350,
  activeLayer: 'overlay', // 'base' | 'overlay'
  blendMode: 'screen',    // 'screen' | 'multiply' | 'lighten' | 'overlay'
  opacity: 0.85,
  contrast: 1.2,          // Base contrast
  shadows: 0,             // Shadow depth (-50 to +50)
  grain: 0.25,            // 35mm grain (0 to 1)
  vignette: 0.30,         // Vignette (0 to 1)
  tint: 'none',           // 'none' | 'warm' | 'cyan' | 'sepia'

  base: {
    image: null,
    name: 'Sin foto base',
    bw: false,
    x: 0,
    y: 0,
    scale: 1.0,
    rotation: 0,
    flipped: false,
  },
  overlay: {
    image: null,
    name: 'Sin textura',
    bw: false,
    x: 0,
    y: 0,
    scale: 1.0,
    rotation: 0,
    flipped: false,
  }
};

// DOM References
const canvas = document.getElementById('double-canvas');
const ctx = canvas.getContext('2d');
const canvasViewport = document.getElementById('canvas-viewport');
const canvasFrameWrap = document.getElementById('canvas-frame-wrap');
const layerIndicator = document.getElementById('layer-indicator');
const emptyDropzone = document.getElementById('empty-dropzone');

// Layer slots & Thumbs
const slotBase = document.getElementById('slot-base');
const slotOverlay = document.getElementById('slot-overlay');
const thumbBase = document.getElementById('thumb-base');
const thumbOverlay = document.getElementById('thumb-overlay');
const nameBase = document.getElementById('name-base');
const nameOverlay = document.getElementById('name-overlay');

// Upload buttons & labels
const btnLabelBase = document.getElementById('btn-label-base');
const btnLabelOverlay = document.getElementById('btn-label-overlay');
const previewRowBase = document.getElementById('preview-row-base');
const previewRowOverlay = document.getElementById('preview-row-overlay');

// File inputs
const fileInputBase = document.getElementById('file-input-base');
const fileInputOverlay = document.getElementById('file-input-overlay');
const btnSwapLayers = document.getElementById('btn-swap-layers');
const btnBwBase = document.getElementById('btn-bw-base');
const btnBwOverlay = document.getElementById('btn-bw-overlay');

// Top Action buttons
const btnMagic = document.getElementById('btn-magic');
const btnRemix = document.getElementById('btn-remix');
const btnReset = document.getElementById('btn-reset');
const btnExport = document.getElementById('btn-export');

// Workspace toolbar
const pillSelectBase = document.getElementById('pill-select-base');
const pillSelectOverlay = document.getElementById('pill-select-overlay');
const btnCenterLayer = document.getElementById('btn-center-layer');
const btnFlipLayer = document.getElementById('btn-flip-layer');
const ratioBtns = document.querySelectorAll('.ratio-btn');

// Sliders & Badges
const sliderOpacity = document.getElementById('slider-opacity');
const badgeOpacity = document.getElementById('badge-opacity');
const sliderContrast = document.getElementById('slider-contrast');
const badgeContrast = document.getElementById('badge-contrast');
const sliderShadows = document.getElementById('slider-shadows');
const badgeShadows = document.getElementById('badge-shadows');
const sliderGrain = document.getElementById('slider-grain');
const badgeGrain = document.getElementById('badge-grain');
const sliderVignette = document.getElementById('slider-vignette');
const badgeVignette = document.getElementById('badge-vignette');

// Blend & Tint buttons
const blendBtns = document.querySelectorAll('.blend-btn');
const tintBtns = document.querySelectorAll('.tint-btn');

// Dragging state
let isDragging = false;
let startX = 0;
let startY = 0;
let touchStartDist = 0;

// Dynamic Responsive Canvas Size calculation
function updateCanvasDisplaySize() {
  if (!canvasViewport || !canvasFrameWrap) return;
  const rect = canvasViewport.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return;

  const isMobile = window.innerWidth <= 960;
  // Use generous padding so the frame has ample breathing space
  // On desktop: 56px vertically to stay well clear of toolbar and bottom tips
  const padX = isMobile ? 12 : 36;
  const padY = isMobile ? 12 : 56;
  const maxW = Math.max(80, rect.width - padX * 2);
  const maxH = Math.max(80, rect.height - padY * 2);

  const dstRatio = state.canvasWidth / state.canvasHeight;
  let fw, fh;
  if (maxW / maxH > dstRatio) {
    fh = maxH;
    fw = fh * dstRatio;
  } else {
    fw = maxW;
    fh = fw / dstRatio;
  }
  fw = Math.round(fw);
  fh = Math.round(fh);

  canvasFrameWrap.style.width = `${fw}px`;
  canvasFrameWrap.style.height = `${fh}px`;
}

// Initialize
function init() {
  setupEventListeners();
  setRatio('4:5');

  // Responsive window resize listener
  window.addEventListener('resize', () => {
    updateCanvasDisplaySize();
    render();
  });

  // Calculate size immediately and on next frame
  updateCanvasDisplaySize();
  requestAnimationFrame(() => {
    updateCanvasDisplaySize();
    render();
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Layer selection via sidebar
  slotBase.addEventListener('click', () => setActiveLayer('base'));
  slotOverlay.addEventListener('click', () => setActiveLayer('overlay'));

  // Layer selection via toolbar pills
  pillSelectBase.addEventListener('click', () => setActiveLayer('base'));
  pillSelectOverlay.addEventListener('click', () => setActiveLayer('overlay'));

  // File uploads
  fileInputBase.addEventListener('change', (e) => handleFileUpload(e, 'base'));
  fileInputOverlay.addEventListener('change', (e) => handleFileUpload(e, 'overlay'));

  // Drag and Drop on Canvas Viewport
  canvasViewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    canvasViewport.classList.add('drag-over');
  });
  canvasViewport.addEventListener('dragleave', (e) => {
    if (e.target === canvasViewport || !canvasViewport.contains(e.relatedTarget)) {
      canvasViewport.classList.remove('drag-over');
    }
  });
  canvasViewport.addEventListener('drop', (e) => {
    e.preventDefault();
    canvasViewport.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    if (files.length >= 2) {
      loadCustomFile(files[0], 'base');
      loadCustomFile(files[1], 'overlay');
    } else if (!state.base.image) {
      loadCustomFile(files[0], 'base');
    } else {
      loadCustomFile(files[0], 'overlay');
    }
  });

  // Swap layers
  btnSwapLayers.addEventListener('click', swapLayers);

  // B&W Toggles
  btnBwBase.addEventListener('click', (e) => {
    e.stopPropagation();
    state.base.bw = !state.base.bw;
    btnBwBase.classList.toggle('active', state.base.bw);
    render();
  });
  btnBwOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    state.overlay.bw = !state.overlay.bw;
    btnBwOverlay.classList.toggle('active', state.overlay.bw);
    render();
  });

  // Flip & Center current active layer
  btnCenterLayer.addEventListener('click', centerActiveLayer);
  btnFlipLayer.addEventListener('click', flipActiveLayer);

  // Blend mode buttons
  blendBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      blendBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.blendMode = btn.dataset.blend;
      render();
    });
  });

  // Aspect ratio buttons
  ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ratioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setRatio(btn.dataset.ratio);
    });
  });

  // Tint buttons
  tintBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tintBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tint = btn.dataset.tint;
      render();
    });
  });

  // Sliders
  sliderOpacity.addEventListener('input', (e) => {
    state.opacity = parseInt(e.target.value, 10) / 100;
    badgeOpacity.textContent = `${e.target.value}%`;
    render();
  });
  sliderContrast.addEventListener('input', (e) => {
    state.contrast = parseInt(e.target.value, 10) / 100;
    badgeContrast.textContent = `${e.target.value}%`;
    render();
  });
  sliderShadows.addEventListener('input', (e) => {
    state.shadows = parseInt(e.target.value, 10);
    badgeShadows.textContent = `${e.target.value > 0 ? '+' : ''}${e.target.value}`;
    render();
  });
  sliderGrain.addEventListener('input', (e) => {
    state.grain = parseInt(e.target.value, 10) / 100;
    badgeGrain.textContent = `${e.target.value}%`;
    render();
  });
  sliderVignette.addEventListener('input', (e) => {
    state.vignette = parseInt(e.target.value, 10) / 100;
    badgeVignette.textContent = `${e.target.value}%`;
    render();
  });

  // Magic & Remix & Reset & Export
  btnMagic.addEventListener('click', autoCompose);
  btnRemix.addEventListener('click', remix);
  btnReset.addEventListener('click', resetTransforms);
  btnExport.addEventListener('click', exportImage);

  // Canvas Mouse & Touch Drag & Zoom
  setupCanvasGestures();
}

// Set Active Layer (Base or Overlay)
function setActiveLayer(layerKey) {
  state.activeLayer = layerKey;
  slotBase.classList.toggle('active', layerKey === 'base');
  slotOverlay.classList.toggle('active', layerKey === 'overlay');
  pillSelectBase.classList.toggle('active', layerKey === 'base');
  pillSelectOverlay.classList.toggle('active', layerKey === 'overlay');

  if (layerKey === 'base') {
    layerIndicator.innerHTML = '👤 Manipulando: <strong>Capa Base (Silueta)</strong>';
  } else {
    layerIndicator.innerHTML = '🌿 Manipulando: <strong>Capa Textura (Fusión)</strong>';
  }
  render();
}

// Set Aspect Ratio
function setRatio(ratioKey) {
  state.ratio = ratioKey;
  if (ratioKey === '4:5') {
    state.canvasWidth = 1080;
    state.canvasHeight = 1350;
  } else if (ratioKey === '1:1') {
    state.canvasWidth = 1080;
    state.canvasHeight = 1080;
  } else if (ratioKey === '9:16') {
    state.canvasWidth = 1080;
    state.canvasHeight = 1920;
  } else if (ratioKey === '16:9') {
    state.canvasWidth = 1920;
    state.canvasHeight = 1080;
  } else if (ratioKey === '3:2') {
    state.canvasWidth = 1620;
    state.canvasHeight = 1080;
  } else if (ratioKey === 'free') {
    if (state.base.image) {
      const img = state.base.image;
      const aspect = img.width / img.height;
      state.canvasWidth = 1080;
      state.canvasHeight = Math.round(1080 / aspect);
    }
  }
  canvas.width = state.canvasWidth;
  canvas.height = state.canvasHeight;

  // Re-fit layers to new aspect ratio dimensions
  centerLayer('base');
  centerLayer('overlay');

  updateCanvasDisplaySize();
  render();
}

// Center active layer
function centerActiveLayer() {
  const layer = state[state.activeLayer];
  layer.x = 0;
  layer.y = 0;
  layer.rotation = 0;
  if (layer.image) {
    const scaleX = state.canvasWidth / layer.image.width;
    const scaleY = state.canvasHeight / layer.image.height;
    layer.scale = Math.max(scaleX, scaleY);
  }
  render();
}

// Flip active layer horizontally
function flipActiveLayer() {
  const layer = state[state.activeLayer];
  layer.flipped = !layer.flipped;
  render();
}

// Swap base and overlay layers
function swapLayers() {
  const temp = { ...state.base };
  state.base = { ...state.overlay };
  state.overlay = { ...temp };

  // Update UI texts & upload triggers
  nameBase.textContent = state.base.name || 'Retrato, silueta o contraluz';
  nameOverlay.textContent = state.overlay.name || 'Paisaje, flores, cielo o luces';

  if (btnLabelBase) btnLabelBase.textContent = state.base.image ? 'Cambiar Foto 1' : 'Subir Foto 1 (Base)';
  if (btnLabelOverlay) btnLabelOverlay.textContent = state.overlay.image ? 'Cambiar Foto 2' : 'Subir Foto 2 (Textura)';

  if (previewRowBase) previewRowBase.style.display = state.base.image ? 'flex' : 'none';
  if (previewRowOverlay) previewRowOverlay.style.display = state.overlay.image ? 'flex' : 'none';

  updateThumbnail('base', state.base.image);
  updateThumbnail('overlay', state.overlay.image);
  btnBwBase.classList.toggle('active', state.base.bw);
  btnBwOverlay.classList.toggle('active', state.overlay.bw);

  render();
}

// Reset all transforms to default fit
function resetTransforms() {
  centerLayer('base');
  centerLayer('overlay');
  state.base.flipped = false;
  state.overlay.flipped = false;
  state.opacity = 0.85;
  state.contrast = 1.2;
  state.shadows = 0;
  state.grain = 0.25;
  state.vignette = 0.30;
  state.tint = 'none';

  sliderOpacity.value = 85;
  badgeOpacity.textContent = '85%';
  sliderContrast.value = 120;
  badgeContrast.textContent = '120%';
  sliderShadows.value = 0;
  badgeShadows.textContent = '0';
  sliderGrain.value = 25;
  badgeGrain.textContent = '25%';
  sliderVignette.value = 30;
  badgeVignette.textContent = '30%';

  tintBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tint === 'none'));
  render();
}

function centerLayer(layerKey) {
  const layer = state[layerKey];
  layer.x = 0;
  layer.y = 0;
  layer.rotation = 0;
  if (layer.image) {
    const scaleX = state.canvasWidth / layer.image.width;
    const scaleY = state.canvasHeight / layer.image.height;
    layer.scale = Math.max(scaleX, scaleY);
  }
}

// Canvas Mouse & Touch Interaction
function setupCanvasGestures() {
  // Mouse Drag
  canvasViewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    canvasViewport.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;

    const layer = state[state.activeLayer];
    // Scale delta relative to actual rendered frame wrapper size
    const rect = canvasFrameWrap.getBoundingClientRect();
    const scaleRatio = (rect && rect.width > 0) ? (state.canvasWidth / rect.width) : 1;

    layer.x += dx * scaleRatio;
    layer.y += dy * scaleRatio;
    render();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      canvasViewport.classList.remove('dragging');
    }
  });

  // Mouse Wheel Zoom
  canvasViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    const layer = state[state.activeLayer];
    layer.scale = Math.max(0.1, Math.min(6.0, layer.scale * zoomFactor));
    render();
  }, { passive: false });

  // Double Click to Center Active Layer
  canvasViewport.addEventListener('dblclick', (e) => {
    e.preventDefault();
    centerActiveLayer();
  });

  // Touch Drag & Pinch
  let lastTapTime = 0;

  canvasViewport.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();

    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      touchStartDist = 0;
    } else if (e.touches.length === 2) {
      isDragging = false;
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: false });

  canvasViewport.addEventListener('touchmove', (e) => {
    // CRITICAL: Prevent default to stop mobile browser from scrolling the web page
    if (e.cancelable) e.preventDefault();

    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      const layer = state[state.activeLayer];
      const rect = canvasFrameWrap.getBoundingClientRect();
      const scaleRatio = (rect && rect.width > 0) ? (state.canvasWidth / rect.width) : 1;

      layer.x += dx * scaleRatio;
      layer.y += dy * scaleRatio;
      render();
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartDist > 0) {
        const factor = dist / touchStartDist;
        const layer = state[state.activeLayer];
        layer.scale = Math.max(0.1, Math.min(6.0, layer.scale * factor));
        touchStartDist = dist;
        render();
      }
    }
  }, { passive: false });

  canvasViewport.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      // Double tap detection on mobile
      const now = Date.now();
      if (now - lastTapTime < 320) {
        centerActiveLayer();
        lastTapTime = 0;
      } else {
        lastTapTime = now;
      }
      isDragging = false;
      touchStartDist = 0;
    } else if (e.touches.length === 1) {
      // Transition from pinch back to single finger
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      touchStartDist = 0;
    }
  });

  canvasViewport.addEventListener('touchcancel', () => {
    isDragging = false;
    touchStartDist = 0;
  });
}

// File Upload Handler
function handleFileUpload(e, layerKey) {
  const file = e.target.files[0];
  if (!file) return;
  loadCustomFile(file, layerKey);
  e.target.value = '';
}

// Universal File Loader (File input + Drag & Drop)
function loadCustomFile(file, layerKey) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state[layerKey].image = img;
      state[layerKey].name = file.name.replace(/\.[^/.]+$/, '');

      if (layerKey === 'base') {
        nameBase.textContent = state.base.name;
        if (btnLabelBase) btnLabelBase.textContent = 'Cambiar Foto 1';
        if (previewRowBase) previewRowBase.style.display = 'flex';
        updateThumbnail('base', img);
      } else {
        nameOverlay.textContent = state.overlay.name;
        if (btnLabelOverlay) btnLabelOverlay.textContent = 'Cambiar Foto 2';
        if (previewRowOverlay) previewRowOverlay.style.display = 'flex';
        updateThumbnail('overlay', img);
      }

      if (state.ratio === 'free' && layerKey === 'base') {
        setRatio('free');
      } else {
        centerLayer(layerKey);
        updateCanvasDisplaySize();
        render();
      }

      // Automatically switch active layer to overlay if base already exists
      if (layerKey === 'overlay') {
        setActiveLayer('overlay');
      } else if (!state.overlay.image) {
        setActiveLayer('base');
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// Update thumbnail preview in sidebar
function updateThumbnail(layerKey, img) {
  const targetThumb = layerKey === 'base' ? thumbBase : thumbOverlay;
  targetThumb.innerHTML = '';
  if (img) {
    const thumbImg = document.createElement('img');
    thumbImg.src = img.src;
    targetThumb.appendChild(thumbImg);
  }
}

// Automatic Composition Algorithm (✨ Auto-Componer)
function autoCompose() {
  if (!state.base.image || !state.overlay.image) return;

  // 1. Analyze brightness of base to choose blend mode
  // If base is mostly dark (black background), 'screen' is king.
  // If base is bright/white, 'multiply' is king.
  state.blendMode = 'screen';
  blendBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.blend === state.blendMode));

  // 2. Adjust texture layer scale and position aesthetically
  // Often, putting texture slightly scaled and positioned around the upper 1/3 (head/chest) looks incredible!
  centerLayer('base');
  centerLayer('overlay');

  // Scale texture to 1.1x and give slight organic offset
  state.overlay.scale *= 1.15;
  state.overlay.x = state.canvasWidth * 0.05;
  state.overlay.y = -state.canvasHeight * 0.04;

  // 3. Optimal tone & contrast
  state.opacity = 0.88;
  state.contrast = 1.35;
  state.shadows = -10;
  state.grain = 0.22;
  state.vignette = 0.35;

  sliderOpacity.value = 88;
  badgeOpacity.textContent = '88%';
  sliderContrast.value = 135;
  badgeContrast.textContent = '135%';
  sliderShadows.value = -10;
  badgeShadows.textContent = '-10';
  sliderGrain.value = 22;
  badgeGrain.textContent = '22%';
  sliderVignette.value = 35;
  badgeVignette.textContent = '35%';

  setActiveLayer('overlay');
  render();
}

// Artistic Remix (🎲 Re-mezclar)
function remix() {
  const blendOptions = ['screen', 'screen', 'multiply', 'lighten', 'overlay'];
  const randomBlend = blendOptions[Math.floor(Math.random() * blendOptions.length)];
  state.blendMode = randomBlend;
  blendBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.blend === randomBlend));

  // Randomize texture scale and position within artistic boundaries
  const layer = state.overlay;
  const baseScale = state.canvasWidth / (layer.image ? layer.image.width : 1080);
  layer.scale = baseScale * (0.85 + Math.random() * 0.6);
  layer.x = (Math.random() - 0.5) * state.canvasWidth * 0.4;
  layer.y = (Math.random() - 0.5) * state.canvasHeight * 0.3;
  layer.flipped = Math.random() > 0.5;

  // Randomize B&W
  state.base.bw = Math.random() > 0.4;
  state.overlay.bw = Math.random() > 0.6;
  btnBwBase.classList.toggle('active', state.base.bw);
  btnBwOverlay.classList.toggle('active', state.overlay.bw);

  // Randomize opacity & contrast
  state.opacity = 0.70 + Math.random() * 0.25;
  state.contrast = 1.1 + Math.random() * 0.5;
  sliderOpacity.value = Math.round(state.opacity * 100);
  badgeOpacity.textContent = `${sliderOpacity.value}%`;
  sliderContrast.value = Math.round(state.contrast * 100);
  badgeContrast.textContent = `${sliderContrast.value}%`;

  // Randomize tint
  const tints = ['none', 'none', 'warm', 'cyan', 'sepia'];
  state.tint = tints[Math.floor(Math.random() * tints.length)];
  tintBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tint === state.tint));

  render();
}

// Render Engine (Canvas 2D + Hardware Acceleration)
function render() {
  const w = state.canvasWidth;
  const h = state.canvasHeight;
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0, 0, w, h);

  const hasBase = !!state.base.image;
  const hasOverlay = !!state.overlay.image;

  if (!hasBase && !hasOverlay) {
    if (emptyDropzone) emptyDropzone.classList.remove('hidden');
    return;
  }

  if (emptyDropzone) emptyDropzone.classList.add('hidden');

  // 1. Draw Base Layer
  if (hasBase) {
    ctx.save();
    drawLayer(state.base, false);
    ctx.restore();
  }

  // 2. Draw Overlay Layer with Selected Blend Mode
  if (hasOverlay) {
    ctx.save();
    if (hasBase) {
      ctx.globalCompositeOperation = state.blendMode;
      ctx.globalAlpha = state.opacity;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }
    drawLayer(state.overlay, true);
    ctx.restore();
  }

  // 3. Post-processing: Tint, Vignette, Grain
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;

  // Apply Color Tint / Duotone
  applyTint(w, h);

  // Apply Vignette
  if (state.vignette > 0) {
    applyVignette(w, h);
  }

  // Apply 35mm Grain
  if (state.grain > 0) {
    applyGrain(w, h);
  }

  ctx.restore();
}

// Draw individual layer with transforms and filters
function drawLayer(layer, isOverlay) {
  if (!layer.image) return;

  const w = state.canvasWidth;
  const h = state.canvasHeight;

  // Center coordinate space
  ctx.translate(w / 2 + layer.x, h / 2 + layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.flipped ? -layer.scale : layer.scale, layer.scale);

  // Offscreen canvas for contrast/B&W filters if needed
  let filterStr = '';
  if (layer.bw) filterStr += 'grayscale(100%) ';
  if (!isOverlay) {
    filterStr += `contrast(${state.contrast * 100}%) `;
    if (state.shadows !== 0) {
      filterStr += `brightness(${100 + state.shadows}%) `;
    }
  }

  if (filterStr.trim()) {
    ctx.filter = filterStr.trim();
  }

  const imgW = layer.image.width;
  const imgH = layer.image.height;
  ctx.drawImage(layer.image, -imgW / 2, -imgH / 2, imgW, imgH);
  ctx.filter = 'none';
}

// Apply Duotone Tint
function applyTint(w, h) {
  if (state.tint === 'none') return;

  ctx.save();
  if (state.tint === 'warm') {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(212, 168, 67, 0.28)';
  } else if (state.tint === 'cyan') {
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = 'rgba(0, 168, 204, 0.24)';
  } else if (state.tint === 'sepia') {
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = 'rgba(162, 102, 42, 0.32)';
  }
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Apply Vignette
function applyVignette(w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const radius = Math.max(w, h) * 0.75;
  const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.35, w / 2, h / 2, radius);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, `rgba(0, 0, 0, ${state.vignette * 0.85})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Apply Analog 35mm Grain (Fast procedural noise pattern)
function applyGrain(w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = state.grain * 0.35;

  // Generate small noise tile and pattern fill
  const noiseSize = 128;
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = noiseSize;
  noiseCanvas.height = noiseSize;
  const nCtx = noiseCanvas.getContext('2d');
  const imgData = nCtx.createImageData(noiseSize, noiseSize);
  const buf = new Uint32Array(imgData.data.buffer);
  for (let i = 0; i < buf.length; i++) {
    const val = (Math.random() * 255) | 0;
    buf[i] = (255 << 24) | (val << 16) | (val << 8) | val;
  }
  nCtx.putImageData(imgData, 0, 0);

  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Export high resolution JPG
function exportImage() {
  if (!state.base.image && !state.overlay.image) {
    alert('Primero subí al menos una fotografía para exportar tu creación.');
    return;
  }
  const link = document.createElement('a');
  link.download = `rk_doble_exposicion_${state.ratio.replace(':', 'x')}_${Date.now()}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}

// Start application
init();
