// Kaspa Archive Node Discovery Worker
// All discovery logic runs in this isolated Worker thread

let kaspa = null;
let resolver = null;
let isRunning = false;
let nodeIndex = 0;
let workers = [];

// Configuration (received from main thread)
let config = {
    resolverUrl: 'https://kaspa.stream',
    testInterval: 2000,
    maxNodes: 10000,
    archiveThreshold: 50000000,
    autoSwitch: true,
    testOldBlocks: true,
    skipDuplicateCheck: false
};

// State management
const state = {
    stats: {
        tested: 0,
        archive: 0,
        nonArchive: 0,
        errors: 0,
        skipped: 0,
        discovered: 0
    },
    nodes: {
        tested: new Set(),
        archive: [],
        current: null
    },
    blockHeights: []
};

// Message handlers
self.onmessage = async (e) => {
    const { type, data } = e.data;
    
    try {
        switch (type) {
            case 'INIT':
                await handleInit(data);
                break;
            case 'START':
                await handleStart();
                break;
            case 'STOP':
                handleStop();
                break;
            case 'CONFIG':
                handleConfig(data);
                break;
            case 'GET_STATE':
                sendState();
                break;
            default:
                sendError(`Unknown message type: ${type}`);
        }
    } catch (error) {
        sendError(`Worker error: ${error.message}`, error);
    }
};

// Initialize Kaspa module
async function handleInit(scriptUrl) {
    try {
        sendLog('Initializing Kaspa module...', 'info');
        
        // Import Kaspa module dynamically
        kaspa = await import(scriptUrl || './kaspa-core.js');
        
        // Initialize WASM by calling the default export
        await kaspa.default('./kaspa-core_bg.wasm');
        
        // Debug: Check what's available in kaspa module
        sendLog('Checking kaspa module structure...', 'debug');
        sendLog(`kaspa type: ${typeof kaspa}`, 'debug');
        sendLog(`kaspa keys: ${Object.keys(kaspa).join(', ')}`, 'debug');
        
        // Check for specific classes
        const classes = ['RpcClient', 'Resolver', 'Encoding', 'NetworkType', 'PrivateKey', 'Address'];
        for (const cls of classes) {
            if (kaspa[cls]) {
                sendLog(`✓ ${cls} is available`, 'success');
            } else {
                sendLog(`✗ ${cls} is NOT available`, 'error');
            }
        }
        
        sendLog('Kaspa module initialized', 'success');
        sendMessage('INITIALIZED', { success: true });
    } catch (error) {
        sendError('Failed to initialize Kaspa', error);
        sendMessage('INITIALIZED', { success: false, error: error.message });
    }
}

// Start discovery process
async function handleStart() {
    if (!kaspa) {
        sendError('Kaspa not initialized');
        return;
    }
    
    if (isRunning) {
        sendLog('Discovery already running', 'warning');
        return;
    }
    
    isRunning = true;
    nodeIndex = 0;
    sendMessage('STARTED');
    sendLog('Starting discovery process...', 'info');
    
    // Start discovery loop
    discoverLoop();
}

// Stop discovery process
function handleStop() {
    isRunning = false;
    
    // Close all workers
    workers.forEach(worker => {
        if (worker && !worker.isClosed()) {
            worker.close();
        }
    });
    workers = [];
    
    sendMessage('STOPPED');
    sendLog('Discovery stopped', 'info');
}

// Update configuration
function handleConfig(newConfig) {
    config = { ...config, ...newConfig };
    sendMessage('CONFIG_UPDATED', config);
}

// Main discovery loop
async function discoverLoop() {
    while (isRunning && nodeIndex < config.maxNodes) {
        try {
            await discoverNextNode();
            await sleep(config.testInterval);
        } catch (error) {
            sendError(`Discovery loop error: ${error.message}`, error);
            await sleep(5000); // Wait longer on error
        }
    }
    
    if (nodeIndex >= config.maxNodes) {
        sendLog(`Reached maximum nodes limit (${config.maxNodes})`, 'warning');
        handleStop();
    }
}

