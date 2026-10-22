@echo off
setlocal
title OpenQuiz Backend
pushd "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 24 LTS first.
  pause
  exit /b 1
)
echo Starting API at http://127.0.0.1:4000/api/v1
node --use-env-proxy --watch server/index.mjs
if errorlevel 1 pause
popd
endlocal
