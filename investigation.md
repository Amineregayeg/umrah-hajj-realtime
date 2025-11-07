# Phase A: Repository & API Investigation

**Branch:** `feat/flutter-frontend-migration/convert-html`
**Investigation Date:** 2025-11-07
**Backend Repository:** https://github.com/Amineregayeg/umrah-hajj-realtime

---

## Executive Summary

This is a Hajj & Umrah guidance mobile application with:
- **Backend:** NestJS (TypeScript) with Supabase authentication
- **Frontend:** HTML/CSS/JS templates (18 pages) using Tailwind CSS
- **API:** RESTful HTTP + WebSocket for real-time navigation
- **Key Features:** Qibla compass, Quran reader, prayer times, AI voice assistant, real-time navigation, ritual guidance

---

## 1. Repository Structure

### Backend Source (Monorepo)
```
backend_source/
├── apps/backend/           # NestJS application
│   ├── src/
│   │   ├── ai/            # AI & voice assistant
│   │   ├── auth/          # Supabase JWT guards
│   │   ├── consent/       # User consent management
│   │   ├── content/       # Content & prayer times
│   │   ├── health/        # Health check endpoints
│   │   ├── metrics/       # Metrics & monitoring
│   │   ├── nav/           # Navigation & WebSocket
│   │   │   └── graph/     # Navigation graph service
│   │   ├── profile/       # User profile management
│   │   ├── quran/         # Quran API
│   │   ├── umrah/         # Umrah steps & progress
│   │   ├── prisma/        # Database ORM
│   │   └── shared/        # Utilities & config
│   ├── package.json       # Dependencies (Node 20.x, pnpm)
│   ├── prisma/            # Database schema
│   └── test/              # Vitest tests
├── docs/                  # Comprehensive documentation
│   ├── authentication/    # Auth API reference
│   ├── API_ENV_VARS.md
│   ├── DEPLOY_KOYEB.md
│   └── UNITY_INTEGRATION_GUIDE.md
├── package.json           # Workspace root
└── README.md
```

### Frontend Templates (Current Directory)
```
.
├── Main.txt                    # Landing page
├── Home.txt                    # Home screen (Start Umrah)
├── Splash.txt                  # Splash screen
├── Guidance 1.txt              # Guidance step screens
├── Guidance 2.txt
├── Guidance 3.txt
├── Guidance 4.txt
├── Guidance 5.txt
├── Map.txt                     # Navigation map
├── Qibla.txt                   # Qibla compass
├── Quran.txt                   # Quran reader
├── Salat.txt                   # Prayer times
├── Profile.txt                 # Profile setup
├── Authentificator.txt         # Authentication
├── Email verification.txt      # Email verification
├── Consent & permissions.txt   # Consent management
├── Offline.txt                 # Offline mode
└── github.txt                  # Access token (DO NOT COMMIT)
```

---

## 2. Backend API Endpoints

### Base URLs
- **Development:** `http://localhost:3001`
- **Production:** `https://psychological-jilli-amineregayeg-1fe35444.koyeb.app`
- **WebSocket:** `ws://localhost:3001` (dev) / `wss://psychological-jilli-amineregayeg-1fe35444.koyeb.app` (prod)
- **API Docs (Swagger):** `{BASE_URL}/docs`

### Authentication & Authorization

#### Auth Method
- **Type:** Supabase JWT (Bearer tokens)
- **Header:** `Authorization: Bearer <JWT_TOKEN>`
- **Mock Mode (Dev):** `Bearer dummy-jwt-{userId}`
- **Production:** Supabase-issued JWT (HS256 algorithm)
- **Token Storage:** Client-side (recommended: flutter_secure_storage)
- **Guard:** `SupabaseJwtGuard` (src/auth/guards/supabase-jwt.guard.ts)

#### Protected Endpoints
Most endpoints have auth guards commented out (`// @UseGuards(SupabaseJwtGuard)`), but the infrastructure is in place for production use.

---

### API Endpoint Mapping

