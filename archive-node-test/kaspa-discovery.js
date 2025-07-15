// Kaspa Archive Node Discovery Interface
// Main thread interface for Worker-based discovery

class KaspaDiscovery extends EventTarget {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.config = {
            workerPath: './kaspa-discovery.worker.js',
            kaspaScriptUrl: './kaspa-core.js',
            resolverUrl: 'https://kaspa.stream',
            testInterval: 2000,
            maxNodes: 10000,
            archiveThreshold: 50000000,
            autoSwitch: true,
            testOldBlocks: true,
            skipDuplicateCheck: false,
            ...options
        };
        
        // State
        this.worker = null;
        this.isInitialized = false;
        this.isRunning = false;
        this.state = {
            stats: {
                tested: 0,
                archive: 0,
                nonArchive: 0,
                errors: 0,
                skipped: 0
            },
            archiveNodes: []
        };
        
        // Message queue for pre-init messages
        this.messageQueue = [];
    }
    
    // Initialize Worker and Kaspa module
    async init() {
        if (this.isInitialized) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                // Create Worker
                this.worker = new Worker(this.config.workerPath);
                
                // Setup message handler
                this.worker.onmessage = (e) => {
                    this._handleWorkerMessage(e.data);
                };
                
                this.worker.onerror = (error) => {
                    this._emit('error', { 
                        message: 'Worker error', 
                        error 
                    });
                    reject(error);
                };
                
                // Initialize handler for this promise
                const initHandler = (e) => {
                    if (e.type === 'initialized') {
                        this.removeEventListener('initialized', initHandler);
                        if (e.detail.success) {
                            this.isInitialized = true;
                            this._processMessageQueue();
                            resolve();
                        } else {
                            reject(new Error(e.detail.error));
                        }
                    }
                };
                this.addEventListener('initialized', initHandler);
                
                // Send init message
                this._sendMessage('INIT', this.config.kaspaScriptUrl);
                
                // Send initial config
                this._sendMessage('CONFIG', {
                    resolverUrl: this.config.resolverUrl,
                    testInterval: this.config.testInterval,
                    maxNodes: this.config.maxNodes,
                    archiveThreshold: this.config.archiveThreshold,
                    autoSwitch: this.config.autoSwitch,
                    testOldBlocks: this.config.testOldBlocks,
                    skipDuplicateCheck: this.config.skipDuplicateCheck
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Start discovery process
    start() {
        if (!this.isInitialized) {
            throw new Error('Not initialized. Call init() first.');
        }
        
        if (this.isRunning) {
            return;
        }
        
        this._sendMessage('START');
    }
    
    // Stop discovery process
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this._sendMessage('STOP');
    }
    
    // Update configuration
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this._sendMessage('CONFIG', config);
    }
    
    // Get current state
    getState() {
        this._sendMessage('GET_STATE');
        return this.state;
    }
    
    // Get archive nodes
    getArchiveNodes() {
        return this.state.archiveNodes;
    }
    
    // Terminate Worker and cleanup
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isInitialized = false;
        this.isRunning = false;
        this._emit('terminated');
    }
    
    // Handle messages from Worker
    _handleWorkerMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'INITIALIZED':
                this._emit('initialized', data);
                break;
                
            case 'STARTED':
                this.isRunning = true;
                this._emit('started');
                break;
                
            case 'STOPPED':
                this.isRunning = false;
                this._emit('stopped');
                break;
                
            case 'CONFIG_UPDATED':
                this._emit('configUpdated', data);
                break;
                
            case 'STATE_UPDATE':
                this.state = {
                    stats: data.stats,
                    archiveNodes: data.archiveNodes,
                    isRunning: data.isRunning,
                    nodeIndex: data.nodeIndex
                };
                this._emit('stateUpdate', this.state);
                break;
                
            case 'ARCHIVE_FOUND':
                this._emit('archiveFound', data);
                break;
                
            case 'LOG':
                this._emit('log', data);
                break;
                
            case 'ERROR':
                this._emit('error', data);
                break;
                
            default:
                console.warn('Unknown message type from worker:', type);
        }
    }
    
    // Send message to Worker
    _sendMessage(type, data = null) {
        const message = { type, data };
        
        if (this.worker && this.isInitialized) {
            this.worker.postMessage(message);
        } else if (type === 'INIT' || type === 'CONFIG') {
            // Allow INIT and CONFIG before initialization
            if (this.worker) {
                this.worker.postMessage(message);
            } else {
                this.messageQueue.push(message);
            }
        } else {
            this.messageQueue.push(message);
        }
    }
    
    // Process queued messages
    _processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.worker.postMessage(message);
        }
    }
    
    // Emit custom event
    _emit(eventName, detail = {}) {
        this.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KaspaDiscovery;
}