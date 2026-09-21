// src/data/presets.js
export const DEFAULT_PARAMS = {
    exposure: 0, contrast: 0, shadows: 0, highlights: 0,
    blacks: 0, whites: 0, fade: 0,
    temp: 0, tint: 0, saturation: 0, vibrance: 0,
    shadow_tint: [0.553, 0.627, 0.702],
    shadow_strength: 0,
    highlight_tint: [0.957, 0.831, 0.620],
    highlight_strength: 0,
    clarity: 0, blur: 0,
    grain_amount: 0, grain_size: 0.5, grain_roughness: 0.5,
    vignette: 0, vignette_shape: 0,
};

export const PRESETS = [
    {
        name: 'Tri-X Push',
        gradient: 'linear-gradient(160deg,#0a0a0a 0%,#3a3a3a 60%,#111 100%)',
        params: {
            exposure: 0.25, contrast: 0.78, shadows: -0.42, highlights: -0.1,
            blacks: -0.35, whites: 0.1, fade: 0,
            temp: 0, tint: 0, saturation: -1, vibrance: 0,
            shadow_tint: [0.1,0.1,0.1], shadow_strength: 0,
            highlight_tint: [1,1,1], highlight_strength: 0,
            clarity: 0.38, blur: 0,
            grain_amount: 0.75, grain_size: 0.62, grain_roughness: 0.72,
            vignette: 0.52, vignette_shape: 0.18,
        }
    },
    {
        name: 'Portra 400',
        gradient: 'linear-gradient(160deg,#c9956b 0%,#8b6352 55%,#d4a87c 100%)',
        params: {
            exposure: 0.1, contrast: 0.12, shadows: 0.12, highlights: -0.06,
            blacks: 0.02, whites: 0, fade: 0.12,
            temp: 0.22, tint: -0.04, saturation: -0.08, vibrance: 0.18,
            shadow_tint: [0.6,0.42,0.3], shadow_strength: 0.22,
            highlight_tint: [0.97,0.88,0.68], highlight_strength: 0.18,
            clarity: 0, blur: 0,
            grain_amount: 0.2, grain_size: 0.28, grain_roughness: 0.3,
            vignette: 0.12, vignette_shape: 0,
        }
    },
    {
        name: 'Cinestill 800T',
        gradient: 'linear-gradient(160deg,#1a3a5c 0%,#0d2438 55%,#d4600a 100%)',
        params: {
            exposure: 0.15, contrast: 0.22, shadows: -0.08, highlights: 0.06,
            blacks: -0.1, whites: 0, fade: 0,
            temp: -0.12, tint: 0, saturation: 0.05, vibrance: 0.1,
            shadow_tint: [0.1,0.22,0.38], shadow_strength: 0.52,
            highlight_tint: [0.96,0.62,0.12], highlight_strength: 0.42,
            clarity: 0.08, blur: 0,
            grain_amount: 0.38, grain_size: 0.52, grain_roughness: 0.45,
            vignette: 0.22, vignette_shape: 0,
        }
    },
    {
        name: 'Kodachrome 64',
        gradient: 'linear-gradient(160deg,#c8321e 0%,#d4871a 50%,#3a6e30 100%)',
        params: {
            exposure: 0.05, contrast: 0.42, shadows: -0.2, highlights: -0.04,
            blacks: -0.12, whites: 0.08, fade: 0,
            temp: 0.16, tint: -0.05, saturation: 0.28, vibrance: 0.12,
            shadow_tint: [0.5,0.18,0.08], shadow_strength: 0.18,
            highlight_tint: [1.0,0.82,0.18], highlight_strength: 0.22,
            clarity: 0.22, blur: 0,
            grain_amount: 0.1, grain_size: 0.2, grain_roughness: 0.25,
            vignette: 0.08, vignette_shape: 0,
        }
    },
    {
        name: 'Ilford HP5',
        gradient: 'linear-gradient(160deg,#1a1a1a 0%,#5a5a5a 55%,#2a2a2a 100%)',
        params: {
            exposure: 0, contrast: 0.3, shadows: -0.15, highlights: 0.05,
            blacks: -0.08, whites: 0.05, fade: 0,
            temp: 0, tint: 0, saturation: -1, vibrance: 0,
            shadow_tint: [0.1,0.1,0.1], shadow_strength: 0,
            highlight_tint: [1,1,1], highlight_strength: 0,
            clarity: 0.15, blur: 0,
            grain_amount: 0.35, grain_size: 0.42, grain_roughness: 0.38,
            vignette: 0.08, vignette_shape: 0,
        }
    },
    {
        name: 'Lomo LC-A',
        gradient: 'linear-gradient(160deg,#1a0a3a 0%,#3a1a10 50%,#0a2a1a 100%)',
        params: {
            exposure: -0.1, contrast: 0.32, shadows: -0.15, highlights: 0.05,
            blacks: -0.1, whites: 0, fade: 0.06,
            temp: -0.1, tint: 0.05, saturation: 0.3, vibrance: 0.1,
            shadow_tint: [0.08,0.2,0.52], shadow_strength: 0.32,
            highlight_tint: [1.0,0.72,0.2], highlight_strength: 0.28,
            clarity: 0.05, blur: 0,
            grain_amount: 0.32, grain_size: 0.45, grain_roughness: 0.52,
            vignette: 0.82, vignette_shape: 0.15,
        }
    },
    {
        name: 'Zine',
        gradient: 'linear-gradient(160deg,#050505 0%,#222 50%,#080808 100%)',
        params: {
            exposure: 0.1, contrast: 0.88, shadows: -0.72, highlights: -0.1,
            blacks: -0.42, whites: 0.15, fade: 0,
            temp: 0, tint: 0, saturation: -0.55, vibrance: 0,
            shadow_tint: [0.08,0.08,0.08], shadow_strength: 0,
            highlight_tint: [1,1,1], highlight_strength: 0,
            clarity: 0.45, blur: 0,
            grain_amount: 1.0, grain_size: 0.78, grain_roughness: 0.88,
            vignette: 0.62, vignette_shape: 0.3,
        }
    },
    {
        name: 'Hypebeast',
        gradient: 'linear-gradient(160deg,#0a1520 0%,#182535 55%,#0d1e2e 100%)',
        params: {
            exposure: 0.05, contrast: 0.25, shadows: -0.05, highlights: -0.05,
            blacks: -0.08, whites: 0, fade: 0.04,
            temp: -0.22, tint: 0.04, saturation: -0.12, vibrance: 0.05,
            shadow_tint: [0.0,0.28,0.48], shadow_strength: 0.35,
            highlight_tint: [0.85,0.92,1.0], highlight_strength: 0.12,
            clarity: 0.42, blur: 0,
            grain_amount: 0.15, grain_size: 0.3, grain_roughness: 0.35,
            vignette: 0.18, vignette_shape: 0,
        }
    },
    {
        name: 'Golden Hour',
        gradient: 'linear-gradient(160deg,#d4870a 0%,#c06010 50%,#e8b030 100%)',
        params: {
            exposure: 0.12, contrast: 0.08, shadows: 0.18, highlights: 0.08,
            blacks: 0.05, whites: 0.05, fade: 0.06,
            temp: 0.42, tint: -0.06, saturation: 0.08, vibrance: 0.32,
            shadow_tint: [0.75,0.45,0.15], shadow_strength: 0.28,
            highlight_tint: [1.0,0.92,0.5], highlight_strength: 0.42,
            clarity: 0, blur: 0,
            grain_amount: 0.12, grain_size: 0.25, grain_roughness: 0.28,
            vignette: 0.08, vignette_shape: 0,
        }
    },
    {
        name: 'Brutalist',
        gradient: 'linear-gradient(160deg,#000 0%,#111 50%,#000 100%)',
        params: {
            exposure: 0.08, contrast: 1.0, shadows: -0.82, highlights: -0.08,
            blacks: -0.52, whites: 0.22, fade: 0,
            temp: 0, tint: 0, saturation: -1, vibrance: 0,
            shadow_tint: [0,0,0], shadow_strength: 0,
            highlight_tint: [1,1,1], highlight_strength: 0,
            clarity: 0.52, blur: 0,
            grain_amount: 0.08, grain_size: 0.2, grain_roughness: 0.3,
            vignette: 0.15, vignette_shape: 0.4,
        }
    },
    {
        name: 'Fashion Week',
        gradient: 'linear-gradient(160deg,#0a1228 0%,#1a2540 55%,#0c1830 100%)',
        params: {
            exposure: -0.05, contrast: 0.32, shadows: -0.08, highlights: -0.06,
            blacks: -0.12, whites: -0.04, fade: 0.06,
            temp: -0.32, tint: 0.05, saturation: -0.3, vibrance: -0.08,
            shadow_tint: [0.18,0.22,0.55], shadow_strength: 0.42,
            highlight_tint: [0.82,0.88,1.0], highlight_strength: 0.15,
            clarity: 0.2, blur: 0,
            grain_amount: 0.18, grain_size: 0.28, grain_roughness: 0.32,
            vignette: 0.25, vignette_shape: 0,
        }
    },
    {
        name: 'Dirty Darkroom',
        gradient: 'linear-gradient(160deg,#0d0805 0%,#1e1408 55%,#100a04 100%)',
        params: {
            exposure: -0.3, contrast: 0.52, shadows: -0.32, highlights: -0.1,
            blacks: -0.18, whites: 0, fade: 0.16,
            temp: 0.12, tint: 0.03, saturation: -0.15, vibrance: -0.05,
            shadow_tint: [0.35,0.22,0.08], shadow_strength: 0.25,
            highlight_tint: [0.95,0.85,0.65], highlight_strength: 0.08,
            clarity: 0.12, blur: 0,
            grain_amount: 0.62, grain_size: 0.72, grain_roughness: 0.82,
            vignette: 0.72, vignette_shape: 0.2,
        }
    },
];
