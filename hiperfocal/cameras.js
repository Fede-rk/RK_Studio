// hiperfocal/cameras.js
// Base de datos de sensores y cámaras dedicadas para RK Hiperfocal

export const SENSOR_TYPES = {
  'full_frame': {
    id: 'full_frame',
    name: 'Full Frame (35mm)',
    label: 'Full Frame (36×24mm)',
    crop: 1.0,
    coc: 0.030,
    coc_strict: 0.020,
    desc: 'Sony A7/A9/A1, Canon R5/R6/5D, Nikon Z5/Z6/Z8/D850, Leica M/SL, Lumix S'
  },
  'apsc_sony_fuji_nikon': {
    id: 'apsc_sony_fuji_nikon',
    name: 'APS-C (Sony / Fuji / Nikon / Pentax)',
    label: 'APS-C 1.5× (Sony, Fuji, Nikon, Ricoh)',
    crop: 1.5,
    coc: 0.020,
    coc_strict: 0.013,
    desc: 'Sony A6000-A6700/ZV-E10, Fujifilm Serie X, Nikon Z50/Zfc/D7500, Ricoh GR III'
  },
  'apsc_canon': {
    id: 'apsc_canon',
    name: 'APS-C Canon (1.6×)',
    label: 'APS-C Canon 1.6×',
    crop: 1.6,
    coc: 0.019,
    coc_strict: 0.012,
    desc: 'Canon EOS R7/R10/R50/R100, Canon Rebel T7/T8i/SL3, Canon 7D/80D/90D'
  },
  'mft': {
    id: 'mft',
    name: 'Micro Cuatro Tercios (MFT)',
    label: 'Micro 4/3 2.0× (Olympus / OM, Lumix)',
    crop: 2.0,
    coc: 0.015,
    coc_strict: 0.010,
    desc: 'OM System OM-1/OM-5, Olympus E-M1/E-M5/E-M10, Panasonic Lumix GH5/GH6/G9'
  },
  'medium_format': {
    id: 'medium_format',
    name: 'Formato Medio (44×33mm)',
    label: 'Formato Medio 0.79×',
    crop: 0.79,
    coc: 0.033,
    coc_strict: 0.022,
    desc: 'Fujifilm GFX 100/50, Hasselblad X1D/X2D'
  },
  'one_inch': {
    id: 'one_inch',
    name: '1 Pulgada / Compacta Avanzada',
    label: '1 Pulgada 2.7× (Compactas)',
    crop: 2.7,
    coc: 0.011,
    coc_strict: 0.007,
    desc: 'Sony RX100 series, Lumix LX15, Canon G7 X series'
  }
};

