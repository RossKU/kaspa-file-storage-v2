# グローバル変数リファクタリング計画

## ⚠️ 重要な注意事項

グローバル変数の変更は**破滅的なインパクト**を持つ可能性があります。
極めて慎重に、段階的に実施する必要があります。

## 📊 現在のグローバル変数（27個）

### 1. ネットワーク関連（6個）
```javascript
let kaspa = null;                    // Kaspa SDKインスタンス
let rpcClient = null;                // RPCクライアント
let wsConnection = null;             // WebSocket接続
let wsConnected = false;             // WebSocket接続状態
let wsReconnectInterval = null;      // 再接続インターバル
let wsMonitorActive = false;         // WebSocket監視状態
```

### 2. ファイル操作関連（6個）
```javascript
let currentFile = null;              // 現在選択中のファイル
let currentPassword = null;          // 現在のパスワード
let processedChunks = [];           // 処理済みチャンク
let kaspaMetadata = null;           // Kaspaメタデータ
let directoryMetadata = null;       // ディレクトリメタデータ
let progressManager = null;         // 進捗管理マネージャー
```

### 3. アップロード状態（6個）
```javascript
let uploadingChunksCount = 0;       // アップロード中のチャンク数
let uploadingMetaTx = false;        // メタトランザクションアップロード中
let uploadingDirMeta = false;       // ディレクトリメタアップロード中
let isUploadingFile = false;        // ファイルアップロード中
let uploadSessionActive = false;    // アップロードセッション状態
let monitoredTransactions = new Map(); // 監視中のトランザクション
```

### 4. ワークスペース関連（3個）
```javascript
let workspaceHandle = null;         // File System Access APIハンドル
let progressFileMap = new Map();    // 進捗ファイルマップ
let historyManager = null;          // 履歴管理マネージャー
```

### 5. ユーザー情報（2個）
```javascript
let privateKey = null;              // 秘密鍵
let address = null;                 // ウォレットアドレス
```

### 6. その他（4個）
```javascript
let uploadHistory = [];             // アップロード履歴
let systemLogs = [];               // システムログ
let wsMonitorTimeout = null;       // WebSocket監視タイムアウト
let parallelDownloadEnabled = false; // 並列ダウンロード設定
```

## 🎯 リファクタリング戦略

### Phase 1: 最小リスクグループ（その他）
低リスクで独立性の高い変数から開始：
```javascript
const AppState = {
    settings: {
        parallelDownloadEnabled: false
    },
    monitoring: {
        wsMonitorTimeout: null
    },
    history: {
        uploadHistory: [],
        systemLogs: []
    }
};
```

### Phase 2: ユーザー情報
```javascript
const UserState = {
    privateKey: null,
    address: null
};
```

### Phase 3: ワークスペース管理
```javascript
const WorkspaceState = {
    handle: null,
    progressFileMap: new Map(),
    historyManager: null
};
```

### Phase 4: アップロード状態（高リスク）
```javascript
const UploadState = {
    sessionActive: false,
    uploadingFile: false,
    chunkCount: 0,
    metaTx: false,
    dirMeta: false,
    monitoredTransactions: new Map()
};
```

### Phase 5: ファイル操作（高リスク）
```javascript
const FileState = {
    currentFile: null,
    currentPassword: null,
    processedChunks: [],
    kaspaMetadata: null,
    directoryMetadata: null,
    progressManager: null
};
```

### Phase 6: ネットワーク（最高リスク）
```javascript
const NetworkState = {
    kaspa: null,
    rpcClient: null,
    ws: {
        connection: null,
        connected: false,
        reconnectInterval: null,
        monitorActive: false
    }
};
```

## 🔧 実装方法

### 1. 後方互換性の維持
```javascript
// 新しい構造
const AppState = {
    settings: {
        parallelDownloadEnabled: false
    }
};

// 後方互換性のためのプロキシ
Object.defineProperty(window, 'parallelDownloadEnabled', {
    get() { return AppState.settings.parallelDownloadEnabled; },
    set(value) { AppState.settings.parallelDownloadEnabled = value; }
});
```

### 2. 段階的移行
1. 新しい構造を作成
2. プロキシで既存のアクセスを維持
3. 徐々に直接アクセスを新しい構造に変更
4. すべての変更が完了したらプロキシを削除

## ⚠️ リスクと対策

### リスク1: 初期化順序の問題
**対策**: 初期化関数を作成し、依存関係を明確にする

### リスク2: 非同期アクセスの競合
**対策**: getterとsetterで制御

### リスク3: HTMLからの直接アクセス
**対策**: window.オブジェクトとして公開

## 📅 実施計画

1. **準備** (v5.4.19)
   - このドキュメントの作成
   - 全変数の使用箇所調査

2. **Phase 1** (v5.4.19) ✅ 完了
   - 最小リスクグループの実装
   - parallelDownloadEnabled → AppState.settings.parallelDownloadEnabled
   - wsMonitorTimeout → AppState.monitoring.wsMonitorTimeout
   - uploadHistory → AppState.history.uploadHistory
   - systemLogs → AppState.history.systemLogs
   - 後方互換性プロキシ実装済み
   - テスト

3. **Phase 2-3** (v5.4.21)
   - ユーザー情報とワークスペースの実装
   - テスト

4. **Phase 4-6** (v5.4.22+)
   - 高リスクグループの慎重な実装
   - 各ステップでの徹底的なテスト

## ✅ チェックリスト

各変数の移行時：
- [ ] 使用箇所をすべて特定
- [ ] 新しい構造を作成
- [ ] 後方互換性プロキシを実装
- [ ] 一部のコードで新構造をテスト
- [ ] 徐々に移行
- [ ] 完全移行後にプロキシを削除

## 📝 実施記録

### v5.4.19 - Phase 1 実施内容

**移行した変数：**
1. `parallelDownloadEnabled` (14箇所)
   - localStorage の読み書き
   - UI トグルの更新
   - ダウンロード処理での参照

2. `wsMonitorTimeout` (10箇所)
   - WebSocket監視のタイムアウト管理
   - clearTimeoutとsetTimeoutの呼び出し

3. `uploadHistory` (4箇所)
   - アップロード完了時の記録
   - UI表示での参照

4. `systemLogs` (5箇所)
   - ログエントリの追加
   - エクスポート機能
   - クリア処理

**実装の特徴：**
- AppStateオブジェクトによるグループ化
- 後方互換性のためのgetter/setter実装
- 既存コードへの影響を最小化

### v5.4.20-22 - 緊急修正

**発見された問題：**
1. UI CONTROLセクション内の関数からグローバル変数へのアクセス問題
2. `handleFileSelect` で設定した `currentFile` が `processAndUpload` で参照できない
3. ヘルパー関数（checkFileSizeWarning等）がグローバルスコープで利用できない

**実施した修正：**
- v5.4.20: `log` 関数を `window.log` として公開
- v5.4.21: ヘルパー関数を window オブジェクトに公開
- v5.4.22: グローバル変数への明示的な window 経由アクセス
  - `currentFile` → `window.currentFile`
  - `progressManager` → `window.progressManager`

**教訓：**
UI CONTROLセクション（DOMContentLoaded内）で定義された関数は、グローバル変数や関数にアクセスする際、明示的に`window`経由でアクセスする必要がある。