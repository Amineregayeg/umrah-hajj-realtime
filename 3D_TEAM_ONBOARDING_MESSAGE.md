# Welcome to the Umrah & Hajj Real-time Navigation Project! 🕋

Dear 3D Team,

We're excited to have you integrate your 3D visualization with our real-time navigation backend! This message will guide you through accessing the repository, understanding the project structure, and starting your integration work.

---

## 📍 Repository Access

**GitHub Repository:**
🔗 https://github.com/Amineregayeg/umrah-hajj-realtime

**Branch for Integration:**
`deploy/koyeb-setup` (latest stable branch with all documentation)

**Clone the Repository:**
```bash
git clone https://github.com/Amineregayeg/umrah-hajj-realtime.git
cd umrah-hajj-realtime
git checkout deploy/koyeb-setup
```

---

## 📚 Essential Documentation (Start Here!)

### **Primary Documentation for 3D Team**

#### 1. **3D_TEAM_INTEGRATION_GUIDE.md** ⭐ **START HERE**
📄 Location: `/3D_TEAM_INTEGRATION_GUIDE.md`
🔗 GitHub: https://github.com/Amineregayeg/umrah-hajj-realtime/blob/deploy/koyeb-setup/3D_TEAM_INTEGRATION_GUIDE.md

**This is your primary reference!** It contains:
- ✅ Quick start guide with authentication
- ✅ Complete coordinate system transformations (WGS84 ↔ Local XYZ)
- ✅ Navigation graph structure and API endpoints
- ✅ Real-time position tracking via WebSocket
- ✅ **Full Three.js implementation example** (copy-paste ready!)
- ✅ Performance optimization techniques
- ✅ Troubleshooting guide

**Estimated reading time:** 30-45 minutes
**Code examples included:** Yes, production-ready Three.js code

---

#### 2. **ENVIRONMENT_CONFIGURATION.md**
📄 Location: `/ENVIRONMENT_CONFIGURATION.md`
🔗 GitHub: https://github.com/Amineregayeg/umrah-hajj-realtime/blob/deploy/koyeb-setup/ENVIRONMENT_CONFIGURATION.md

**Environment setup reference:**
- ✅ All environment variables explained
- ✅ Development vs Production configurations
- ✅ Database connection setup
- ✅ API keys and authentication setup
- ✅ Troubleshooting common configuration issues

---

### **Backend API Documentation**

#### 3. **Swagger API Documentation** (Interactive!)
🌐 **Production:** https://umrah-hajj-backend.koyeb.app/docs
🌐 **Local:** http://localhost:3000/docs (when running backend)

**Live API documentation where you can:**
- Browse all 54+ REST endpoints
- See request/response schemas
- Test endpoints directly in browser
- Get code examples in multiple languages

---

#### 4. **Backend Source Code**
📁 Location: `/apps/backend/src/`

**Key directories for 3D integration:**
- `/nav/` - Navigation system and WebSocket gateway
- `/nav/graph/` - Graph data structures and pathfinding
- `/nav/services/` - HMM map-matching and correction services
- `/nav/schemas/` - WebSocket message validation schemas
- `/quran/` - Quran content API

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Get Backend Running Locally

```bash
# Install dependencies (requires Node.js 20.x)
cd apps/backend
pnpm install

# Set up environment
cp .env.example .env
# Edit .env and add your credentials (see ENVIRONMENT_CONFIGURATION.md)

# Run database migrations
pnpm run prisma:generate
pnpm run prisma:migrate

# Start backend
pnpm run start:dev
```

**Expected output:**
```
Application starting on port 3000
Swagger documentation available at http://localhost:3000/docs
WebSocket server initialized (sharing HTTP server port)
```

### Step 2: Test Backend APIs

```bash
# Test health endpoint
curl http://localhost:3000/metrics/healthz

# Get navigation graph
curl http://localhost:3000/nav/graph/graph

# View API docs
open http://localhost:3000/docs
```

### Step 3: Review 3D Integration Guide

Open `3D_TEAM_INTEGRATION_GUIDE.md` and jump to:
- **Section 3:** Coordinate System & Transformations
- **Section 4:** Navigation Graph Integration
- **Section 8:** Complete Three.js Example (copy-paste ready!)

---

## 🎯 Your Integration Checklist

### Phase 1: Foundation (Week 1)
- [ ] Clone repository and set up development environment
- [ ] Read `3D_TEAM_INTEGRATION_GUIDE.md` sections 1-5
- [ ] Run backend locally and test API endpoints
- [ ] Fetch navigation graph via `/nav/graph/graph` endpoint
- [ ] Understand coordinate system (WGS84 → Local XYZ)

### Phase 2: Graph Visualization (Week 2)
- [ ] Implement coordinate transformation functions (provided in guide)
- [ ] Render navigation graph nodes in 3D scene
- [ ] Render navigation graph edges (walkable paths)
- [ ] Render zones (restricted areas) as polygons
- [ ] Test multi-floor rendering

### Phase 3: Real-time Integration (Week 3)
- [ ] Implement WebSocket connection (code example in guide)
- [ ] Subscribe to `nav.correction` events
- [ ] Update 3D avatar position from WebSocket updates
- [ ] Implement smooth position interpolation
- [ ] Add visual feedback for position confidence

### Phase 4: Advanced Features (Week 4)
- [ ] Implement pathfinding visualization
- [ ] Add floor transition animations
- [ ] Optimize rendering with LOD (Level of Detail)
- [ ] Add spatial indexing for performance
- [ ] Implement user interaction (click to navigate)

