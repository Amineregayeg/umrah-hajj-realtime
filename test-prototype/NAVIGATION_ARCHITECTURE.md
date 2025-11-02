# Navigation Module Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Navigation Testing Module                     │
│                         (Browser-Based)                          │
└─────────────────────────────────────────────────────────────────┘

                              │
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │   HTML   │        │    JS    │        │   CSS    │
    │ Interface│◄──────►│  Module  │◄──────►│  Styles  │
    └──────────┘        └──────────┘        └──────────┘
          │                   │                   │
          │                   │ Fetch API         │
          │                   │ Calls             │
          │                   ▼                   │
          │          ┌─────────────────┐          │
          │          │  Backend API    │          │
          │          │     (Koyeb)     │          │
          │          └─────────────────┘          │
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                     User Interaction
```

## File Structure

```
test-prototype/
│
├── navigation-test.html              # Main HTML interface
│   ├── Page structure
│   ├── UI elements (canvas, buttons, panels)
│   ├── Script initialization
│   └── Event bindings
│
├── js/
│   └── nav-module.js                 # Core JavaScript module
│       ├── NavigationTester class
│       │   ├── Constructor (state initialization)
│       │   ├── API methods (fetch data)
│       │   ├── Transformation methods (coordinates)
│       │   ├── Rendering methods (canvas drawing)
│       │   ├── Event handlers (user interaction)
│       │   └── Utility methods (helpers)
│       │
│       └── Exported to window.NavigationTester
│
├── css/
│   └── nav-module.css                # Styling
│       ├── Layout (grid, flexbox)
│       ├── Components (buttons, panels)
│       ├── Canvas styling
│       ├── Responsive design
│       └── Animations
│
└── docs/
    ├── NAVIGATION_MODULE_README.md   # Complete documentation
    ├── NAVIGATION_QUICK_START.md     # User guide
    └── NAVIGATION_ARCHITECTURE.md    # This file
```

## Component Architecture

### NavigationTester Class

```javascript
class NavigationTester {
    // ┌─────────────────────────────────┐
    // │        State Management         │
    // └─────────────────────────────────┘

    constructor(apiBaseUrl) {
        // API Configuration
        this.apiBaseUrl

        // Canvas References
        this.canvas
        this.ctx

        // Data State
        this.graph          // Complete graph data
        this.stats          // Graph statistics

        // User State
        this.userPosition   // Current position {lat, lon, floor}
        this.nearestNode    // Nearest node to position
        this.currentRoute   // Calculated route data

        // Selection State
        this.selectedNodeFrom
        this.selectedNodeTo
        this.selectionMode  // 'from', 'to', or null

        // View State
        this.viewOffset     // Pan offset {x, y}
        this.zoomLevel      // Zoom multiplier
        this.currentFloor   // Active floor number

        // Coordinate System
        this.bounds         // Min/max lat/lon for transformation

        // Animation State
        this.pulsePhase     // For pulsing dot animation
        this.animationFrame // RequestAnimationFrame ID
    }

    // ┌─────────────────────────────────┐
    // │      Initialization Flow        │
    // └─────────────────────────────────┘

    async init() {
        1. Get canvas element and context
        2. Set canvas dimensions
        3. Setup event listeners
        4. Load graph data from API
        5. Load statistics from API
        6. Calculate coordinate bounds
        7. Center view
        8. Start animation loop
        9. Initial render
    }

    // ┌─────────────────────────────────┐
    // │        API Methods              │
    // └─────────────────────────────────┘

    async loadGraph()         // GET /nav/graph/graph
    async loadStats()         // GET /nav/graph/stats
    async calculateRoute()    // POST /nav/graph/route

    // ┌─────────────────────────────────┐
    // │   Coordinate Transformation     │
    // └─────────────────────────────────┘

    calculateBounds()                      // Find min/max lat/lon
    transformCoordinates(lat, lon)         // WGS84 → Canvas
    inverseTransformCoordinates(x, y)      // Canvas → WGS84

    // ┌─────────────────────────────────┐
    // │      Position Management        │
    // └─────────────────────────────────┘

    updatePosition(lat, lon, floor)
    findNearestNode(lat, lon)
    calculateDistance(lat1, lon1, lat2, lon2)  // Haversine

    // ┌─────────────────────────────────┐
    // │       View Controls             │
    // └─────────────────────────────────┘

    zoom(factor)          // Zoom in/out
    centerView()          // Reset to center
    resetView()           // Full reset

    // ┌─────────────────────────────────┐
    // │      Event Handlers             │
    // └─────────────────────────────────┘

