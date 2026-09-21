// paleta/paleta.js
// RK Studio — Extractor de Paletas Armónicas para Fotografía y Creadores

// State
let loadedImage = null;
let currentPalette = [];
let colorCount = 5;
let currentHarmony = 'balanced';
let activeSwatchIndex = 0;
let exportFormat = '4:5';

// DOM Elements
const dropzoneEmpty     = document.getElementById('dropzone-empty');
const previewWrapper    = document.getElementById('preview-wrapper');
const previewCanvas     = document.getElementById('preview-canvas');
const fileInput         = document.getElementById('file-input');
const replaceBtn        = document.getElementById('btn-replace');
const swatchesStrip     = document.getElementById('swatches-strip');
const swatchesList      = document.getElementById('swatches-list');
const countBtns         = document.querySelectorAll('.count-btn');
const harmonyBtns       = document.querySelectorAll('.harmony-btn');
const formatBtns        = document.querySelectorAll('.fmt-btn');
const copyHexListBtn    = document.getElementById('btn-copy-hex-list');
const copyCssBtn        = document.getElementById('btn-copy-css');
const copyJsonBtn       = document.getElementById('btn-copy-json');
const exportCardBtn     = document.getElementById('btn-export-card');
const toastEl           = document.getElementById('toast');
const loadingOverlay    = document.getElementById('loading-overlay');
const loupeEl           = document.getElementById('loupe');
const loupeHexEl        = document.getElementById('loupe-hex');

// Toast notification helper
let toastTimeout = null;
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2200);
}

// Copy to clipboard helper
async function copyText(text, successMsg = '¡Copiado al portapapeles!') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg);
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(successMsg);
  }
}

