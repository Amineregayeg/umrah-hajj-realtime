# Troubleshooting Guide

## Quick Fix Steps

If you're seeing errors, try these steps in order:

### 1. Clean and Get Dependencies
```bash
cd frontend_flutter
flutter clean
flutter pub get
```

### 2. Check Flutter Version
```bash
flutter --version
```
Make sure you're using Flutter 3.24.x or higher.

### 3. Common Error Fixes

#### Error: "Package not found" or "Import errors"
```bash
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

#### Error: "dart:ui" or SDK errors
Update your Flutter SDK:
```bash
flutter upgrade
flutter pub get
```

#### Error: Missing font assets
The Inter fonts are commented out in pubspec.yaml (on purpose).
This is normal and should not cause errors.

#### Error: Supabase initialization
Make sure you've set environment variables in `.vscode/launch.json`:
- SUPABASE_URL
- SUPABASE_ANON_KEY

If you don't have Supabase, you can comment out the Supabase initialization in `lib/main.dart`:
```dart
// await Supabase.initialize(...);
```

### 4. Run the App
```bash
flutter run -d chrome
```

Or press F5 in VS Code.

## Share Errors

If none of the above work, please share the **exact error messages** you're seeing:

1. Open Terminal in VS Code (Ctrl+`)
2. Copy the error text
3. Paste it here

I can then fix the specific issue!

## Known Issues

1. **Compass/Sensors**: Not implemented yet (placeholders)
2. **Backend API**: Not connected yet (using sample data)
3. **AR View**: Not implemented yet (shows "coming soon")
4. **Supabase**: Requires configuration (can run without it)

## Current Status

✅ Working:
- Home screen navigation
- Qibla compass UI (no real compass data)
- Quran list with search
- Prayer times with calendar
- Login/Signup screens
- All navigation between screens

❌ Not Yet Connected:
- Real compass sensor data
- Backend API calls
- Supabase authentication (auth is disabled for testing)
- Push notifications
- AR features