    handleCanvasClick(e)     // Position/node selection
    handleWheel(e)           // Zoom
    handleMouseDown(e)       // Pan start
    handleMouseMove(e)       // Pan drag
    handleMouseUp(e)         // Pan end

    // ┌─────────────────────────────────┐
    // │      Rendering Pipeline         │
    // └─────────────────────────────────┘

    render() {
        1. Clear canvas
        2. Draw background
        3. Draw grid
        4. Draw zones
        5. Draw edges
        6. Draw route (if exists)
        7. Draw nodes
        8. Draw user position
        9. Draw selected nodes
        10. Draw UI overlays
    }

    // Individual render methods:
    drawGrid()
    drawZones()
    drawEdges()
    drawNodes()
    drawUserPosition()
    drawRoute()
    drawRouteArrows()
    drawSelectedNodes()
    drawZoomIndicator()
}
```

## Data Flow

### 1. Graph Loading Flow

```
User Opens Page
      │
      ▼
NavigationTester.init()
      │
      ▼
loadGraph()
      │
      ├──► Fetch GET /nav/graph/graph
      │         │
      │         ▼
      │    Receive JSON response
      │         │
      │         ▼
      │    Parse nodes, edges, zones, floors
      │         │
      │         ▼
      │    Store in this.graph
      │
      ▼
calculateBounds()
      │
      ├──► Iterate all nodes
      │         │
      │         ▼
      │    Find min/max lat/lon
      │         │
      │         ▼
      │    Store in this.bounds
      │
      ▼
centerView()
      │
      ▼
render()
      │
      ▼
Display Graph on Canvas
```

### 2. Position Update Flow

```
User Clicks Canvas
      │
      ▼
handleCanvasClick(event)
      │
      ├──► Get canvas coordinates
      │         │
      │         ▼
      │    inverseTransformCoordinates()
      │         │
      │         ▼
      │    Get lat/lon coordinates
      │
      ▼
updatePosition(lat, lon, floor)
      │
      ├──► Store new position
      │         │
      │         ▼
      │    findNearestNode()
      │         │
      │         ├──► Filter nodes by floor
      │         │         │
      │         │         ▼
      │         │    Calculate distances (Haversine)
      │         │         │
      │         │         ▼
      │         │    Find minimum distance
      │         │         │
      │         │         ▼
      │         │    Store nearest node
      │         │
      │         ▼
      │    updatePositionDisplay()
      │
      ▼
render()
      │
      ▼
Show Red Dot + Nearest Node Line
```

### 3. Route Calculation Flow

```
User Selects Nodes & Clicks "Calculate Route"
      │
      ▼
calculateRoute()
      │
      ├──► Get from/to node IDs
      │         │
      │         ▼
      │    Validate inputs
      │         │
      │         ▼
      │    Fetch POST /nav/graph/route
      │         │
      │         └──► Body: {"from": "gate_a", "to": "gate_b"}
      │                     │
      │                     ▼
      │              Server calculates A* path
      │                     │
      │                     ▼
      │              Response: {path: [...], distance: X}
      │         │
      │         ▼
      │    Store in this.currentRoute
      │         │
      │         ▼
      │    displayRouteInfo()
      │
      ▼
render()
      │
      ├──► drawRoute()
      │         │
      │         ├──► Iterate path nodes
      │         │         │
      │         │         ▼
      │         │    Transform coordinates
      │         │         │
      │         │         ▼
      │         │    Draw orange line
      │         │
      │         ▼
      │    drawRouteArrows()
      │         │
      │         └──► Draw direction indicators
      │
      ▼
Display Route on Canvas
```

## Coordinate Transformation System

### WGS84 to Canvas Pipeline

```
Input: (lat, lon) in WGS84
      │
      ▼
┌─────────────────────────────────────┐
│  Step 1: Normalize to 0-1 Range    │
│                                     │
│  normalizedX = (lon - minLon) /    │
│                (maxLon - minLon)    │
│                                     │
│  normalizedY = 1 - (lat - minLat) /│
│                    (maxLat - minLat)│
│  (Note: Y flipped)                  │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Step 2: Scale to Canvas Size      │
│                                     │
│  x = padding +                      │
│      normalizedX * drawWidth        │
│                                     │
│  y = padding +                      │
│      normalizedY * drawHeight       │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  Step 3: Apply Zoom & Pan           │
│                                     │
│  x = (x - centerX) * zoom +         │
│      centerX + offsetX              │
│                                     │
│  y = (y - centerY) * zoom +         │
│      centerY + offsetY              │
└─────────────────────────────────────┘
      │
      ▼
