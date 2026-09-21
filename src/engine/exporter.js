// src/engine/exporter.js
import piexif from 'piexifjs';

export const FORMATS = {
    '4:5':    { w: 1080, h: 1350, label: 'Portrait 4:5'       },
    '1:1':    { w: 1080, h: 1080, label: 'Cuadrado 1:1'       },
    '9:16':   { w: 1080, h: 1920, label: 'Stories / Reels 9:16'},
    '1.91:1': { w: 1080, h:  566, label: 'Cinematico 1.91:1'  },
};

function blobToDataURL(blob) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(blob);
    });
}

function dataURLToBlob(dataURL) {
    const [meta, b64] = dataURL.split(',');
    const mime = meta.match(/:(.*?);/)[1];
    const bin  = atob(b64);
    const arr  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

async function injectExif(jpegBlob, exifData) {
    try {
        const dataURL = await blobToDataURL(jpegBlob);

        const zeroth = {};
        const exif   = {};

        zeroth[piexif.ImageIFD.Software] = 'RK FilmLab';
        if (exifData?.Make)             zeroth[piexif.ImageIFD.Make]  = exifData.Make;
        if (exifData?.Model)            zeroth[piexif.ImageIFD.Model] = exifData.Model;
        if (exifData?.Artist)           zeroth[piexif.ImageIFD.Artist]= exifData.Artist;
        if (exifData?.Copyright)        zeroth[piexif.ImageIFD.Copyright] = exifData.Copyright;
        if (exifData?.ExposureTime)     exif[piexif.ExifIFD.ExposureTime]   = [Math.round(exifData.ExposureTime * 1e6), 1e6];
        if (exifData?.FNumber)          exif[piexif.ExifIFD.FNumber]         = [Math.round(exifData.FNumber * 10), 10];
        if (exifData?.ISO)              exif[piexif.ExifIFD.ISOSpeedRatings] = exifData.ISO;
        if (exifData?.FocalLength)      exif[piexif.ExifIFD.FocalLength]     = [Math.round(exifData.FocalLength * 10), 10];

        const exifObj = { '0th': zeroth, 'Exif': exif, 'GPS': {}, 'Interop': {}, '1st': {} };
        const exifStr = piexif.dump(exifObj);
        const result  = piexif.insert(exifStr, dataURL);
        return dataURLToBlob(result);
    } catch (e) {
        console.warn('[RK FilmLab] EXIF inject failed:', e);
        return jpegBlob;
    }
}

export async function exportImage(renderer, formatKey, exifData, pan = { x: 0.5, y: 0.5 }, zoom = 1.0) {
    const fmt = FORMATS[formatKey] || FORMATS['4:5'];
    const { w: dstW, h: dstH } = fmt;

    const src  = renderer.canvas;
    const srcW = src.width, srcH = src.height;

    const srcRatio = srcW / srcH;
    const dstRatio = dstW / dstH;

    const px = typeof pan?.x === 'number' ? Math.max(0, Math.min(1, pan.x)) : 0.5;
    const py = typeof pan?.y === 'number' ? Math.max(0, Math.min(1, pan.y)) : 0.5;
    const z  = typeof zoom === 'number' ? Math.max(1.0, Math.min(4.0, zoom)) : 1.0;

    let baseCropW, baseCropH;
    if (srcRatio > dstRatio) {
        baseCropH = srcH;
        baseCropW = Math.round(srcH * dstRatio);
    } else {
        baseCropW = srcW;
        baseCropH = Math.round(baseCropW / dstRatio);
    }

    const cropW = Math.max(1, Math.round(baseCropW / z));
    const cropH = Math.max(1, Math.round(baseCropH / z));

    const maxOffsetX = Math.max(0, srcW - cropW);
    const maxOffsetY = Math.max(0, srcH - cropH);

    const cropX = Math.round(maxOffsetX * px);
    const cropY = Math.round(maxOffsetY * py);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width  = dstW;
    exportCanvas.height = dstH;
    const ctx = exportCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, dstW, dstH);

    const blob = await new Promise(res => exportCanvas.toBlob(res, 'image/jpeg', 0.92));
    const finalBlob = await injectExif(blob, exifData);

    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    const fmtLabel = formatKey.replace(':', 'x').replace('.', 'p');
    a.download = 'rkfilmlab_' + fmtLabel + '_' + Date.now() + '.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}