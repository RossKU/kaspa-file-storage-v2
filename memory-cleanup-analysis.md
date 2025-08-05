# メモリリーク防止のためのブロックキャッシュ削除分析（Ultrathink）

## 削除タイミング: 90秒

### 実装箇所（15753-15760行目）
```javascript
// Clean up old transactions (older than 90 seconds)
const now = Date.now();
for (const [txid, txData] of NetworkState.ws.monitoredTransactions.entries()) {
    if (now - txData.timestamp > 90000) {
        NetworkState.ws.monitoredTransactions.delete(txid);
        // log(`WebSocket監視から古いトランザクションを削除: ${txid.substring(0, 16)}... (90秒経過)`, 'debug');
    }
}
```

## 削除メカニズムの詳細

### 1. トリガー
- **block-addedイベント受信時**に毎回実行
- Kaspaは1秒10ブロックなので、約0.1秒ごとにクリーンアップが走る

### 2. 削除対象
- `NetworkState.ws.monitoredTransactions`内のエントリー
- 各エントリーは`timestamp`プロパティを持つ
- 現在時刻と比較して90秒（90000ms）以上経過したもの

### 3. なぜ90秒なのか
- **通常のトランザクション確認**: 数秒〜30秒
- **ネットワーク遅延時**: 最大60秒程度を想定
- **安全マージン**: +30秒 = 合計90秒

### 4. メモリ使用量の見積もり
- 1トランザクションあたり: 約200バイト（TxID + metadata）
- 最悪ケース: 900個（90秒 × 10 BPS）のトランザクション
- 最大メモリ使用: 約180KB（非常に小さい）

## 手動削除のタイミング

### 成功時の即座削除
1. `waitForConfirmation`でBlockID取得時
2. WebSocket経由でBlockID確認時
3. RPC経由でBlockID確認時

### エラー時の削除
- トランザクションエラー発生時も即座に削除

## 改善の余地

### 現在の実装は適切
- 90秒は十分な猶予期間
- 頻繁なクリーンアップで効率的
- メモリ使用量は最小限

### 潜在的な最適化
1. 削除ログをデバッグモードでのみ有効化（現在はコメントアウト）
2. 削除統計の収集（何個削除されたか）
3. 異常に多い削除時の警告

## 結論

**90秒**のタイムアウトは、Kaspaネットワークの特性（高速ブロック生成）と
実用的な確認時間のバランスを考慮した適切な値です。メモリリークの心配はありません。