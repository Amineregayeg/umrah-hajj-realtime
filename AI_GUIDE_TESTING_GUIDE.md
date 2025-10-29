# AI Guide - Testing Guide for QA Team

**Date:** October 28, 2025
**Status:** Ready for Testing
**Implementation:** Feature-flagged (disabled by default)

---

## 🎯 Quick Start for Testers

### What Was Implemented

**Core AI Features:**
1. ✅ Voice chat with AI guide (English/French/Arabic)
2. ✅ Real-time navigation prompts during Umrah/Hajj
3. ✅ Voice commands ("show timeline", "switch to Arabic", etc.)
4. ✅ Multi-language auto-detection
5. ✅ Profile-aware guidance (gender, madhhab, mobility)

**Zero-Risk Implementation:**
- All features are **DISABLED by default**
- Feature flags control everything
- Existing navigation/auth systems **untouched**
- Can be disabled instantly if issues found

---

## 📋 Pre-Testing Checklist

### 1. Environment Setup

**Backend .env Configuration:**
```bash
# AI Feature Flags (START WITH ALL DISABLED)
FEATURE_AI_ENABLED=false
FEATURE_AI_REALTIME_ENABLED=false
FEATURE_AI_NAV_PROMPTS_ENABLED=false

# Test Users (enable AI only for these users)
FEATURE_AI_TEST_USERS=

# Rollout Percentage (0-100, start with 0)
FEATURE_AI_ROLLOUT_PERCENTAGE=0

# Emergency Kill Switch (set to true to disable ALL AI instantly)
EMERGENCY_KILL_SWITCH=false

# OpenAI API Key (already configured)
OPENAI_API_KEY=sk-proj-...
REALTIME_MODEL=gpt-realtime
REALTIME_VOICE=verse
```

### 2. Verify Backend is Running

```bash
# Check backend health
curl https://api.umrah.app/health

# Should return: { "status": "healthy", ... }
```

### 3. Verify Feature Flags Status

```bash
# Check logs on Koyeb dashboard
# Look for: "=== Feature Flags Status ==="
# All should show: false
```

---

## 🧪 Testing Phases

### Phase 1: Verify Features Are Disabled (Week 1)

**Goal:** Confirm AI features don't affect existing system

**Test Cases:**

1. **Test: Existing Navigation Still Works**
   ```
   1. Login with Supabase JWT
   2. Start navigation
   3. Move around
   4. Verify: Navigation works exactly as before
   5. Verify: No AI prompts appear
   ```
   **Expected:** ✅ Navigation works perfectly
   **Risk:** 0% - AI code not executed

2. **Test: AI Endpoints Return 404**
   ```bash
   # Try to create AI session (should fail)
   curl -X POST https://api.umrah.app/ai/realtime/session \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json"

   # Expected: 404 Not Found (feature not available)
   ```
   **Expected:** ✅ 404 error
   **Risk:** 0% - Feature disabled

3. **Test: Voice Token Still Works**
   ```bash
   # Voice token endpoint should still work (was already there)
   curl -X POST https://api.umrah.app/ai/voice/token \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{"language": "en", "gender": "male"}'

   # Expected: 200 OK with token
   ```
   **Expected:** ✅ Token created
   **Risk:** 0% - Existing feature

---

### Phase 2: Enable for Test Users Only (Week 2)

**Goal:** Test AI features with limited users

**Setup:**
```bash
# In Koyeb dashboard, update environment variables:
FEATURE_AI_ENABLED=true
FEATURE_AI_REALTIME_ENABLED=true
FEATURE_AI_TEST_USERS=user-test-123,user-test-456

# Leave navigation prompts OFF for now
FEATURE_AI_NAV_PROMPTS_ENABLED=false
```

**Test User Setup:**
1. Create 2-3 test users in Supabase
2. Note their user IDs
3. Add IDs to FEATURE_AI_TEST_USERS

**Test Cases:**

1. **Test: AI Session Creation (Test User)**
   ```
   Login as test user
   → POST /ai/realtime/session
   → Should return: { sessionId, websocketUrl, token }
   ```
   **Expected:** ✅ Session created
   **Risk:** <1% - Only test users affected

2. **Test: AI Session Creation (Regular User)**
   ```
   Login as regular user (not in test list)
   → POST /ai/realtime/session
   → Should return: 404 Not Found
   ```
   **Expected:** ✅ 404 for non-test users
   **Risk:** 0% - Regular users unaffected

3. **Test: Voice Chat (Test User)**
   ```
   1. Login as test user
   2. Get voice token: POST /ai/voice/token
   3. Create session: POST /ai/realtime/session
   4. Connect WebSocket: ws://api/ai/realtime?token=...
   5. Send audio
   6. Verify: AI responds with voice
   ```
   **Expected:** ✅ Voice chat works
   **Risk:** <1% - Isolated to test users

4. **Test: Multi-Language**
   ```
   Test User 1: Speak English → AI responds in English
   Test User 2: Speak French → AI responds in French
   Test User 3: Speak Arabic → AI responds in Arabic
   ```
   **Expected:** ✅ Auto-detection works
   **Risk:** <1% - Test users only