// Color Utility Functions
function componentToHex(c) {
  const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(r, g, b) {
  return ('#' + componentToHex(r) + componentToHex(g) + componentToHex(b)).toUpperCase();
}

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

// Perceptual color distance (weighted Euclidean)
function colorDist(c1, c2) {
  const rMean = (c1.r + c2.r) / 2;
  const r = c1.r - c2.r;
  const g = c1.g - c2.g;
  const b = c1.b - c2.b;
  return Math.sqrt((((512 + rMean) * r * r) >> 8) + 4 * g * g + (((767 - rMean) * b * b) >> 8));
}

// Relative luminance for contrast
function getLuminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Core Palette Extraction Algorithm
function extractPalette(img, count = 5, harmony = 'balanced') {
  const sampleCanvas = document.createElement('canvas');
  const maxDim = 180;
  let sw = img.naturalWidth || img.width;
  let sh = img.naturalHeight || img.height;
  if (sw > sh) {
    if (sw > maxDim) { sh = Math.round((sh * maxDim) / sw); sw = maxDim; }
  } else {
    if (sh > maxDim) { sw = Math.round((sw * maxDim) / sh); sh = maxDim; }
  }
  sampleCanvas.width = sw;
  sampleCanvas.height = sh;
  const sctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, sw, sh);

  const imgData = sctx.getImageData(0, 0, sw, sh).data;
  const colorBuckets = {};

  // Quantize into 5-bit color space (32 levels per channel)
  const step = 2;
  for (let i = 0; i < imgData.length; i += 4 * step) {
    const a = imgData[i + 3];
    if (a < 128) continue; // skip transparent

    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];

    // Key with quantized values
    const qr = Math.round(r / 8) * 8;
    const qg = Math.round(g / 8) * 8;
    const qb = Math.round(b / 8) * 8;
    const key = `${qr},${qg},${qb}`;

    if (!colorBuckets[key]) {
      colorBuckets[key] = { r, g, b, count: 0 };
    }
    colorBuckets[key].count++;
  }

  // Convert to candidate array
  let candidates = Object.values(colorBuckets).map(c => {
    const hsl = rgbToHsl(c.r, c.g, c.b);
    const lum = getLuminance(c.r, c.g, c.b);
    return {
      r: c.r,
      g: c.g,
      b: c.b,
      pop: c.count,
      hue: hsl.h,
      sat: hsl.s,
      lum,
      hex: rgbToHex(c.r, c.g, c.b)
    };
  });

  // Filter out extreme noise or near-identical candidates
  candidates.sort((a, b) => b.pop - a.pop);
  const topCandidates = [];
  for (const cand of candidates) {
    // Avoid candidates too close to existing ones
    const isDuplicate = topCandidates.some(tc => colorDist(cand, tc) < 30);
    if (!isDuplicate) {
      topCandidates.push(cand);
      if (topCandidates.length >= 40) break;
    }
  }

  if (topCandidates.length === 0) {
    topCandidates.push({ r: 212, g: 168, b: 67, hex: '#D4A843', pop: 1, lum: 0.6, sat: 0.6, hue: 42 });
  }

  // Harmony role assignments
  const selected = [];
  const targetCount = count;

  function pickBest(pool, scoreFn, minDistance = 45) {
    let best = null;
    let bestScore = -Infinity;
    for (const c of pool) {
      if (selected.some(s => s.hex === c.hex)) continue;
      const minD = selected.length > 0 ? Math.min(...selected.map(s => colorDist(c, s))) : 999;
      if (minD < minDistance) continue;
      const score = scoreFn(c, minD);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  if (harmony === 'vibrant') {
    // Prioritize high saturation and contrast
    while (selected.length < targetCount) {
      const best = pickBest(topCandidates, (c, dist) => (c.sat * 2.5) + (Math.log(c.pop + 1) * 0.4) + (dist * 0.01), selected.length ? 40 : 0);
      if (!best) break;
      best.role = selected.length === 0 ? 'Vibrante' : `Tono ${selected.length + 1}`;
      selected.push(best);
    }
  } else if (harmony === 'muted') {
    // Prioritize cinematic soft / matte tones
    while (selected.length < targetCount) {
      const best = pickBest(topCandidates, (c, dist) => (1 - Math.abs(c.sat - 0.35)) * 2 + (Math.log(c.pop + 1) * 0.4) + (dist * 0.01), selected.length ? 38 : 0);
      if (!best) break;
      best.role = selected.length === 0 ? 'Cinemático' : `Tono ${selected.length + 1}`;
      selected.push(best);
    }
  } else if (harmony === 'warm') {
    // Prioritize warm hues: 330°-70°
    while (selected.length < targetCount) {
      const best = pickBest(topCandidates, (c, dist) => {
        const isWarm = (c.hue >= 330 || c.hue <= 75) ? 2.0 : 0.2;
        return (isWarm * (c.sat + 0.5)) + (Math.log(c.pop + 1) * 0.3) + (dist * 0.01);
      }, selected.length ? 35 : 0);
      if (!best) break;
      best.role = selected.length === 0 ? 'Cálido' : `Tono ${selected.length + 1}`;
      selected.push(best);
    }
  } else if (harmony === 'cool') {
    // Prioritize cool hues: 150°-280°
    while (selected.length < targetCount) {
      const best = pickBest(topCandidates, (c, dist) => {
        const isCool = (c.hue >= 140 && c.hue <= 280) ? 2.0 : 0.2;
        return (isCool * (c.sat + 0.5)) + (Math.log(c.pop + 1) * 0.3) + (dist * 0.01);
      }, selected.length ? 35 : 0);
      if (!best) break;
      best.role = selected.length === 0 ? 'Frío' : `Tono ${selected.length + 1}`;
      selected.push(best);
    }
  } else {
    // Balanced / Armónica (standard photographic editorial palette)
    // 1. Dominante: Highest population
    const dominant = topCandidates[0];
    dominant.role = 'Dominante';
    selected.push(dominant);

    // 2. Acento: High saturation, distinct from dominant
    const accent = pickBest(topCandidates, (c, dist) => (c.sat * 2.8) + (dist * 0.015), 55);
    if (accent) {
      accent.role = 'Acento';
      selected.push(accent);
    }

    // 3. Luz: Light / highlight tone (lum > 0.60)
    const light = pickBest(topCandidates, (c) => c.lum * 2 + (1 - c.sat) * 0.5, 45);
    if (light) {
      light.role = 'Luz';
      selected.push(light);
    }

    // 4. Sombra: Deep shadow tone (lum < 0.40)
    const shadow = pickBest(topCandidates, (c) => (1 - c.lum) * 2 + Math.log(c.pop + 1) * 0.2, 45);
    if (shadow) {
      shadow.role = 'Sombra';
      selected.push(shadow);
    }

    // 5. Tono Medio: Balanced midtone
    const midtone = pickBest(topCandidates, (c, dist) => (1 - Math.abs(c.lum - 0.5)) + dist * 0.02, 35);
    if (midtone) {
      midtone.role = 'Tono Medio';
      selected.push(midtone);
    }

    // 6. Complementario (if target is 6)
    if (targetCount >= 6) {
      const extra = pickBest(topCandidates, (c, dist) => dist * 0.03 + Math.log(c.pop + 1) * 0.2, 30);
      if (extra) {
        extra.role = 'Armonía';
        selected.push(extra);
      }
    }
  }

  // Fallback to fill up to target count if any specific role failed
  while (selected.length < targetCount) {
    const filler = pickBest(topCandidates, (c, dist) => dist * 0.03 + Math.log(c.pop + 1) * 0.2, 20);
    if (!filler) break;
    filler.role = `Tono ${selected.length + 1}`;
    selected.push(filler);
  }

  // Sort swatches from dark to light or by luminance for an editorial display
  selected.sort((a, b) => a.lum - b.lum);

  return selected.slice(0, targetCount);
}

// Render Palette UI
function renderPalette() {
  if (!currentPalette || currentPalette.length === 0) return;

  // 1. Render Swatches Strip
  swatchesStrip.innerHTML = '';
  currentPalette.forEach((c, idx) => {
    const stripDiv = document.createElement('div');
    stripDiv.className = 'strip-color';
    stripDiv.style.backgroundColor = c.hex;
    stripDiv.title = `${c.hex} · ${c.role || ''} (Clic para seleccionar)`;
    stripDiv.addEventListener('click', () => {
      activeSwatchIndex = idx;
      updateActiveSwatchUI();
      copyText(c.hex, `¡HEX ${c.hex} copiado!`);
    });
    swatchesStrip.appendChild(stripDiv);
  });

  // 2. Render Swatches List Cards
  swatchesList.innerHTML = '';
  currentPalette.forEach((c, idx) => {
    const card = document.createElement('div');
    card.className = `swatch-card ${idx === activeSwatchIndex ? 'active' : ''}`;
    card.dataset.index = idx;

    const rgbText = `RGB(${c.r}, ${c.g}, ${c.b})`;
    const isLight = c.lum > 0.65;
    const textColor = isLight ? '#111' : '#fff';

    card.innerHTML = `
      <div class="swatch-color-box" style="background-color: ${c.hex};">
        <span class="swatch-role-tag">${c.role || `Color ${idx + 1}`}</span>
      </div>
      <div class="swatch-codes">
        <div class="swatch-hex" title="Clic para copiar HEX">
          <span>${c.hex}</span>
          <span class="swatch-copy-badge">COPIAR</span>
        </div>
        <div class="swatch-rgb" title="Clic para copiar RGB">${rgbText}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      activeSwatchIndex = idx;
      updateActiveSwatchUI();
      copyText(c.hex, `¡HEX ${c.hex} copiado!`);
    });

    swatchesList.appendChild(card);
  });

  if (exportCardBtn) exportCardBtn.disabled = false;
  if (copyHexListBtn) copyHexListBtn.disabled = false;
  if (copyCssBtn) copyCssBtn.disabled = false;
  if (copyJsonBtn) copyJsonBtn.disabled = false;
}

function updateActiveSwatchUI() {
  const cards = swatchesList.querySelectorAll('.swatch-card');
  cards.forEach((card, idx) => {
    if (idx === activeSwatchIndex) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

// Display Loaded Image in Canvas
function displayImage(img) {
  loadedImage = img;
  const maxW = 900;
  const maxH = 650;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  let scale = 1;
  if (w > maxW || h > maxH) {
    scale = Math.min(maxW / w, maxH / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  previewCanvas.width = w;
  previewCanvas.height = h;
  const ctx = previewCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  dropzoneEmpty.classList.add('hidden');
  previewWrapper.classList.remove('hidden');

  // Trigger palette extraction
  recalculatePalette();
}

function recalculatePalette() {
  if (!loadedImage) return;
  loadingOverlay.classList.remove('hidden');
  setTimeout(() => {
    currentPalette = extractPalette(loadedImage, colorCount, currentHarmony);
    renderPalette();
    loadingOverlay.classList.add('hidden');
  }, 30);
}

// File Loading Logic
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP, etc.)');
    return;
  }
  loadingOverlay.classList.remove('hidden');
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      displayImage(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Setup Event Listeners
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });
}

if (dropzoneEmpty) {
  dropzoneEmpty.addEventListener('click', () => {
    if (fileInput) fileInput.click();
  });
}

if (replaceBtn) {
  replaceBtn.addEventListener('click', () => {
    if (fileInput) fileInput.click();
  });
}

// Drag & drop support
const dropArea = document.getElementById('image-viewport');
if (dropArea) {
  ['dragenter', 'dragover'].forEach(name => {
    dropArea.addEventListener(name, (e) => {
      e.preventDefault();
      dropArea.style.borderColor = 'var(--accent)';
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropArea.addEventListener(name, (e) => {
      e.preventDefault();
      dropArea.style.borderColor = 'var(--border)';
    });
  });

  dropArea.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
}

// Paste from clipboard support
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      handleFile(file);
      break;
    }
  }
});

// Interactive Eyedropper on Preview Canvas
if (previewCanvas) {
  previewCanvas.addEventListener('mousemove', (e) => {
    if (!loadedImage) return;
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < previewCanvas.width && y >= 0 && y < previewCanvas.height) {
      const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

      // Position loupe inside viewport
      const wrapperRect = previewWrapper.getBoundingClientRect();
      const lx = e.clientX - wrapperRect.left;
      const ly = e.clientY - wrapperRect.top;

      loupeEl.style.display = 'block';
      loupeEl.style.left = `${lx}px`;
      loupeEl.style.top = `${ly}px`;
      loupeEl.style.backgroundColor = hex;
      loupeHexEl.textContent = hex;
    }
  });

  previewCanvas.addEventListener('mouseleave', () => {
    loupeEl.style.display = 'none';
  });

  previewCanvas.addEventListener('click', (e) => {
    if (!loadedImage || currentPalette.length === 0) return;
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < previewCanvas.width && y >= 0 && y < previewCanvas.height) {
      const ctx = previewCanvas.getContext('2d', { willReadFrequently: true });
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const r = pixel[0], g = pixel[1], b = pixel[2];
      const hex = rgbToHex(r, g, b);
      const lum = getLuminance(r, g, b);
      const hsl = rgbToHsl(r, g, b);

      const customColor = {
        r, g, b, hex, lum, sat: hsl.s, hue: hsl.h,
        role: 'Pipeta'
      };

      // Replace currently active swatch
      currentPalette[activeSwatchIndex] = customColor;
      renderPalette();
      copyText(hex, `¡Color ${hex} asignado a la muestra ${activeSwatchIndex + 1}!`);
    }
  });
}

// Count Selector (5 vs 6)
countBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    countBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    colorCount = parseInt(btn.dataset.count, 10) || 5;
    if (activeSwatchIndex >= colorCount) activeSwatchIndex = colorCount - 1;
    recalculatePalette();
  });
});

// Harmony Selector
harmonyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    harmonyBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentHarmony = btn.dataset.harmony || 'balanced';
    recalculatePalette();
  });
});

// Format Selector for Export
formatBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    formatBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    exportFormat = btn.dataset.format || '4:5';
  });
});

// Quick Copy Actions
if (copyHexListBtn) {
  copyHexListBtn.addEventListener('click', () => {
    if (currentPalette.length === 0) return;
    const list = currentPalette.map(c => c.hex).join(', ');
    copyText(list, '¡Lista de códigos HEX copiada!');
  });
}

if (copyCssBtn) {
  copyCssBtn.addEventListener('click', () => {
    if (currentPalette.length === 0) return;
    const css = currentPalette.map((c, i) => `  --palette-color-${i + 1}: ${c.hex};`).join('\n');
    copyText(`:root {\n${css}\n}`, '¡Variables CSS copiadas!');
  });
}

if (copyJsonBtn) {
  copyJsonBtn.addEventListener('click', () => {
    if (currentPalette.length === 0) return;
    const json = JSON.stringify(currentPalette.map(c => ({
      role: c.role,
      hex: c.hex,
      rgb: `rgb(${c.r}, ${c.g}, ${c.b})`
    })), null, 2);
    copyText(json, '¡Paleta en JSON copiada!');
  });
}

// Card Exporter (Render High-Res Aesthetic Image Card)
if (exportCardBtn) {
  exportCardBtn.addEventListener('click', () => {
    if (!loadedImage || currentPalette.length === 0) return;
    exportCardBtn.disabled = true;
    exportCardBtn.textContent = 'Generando tarjeta HD...';

    setTimeout(() => {
      try {
        generateAndDownloadCard();
      } catch (err) {
        console.error('Error generating card:', err);
        alert('Error al generar tarjeta: ' + err.message);
      } finally {
        exportCardBtn.disabled = false;
        exportCardBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L9 13.586V7a1 1 0 112 0v6.586l1.293-1.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z"/><path d="M3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>
          <span>Descargar Tarjeta HD</span>
        `;
      }
    }, 50);
  });
}

