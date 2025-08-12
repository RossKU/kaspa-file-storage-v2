// ArchiveNodeManagerを修正してCORSプロキシを使用する例
// index.htmlの2896行目付近を以下のように変更

// ========== 修正前 ==========
/*
const client = new NetworkState.kaspa.RpcClient({
    resolver: new NetworkState.kaspa.Resolver(),
    networkId: this.networkId
});
*/

// ========== 修正後 ==========
// CORSプロキシ経由でResolverを使用
const USE_CORS_PROXY = true; // 設定フラグ
const CORS_PROXY = 'http://localhost:8080/';

let client;
if (USE_CORS_PROXY && window.location.protocol === 'https:') {
    // GitHub Pages等でCORSエラーが出る場合
    // プロキシ経由のResolverを使用
    const proxyResolver = new NetworkState.kaspa.Resolver({
        // ResolverのURLをプロキシ経由に変更（もし可能なら）
        urls: ["http://localhost:8080/?url=https://kaspa.stream/resolver"]
    });
    
    client = new NetworkState.kaspa.RpcClient({
        resolver: proxyResolver,
        networkId: this.networkId
    });
} else {
    // ローカルファイルや開発環境では通常通り
    client = new NetworkState.kaspa.RpcClient({
        resolver: new NetworkState.kaspa.Resolver(),
        networkId: this.networkId
    });
}

// ========== または、より簡単な方法 ==========
// 既知のアーカイブノードリストを使用する

const KNOWN_ARCHIVE_NODES = [
    "wss://kaspa.aspectron.org/v2/kaspa/mainnet/ws",
    "wss://kas.fyi/v2/kaspa/mainnet/ws",
    // 事前に調査したノード
];

// ランダムに選択
const randomUrl = KNOWN_ARCHIVE_NODES[Math.floor(Math.random() * KNOWN_ARCHIVE_NODES.length)];
const client = new NetworkState.kaspa.RpcClient({
    url: randomUrl,  // 直接指定でResolverをスキップ
    networkId: this.networkId
});

// ========== デバッグ用：エラーを詳細に記録 ==========
try {
    await client.connect();
} catch (error) {
    console.log('Connection error details:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
    });
    
    // CORSエラーの場合は特別な処理
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
        console.log('CORS error detected - try using the proxy server');
        // プロキシ使用を促す
    }
}