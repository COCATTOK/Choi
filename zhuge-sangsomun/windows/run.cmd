@echo off
rem Zhuge Liang Sangsomun - daily runner (Windows)
rem Once a day asks Claude Code to write a new sangsomun, then opens the window when it is ready.
setlocal
if "%~1"=="min" goto main
start "Sangsomun" /min cmd /c ""%~f0" min"
exit /b

:main
cd /d "%~dp0.."
if not exist "data" mkdir "data"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "TODAY=%%i"

set "LAST="
if exist "data\last-generated.txt" set /p LAST=<"data\last-generated.txt"
if "%LAST%"=="%TODAY%" goto openonly

if exist "%USERPROFILE%\.local\bin\claude.exe" set "PATH=%USERPROFILE%\.local\bin;%PATH%"
where claude >nul 2>nul
if errorlevel 1 goto noclaude

call :status writing ""
(type "prompt.md" & echo. & echo TODAY: %TODAY%) > "data\prompt-full.txt"
call claude -p --allowedTools "Read,Write" --add-dir "%USERPROFILE%\.claude" < "data\prompt-full.txt" > "data\claude-log.txt" 2>&1
findstr /c:"%TODAY%" "data\today.js" >nul 2>nul
if errorlevel 1 goto failed
>"data\last-generated.txt" echo %TODAY%
call :status done ""
goto openonly

:failed
call :status failed bad-output
goto openonly

:noclaude
call :status failed claude-not-found
goto openonly

:openonly
call :openwindow
exit /b

:status
>"data\status.js" echo window.SANGSOMUN_STATUS = {state:'%~1', date:'%TODAY%', reason:'%~2'};
exit /b

:openwindow
set "URL=file:///%CD:\=/%/sangsomun.html"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" goto plainopen
start "" "%EDGE%" --app="%URL%" --window-size=1180,900
exit /b
:plainopen
start "" "%CD%\sangsomun.html"
exit /b