5. **Test: Voice Commands**
   ```
   Say: "Show timeline" → Timeline opens
   Say: "Switch to Arabic" → AI switches to Arabic
   Say: "Go to settings" → Settings opens
   ```
   **Expected:** ✅ Commands execute
   **Risk:** <1% - Test users only

---

### Phase 3: Enable Navigation Prompts (Week 3)

**Goal:** Test real-time navigation + AI integration

**Setup:**
```bash
# Enable navigation prompts for test users
FEATURE_AI_NAV_PROMPTS_ENABLED=true
FEATURE_AI_TEST_USERS=user-test-123,user-test-456
```

**Test Cases:**

1. **Test: Navigation Without AI (Regular User)**
   ```
   Login as regular user
   → Start navigation
   → Move around
   → Verify: No AI prompts (navigation works normally)
   ```
   **Expected:** ✅ Regular navigation
   **Risk:** 0% - Regular users unaffected

2. **Test: Navigation With AI (Test User)**
   ```
   Login as test user
   → Start voice session
   → Start navigation
   → Move around
   → Verify: AI speaks navigation prompts
   ```
   **Expected:** ✅ AI prompts during navigation
   **Risk:** <1% - Test users only, wrapped in try-catch

3. **Test: AI Prompt Types**
   ```
   Approaching gate → "You're approaching Bab al-Salam"
   Turn needed → "Turn right in 10 meters"
   Lap complete → "You've completed lap 3 of Tawaf"
   Stage change → "Time to pray 2 rakahs at Maqam Ibrahim"
   ```
   **Expected:** ✅ Context-aware prompts
   **Risk:** <1% - Test users only

4. **Test: AI Fails, Navigation Continues**
   ```
   1. Start navigation with AI
   2. Disable OpenAI API key temporarily
   3. Continue navigating
   4. Verify: Navigation still works (AI just silent)
   ```
   **Expected:** ✅ Navigation unaffected by AI failure
   **Risk:** 0% - AI wrapped in try-catch

---

### Phase 4: Canary Rollout (Week 4-5)

**Goal:** Gradually enable for production users

**Setup:**
```bash
# Enable for 10% of users
FEATURE_AI_ROLLOUT_PERCENTAGE=10

# All features enabled
FEATURE_AI_ENABLED=true
FEATURE_AI_REALTIME_ENABLED=true
FEATURE_AI_NAV_PROMPTS_ENABLED=true
```

**Test Cases:**

1. **Monitor Metrics**
   ```
   Go to Grafana Dashboard
   → Check AI metrics panel
   → Verify:
     - Request rate looks normal
     - Error rate < 1%
     - Latency < 2s
     - Cost tracking working
   ```
   **Expected:** ✅ Metrics healthy
   **Action if not:** Reduce rollout % or disable

2. **Test Random Users**
   ```
   Create 10 new test accounts
   → ~1 should have AI enabled
   → ~9 should not have AI (regular experience)
   ```
   **Expected:** ✅ ~10% have AI
   **Risk:** 10% - Limited blast radius

3. **Increase Rollout Gradually**
   ```
   Day 1: 10% (monitor 24 hours)
   Day 2: 25% (monitor 24 hours)
   Day 3: 50% (monitor 24 hours)
   Day 4: 100% (monitor 1 week)
   ```
   **Expected:** ✅ Gradual, safe rollout
   **Risk:** Controlled, can rollback at any step

---

## 🔥 Emergency Rollback Procedures

### Option 1: Instant Disable (30 seconds)

**When:** AI has bugs, errors, or issues

**How:**
```bash
# In Koyeb dashboard → Services → umrah-backend → Settings → Environment
# Change these variables:

FEATURE_AI_ENABLED=false
FEATURE_AI_REALTIME_ENABLED=false
FEATURE_AI_NAV_PROMPTS_ENABLED=false

# OR use kill switch:
EMERGENCY_KILL_SWITCH=true

# Click "Update"
# Takes effect in ~30 seconds
```

**Result:** AI instantly disabled, navigation continues working

---

### Option 2: Reduce Rollout (1 minute)

**When:** Issues with some users, but not critical

**How:**
```bash
# Reduce rollout percentage
FEATURE_AI_ROLLOUT_PERCENTAGE=0  # Back to 0%
# OR
FEATURE_AI_ROLLOUT_PERCENTAGE=5  # Reduce to 5%
```

**Result:** Fewer users affected

---

### Option 3: Deployment Rollback (5 minutes)

**When:** Critical issues, need to restore previous version

**How:**
```bash
# In Koyeb dashboard → Deployments → Select previous deployment → Rollback
```

**Result:** Entire backend rolled back (AI code removed)

---

## 📊 Test Scenarios - Complete List

### Scenario 1: First-Time User (No AI)
```
1. User creates account
2. User starts navigation
3. Verify: Standard experience (no AI)
4. Verify: All features work
```
**Expected:** ✅ Perfect experience
**Risk:** 0%

---

