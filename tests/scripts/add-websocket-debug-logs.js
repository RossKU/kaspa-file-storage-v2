// WebSocketデバッグログ追加スクリプト
// index-from-github.htmlを修正してデバッグログを追加します

const fs = require('fs');

// ファイルを読み込み
let content = fs.readFileSync('index-from-github.html', 'utf8');

// 1. グローバル変数を追加（<script type="module">の直後）
const globalVarsCode = `
// WebSocketデバッグ用グローバル変数
window.wsDebug = {
    blockCount: 0,
    firstBlockTime: null,
    lastBlockTime: null,
    blockIntervals: [],
    txConfirmations: new Map(),
    startTime: Date.now()
};

// 統計表示（10秒ごと）
setInterval(() => {
    const debug = window.wsDebug;
    if (debug.blockCount === 0) return;
    
    const elapsed = (Date.now() - debug.startTime) / 1000;
    const bps = debug.blockCount / elapsed;
    const avgInterval = debug.blockIntervals.length > 0 
        ? debug.blockIntervals.reduce((a,b) => a+b, 0) / debug.blockIntervals.length 
        : 0;
    
    console.log(\`📊 WebSocket統計 (\${elapsed.toFixed(1)}秒経過):\`);
    console.log(\`   総ブロック数: \${debug.blockCount}\`);
    console.log(\`   平均BPS: \${bps.toFixed(2)} (期待値: 10)\`);
    console.log(\`   受信率: \${(bps / 10 * 100).toFixed(1)}%\`);
    console.log(\`   平均間隔: \${avgInterval.toFixed(1)}ms\`);
    
    if (bps < 8) {
        console.warn(\`⚠️ ブロック受信率が低い！\`);
    }
    
    // TX確認状況
    if (debug.txConfirmations.size > 0) {
        console.log(\`📝 TX確認状況:\`);
        for (const [txid, info] of debug.txConfirmations) {
            if (!info.confirmed) {
                const waiting = Date.now() - info.startTime;
                console.log(\`   \${txid.substring(0, 8)}...: 待機中 (\${waiting}ms)\`);
            }
        }
    }
}, 10000);
`;

// 2. block-addedイベントハンドラーを修正（15629行目付近）
const blockAddedHandler = `
                NetworkState.rpcClient.addEventListener('block-added', (event) => {
                    const block = event.data.block;
                    const blockId = block.header.hash;
                    const blockTime = new Date(Number(block.header.timestamp));
                    const now = Date.now();
                    
                    // デバッグ情報を更新
                    const debug = window.wsDebug;
                    debug.blockCount++;
                    
                    if (!debug.firstBlockTime) {
                        debug.firstBlockTime = now;
                        console.log(\`🎯 最初のブロック受信: \${blockId.substring(0, 16)}...\`);
                    }
                    
                    if (debug.lastBlockTime) {
                        const interval = now - debug.lastBlockTime;
                        debug.blockIntervals.push(interval);
                        if (debug.blockIntervals.length > 100) {
                            debug.blockIntervals.shift(); // 最新100個のみ保持
                        }
                        
                        // 異常検出
                        if (interval > 500) {
                            console.error(\`❌ ブロック受信異常: \${interval}ms間隔 (期待値: 100ms)\`);
                        }
                    }
                    debug.lastBlockTime = now;
                    
                    // 詳細ログ（最初の10ブロックのみ）
                    if (debug.blockCount <= 10) {
                        console.log(\`📦 Block Added #\${debug.blockCount}:\`);
                        console.log(\`   Hash: \${blockId.substring(0, 16)}...\`);
                        console.log(\`   TX数: \${block.transactions?.length || 0}\`);
                        console.log(\`   時刻: \${blockTime.toISOString()}\`);
                        if (debug.blockCount > 1) {
                            console.log(\`   間隔: \${now - debug.lastBlockTime}ms\`);
                        }
                    }
`;

