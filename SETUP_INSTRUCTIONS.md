# Flutter Frontend Setup Instructions

This document provides step-by-step instructions for setting up and running the Flutter frontend migration.

## Prerequisites Installation

### 1. Install Flutter SDK

**Windows:**
```powershell
# Download Flutter SDK from https://docs.flutter.dev/get-started/install/windows
# Extract to C:\flutter
# Add to PATH: C:\flutter\bin

# Verify installation
flutter doctor
```

**macOS:**
```bash
# Install via Homebrew
brew install --cask flutter

# Verify installation
flutter doctor
```

**Linux:**
```bash
# Download Flutter SDK
cd ~
wget https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.x-stable.tar.xz
tar xf flutter_linux_3.24.x-stable.tar.xz

# Add to PATH
export PATH="$PATH:`pwd`/flutter/bin"

# Verify installation
flutter doctor
```

### 2. Install Required Tools

**Android Studio** (for Android development):
1. Download from https://developer.android.com/studio
2. Install Android SDK
3. Install Android SDK Command-line Tools
4. Accept Android licenses: `flutter doctor --android-licenses`

**Xcode** (for iOS development, macOS only):
1. Install from Mac App Store
2. Install Xcode Command Line Tools: `xcode-select --install`
3. Accept license: `sudo xcodebuild -license`

**VS Code** (recommended editor):
1. Download from https://code.visualstudio.com/
2. Install Flutter extension
3. Install Dart extension

---

## Project Setup

### 1. Navigate to Flutter Project

```bash
cd frontend_flutter
```

### 2. Install Dependencies

```bash
flutter pub get
```

This will download all packages listed in `pubspec.yaml`.

### 3. Download Inter Font

The app uses the Inter font family. Download it:

1. Go to https://fonts.google.com/specimen/Inter
2. Download the font family
3. Extract the TTF files
4. Copy to `assets/fonts/Inter/`:
   - `Inter-Regular.ttf` (400 weight)
   - `Inter-Medium.ttf` (500 weight)
   - `Inter-SemiBold.ttf` (600 weight)
   - `Inter-Bold.ttf` (700 weight)
   - `Inter-Black.ttf` (900 weight)

**Or** use this command (requires `wget` or `curl`):
```bash
mkdir -p assets/fonts/Inter
cd assets/fonts/Inter

# Download Inter fonts (example URLs - verify current URLs)
wget https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.otf
wget https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Medium.otf
wget https://github.com/rsms/inter/raw/master/docs/font-files/Inter-SemiBold.otf
wget https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.otf
wget https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Black.otf

# Convert .otf to .ttf if needed (or update pubspec.yaml to use .otf)
```

### 4. Setup Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:
```env
API_BASE_URL=https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
WS_BASE_URL=wss://psychological-jilli-amineregayeg-1fe35444.koyeb.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ENVIRONMENT=development
```

**Note:** For local backend development, use:
```env
API_BASE_URL=http://localhost:3001
WS_BASE_URL=ws://localhost:3001
```

### 5. Generate Code (if applicable)

Once you add JSON serialization or Riverpod generators:
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

---

## Running the App

### 1. Check Available Devices

```bash
flutter devices
```

You should see available emulators/simulators or connected physical devices.

### 2. Run the App

**Debug mode (hot reload enabled):**
```bash
flutter run
```

**Run on specific device:**
```bash
flutter run -d <device-id>
```

**Release mode:**
```bash
flutter run --release
```

### 3. Hot Reload During Development

While the app is running in debug mode:
- Press `r` to hot reload
- Press `R` to hot restart
- Press `q` to quit

---

## Building for Release

### Android APK
```bash
flutter build apk --release
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

### Android App Bundle (for Play Store)
```bash
flutter build appbundle --release
```
Output: `build/app/outputs/bundle/release/app-release.aab`

### iOS (macOS only)
```bash
flutter build ios --release
```
Then open `ios/Runner.xcworkspace` in Xcode to archive and submit.

---

## Testing

### Run All Tests
```bash
flutter test
```

### Run Tests with Coverage
```bash
flutter test --coverage
lcov --list coverage/lcov.info
```

### Run Specific Test File
```bash
flutter test test/unit/models/quran_test.dart
```

### Run Integration Tests
```bash
flutter test integration_test/
```

---

## Common Issues & Solutions

### Issue: "flutter: command not found"
**Solution:** Flutter SDK is not in PATH. Add Flutter bin directory to your system PATH.

### Issue: "Doctor found issues in 1 category"
**Solution:** Run `flutter doctor -v` to see detailed issues and follow the instructions.

### Issue: "CocoaPods not installed" (iOS)
**Solution:**
```bash
sudo gem install cocoapods
cd ios
pod install
```

### Issue: "Android licenses not accepted"
**Solution:**
```bash
flutter doctor --android-licenses
```
Accept all licenses.

### Issue: "Build failed after git pull"
**Solution:**
```bash
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### Issue: "Font not loading"
**Solution:**
- Verify font files exist in `assets/fonts/Inter/`
- Check `pubspec.yaml` has correct font paths
- Run `flutter clean && flutter pub get`

---

## VS Code Setup

### Recommended Extensions
1. Flutter (Dart Code)
2. Dart
3. Bracket Pair Colorizer 2
4. Better Comments
5. Error Lens

### launch.json Configuration
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flutter (Development)",
      "request": "launch",
      "type": "dart",
      "args": [
        "--dart-define=API_BASE_URL=http://localhost:3001",
        "--dart-define=ENVIRONMENT=development"
      ]
    },
    {
      "name": "Flutter (Production)",
      "request": "launch",
      "type": "dart",
      "args": [
        "--dart-define=API_BASE_URL=https://psychological-jilli-amineregayeg-1fe35444.koyeb.app",
        "--dart-define=ENVIRONMENT=production"
      ]
    }
  ]
}
```

---

## Next Steps

1. ✅ **Phase D.1 Complete** - Project scaffolded
2. ⏳ **Phase D.2** - Implement remaining common widgets
3. ⏳ **Phase D.3** - Create API client and data layer
4. ⏳ **Phase D.4** - Implement Supabase authentication
5. ⏳ **Phase D.5** - Convert all screens from HTML templates
6. ⏳ **Phase D.6** - Add comprehensive tests

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `flutter doctor` | Check Flutter installation and environment |
| `flutter create <name>` | Create new Flutter project |
| `flutter pub get` | Install dependencies |
| `flutter pub upgrade` | Upgrade dependencies |
| `flutter run` | Run app in debug mode |
| `flutter build apk` | Build Android APK |
| `flutter test` | Run all tests |
| `flutter clean` | Clean build artifacts |
| `flutter analyze` | Analyze code for issues |
| `flutter format .` | Format all Dart code |

---

For more information, refer to:
- [Flutter Documentation](https://docs.flutter.dev/)
- [Riverpod Documentation](https://riverpod.dev/)
- [GoRouter Documentation](https://pub.dev/packages/go_router)
