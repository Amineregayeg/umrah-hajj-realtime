@echo off
echo ========================================
echo Flutter Project Setup and Run
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Cleaning Flutter project...
flutter clean
echo.

echo [2/4] Getting dependencies...
flutter pub get
echo.

echo [3/4] Running build_runner (code generation)...
flutter pub run build_runner build --delete-conflicting-outputs
echo.

echo [4/4] Starting Flutter app...
echo Press Ctrl+C to stop the app
echo.
flutter run -d chrome
