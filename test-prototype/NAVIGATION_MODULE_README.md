# Navigation Testing Module - Documentation

## Overview

The Navigation Testing Module provides an interactive 2D visualization interface for testing the Umrah & Hajj backend navigation graph system. It features real-time position tracking, route calculation, and comprehensive graph visualization.

## Files Created

```
test-prototype/
├── navigation-test.html          # Main HTML interface
├── js/
│   └── nav-module.js             # Complete JavaScript module (NavigationTester class)
└── css/
    └── nav-module.css            # Professional styling
```

## Features

### Core Functionality

1. **Graph Visualization**
   - 2D top-down view of the complete navigation graph
   - Color-coded nodes by type (gates, halls, entrances, exits, connectors)
   - Edge connections between nodes
   - Zone polygons with semi-transparent overlay
   - Multi-floor support with floor filtering

2. **Interactive Position Tracking**
   - Click anywhere to set user position (red pulsing dot)
   - Real-time nearest node calculation with distance display
   - Visual line connecting position to nearest node
   - Smooth pulsing animation for user position marker

3. **Route Calculation**
   - Interactive node selection for from/to points
   - API-based route calculation
   - Visual route highlighting on canvas
   - Directional arrows showing route path
   - Route statistics (distance, steps, path)

4. **Navigation Controls**
   - Pan: Click and drag to move around
   - Zoom: Mouse wheel or zoom buttons
   - Reset view to center graph
   - Floor selector for multi-floor buildings

5. **Information Displays**
   - Graph statistics (nodes, edges, floors, zones)
   - Current position and nearest node
   - Route details and path
   - Real-time status messages

## API Endpoints Used

### GET `/nav/graph/graph`
Fetches the complete navigation graph structure.

**Response:**
```json
{
  "floors": [...],
  "nodes": [
    {
      "id": "gate_a",
      "lat": 21.4225,
      "lon": 39.8262,
      "floor": 0,
      "kind": "gate"
    }
  ],
  "edges": [
    {
      "from": "gate_a",
      "to": "hall_1",
      "weight": 50
    }
  ],
  "connectors": [...],
  "zones": [
    {
      "id": "zone_1",
      "floor": 0,
      "polygon": [
        { "lat": 21.422, "lon": 39.826 },
        { "lat": 21.423, "lon": 39.827 }
      ]
    }
  ]
}
```

### GET `/nav/graph/stats`
Fetches graph statistics.

**Response:**
```json
{
  "nodeCount": 150,
  "edgeCount": 300,
  "floorCount": 3,
  "zoneCount": 25
}
```

### POST `/nav/graph/route`
Calculates optimal route between two nodes.

**Request:**
```json
{
  "from": "gate_a",
  "to": "hall_5"
}
```

**Response:**
```json
{
  "path": ["gate_a", "hall_1", "hall_2", "hall_5"],
  "distance": 150.5
}
```

## Class Structure

### NavigationTester

Main class that handles all navigation testing functionality.

#### Constructor
```javascript
new NavigationTester(apiBaseUrl)
```
- `apiBaseUrl`: Base URL of the backend API

#### Key Methods

**Initialization:**
- `init()` - Initialize the module, load graph, set up canvas
- `setupEventListeners()` - Configure all event handlers

**Data Loading:**
- `loadGraph()` - Fetch navigation graph from API
- `loadStats()` - Fetch graph statistics from API

**Coordinate Transformation:**
- `transformCoordinates(lat, lon)` - Convert WGS84 to canvas coordinates
- `inverseTransformCoordinates(x, y)` - Convert canvas to WGS84 coordinates
- `calculateBounds()` - Calculate coordinate bounds for transformation

**Position Management:**
- `updatePosition(lat, lon, floor)` - Update user position
- `findNearestNode(lat, lon)` - Find closest node to position
- `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine distance calculation

**Route Calculation:**
- `calculateRoute()` - Request route from API
- `drawRoute()` - Visualize calculated route
- `drawRouteArrows(path)` - Draw directional arrows on route
- `clearRoute()` - Clear current route

**View Controls:**
- `zoom(factor)` - Zoom in/out
- `centerView()` - Center view on graph
- `resetView()` - Reset to initial view state

**Event Handlers:**
- `handleCanvasClick(e)` - Handle clicks for position/node selection
- `handleWheel(e)` - Handle zoom via mouse wheel
- `handleMouseDown/Move/Up(e)` - Handle pan via drag

**Rendering:**
- `render()` - Main render loop
- `drawGrid()` - Draw background grid
- `drawZones()` - Draw zone polygons
- `drawEdges()` - Draw node connections
- `drawNodes()` - Draw all nodes
- `drawUserPosition()` - Draw user position marker
- `drawSelectedNodes()` - Draw selected route nodes

## Usage Guide

### Basic Usage

1. **Open the Interface**
   ```
   Open navigation-test.html in a modern web browser
   ```

2. **View the Graph**
   - The graph loads automatically on page load
   - Nodes, edges, and zones are displayed
   - Statistics appear in the control panel

3. **Set Your Position**
   - Click anywhere on the canvas
   - Red pulsing dot appears at clicked location
   - Nearest node and distance are calculated

4. **Calculate a Route**
   - Click "Select From" button
   - Click a node on the canvas (it turns green with "FROM" label)
   - Click "Select To" button
   - Click another node (it turns red with "TO" label)
   - Click "Calculate Route"
   - Route appears as an orange path with arrows

5. **Navigate the View**
   - **Pan:** Click and drag on canvas
   - **Zoom:** Use mouse wheel or zoom buttons
   - **Reset:** Click "Reset View" button
   - **Change Floor:** Use floor dropdown selector

### Keyboard Shortcuts

- `+` or `=` - Zoom in
- `-` - Zoom out
- `Ctrl+R` - Reset view
- `Escape` - Cancel node selection mode

### Visual Elements

**Node Colors:**
- Green: Gate nodes
- Blue: Hall nodes
- Yellow: Entrance nodes
- Red: Exit nodes
- Purple: Connector nodes

**Special Markers:**
- Large red pulsing dot: Your position
- Dashed line: Connection to nearest node
- Green circle with "FROM": Route start point
- Red circle with "TO": Route end point
- Orange path with arrows: Calculated route

## Coordinate System

The module uses WGS84 (GPS) coordinates internally and transforms them to 2D canvas coordinates for visualization.

**Transformation Process:**
1. Calculate bounds (min/max lat/lon from all nodes)
2. Normalize coordinates to 0-1 range
3. Scale to canvas size with padding
4. Apply zoom and pan transformations
5. Flip Y-axis (canvas Y increases downward, lat increases upward)

**Formula:**
```javascript
// Normalize
normalizedX = (lon - minLon) / (maxLon - minLon)
normalizedY = 1 - (lat - minLat) / (maxLat - minLat)