// 3. waitForConfirmation関数を修正（11175行目付近）
const waitForConfirmationCode = `
        async function waitForConfirmation(txid) {
            const startTime = Date.now();
            console.log(\`⏳ TX確認待機開始: \${txid.substring(0, 16)}...\`);
            console.log(\`   時刻: \${new Date().toISOString()}\`);
            
            // デバッグ情報に追加
            window.wsDebug.txConfirmations.set(txid, {
                startTime: startTime,
                confirmed: false
            });
            
            log(\`[DEBUG] waitForConfirmation開始 - TxID: \${txid.substring(0, 16)}...\`, 'debug');
            
            // v5.4.52: Restored v5.4.0 active polling logic for better performance
            let blockId = null;
            let waitTime = 0;
            let checkCount = 0;
            const maxWaitTime = 30000; // 30 seconds for RPC check
            
            // v5.4.52: Initial 2-second wait (from v5.4.0)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Active polling loop
            while (!blockId && waitTime < maxWaitTime) {
                checkCount++;
                
                // 詳細チェックログ（最初の10回と5秒ごと）
                if (checkCount <= 10 || waitTime % 5000 < 100) {
                    console.log(\`🔍 TX確認チェック #\${checkCount}:\`);
                    console.log(\`   経過時間: \${waitTime}ms\`);
                    console.log(\`   監視中: \${NetworkState.ws.monitoredTransactions?.has(txid) || false}\`);
                }
`;

// 4. TX確認成功時のログを追加
const txConfirmSuccessCode = `
                                    log(\`[DEBUG] WebSocket: 監視中のトランザクション検出！ TxID: \${txId.substring(0, 16)}... BlockID: \${blockId.substring(0, 16)}...\`, 'debug');
                                    log(\`[DEBUG] WebSocket: ブロック時刻を保存 - Time: \${blockTime.toISOString()}\`, 'debug');
                                    
                                    // デバッグ：TX確認成功
                                    const confirmTime = Date.now() - (window.wsDebug.txConfirmations.get(txId)?.startTime || Date.now());
                                    console.log(\`✅ TX確認成功！\`);
                                    console.log(\`   TxID: \${txId.substring(0, 16)}...\`);
                                    console.log(\`   BlockID: \${blockId.substring(0, 16)}...\`);
                                    console.log(\`   確認時間: \${confirmTime}ms\`);
                                    console.log(\`   ブロック番号: #\${window.wsDebug.blockCount}\`);
                                    
                                    if (window.wsDebug.txConfirmations.has(txId)) {
                                        window.wsDebug.txConfirmations.get(txId).confirmed = true;
                                        window.wsDebug.txConfirmations.get(txId).confirmTime = confirmTime;
                                    }
`;

// ファイルを修正
// 1. グローバル変数を追加
content = content.replace(
    '<script type="module">',
    '<script type="module">\n' + globalVarsCode
);

// 2. block-addedイベントハンドラーを置換
content = content.replace(
    /NetworkState\.rpcClient\.addEventListener\('block-added', \(event\) => \{[\s\S]*?const block = event\.data\.block;[\s\S]*?const blockId = block\.header\.hash;[\s\S]*?const blockTime = new Date\(Number\(block\.header\.timestamp\)\);/,
    blockAddedHandler
);

// 3. waitForConfirmation関数を置換
content = content.replace(
    /async function waitForConfirmation\(txid\) \{[\s\S]*?log\(\`\[DEBUG\] waitForConfirmation開始[^`]*\`, 'debug'\);[\s\S]*?let blockId = null;[\s\S]*?let waitTime = 0;/,
    waitForConfirmationCode
);

// 4. TX確認成功時のログを追加
content = content.replace(
    /log\(\`\[DEBUG\] WebSocket: ブロック時刻を保存[^`]*\`, 'debug'\);/g,
    txConfirmSuccessCode
);

// WebSocket接続成功時のログも追加
content = content.replace(
    "log('Block Addedイベントを購読しました', 'success');",
    `log('Block Addedイベントを購読しました', 'success');
                console.log(\`🔌 WebSocket接続確立: \${new Date().toISOString()}\`);
                console.log(\`   エンドポイント: \${selectedEndpoint}\`);
                console.log(\`   ネットワーク: \${config.network}\`);`
);

// ファイルを保存
fs.writeFileSync('index-debug.html', content);
console.log('✅ デバッグログを追加したindex-debug.htmlを作成しました');
console.log('ブラウザでhttp://localhost:8080/index-debug.htmlにアクセスしてください');