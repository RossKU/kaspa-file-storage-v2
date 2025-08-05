# Kaspaネットワーク遅延対応 - レジリエンス強化計画（Ultrathink）

## 現状の問題
- Kaspaネットワークのアクセプトが異常に遅い（期待値の7倍以上）
- 固定タイムアウト（30秒）では対応困難
- ユーザーエクスペリエンスが著しく低下

## フォールバック処理の設計

### 1. 動的タイムアウト調整システム

```javascript
class DynamicTimeout {
    constructor() {
        this.baseTimeout = 30000; // 30秒
        this.maxTimeout = 300000; // 5分
        this.history = [];        // 直近の応答時間履歴
        this.windowSize = 10;     // 履歴のウィンドウサイズ
    }
    
    // 実測値に基づいてタイムアウトを計算
    calculateTimeout() {
        if (this.history.length === 0) {
            return this.baseTimeout;
        }
        
        // 平均 + 標準偏差 × 2
        const avg = this.history.reduce((a, b) => a + b) / this.history.length;
        const variance = this.history.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / this.history.length;
        const stdDev = Math.sqrt(variance);
        
        const dynamicTimeout = Math.ceil(avg + (stdDev * 2));
        return Math.min(dynamicTimeout, this.maxTimeout);
    }
    
    // 実測値を記録
    recordResponseTime(time) {
        this.history.push(time);
        if (this.history.length > this.windowSize) {
            this.history.shift();
        }
    }
}
```

### 2. インテリジェントリトライ戦略

```javascript
class SmartRetry {
    constructor() {
        this.strategies = {
            // 指数バックオフ
            exponential: (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000),
            // 線形バックオフ
            linear: (attempt) => 2000 * attempt,
            // ジッター付き指数バックオフ
            jitter: (attempt) => {
                const base = Math.min(1000 * Math.pow(2, attempt), 30000);
                return base + Math.random() * 1000;
            }
        };
        
        this.currentStrategy = 'jitter';
        this.maxRetries = 5;
    }
    
    async executeWithRetry(operation, context) {
        let lastError;
        
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                // ネットワーク状態をチェック
                if (!navigator.onLine) {
                    await this.waitForNetwork();
                }
                
                const result = await operation();
                
                // 成功したらリトライカウンターをリセット
                return result;
                
            } catch (error) {
                lastError = error;
                log(`リトライ ${attempt + 1}/${this.maxRetries}: ${error.message}`, 'warning');
                
                if (attempt < this.maxRetries - 1) {
                    const delay = this.strategies[this.currentStrategy](attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
    
    async waitForNetwork() {
        return new Promise((resolve) => {
            const checkNetwork = () => {
                if (navigator.onLine) {
                    resolve();
                } else {
                    setTimeout(checkNetwork, 1000);
                }
            };
            checkNetwork();
        });
    }
}
```

### 3. ネットワーク品質モニター

```javascript
class NetworkQualityMonitor {
    constructor() {
        this.metrics = {
            latency: [],
            successRate: 0,
            totalRequests: 0,
            successfulRequests: 0,
            networkQuality: 'good' // good, degraded, poor
        };
        
        this.thresholds = {
            good: { latency: 3000, successRate: 0.95 },
            degraded: { latency: 10000, successRate: 0.80 },
            poor: { latency: 30000, successRate: 0.50 }
        };
    }
    
    updateMetrics(success, latency) {
        this.metrics.totalRequests++;
        
        if (success) {
            this.metrics.successfulRequests++;
            this.metrics.latency.push(latency);
            
            // 最新20件のみ保持
            if (this.metrics.latency.length > 20) {
                this.metrics.latency.shift();
            }
        }
        
        this.metrics.successRate = this.metrics.successfulRequests / this.metrics.totalRequests;
        this.evaluateNetworkQuality();
    }
    
    evaluateNetworkQuality() {
        const avgLatency = this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length || 0;
        
        if (avgLatency < this.thresholds.good.latency && 
            this.metrics.successRate > this.thresholds.good.successRate) {
            this.metrics.networkQuality = 'good';
        } else if (avgLatency < this.thresholds.degraded.latency && 
                   this.metrics.successRate > this.thresholds.degraded.successRate) {
            this.metrics.networkQuality = 'degraded';
        } else {
            this.metrics.networkQuality = 'poor';
        }
        
        this.updateUI();
    }
    
    updateUI() {
        const indicator = document.getElementById('networkQualityIndicator');
        if (!indicator) return;
        
        const colors = {
            good: '#4CAF50',
            degraded: '#FF9800',
            poor: '#F44336'
        };
        
        const messages = {
            good: 'ネットワーク状態: 良好',
            degraded: 'ネットワーク状態: 遅延あり',
            poor: 'ネットワーク状態: 非常に遅い'
        };
        
        indicator.style.color = colors[this.metrics.networkQuality];
        indicator.textContent = messages[this.metrics.networkQuality];
        
        // 警告表示
        if (this.metrics.networkQuality === 'poor') {
            this.showWarning();
        }
    }
    
    showWarning() {
        const warning = `
            ⚠️ ネットワークが非常に遅い状態です
            - 平均応答時間: ${(this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length / 1000).toFixed(1)}秒
            - 成功率: ${(this.metrics.successRate * 100).toFixed(1)}%
            
            アップロードに通常より時間がかかります。
        `;
        log(warning, 'warning');
    }
}
```

