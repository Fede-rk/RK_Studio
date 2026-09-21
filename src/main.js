// src/main.js
import './style.css';
import { GLRenderer }            from './engine/glRenderer.js';
import { loadImage }             from './engine/rawLoader.js';
import { exportImage, FORMATS }  from './engine/exporter.js';
import { setupDropzone }         from './ui/dropzone.js';
import { buildControls }         from './ui/controls.js';
import { buildPresetRail }       from './ui/presetRail.js';
import { PRESETS, DEFAULT_PARAMS } from './data/presets.js';

let exifData      = null;
let currentFormat = '4:5';

const pan = { x: 0.5, y: 0.5 };
let zoom = 1.0;
let isPanMode = false;
let isDragging = false;
const dragStart = { x: 0, y: 0 };
const panStart  = { x: 0.5, y: 0.5 };
let isPinching  = false;
let pinchStartDist = 0;
let pinchStartZoom = 1.0;

const previewArea   = document.getElementById('preview-area');
const frameContainer= document.getElementById('frame-container');
const canvasEl      = document.getElementById('preview-canvas');
const cropGrid      = document.getElementById('crop-grid');
const dropOverlay   = document.getElementById('drop-overlay');
const compareBadge  = document.getElementById('compare-badge');
const badgeText     = document.getElementById('badge-text');
const processingEl  = document.getElementById('processing');
const exportBtn     = document.getElementById('export-btn');
const headerExportBtn = document.getElementById('header-export-btn');
const resetBtn      = document.getElementById('reset-btn');
const rotateBtn     = document.getElementById('rotate-btn');
const centerBtn     = document.getElementById('center-btn');
const controlsInner = document.getElementById('controls-inner');
const presetRail    = document.getElementById('preset-rail');
const formatBtns    = document.querySelectorAll('.fmt-btn');
const inputDrop     = document.getElementById('file-input-drop');
const inputReplace  = document.getElementById('file-input-replace');

// Reframe toolbar elements
const reframeBar       = document.getElementById('reframe-bar');
const zoomSlider       = document.getElementById('zoom-slider');
const zoomInBtn        = document.getElementById('zoom-in-btn');
const zoomOutBtn       = document.getElementById('zoom-out-btn');
const zoomLabel        = document.getElementById('zoom-label');
const reframeCenterBtn = document.getElementById('reframe-center-btn');
const reframeDoneBtn   = document.getElementById('reframe-done-btn');

let renderer = null;

function showFatalError(err) {
    const isNoWebGL = err.message === 'NO_WEBGL';
    let msg;
    if (isNoWebGL) {
        msg = 'WebGL no disponible. Abre chrome://settings/system y activa la aceleracion grafica, o proba en otro navegador.';
    } else {
        msg = 'Error al iniciar: ' + err.message;
    }
    dropOverlay.innerHTML = '<div class="drop-content"><p style="color:#e55;font-size:1rem;max-width:340px;line-height:1.6">' + msg + '</p></div>';
    console.error('[RK FilmLab] Fatal error:', err);
}

try {
    renderer = new GLRenderer(canvasEl);
} catch (e) {
    showFatalError(e);
}

const controls = buildControls(
    controlsInner,
    DEFAULT_PARAMS,
    (key, value) => { if (renderer) renderer.setParam(key, value); }
);

buildPresetRail(presetRail, PRESETS, (preset) => {
    if (!renderer) return;
    renderer.setParams(preset.params);
    controls.loadParams(preset.params);
});

let currentMetrics = { fw: 0, fh: 0, cw: 0, ch: 0, overflowX: 0, overflowY: 0 };

function setZoom(val) {
    zoom = Math.max(1.0, Math.min(3.5, Number(val) || 1.0));
    zoom = Math.round(zoom * 100) / 100;
    if (zoomSlider) zoomSlider.value = zoom;
    if (zoomLabel) zoomLabel.textContent = `${zoom.toFixed(1)}×`;
    updateFrameAndCanvas();
}

