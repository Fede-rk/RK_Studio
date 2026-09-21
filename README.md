# RK FilmLab

Simulador de grano de película y revelado analógico — 100% web, sin servidor.

## Para correr localmente

**Requisito:** Node.js (https://nodejs.org, descargar la versión LTS)

`powershell
# Desde la carpeta del proyecto:
npm install
npm run dev
# Abre http://localhost:5173
`

## Para hacer build y subir a Netlify

`powershell
npm run build
# La carpeta dist/ contiene la app lista para publicar
`

### Deploy en Netlify
1. Registrarse en netlify.com
2. "Add new site" → "Import an existing project"
3. Conectar con GitHub (subir la carpeta a un repositorio)
4. Build command: 
pm run build, Publish dir: dist

---

## Funcionalidades

- Carga JPG, PNG, WebP y archivos RAW (CR2, NEF, ARW, DNG, ORF...)
- 12 presets de film: Tri-X, Portra 400, Cinestill 800T, Kodachrome, y más
- 20+ parámetros: exposición, contraste, sombras, luces, negros, blancos, fade, temperatura, tinte, saturación, vibrance, claridad, blur, grano, viñeta, split tone con color pickers
- Vista previa en tiempo real via WebGL (GPU)
- Hold para comparar con original
- Exportar JPG optimizado para Instagram:
  - Portrait 4:5 (1080×1350)
  - Cuadrado 1:1 (1080×1080)
  - Stories/Reels 9:16 (1080×1920)
  - Cinemático 1.91:1 (1080×566)

