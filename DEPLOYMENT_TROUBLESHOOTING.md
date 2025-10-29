# Deployment Troubleshooting Guide

**Date:** October 29, 2025
**Status:** Active Troubleshooting

---

## 🔍 Common Deployment Issues & Solutions

### Issue 1: FeatureFlagsModule Not Found (FIXED)

**Error:**
```
Error: Nest can't resolve dependencies of the AIRealtimeService
Cannot find module FeatureFlagsService
```

**Root Cause:**
FeatureFlagsModule was marked as @Global() but not imported in AppModule.

**Solution:** ✅ FIXED
Added `FeatureFlagsModule` import to `apps/backend/src/app.module.ts`

**File Changed:**
```typescript
// apps/backend/src/app.module.ts
import { FeatureFlagsModule } from './shared/config/feature-flags.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FeatureFlagsModule,  // <-- Added this
    SecurityModule,
    // ... other modules
  ],
})
```

---

### Issue 2: Missing Knowledge Base Files

**Error:**
```
WARN Knowledge directory not found: /path/to/knowledge
```

**Check:**
```bash
ls apps/backend/src/ai/knowledge/
# Should show:
# - umrah_basics.md
# - hajj_steps.md
# - madhhab_differences.md
# - duas_selected.md
```

**Status:** ✅ Files exist and are in git

---

### Issue 3: Search Index File Missing (EXPECTED)

**Warning:**
```
WARN Search index not found, will be generated on first request
```

**This is NORMAL:** The search index (120MB) is excluded from git and generated on deployment.

**Solution Options:**

**Option 1: Build-time generation (Recommended)**
Update Koyeb build command:
```bash
node scripts/rebuild-quran-search-index.cjs && cd apps/backend && pnpm build
```

**Option 2: Runtime generation**
The KnowledgeSearchService will log a warning but continue working. Index generates on first Quran API request.

**Option 3: Manual generation**
```bash
cd /path/to/project
node scripts/rebuild-quran-search-index.cjs
```

---

### Issue 4: TypeScript Compilation Errors

**Check locally:**
```bash
cd apps/backend
pnpm build
```

**Common Issues:**
- Missing type imports
- Incorrect path references
- Circular dependencies

**Current Status:** Checking... (build running)

---

### Issue 5: Missing Environment Variables

**Required Variables (Can be empty/false):**
```bash
# Feature Flags (DEFAULT: false)
FEATURE_AI_ENABLED=false
FEATURE_AI_REALTIME_ENABLED=false
FEATURE_AI_NAV_PROMPTS_ENABLED=false
FEATURE_AI_TEST_USERS=
FEATURE_AI_ROLLOUT_PERCENTAGE=0
EMERGENCY_KILL_SWITCH=false

# OpenAI (Required for AI features, but AI disabled by default)
OPENAI_API_KEY=sk-proj-...
REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
REALTIME_VOICE=verse

# Existing Required Variables
DATABASE_URL=...
SUPABASE_JWT_SECRET=...
JWT_SECRET=...
ALLOWED_ORIGINS=...
WS_ORIGIN=...
```

