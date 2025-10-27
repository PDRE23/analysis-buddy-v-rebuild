@echo off
echo.
echo ========================================
echo Starting Analysis Buddy V2 Dev Server
echo ========================================
echo.

cd /d "%~dp0"

echo Current directory: %CD%
echo.

if not exist package.json (
    echo ERROR: package.json not found!
    echo You are in the wrong directory.
    echo.
    pause
    exit /b 1
)

echo Found package.json - starting dev server...
echo.
echo The server will start at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

npm run dev

pause