| HTTP Method | Endpoint | Purpose | Auth Required | Request Body | Response |
|------------|----------|---------|---------------|--------------|----------|
| **Root** |
| GET | `/` | Health check | No | - | `{ message: string }` |
| GET | `/health` | Service health | No | - | `{ status: 'ok', services: {...} }` |
| GET | `/protected` | Protected test endpoint | Yes | - | `{ message, user, timestamp }` |
| **Profile** |
| POST | `/profile` | Create profile | Yes | `CreateProfileDto` | `ProfileResponseDto` |
| GET | `/profile` | Get current user profile | Yes | - | `ProfileResponseDto` |
| PUT | `/profile` | Update current profile | Yes | `UpdateProfileDto` | `ProfileResponseDto` |
| GET | `/profile/:id` | Get profile by ID | Yes | - | `ProfileResponseDto` |
| PATCH | `/profile/:id` | Partial update profile | Yes | `UpdateProfileDto` | `ProfileResponseDto` |
| DELETE | `/profile/:id` | Delete profile | Yes | - | `void` |
| **Consent** |
| POST | `/consent` | Create consent | Yes | `CreateConsentDto` | `ConsentResponseDto` |
| GET | `/consent` | Get all user consents | Yes | - | `ConsentSummaryDto` |
| PUT | `/consent` | Update consent | Yes | `UpdateConsentDto` | `ConsentResponseDto` |
| GET | `/consent/check?type={type}` | Check specific consent | Yes | - | `{ granted: boolean }` |
| GET | `/consent/:id` | Get consent by ID | Yes | - | `ConsentResponseDto` |
| PATCH | `/consent/:id` | Update consent | Yes | `UpdateConsentDto` | `ConsentResponseDto` |
| POST | `/consent/revoke/:type` | Revoke consent | Yes | - | `ConsentResponseDto` |
| DELETE | `/consent/:id` | Delete consent | Yes | - | `void` |
| **Quran** |
| GET | `/content/quran/surahs?lang={lang}` | List all surahs | No | - | `QuranSurahsListResponseDto` (114 surahs) |
| GET | `/content/quran/surah/:id?lang={lang}` | Get complete surah | No | - | `QuranSurahDto` (with ayahs) |
| GET | `/content/quran/ayah?surah={}&ayah={}&lang={}` | Get specific ayah | No | - | `QuranAyahDto` |
| GET | `/content/quran/search?q={}&lang={}&limit={}&offset={}` | Search Quran | No | - | `QuranSearchResponseDto` |
| GET | `/content/quran/audio/reciters` | Get reciter list | No | - | `QuranRecitersResponseDto` |
| GET | `/content/quran/cache/stats` | Cache statistics | No | - | `{ hits, misses, hitRate, size }` |
| **Content & Salat** |
| GET | `/content/prayer-times?lat={}&lng={}&date={}` | Get prayer times | No | - | Prayer times object |
| GET | `/content/qibla?lat={}&lng={}` | Get Qibla direction | No | - | `{ direction, distance, kaaba }` |
| GET | `/content` | Get all content | No | Query params | `ContentListResponseDto` |
| GET | `/content/popular?limit={}` | Popular content | No | - | `ContentResponseDto[]` |
| GET | `/content/recent?limit={}` | Recent content | No | - | `ContentResponseDto[]` |
| GET | `/content/search?q={}` | Search content | No | - | `ContentListResponseDto` |
| GET | `/content/category/:category` | Content by category | No | - | `ContentListResponseDto` |
| GET | `/content/type/:type` | Content by type | No | - | `ContentListResponseDto` |
| GET | `/content/:id` | Get content by ID | No | - | `ContentResponseDto` |
| POST | `/content` | Create content | Yes | `CreateContentDto` | `ContentResponseDto` |
| PATCH | `/content/:id` | Update content | Yes | `UpdateContentDto` | `ContentResponseDto` |
| POST | `/content/:id/publish` | Publish content | Yes | - | `ContentResponseDto` |
| POST | `/content/:id/unpublish` | Unpublish content | Yes | - | `ContentResponseDto` |
| DELETE | `/content/:id` | Delete content | Yes | - | `void` |
| **Umrah & Ritual** |
| GET | `/umrah/steps` | Get Umrah step list | No | - | Steps array |
| GET | `/ritual/progress?userId={}` | Get user ritual progress | No | - | Progress object |
| **Navigation** |
| GET | `/nav/status` | WebSocket status | No | - | `{ status, websocket, connections }` |
| GET | `/nav/health` | Navigation health | No | - | `{ status, service, timestamp }` |
| POST | `/nav/snapshot` | Submit nav snapshot (REST fallback) | Yes | `NavUpdateDto` | `{ success, message, timestamp, correction }` |
| GET | `/nav/correction/stats` | Correction statistics | Yes | - | Stats object |
| GET | `/nav/offline-bundle` | Offline navigation data | No | - | `{ version, graph, phrases, units }` (ETag cached) |
| **AI & Voice** |
| POST | `/ai/chat` | Chat with AI assistant | Yes | `AIChatRequestDto` | `AIChatResponseDto` |
| POST | `/ai/generate` | Generate content | Yes | `AIContentGenerationRequestDto` | `AIContentGenerationResponseDto` |
| POST | `/ai/translate` | Translate text | Yes | `AITranslationRequestDto` | `AITranslationResponseDto` |
| POST | `/ai/recommendations` | Get recommendations | Yes | `AIRecommendationRequestDto` | `AIRecommendationResponseDto` |
| GET | `/ai/prayer-guidance?location={}&language={}` | Prayer guidance | Yes | - | `AIContentGenerationResponseDto` |
| GET | `/ai/ritual-assistance/:ritual?step={}` | Ritual assistance | Yes | - | `AIContentGenerationResponseDto` |
| GET | `/ai/usage-stats?startDate={}&endDate={}` | AI usage stats | Yes | - | `AIUsageStatsDto` |
| GET | `/ai/chat-history?conversationId={}&limit={}` | Chat history | Yes | - | `AIChatResponseDto[]` |
| DELETE | `/ai/chat-history?conversationId={}` | Delete chat history | Yes | - | `void` |
| POST | `/ai/voice/token` | Issue ephemeral voice token | Yes | `{ language, gender, sessionId? }` | `VoiceTokenResponseDto` (TTL ≤60s) |
| POST | `/ai/realtime/session` | Create OpenAI Realtime session | Yes | `{ language?, gender?, ritualType?, madhhab? }` | Session object with WebSocket URL |
| **Health & Metrics** |
| GET | `/health` | Application health | No | - | Health status |
| GET | `/metrics` | Application metrics | No | - | Metrics data |

