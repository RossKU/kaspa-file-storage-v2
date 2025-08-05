# WebSocketブロック遅延検証機能設計（Ultrathink）

## 実装概要

### 1. WebSocketブロック遅延測定
```javascript
class WebSocketDelayMonitor {
    constructor() {
        this.blockTimes = [];
        this.maxSamples = 20; // 最初の20ブロック
        this.expectedInterval = 100; // 10BPS = 100ms
        this.lastBlockTime = null;
        this.avgDelay = 0;
        this.isHealthy = true;
    }
    
    onBlockReceived(timestamp) {
        if (this.lastBlockTime) {
            const interval = timestamp - this.lastBlockTime;
            const delay = interval - this.expectedInterval;
            
            if (this.blockTimes.length < this.maxSamples) {
                this.blockTimes.push({
                    interval,
                    delay,
                    timestamp
                });
                
                // 平均遅延を計算
                if (this.blockTimes.length >= 10) {
                    this.calculateHealth();
                }
            }
        }
        this.lastBlockTime = timestamp;
    }
    
    calculateHealth() {
        const avgInterval = this.blockTimes.reduce((sum, b) => sum + b.interval, 0) / this.blockTimes.length;
        this.avgDelay = avgInterval - this.expectedInterval;
        
        // 健全性判定
        if (this.avgDelay < 500) {
            this.isHealthy = true;
            this.healthStatus = '優良';
        } else if (this.avgDelay < 2000) {
            this.isHealthy = true;
            this.healthStatus = '良好';
        } else if (this.avgDelay < 5000) {
            this.isHealthy = false;
            this.healthStatus = '遅延';
        } else {
            this.isHealthy = false;
            this.healthStatus = '異常';
        }
    }
}
```

### 2. UI表示
```
WebSocket Health: 🟢 優良
Block Interval: 145ms (expected: 100ms)
Avg Delay: +45ms
Recommendation: このノードは高速です
```

### 3. 実装箇所
- WebSocketManager初期化時にDelayMonitor作成
- block-addedイベントで測定
- ステータスタブに表示追加

### 4. 判定基準
- 優良: < 500ms遅延
- 良好: < 2000ms遅延
- 遅延: < 5000ms遅延
- 異常: >= 5000ms遅延

### 5. アクション
- 遅延/異常時：警告表示
- 代替ノードの提案
- 自動切り替えオプション（将来）