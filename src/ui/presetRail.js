// src/ui/presetRail.js
export function buildPresetRail(container, presets, onSelect) {
    container.innerHTML = '';
    let active = null;

    presets.forEach((preset) => {
        const btn = document.createElement('button');
        btn.className = 'preset-card';
        btn.setAttribute('title', preset.name);
        btn.style.background = preset.gradient;

        const label = document.createElement('span');
        label.className = 'preset-label';
        label.textContent = preset.name;

        btn.appendChild(label);

        btn.addEventListener('click', () => {
            if (active) active.classList.remove('active');
            btn.classList.add('active');
            active = btn;
            onSelect(preset);
        });

        container.appendChild(btn);
    });
}