**Note:** Even if AI is disabled, the services will initialize (they just won't be used).

---

### Issue 6: Port/Startup Issues

**Check Koyeb Logs:**
```
Application listening on port 8000
=== Feature Flags Status ===
AI Enabled: false
...
```

**If Not Starting:**
1. Check for uncaught exceptions in logs
2. Verify all modules imported correctly
3. Check for circular dependency errors

---

## 🔧 Diagnostic Steps

### Step 1: Local Build Test

```bash
cd apps/backend

# Install dependencies
pnpm install

# Build
pnpm build

# If successful, check dist/ folder
ls -la dist/
```

**Expected:** Build completes with no errors

### Step 2: Local Startup Test

```bash
# Set minimal environment variables
export DATABASE_URL="postgresql://..."
export SUPABASE_JWT_SECRET="..."
export JWT_SECRET="test-secret"
export ALLOWED_ORIGINS="http://localhost:3000"
export WS_ORIGIN="http://localhost:3000"

# All AI flags OFF
export FEATURE_AI_ENABLED=false
export FEATURE_AI_REALTIME_ENABLED=false
export FEATURE_AI_NAV_PROMPTS_ENABLED=false
export FEATURE_AI_ROLLOUT_PERCENTAGE=0

# Start
pnpm start:dev
```

**Expected Log Output:**
```
[Nest] 12345  - LOG [NestFactory] Starting Nest application...
[Nest] 12345  - LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - LOG [InstanceLoader] FeatureFlagsModule dependencies initialized
[Nest] 12345  - LOG [InstanceLoader] AIModule dependencies initialized
[Nest] 12345  - LOG [FeatureFlagsService] === Feature Flags Status ===
[Nest] 12345  - LOG [FeatureFlagsService] AI Enabled: false
[Nest] 12345  - LOG [FeatureFlagsService] AI Realtime Enabled: false
[Nest] 12345  - LOG [FeatureFlagsService] AI Navigation Prompts Enabled: false
[Nest] 12345  - LOG [FeatureFlagsService] Emergency Kill Switch: false
[Nest] 12345  - LOG [FeatureFlagsService] Rollout Percentage: 0%
[Nest] 12345  - LOG [FeatureFlagsService] Test Users: 0 configured
[Nest] 12345  - LOG [NestApplication] Nest application successfully started
```

### Step 3: Check Individual Services

```bash
# Check if services can be imported
cd apps/backend
pnpm exec ts-node -e "
  import('./src/shared/config/feature-flags.service').then(m => {
    console.log('FeatureFlagsService loaded:', m);
  }).catch(e => console.error('Error:', e));
"
```

### Step 4: Verify Git Status

```bash
git status
git log --oneline -5
git diff origin/deploy/koyeb-setup
```

**Expected:**
- Branch: deploy/koyeb-setup
- Latest commit includes FeatureFlagsModule in AppModule

---

## 📋 Koyeb-Specific Checks

### Build Configuration

**Builder:** Buildpack (Node.js)

**Build Command:**
```bash
# Option 1: With search index generation
node scripts/rebuild-quran-search-index.cjs && cd apps/backend && pnpm install && pnpm build

# Option 2: Without search index (generates on first request)
cd apps/backend && pnpm install && pnpm build
```

**Run Command:**
```bash
cd apps/backend && pnpm start:prod
```

### Environment Variables on Koyeb

**Critical Variables (Must be set):**
```bash
NODE_ENV=production
DATABASE_URL=<from Koyeb postgres>
SUPABASE_JWT_SECRET=<from Supabase>
JWT_SECRET=<generate secure random>
ALLOWED_ORIGINS=https://your-frontend.app
WS_ORIGIN=https://your-frontend.app
```

**AI Feature Flags (All FALSE initially):**
```bash
FEATURE_AI_ENABLED=false
FEATURE_AI_REALTIME_ENABLED=false
FEATURE_AI_NAV_PROMPTS_ENABLED=false
FEATURE_AI_TEST_USERS=
FEATURE_AI_ROLLOUT_PERCENTAGE=0
EMERGENCY_KILL_SWITCH=false
```

**Optional AI Variables:**
```bash
OPENAI_API_KEY=sk-proj-...  # Can be empty if AI disabled
REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
REALTIME_VOICE=verse
```

### Health Check

**Endpoint:** `GET /health`

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T09:50:00.000Z",
  "uptime": 123.456,
  "database": "connected"
}
```

---

## 🚨 Emergency Rollback

If deployment fails and you need to rollback:

### Option 1: Revert to Previous Commit

```bash
# Find previous working commit
git log --oneline -10

# Revert to previous commit (e.g., 6a0dae6)
git checkout 6a0dae6
git push -f origin deploy/koyeb-setup
```

**Warning:** This removes all AI implementation. Use only if critical.

### Option 2: Fix Forward

```bash
# Fix the issue locally
# Test build: pnpm build
# Test locally: pnpm start:dev
# Commit fix
git add .
git commit -m "fix: resolve deployment issue"
git push origin deploy/koyeb-setup
```

**Preferred:** Fix forward rather than rollback.

### Option 3: Feature Flag Disable

If deployment succeeds but app has runtime errors:
```bash
# On Koyeb, set:
EMERGENCY_KILL_SWITCH=true
```

This disables all AI features instantly without redeployment.

---

## 📊 Current Status

### Changes Made

1. ✅ **FIXED:** Added `FeatureFlagsModule` to `AppModule`
   - File: `apps/backend/src/app.module.ts`
   - Import added
   - Module added to imports array

2. 🔄 **Testing:** Running local build to verify
   - Command: `pnpm build`
   - Status: In progress...

3. ⏳ **Pending:** Push fix to git if build succeeds

### Next Steps

1. ✅ Verify local build succeeds
2. ⏳ Commit and push fix to GitHub
3. ⏳ Koyeb auto-deploys from GitHub
4. ⏳ Monitor deployment logs
5. ⏳ Verify health check passes
6. ⏳ Confirm feature flags logged correctly

---

## 🔗 Useful Commands

### Check Deployment Status
```bash
# On Koyeb dashboard
# → Services → umrah-backend → Deployments
# → View logs for current deployment
```

### Test API Endpoints
```bash
# Health check
curl https://api.umrah.app/health

# Feature flag test (should return 404 or "not enabled")
curl -X POST https://api.umrah.app/ai/realtime/session \
  -H "Authorization: Bearer YOUR_JWT"

# Expected: 400 Bad Request
# {
#   "error": "AI Realtime feature is not enabled",
#   "code": "FEATURE_NOT_ENABLED"
# }
```

### View Logs
```bash
# Koyeb CLI (if installed)
koyeb logs -s umrah-backend

# Or use Koyeb dashboard → Logs
```

---

## 📞 Need Help?

**If build fails locally:**
1. Check error message
2. Look for TypeScript errors
3. Check import paths
4. Verify all dependencies installed

**If deployment fails on Koyeb:**
1. Check Koyeb logs for exact error
2. Verify environment variables set
3. Check build command is correct
4. Verify Node.js version (should be 20.x)

**If app starts but has runtime errors:**
1. Check feature flags in logs
2. Verify all modules initialized
3. Test health endpoint
4. Use emergency kill switch if needed

---

**Last Updated:** October 29, 2025
**Status:** Actively troubleshooting
**Fix Applied:** FeatureFlagsModule import added to AppModule
