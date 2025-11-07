# Umrah & Hajj Flutter Frontend

Flutter mobile application for Hajj & Umrah real-time guidance with AI-powered voice assistant, Qibla compass, Quran reader, prayer times, and navigation.

## 🚀 Getting Started

### Prerequisites

- **Flutter SDK:** 3.24.x or higher ([Install Flutter](https://docs.flutter.dev/get-started/install))
- **Dart SDK:** >=3.1.0
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Amineregayeg/umrah-hajj-realtime.git
   cd umrah-hajj-realtime
   cd frontend_flutter
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **Generate code (JSON serialization, Riverpod):**
   ```bash
   flutter pub run build_runner build --delete-conflicting-outputs
   ```

4. **Setup environment variables:**
   Create a `.env` file in the root directory:
   ```env
   API_BASE_URL=https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
   WS_BASE_URL=wss://psychological-jilli-amineregayeg-1fe35444.koyeb.app
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ENVIRONMENT=production
   ```

   For local development:
   ```env
   API_BASE_URL=http://localhost:3001
   WS_BASE_URL=ws://localhost:3001
   ENVIRONMENT=development
   ```

5. **Run the app:**
   ```bash
   # Debug mode
   flutter run

   # Release mode
   flutter run --release

   # Specific device
   flutter run -d <device-id>
   ```

## 📁 Project Structure

```
lib/
├── main.dart                    # App entry point
├── app.dart                     # MaterialApp configuration
├── config/                      # Environment & constants
├── core/                        # Core utilities
│   ├── routes/                  # GoRouter configuration
│   ├── theme/                   # App theming (Material 3)
│   ├── errors/                  # Custom exceptions & failures
│   └── utils/                   # Helper utilities
├── data/                        # Data layer
│   ├── models/                  # Data models (JSON serializable)
│   ├── repositories/            # Repository implementations
│   ├── sources/                 # Data sources (remote & local)
│   └── dto/                     # Data transfer objects
├── domain/                      # Business logic layer
│   ├── entities/                # Business entities
│   └── usecases/                # Use cases
├── presentation/                # UI layer
│   ├── providers/               # Riverpod providers
│   ├── screens/                 # All app screens
│   └── widgets/                 # Reusable widgets
└── services/                    # Platform services

test/
├── unit/                        # Unit tests
├── widget/                      # Widget tests
└── integration/                 # Integration tests
```

## 🧪 Testing

### Run all tests:
```bash
flutter test
```

### Run tests with coverage:
```bash
flutter test --coverage
```

### Run widget tests only:
```bash
flutter test test/widget
```

### Run integration tests:
```bash
flutter test integration_test/
```

## 🏗️ Build & Release

### Android (APK):
```bash
flutter build apk --release
```

### Android (App Bundle):
```bash
flutter build appbundle --release
```

### iOS:
```bash
flutter build ios --release
```

## 🔧 Configuration

### Backend API URLs

Update `lib/config/app_config.dart` with your backend URLs:
```dart
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001',
  );

  static const String wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: 'ws://localhost:3001',
  );
}
```

### Supabase Configuration

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your `URL` and `Anon Key` from Project Settings → API
3. Update `.env` file with these values

## 📦 Dependencies

### Core Dependencies
- `flutter_riverpod` - State management
- `dio` - HTTP client
- `go_router` - Declarative routing
- `supabase_flutter` - Authentication & database
- `flutter_secure_storage` - Secure token storage

### UI Dependencies
- `cached_network_image` - Image caching
- `shimmer` - Loading effects
- `lottie` - Animations

### Services
- `geolocator` - GPS location
- `flutter_compass` - Compass sensor
- `just_audio` - Audio playback

See [pubspec.yaml](pubspec.yaml) for full list.

## 🌍 Supported Languages

- Arabic (ar) - العربية
- English (en)
- French (fr) - Français
- Urdu (ur) - اردو
- Indonesian (id) - Bahasa Indonesia
- Turkish (tr) - Türkçe

## 📱 Features

- ✅ **Authentication** - Email/password login with Supabase
- ✅ **Profile Management** - Multi-step profile setup
- ✅ **Qibla Compass** - Real-time direction to Kaaba
- ✅ **Quran Reader** - 114 Surahs in multiple languages
- ✅ **Prayer Times** - Accurate prayer times based on location
- ✅ **Umrah Guidance** - Step-by-step ritual instructions
- ✅ **Real-time Navigation** - Indoor navigation via WebSocket
- ✅ **Offline Mode** - Cached Quran data and navigation bundle
- ✅ **Dark Mode** - System-aware theme switching
- ⏳ **AI Voice Assistant** - OpenAI Realtime API integration (coming soon)

## 🐛 Troubleshooting

### Common Issues

1. **"flutter: command not found"**
   - Ensure Flutter SDK is in your PATH
   - Run `flutter doctor` to verify installation

2. **Build errors after `git pull`**
   - Run `flutter clean && flutter pub get`
   - Regenerate code: `flutter pub run build_runner build --delete-conflicting-outputs`

3. **iOS build fails**
   - Ensure Xcode is up to date
   - Run `pod install` in `ios/` directory

4. **Android build fails**
   - Check Android SDK tools are installed
   - Ensure `ANDROID_HOME` environment variable is set

## 📄 License

MIT License - see [LICENSE](../LICENSE) file

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

- [Backend API Documentation](../docs/authentication/API_REFERENCE.md)
- [Investigation Report](../investigation.md)
- [Migration Plan](../migration-plan.md)
- [Component Mapping Guide](../component-mapping.md)

## 👥 Team

- Backend: NestJS (Node.js 20.x)
- Frontend: Flutter 3.24.x
- Database: PostgreSQL (Prisma ORM)
- Auth: Supabase
- AI: OpenAI Realtime API

## 🔗 Links

- [Backend Repository](https://github.com/Amineregayeg/umrah-hajj-realtime)
- [Production API](https://psychological-jilli-amineregayeg-1fe35444.koyeb.app)
- [API Docs (Swagger)](https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/docs)

---

**Built with ❤️ for the Ummah**
