// comparador/comparador.js — RK ReelMaker (Antes & Después)

const DEFAULT_ORIGINAL = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=95";

let originalSrc = DEFAULT_ORIGINAL;
let editedSrc   = "";
let originalBlobUrl = null;
let editedBlobUrl   = null;

let sliderPos = 50;
let fitMode   = 'cover';
let isDragging = false;
let isAnimating = false;
let isExporting = false;

let animRef = null;
let animDir = 1;

const screenEl       = document.getElementById('phone-screen');
const imgEditedEl    = document.getElementById('img-edited');
const imgOriginalEl  = document.getElementById('img-original');
const clipLayerEl    = document.getElementById('clip-layer');
const sliderHandleEl = document.getElementById('slider-handle');
const badgeOriginal  = document.getElementById('badge-original');
const badgeEdited    = document.getElementById('badge-edited');

const fitCoverBtn    = document.getElementById('fit-cover-btn');
const fitContainBtn  = document.getElementById('fit-contain-btn');

const inputOriginal  = document.getElementById('input-original');
const inputEdited    = document.getElementById('input-edited');
const btnAnimate     = document.getElementById('btn-animate');
const btnExport      = document.getElementById('btn-export');
const btnAnimateText = document.getElementById('btn-animate-text');
const btnAnimateIcon = document.getElementById('btn-animate-icon');
const btnExportText  = document.getElementById('btn-export-text');
const btnExportIcon  = document.getElementById('btn-export-icon');

// Create high-res edited sample using identical image with warm film grade
async function generateSampleEdited() {
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = DEFAULT_ORIGINAL;
        });

        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 1080;
        c.height = img.naturalHeight || 1620;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.filter = "contrast(1.22) saturate(1.25) brightness(0.96) sepia(0.14)";
        ctx.drawImage(img, 0, 0);

        editedSrc = c.toDataURL('image/jpeg', 0.96);
        imgEditedEl.src = editedSrc;
    } catch (_) {
        editedSrc = "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1600&q=95";
        imgEditedEl.src = editedSrc;
    }
}

imgOriginalEl.src = originalSrc;
generateSampleEdited();

function updateSlider(percent) {
    sliderPos = Math.max(0, Math.min(100, percent));
    clipLayerEl.style.width = `${sliderPos}%`;
    sliderHandleEl.style.left = `${sliderPos}%`;

    if (screenEl) {
        imgOriginalEl.style.width = `${screenEl.clientWidth}px`;
    }

    // Original on left: fades out if slider moved near left edge
    if (sliderPos < 20) {
        badgeOriginal.style.opacity = Math.max(0, (sliderPos - 5) / 15).toFixed(2);
    } else {
        badgeOriginal.style.opacity = "1";
    }

    // Edited on right: fades out if slider moved near right edge
    if (sliderPos > 80) {
        badgeEdited.style.opacity = Math.max(0, (95 - sliderPos) / 15).toFixed(2);
    } else {
        badgeEdited.style.opacity = "1";
    }
}

window.addEventListener('resize', () => {
    if (screenEl) {
        imgOriginalEl.style.width = `${screenEl.clientWidth}px`;
    }
});

if (fitCoverBtn && fitContainBtn) {
    fitCoverBtn.addEventListener('click', () => {
        fitMode = 'cover';
        fitCoverBtn.classList.add('active');
        fitContainBtn.classList.remove('active');
        imgEditedEl.className = 'img-layer fit-cover';
        imgOriginalEl.className = 'img-layer fit-cover';
    });

    fitContainBtn.addEventListener('click', () => {
        fitMode = 'contain';
        fitContainBtn.classList.add('active');
        fitCoverBtn.classList.remove('active');
        imgEditedEl.className = 'img-layer fit-contain';
        imgOriginalEl.className = 'img-layer fit-contain';
    });
}

function handleMove(clientX) {
    if (!screenEl) return;
    const rect = screenEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = (x / rect.width) * 100;
    updateSlider(pct);
}

screenEl.addEventListener('mousedown', (e) => {
    if (isExporting) return;
    isDragging = true;
    if (isAnimating) stopAnimation();
    handleMove(e.clientX);
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

screenEl.addEventListener('touchstart', (e) => {
    if (isExporting) return;
    isDragging = true;
    if (isAnimating) stopAnimation();
    if (e.touches[0]) handleMove(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (!isDragging || !e.touches[0]) return;
    handleMove(e.touches[0].clientX);
}, { passive: true });

window.addEventListener('touchend', () => {
    isDragging = false;
});

inputOriginal.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
        if (originalBlobUrl) URL.revokeObjectURL(originalBlobUrl);
        originalBlobUrl = URL.createObjectURL(file);
        originalSrc = originalBlobUrl;
        imgOriginalEl.src = originalSrc;
    }
});

