# Navigation Module - Quick Start Guide

## Instant Setup

### 1. Open the Interface

Simply open `navigation-test.html` in your web browser:

```bash
# If you have a local web server:
cd /mnt/d/umrah-hajj-realtime/test-prototype
python3 -m http.server 8080
# Then open: http://localhost:8080/navigation-test.html

# Or just double-click navigation-test.html in your file explorer
```

**Live API:** https://psychological-jilli-amineregayeg-1fe35444.koyeb.app

### 2. What You'll See

When the page loads, you'll see:
- **Left Side:** Large canvas showing the navigation graph
- **Right Side:** Control panel with statistics, position info, and route controls
- **Top:** Status bar showing loading progress

## 5-Minute Tutorial

### Step 1: View the Graph (Automatic)
- The graph loads automatically on page load
- You'll see nodes (colored dots) and edges (lines) on the canvas
- Statistics appear in the top-right panel

**What the colors mean:**
- 🟢 Green = Gate nodes
- 🔵 Blue = Hall nodes
- 🟡 Yellow = Entrance nodes
- 🔴 Red = Exit nodes
- 🟣 Purple = Connector nodes

### Step 2: Set Your Position
1. **Click anywhere** on the canvas
2. A large **red pulsing dot** appears at your click location
3. The "Current Position" panel shows:
   - Your GPS coordinates (lat/lon)
   - Current floor
   - Nearest node ID and distance

**Try it:** Click different spots to see how the nearest node changes!

### Step 3: Navigate the View
- **Pan:** Click and drag anywhere on the canvas
- **Zoom In:** Scroll up with mouse wheel OR click "Zoom In (+)"
- **Zoom Out:** Scroll down OR click "Zoom Out (-)"
- **Reset:** Click "Reset View" to center everything

### Step 4: Calculate a Route
1. Click the green **"Select From"** button
2. Click any **node** on the canvas (it turns green with "FROM" label)
3. Click the red **"Select To"** button
4. Click a **different node** (it turns red with "TO" label)
5. Click **"Calculate Route"**
6. An **orange path with arrows** appears showing the route!

**The "Route Calculator" panel shows:**
- Number of steps
- Total distance in meters
- Complete path as node IDs

### Step 5: Change Floors (if multi-floor)
- Use the **"Floor" dropdown** at the bottom of the canvas
- The view updates to show only nodes/edges on that floor

## Common Tasks

### Task: Find Distance to Nearest Point of Interest
1. Click on canvas at your location
2. Look at "Current Position" panel
3. Read "Nearest Node" distance

### Task: Plan a Walking Route
1. Select your starting node
2. Select your destination node
3. Calculate route
4. Note the distance and path
5. Follow the orange arrows on screen

### Task: Explore a Large Graph
1. Use mouse wheel to zoom in/out
2. Click and drag to pan around
3. Click "Reset View" if you get lost

### Task: Test Different Positions
1. Click multiple locations rapidly
2. Watch the nearest node change
3. Observe distances update in real-time

## Keyboard Shortcuts

- **+** or **=** → Zoom in
- **-** → Zoom out
- **Ctrl+R** → Reset view
- **Escape** → Cancel node selection

## Understanding the Display

### Main Canvas Elements

**Nodes (Dots):**
- Small colored circles representing locations
- Color indicates type (gate, hall, etc.)
- Click to select for routing

**Edges (Lines):**
- Gray lines connecting nodes
- Show possible paths between locations

**Your Position (Red Dot):**
- Large pulsing red circle
- Dashed line connects to nearest node
- Moves when you click

**Route (Orange Path):**
- Thick orange line
- Arrows show direction
- Only visible after calculating route

**Selected Nodes:**
- Green circle + "FROM" label = Start point
- Red circle + "TO" label = End point

### Control Panel Sections

**1. Graph Statistics**
- Total nodes, edges, floors, zones
- Updates automatically on load

**2. Current Position**
- Your coordinates (lat, lon, floor)
- Nearest node and distance
- Updates when you click canvas

**3. Route Calculator**
- Input fields for from/to nodes
- Calculate/Clear buttons
- Route details after calculation

**4. Legend**
- Color guide for all node types
- Shows what each color means

**5. How to Use**
- Quick instructions
- Always visible for reference

## Troubleshooting

### Problem: Graph doesn't load
**Solution:**
- Check browser console (F12) for errors
- Verify internet connection
- Ensure API URL is accessible
- Try refreshing the page

### Problem: Can't click nodes
**Solution:**
- Make sure you clicked "Select From" or "Select To" first
- Zoom in if nodes are too small
- Check you're not in pan mode (if dragging)

### Problem: Route doesn't appear
**Solution:**
- Verify both nodes are on the same floor
- Check "From" and "To" are different nodes
- Look at status bar for error messages
- Try selecting nodes again

