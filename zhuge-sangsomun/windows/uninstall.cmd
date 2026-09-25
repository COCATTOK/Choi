@echo off
schtasks /delete /tn "ZhugeLiang-Sangsomun" /f >nul 2>nul
schtasks /delete /tn "ZhugeLiang-Sangsomun-Logon" /f >nul 2>nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ZhugeLiang-Sangsomun.cmd" >nul 2>nul
echo [OK] Sangsomun schedule removed. (Files in this folder were kept.)
pause
