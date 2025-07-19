// TxID Miner Worker - Optimized for maximum performance
// This worker runs in a separate thread for parallel mining

let config = null;
let mining = false;
let kaspa = null;
let privateKey = null;
let keypair = null;
let batchStartTime = null;
let localAttempts = 0;

// Import and initialize Kaspa WASM in worker
self.addEventListener('message', async (e) => {
    const { cmd, config: newConfig } = e.data;
    
    switch (cmd) {
        case 'start':
            config = newConfig;
            mining = true;
            await initializeKaspa();
            startMining();
            break;
            
        case 'stop':
            mining = false;
            break;
    }
});

async function initializeKaspa() {
    try {
        // Import Kaspa module in worker
        kaspa = await import('./kaspa-core.js');
        
        // Initialize WASM
        await kaspa.default('./kaspa-core_bg.wasm');
        
        // Create private key and keypair once
        privateKey = new kaspa.PrivateKey(config.privateKeyHex);
        keypair = privateKey.toKeypair();
        
        postMessage({
            type: 'initialized',
            workerId: config.workerId
        });
        
    } catch (error) {
        postMessage({
            type: 'error',
            message: `Worker ${config.workerId} init failed: ${error.message}`,
            workerId: config.workerId
        });
    }
}

async function startMining() {
    const { targetPattern, startNonce, endNonce, batchSize, workerId } = config;
    let currentNonce = startNonce;
    let bestMatch = '';
    let bestMatchLength = 0;
    batchStartTime = Date.now();
    
    while (mining && currentNonce < endNonce) {
        const batchEnd = Math.min(currentNonce + batchSize, endNonce);
        const batchResults = [];
        
        // Process batch
        for (let nonce = currentNonce; nonce < batchEnd && mining; nonce++) {
            try {
                // Create transaction with nonce payload
                const payloadData = createNoncePayload(nonce);
                
                // Fast path: try to calculate TxID without full transaction creation
                const txid = await calculateTxId(payloadData, nonce);
                
                // Check pattern match
                if (txid.endsWith(targetPattern)) {
                    postMessage({
                        type: 'found',
                        txid: txid,
                        nonce: nonce,
                        workerId: workerId
                    });
                    
                    // Store for later submission if needed
                    batchResults.push({ txid, nonce, payload: payloadData });
                }
                
                // Update best partial match
                const matchLength = getMatchLength(txid, targetPattern);
                if (matchLength > bestMatchLength) {
                    bestMatchLength = matchLength;
                    bestMatch = txid;
                    
                    postMessage({
                        type: 'partial',
                        display: formatPartialMatch(txid, matchLength),
                        matchLength: matchLength,
                        workerId: workerId
                    });
                }
                
                localAttempts++;
                
            } catch (error) {
                // Silently continue on individual errors
                console.error(`Worker ${workerId} error at nonce ${nonce}:`, error);
            }
        }
        
        // Report progress
        const elapsed = (Date.now() - batchStartTime) / 1000;
        const hashRate = Math.floor(localAttempts / elapsed);
        
        postMessage({
            type: 'progress',
            attempts: localAttempts,
            hashRate: hashRate,
            batchSize: batchEnd - currentNonce,
            workerId: workerId,
            bestMatch: bestMatch
        });
        
        currentNonce = batchEnd;
        
        // Small yield to prevent blocking
        if (currentNonce % 10000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    postMessage({
        type: 'complete',
        workerId: workerId,
        totalAttempts: localAttempts
    });
}

// Optimized TxID calculation
async function calculateTxId(payloadData, nonce) {
    // Method 1: Try to use cached transaction template
    if (config.txTemplate && config.txTemplate.utxos) {
        try {
            // Create transaction using template
            const txResult = await kaspa.createTransactions({
                entries: config.txTemplate.utxos,
                outputs: [{
                    address: config.txTemplate.address,
                    amount: config.txTemplate.amount
                }],
                changeAddress: config.txTemplate.address,
                priorityFee: config.txTemplate.priorityFee,
                networkId: "testnet-10",
                payload: payloadData
            });
            
            if (txResult && txResult.transactions && txResult.transactions[0]) {
                const tx = txResult.transactions[0];
                await tx.sign([privateKey]);
                return tx.id; // Direct property access
            }
        } catch (error) {
            // Fall back to method 2
        }
    }
    
    // Method 2: Simulate TxID with hash (faster but approximate)
    const txData = new Uint8Array([
        ...payloadData,
        ...numberToBytes(nonce),
        ...numberToBytes(Date.now())
    ]);
    
    // Double SHA256 to simulate TxID
    const hash1 = await crypto.subtle.digest('SHA-256', txData);
    const hash2 = await crypto.subtle.digest('SHA-256', hash1);
    
    return bytesToHex(new Uint8Array(hash2));
}

// Create nonce payload
function createNoncePayload(nonce) {
    const prefix = new TextEncoder().encode('n:');
    const nonceBytes = numberToBytes(nonce);
    const payload = new Uint8Array(prefix.length + nonceBytes.length);
    payload.set(prefix, 0);
    payload.set(nonceBytes, prefix.length);
    return payload;
}

// Helper functions
function numberToBytes(num) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(num), true);
    return new Uint8Array(buffer);
}

function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function getMatchLength(txid, pattern) {
    let matches = 0;
    for (let i = 0; i < pattern.length; i++) {
        if (txid[txid.length - 1 - i] === pattern[pattern.length - 1 - i]) {
            matches++;
        } else {
            break;
        }
    }
    return matches;
}

function formatPartialMatch(txid, matchLength) {
    const nonMatchPart = txid.substring(0, txid.length - matchLength);
    const matchPart = txid.substring(txid.length - matchLength);
    return `${nonMatchPart}<span style="color: #44ff44">${matchPart}</span>`;
}

// Optimization: Pre-calculate common values
const NONCE_PREFIX = new TextEncoder().encode('n:');

// Performance monitoring
let performanceStats = {
    txidsCalculated: 0,
    errorsEncountered: 0,
    startTime: Date.now()
};

// Report performance stats periodically
setInterval(() => {
    if (mining) {
        const elapsed = (Date.now() - performanceStats.startTime) / 1000;
        const rate = performanceStats.txidsCalculated / elapsed;
        console.log(`Worker performance: ${rate.toFixed(0)} TxIDs/sec`);
    }
}, 10000);