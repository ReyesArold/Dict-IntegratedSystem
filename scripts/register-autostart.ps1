# Registers the Windows Scheduled Task that starts DICT Abra automatically on boot.
# Run ONCE as Administrator: powershell -ExecutionPolicy Bypass -File scripts\register-autostart.ps1

$projectRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $projectRoot "scripts\start-background.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false
$settings.AddExecutionEntryCondition($false)

Register-ScheduledTask -TaskName "DICTAbraAutoStart" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force

Write-Host "Scheduled task 'DICTAbraAutoStart' registered. DICT Abra will start automatically on boot."
Write-Host "PM2 must be installed globally (npm install -g pm2) and the backend started via PM2 for persistent background execution."