---

## 🔑 Key Concepts for 3D Team

### Coordinate System
**Backend uses WGS84 (GPS coordinates):**
- Latitude: 21.4225° (Kaaba area in Mecca)
- Longitude: 39.8262°
- Floor: 0 (ground), 1 (first), -1 (basement)

**You'll convert to local 3D coordinates:**
- X-axis: East (+) / West (-)
- Y-axis: Up (+) / Down (-) [elevation]
- Z-axis: North (+) / South (-)

**Conversion functions provided in guide!** (copy-paste ready)

### Navigation Graph Structure
```javascript
{
  floors: [...],      // Floor definitions
  nodes: [...],       // Points of interest (gates, landmarks)
  edges: [...],       // Walkable paths between nodes
  connectors: [...],  // Elevators/stairs between floors
  zones: [...]        // Restricted/logical areas
}
```

### Real-time Updates
**WebSocket broadcasts position corrections at 5Hz:**
```javascript
{
  event: 'nav.correction',
  data: {
    position: { lat: 21.4225, lon: 39.8262, floor: 0 },
    confidence: 0.85,  // 85% confidence
    snapTo: 'path',    // Snapped to graph edge
    delta: { x: 0.5, y: -0.2 }  // Correction in meters
  }
}
```

---

## 📞 Support & Communication

### Questions About Integration?

1. **Read the docs first:** `3D_TEAM_INTEGRATION_GUIDE.md` has 90% of answers
2. **Check Swagger:** http://localhost:3000/docs for API details
3. **Review code examples:** Complete Three.js example in Section 8 of guide
4. **Backend source:** Check `/apps/backend/src/nav/` for implementation details

### Report Issues

**GitHub Issues:**
🔗 https://github.com/Amineregayeg/umrah-hajj-realtime/issues

**When reporting an issue, include:**
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Code snippet (if relevant)
- Screenshots/videos (if visual issue)

---

## 🎨 What You're Building

### The Vision
Your 3D visualization will overlay on our real-time navigation system to provide pilgrims with:
- **Immersive 3D environment** of Masjid al-Haram
- **Real-time position tracking** with <2m accuracy (via HMM correction)
- **Multi-floor navigation** with smooth transitions
- **Pathfinding visualization** from current location to destination
- **Zone-based guidance** (restricted areas, prayer zones, etc.)

### Technical Specs
- **Backend:** NestJS + PostgreSQL + WebSocket (ws)
- **Navigation:** Graph-based pathfinding (A*/Dijkstra) + HMM map-matching
- **Accuracy:** ~2m median, ~4m P95
- **Update Rate:** 5Hz position corrections
- **Coordinate System:** WGS84 with local Cartesian conversion

---

## 📊 Current Backend Status

✅ **Production Deployment:** Healthy and running on Koyeb
✅ **API Endpoints:** 54+ endpoints fully functional
✅ **WebSocket:** Real-time updates working at 5Hz
✅ **Navigation Graph:** Complete multi-floor graph loaded
✅ **HMM Correction:** ~2m median accuracy achieved
✅ **Database:** PostgreSQL with full schema
✅ **Documentation:** Comprehensive guides ready

⚠️ **Known Limitations:**
- Authentication guards being finalized (use mock mode for development)
- Some endpoints still in beta (marked in Swagger docs)

---

## 🚀 Let's Get Started!

### Recommended First Steps:

1. **Today:** Clone repo, read Quick Start section of `3D_TEAM_INTEGRATION_GUIDE.md`
2. **This Week:** Set up local backend, fetch navigation graph, review Three.js example
3. **Next Week:** Begin implementing coordinate transformations and basic graph rendering
4. **Week 3:** Integrate WebSocket for real-time position updates
5. **Week 4:** Polish, optimize, and add advanced features

### Success Criteria:

By the end of your integration, you should be able to:
- ✅ Render the complete Masjid al-Haram navigation graph in 3D
- ✅ Display real-time position of pilgrims with smooth updates
- ✅ Visualize pathfinding routes between locations
- ✅ Handle multi-floor navigation seamlessly
- ✅ Achieve smooth 60 FPS rendering with good performance

---

## 📖 Documentation Reading Order

**For optimal onboarding, read in this order:**

1. **This message** (you're here!) - Overview and getting started
2. **3D_TEAM_INTEGRATION_GUIDE.md** - Your primary technical reference
3. **ENVIRONMENT_CONFIGURATION.md** - When setting up backend locally
4. **Swagger API Docs** (http://localhost:3000/docs) - API endpoint reference
5. **Backend source code** (/apps/backend/src/nav/) - When you need implementation details

---

## 🎉 We're Here to Help!

The comprehensive documentation has been created specifically for your team's success. Everything you need is in:
- ✅ `3D_TEAM_INTEGRATION_GUIDE.md` - Complete integration guide with code examples
- ✅ `ENVIRONMENT_CONFIGURATION.md` - Setup and configuration reference
- ✅ Swagger API Documentation - Live API testing and schemas
- ✅ Backend source code - Reference implementation

**You have everything you need to succeed!** 🚀

If you have questions after reviewing the documentation, we're here to support you.

---

**Welcome aboard, and happy coding!** 🕋✨

*The Umrah & Hajj Navigation Team*

---

**Repository:** https://github.com/Amineregayeg/umrah-hajj-realtime
**Branch:** `deploy/koyeb-setup`
**Documentation:** See links above
**API Docs:** https://umrah-hajj-backend.koyeb.app/docs