// Discover next node
async function discoverNextNode() {
    const currentIndex = nodeIndex++;
    
    try {
        // Initialize resolver if needed
        if (!resolver) {
            try {
                sendLog('Creating Resolver...', 'debug');
                if (!kaspa.Resolver) {
                    throw new Error('Kaspa.Resolver not available');
                }
                resolver = new kaspa.Resolver();
                sendLog('Resolver created', 'debug');
                
                // NetworkType might be an enum or object
                sendLog(`NetworkType object: ${JSON.stringify(kaspa.NetworkType)}`, 'debug');
                const networkType = kaspa.NetworkType?.Mainnet || 'mainnet';
                sendLog(`Connecting to ${config.resolverUrl} with network: ${networkType}`, 'debug');
                
                await resolver.connect(networkType, config.resolverUrl);
                sendLog('Resolver connected', 'success');
            } catch (err) {
                sendError(`Resolver init error: ${err.message}`, err);
                throw err;
            }
        }
        
        // Get next node
        sendLog(`Getting node at index ${currentIndex}...`, 'debug');
        const node = await resolver.getNode(currentIndex);
        if (!node) {
            sendLog(`No node at index ${currentIndex}`, 'debug');
            return;
        }
        sendLog(`Got node: ${JSON.stringify(node)}`, 'debug');
        
        const nodeUrl = node.url;
        sendLog(`Testing node ${currentIndex}: ${nodeUrl}`, 'info');
        
        // Skip if already tested
        if (!config.skipDuplicateCheck && state.nodes.tested.has(nodeUrl)) {
            state.stats.skipped++;
            sendLog(`Skipping duplicate: ${nodeUrl}`, 'debug');
            return;
        }
        
        // Test node
        const result = await testNode(nodeUrl);
        
        // Update state
        state.nodes.tested.add(nodeUrl);
        state.stats.tested++;
        
        if (result.isArchive) {
            state.stats.archive++;
            state.nodes.archive.push({
                url: nodeUrl,
                index: currentIndex,
                ...result
            });
            
            sendMessage('ARCHIVE_FOUND', {
                url: nodeUrl,
                index: currentIndex,
                ...result
            });
            
            sendLog(`Archive node found: ${nodeUrl} (${result.blockCount} blocks)`, 'archive');
        } else {
            state.stats.nonArchive++;
            sendLog(`Non-archive: ${nodeUrl} (${result.blockCount || 0} blocks)`, 'debug');
        }
        
        // Send periodic updates
        if (state.stats.tested % 10 === 0) {
            sendState();
        }
        
    } catch (error) {
        state.stats.errors++;
        sendError(`Node ${currentIndex} error: ${error.message}`, error);
        sendLog(`Stack trace: ${error.stack}`, 'error');
    }
}

// Test individual node
async function testNode(url) {
    if (!kaspa.RpcClient) {
        throw new Error('Kaspa.RpcClient not available');
    }
    
    let client = null;
    
    try {
        // Create worker client
        client = new kaspa.RpcClient({
            resolver: resolver,
            networkType: 'mainnet'
        });
        
        // Connect with timeout
        await Promise.race([
            client.connect(url),
            timeout(10000, 'Connection timeout')
        ]);
        
        // Get block count
        const blockCount = await client.getBlockCount();
        const isArchive = blockCount >= config.archiveThreshold;
        
        // Test historical blocks if needed
        let historicalTest = { passed: true };
        if (isArchive && config.testOldBlocks) {
            historicalTest = await testHistoricalBlocks(client, blockCount);
        }
        
        // Store block height for median calculation
        if (isArchive) {
            state.blockHeights.push(blockCount);
        }
        
        return {
            isArchive: isArchive && historicalTest.passed,
            blockCount,
            historicalTest
        };
        
    } finally {
        if (client && !client.isClosed()) {
            client.close();
        }
    }
}

// Test historical block access
async function testHistoricalBlocks(client, currentHeight) {
    try {
        const tests = [];
        
        // Test 1 day ago
        const oneDayBlocks = 864000;
        if (currentHeight > oneDayBlocks) {
            tests.push({
                depth: oneDayBlocks,
                height: currentHeight - oneDayBlocks,
                label: '1 day'
            });
        }
        
        // Test median depth
        if (state.blockHeights.length > 0) {
            const sortedHeights = [...state.blockHeights].sort((a, b) => a - b);
            const median = sortedHeights[Math.floor(sortedHeights.length / 2)];
            const medianDepth = Math.floor(median * 0.5);
            
            if (currentHeight > medianDepth) {
                tests.push({
                    depth: medianDepth,
                    height: currentHeight - medianDepth,
                    label: '50% median'
                });
            }
        }
        
        // Run tests
        for (const test of tests) {
            const hash = await client.getBlockDagInfoByHeight(test.height);
            if (!hash) {
                return {
                    passed: false,
                    reason: `No block at ${test.label} depth (${test.height})`
                };
            }
        }
        
        return { passed: true };
        
    } catch (error) {
        return {
            passed: false,
            reason: error.message
        };
    }
}

// Utility functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function timeout(ms, message = 'Timeout') {
    return new Promise((_, reject) => 
        setTimeout(() => reject(new Error(message)), ms)
    );
}

// Messaging functions
function sendMessage(type, data = {}) {
    self.postMessage({ type, data });
}

function sendLog(message, level = 'info') {
    sendMessage('LOG', { message, level, timestamp: Date.now() });
}

function sendError(message, error = null) {
    sendMessage('ERROR', { 
        message, 
        error: error ? error.stack : null,
        timestamp: Date.now() 
    });
}

function sendState() {
    sendMessage('STATE_UPDATE', {
        stats: state.stats,
        archiveNodes: state.nodes.archive,
        isRunning,
        nodeIndex
    });
}