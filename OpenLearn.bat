@echo off
title OpenLearn - Management Console
color 0B
cd /d "%~dp0"

echo ================================================================
echo                     OPENLEARN PLATFORM
echo ================================================================
echo [*] Dang khoi dong OpenLearn (Backend: 4000, Frontend: 3000)...
echo [*] Trinh duyet se tu dong mo tai: http://127.0.0.1:3000
echo.
echo   [!] HUONG DAN KHI DUNG XONG:
echo       Hay dong cua so [X] nay (hoac bam Ctrl+C) de TAT va GIAI PHONG RAM!
echo ================================================================
echo.

call npm run dev:all
if errorlevel 1 (
    echo.
    echo [ERROR] OpenLearn gap su co khi khoi chay.
    pause
)

