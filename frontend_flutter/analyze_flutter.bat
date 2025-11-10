@echo off
echo ========================================
echo Flutter Project Analysis
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Getting dependencies...
flutter pub get
echo.

echo [2/2] Analyzing code for errors...
flutter analyze
echo.

echo Analysis complete!
pause
