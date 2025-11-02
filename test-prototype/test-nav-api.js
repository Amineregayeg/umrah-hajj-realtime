#!/usr/bin/env node

/**
 * Navigation API Testing Script
 * Tests all navigation endpoints to verify connectivity and response format
 */

const API_BASE = 'https://psychological-jilli-amineregayeg-1fe35444.koyeb.app';

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, path, body = null) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`Testing: ${name}`, 'blue');
    log(`${method} ${API_BASE}${path}`, 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
            log(`Request Body: ${JSON.stringify(body, null, 2)}`, 'yellow');
        }

        const startTime = Date.now();
        const response = await fetch(`${API_BASE}${path}`, options);
        const endTime = Date.now();
        const duration = endTime - startTime;

        log(`\nStatus: ${response.status} ${response.statusText}`,
            response.ok ? 'green' : 'red');
        log(`Response Time: ${duration}ms`, 'cyan');

        if (response.ok) {
            const data = await response.json();
            log(`\nResponse Data:`, 'green');

            // Show summary for large responses
            if (data.nodes && Array.isArray(data.nodes)) {
                log(`  Nodes: ${data.nodes.length}`, 'green');
                log(`  Sample node: ${JSON.stringify(data.nodes[0], null, 2)}`, 'green');
            }
            if (data.edges && Array.isArray(data.edges)) {
                log(`  Edges: ${data.edges.length}`, 'green');
            }
            if (data.zones && Array.isArray(data.zones)) {
                log(`  Zones: ${data.zones.length}`, 'green');
            }
            if (data.floors && Array.isArray(data.floors)) {
                log(`  Floors: ${data.floors.length}`, 'green');
            }
            if (data.connectors && Array.isArray(data.connectors)) {
                log(`  Connectors: ${data.connectors.length}`, 'green');
            }

            // Show full response for stats and routes
            if (data.nodeCount !== undefined || data.path) {
                log(JSON.stringify(data, null, 2), 'green');
            }

            log(`\n✓ SUCCESS`, 'green');
            return { success: true, data, duration };
        } else {
            const errorText = await response.text();
            log(`\nError Response: ${errorText}`, 'red');
            log(`✗ FAILED`, 'red');
            return { success: false, error: errorText, duration };
        }
    } catch (error) {
        log(`\n✗ ERROR: ${error.message}`, 'red');
        return { success: false, error: error.message, duration: 0 };
    }
}

async function runTests() {
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║         Navigation API Test Suite                         ║', 'cyan');
    log('║         Testing Koyeb Deployment                          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    const results = [];

    // Test 1: Get complete graph
    log('\n\n[TEST 1/4] Get Complete Navigation Graph', 'blue');
    const graphResult = await testEndpoint(
        'Get Navigation Graph',
        'GET',
        '/nav/graph/graph'
    );
    results.push({ name: 'Get Graph', ...graphResult });

    // Test 2: Get graph statistics
    log('\n\n[TEST 2/4] Get Graph Statistics', 'blue');
    const statsResult = await testEndpoint(
        'Get Graph Stats',
        'GET',
        '/nav/graph/stats'
    );
    results.push({ name: 'Get Stats', ...statsResult });

    // Test 3: Calculate route (if we have nodes)
    log('\n\n[TEST 3/4] Calculate Route Between Nodes', 'blue');
    if (graphResult.success && graphResult.data.nodes && graphResult.data.nodes.length >= 2) {
        const fromNode = graphResult.data.nodes[0].id;
        const toNode = graphResult.data.nodes[Math.min(1, graphResult.data.nodes.length - 1)].id;

        log(`Using nodes: ${fromNode} → ${toNode}`, 'yellow');

        const routeResult = await testEndpoint(
            'Calculate Route',
            'POST',
            '/nav/graph/route',
            { from: fromNode, to: toNode }
        );
        results.push({ name: 'Calculate Route', ...routeResult });
    } else {
        log('Skipping route test - no nodes available', 'yellow');
        results.push({ name: 'Calculate Route', success: false, error: 'No nodes available', duration: 0 });
    }

    // Test 4: Get specific node details (if we have nodes)
    log('\n\n[TEST 4/4] Get Node Details', 'blue');
    if (graphResult.success && graphResult.data.nodes && graphResult.data.nodes.length > 0) {
        const nodeId = graphResult.data.nodes[0].id;

        log(`Getting details for node: ${nodeId}`, 'yellow');

        const nodeResult = await testEndpoint(
            'Get Node Details',
            'GET',
            `/nav/graph/nodes/${encodeURIComponent(nodeId)}`
        );
        results.push({ name: 'Get Node', ...nodeResult });
    } else {
        log('Skipping node test - no nodes available', 'yellow');
        results.push({ name: 'Get Node', success: false, error: 'No nodes available', duration: 0 });
    }

    // Print summary
    log('\n\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                    TEST SUMMARY                            ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    results.forEach((result, index) => {
        const status = result.success ? '✓' : '✗';
        const statusColor = result.success ? 'green' : 'red';
        const duration = result.duration ? `${result.duration}ms` : 'N/A';

        log(`\n${index + 1}. ${result.name}:`, 'cyan');
        log(`   Status: ${status} ${result.success ? 'PASSED' : 'FAILED'}`, statusColor);
        log(`   Duration: ${duration}`, 'cyan');
        if (!result.success && result.error) {
            log(`   Error: ${result.error}`, 'red');
        }
    });

    log('\n' + '─'.repeat(60), 'cyan');
    log(`Total Tests: ${total}`, 'blue');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`,
        passed === total ? 'green' : 'yellow');
    log('─'.repeat(60) + '\n', 'cyan');

    if (passed === total) {
        log('✓ ALL TESTS PASSED - API is fully functional!', 'green');
        process.exit(0);
    } else {
        log('✗ SOME TESTS FAILED - Please review errors above', 'red');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    process.exit(1);
});