Output: (x, y) on Canvas
```

### Canvas to WGS84 Pipeline (Reverse)

```
Input: (x, y) on Canvas
      │
      ▼
Remove Zoom & Pan → Unscale → Unnormalize → Output: (lat, lon)
```

## Rendering Pipeline Details

```
┌────────────────────────────────────────────────────────────┐
│                    render() Method                          │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  1. Clear Canvas                       │
    │     ctx.clearRect(0, 0, width, height) │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  2. Draw Background                    │
    │     fillStyle = '#f8f9fa'              │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  3. Draw Grid (every 50px)             │
    │     For each gridline: stroke gray     │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  4. Draw Zones (filled polygons)       │
    │     For each zone on current floor:    │
    │       - Transform polygon points       │
    │       - Fill with transparent blue     │
    │       - Stroke border                  │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  5. Draw Edges (lines between nodes)   │
    │     For each edge on current floor:    │
    │       - Get from/to nodes              │
    │       - Transform coordinates          │
    │       - Draw gray line                 │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  6. Draw Route (if exists)             │
    │     If currentRoute:                   │
    │       - Draw thick orange path         │
    │       - Draw direction arrows          │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  7. Draw Nodes (colored circles)       │
    │     For each node on current floor:    │
    │       - Transform coordinates          │
    │       - Get color by node type         │
    │       - Draw filled circle             │
    │       - Draw white border              │
    │       - Draw label if nearest          │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  8. Draw User Position                 │
    │     If on current floor:               │
    │       - Draw pulsing outer glow        │
    │       - Draw red circle (pulsing size) │
    │       - Draw white center dot          │
    │       - Draw dashed line to nearest    │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  9. Draw Selected Nodes                │
    │     If selectedNodeFrom:               │
    │       - Draw green circle + "FROM"     │
    │     If selectedNodeTo:                 │
    │       - Draw red circle + "TO"         │
    └────────────────────────────────────────┘
                          │
                          ▼
    ┌────────────────────────────────────────┐
    │  10. Draw UI Overlays                  │
    │      - Zoom level indicator            │
    │      - Floor label (if needed)         │
    └────────────────────────────────────────┘
```

## Event Handling System

```
┌──────────────────────────────────────────────────────────────┐
│                    Event Flow Diagram                         │
└──────────────────────────────────────────────────────────────┘

User Action
      │
      ├─── Mouse Click ────────► handleCanvasClick()
      │                                │
      │                                ├─ In Selection Mode?
      │                                │    YES → Select Node
      │                                │     NO → Update Position
      │                                │
      │                                └─► render()
      │
      ├─── Mouse Wheel ────────► handleWheel()
      │                                │
      │                                ├─ Calculate zoom factor
      │                                ├─ Update zoomLevel
      │                                │
      │                                └─► render()
      │
      ├─── Mouse Down ─────────► handleMouseDown()
      │                                │
      │                                ├─ Set isPanning = true
      │                                └─ Store mouse position
      │
      ├─── Mouse Move ─────────► handleMouseMove()
      │                                │
      │                                ├─ If isPanning?
      │                                │    YES → Calculate delta
      │                                │         Update viewOffset
      │                                │         render()
      │                                │
      │                                └─ NO → Do nothing
      │
      ├─── Mouse Up ───────────► handleMouseUp()
      │                                │
      │                                └─ Set isPanning = false
      │
      ├─── Button Click ───────► Button Event Handlers
      │                                │
      │                                ├─ Zoom In/Out → zoom()
      │                                ├─ Reset View → resetView()
      │                                ├─ Select From → setSelectionMode('from')
      │                                ├─ Select To → setSelectionMode('to')
      │                                ├─ Calculate → calculateRoute()
      │                                └─ Clear → clearRoute()
      │
      └─── Keyboard ───────────► Key Event Handler
                                       │
                                       ├─ '+' → zoom(1.2)
                                       ├─ '-' → zoom(0.8)
                                       ├─ 'Escape' → cancel selection
                                       └─ 'Ctrl+R' → resetView()
