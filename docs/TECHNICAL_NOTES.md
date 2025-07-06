# Kaspa File Storage Technical Notes

## 🔧 技術仕様

### ネットワーク構成
- **Testnet-10**: `wss://fermion-10.kaspa.green/kaspa/testnet-10/wrpc/borsh`
- **Mainnet**: 対応（未テスト）
- **Explorer API**: `https://api-tn10.kaspa.org`（Testnet）、`https://api.kaspa.org`（Mainnet）

### ファイル処理制限
- **チャンクサイズ**: 12KB（デフォルト）
- **ペイロード制限**: 24KB/トランザクション
- **並列ダウンロード**: 8接続、80-120チャンク/秒
- **最小送金額**: 1 KAS（Storage mass要件）

### 暗号化仕様
- **アルゴリズム**: AES-256-GCM
- **鍵導出**: PBKDF2（10,000回反復）
- **Salt**: SHA256ハッシュから16バイト
- **IV**: チャンクごとにユニーク生成

## 📊 TxIDマイニング最適化

### パフォーマンス履歴
1. **初期実装**: 1,000 H/s（シングルスレッド）
2. **Web Worker導入**: 5,000 H/s（5倍向上）
3. **バッチ処理最適化**: 20,000 H/s（20倍向上）
4. **最終実装**: 43,295 H/s（43倍向上）

### 実装詳細
```javascript
// 最適化されたマイニング設定
const MINING_CONFIG = {
    workers: 8,              // 並列ワーカー数
    batchSize: 50000,       // バッチサイズ
    targetPattern: '0000',   // デフォルトパターン
    timeout: 300000         // 5分タイムアウト
};
```

### パフォーマンステスト結果
- **0000パターン**: 3-5秒で発見
- **00000パターン**: 30-60秒
- **000000パターン**: 5-10分（実用限界）

### 理論的最適化分析

#### ボトルネック分析
1. **SHA-256計算**: 70%（主要ボトルネック）
2. **BigInt操作**: 20%
3. **メッセージパッシング**: 10%

#### 提案された最適化（未実装）
1. **GPU並列化**: WebGPU APIで100倍高速化可能
2. **WASM最適化**: ネイティブSHA-256実装
3. **プログレッシブマッチング**: 段階的パターン検証

## 🚀 並列ダウンロード実装

### ParallelDownloaderクラス
```javascript
class ParallelDownloader {
    constructor(rpcClient, concurrency = 8) {
        this.concurrency = concurrency;  // 並列数
        this.queue = [];                 // 待機キュー
        this.active = 0;                 // アクティブ接続数
        this.results = new Map();        // 結果マップ
    }
}
```

### パフォーマンス特性
- **シーケンシャル**: 10-20チャンク/秒
- **8並列**: 80-120チャンク/秒
- **オーバーヘッド**: 約5%（管理コスト）
- **エラー率**: 0.1%未満（自動リトライで解決）

### 自動モード選択
- 10チャンク未満: シーケンシャルモード
- 10チャンク以上: 並列モード（自動）

## 🔍 WebSocket監視システム

### 実装戦略
1. **リアルタイム監視**: 新ブロック通知を購読
2. **履歴バッファ**: 過去90秒のトランザクション保持
3. **Explorer APIフォールバック**: 99.9%の信頼性確保

### タイミング設定
```javascript
const MONITORING_CONFIG = {
    wsRetention: 90000,      // 90秒保持
    rpcDelay: 30000,        // 30秒後にRPC確認
    cleanupInterval: 10000   // 10秒ごとにクリーンアップ
};
```

## 💡 重要な技術的教訓

### WASM SDK統合
```javascript
// 正しい初期化（必須）
kaspa = await import('./kaspa-core.js');
await kaspa.default('./kaspa-core_bg.wasm');  // これを忘れるとエラー
window.kaspa = kaspa;
```

### よくあるエラーと解決策

#### Storage Mass Error
- **原因**: 0 KAS送金でmass = ∞
- **解決**: 最小1 KAS送金

#### Partially Signed Error
- **原因**: WASM初期化不完全
- **解決**: 段階的初期化（3ステップ）

#### Orphan Transaction
- **原因**: 前のTx未確定
- **解決**: 各チャンクで新UTXO取得

### ネットワーク特性
- **ブロック生成**: 1秒あたり10ブロック
- **確定時間**: 約10秒（10ブロック）
- **プルーニング**: 16時間後（暗号証明は残る）

## 📈 パフォーマンスベンチマーク

### アップロード速度
- **単一接続**: 2秒/チャンク
- **実効速度**: 6KB/秒
- **100MBファイル**: 約2.8時間

### ダウンロード速度
- **並列8接続**: 100チャンク/秒
- **実効速度**: 1.2MB/秒
- **100MBファイル**: 約1.4分

### コスト効率
- **チャンクあたり**: 0.00021 KAS
- **1GBあたり**: 約1.7 KAS
- **現在の容量**: 76.5GB（979 KAS）