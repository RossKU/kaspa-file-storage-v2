# WebSocketデバッグログ分析（Ultrathink）

## アップロードシーケンス分析結果

### 1. 基本フロー
```
1. sendTransaction(transaction)
   ↓ トランザクション送信
2. waitForConfirmation(txid) - 最大30秒待機
   ↓ 2秒初期待機
   ↓ WebSocket監視チェック（100msごと）
   ↓ 30秒後にRPC確認
3. block-addedイベント受信
   ↓ ブロック内のトランザクションをチェック
   ↓ monitoredTransactionsを更新
```

### 2. Kaspaネットワーク特性
- **1秒に10ブロック生成**
- つまり100msごとに1ブロック
- 正常なら0.1秒でトランザクションが確認されるはず

### 3. 現在の問題
- トランザクションは0.1秒で確認されている（ユーザー報告）
- しかしアプリは30秒待ってもBlockIDを取得できない
- WebSocketのblock-addedイベントが受信されていない可能性

## 必要なデバッグログ設計

### A. WebSocket接続状態の詳細ログ
```javascript
// 1. WebSocket接続確立時
console.log(`🔌 WebSocket接続確立: ${new Date().toISOString()}`);
console.log(`   エンドポイント: ${endpoint}`);
console.log(`   購読状態: ${subscribed}`);

// 2. block-addedイベント受信時
console.log(`📦 Block Added イベント受信 #${blockCount}:`);
console.log(`   時刻: ${new Date().toISOString()}`);
console.log(`   ブロックハッシュ: ${blockHash}`);
console.log(`   TX数: ${txCount}`);
console.log(`   前回からの経過時間: ${deltaMs}ms`);
```

### B. ブロック受信統計（1秒10ブロック検証）
```javascript
// 10秒ごとに統計表示
setInterval(() => {
    const blocksPerSecond = blockCount / elapsedSeconds;
    console.log(`📊 ブロック受信統計:`);
    console.log(`   総ブロック数: ${blockCount}`);
    console.log(`   経過時間: ${elapsedSeconds}秒`);
    console.log(`   平均BPS: ${blocksPerSecond.toFixed(2)} (期待値: 10)`);
    console.log(`   受信率: ${(blocksPerSecond / 10 * 100).toFixed(1)}%`);
    
    // 警告
    if (blocksPerSecond < 8) {
        console.warn(`⚠️ ブロック受信率が低い！`);
    }
}, 10000);
```

### C. トランザクション追跡の詳細ログ
```javascript
// waitForConfirmation内
console.log(`⏳ TX確認待機開始: ${txid}`);
console.log(`   送信時刻: ${new Date().toISOString()}`);

// 100msごとのチェック
console.log(`🔍 TX確認チェック #${checkCount}:`);
console.log(`   経過時間: ${elapsed}ms`);
console.log(`   WebSocket監視中: ${monitoredTransactions.has(txid)}`);
console.log(`   BlockID: ${blockId || '未確認'}`);

// block-addedイベント内
if (myTransactionFound) {
    console.log(`✅ TX確認成功！`);
    console.log(`   TxID: ${txid}`);
    console.log(`   BlockID: ${blockId}`);
    console.log(`   確認時間: ${confirmTime}ms`);
}
```

### D. 異常検出ログ
```javascript
// 1. ブロック受信の異常
if (Date.now() - lastBlockTime > 500) { // 0.5秒以上ブロックなし
    console.error(`❌ ブロック受信異常: ${Date.now() - lastBlockTime}ms無受信`);
}

// 2. TX確認の異常
if (elapsed > 5000 && !blockId) { // 5秒以上未確認
    console.error(`❌ TX確認異常: ${elapsed}ms経過も未確認`);
    console.error(`   監視リスト: ${Array.from(monitoredTransactions.keys())}`);
}

// 3. WebSocket切断検出
rpcClient.addEventListener('disconnect', () => {
    console.error(`❌ WebSocket切断検出: ${new Date().toISOString()}`);
});
```

### E. 実装箇所
1. **15629行目** - block-addedイベントリスナー内
2. **11176行目** - waitForConfirmation関数内
3. **15600行目** - subscribeBlockAdded成功後

## 期待される出力例（正常時）
```
🔌 WebSocket接続確立: 2025-08-05T00:00:00.000Z
📦 Block Added イベント受信 #1: 100ms
📦 Block Added イベント受信 #2: 98ms
📦 Block Added イベント受信 #3: 102ms
...（1秒に約10個）
⏳ TX確認待機開始: abc123...
✅ TX確認成功！ 確認時間: 95ms
📊 ブロック受信統計: 平均BPS: 9.8 (受信率: 98.0%)
```

## 異常時の出力例
```
🔌 WebSocket接続確立: 2025-08-05T00:00:00.000Z
📦 Block Added イベント受信 #1: 100ms
❌ ブロック受信異常: 5000ms無受信
⏳ TX確認待機開始: abc123...
❌ TX確認異常: 30000ms経過も未確認
```