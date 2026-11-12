# Starts the DICT Abra backend and frontend in hidden background windows.
# Run from the project root: powershell -ExecutionPolicy Bypass -File scripts\start-background.ps1

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Backend (Express + SQLite) via PM2 on 192.168.1.235:5000
Start-Process -FilePath "npm" -ArgumentList "run","pm2:start" -WorkingDirectory $projectRoot -WindowStyle Hidden

Start-Sleep -Seconds 12

# Frontend (Vite) on 192.168.1.235:5173
Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $projectRoot -WindowStyle Hidden

Write-Host "DICT Abra backend and frontend started in the background."
Write-Host "Backend:  http://192.168.1.235:5000"
Write-Host "Frontend: http://192.168.1.235:5173"