```

## State Management

```
Application State Tree
│
├── Data State
│   ├── graph (immutable after load)
│   │   ├── nodes[]
│   │   ├── edges[]
│   │   ├── zones[]
│   │   ├── floors[]
│   │   └── connectors[]
│   │
│   └── stats (immutable after load)
│       ├── nodeCount
│       ├── edgeCount
│       ├── floorCount
│       └── zoneCount
│
├── User State (mutable)
│   ├── userPosition {lat, lon, floor}
│   ├── nearestNode (reference to node)
│   ├── nearestDistance (number)
│   ├── selectedNodeFrom (reference or null)
│   ├── selectedNodeTo (reference or null)
│   └── currentRoute (object or null)
│
├── View State (mutable)
│   ├── viewOffset {x, y}
│   ├── zoomLevel (number)
│   ├── currentFloor (number)
│   └── selectionMode ('from'|'to'|null)
│
├── Animation State (mutable)
│   ├── pulsePhase (0 to 2π)
│   └── animationFrame (ID)
│
└── Coordinate System (computed once)
    └── bounds {minLat, maxLat, minLon, maxLon}
```

## Performance Considerations

### Optimizations Implemented

1. **Floor Filtering**
   ```
   Only render nodes/edges on current floor
   → Reduces draw calls significantly
   ```

2. **RequestAnimationFrame**
   ```
   Smooth 60fps animations
   → Synced with display refresh rate
   ```

3. **Event Delegation**
   ```
   Single canvas element handles all drawing
   → No individual node elements
   ```

4. **Coordinate Caching**
   ```
   Bounds calculated once on load
   → Transformation is pure function
   ```

5. **Selective Rendering**
   ```
   Only redraw on state changes
   → Animation loop only updates pulse phase
   ```

### Potential Bottlenecks (for large graphs)

```
1000+ Nodes
      │
      ├─ Problem: Too many draw calls
      └─ Solution: Viewport culling, LOD

1000+ Edges
      │
      ├─ Problem: Canvas overdraw
      └─ Solution: Spatial indexing, visibility check

Real-time Updates
      │
      ├─ Problem: Frequent redraws
      └─ Solution: Throttle updates, dirty regions

Complex Routes
      │
      ├─ Problem: Arrow rendering cost
      └─ Solution: Limit arrow count, simplify path
```

## Extension Points

### Adding New Features

1. **New Node Types**
   ```javascript
   // In getNodeColor() method
   if (node.kind === 'new_type') return '#custom_color';
   ```

2. **Custom Visualizations**
   ```javascript
   // Add new draw method
   drawCustomFeature() {
       // Your rendering code
   }

   // Call in render()
   this.drawCustomFeature();
   ```

3. **Additional API Endpoints**
   ```javascript
   async loadCustomData() {
       const response = await fetch(`${this.apiBaseUrl}/custom/endpoint`);
       return await response.json();
   }
   ```

4. **New Interactions**
   ```javascript
   // Add event listener in setupEventListeners()
   this.canvas.addEventListener('dblclick', (e) => {
       this.handleDoubleClick(e);
   });
   ```

## Testing Strategy

```
Unit Level
    │
    ├─ Coordinate transformation accuracy
    ├─ Distance calculation (Haversine)
    ├─ Nearest node algorithm
    └─ Bounds calculation

Integration Level
    │
    ├─ API connectivity (test-nav-api.js)
    ├─ Data parsing and validation
    ├─ Route visualization
    └─ Event handler chains

System Level
    │
    ├─ Full user workflows
    ├─ Cross-browser compatibility
    ├─ Responsive design
    └─ Performance under load
```

## Deployment Architecture

```
┌───────────────────────────────────────────────────────────┐
│                  Client (Browser)                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Static Files (HTML, CSS, JS)                       │  │
│  │  - Can be served from any web server                │  │
│  │  - No build step required                           │  │
│  │  - Pure vanilla JavaScript                          │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          │ Fetch API
                          ▼
┌───────────────────────────────────────────────────────────┐
│              Backend API (Koyeb)                           │
│  https://psychological-jilli-amineregayeg-1fe35444...    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  /nav/graph/graph   - GET  - Returns full graph    │  │
│  │  /nav/graph/stats   - GET  - Returns statistics    │  │
│  │  /nav/graph/route   - POST - Calculates route      │  │
│  │  /nav/graph/nodes/X - GET  - Returns node details  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Security Considerations

```
Frontend Security
    │
    ├─ No sensitive data stored
    ├─ API key not required (public API)
    ├─ CORS handled by backend
    └─ XSS protection (no innerHTML with user input)

API Security
    │
    ├─ HTTPS only
    ├─ CORS whitelist
    ├─ Rate limiting (backend)
    └─ Input validation (backend)
```

---

This architecture provides a solid foundation for testing navigation functionality with clear separation of concerns and extensibility for future enhancements.