### Scenario 2: Test User (AI Enabled)
```
1. Test user logs in
2. Starts voice session
3. Asks: "What are the steps of Umrah?"
4. AI responds with guidance
5. Starts navigation
6. AI provides real-time prompts
7. Uses voice command: "Show timeline"
8. Timeline opens
```
**Expected:** ✅ Full AI experience
**Risk:** <1% - Test user only

---

### Scenario 3: Regular User (Canary Rollout)
```
User A (not in 10%):
→ Standard experience, no AI

User B (in 10%):
→ Sees "Enable Voice Guide" button
→ Can opt-in to AI features
→ Gets AI experience
```
**Expected:** ✅ Gradual rollout works
**Risk:** 10% - Controlled

---

### Scenario 4: AI Failure
```
1. User with AI enabled
2. OpenAI API fails
3. Verify: Navigation continues
4. Verify: No crashes or errors
5. Verify: User can continue Umrah/Hajj
```
**Expected:** ✅ Graceful degradation
**Risk:** 0% - Try-catch wrappers

---

### Scenario 5: Multi-Language
```
User 1: English
→ Say: "What is Tawaf?"
→ AI responds in English

User 2: French
→ Say: "Qu'est-ce que le Tawaf?"
→ AI responds in French

User 3: Arabic
→ Say: "ما هو الطواف؟"
→ AI responds in Arabic
```
**Expected:** ✅ Auto-detection works
**Risk:** <1%

---

## 📈 Success Metrics to Monitor

### Technical Metrics (Grafana)

| Metric | Target | Alert If |
|--------|--------|----------|
| AI request rate | <100/min | >500/min |
| AI response latency | <2s | >5s |
| AI error rate | <1% | >5% |
| Voice session success rate | >95% | <90% |
| Navigation latency | <100ms | >200ms |
| OpenAI cost/day | <$200 | >$300 |

### User Experience Metrics

| Metric | Target | Method |
|--------|--------|--------|
| Voice quality rating | >4/5 | User survey |
| Navigation help rating | >4/5 | User survey |
| Multi-language accuracy | >90% | Testing |
| Voice command success | >90% | Testing |

---

## 🐛 Bug Reporting

### Report Format

```markdown
**Bug Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Environment:**
- Feature flags enabled: [list]
- User type: Test user / Regular user / Canary user
- Device: iOS / Android / Desktop
- Browser: [if web]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Impact:**
- Navigation broken? Yes / No
- Can user continue? Yes / No
- Data loss? Yes / No

**Screenshots/Logs:**
[Attach if available]

**Suggested Fix:**
- [ ] Disable feature flag
- [ ] Rollback deployment
- [ ] Needs code fix
```

---

## 📞 Support Contacts

**For Critical Issues (Production Down):**
- Disable feature flags immediately (see Emergency Rollback)
- Contact: DevOps team

**For AI-Specific Issues:**
- Check OpenAI API status: status.openai.com
- Verify feature flags are set correctly
- Check Grafana dashboard

**For Testing Questions:**
- Reference: AI_GUIDE_PRODUCTION_INTEGRATION_PLAN.md
- Reference: AI_GUIDE_ZERO_RISK_STRATEGY.md

---

## ✅ Test Sign-Off Checklist

### Phase 1: Features Disabled
- [ ] Existing navigation works
- [ ] AI endpoints return 404
- [ ] Voice token works
- [ ] No errors in logs
- [ ] No performance regression

### Phase 2: Test Users Only
- [ ] AI works for test users
- [ ] AI disabled for regular users
- [ ] Voice chat works
- [ ] Multi-language works
- [ ] Voice commands work
- [ ] No impact on regular users

### Phase 3: Navigation Prompts
- [ ] Regular users unaffected
- [ ] AI prompts work for test users
- [ ] Context-aware prompts correct
- [ ] AI failure doesn't break nav
- [ ] Performance acceptable

### Phase 4: Canary Rollout
- [ ] 10% rollout successful
- [ ] Metrics healthy
- [ ] User feedback positive
- [ ] Error rate acceptable
- [ ] Cost within budget
- [ ] Can scale to 100%

### Final Production Release
- [ ] All tests passed
- [ ] Documentation complete
- [ ] Rollback procedures verified
- [ ] Team trained on emergency procedures
- [ ] Monitoring alerts configured
- [ ] User feedback mechanism in place

---

## 📚 Additional Documentation

1. **AI_GUIDE_PRODUCTION_INTEGRATION_PLAN.md** - Implementation details
2. **AI_GUIDE_ZERO_RISK_STRATEGY.md** - Safety strategy
3. **AI_GUIDE_EXPECTED_OUTPUTS.md** - Deliverables
4. **QURAN_DATA_COMPLETE_REPORT.md** - Quran completion (done)

---

**Testing Start Date:** [To be filled]
**Testing Team Lead:** [To be filled]
**Expected Completion:** 4-6 weeks from start
**Production Ready:** After all phases passed

---

**✨ Remember:** All features are disabled by default. You control the rollout. If anything goes wrong, disable instantly. Zero risk!