function updateFrameAndCanvas() {
    if (!renderer || !renderer.canvas.width) return;

    const fmt = FORMATS[currentFormat] || FORMATS['4:5'];
    const dstRatio = fmt.w / fmt.h;

    const area = previewArea.getBoundingClientRect();
    const pad = 40;
    const maxW = Math.max(120, area.width - pad);
    const maxH = Math.max(120, area.height - pad);

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

    frameContainer.style.width  = `${fw}px`;
    frameContainer.style.height = `${fh}px`;

    const srcW = renderer.canvas.width;
    const srcH = renderer.canvas.height;
    const srcRatio = srcW / srcH;

    let baseCw, baseCh;
    if (srcRatio > dstRatio) {
        baseCh = fh;
        baseCw = Math.round(baseCh * srcRatio);
    } else {
        baseCw = fw;
        baseCh = Math.round(baseCw / srcRatio);
    }

    const cw = Math.round(baseCw * zoom);
    const ch = Math.round(baseCh * zoom);

    const overflowX = Math.max(0, cw - fw);
    const overflowY = Math.max(0, ch - fh);

    currentMetrics = { fw, fh, cw, ch, overflowX, overflowY };

    canvasEl.style.width  = `${cw}px`;
    canvasEl.style.height = `${ch}px`;

    updateCanvasPosition();
}

function updateCanvasPosition() {
    const { overflowX, overflowY } = currentMetrics;
    const left = -Math.round(overflowX * pan.x);
    const top  = -Math.round(overflowY * pan.y);
    canvasEl.style.left = `${left}px`;
    canvasEl.style.top  = `${top}px`;
}

function togglePanMode(force) {
    if (!renderer || !renderer.canvas.width) return;
    isPanMode = force !== undefined ? force : !isPanMode;
    if (isPanMode) {
        frameContainer.classList.add('panning');
        cropGrid.classList.remove('hidden');
        centerBtn.classList.add('btn-primary');
        compareBadge.classList.add('hidden');
        if (reframeBar) reframeBar.classList.remove('hidden');
    } else {
        frameContainer.classList.remove('panning', 'is-dragging');
        cropGrid.classList.add('hidden');
        centerBtn.classList.remove('btn-primary');
        if (reframeBar) reframeBar.classList.add('hidden');
        compareBadge.classList.remove('hidden', 'badge-active');
        if (badgeText) badgeText.textContent = 'Doble clic: centrar / reencuadrar · Mantener: original';
    }
}

function handleDoubleAction() {
    if (!renderer || !renderer.canvas.width) return;
    pan.x = 0.5;
    pan.y = 0.5;
    togglePanMode(true);
    updateCanvasPosition();
}

async function handleFile(file) {
    if (!renderer) return;
    processingEl.classList.remove('hidden');
    try {
        const result = await loadImage(file);
        exifData = result.exifData;
        pan.x = 0.5;
        pan.y = 0.5;
        setZoom(1.0);
        renderer.loadImage(result.img);
        dropOverlay.classList.add('hidden');
        frameContainer.classList.remove('hidden');
        exportBtn.disabled = false;
        if (headerExportBtn) headerExportBtn.disabled = false;
        compareBadge.classList.remove('hidden');
        togglePanMode(false);
        updateFrameAndCanvas();
    } catch (err) {
        alert('Error cargando imagen: ' + err.message);
        if (frameContainer.classList.contains('hidden')) {
            dropOverlay.classList.remove('hidden');
        }
    } finally {
        processingEl.classList.add('hidden');
    }
}

setupDropzone({ overlayEl: dropOverlay, inputDrop, inputReplace, onFile: handleFile });

frameContainer.addEventListener('dblclick', (e) => {
    e.preventDefault();
    handleDoubleAction();
});

// Wheel zoom
frameContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!renderer || !renderer.canvas.width) return;
    if (!isPanMode) togglePanMode(true);
    const step = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(zoom + step);
}, { passive: false });

frameContainer.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (isPanMode) {
        isDragging = true;
        frameContainer.classList.add('is-dragging');
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
        panStart.x = pan.x;
        panStart.y = pan.y;
    } else {
        if (renderer) renderer.setShowOriginal(true);
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDragging && isPanMode) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        if (currentMetrics.overflowX > 0) {
            pan.x = Math.max(0, Math.min(1, panStart.x - (deltaX / currentMetrics.overflowX)));
        }
        if (currentMetrics.overflowY > 0) {
            pan.y = Math.max(0, Math.min(1, panStart.y - (deltaY / currentMetrics.overflowY)));
        }
        updateCanvasPosition();
    }
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        frameContainer.classList.remove('is-dragging');
    }
    if (!isPanMode && renderer) {
        renderer.setShowOriginal(false);
    }
});

