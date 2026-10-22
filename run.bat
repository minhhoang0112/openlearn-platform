@echo off
setlocal
title OpenQuiz - Local Development
pushd "%~dp0"
if errorlevel 1 goto :failed
 
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found. Install Node.js LTS and try again.
    goto :failed
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm was not found. Reinstall Node.js LTS and try again.
    goto :failed
)

node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major<24||(major===24&&minor<15)?1:0)"
if errorlevel 1 (
    echo [ERROR] Node.js 24.15 or newer is required for the SQLite backend.
    goto :failed
)

if not exist "node_modules\vite\bin\vite.js" (
    echo Installing project dependencies...
    if exist "package-lock.json" (
        call npm ci
    ) else (
        call npm install
    )
    if errorlevel 1 goto :failed
)

echo Starting frontend at http://127.0.0.1:3000 and backend on port 4000
echo Keep this window open. Press Ctrl+C to stop the server.
echo.
call npm run dev:all
if errorlevel 1 goto :failed

popd
endlocal
exit /b 0

:failed
echo.
echo [ERROR] OpenQuiz could not start. Check the message above.
pause
popd
