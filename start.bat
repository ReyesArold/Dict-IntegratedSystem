@echo off
cd /d "%~dp0"
start "" /B npm run pm2:start
start "" /B npm run dev
echo DICT Abra backend and frontend started in the background.
echo Backend:  http://192.168.1.235:5000
echo Frontend: http://192.168.1.235:5173
pause
