# RK FilmLab - Setup & Build Script
# Run this from: C:\Users\Fede\.gemini\antigravity\scratch\rk-filmlab\

Write-Host "=== RK FilmLab Setup ===" -ForegroundColor Cyan

# Check for node in common locations
 = @(
    "C:\Program Files\nodejs\npm.cmd",
    "C:\Users\Fede\AppData\Local\nvm\current\npm.cmd",
    "C:\Program Files\nvm\current\npm.cmd"
)
 = 
foreach ( in ) { if (Test-Path ) {  = ; break } }

# Refresh PATH
C:/Users/Fede/.gemini/antigravity/bin;C:\Users\Fede\AppData\Roaming\Antigravity\bin;C:\WINDOWS\system32;C:\WINDOWS;C:\WINDOWS\System32\Wbem;C:\WINDOWS\System32\WindowsPowerShell\v1.0\;C:\WINDOWS\System32\OpenSSH\;C:\Program Files (x86)\NVIDIA Corporation\PhysX\Common;C:\Users\Fede\AppData\Local\Microsoft\WindowsApps;C:\Users\Fede\AppData\Local\Python\bin += ";C:\Program Files\nodejs;C:\Users\Fede\AppData\Roaming\npm"
try {  = & npm --version 2>;  = "npm" } catch {}

if (-not ) {
    Write-Host ""
    Write-Host "Node.js no encontrado." -ForegroundColor Yellow
    Write-Host "Instalar con: winget install OpenJS.NodeJS.LTS" -ForegroundColor White
    Write-Host "Luego cerrá y re-abrí la terminal, y corré este script de nuevo." -ForegroundColor White
    exit 1
}

Write-Host "Node.js encontrado: " -ForegroundColor Green
Write-Host "Instalando dependencias..." -ForegroundColor Cyan
& npm install
Write-Host "Construyendo..." -ForegroundColor Cyan
& npm run build
Write-Host ""
Write-Host "Build completo! Carpeta: dist/" -ForegroundColor Green
Write-Host "Para ver localmente: npm run preview" -ForegroundColor White
Write-Host "Para Netlify: subir la carpeta dist/ o conectar el repo" -ForegroundColor White
