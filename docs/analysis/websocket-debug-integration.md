# WebSocketデバッグログ統合計画（Ultrathink）

## アーキテクチャマップに基づく最適な挿入場所

### 1. AppState拡張（2129行目付近）
```javascript
// AppState.settingsに追加
settings: {
    parallelDownloadEnabled: false,
    devWalletEnabled: true,
    wsDebugEnabled: false  // 新規追加：WebSocketデバッグログ
},
```

### 2. WebSocketデバッグ用グローバル変数（NetworkState直後、2400行目付近）
```javascript
// WebSocketデバッグ情報
const WSDebugInfo = {
    enabled: false,
    blockCount: 0,
    firstBlockTime: null,
    lastBlockTime: null,
    blockIntervals: [],
    txConfirmations: new Map(),
    startTime: null,
    
    reset() {
        this.blockCount = 0;
        this.firstBlockTime = null;
        this.lastBlockTime = null;
        this.blockIntervals = [];
        this.txConfirmations.clear();
        this.startTime = Date.now();
    }
};

// 統計表示タイマー
let wsDebugTimer = null;
```

### 3. 設定タブUI（1889行目後、ダウンロード設定の後）
```html
<div class="metric-box">
    <h3>デバッグ設定</h3>
    <div class="setting-row">
        <div class="setting-label">
            WebSocketデバッグログ<br>
            <small style="color: var(--text-secondary);">1秒10ブロックの受信状況を詳細ログ出力</small>
        </div>
        <label class="toggle-switch">
            <input type="checkbox" id="wsDebugToggle" onchange="toggleWSDebug()">
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
```

### 4. toggleWSDebug関数（UIハンドラー部分、17000行目付近）
```javascript
function toggleWSDebug() {
    const toggle = document.getElementById('wsDebugToggle');
    const enabled = toggle.checked;
    
    AppState.settings.wsDebugEnabled = enabled;
    WSDebugInfo.enabled = enabled;
    
    if (enabled) {
        log('🔍 WebSocketデバッグログを有効化しました', 'info');
        WSDebugInfo.reset();
        startWSDebugTimer();
    } else {
        log('🔍 WebSocketデバッグログを無効化しました', 'info');
        stopWSDebugTimer();
    }
    
    // 設定を保存
    saveSettings();
}

function startWSDebugTimer() {
    if (wsDebugTimer) return;
    
    wsDebugTimer = setInterval(() => {
        if (!WSDebugInfo.enabled || WSDebugInfo.blockCount === 0) return;
        
        const elapsed = (Date.now() - WSDebugInfo.startTime) / 1000;
        const bps = WSDebugInfo.blockCount / elapsed;
        const avgInterval = WSDebugInfo.blockIntervals.length > 0 
            ? WSDebugInfo.blockIntervals.reduce((a,b) => a+b, 0) / WSDebugInfo.blockIntervals.length 
            : 0;
        
        console.log(`📊 WebSocket統計 (${elapsed.toFixed(1)}秒経過):`);
        console.log(`   総ブロック数: ${WSDebugInfo.blockCount}`);
        console.log(`   平均BPS: ${bps.toFixed(2)} (期待値: 10)`);
        console.log(`   受信率: ${(bps / 10 * 100).toFixed(1)}%`);
        console.log(`   平均間隔: ${avgInterval.toFixed(1)}ms`);
        
        if (bps < 8) {
            console.warn(`⚠️ ブロック受信率が低い！`);
        }
        
        // TX確認状況
        if (WSDebugInfo.txConfirmations.size > 0) {
            console.log(`📝 TX確認状況:`);
            for (const [txid, info] of WSDebugInfo.txConfirmations) {
                if (!info.confirmed) {
                    const waiting = Date.now() - info.startTime;
                    console.log(`   ${txid.substring(0, 8)}...: 待機中 (${waiting}ms)`);
                }
            }
        }
    }, 10000); // 10秒ごと
}

function stopWSDebugTimer() {
    if (wsDebugTimer) {
        clearInterval(wsDebugTimer);
        wsDebugTimer = null;
    }
}
```

