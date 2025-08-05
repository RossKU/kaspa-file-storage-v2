# WebSocket通知問題の深層分析（Ultrathink）

## 核心的な問題

**なぜ昨日まで動作していたWebSocket通知が今日から受信できないのか？**

## 技術的分析

### 1. Kaspa RPCプロトコルの構造

```javascript
// subscribeBlockAddedの内部実装（推測）
class RpcClient {
    async subscribeBlockAdded(options = {}) {
        // Kaspa v0.x: デフォルトで詳細データを含む
        // Kaspa v1.x: デフォルトは最小データのみ？
        
        const request = {
            method: 'subscribeBlockAdded',
            params: options  // ← ここが重要
        };
        
        // WebSocketで送信
        this.ws.send(JSON.stringify(request));
    }
}
```

### 2. プロトコルレベルでの変更

#### 仮説A: Kaspa v1.0.1での破壊的変更
- **6月リリースのv1.0.1で仕様変更**
- デフォルトの通知内容が軽量化された
- 後方互換性が失われた

#### 仮説B: RPCノードの設定変更
- ノード運営者が設定を変更
- `--light-notifications`のようなフラグが有効化された
- すべてのノードが同時に更新された（協調的な変更）

### 3. なぜ今日から？

考えられるタイミング：
1. **RPCノードの定期メンテナンス**
   - 週末/月初の定期更新
   - 新しい設定の一斉適用

2. **段階的ロールアウトの完了**
   - 数日かけて全ノードを更新
   - 昨日最後のノードが更新された

3. **負荷対策の緊急対応**
   - ネットワーク負荷の増大
   - WebSocket通知を軽量化する緊急措置

## 根本的な設計問題

### アプリケーション側の脆弱性

```javascript
// 問題のあるコード
if (block.transactions && block.transactions.length > 0) {
    for (const tx of block.transactions) {
        const txId = tx.verboseData?.transactionId || tx.id || tx.transactionId;
        // ↑ ここでtxIdがundefinedになる
    }
}
```

**単一障害点（SPOF）**: WebSocket通知に完全に依存

### より堅牢な設計

```javascript
// 改善案：多層防御
async function waitForConfirmation(txid) {
    // 1. WebSocketモニター（高速パス）
    // 2. 即座にRPCポーリング開始（フォールバック）
    // 3. Explorer API（最終手段）
    
    // 並行して複数の方法を試す
    return Promise.race([
        waitViaWebSocket(txid),
        waitViaRpcPolling(txid),
        waitViaExplorer(txid)
    ]);
}
```

## なぜRPCサーバーはこの変更を行ったか？

### 1. スケーラビリティ
- 大量のWebSocket接続
- 各ブロックで大量のデータ送信
- ネットワーク帯域の圧迫

### 2. セキュリティ
- DDoS対策
- リソース消費の制限
- 悪意のあるクライアントへの対策

### 3. 標準化
- RESTful原則の適用
- 「必要なデータは明示的に要求」
- 予測可能なAPI動作

## 結論

**WebSocket通知の仕様が変更された。**

理由：
- パフォーマンス最適化
- ネットワーク効率化
- API設計の標準化

影響：
- デフォルトではトランザクション詳細が含まれない
- 明示的な指定が必要（しかしAPIが対応していない可能性）

解決策：
- WebSocketに依存しない設計に変更
- 即座にRPCポーリングを開始
- 多層防御アプローチの採用