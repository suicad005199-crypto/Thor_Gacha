@echo off
setlocal
cd /d "%~dp0"
set "PORT=56383"
set "PAGE=king-hit-performance-slot-roll-no-box-big-adjust.html"
set "URL=http://127.0.0.1:%PORT%/%PAGE%?rev=%RANDOM%%RANDOM%"

where py >nul 2>nul
if %errorlevel%==0 (
  start "Gotcha Preview Server" /min py -3 -m http.server %PORT%
) else (
  start "Gotcha Preview Server" /min python -m http.server %PORT%
)

timeout /t 1 /nobreak >nul
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%URL%"
) else (
  start "" "%URL%"
)
