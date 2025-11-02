/**
 * Navigation Testing Module with 2D Graph Visualization
 * Provides interactive testing of the navigation graph system
 * with real-time position tracking and route visualization
 */

class NavigationTester {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.canvas = null;
        this.ctx = null;
        this.graph = null;
        this.stats = null;

        // User position state
        this.userPosition = { lat: 21.4225, lon: 39.8262, floor: 0 };
        this.nearestNode = null;
        this.currentRoute = null;
        this.selectedNodeFrom = null;
        this.selectedNodeTo = null;

        // GPS tracking state
        this.gpsWatchId = null;
        this.isGPSTracking = false;
        this.lastGPSUpdate = null;

        // Canvas state
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.padding = 40;

        // Coordinate transformation bounds
        this.bounds = {
            minLat: Infinity,
            maxLat: -Infinity,
            minLon: Infinity,
            maxLon: -Infinity
        };

        // Pan and zoom state
        this.viewOffset = { x: 0, y: 0 };
        this.zoomLevel = 1;
        this.isPanning = false;
        this.lastMousePos = { x: 0, y: 0 };

        // Current floor filter (will be set after graph loads)
        this.currentFloor = null;

        // Animation state
        this.animationFrame = null;
        this.pulsePhase = 0;

        // Node selection mode
        this.selectionMode = null; // 'from', 'to', or null
    }

    /**
     * Initialize the navigation tester
     */
    async init() {
        this.canvas = document.getElementById('navCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;

        // Set up event listeners
        this.setupEventListeners();

        // Load graph data
        await this.loadGraph();
        await this.loadStats();

        // Set default floor to first available floor
        if (this.graph && this.graph.nodes && this.graph.nodes.length > 0) {
            this.currentFloor = this.graph.nodes[0].floor;
            console.log(`Default floor set to: ${this.currentFloor}`);
        }

        // Calculate bounds and initialize view
        this.calculateBounds();
        this.centerView();

        // Start animation loop
        this.startAnimation();

        // Initial render
        this.render();
    }

    /**
     * Set up canvas and UI event listeners
     */
    setupEventListeners() {
        // Canvas click for position/node selection
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Mouse drag for pan
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

        // UI controls
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const resetViewBtn = document.getElementById('resetView');
        const calculateRouteBtn = document.getElementById('calculateRoute');
        const clearRouteBtn = document.getElementById('clearRoute');
        const selectFromBtn = document.getElementById('selectFrom');
        const selectToBtn = document.getElementById('selectTo');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoom(1.2));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoom(0.8));
        if (resetViewBtn) resetViewBtn.addEventListener('click', () => this.resetView());
        if (calculateRouteBtn) calculateRouteBtn.addEventListener('click', () => this.calculateRoute());
        if (clearRouteBtn) clearRouteBtn.addEventListener('click', () => this.clearRoute());
        if (selectFromBtn) selectFromBtn.addEventListener('click', () => this.setSelectionMode('from'));
        if (selectToBtn) selectToBtn.addEventListener('click', () => this.setSelectionMode('to'));

        // Floor selector
        const floorSelect = document.getElementById('floorSelect');
        if (floorSelect) {
            floorSelect.addEventListener('change', (e) => {
                // Handle both string and numeric floor IDs
                const val = e.target.value;
                this.currentFloor = isNaN(val) ? val : parseInt(val);
                this.render();
            });
        }
    }

    /**
     * Load navigation graph from API
     */
    async loadGraph() {
        try {
            this.updateStatus('Loading navigation graph...', 'info');
            const response = await fetch(`${this.apiBaseUrl}/nav/graph/graph`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.graph = await response.json();
            this.updateStatus(`Graph loaded: ${this.graph.nodes?.length || 0} nodes`, 'success');

            // Populate floor selector
            this.populateFloorSelector();

            return this.graph;
        } catch (error) {
            this.updateStatus(`Failed to load graph: ${error.message}`, 'error');
            console.error('Graph load error:', error);
            throw error;
        }
    }

    /**
     * Load graph statistics from API
     */
    async loadStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/nav/graph/stats`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.stats = await response.json();
            this.displayStats();

            return this.stats;
        } catch (error) {
            console.error('Stats load error:', error);
            // Non-critical, continue without stats
        }
    }

    /**
     * Populate floor selector dropdown
     */
    populateFloorSelector() {
        const floorSelect = document.getElementById('floorSelect');
        if (!floorSelect || !this.graph || !this.graph.nodes) return;

        const floors = new Set();
        this.graph.nodes.forEach(node => {
            // Handle both numeric floor IDs and string floor IDs
            const floorId = typeof node.floor === 'string' ? node.floor : node.floor;
            floors.add(floorId);
        });

        floorSelect.innerHTML = '';

        // Sort floors (handle both string and numeric)
        const sortedFloors = Array.from(floors).sort((a, b) => {
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });

        sortedFloors.forEach(floor => {
            const option = document.createElement('option');
            option.value = floor;
            option.textContent = `Floor ${floor}`;
            floorSelect.appendChild(option);
        });
    }

    /**
     * Display graph statistics
     */
    displayStats() {
        if (!this.stats) return;

        const statsDiv = document.getElementById('graphStats');
        if (!statsDiv) return;

        // Handle nested graph object structure from API
        const graphStats = this.stats.graph || this.stats;

        statsDiv.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Nodes:</span>
                <span class="stat-value">${graphStats.nodes || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Edges:</span>
                <span class="stat-value">${graphStats.edges || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Floors:</span>
                <span class="stat-value">${graphStats.floors || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Zones:</span>
                <span class="stat-value">${graphStats.zones || 0}</span>
            </div>
        `;
    }

    /**
     * Calculate coordinate bounds for transformation
     */
    calculateBounds() {
        if (!this.graph || !this.graph.nodes) return;

        this.graph.nodes.forEach(node => {
            this.bounds.minLat = Math.min(this.bounds.minLat, node.lat);
            this.bounds.maxLat = Math.max(this.bounds.maxLat, node.lat);
            this.bounds.minLon = Math.min(this.bounds.minLon, node.lon);
            this.bounds.maxLon = Math.max(this.bounds.maxLon, node.lon);
        });

        // Add 10% padding to bounds
        const latPadding = (this.bounds.maxLat - this.bounds.minLat) * 0.1;
        const lonPadding = (this.bounds.maxLon - this.bounds.minLon) * 0.1;

        this.bounds.minLat -= latPadding;
        this.bounds.maxLat += latPadding;
        this.bounds.minLon -= lonPadding;
        this.bounds.maxLon += lonPadding;
    }

    /**
     * Transform WGS84 coordinates to canvas coordinates
     */
    transformCoordinates(lat, lon) {
        const latRange = this.bounds.maxLat - this.bounds.minLat;
        const lonRange = this.bounds.maxLon - this.bounds.minLon;

        // Normalize to 0-1
        const normalizedX = (lon - this.bounds.minLon) / lonRange;
        const normalizedY = 1 - (lat - this.bounds.minLat) / latRange; // Flip Y axis

        // Scale to canvas with padding
        const drawWidth = this.canvasWidth - 2 * this.padding;
        const drawHeight = this.canvasHeight - 2 * this.padding;

        let x = this.padding + normalizedX * drawWidth;
        let y = this.padding + normalizedY * drawHeight;

        // Apply zoom and pan
        x = (x - this.canvasWidth / 2) * this.zoomLevel + this.canvasWidth / 2 + this.viewOffset.x;
        y = (y - this.canvasHeight / 2) * this.zoomLevel + this.canvasHeight / 2 + this.viewOffset.y;

        return { x, y };
    }

    /**
     * Transform canvas coordinates back to WGS84
     */
    inverseTransformCoordinates(canvasX, canvasY) {
        // Remove zoom and pan
        let x = (canvasX - this.viewOffset.x - this.canvasWidth / 2) / this.zoomLevel + this.canvasWidth / 2;
        let y = (canvasY - this.viewOffset.y - this.canvasHeight / 2) / this.zoomLevel + this.canvasHeight / 2;

        // Remove padding and normalize
        const drawWidth = this.canvasWidth - 2 * this.padding;
        const drawHeight = this.canvasHeight - 2 * this.padding;

        const normalizedX = (x - this.padding) / drawWidth;
        const normalizedY = (y - this.padding) / drawHeight;

        // Convert to lat/lon
        const latRange = this.bounds.maxLat - this.bounds.minLat;
        const lonRange = this.bounds.maxLon - this.bounds.minLon;

        const lon = this.bounds.minLon + normalizedX * lonRange;
        const lat = this.bounds.maxLat - normalizedY * latRange; // Flip Y back

        return { lat, lon };
    }

    /**
     * Center view on graph
     */
    centerView() {
        this.viewOffset = { x: 0, y: 0 };
        this.zoomLevel = 1;
    }

    /**
     * Reset view to initial state
     */
    resetView() {
        this.centerView();
        this.render();
    }

    /**
     * Zoom in/out
     */
    zoom(factor) {
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.1, Math.min(10, this.zoomLevel));
        this.render();
    }

    /**
     * Handle canvas click
     */
    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;

        // Check if clicking on a node
        const clickedNode = this.findNodeAtPosition(canvasX, canvasY);

        if (this.selectionMode && clickedNode) {
            // Node selection mode
            if (this.selectionMode === 'from') {
                this.selectedNodeFrom = clickedNode;
                this.updateNodeSelection();
            } else if (this.selectionMode === 'to') {
                this.selectedNodeTo = clickedNode;
                this.updateNodeSelection();
            }
            this.selectionMode = null;
            this.updateSelectionButtons();
            this.render();
        } else if (!clickedNode) {
            // Position update mode
            const coords = this.inverseTransformCoordinates(canvasX, canvasY);
            // Use current floor for position
            this.updatePosition(coords.lat, coords.lon, this.currentFloor);
        }
    }

    /**
     * Find node at canvas position
     */
    findNodeAtPosition(canvasX, canvasY, radius = 10) {
        if (!this.graph) return null;

        const visibleNodes = this.graph.nodes.filter(node => node.floor === this.currentFloor);

        for (const node of visibleNodes) {
            const pos = this.transformCoordinates(node.lat, node.lon);
            const distance = Math.sqrt(
                Math.pow(pos.x - canvasX, 2) + Math.pow(pos.y - canvasY, 2)
            );

            if (distance <= radius) {
                return node;
            }
        }

        return null;
    }

    /**
     * Handle mouse wheel for zoom
     */
    handleWheel(event) {
        event.preventDefault();
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        this.zoom(zoomFactor);
    }

    /**
     * Handle mouse down for panning
     */
    handleMouseDown(event) {
        this.isPanning = true;
        this.lastMousePos = { x: event.clientX, y: event.clientY };
        this.canvas.style.cursor = 'grabbing';
    }

    /**
     * Handle mouse move for panning
     */
    handleMouseMove(event) {
        if (!this.isPanning) return;

        const dx = event.clientX - this.lastMousePos.x;
        const dy = event.clientY - this.lastMousePos.y;

        this.viewOffset.x += dx;
        this.viewOffset.y += dy;

        this.lastMousePos = { x: event.clientX, y: event.clientY };
        this.render();
    }

    /**
     * Handle mouse up for panning
     */
    handleMouseUp(event) {
        this.isPanning = false;
        this.canvas.style.cursor = this.selectionMode ? 'crosshair' : 'default';
    }

    /**
     * Update user position
     */
    updatePosition(lat, lon, floor) {
        // If floor not specified, use current floor
        if (floor === undefined || floor === null) {
            floor = this.currentFloor;
        }
        this.userPosition = { lat, lon, floor };
        this.findNearestNode(lat, lon);
        this.updatePositionDisplay();
        this.render();
    }

    /**
     * Find nearest node to given position
     */
    findNearestNode(lat, lon) {
        if (!this.graph) return null;

        const nodesOnFloor = this.graph.nodes.filter(node => node.floor === this.currentFloor);

        let nearest = null;
        let minDistance = Infinity;

        nodesOnFloor.forEach(node => {
            const distance = this.calculateDistance(lat, lon, node.lat, node.lon);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = node;
            }
        });

        this.nearestNode = nearest;
        this.nearestDistance = minDistance;

        return nearest;
    }

    /**
     * Calculate haversine distance between two points
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Update position display
     */
    updatePositionDisplay() {
        const posDisplay = document.getElementById('positionInfo');
        if (!posDisplay) return;

        const nearestInfo = this.nearestNode
            ? `<br><strong>Nearest Node:</strong> ${this.nearestNode.id} (${this.nearestDistance.toFixed(1)}m)`
            : '';

        posDisplay.innerHTML = `
            <strong>Position:</strong> ${this.userPosition.lat.toFixed(6)}, ${this.userPosition.lon.toFixed(6)}<br>
            <strong>Floor:</strong> ${this.userPosition.floor}
            ${nearestInfo}
        `;
    }

    /**
     * Set node selection mode
     */
    setSelectionMode(mode) {
        this.selectionMode = mode;
        this.canvas.style.cursor = 'crosshair';
        this.updateSelectionButtons();
        this.updateStatus(`Click on a node to select ${mode} point`, 'info');
    }

    /**
     * Update selection button states
     */
    updateSelectionButtons() {
        const selectFromBtn = document.getElementById('selectFrom');
        const selectToBtn = document.getElementById('selectTo');

        if (selectFromBtn) {
            selectFromBtn.classList.toggle('active', this.selectionMode === 'from');
        }
        if (selectToBtn) {
            selectToBtn.classList.toggle('active', this.selectionMode === 'to');
        }
    }

    /**
     * Update node selection display
     */
    updateNodeSelection() {
        const fromInput = document.getElementById('fromNode');
        const toInput = document.getElementById('toNode');

        if (fromInput && this.selectedNodeFrom) {
            fromInput.value = this.selectedNodeFrom.id;
        }
        if (toInput && this.selectedNodeTo) {
            toInput.value = this.selectedNodeTo.id;
        }
    }

    /**
     * Calculate route between selected nodes
     */
    async calculateRoute() {
        const fromId = this.selectedNodeFrom?.id || document.getElementById('fromNode')?.value;
        const toId = this.selectedNodeTo?.id || document.getElementById('toNode')?.value;

        if (!fromId || !toId) {
            this.updateStatus('Please select both from and to nodes', 'error');
            return;
        }

        try {
            this.updateStatus('Calculating route...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/nav/graph/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: fromId, to: toId })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const routeData = await response.json();
            this.currentRoute = routeData;

            this.displayRouteInfo(routeData);
            this.updateStatus('Route calculated successfully', 'success');
            this.render();

        } catch (error) {
            this.updateStatus(`Route calculation failed: ${error.message}`, 'error');
            console.error('Route error:', error);
        }
    }

    /**
     * Display route information
     */
    displayRouteInfo(routeData) {
        const routeDisplay = document.getElementById('routeInfo');
        if (!routeDisplay) return;

        const path = routeData.path || [];
        const distance = routeData.distance || 0;

        routeDisplay.innerHTML = `
            <strong>Route Found:</strong><br>
            <strong>Steps:</strong> ${path.length} nodes<br>
            <strong>Distance:</strong> ${distance.toFixed(1)}m<br>
            <strong>Path:</strong> ${path.join(' → ')}
        `;
    }

    /**
     * Clear current route
     */
    clearRoute() {
        this.currentRoute = null;
        this.selectedNodeFrom = null;
        this.selectedNodeTo = null;

        const fromInput = document.getElementById('fromNode');
        const toInput = document.getElementById('toNode');
        const routeDisplay = document.getElementById('routeInfo');

        if (fromInput) fromInput.value = '';
        if (toInput) toInput.value = '';
        if (routeDisplay) routeDisplay.innerHTML = '<em>No route calculated</em>';

        this.updateStatus('Route cleared', 'info');
        this.render();
    }

    /**
     * Update status message
     */
    updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status');
        if (!statusDiv) return;

        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        const animate = () => {
            this.pulsePhase = (this.pulsePhase + 0.05) % (Math.PI * 2);
            this.render();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Stop animation loop
     */
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    /**
     * Main render function
     */
    render() {
        if (!this.ctx || !this.graph) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw background
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw grid
        this.drawGrid();

        // Draw zones (if visible on current floor)
        this.drawZones();

        // Draw edges
        this.drawEdges();

        // Draw route if exists
        if (this.currentRoute) {
            this.drawRoute();
        }

        // Draw nodes
        this.drawNodes();

        // Draw user position
        this.drawUserPosition();

        // Draw selected nodes
        this.drawSelectedNodes();

        // Draw zoom level indicator
        this.drawZoomIndicator();
    }

    /**
     * Draw background grid
     */
    drawGrid() {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 0.5;

        const gridSize = 50;

        for (let x = 0; x < this.canvasWidth; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvasHeight);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.canvasHeight; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvasWidth, y);
            this.ctx.stroke();
        }
    }

    /**
     * Draw zones
     */
    drawZones() {
        if (!this.graph.zones) return;

        const zonesOnFloor = this.graph.zones.filter(zone => zone.floor === this.currentFloor);

        zonesOnFloor.forEach(zone => {
            if (!zone.polygon || zone.polygon.length < 3) return;

            this.ctx.fillStyle = 'rgba(100, 150, 200, 0.1)';
            this.ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
            this.ctx.lineWidth = 1;

            this.ctx.beginPath();
            zone.polygon.forEach((point, i) => {
                const pos = this.transformCoordinates(point.lat, point.lon);
                if (i === 0) {
                    this.ctx.moveTo(pos.x, pos.y);
                } else {
                    this.ctx.lineTo(pos.x, pos.y);
                }
            });
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    /**
     * Draw edges
     */
    drawEdges() {
        if (!this.graph.edges) return;

        this.ctx.strokeStyle = '#b0b0b0';
        this.ctx.lineWidth = 1;

        this.graph.edges.forEach(edge => {
            const fromNode = this.graph.nodes.find(n => n.id === edge.from);
            const toNode = this.graph.nodes.find(n => n.id === edge.to);

            if (!fromNode || !toNode) return;
            if (fromNode.floor !== this.currentFloor || toNode.floor !== this.currentFloor) return;

            const fromPos = this.transformCoordinates(fromNode.lat, fromNode.lon);
            const toPos = this.transformCoordinates(toNode.lat, toNode.lon);

            this.ctx.beginPath();
            this.ctx.moveTo(fromPos.x, fromPos.y);
            this.ctx.lineTo(toPos.x, toPos.y);
            this.ctx.stroke();
        });
    }

    /**
     * Draw nodes
     */
    drawNodes() {
        if (!this.graph || !this.graph.nodes) {
            console.warn('No graph or nodes available to draw');
            return;
        }

        const visibleNodes = this.graph.nodes.filter(node => {
            // Handle both string and numeric floor comparison
            return String(node.floor) === String(this.currentFloor);
        });

        console.log(`Drawing ${visibleNodes.length} nodes on floor ${this.currentFloor}`);

        visibleNodes.forEach(node => {
            const pos = this.transformCoordinates(node.lat, node.lon);
            const radius = 6;

            // Color by node type
            let color = '#4a90e2'; // default blue
            if (node.kind === 'gate') color = '#28a745';
            if (node.kind === 'entrance') color = '#ffc107';
            if (node.kind === 'exit') color = '#dc3545';
            if (node.kind === 'connector') color = '#6f42c1';
            if (node.kind === 'poi') color = '#17a2b8'; // cyan for POI

            // Draw node
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw node border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw node ID on hover or if selected
            if (this.isNearestNode(node)) {
                this.ctx.fillStyle = '#000';
                this.ctx.font = '10px Arial';
                this.ctx.fillText(node.id, pos.x + 10, pos.y - 10);
            }
        });
    }

    /**
     * Check if node is nearest to user position
     */
    isNearestNode(node) {
        return this.nearestNode && this.nearestNode.id === node.id;
    }

    /**
     * Draw user position
     */
    drawUserPosition() {
        if (this.userPosition.floor !== this.currentFloor) return;

        const pos = this.transformCoordinates(this.userPosition.lat, this.userPosition.lon);

        // Pulsing effect
        const pulseRadius = 12 + Math.sin(this.pulsePhase) * 3;

        // Outer glow
        this.ctx.fillStyle = 'rgba(220, 53, 69, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, pulseRadius + 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Main dot
        this.ctx.fillStyle = '#dc3545';
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // White center
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw line to nearest node
        if (this.nearestNode) {
            const nearestPos = this.transformCoordinates(this.nearestNode.lat, this.nearestNode.lon);
            this.ctx.strokeStyle = 'rgba(220, 53, 69, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            this.ctx.lineTo(nearestPos.x, nearestPos.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    /**
     * Draw selected nodes for routing
     */
    drawSelectedNodes() {
        if (this.selectedNodeFrom && this.selectedNodeFrom.floor === this.currentFloor) {
            const pos = this.transformCoordinates(this.selectedNodeFrom.lat, this.selectedNodeFrom.lon);
            this.ctx.strokeStyle = '#28a745';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = '#28a745';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText('FROM', pos.x + 15, pos.y);
        }

        if (this.selectedNodeTo && this.selectedNodeTo.floor === this.currentFloor) {
            const pos = this.transformCoordinates(this.selectedNodeTo.lat, this.selectedNodeTo.lon);
            this.ctx.strokeStyle = '#dc3545';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = '#dc3545';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText('TO', pos.x + 15, pos.y);
        }
    }

    /**
     * Draw calculated route
     */
    drawRoute() {
        if (!this.currentRoute || !this.currentRoute.path) return;

        const path = this.currentRoute.path;

        this.ctx.strokeStyle = '#ff6b35';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        let started = false;

        path.forEach((nodeId, index) => {
            const node = this.graph.nodes.find(n => n.id === nodeId);
            if (!node || node.floor !== this.currentFloor) return;

            const pos = this.transformCoordinates(node.lat, node.lon);

            if (!started) {
                this.ctx.moveTo(pos.x, pos.y);
                started = true;
            } else {
                this.ctx.lineTo(pos.x, pos.y);
            }
        });

        this.ctx.stroke();

        // Draw direction arrows
        this.drawRouteArrows(path);
    }

    /**
     * Draw directional arrows on route
     */
    drawRouteArrows(path) {
        this.ctx.fillStyle = '#ff6b35';

        for (let i = 0; i < path.length - 1; i++) {
            const fromNode = this.graph.nodes.find(n => n.id === path[i]);
            const toNode = this.graph.nodes.find(n => n.id === path[i + 1]);

            if (!fromNode || !toNode) continue;
            if (fromNode.floor !== this.currentFloor) continue;

            const fromPos = this.transformCoordinates(fromNode.lat, fromNode.lon);
            const toPos = this.transformCoordinates(toNode.lat, toNode.lon);

            // Calculate midpoint
            const midX = (fromPos.x + toPos.x) / 2;
            const midY = (fromPos.y + toPos.y) / 2;

            // Calculate angle
            const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);

            // Draw arrow
            const arrowSize = 8;
            this.ctx.save();
            this.ctx.translate(midX, midY);
            this.ctx.rotate(angle);
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(-arrowSize, -arrowSize / 2);
            this.ctx.lineTo(-arrowSize, arrowSize / 2);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    /**
     * Draw zoom level indicator
     */
    drawZoomIndicator() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`Zoom: ${(this.zoomLevel * 100).toFixed(0)}%`, 10, this.canvasHeight - 10);
    }

    /**
     * Get node color by type
     */
    getNodeColor(nodeKind) {
        const colors = {
            'gate': '#28a745',
            'hall': '#4a90e2',
            'entrance': '#ffc107',
            'exit': '#dc3545',
            'connector': '#6f42c1',
            'default': '#6c757d'
        };
        return colors[nodeKind] || colors['default'];
    }

    /**
     * Start GPS tracking for continuous position updates
     */
    startGPSTracking() {
        if (!navigator.geolocation) {
            this.updateStatus('Geolocation is not supported by your browser', 'error');
            return;
        }

        if (this.gpsWatchId) {
            console.log('GPS tracking already active');
            return;
        }

        this.isGPSTracking = true;

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 2000  // Update at least every 2 seconds
        };

        this.gpsWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                const heading = position.coords.heading;

                console.log('GPS Update:', { lat, lng, accuracy, heading });

                // Update user position on map
                this.updatePosition(lat, lng, this.currentFloor);

                // Update GPS stats display
                this.updateGPSStats(lat, lng, accuracy, heading);

                this.lastGPSUpdate = Date.now();
            },
            (error) => {
                console.error('GPS tracking error:', error);

                let errorMessage = 'GPS tracking error';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location permissions.';
                        this.stopGPSTracking();
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }

                this.updateStatus(errorMessage, 'error');
            },
            options
        );

        // Update UI
        this.updateGPSTrackingUI(true);
        this.updateStatus('GPS tracking started', 'success');
        console.log('Navigation GPS tracking started');
    }

    /**
     * Stop GPS tracking
     */
    stopGPSTracking() {
        if (this.gpsWatchId) {
            navigator.geolocation.clearWatch(this.gpsWatchId);
            this.gpsWatchId = null;
            this.isGPSTracking = false;
            this.lastGPSUpdate = null;

            // Update UI
            this.updateGPSTrackingUI(false);

            // Clear GPS stats
            const gpsStats = document.getElementById('gpsStats');
            if (gpsStats) {
                gpsStats.innerHTML = '<em>GPS tracking stopped</em>';
            }

            this.updateStatus('GPS tracking stopped', 'info');
            console.log('Navigation GPS tracking stopped');
        }
    }

    /**
     * Update GPS tracking UI buttons
     */
    updateGPSTrackingUI(isTracking) {
        const startBtn = document.getElementById('startGPSBtn');
        const stopBtn = document.getElementById('stopGPSBtn');
        const trackingIndicator = document.getElementById('gpsTrackingIndicator');

        if (startBtn && stopBtn) {
            if (isTracking) {
                startBtn.style.display = 'none';
                stopBtn.style.display = 'inline-block';
            } else {
                startBtn.style.display = 'inline-block';
                stopBtn.style.display = 'none';
            }
        }

        if (trackingIndicator) {
            trackingIndicator.style.display = isTracking ? 'inline-block' : 'none';
        }
    }

    /**
     * Update GPS stats display
     */
    updateGPSStats(lat, lng, accuracy, heading) {
        const gpsStats = document.getElementById('gpsStats');
        if (!gpsStats) return;

        const headingText = heading !== null && heading !== undefined
            ? `${heading.toFixed(0)}°`
            : 'N/A';

        const accuracyColor = accuracy < 20 ? '#28a745' : accuracy < 50 ? '#ffc107' : '#dc3545';

        const nearestInfo = this.nearestNode
            ? `<div class="stat-item">
                <span class="stat-label">Nearest Node:</span>
                <span class="stat-value">${this.nearestNode.id} (${this.nearestDistance.toFixed(1)}m)</span>
               </div>`
            : '';

        gpsStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">GPS Position:</span>
                <span class="stat-value">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Accuracy:</span>
                <span class="stat-value" style="color: ${accuracyColor}">±${accuracy.toFixed(0)}m</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Heading:</span>
                <span class="stat-value">${headingText}</span>
            </div>
            ${nearestInfo}
        `;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAnimation();
        this.stopGPSTracking();
        // Remove event listeners if needed
    }
}

// Export for use in HTML
window.NavigationTester = NavigationTester;
