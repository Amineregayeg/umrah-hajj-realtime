# Testing Guide - Flutter App in VS Code

## Prerequisites

✅ Flutter SDK installed
✅ VS Code with Flutter extension
✅ Android emulator OR Chrome browser

## Quick Start

### 1. Open Project in VS Code

```bash
code C:\Users\ASUS\test_code\frontend_flutter
```

### 2. Install Dependencies

Open terminal in VS Code (Ctrl+`):

```bash
flutter pub get
```

### 3. Configure Supabase Credentials

**IMPORTANT:** Before running, you need to add your Supabase credentials.

Edit `.vscode/launch.json` and replace:
- `YOUR_SUPABASE_URL_HERE` with your actual Supabase project URL
- `YOUR_SUPABASE_ANON_KEY_HERE` with your actual Supabase anon key

**Where to find these:**
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Click on your project
3. Go to Settings → API
4. Copy the URL and anon key

### 4. Start a Device

**Option A: Chrome (Easiest for testing)**
- Chrome will be auto-detected, no setup needed

**Option B: Android Emulator**
- Open Android Studio → Tools → Device Manager
- Start an emulator (e.g., Pixel 5)

**Option C: Physical Device**
- Connect via USB with USB debugging enabled

### 5. Select Device in VS Code

Look at the **bottom-right corner** of VS Code:
- Click on the device selector
- Choose your device (Chrome, emulator, or phone)

### 6. Run the App

**Method 1:** Press `F5` (recommended - with debugging)

**Method 2:** Press `Ctrl+F5` (without debugging)

**Method 3:** Click the play button (▶) in top-right corner

**Method 4:**
- Press `Ctrl+Shift+P`
- Type "Flutter: Run"
- Press Enter

### 7. Choose Run Configuration

When you press F5, you'll see:
- **Flutter: Run (Development)** - Default device
- **Flutter: Run (Chrome)** - Forces Chrome
- **Flutter: Run (Profile Mode)** - Performance testing

Select the one you want.

## What Should Happen

1. **First time:** Build process (may take 2-5 minutes)
2. **Subsequent runs:** Much faster (10-30 seconds)
3. **App opens** showing the login screen

## Testing Authentication

The app will start on the **Login Screen**. You can:

1. **Sign Up:**
   - Click "Sign Up"
   - Enter full name, email, password
   - Accept terms
   - Click "Create Account"

2. **Sign In:**
   - Enter registered email and password
   - Click "Sign In"

3. **After login:**
   - You'll be redirected to the Home screen (placeholder)

## Hot Reload (Fast Development)

While the app is running:
- Press `r` in terminal = Hot reload (instant UI updates)
- Press `R` in terminal = Hot restart (full restart)
- Press `q` = Quit

Or just save any Dart file (`Ctrl+S`) and it will auto hot-reload!

## Troubleshooting

### "No devices found"
```bash
flutter devices
```
If Chrome shows but emulator doesn't, start the emulator first.

### "Gradle build failed" (Android)
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter run
```

### "CocoaPods error" (iOS/macOS)
```bash
cd ios
pod install
cd ..
flutter run
```

### "Supabase initialization failed"
- Make sure you updated the Supabase credentials in `.vscode/launch.json`
- Check if the URL and key are correct

### "Package not found"
```bash
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

## VS Code Shortcuts

| Shortcut | Action |
|----------|--------|
| `F5` | Run with debugging |
| `Ctrl+F5` | Run without debugging |
| `Shift+F5` | Stop debugging |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+`` ` | Toggle terminal |
| Save file | Auto hot-reload |

## Viewing Logs

While running, check the **Debug Console** tab in VS Code to see:
- App logs
- Error messages
- Network requests
- Auth state changes

## Next Steps

After testing auth screens, tell me and I can:
1. Continue implementing Phase D.5 (Home, Qibla, Quran screens)
2. Fix any bugs you find
3. Add more features

## Current Features Implemented

✅ Authentication (login, signup, auto-login)
✅ Route guards (protected routes)
✅ Token storage (secure)
✅ Form validation
✅ Error handling
✅ Loading states
✅ Material 3 theming

🚧 Coming Next: Main app screens (Phase D.5)
