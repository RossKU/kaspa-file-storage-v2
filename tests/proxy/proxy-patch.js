// ==========================================
// index.htmlに追加するCORS回避パッチ
// ==========================================
// 
// 使い方：
// 1. 現在のプロキシサーバーを停止: pkill -f cors-proxy.js
// 2. 新しいサーバーを起動: node local-server-with-proxy.js
// 3. ブラウザで開く: http://localhost:3000/
// 4. これでCORSエラーなしでアーカイブノード探索が可能！
//
// ==========================================

// index.htmlの2896行目付近（ArchiveNodeManager.discoverNode）を以下のように修正：

async discoverNode() {
    if (!this.maintainConnections) return;
    
    this.activeWorkers++;
    this.stats.totalAttempts++;
    
    try {
        // Update checking status
        this.currentChecking = { status: 'connecting', nodeId: null, blockCount: null, version: null };
        
        // ========== ここを追加 ==========
        // ローカルサーバー経由で実行されているかチェック
        const isLocalServer = window.location.hostname === 'localhost' && 
                            window.location.port === '3000';
        
        let client;
        if (isLocalServer) {
            // ローカルサーバー経由の場合、プロキシ対応のResolverを使用
            console.log('[ArchiveNodeManager] Using proxy-enabled Resolver');
            
            // Resolverのfetch処理を上書き（もし可能なら）
            // または既知のアーカイブノードを直接使用
            const KNOWN_NODES = [
                "wss://kaspa.aspectron.org/v2/kaspa/mainnet/ws",
                "wss://kas.fyi/v2/kaspa/mainnet/ws"
            ];
            
            const randomUrl = KNOWN_NODES[Math.floor(Math.random() * KNOWN_NODES.length)];
            client = new NetworkState.kaspa.RpcClient({
                url: randomUrl,
                networkId: this.networkId
            });
            
        } else {
            // 通常のResolver使用
            client = new NetworkState.kaspa.RpcClient({
                resolver: new NetworkState.kaspa.Resolver(),
                networkId: this.networkId
            });
        }
        // ========== ここまで ==========
        
        await client.connect();
        
        // 以下は元のコードのまま...
    }
}

// ==========================================
// 別の方法：WASMのfetchを上書き（高度）
// ==========================================

// index.htmlの最初の方（WASMロード前）に追加：
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // KaspaノードへのHTTPリクエストを検出
        if (typeof url === 'string' && 
            (url.includes('kaspa.red') || url.includes('kaspa.green') || 
             url.includes('kaspa.blue') || url.includes('kaspa.stream'))) {
            
            // ローカルサーバー経由の場合はプロキシを使用
            if (window.location.hostname === 'localhost' && window.location.port === '3000') {
                const proxyUrl = `/proxy/${url}`;
                console.log(`[CORS Proxy] Redirecting: ${url} → ${proxyUrl}`);
                return originalFetch.call(this, proxyUrl, options);
            }
        }
        
        // その他のリクエストは通常通り
        return originalFetch.call(this, url, options);
    };
})();