// Kaspa Archive Node Discovery Worker
// All discovery logic runs in this isolated Worker thread

let kaspa = null;
let isRunning = false;
let nodeIndex = 0;

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
        sendLog(`Worker message handler error type: ${typeof error}`, 'error');
        sendLog(`Worker message handler error: ${JSON.stringify(error)}`, 'error');
        sendLog(`Worker message handler error message: ${error?.message || 'No message'}`, 'error');
        sendLog(`Worker message handler error stack: ${error?.stack || 'No stack'}`, 'error');
        sendError(`Worker error: ${error?.message || JSON.stringify(error)}`, error);
    }
};

// Global error handler for uncaught errors in Worker
self.addEventListener('error', (event) => {
    sendLog(`Uncaught Worker error: ${event.message}`, 'error');
    sendLog(`Error filename: ${event.filename}`, 'error');
    sendLog(`Error line: ${event.lineno}:${event.colno}`, 'error');
    sendError(`Uncaught Worker error: ${event.message}`);
});

// Global handler for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    sendLog(`Unhandled promise rejection: ${event.reason}`, 'error');
    sendError(`Unhandled promise rejection: ${event.reason}`);
});

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
        
        // Test basic kaspa operations
        try {
            sendLog('Testing basic kaspa operations...', 'debug');
            
            // Test creating a private key
            const testPrivKey = new kaspa.PrivateKey('b7e151628aed2a6abf7158809cf4f3c762e7160f38b4da56a784d9045190cfef');
            sendLog('✓ PrivateKey creation works', 'success');
            
            // Test creating an address
            const pubKey = testPrivKey.toPublicKey();
            const address = pubKey.toAddress('testnet-10');
            sendLog(`✓ Address creation works: ${address.toString()}`, 'success');
            
        } catch (testError) {
            sendLog(`Basic operations error: ${testError?.message || JSON.stringify(testError)}`, 'error');
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
    let client = null;
    
    try {
        sendLog(`\n━━━ Discovery Attempt #${currentIndex + 1} ━━━`, 'info');
        
        // Create RpcClient with Resolver for each discovery attempt
        sendLog(`Creating RPC client with Resolver...`, 'debug');
        
        try {
            // Test if we can create a Resolver first
            sendLog('Testing Resolver creation...', 'debug');
            const testResolver = new kaspa.Resolver();
            sendLog('Resolver created successfully', 'debug');
            
            // Now try creating RpcClient
            sendLog('Creating RpcClient...', 'debug');
            client = new kaspa.RpcClient({
                resolver: testResolver,
                networkId: 'mainnet'
            });
            sendLog('RpcClient created successfully', 'debug');
        } catch (createError) {
            // Enhanced error logging
            sendLog(`Creation error type: ${typeof createError}`, 'error');
            sendLog(`Creation error: ${JSON.stringify(createError)}`, 'error');
            sendLog(`Creation error message: ${createError?.message || 'No message'}`, 'error');
            sendLog(`Creation error stack: ${createError?.stack || 'No stack'}`, 'error');
            throw createError;
        }
        
        sendLog('Connecting to mainnet via Resolver...', 'debug');
        
        // Check if connect method exists
        sendLog(`client type: ${typeof client}`, 'debug');
        sendLog(`client.connect type: ${typeof client.connect}`, 'debug');
        
        if (!client.connect) {
            throw new Error('client.connect method not found');
        }
        
        const startTime = Date.now();
        
        try {
            sendLog('Calling client.connect()...', 'debug');
            const connectResult = client.connect();
            sendLog(`connect() returned: ${typeof connectResult}`, 'debug');
            
            if (connectResult && typeof connectResult.then === 'function') {
                sendLog('connect() returned a Promise, awaiting...', 'debug');
                await connectResult;
            } else {
                sendLog('connect() did not return a Promise', 'warning');
            }
            
            const connectionTime = Date.now() - startTime;
            sendLog(`Connected via Resolver in ${connectionTime}ms!`, 'success');
        } catch (connectError) {
            sendLog(`Connect error caught: ${typeof connectError}`, 'error');
            sendLog(`Connect error details: ${JSON.stringify(connectError)}`, 'error');
            sendLog(`Connect error message: ${connectError?.message || 'No message'}`, 'error');
            sendLog(`Connect error stack: ${connectError?.stack || 'No stack'}`, 'error');
            sendError(`Connect error: ${connectError?.message || JSON.stringify(connectError)}`, connectError);
            throw connectError;
        }
        
        // Get node info
        const info = await client.getServerInfo();
        const dagInfo = await client.getBlockDagInfo();
        const blockCount = dagInfo.blockCount || dagInfo.virtualDaaScore || 0;
        const blockCountNum = typeof blockCount === 'bigint' ? Number(blockCount) : blockCount;
        
        // Create node identifier
        const nodeIdentifier = `${info.serverVersion || 'Unknown'}_${blockCountNum}`;
        const nodeUrl = nodeIdentifier; // Use identifier as URL for tracking
        
        sendLog(`Connected to: ${info.serverVersion || 'Unknown'}`, 'info');
        sendLog(`Block height: ${blockCountNum.toLocaleString()}`, 'info');
        
        // Skip if already tested
        if (!config.skipDuplicateCheck && state.nodes.tested.has(nodeUrl)) {
            state.stats.skipped++;
            sendLog(`Skipping duplicate: ${nodeUrl}`, 'debug');
            await client.disconnect();
            return;
        }
        
        // Test archive capability
        const isArchive = blockCountNum >= config.archiveThreshold;
        let historicalTest = { passed: true };
        
        if (isArchive) {
            sendLog(`⚡ High block count (${(blockCountNum/1000000).toFixed(1)}M > ${(config.archiveThreshold/1000000).toFixed(1)}M threshold)`, 'archive');
            
            if (config.testOldBlocks) {
                sendLog('Testing historical block access...', 'info');
                historicalTest = await testHistoricalBlocks(client, blockCountNum);
                if (historicalTest.passed) {
                    sendLog('✓ Historical block access confirmed - Archive node!', 'archive');
                } else {
                    sendLog(`⚠️ Historical test failed: ${historicalTest.reason}`, 'warning');
                }
            }
        }
        
        const result = {
            isArchive: isArchive && historicalTest.passed,
            blockCount: blockCountNum,
            historicalTest,
            version: info.serverVersion,
            networkId: info.networkId
        };
        
        // Update state
        state.nodes.tested.add(nodeUrl);
        state.stats.tested++;
        
        if (result.isArchive) {
            state.stats.archive++;
            state.blockHeights.push(blockCountNum); // Store for median calculation
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
        // Enhanced error logging
        sendLog(`Main error type: ${typeof error}`, 'error');
        sendLog(`Main error: ${JSON.stringify(error)}`, 'error');
        sendLog(`Main error message: ${error?.message || 'No message'}`, 'error');
        sendLog(`Main error stack: ${error?.stack || 'No stack'}`, 'error');
        sendError(`Discovery ${currentIndex} error: ${error?.message || JSON.stringify(error)}`, error);
    } finally {
        // Always disconnect
        if (client) {
            try {
                if (client.disconnect) {
                    await client.disconnect();
                } else if (client.close) {
                    client.close();
                }
                sendLog('Disconnected from node', 'debug');
            } catch (e) {
                // Ignore disconnect errors
            }
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
            try {
                // Try to get block at specific height
                sendLog(`Testing block at height ${test.height} (${test.label})...`, 'debug');
                
                // Method 1: Try getBlock with height parameter
                const block = await client.getBlock({
                    height: test.height,
                    includeTransactions: false
                });
                
                if (!block) {
                    return {
                        passed: false,
                        reason: `No block at ${test.label} depth (height ${test.height})`
                    };
                }
            } catch (blockError) {
                return {
                    passed: false,
                    reason: `Cannot access ${test.label} block: ${blockError.message}`
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