---

### Sample Request/Response Payloads

#### 1. Profile Creation
**Request:** `POST /profile`
```json
{
  "firstName": "Ahmed",
  "lastName": "Al-Rashid",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "phoneNumber": "+966501234567",
  "nationality": "SA",
  "preferredLanguage": "en"
}
```
**Response:**
```json
{
  "id": "profile-123",
  "userId": "user-456",
  "firstName": "Ahmed",
  "lastName": "Al-Rashid",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "phoneNumber": "+966501234567",
  "nationality": "SA",
  "preferredLanguage": "en",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### 2. Qibla Direction
**Request:** `GET /content/qibla?lat=51.5074&lng=-0.1278`
**Response:**
```json
{
  "location": { "latitude": 51.5074, "longitude": -0.1278 },
  "qibla": { "direction": 118.98, "distance": 4587.32 },
  "kaaba": { "latitude": 21.4225, "longitude": 39.8262 },
  "calculatedAt": "2025-11-07T10:00:00Z"
}
```

#### 3. Quran Surah
**Request:** `GET /content/quran/surah/1?lang=ar`
**Response:**
```json
{
  "id": 1,
  "name": "الفاتحة",
  "transliteration": "Al-Fatihah",
  "translation": "The Opening",
  "type": "makkiyyah",
  "ayah_count": 7,
  "ayahs": [
    {
      "id": 1,
      "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "page": 1,
      "juz": 1,
      "sajda": false
    }
  ]
}
```

#### 4. Voice Token Generation
**Request:** `POST /ai/voice/token`
```json
{
  "language": "ar",
  "gender": "male",
  "sessionId": "session-abc-123"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1703080860,
  "ttl": 60,
  "scope": ["realtime.voice"],
  "language": "ar",
  "gender": "male"
}
```

---

## 3. WebSocket Navigation API

### Connection
**URL:** `ws://localhost:3001` (or query param `?token={JWT}`)
**Auth:** JWT in Authorization header or query parameter
**Heartbeat:** 15-second intervals
**Rate Limit:** 10Hz client → server, 5Hz server → client

