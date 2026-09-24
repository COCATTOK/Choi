# Zhuge Liang Sangsomun - uninstaller (Windows)
Unregister-ScheduledTask -TaskName 'ZhugeLiang-Sangsomun' -Confirm:$false -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) 'ZhugeLiang-Sangsomun.cmd') -ErrorAction SilentlyContinue
Write-Host '[OK] Sangsomun schedule removed. (Files in this folder were kept.)'