### 5. block-addedイベント修正（15629行目）
```javascript
NetworkState.rpcClient.addEventListener('block-added', (event) => {
    const block = event.data.block;
    const blockId = block.header.hash;
    const blockTime = new Date(Number(block.header.timestamp));
    const now = Date.now();
    
    // WebSocketデバッグ情報を更新
    if (WSDebugInfo.enabled) {
        WSDebugInfo.blockCount++;
        
        if (!WSDebugInfo.firstBlockTime) {
            WSDebugInfo.firstBlockTime = now;
            console.log(`🎯 最初のブロック受信: ${blockId.substring(0, 16)}...`);
        }
        
        if (WSDebugInfo.lastBlockTime) {
            const interval = now - WSDebugInfo.lastBlockTime;
            WSDebugInfo.blockIntervals.push(interval);
            if (WSDebugInfo.blockIntervals.length > 100) {
                WSDebugInfo.blockIntervals.shift();
            }
            
            // 異常検出
            if (interval > 500) {
                console.error(`❌ ブロック受信異常: ${interval}ms間隔 (期待値: 100ms)`);
            }
        }
        WSDebugInfo.lastBlockTime = now;
        
        // 詳細ログ（最初の10ブロックのみ）
        if (WSDebugInfo.blockCount <= 10) {
            console.log(`📦 Block Added #${WSDebugInfo.blockCount}:`);
            console.log(`   Hash: ${blockId.substring(0, 16)}...`);
            console.log(`   TX数: ${block.transactions?.length || 0}`);
            console.log(`   時刻: ${blockTime.toISOString()}`);
            if (WSDebugInfo.blockCount > 1) {
                console.log(`   間隔: ${now - (WSDebugInfo.lastBlockTime || now)}ms`);
            }
        }
    }
    
    // 既存のコード...
```

### 6. waitForConfirmation修正（11175行目）
```javascript
async function waitForConfirmation(txid) {
    const startTime = Date.now();
    
    // WebSocketデバッグ
    if (WSDebugInfo.enabled) {
        console.log(`⏳ TX確認待機開始: ${txid.substring(0, 16)}...`);
        console.log(`   時刻: ${new Date().toISOString()}`);
        
        WSDebugInfo.txConfirmations.set(txid, {
            startTime: startTime,
            confirmed: false
        });
    }
    
    log(`[DEBUG] waitForConfirmation開始 - TxID: ${txid.substring(0, 16)}...`, 'debug');
    
    let blockId = null;
    let waitTime = 0;
    let checkCount = 0;
    const maxWaitTime = 30000;
    
    // 既存のコード...
    
    // ポーリングループ内
    while (!blockId && waitTime < maxWaitTime) {
        checkCount++;
        
        // デバッグログ
        if (WSDebugInfo.enabled && (checkCount <= 10 || waitTime % 5000 < 100)) {
            console.log(`🔍 TX確認チェック #${checkCount}:`);
            console.log(`   経過時間: ${waitTime}ms`);
            console.log(`   監視中: ${NetworkState.ws.monitoredTransactions?.has(txid) || false}`);
        }
        
        // 既存のチェックコード...
    }
```

### 7. TX確認成功時のログ（15658行目付近）
```javascript
// 既存のログの後に追加
if (WSDebugInfo.enabled && WSDebugInfo.txConfirmations.has(txId)) {
    const confirmTime = Date.now() - WSDebugInfo.txConfirmations.get(txId).startTime;
    console.log(`✅ TX確認成功！`);
    console.log(`   TxID: ${txId.substring(0, 16)}...`);
    console.log(`   BlockID: ${blockId.substring(0, 16)}...`);
    console.log(`   確認時間: ${confirmTime}ms`);
    console.log(`   ブロック番号: #${WSDebugInfo.blockCount}`);
    
    WSDebugInfo.txConfirmations.get(txId).confirmed = true;
    WSDebugInfo.txConfirmations.get(txId).confirmTime = confirmTime;
}
```

### 8. WebSocket接続時のログ（15600行目付近）
```javascript
log('Block Addedイベントを購読しました', 'success');
if (WSDebugInfo.enabled) {
    console.log(`🔌 WebSocket接続確立: ${new Date().toISOString()}`);
    console.log(`   エンドポイント: ${selectedEndpoint}`);
    console.log(`   ネットワーク: ${config.network}`);
}
```

### 9. 設定の保存と読み込み
```javascript
// saveSettings関数に追加
localStorage.setItem('wsDebugEnabled', AppState.settings.wsDebugEnabled);

// loadSettings関数に追加
AppState.settings.wsDebugEnabled = localStorage.getItem('wsDebugEnabled') === 'true';
if (document.getElementById('wsDebugToggle')) {
    document.getElementById('wsDebugToggle').checked = AppState.settings.wsDebugEnabled;
}
```

## 期待される効果

1. **リアルタイム監視**: 1秒10ブロックの受信状況をリアルタイムで確認
2. **異常検出**: ブロック受信間隔が500ms以上の場合に警告
3. **TX追跡**: トランザクション確認時間の詳細追跡
4. **統計情報**: 10秒ごとの受信率とパフォーマンス統計
5. **ON/OFF制御**: 必要な時だけデバッグログを有効化

## 実装の優先順位

1. AppStateとWSDebugInfo定義
2. 設定タブUI追加
3. block-addedイベント修正
4. waitForConfirmation修正
5. toggleWSDebug関数実装
6. 統計タイマー実装