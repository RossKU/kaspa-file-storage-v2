// index.htmlの先頭に追加して、読み込みを最適化

// 1. WASM遅延初期化
window.lazyInitWasm = (() => {
    let initialized = false;
    let initializing = null;
    
    return async function() {
        if (initialized) return true;
        if (initializing) return initializing;
        
        initializing = (async () => {
            console.time('WASM初期化');
            try {
                // プログレス表示
                const progress = document.createElement('div');
                progress.innerHTML = 'WASM初期化中...';
                progress.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#2A6F65;color:white;padding:20px;border-radius:8px;z-index:9999';
                document.body.appendChild(progress);
                
                await init();
                initialized = true;
                
                progress.remove();
                console.timeEnd('WASM初期化');
                return true;
            } catch (error) {
                console.error('WASM初期化エラー:', error);
                throw error;
            }
        })();
        
        return initializing;
    };
})();

// 2. 重い処理の非同期化
window.deferredTasks = [];
window.deferTask = function(task, priority = 0) {
    window.deferredTasks.push({ task, priority });
};

window.executeDeferredTasks = async function() {
    // 優先度順にソート
    window.deferredTasks.sort((a, b) => b.priority - a.priority);
    
    for (const { task } of window.deferredTasks) {
        await new Promise(resolve => {
            requestIdleCallback(() => {
                task();
                resolve();
            }, { timeout: 1000 });
        });
    }
    
    window.deferredTasks = [];
};

// 3. RPC接続の最適化
window.optimizedRpcConnect = async function(endpoint) {
    console.time('RPC接続');
    
    // 接続前にWASMを初期化
    await lazyInitWasm();
    
    // タイムアウト付き接続
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
        const client = new RpcClient({
            url: endpoint,
            signal: controller.signal
        });
        
        await client.connect();
        clearTimeout(timeout);
        
        console.timeEnd('RPC接続');
        return client;
    } catch (error) {
        clearTimeout(timeout);
        console.error('RPC接続エラー:', error);
        throw error;
    }
};

// 4. メモリクリーンアップ
window.cleanupMemory = function() {
    // 未使用のDOMをクリア
    const unusedElements = document.querySelectorAll('.temporary, .cache');
    unusedElements.forEach(el => el.remove());
    
    // イベントリスナーのクリーンアップ
    if (window.eventCleanupFunctions) {
        window.eventCleanupFunctions.forEach(fn => fn());
        window.eventCleanupFunctions = [];
    }
    
    // 強制ガベージコレクション（可能な場合）
    if (window.gc) {
        window.gc();
    }
};

// 5. パフォーマンスモニタリング
window.perfMonitor = {
    marks: new Map(),
    
    start(label) {
        this.marks.set(label, performance.now());
    },
    
    end(label) {
        const start = this.marks.get(label);
        if (!start) return;
        
        const duration = performance.now() - start;
        this.marks.delete(label);
        
        if (duration > 1000) {
            console.warn(`🐢 遅い処理: ${label} - ${duration.toFixed(0)}ms`);
        }
        
        return duration;
    },
    
    report() {
        const metrics = {
            domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            pageLoad: performance.timing.loadEventEnd - performance.timing.navigationStart,
            jsHeapUsed: performance.memory?.usedJSHeapSize / 1024 / 1024
        };
        
        console.table(metrics);
        return metrics;
    }
};

// ページ読み込み時に自動実行
document.addEventListener('DOMContentLoaded', () => {
    // 遅延タスクを実行
    setTimeout(executeDeferredTasks, 100);
    
    // パフォーマンスレポート
    setTimeout(() => perfMonitor.report(), 5000);
});