### Message Format
Client-to-server navigation updates use `NavUpdateDto`:
```json
{
  "ts": 1699000000000,
  "stage": "tawaf",
  "lap": 3,
  "sai_leg": null,
  "pos": {
    "lat": 21.4225,
    "lon": 39.8262,
    "floor": 1,
    "acc": 5.2
  }
}
```

### Events
- `ping` / `pong` - Heartbeat
- `nav_update` - Navigation position update
- `nav_correction` - Server sends snap-to corrections
- Connection close codes: `4001` (Unauthorized), `4003` (Forbidden), `4029` (Rate limit)

---

## 4. Environment Variables

### Required Environment Variables (Backend)
```bash
# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret

# Auth Mode
AUTH_MODE=supabase  # or 'mock' for development

# Node Environment
NODE_ENV=production  # or 'development'

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://...

# Optional
GIT_SHA=deployment-version
```

### Frontend Environment Variables (for Flutter)
```dart
// .env or const
API_BASE_URL=https://psychological-jilli-amineregayeg-1fe35444.koyeb.app
WS_BASE_URL=wss://psychological-jilli-amineregayeg-1fe35444.koyeb.app
ENVIRONMENT=production
```

---

## 5. Frontend HTML Templates Analysis

### Design System
- **CSS Framework:** Tailwind CSS (CDN)
- **Fonts:** Inter (Google Fonts), Material Symbols Outlined
- **Color Palette:**
  - Primary: `#169c4c` (Green)
  - Background Light: `#f6f8f7`
  - Background Dark: `#112118`
  - Text Light: `#112118`
  - Text Dark: `#f6f8f7`
- **Dark Mode:** Supported via `class="dark"` toggle
- **Border Radius:** Default 0.5rem, lg 1rem, xl 1.5rem

### Screen Inventory

| File | Purpose | Key UI Elements | API Calls Expected |
|------|---------|-----------------|-------------------|
| `Main.txt` | Landing/language selection | Language buttons (AR/EN/FR), Sign In button, Bottom nav | - |
| `Splash.txt` | App splash screen | Logo, loading indicator | - |
| `Home.txt` | Home dashboard | Location chip, Search button, "Start Umrah" CTA | - |
| `Guidance 1-5.txt` | Step-by-step ritual guidance | Progress indicators, instruction cards, Next/Back | `/umrah/steps`, `/ritual/progress` |
| `Map.txt` | Real-time navigation map | Interactive map, floor selector, position marker | `/nav/offline-bundle`, WebSocket |
| `Qibla.txt` | Qibla compass | Compass widget, AR View button, Recalibrate | `/content/qibla` |
| `Quran.txt` | Quran reader | Surah list, ayah display, audio player, search | `/content/quran/surahs`, `/content/quran/surah/:id`, `/content/quran/search`, `/content/quran/audio/reciters` |
| `Salat.txt` | Prayer times | Prayer time cards, location, Hijri date | `/content/prayer-times` |
| `Profile.txt` | User profile setup | Form fields (name, country, language, gender, madhhab, mobility), Accessibility toggles | `/profile` (POST/PUT) |
| `Authentificator.txt` | Sign in/up | Email/password fields, social login buttons | Supabase SDK (client-side) |
| `Email verification.txt` | Email verification flow | OTP input, resend button | Supabase SDK |
| `Consent & permissions.txt` | Privacy consent | Consent type toggles, legal text | `/consent` (GET/POST/PUT) |
| `Offline.txt` | Offline mode indicator | Offline banner, sync status | `/nav/offline-bundle` |

### Common UI Patterns
1. **Bottom Navigation Bar:** Umrah, Qibla, Qur'an, Salat tabs
2. **Header:** Back button, title, action buttons (search, menu)
3. **Cards:** Rounded containers with `bg-subtle-light dark:bg-subtle-dark`
4. **Buttons:** Primary (green), Secondary (transparent with border)
5. **Forms:** `bg-subtle-light dark:bg-subtle-dark`, focus ring on primary color
6. **Toggle Switches:** Custom toggle for dark mode and settings
7. **Progress Indicators:** Linear progress bars, step counters

