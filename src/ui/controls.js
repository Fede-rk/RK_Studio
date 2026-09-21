// src/ui/controls.js

function hexToVec3(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
}

function vec3ToHex(v) {
    const c = v.map(x => Math.round(Math.max(0, Math.min(1, x)) * 255)
                         .toString(16).padStart(2, '0'));
    return '#' + c.join('');
}

function fmtVal(v, decimals = 2) {
    return parseFloat(v).toFixed(decimals);
}

const GROUPS = [
    {
        id: 'tone', name: 'Tono', open: true,
        params: [
            { key: 'exposure',   label: 'Exposición',  min: -3,   max: 3,   step: 0.05,  def: 0,   unit: 'EV' },
            { key: 'contrast',   label: 'Contraste',   min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'shadows',    label: 'Sombras',     min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'highlights', label: 'Luces',       min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'blacks',     label: 'Negros',      min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'whites',     label: 'Blancos',     min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'fade',       label: 'Fade',        min: 0,    max: 1,   step: 0.01,  def: 0 },
        ]
    },
    {
        id: 'color', name: 'Color', open: true,
        params: [
            { key: 'temp',       label: 'Temperatura', min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'tint',       label: 'Tinte',       min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'saturation', label: 'Saturación',  min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'vibrance',   label: 'Vibrance',    min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'shadow_tint',        label: 'Color sombras',  type: 'color', def: '#8da0b3' },
            { key: 'shadow_strength',    label: 'Intensidad ↑',   min: 0,    max: 1,   step: 0.01,  def: 0 },
            { key: 'highlight_tint',     label: 'Color luces',    type: 'color', def: '#f5d49e' },
            { key: 'highlight_strength', label: 'Intensidad ↑',   min: 0,    max: 1,   step: 0.01,  def: 0 },
        ]
    },
    {
        id: 'detail', name: 'Detalle', open: true,
        params: [
            { key: 'clarity',    label: 'Claridad',    min: -1,   max: 1,   step: 0.01,  def: 0 },
            { key: 'blur',       label: 'Blur / Foco', min: 0,    max: 1,   step: 0.01,  def: 0 },
        ]
    },
    {
        id: 'creative', name: 'Creativo', open: true,
        params: [
            { key: 'grain_amount',    label: 'Grano',           min: 0, max: 1, step: 0.01, def: 0 },
            { key: 'grain_size',      label: 'Tamaño grano',    min: 0, max: 1, step: 0.01, def: 0.5 },
            { key: 'grain_roughness', label: 'Rugosidad grano', min: 0, max: 1, step: 0.01, def: 0.5 },
            { key: 'vignette',        label: 'Viñeta',          min: -1, max: 1, step: 0.01, def: 0 },
            { key: 'vignette_shape',  label: 'Forma viñeta',    min: 0,  max: 1, step: 0.01, def: 0 },
        ]
    },
];

export function buildControls(container, defaultParams, onParamChange) {
    const inputMap = {};

    container.innerHTML = '';

    GROUPS.forEach(group => {
        const details = document.createElement('details');
        details.open = group.open;

        const summary = document.createElement('summary');
        summary.textContent = group.name;
        details.appendChild(summary);

        const content = document.createElement('div');
        content.className = 'ctrl-group-body';

        group.params.forEach(param => {
            const row = document.createElement('div');
            row.className = 'ctrl-row';

            if (param.type === 'color') {
                const lbl = document.createElement('label');
                lbl.className = 'ctrl-label';
                lbl.textContent = param.label;

                const swatch = document.createElement('div');
                swatch.className = 'color-swatch';

                const picker = document.createElement('input');
                picker.type = 'color';
                picker.className = 'color-picker';
                picker.value = param.def;

                swatch.appendChild(picker);
                swatch.style.background = param.def;

                picker.addEventListener('input', () => {
                    swatch.style.background = picker.value;
                    const vec = hexToVec3(picker.value);
                    onParamChange(param.key, vec);

                    // Auto-activate strength if color is picked and strength is 0
                    if (param.key === 'shadow_tint') {
                        const str = inputMap['shadow_strength'];
                        if (str && parseFloat(str.el.value) === 0) {
                            str.el.value = 0.35;
                            str.el.dispatchEvent(new Event('input'));
                        }
                    } else if (param.key === 'highlight_tint') {
                        const str = inputMap['highlight_strength'];
                        if (str && parseFloat(str.el.value) === 0) {
                            str.el.value = 0.35;
                            str.el.dispatchEvent(new Event('input'));
                        }
                    }
                });

                row.appendChild(lbl);
                row.appendChild(swatch);

                inputMap[param.key] = { el: picker, type: 'color' };

            } else {
                const header = document.createElement('div');
                header.className = 'ctrl-header';

                const lbl = document.createElement('span');
                lbl.className = 'ctrl-label';
                lbl.textContent = param.label;

                const valDisplay = document.createElement('span');
                valDisplay.className = 'ctrl-value';
                valDisplay.textContent = fmtVal(param.def) + (param.unit ? ' ' + param.unit : '');

                header.appendChild(lbl);
                header.appendChild(valDisplay);

                const slider = document.createElement('input');
                slider.type  = 'range';
                slider.min   = param.min;
                slider.max   = param.max;
                slider.step  = param.step;
                slider.value = param.def;
                slider.className = 'ctrl-slider';

                slider.addEventListener('input', () => {
                    const v = parseFloat(slider.value);
                    valDisplay.textContent = fmtVal(v) + (param.unit ? ' ' + param.unit : '');
                    const pct = (v - param.min) / (param.max - param.min) * 100;
                    slider.style.setProperty('--pct', pct + '%');
                    onParamChange(param.key, v);

                    // If moving vignette_shape while vignette is 0, bump vignette to 0.50 so effect is immediately visible
                    if (param.key === 'vignette_shape') {
                        const vig = inputMap['vignette'];
                        if (vig && parseFloat(vig.el.value) === 0) {
                            vig.el.value = 0.50;
                            vig.el.dispatchEvent(new Event('input'));
                        }
                    }
                });

                // Double-click to reset
                slider.addEventListener('dblclick', () => {
                    slider.value = param.def;
                    slider.dispatchEvent(new Event('input'));
                });

                const initPct = (param.def - param.min) / (param.max - param.min) * 100;
                slider.style.setProperty('--pct', initPct + '%');

                row.appendChild(header);
                row.appendChild(slider);

                inputMap[param.key] = { el: slider, type: 'slider', param };
            }

            content.appendChild(row);
        });

        details.appendChild(content);
        container.appendChild(details);
    });

    function loadParams(params) {
        Object.entries(params).forEach(([key, value]) => {
            const entry = inputMap[key];
            if (!entry) return;

            if (entry.type === 'color') {
                const hex = Array.isArray(value) ? vec3ToHex(value) : value;
                entry.el.value = hex;
                entry.el.closest('.ctrl-row').querySelector('.color-swatch').style.background = hex;

            } else {
                entry.el.value = value;
                const p = entry.param;
                const pct = (value - p.min) / (p.max - p.min) * 100;
                entry.el.style.setProperty('--pct', pct + '%');
                const display = entry.el.closest('.ctrl-row').querySelector('.ctrl-value');
                if (display) display.textContent = fmtVal(value) + (p.unit ? ' ' + p.unit : '');
            }
        });
    }

    return { loadParams };
}