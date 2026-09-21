// src/engine/rawLoader.js
import exifr from 'exifr';

const RAW_EXTS = new Set([
    'cr2','cr3','nef','nrw','arw','sr2','srf','orf',
    'rw2','dng','raf','raw','rwl','mrw','pef','3fr',
    'fff','iiq','kdc','dcr','erf',
]);

function isRaw(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    return RAW_EXTS.has(ext);
}

/* Scan raw binary for the largest embedded JPEG blob */
async function extractJpegFromRaw(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const results = [];

    for (let i = 0; i < bytes.length - 3; i++) {
        // JPEG SOI: FF D8 FF
        if (bytes[i] === 0xFF && bytes[i+1] === 0xD8 && bytes[i+2] === 0xFF) {
            const limit = Math.min(i + 55_000_000, bytes.length - 1);
            for (let j = i + 2; j < limit; j++) {
                if (bytes[j] === 0xFF && bytes[j+1] === 0xD9) {
                    const size = j + 2 - i;
                    results.push({ offset: i, size });
                    i = j + 1;
                    break;
                }
            }
        }
    }

    if (!results.length) return null;

    const best = results.reduce((a, b) => a.size > b.size ? a : b);
    if (best.size < 150_000) return null;

    return buffer.slice(best.offset, best.offset + best.size);
}

function createOrientedCanvas(imgSource, orientation = 1) {
    const sw = imgSource.naturalWidth || imgSource.width;
    const sh = imgSource.naturalHeight || imgSource.height;

    const isSwapped = orientation >= 5 && orientation <= 8;
    const dw = isSwapped ? sh : sw;
    const dh = isSwapped ? sw : sh;

    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    switch (orientation) {
        case 2: // flip horizontal
            ctx.translate(dw, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(imgSource, 0, 0, dw, dh);
            break;
        case 3: // rotate 180
            ctx.translate(dw, dh);
            ctx.rotate(Math.PI);
            ctx.drawImage(imgSource, 0, 0, dw, dh);
            break;
        case 4: // flip vertical
            ctx.translate(0, dh);
            ctx.scale(1, -1);
            ctx.drawImage(imgSource, 0, 0, dw, dh);
            break;
        case 5: // transpose
            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            ctx.drawImage(imgSource, 0, 0, dh, dw);
            break;
        case 6: // rotate 90 CW (standard portrait from camera/phone)
            ctx.translate(dw, 0);
            ctx.rotate(0.5 * Math.PI);
            ctx.drawImage(imgSource, 0, 0, dh, dw);
            break;
        case 7: // transverse
            ctx.translate(dw, dh);
            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            ctx.drawImage(imgSource, 0, 0, dh, dw);
            break;
        case 8: // rotate 270 CW (90 CCW)
            ctx.translate(0, dh);
            ctx.rotate(-0.5 * Math.PI);
            ctx.drawImage(imgSource, 0, 0, dh, dw);
            break;
        default:
            ctx.drawImage(imgSource, 0, 0, dw, dh);
            break;
    }
    ctx.restore();
    return canvas;
}

/* Load image element from a File. Returns { img, exifData, wasRaw } */
export async function loadImage(file) {
    let blob = file;
    let wasRaw = false;
    let exifData = null;
    let orientation = 1;

    try {
        exifData = await exifr.parse(file, true);
    } catch (_) { /* ignore */ }

    if (isRaw(file)) {
        wasRaw = true;
        try {
            const jpegBuf = await extractJpegFromRaw(file);
            if (jpegBuf) {
                blob = new Blob([jpegBuf], { type: 'image/jpeg' });
                console.log('[RK FilmLab] RAW preview extracted:', Math.round(jpegBuf.byteLength / 1024), 'KB');
            } else {
                console.warn('[RK FilmLab] No embedded JPEG found in RAW, attempting direct load');
            }
        } catch (err) {
            console.error('[RK FilmLab] RAW extraction failed:', err);
        }
    }

    try {
        const ori = await exifr.orientation(blob).catch(() => null) 
                 || await exifr.orientation(file).catch(() => null);
        if (typeof ori === 'number' && ori >= 1 && ori <= 8) {
            orientation = ori;
        }
    } catch (_) {}

    if (orientation === 1 && exifData?.Orientation) {
        if (typeof exifData.Orientation === 'number') {
            orientation = exifData.Orientation;
        } else if (typeof exifData.Orientation === 'string') {
            const s = exifData.Orientation.toLowerCase();
            if (s.includes('90') && (s.includes('ccw') || s.includes('270'))) orientation = 8;
            else if (s.includes('90')) orientation = 6;
            else if (s.includes('180')) orientation = 3;
            else if (s.includes('270')) orientation = 8;
        }
    }

    let finalCanvas = null;

    if (!wasRaw && typeof createImageBitmap === 'function') {
        try {
            const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
            finalCanvas = document.createElement('canvas');
            finalCanvas.width = bmp.width;
            finalCanvas.height = bmp.height;
            const ctx = finalCanvas.getContext('2d');
            ctx.drawImage(bmp, 0, 0);
            bmp.close?.();
        } catch (_) {}
    }

    if (!finalCanvas) {
        const url = URL.createObjectURL(blob);
        const rawImg = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo decodificar la imagen.')); };
            img.src = url;
        });
        finalCanvas = createOrientedCanvas(rawImg, orientation);
    }

    return { img: finalCanvas, exifData, wasRaw, orientation };
}