export const POPULAR_CAMERAS = [
  // --- SONY ---
  { brand: 'Sony', model: 'Alpha A7 IV', sensor: 'full_frame' },
  { brand: 'Sony', model: 'Alpha A7 III', sensor: 'full_frame' },
  { brand: 'Sony', model: 'Alpha A7R V', sensor: 'full_frame' },
  { brand: 'Sony', model: 'Alpha A7R IV / III', sensor: 'full_frame' },
  { brand: 'Sony', model: 'Alpha A7C II / A7C', sensor: 'full_frame' },
  { brand: 'Sony', model: 'Alpha A7S III', sensor: 'full_frame' },
  { brand: 'Sony', model: 'Alpha A1 / A9 III', sensor: 'full_frame' },
  { brand: 'Sony', model: 'FX3 / FX30', sensor: 'full_frame' },
  { brand: 'Sony', model: 'Alpha A6700', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Sony', model: 'Alpha A6400 / A6600', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Sony', model: 'Alpha A6000 / A6100', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Sony', model: 'ZV-E10 / ZV-E10 II', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Sony', model: 'Cyber-shot RX100 VII / VI', sensor: 'one_inch' },

  // --- CANON ---
  { brand: 'Canon', model: 'EOS R5 / R5 Mark II', sensor: 'full_frame' },
  { brand: 'Canon', model: 'EOS R6 / R6 Mark II', sensor: 'full_frame' },
  { brand: 'Canon', model: 'EOS R8 / R', sensor: 'full_frame' },
  { brand: 'Canon', model: 'EOS R3 / R1', sensor: 'full_frame' },
  { brand: 'Canon', model: 'EOS 5D Mark IV / III', sensor: 'full_frame' },
  { brand: 'Canon', model: 'EOS 6D Mark II / 6D', sensor: 'full_frame' },
  { brand: 'Canon', model: 'EOS R7', sensor: 'apsc_canon' },
  { brand: 'Canon', model: 'EOS R10 / R50 / R100', sensor: 'apsc_canon' },
  { brand: 'Canon', model: 'EOS 90D / 80D / 70D', sensor: 'apsc_canon' },
  { brand: 'Canon', model: 'EOS 7D Mark II', sensor: 'apsc_canon' },
  { brand: 'Canon', model: 'EOS Rebel T7 / 2000D', sensor: 'apsc_canon' },
  { brand: 'Canon', model: 'EOS Rebel T8i / 850D', sensor: 'apsc_canon' },
  { brand: 'Canon', model: 'EOS Rebel SL3 / 250D', sensor: 'apsc_canon' },
  { brand: 'Canon', model: 'PowerShot G7 X Mark III', sensor: 'one_inch' },

  // --- NIKON ---
  { brand: 'Nikon', model: 'Z8 / Z9', sensor: 'full_frame' },
  { brand: 'Nikon', model: 'Z6 III / Z6 II / Z6', sensor: 'full_frame' },
  { brand: 'Nikon', model: 'Z7 II / Z7', sensor: 'full_frame' },
  { brand: 'Nikon', model: 'Z5 / Zf', sensor: 'full_frame' },
  { brand: 'Nikon', model: 'D850 / D810', sensor: 'full_frame' },
  { brand: 'Nikon', model: 'D780 / D750', sensor: 'full_frame' },
  { brand: 'Nikon', model: 'D610 / D600', sensor: 'full_frame' },
  { brand: 'Nikon', model: 'Z50 / Z30 / Zfc', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Nikon', model: 'D7500 / D7200', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Nikon', model: 'D5600 / D5300', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Nikon', model: 'D3500 / D3400', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Nikon', model: 'D500', sensor: 'apsc_sony_fuji_nikon' },

  // --- FUJIFILM ---
  { brand: 'Fujifilm', model: 'X-T5 / X-T4 / X-T3', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Fujifilm', model: 'X-T30 II / X-T30 / X-T20', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Fujifilm', model: 'X-S20 / X-S10', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Fujifilm', model: 'X100VI / X100V / X100F', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Fujifilm', model: 'X-H2 / X-H2S / X-H1', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Fujifilm', model: 'X-Pro3 / X-Pro2 / X-E4', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Fujifilm', model: 'GFX 100 II / GFX 100S', sensor: 'medium_format' },
  { brand: 'Fujifilm', model: 'GFX 50S II / GFX 50R', sensor: 'medium_format' },

  // --- PANASONIC LUMIX ---
  { brand: 'Panasonic', model: 'Lumix S5 II / S5 IIX / S5', sensor: 'full_frame' },
  { brand: 'Panasonic', model: 'Lumix S1 / S1R / S1H', sensor: 'full_frame' },
  { brand: 'Panasonic', model: 'Lumix GH6 / GH7 / GH5 II', sensor: 'mft' },
  { brand: 'Panasonic', model: 'Lumix G9 II / G9', sensor: 'mft' },
  { brand: 'Panasonic', model: 'Lumix G85 / G95', sensor: 'mft' },
  { brand: 'Panasonic', model: 'Lumix GX9 / GX85', sensor: 'mft' },
  { brand: 'Panasonic', model: 'Lumix LX100 II', sensor: 'mft' },

  // --- OM SYSTEM / OLYMPUS ---
  { brand: 'OM System', model: 'OM-1 Mark II / OM-1', sensor: 'mft' },
  { brand: 'OM System', model: 'OM-5', sensor: 'mft' },
  { brand: 'Olympus', model: 'OM-D E-M1 Mark III / II', sensor: 'mft' },
  { brand: 'Olympus', model: 'OM-D E-M5 Mark III', sensor: 'mft' },
  { brand: 'Olympus', model: 'OM-D E-M10 Mark IV / III', sensor: 'mft' },
  { brand: 'Olympus', model: 'PEN E-P7 / E-PL10', sensor: 'mft' },

  // --- LEICA ---
  { brand: 'Leica', model: 'M11 / M11-P / M10', sensor: 'full_frame' },
  { brand: 'Leica', model: 'Q3 / Q2', sensor: 'full_frame' },
  { brand: 'Leica', model: 'SL3 / SL2 / SL2-S', sensor: 'full_frame' },
  { brand: 'Leica', model: 'D-Lux 7 / D-Lux 8', sensor: 'mft' },

  // --- RICOH / PENTAX ---
  { brand: 'Ricoh', model: 'GR III / GR IIIx', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Pentax', model: 'K-1 Mark II', sensor: 'full_frame' },
  { brand: 'Pentax', model: 'K-3 Mark III', sensor: 'apsc_sony_fuji_nikon' },
  { brand: 'Pentax', model: 'KF / K-70', sensor: 'apsc_sony_fuji_nikon' },

  // --- HASSELBLAD ---
  { brand: 'Hasselblad', model: 'X2D 100C / X1D II 50C', sensor: 'medium_format' },
  { brand: 'Hasselblad', model: '907X 50C / 100C', sensor: 'medium_format' }
];
