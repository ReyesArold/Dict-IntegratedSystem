@echo off
cd /d "C:\Users\pcuser\dict-abra-app"
pm2 start ecosystem.config.cjs
pm2 save