// Scale to canvas
x = padding + normalizedX * (canvasWidth - 2 * padding)
y = padding + normalizedY * (canvasHeight - 2 * padding)

// Apply zoom and pan
x = (x - canvasWidth/2) * zoomLevel + canvasWidth/2 + offsetX
y = (y - canvasHeight/2) * zoomLevel + canvasHeight/2 + offsetY
```

## Customization

### Styling

Edit `css/nav-module.css` to customize:
- Colors (defined in CSS variables at top)
- Canvas size
- Button styles
- Panel layouts
- Responsive breakpoints

### Canvas Settings

In `nav-module.js` constructor:
```javascript
this.canvasWidth = 800;    // Canvas width in pixels
this.canvasHeight = 600;   // Canvas height in pixels
this.padding = 40;         // Padding around graph
```

### Node Visual Settings

In render methods:
```javascript
const radius = 6;  // Node circle radius
const lineWidth = 1;  // Edge line width
```

### Animation

Adjust pulsing speed in `startAnimation()`:
```javascript
this.pulsePhase = (this.pulsePhase + 0.05) % (Math.PI * 2);
// Increase 0.05 for faster pulse
```

## Troubleshooting

### Graph Not Loading

**Issue:** Canvas stays blank or shows "Loading..." indefinitely

**Solutions:**
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check CORS settings on backend
4. Ensure graph data is properly formatted

### Coordinate Transformation Issues

**Issue:** Nodes appear in wrong positions or outside canvas

**Solutions:**
1. Verify all nodes have valid lat/lon values
2. Check that bounds calculation includes all nodes
3. Ensure coordinate format is WGS84 (not Web Mercator)

### Route Not Displaying

**Issue:** Route calculates but doesn't appear on canvas

**Solutions:**
1. Verify route path contains valid node IDs
2. Check that nodes are on the currently selected floor
3. Ensure route color is distinct from background

### Performance Issues

**Issue:** Slow rendering or choppy animations

**Solutions:**
1. Reduce number of visible elements
2. Disable animations if not needed
3. Implement viewport culling for large graphs
4. Use requestAnimationFrame properly (already implemented)

## Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- Canvas API
- ES6 Classes
- Fetch API
- CSS Grid
- CSS Custom Properties

## Performance Considerations

**Optimizations Implemented:**
- Floor filtering reduces visible nodes
- Viewport-based rendering
- RequestAnimationFrame for smooth animations
- Event delegation
- Efficient coordinate transformation caching

**Large Graph Handling:**
For graphs with 1000+ nodes:
1. Implement viewport culling
2. Use quadtree for spatial queries
3. Cache transformed coordinates
4. Reduce animation complexity

## Future Enhancements

Potential improvements:
- [ ] 3D visualization option
- [ ] Real-time position tracking via GPS
- [ ] Multiple user positions
- [ ] Path animation along route
- [ ] Node search/filter
- [ ] Graph editing capabilities
- [ ] Export routes as JSON/GPX
- [ ] Indoor positioning system integration
- [ ] Accessibility improvements (keyboard navigation)

## Testing

**Manual Testing Checklist:**
- [ ] Graph loads without errors
- [ ] All nodes visible on canvas
- [ ] Click sets position correctly
- [ ] Nearest node calculation is accurate
- [ ] Route calculation works
- [ ] Route visualization is correct
- [ ] Zoom in/out functions
- [ ] Pan works smoothly
- [ ] Floor selector changes view
- [ ] Responsive on mobile devices

**API Testing:**
```bash
# Test graph endpoint
curl https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/nav/graph/graph

# Test stats endpoint
curl https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/nav/graph/stats

# Test route endpoint
curl -X POST https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/nav/graph/route \
  -H "Content-Type: application/json" \
  -d '{"from":"gate_a","to":"hall_1"}'
```

## License

Part of the Umrah & Hajj Real-time Navigation System.

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API connectivity
3. Review this documentation
4. Check backend API status

## Changelog

### Version 1.0.0 (2025-10-17)
- Initial release
- Complete graph visualization
- Interactive position tracking
- Route calculation and display
- Pan and zoom controls
- Multi-floor support
- Responsive design
- Comprehensive documentation