---

## 6. Static Assets

### Images & Icons
- **Background Images:** Hosted on Google User Content CDN (lh3.googleusercontent.com)
  - Kaaba images
  - Masjid al-Haram aerial views
  - Guidance step illustrations
- **Icons:** Material Symbols Outlined (Google Fonts CDN)
- **SVG Icons:** Inline SVG for custom icons (navigation compass, profile, etc.)

### Fonts
- **Primary:** Inter (weights: 400, 500, 700, 900)
- **Icon Font:** Material Symbols Outlined

### Asset Migration Strategy
- Download key background images to `assets/images/` (or use cached_network_image in Flutter)
- Replace Material Symbols with Flutter's Icon widgets (material.dart)
- Preserve color scheme in Flutter ThemeData

---

## 7. CORS & Security

### CORS Configuration
Backend allows origins configured via environment variables. Default:
- Development: `http://localhost:*`
- Production: Configured domain(s)

### Security Headers
All responses include:
```
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
```

### Rate Limiting
- **Voice Token:** 5 req/min per user (burst: 10)
- **Nav Snapshot:** 1 req/min per user
- **WebSocket:** Connection-based (10Hz client, 5Hz server)

---

## 8. Server-Rendered vs. Client-Rendered

**Current Frontend:** Fully client-rendered static HTML pages
**Backend:** API-only (no server-side rendering)

**Flutter Migration:** All pages will be client-rendered Flutter widgets. No SSR to reproduce.

---

## 9. Gaps & Assumptions

### Missing Information
1. **Supabase Project Configuration:** No access to Supabase dashboard. Will use mock auth for local development.
2. **OpenAI Realtime API Key:** Not in repo (correctly excluded). Will document as required env var.
3. **Sample WebSocket Message Formats:** Documented in code, but no live examples. Will implement based on `NavUpdateDto` schema.
4. **Prisma Schema:** Not analyzed in detail. Will rely on DTOs for data models.

### Assumptions
1. **Auth Flow:** Using Supabase Auth SDK on Flutter client-side (no custom auth endpoints in backend).
2. **Token Storage:** Will use `flutter_secure_storage` for JWT tokens.
3. **Offline Mode:** `/nav/offline-bundle` provides all necessary navigation data. Will cache locally.
4. **Image Assets:** Will use `cached_network_image` for remote images; download critical assets for offline use.
5. **WebSocket Reconnection:** Implementing exponential backoff reconnection logic client-side.
6. **Language Localization:** Backend supports `lang` query param. Flutter will use `intl` package for l10n.

---

## 10. Technology Stack Summary

### Backend (Production)
- **Runtime:** Node.js 20.x
- **Framework:** NestJS 11.x
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** Supabase (JWT HS256)
- **WebSocket:** `@nestjs/platform-ws` (ws library)
- **Validation:** class-validator, Zod
- **Testing:** Vitest

### Frontend (Current HTML)
- **Styling:** Tailwind CSS 3.x (CDN)
- **Fonts:** Google Fonts (Inter), Material Symbols
- **JavaScript:** Vanilla JS (minimal, mostly static)

### Frontend (Target Flutter)
- **SDK:** Flutter 3.x (stable)
- **State Management:** Riverpod (recommended)
- **HTTP Client:** dio (with interceptors for auth)
- **WebSocket:** web_socket_channel
- **Secure Storage:** flutter_secure_storage
- **Auth:** supabase_flutter
- **Cache:** hive / shared_preferences

---

## 11. Next Steps (Phase B - Migration Plan)

1. Define Flutter project structure (lib/ directory layout)
2. Select state management solution (Riverpod recommended)
3. Create component mapping guide (HTML → Flutter widgets)
4. Define testing strategy (unit, widget, integration)
5. Establish navigation strategy (Navigator 2.0 or simple)
6. Design error handling & logging approach
7. Plan offline-first architecture
8. Create pubspec.yaml with dependencies

---

**End of Investigation Report**
