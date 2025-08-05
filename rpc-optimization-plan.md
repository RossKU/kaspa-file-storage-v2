# RPCノード最適化計画（Ultrathink）

## 問題認識
- Tx送信後の検証時間がアップロード速度に直結
- 30秒遅延 = アップロード時間の大幅増加
- 現在は単一RPCノードに依存

## 提案する最適化戦略

### 1. WebSocketブロック遅延測定
**初期化時の検証**
```javascript
// 最初の10ブロック受信時間を測定
const blockDelays = [];
let expectedInterval = 100; // 10BPS = 100ms間隔

// ブロック受信ごとに遅延を記録
if (blockDelays.length < 10) {
    const delay = actualTime - expectedTime;
    blockDelays.push(delay);
}

// 平均遅延を計算
const avgDelay = blockDelays.reduce((a,b) => a+b) / blockDelays.length;
```

### 2. RPCノード評価指標
- **WebSocket遅延**: ブロック受信の遅れ（ms）
- **RPC応答時間**: getBlockDagInfo等の応答速度
- **ネットワーク位置**: 地理的な近さ

### 3. 複数ノード戦略
```javascript
// ノードプール
const rpcNodes = [
    { url: 'node1', score: 0, wsDelay: 0, rpcTime: 0 },
    { url: 'node2', score: 0, wsDelay: 0, rpcTime: 0 },
    // ...
];

// スコアリング（低いほど良い）
score = wsDelay * 0.5 + rpcTime * 0.3 + networkDistance * 0.2;
```

### 4. UI表示案
```
RPC Node: node1.kaspa.org
WS Delay: 150ms (良好) | RPC: 45ms | Score: 82/100
```

### 5. 自動切り替え
- 遅延が閾値を超えたら自動的に次善のノードへ
- ユーザーに通知して透明性確保

## 実装優先順位
1. WebSocket遅延測定（即効性高）
2. 複数ノード対応（信頼性向上）
3. 自動最適化（UX向上）