inputEdited.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
        if (editedBlobUrl) URL.revokeObjectURL(editedBlobUrl);
        editedBlobUrl = URL.createObjectURL(file);
        editedSrc = editedBlobUrl;
        imgEditedEl.src = editedSrc;
    }
});

function startAnimation() {
    isAnimating = true;
    btnAnimateText.textContent = "Pausar";
    btnAnimateIcon.innerHTML = `<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>`;
    
    function tick() {
        let next = sliderPos + (1.25 * animDir);
        if (next >= 100) {
            next = 100;
            animDir = -1;
        } else if (next <= 0) {
            next = 0;
            animDir = 1;
        }
        updateSlider(next);
        animRef = requestAnimationFrame(tick);
    }
    animRef = requestAnimationFrame(tick);
}

function stopAnimation() {
    isAnimating = false;
    if (animRef) {
        cancelAnimationFrame(animRef);
        animRef = null;
    }
    btnAnimateText.textContent = "Ver Animación";
    btnAnimateIcon.innerHTML = `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>`;
}

btnAnimate.addEventListener('click', () => {
    if (isExporting) return;
    if (isAnimating) stopAnimation();
    else startAnimation();
});

// Helper easing
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Rounded rectangle helper for badges
function drawRoundedPill(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

async function exportReelVideo() {
    if (isExporting) return;
    isExporting = true;
    if (isAnimating) stopAnimation();

    btnExport.disabled = true;
    btnAnimate.disabled = true;
    btnExportText.textContent = "Preparando Reel HD...";
    btnExportIcon.innerHTML = `<circle class="spinner" cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="32" stroke-dashoffset="12"/>`;

    try {
        const W = 1080;
        const H = 1920;
        const FPS = 30;
        const frameTimeMs = 1000 / FPS; // ~33.33ms

        function loadImg(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                if (!src.startsWith('blob:') && !src.startsWith('data:')) {
                    img.crossOrigin = "anonymous";
                }
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        }

        const [imgOrig, imgEdit] = await Promise.all([
            loadImg(originalSrc),
            loadImg(editedSrc)
        ]);

        // Pre-render both images to dedicated 1080x1920 offscreen canvases.
        // This ensures 0 runtime scaling lag during video encoding!
        function createOffscreen(img, mode) {
            const oc = document.createElement('canvas');
            oc.width = W;
            oc.height = H;
            const octx = oc.getContext('2d');
            octx.imageSmoothingEnabled = true;
            octx.imageSmoothingQuality = 'high';

            octx.fillStyle = "#080808";
            octx.fillRect(0, 0, W, H);

            const nw = img.naturalWidth || img.width;
            const nh = img.naturalHeight || img.height;
            const ratio = (mode === 'contain')
                ? Math.min(W / nw, H / nh)
                : Math.max(W / nw, H / nh);
            const dw = Math.round(nw * ratio);
            const dh = Math.round(nh * ratio);
            const dx = Math.round((W - dw) / 2);
            const dy = Math.round((H - dh) / 2);

            octx.drawImage(img, 0, 0, nw, nh, dx, dy, dw, dh);
            return oc;
        }

        const offscreenOrig = createOffscreen(imgOrig, fitMode);
        const offscreenEdit = createOffscreen(imgEdit, fitMode);

        // Main recording canvas
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 30 FPS stream
        const stream = canvas.captureStream(FPS);

        // Optimal mime type selection (H.264 / MP4 preferred for mobile, WebM fallback)
        let mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4;codecs=avc1';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=h264';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        // 12 Mbps bitrate: ideal for 1080x1920 30 FPS on Instagram Reels & TikTok
        const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 12_000_000
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const downloadPromise = new Promise((resolve) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                a.download = `rk_reel_antes_despues_${Date.now()}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve();
            };
        });

        // Dynamic multi-sweep timeline (faster, snappier wipes between Original and Editada)
        const phases = [
            // 0: Initial split reveal hold
            { from: 50, to: 50, frames: 16 },
            // 1: First sweep to Original (right)
            { from: 50, to: 100, frames: 24 },
            // 2: Hold at Original
            { from: 100, to: 100, frames: 24 },
            // 3: Fast sweep across to Editada (left)
            { from: 100, to: 0, frames: 34 },
            // 4: Hold at Editada
            { from: 0, to: 0, frames: 24 },
            // 5: Second fast sweep back to Original
            { from: 0, to: 100, frames: 34 },
            // 6: Hold at Original
            { from: 100, to: 100, frames: 20 },
            // 7: Return smoothly to Center (50%)
            { from: 100, to: 50, frames: 20 },
            // 8: Final split hold
            { from: 50, to: 50, frames: 16 }
        ];

        const totalFrames = phases.reduce((sum, p) => sum + p.frames, 0);

        function getProgress(frameIdx) {
            let acc = 0;
            for (const phase of phases) {
                if (frameIdx < acc + phase.frames) {
                    const t = (frameIdx - acc) / phase.frames;
                    const easedT = easeInOutQuad(t);
                    return phase.from + (phase.to - phase.from) * easedT;
                }
                acc += phase.frames;
            }
            return 50;
        }

        function renderFrame(pos) {
            const clipX = Math.round((W * pos) / 100);

            // 1. Right base layer: EDITADA
            ctx.drawImage(offscreenEdit, 0, 0);

            // Right badge: Editada
            let editadaAlpha = 1;
            if (pos > 82) {
                editadaAlpha = Math.max(0, (97 - pos) / 15);
            }
            if (editadaAlpha > 0.01) {
                ctx.save();
                ctx.globalAlpha = editadaAlpha;
                ctx.fillStyle = "rgba(12, 12, 12, 0.72)";
                drawRoundedPill(ctx, W - 270, H - 140, 220, 64, 18);
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
                ctx.stroke();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("Editada", W - 160, H - 108);
                ctx.restore();
            }

            // 2. Left clipped layer: ORIGINAL
            if (clipX > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, clipX, H);
                ctx.clip();

                ctx.drawImage(offscreenOrig, 0, 0);

                // Left badge: Original
                let origAlpha = 1;
                if (pos < 18) {
                    origAlpha = Math.max(0, (pos - 3) / 15);
                }
                if (origAlpha > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = origAlpha;
                    ctx.fillStyle = "rgba(12, 12, 12, 0.72)";
                    drawRoundedPill(ctx, 50, H - 140, 220, 64, 18);
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
                    ctx.stroke();

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("Original", 160, H - 108);
                    ctx.restore();
                }

                // Vertical divider line
                ctx.beginPath();
                ctx.moveTo(clipX, 0);
                ctx.lineTo(clipX, H);
                ctx.lineWidth = 5;
                ctx.strokeStyle = "#ffffff";
                ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.restore();
            }

            // 3. Central Circular Handle
            const handleY = H / 2;
            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 2;

            ctx.beginPath();
            ctx.arc(clipX, handleY, 44, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            ctx.lineWidth = 4;
            ctx.strokeStyle = "#d4a843";
            ctx.stroke();

            ctx.shadowColor = "transparent";
            ctx.fillStyle = "#111111";
            ctx.font = "bold 32px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("⟨ ⟩", clipX, handleY + 1);
            ctx.restore();
        }

        // Draw the initial frame before starting recorder
        renderFrame(getProgress(0));

        recorder.start();

        // Controlled 30 FPS playback loop
        let currentFrame = 0;
        await new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (currentFrame >= totalFrames) {
                    clearInterval(intervalId);
                    // Short hold before stop to ensure last frame writes
                    setTimeout(() => {
                        if (recorder.state !== 'inactive') {
                            recorder.stop();
                        }
                        resolve();
                    }, 250);
                    return;
                }

                const pos = getProgress(currentFrame);
                renderFrame(pos);
                currentFrame++;

                const pct = Math.round((currentFrame / totalFrames) * 100);
                btnExportText.textContent = `Generando Reel HD... ${pct}%`;
            }, frameTimeMs);
        });

        await downloadPromise;

    } catch (err) {
        console.error("Error exportando video:", err);
        alert("Hubo un error al generar el video. Verificá que las imágenes sean válidas.");
    } finally {
        isExporting = false;
        btnExport.disabled = false;
        btnAnimate.disabled = false;
        btnExportText.textContent = "Descargar Reel (1080×1920 · 30 FPS)";
        btnExportIcon.innerHTML = `<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>`;
    }
}

btnExport.addEventListener('click', exportReelVideo);
updateSlider(50);
