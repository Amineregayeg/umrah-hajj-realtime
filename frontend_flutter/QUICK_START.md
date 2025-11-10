# Quick Start Guide

## 🚀 Running the Flutter App

### Method 1: Using Batch Files (Easiest)

**Option A: Run the app directly**
1. Double-click `run_flutter.bat` in the `frontend_flutter` folder
2. Wait for the app to compile and launch
3. The app will open in Chrome browser

**Option B: Analyze for errors first**
1. Double-click `analyze_flutter.bat` to check for errors
2. If no errors, use `run_flutter.bat` to start the app

### Method 2: Using VS Code (Recommended)

1. Open the `frontend_flutter` folder in VS Code
2. Press `F5` or click "Run and Debug" → "Flutter: Run (Chrome)"
3. The app will launch in Chrome

### Method 3: Using Command Line

```bash
cd frontend_flutter

# Install dependencies
flutter pub get

# Run the app
flutter run -d chrome
```

## 📋 What's Working

✅ **Screens Implemented:**
- Home screen with navigation
- Qibla compass screen (UI only, no real sensor data yet)
- Quran reader screen with search and filters
- Prayer times (Salat) screen with calendar
- Login/Signup screens

✅ **Features:**
- Navigation between all screens
- Theme support (light/dark mode)
- Responsive UI with Material Design 3
- Sample data for testing

## ⚠️ Known Limitations

❌ **Not Yet Implemented:**
- Real compass sensor integration
- Backend API connections
- Supabase authentication (disabled for testing)
- Push notifications
- AR view features

## 🔧 Troubleshooting

### Error: "Package not found"
```bash
cd frontend_flutter
flutter pub get
```

### Error: Supabase initialization
This is normal - Supabase is disabled for testing. The app will run without it.

### Error: SDK version issues
```bash
flutter upgrade
flutter pub get
```

### Error: Build errors
```bash
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

## 📱 Testing Different Features

### Navigate to specific screens:
- **Home**: Click Home button or navigate to `/home`
- **Qibla**: Navigate to `/qibla`
- **Quran**: Navigate to `/quran`
- **Prayer Times**: Navigate to `/salat`
- **Login**: Navigate to `/login`

### Test the app:
1. Start at Home screen
2. Click on different navigation options
3. Try the search functionality in Quran screen
4. Interact with prayer times calendar
5. Toggle switches and filters

## 🎯 Next Steps

If the app runs successfully:
1. Test all navigation flows
2. Try search and filter features
3. Check responsive layout on different screen sizes
4. Test dark/light mode switching (if implemented)

If you encounter errors:
1. Copy the error message
2. Share it for specific troubleshooting
3. Check if dependencies are properly installed

## 💡 Tips

- Use **Chrome** as the target device for fastest development
- Press `r` in terminal to hot reload changes
- Press `R` to hot restart the app
- Press `q` to quit the app

## 📞 Need Help?

If you see any errors:
1. Run `analyze_flutter.bat`
2. Copy the full error message
3. Share the error for specific fixes