function generateAndDownloadCard() {
  const cardCanvas = document.createElement('canvas');
  let cw, ch;

  // Dimensions based on selected format
  if (exportFormat === '1:1') {
    cw = 1080; ch = 1080;
  } else if (exportFormat === '9:16') {
    cw = 1080; ch = 1920;
  } else if (exportFormat === 'banner') {
    cw = 1200; ch = 520;
  } else {
    // 4:5 (Standard Instagram Portrait)
    cw = 1080; ch = 1350;
  }

  cardCanvas.width = cw;
  cardCanvas.height = ch;
  const ctx = cardCanvas.getContext('2d');

  // Background: Rich dark photography studio tone
  ctx.fillStyle = '#0f0f10';
  ctx.fillRect(0, 0, cw, ch);

  if (exportFormat === 'banner') {
    // Banner mode: horizontal layout
    const pad = 40;
    const photoW = 440;
    const photoH = ch - (pad * 2);

    // Draw photo container
    drawRoundedImage(ctx, loadedImage, pad, pad, photoW, photoH, 16);

    // Header text
    ctx.fillStyle = '#888888';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('RK STUDIO · PALETA DE COLOR', pad + photoW + 40, pad + 24);

    // Swatches row
    const swatchAreaW = cw - (pad + photoW + 40) - pad;
    const swatchCount = currentPalette.length;
    const gap = 12;
    const swatchW = (swatchAreaW - (gap * (swatchCount - 1))) / swatchCount;
    const swatchH = 260;
    const swatchY = pad + 56;

    currentPalette.forEach((c, idx) => {
      const sx = pad + photoW + 40 + idx * (swatchW + gap);
      // Draw swatch box
      drawRoundedRect(ctx, sx, swatchY, swatchW, swatchH, 12, c.hex);

      // Draw HEX label
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.hex, sx + swatchW / 2, swatchY + swatchH + 28);

      // Draw role label
      ctx.fillStyle = '#888888';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(c.role || `Tono ${idx + 1}`, sx + swatchW / 2, swatchY + swatchH + 46);
    });
  } else {
    // Portrait / Square / Story mode (Vertical stack)
    const pad = 48;
    const bottomAreaH = exportFormat === '9:16' ? 380 : 280;
    const photoX = pad;
    const photoY = pad + (exportFormat === '9:16' ? 80 : 20);
    const photoW = cw - (pad * 2);
    const photoH = ch - photoY - bottomAreaH;

    // Draw photo with smooth rounded corners and contain/cover fit
    drawRoundedImage(ctx, loadedImage, photoX, photoY, photoW, photoH, 18);

    // Studio watermark / header above or below photo
    ctx.textAlign = 'left';
    ctx.fillStyle = '#666666';
    ctx.font = '700 11px Inter, sans-serif';
    ctx.fillText('RK STUDIO  ·  COLOR PALETTE', photoX, photoY + photoH + 40);

    // Swatches Row
    const swatchY = photoY + photoH + 58;
    const swatchCount = currentPalette.length;
    const gap = 12;
    const totalW = cw - (pad * 2);
    const swatchW = (totalW - (gap * (swatchCount - 1))) / swatchCount;
    const swatchH = exportFormat === '9:16' ? 140 : 100;

    currentPalette.forEach((c, idx) => {
      const sx = photoX + idx * (swatchW + gap);

      // Swatch pill / box
      drawRoundedRect(ctx, sx, swatchY, swatchW, swatchH, 12, c.hex);

      // HEX Label below swatch
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 13px monospace';
      ctx.fillText(c.hex, sx + swatchW / 2, swatchY + swatchH + 24);

      // Role tag
      ctx.fillStyle = '#777777';
      ctx.font = '600 10px Inter, sans-serif';
      ctx.fillText(c.role || `Tono ${idx + 1}`, sx + swatchW / 2, swatchY + swatchH + 40);
    });
  }

  // Trigger Download
  cardCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rk_paleta_${exportFormat}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('¡Tarjeta HD descargada con éxito!');
  }, 'image/jpeg', 0.95);
}

// Canvas Drawing Helpers
function drawRoundedRect(ctx, x, y, w, h, radius, fillColor) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.restore();
}

function drawRoundedImage(ctx, img, x, y, w, h, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.clip();

  // Draw image with aspect ratio preservation (cover)
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const imgRatio = iw / ih;
  const targetRatio = w / h;

  let sx = 0, sy = 0, sWidth = iw, sHeight = ih;
  if (imgRatio > targetRatio) {
    sWidth = Math.round(ih * targetRatio);
    sx = Math.round((iw - sWidth) / 2);
  } else {
    sHeight = Math.round(iw / targetRatio);
    sy = Math.round((ih - sHeight) / 2);
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
  ctx.restore();
}
