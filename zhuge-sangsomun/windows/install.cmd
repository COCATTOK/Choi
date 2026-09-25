@echo off
rem Zhuge Liang Sangsomun - installer (Windows)
rem Registers two Task Scheduler entries: every day 07:00, and at logon.
setlocal
set "RUN=%~dp0run.cmd"

schtasks /create /tn "ZhugeLiang-Sangsomun" /tr "\"%RUN%\"" /sc daily /st 07:00 /f
if errorlevel 1 goto fail

schtasks /create /tn "ZhugeLiang-Sangsomun-Logon" /tr "\"%RUN%\"" /sc onlogon /f >nul 2>nul
if errorlevel 1 goto startup
goto done

:startup
rem Logon tasks need admin on some PCs: use the Startup folder instead.
> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ZhugeLiang-Sangsomun.cmd" echo @call "%RUN%"

:done
echo.
echo [OK] Installed: every day 07:00 + every logon.
echo Zhuge Liang is writing your first sangsomun. The window opens by itself in a few minutes.
call "%RUN%"
pause
exit /b

:fail
echo.
echo [FAILED] Could not register the daily task. Please send a screenshot of this window.
pause
