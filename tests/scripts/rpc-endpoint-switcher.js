// RPCエンドポイント自動切り替えスクリプト
// index.htmlに追加して、最速のエンドポイントを自動選択

class RPCEndpointSwitcher {
    constructor() {
        this.endpoints = {
            'testnet-10': [
                // 公式
                'wss://tn10.katnip.sh/wrpc/kaspa/testnet-10',
                'wss://kaspa-testnet-10-wrpc.kaspa.stream',
                'wss://tn10rpc.kaspa.ws',
                // 代替
                'wss://testnet-10.kaspa.red',
                'wss://tn10-wrpc.kaspa-ng.io',
                'wss://tn10.kaspa.rocketnode.space',
                // 新規追加
                'wss://kaspa-tn10.duckdns.org/wrpc',
                'wss://tn10-node.kaspa.live'
            ],
            'mainnet': [
                // 公式
                'wss://kaspa-wrpc.kaspa.stream',
                'wss://wrpc.kaspa.ws',
                'wss://kaspa.aspectron.org',
                // 代替
                'wss://mainnet.kaspa.red',
                'wss://kaspa.rocketnode.space',
                'wss://kaspa-mainnet.duckdns.org/wrpc',
                // 新規
                'wss://kaspa.node.community',
                'wss://kaspa-node.com/wrpc'
            ]
        };
        
        this.testResults = new Map();
    }
    
    async testEndpoint(url, timeout = 5000) {
        const start = performance.now();
        
        return new Promise((resolve) => {
            const ws = new WebSocket(url);
            const timer = setTimeout(() => {
                ws.close();
                resolve({ url, time: Infinity, error: 'Timeout' });
            }, timeout);
            
            ws.onopen = () => {
                clearTimeout(timer);
                const time = performance.now() - start;
                ws.close();
                resolve({ url, time, error: null });
            };
            
            ws.onerror = () => {
                clearTimeout(timer);
                resolve({ url, time: Infinity, error: 'Connection failed' });
            };
        });
    }
    
    async findFastestEndpoint(network) {
        console.log(`🔍 ${network}の最速エンドポイントを検索中...`);
        
        const endpoints = this.endpoints[network] || this.endpoints['testnet-10'];
        const tests = endpoints.map(url => this.testEndpoint(url));
        const results = await Promise.all(tests);
        
        // 結果をソート
        results.sort((a, b) => a.time - b.time);
        
        // 結果を保存
        this.testResults.set(network, results);
        
        // コンソールに結果表示
        console.table(results.map(r => ({
            url: r.url,
            time: r.time === Infinity ? '失敗' : `${r.time.toFixed(0)}ms`,
            status: r.error || '成功'
        })));
        
        // 最速のエンドポイント
        const fastest = results.find(r => !r.error);
        if (fastest) {
            console.log(`✅ 最速: ${fastest.url} (${fastest.time.toFixed(0)}ms)`);
            return fastest.url;
        }
        
        console.error('❌ 利用可能なエンドポイントが見つかりません');
        return null;
    }
    
    async autoSelectEndpoint(network) {
        // ローカルストレージから前回の結果を取得
        const cached = localStorage.getItem(`kaspa_fastest_endpoint_${network}`);
        const cacheTime = localStorage.getItem(`kaspa_endpoint_cache_time_${network}`);
        
        // 10分以内のキャッシュがあれば使用
        if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 10 * 60 * 1000) {
            console.log(`📦 キャッシュされたエンドポイントを使用: ${cached}`);
            return cached;
        }
        
        // 新規テスト実行
        const fastest = await this.findFastestEndpoint(network);
        
        if (fastest) {
            // 結果をキャッシュ
            localStorage.setItem(`kaspa_fastest_endpoint_${network}`, fastest);
            localStorage.setItem(`kaspa_endpoint_cache_time_${network}`, Date.now().toString());
        }
        
        return fastest;
    }
    
    // 定期的な再テスト
    startMonitoring(network, interval = 5 * 60 * 1000) {
        setInterval(async () => {
            console.log('🔄 エンドポイントを再テスト中...');
            const fastest = await this.findFastestEndpoint(network);
            
            if (fastest) {
                const current = localStorage.getItem(`kaspa_fastest_endpoint_${network}`);
                if (current !== fastest) {
                    console.log(`🔄 より高速なエンドポイントを発見: ${fastest}`);
                    localStorage.setItem(`kaspa_fastest_endpoint_${network}`, fastest);
                    localStorage.setItem(`kaspa_endpoint_cache_time_${network}`, Date.now().toString());
                    
                    // 再接続を促す
                    if (window.NetworkState && window.NetworkState.rpcClient) {
                        console.log('🔄 新しいエンドポイントで再接続を推奨');
                    }
                }
            }
        }, interval);
    }
}

// グローバルに公開
window.rpcSwitcher = new RPCEndpointSwitcher();

// 使用例：
// const bestEndpoint = await rpcSwitcher.autoSelectEndpoint('testnet-10');
// NetworkState.connect(bestEndpoint);