// Touch and pinch-to-zoom
let lastTouchEnd = 0;

frameContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (isPanMode) {
            isDragging = true;
            frameContainer.classList.add('is-dragging');
            dragStart.x = touch.clientX;
            dragStart.y = touch.clientY;
            panStart.x = pan.x;
            panStart.y = pan.y;
        } else {
            if (renderer) renderer.setShowOriginal(true);
        }
    } else if (e.touches.length === 2) {
        isDragging = false;
        isPinching = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.hypot(dx, dy);
        pinchStartZoom = zoom;
        if (!isPanMode) togglePanMode(true);
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (isPinching && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (pinchStartDist > 0) {
            const scale = dist / pinchStartDist;
            setZoom(pinchStartZoom * scale);
        }
    } else if (isDragging && isPanMode && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        if (currentMetrics.overflowX > 0) {
            pan.x = Math.max(0, Math.min(1, panStart.x - (deltaX / currentMetrics.overflowX)));
        }
        if (currentMetrics.overflowY > 0) {
            pan.y = Math.max(0, Math.min(1, panStart.y - (deltaY / currentMetrics.overflowY)));
        }
        updateCanvasPosition();
    }
}, { passive: true });

window.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 320 && e.touches.length === 0 && !isPinching) {
        handleDoubleAction();
    }
    lastTouchEnd = now;

    if (e.touches.length < 2) {
        isPinching = false;
    }
    if (e.touches.length === 0) {
        if (isDragging) {
            isDragging = false;
            frameContainer.classList.remove('is-dragging');
        }
        if (!isPanMode && renderer) renderer.setShowOriginal(false);
    }
});

// Reframe toolbar actions
if (zoomSlider) {
    zoomSlider.addEventListener('input', (e) => {
        setZoom(parseFloat(e.target.value));
    });
}
if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setZoom(zoom + 0.15);
    });
}
if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setZoom(zoom - 0.15);
    });
}
if (reframeCenterBtn) {
    reframeCenterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pan.x = 0.5;
        pan.y = 0.5;
        updateCanvasPosition();
    });
}
if (reframeDoneBtn) {
    reframeDoneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanMode(false);
    });
}

if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
        if (!renderer) return;
        renderer.rotate(90);
        pan.x = 0.5;
        pan.y = 0.5;
        setZoom(1.0);
        updateFrameAndCanvas();
    });
}

if (centerBtn) {
    centerBtn.addEventListener('click', () => {
        pan.x = 0.5;
        pan.y = 0.5;
        updateCanvasPosition();
    });
}

formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFormat = btn.dataset.format;
        pan.x = 0.5;
        pan.y = 0.5;
        setZoom(1.0);
        updateFrameAndCanvas();
    });
});

window.addEventListener('resize', () => {
    updateFrameAndCanvas();
});

async function triggerExport() {
    if (!renderer) return;
    exportBtn.disabled = true;
    if (headerExportBtn) headerExportBtn.disabled = true;
    exportBtn.textContent = 'Exportando...';
    if (headerExportBtn) headerExportBtn.textContent = 'Exportando...';
    try {
        await exportImage(renderer, currentFormat, exifData, pan, zoom);
    } catch (e) {
        alert('Error al exportar: ' + e.message);
    } finally {
        exportBtn.disabled = false;
        if (headerExportBtn) headerExportBtn.disabled = false;
        exportBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L9 13.586V7a1 1 0 112 0v6.586l1.293-1.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z"/><path d="M3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg> <span class="btn-label-text">Exportar JPG</span><span class="btn-icon-only">JPG</span>';
        if (headerExportBtn) headerExportBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L9 13.586V7a1 1 0 112 0v6.586l1.293-1.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z"/><path d="M3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg> Exportar JPG';
    }
}

exportBtn.addEventListener('click', triggerExport);
if (headerExportBtn) headerExportBtn.addEventListener('click', triggerExport);

resetBtn.addEventListener('click', () => {
    if (!renderer) return;
    renderer.setParams(Object.assign({}, DEFAULT_PARAMS));
    controls.loadParams(DEFAULT_PARAMS);
    pan.x = 0.5;
    pan.y = 0.5;
    setZoom(1.0);
    updateCanvasPosition();
    togglePanMode(false);
    document.querySelectorAll('.preset-card.active').forEach(el => el.classList.remove('active'));
});