### 4. 進捗保存の強化

```javascript
class EnhancedProgressManager {
    constructor(existing) {
        // 既存の実装を継承
        Object.assign(this, existing);
        
        // 追加機能
        this.autoSaveInterval = null;
        this.lastSaveTime = Date.now();
        this.saveThrottle = 5000; // 5秒ごと
    }
    
    // チャンクごとの自動保存
    async markChunkInProgress(index) {
        this.progress.chunks[index].status = 'uploading';
        this.progress.chunks[index].startTime = Date.now();
        
        // 即座に保存（エラー時の復旧用）
        await this.saveProgressImmediate();
    }
    
    // スロットル付き保存
    async saveProgress() {
        const now = Date.now();
        if (now - this.lastSaveTime < this.saveThrottle) {
            // スロットル中はキューに入れる
            if (!this.pendingSave) {
                this.pendingSave = setTimeout(() => {
                    this.saveProgressImmediate();
                    this.pendingSave = null;
                }, this.saveThrottle - (now - this.lastSaveTime));
            }
            return;
        }
        
        await this.saveProgressImmediate();
    }
    
    // 即座に保存
    async saveProgressImmediate() {
        this.lastSaveTime = Date.now();
        
        // 既存の保存処理
        await super.saveProgress();
        
        // 追加: IndexedDBにもバックアップ
        await this.saveToIndexedDB();
    }
    
    // IndexedDBへのバックアップ
    async saveToIndexedDB() {
        try {
            const db = await this.openDB();
            const tx = db.transaction(['progress'], 'readwrite');
            const store = tx.objectStore('progress');
            
            await store.put({
                id: this.progress.fileId,
                data: this.progress,
                timestamp: Date.now()
            });
            
            await tx.complete;
        } catch (error) {
            console.error('IndexedDB保存エラー:', error);
        }
    }
}
```

### 5. ユーザーフィードバックの改善

```javascript
class NetworkStatusUI {
    constructor() {
        this.createStatusBar();
    }
    
    createStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.id = 'networkStatusBar';
        statusBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 30px;
            background: #333;
            color: white;
            display: none;
            align-items: center;
            padding: 0 20px;
            z-index: 10000;
            font-size: 14px;
        `;
        
        statusBar.innerHTML = `
            <span id="networkQualityIndicator"></span>
            <span style="margin-left: 20px;" id="currentOperation"></span>
            <span style="margin-left: auto;" id="estimatedTime"></span>
        `;
        
        document.body.appendChild(statusBar);
    }
    
    show() {
        document.getElementById('networkStatusBar').style.display = 'flex';
    }
    
    hide() {
        document.getElementById('networkStatusBar').style.display = 'none';
    }
    
    updateOperation(text) {
        document.getElementById('currentOperation').textContent = text;
    }
    
    updateEstimatedTime(seconds) {
        const elem = document.getElementById('estimatedTime');
        if (seconds > 0) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            elem.textContent = `予想残り時間: ${minutes}分${secs}秒`;
        } else {
            elem.textContent = '';
        }
    }
}
```

## 実装優先順位

1. **高優先度**
   - 動的タイムアウト調整
   - 進捗の即時保存
   - ネットワーク状態表示

2. **中優先度**
   - インテリジェントリトライ
   - ネットワーク品質モニター
   - IndexedDBバックアップ

3. **低優先度**
   - 詳細な統計情報
   - 予想時間の精度向上

## 期待される効果

- ネットワークが遅い場合でも確実にアップロード完了
- ユーザーが状況を把握できる
- 中断しても確実に再開可能
- ネットワーク状態に応じた最適な動作