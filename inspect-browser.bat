@echo off
setlocal
set "QUIZ_CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%QUIZ_CHROME%" set "QUIZ_CHROME=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%QUIZ_CHROME%" (
  echo Chrome or Edge was not found.
  pause
  exit /b 1
)
echo Sign in to OpenQuiz in this browser, then tell Codex that you are ready.
echo This separate browser profile is only for inspecting OpenQuiz.
start "" "%QUIZ_CHROME%" --no-first-run --no-default-browser-check --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --user-data-dir="%~dp0.rea-browser-profile" --new-window https://openquiz.ai/
endlocal