### Problem: Canvas is blank
**Solution:**
- Wait for loading (check status bar)
- Check if graph has data
- Try clicking "Reset View"
- Refresh the page

### Problem: Position doesn't move
**Solution:**
- Make sure you're clicking on canvas, not outside
- Check if you're in node selection mode (green/red buttons active)
- Press Escape to exit selection mode

## Tips & Tricks

### Tip 1: Precise Node Selection
- Zoom in close before selecting nodes
- Node IDs appear when you hover near them
- Use the input fields to type node IDs manually if you know them

### Tip 2: Exploring Large Graphs
- Start zoomed out to see overall structure
- Zoom into areas of interest
- Use pan (drag) to move around smoothly

### Tip 3: Testing Routes
- Calculate routes between distant nodes to test long paths
- Try adjacent nodes to test short paths
- Mix different node types (gate to hall, etc.)

### Tip 4: Performance
- Stick to one floor at a time for large graphs
- Reset view if things get sluggish
- Close other browser tabs if needed

### Tip 5: Visual Clarity
- The red dot pulses to stay visible
- Dashed line shows your connection to graph
- Orange route stands out from gray edges

## API Information

The module uses these backend endpoints:

**GET /nav/graph/graph**
- Loads complete navigation graph
- Returns nodes, edges, zones, floors

**GET /nav/graph/stats**
- Gets graph statistics
- Returns counts of elements

**POST /nav/graph/route**
- Calculates optimal route
- Body: `{"from": "node_a", "to": "node_b"}`
- Returns path and distance

**GET /nav/graph/nodes/:nodeId**
- Gets specific node details
- Returns node information

**Current API Status:** ✅ All endpoints operational (tested successfully)

## Sample Workflow

Here's a complete example using the current graph:

1. **Open navigation-test.html** in browser
2. **Wait for load** (status shows "Graph loaded: 6 nodes")
3. **Click** near coordinates (21.4225, 39.8262)
4. **Observe** "Nearest Node: gate_a (X.X m)"
5. **Click "Select From"** button
6. **Click** on gate_a node (green dot at top)
7. **Click "Select To"** button
8. **Click** on gate_b node (another green dot)
9. **Click "Calculate Route"**
10. **See** orange path: gate_a → poi_1 → gate_b
11. **Read** "Distance: 151.9m" in Route Calculator panel

## Next Steps

### For Developers
- Review `js/nav-module.js` for implementation details
- Check `NAVIGATION_MODULE_README.md` for full documentation
- Run `node test-nav-api.js` to test API connectivity

### For Testers
- Test all node types and combinations
- Verify routes on different floors
- Report any visual glitches or errors

### For Integration
- Use the API endpoints in your own applications
- Refer to the response formats in README
- Check CORS settings if calling from different domains

## Support

**Files to Check:**
- `NAVIGATION_MODULE_README.md` - Complete technical documentation
- `test-nav-api.js` - API connectivity tests
- Browser console (F12) - Error messages and logs

**Common Questions:**

**Q: Can I use this with real GPS coordinates?**
A: Yes! The module accepts any WGS84 lat/lon coordinates. Just modify the API or mock data.

**Q: How do I add more nodes?**
A: Edit the backend graph data. The frontend automatically renders any nodes in the API response.

**Q: Can I customize colors?**
A: Yes! Edit `css/nav-module.css` and modify the color variables or node color logic in `js/nav-module.js`.

**Q: Does it work on mobile?**
A: Yes! The design is responsive. Touch works for tap, drag, and pinch-zoom.

**Q: Can I export the route?**
A: Not currently, but you can add export functionality by accessing `navTester.currentRoute` in browser console.

## Quick Reference

### Mouse Actions
| Action | Result |
|--------|--------|
| Click empty space | Set position |
| Click node (in selection mode) | Select node for route |
| Drag | Pan view |
| Scroll | Zoom in/out |

### Button Functions
| Button | Action |
|--------|--------|
| Select From | Enter "from" selection mode |
| Select To | Enter "to" selection mode |
| Calculate Route | Request route from API |
| Clear Route | Remove route and selections |
| Zoom In (+) | Zoom in 20% |
| Zoom Out (-) | Zoom out 20% |
| Reset View | Center and reset zoom |

### Color Legend
| Color | Node Type |
|-------|-----------|
| 🟢 Green | Gate |
| 🔵 Blue | Hall |
| 🟡 Yellow | Entrance |
| 🔴 Red | Exit |
| 🟣 Purple | Connector |

### Status Messages
| Color | Meaning |
|-------|---------|
| Blue | Information |
| Green | Success |
| Red | Error |
| Yellow | Warning |

---

**Ready to test?** Open `navigation-test.html` and start exploring!
