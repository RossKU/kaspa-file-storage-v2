# KENV File Format Specification v3.0

## 概要

KENVファイルは、Kaspa P2P File Storageシステムの作業環境と履歴を管理する暗号化ファイルフォーマットです。アップロード履歴、ファイル管理リスト、アプリケーション設定を一元管理し、作業環境の完全なスナップショットを提供します。

## フォーマットバージョン

- **現行バージョン**: 3.0
- **基準実装**: v5.11.15（予定）
- **作成日**: 2025-01-28
- **後方互換性**: v1.0, v2.0

## 用語定義

### ワークスペース (Workspace)
- File System Access APIで選択された作業フォルダ
- .kenvファイルの保存場所
- 進捗ファイル（.kprogress）の管理場所

### エントリー (Entry)
- アップロード履歴の個別項目
- ファイルまたはディレクトリの情報を含む

### ファイルリスト (File List)
- Fileタブで管理されるファイル/ディレクトリの一覧
- アップロード/ダウンロードとは独立して管理可能

## ファイル構造

### ルート構造

```javascript
{
    // === メタ情報 ===
    version: "3.0",                    // [必須] フォーマットバージョン
    schemaVersion: 3,                  // [必須] スキーマバージョン（整数）
    encrypted: true,                   // [必須] 暗号化フラグ
    
    // === 暗号化されたペイロード ===
    data: "base64-encrypted-data"      // [必須] 暗号化されたJSON文字列
}
```

### 復号化後のデータ構造

```javascript
{
    // === バージョン情報 ===
    version: "3.0",                    // [必須] データバージョン
    schemaVersion: 3,                  // [必須] スキーマバージョン
    
    // === ウォレット情報 ===
    wallet: {                          // [必須] ウォレット情報
        address: "kaspatest:qqk8...", // [必須] Kaspaアドレス
        network: "testnet-10"          // [必須] ネットワーク識別子
    },
    
    // === タイムスタンプ ===
    created: "2025-01-28T12:34:56Z",   // [必須] 作成日時（ISO-8601）
    lastModified: "2025-01-28T15:30:00Z", // [必須] 最終更新日時
    
    // === アップロード履歴 ===
    uploads: [                         // [必須] アップロード履歴配列
        {
            // 基本情報
            id: "upload_1737000000000_abc123", // [必須] 一意識別子
            type: "file",              // [必須] タイプ（file/directory）
            uploadDate: "2025-01-28T12:00:00Z", // [必須] アップロード日時
            
            // ファイル情報（type="file"の場合）
            fileName: "document.pdf",   // [条件付き必須] ファイル名
            fileSize: 12345678,        // [条件付き必須] ファイルサイズ（バイト）
            mimeType: "application/pdf", // [オプション] MIMEタイプ
            
            // ディレクトリ情報（type="directory"の場合）
            name: "my_folder",         // [条件付き必須] ディレクトリ名
            fileCount: 10,             // [条件付き必須] ファイル数
            totalSize: 123456789,      // [条件付き必須] 合計サイズ
            
            // ブロックチェーン情報
            metaTxId: "d3b8e5c4...",   // [必須] メタトランザクションID
            metaTxBlockId: "a1b2c3...", // [オプション] ブロックID
            metaTxType: "standard",     // [オプション] メタタイプ（standard/super）
            firstChunkTxId: "f1e2d3...", // [オプション] 最初のチャンクTxID
            
            // 識別子とコスト
            cid: "Qf3nR8m2L1p4K9j7...", // [オプション] 完全なCID（43文字）
            cidFull: "Qf3nR8m2L1p4K9j7...", // [オプション] cidと同じ（後方互換）
            totalCost: 0.12345,         // [必須] アップロードコスト（KAS）
            
            // セキュリティ
            password: "encrypted_pass",  // [オプション] ファイルパスワード
            
            // メタデータ
            metadata: {                 // [オプション] 完全な.kaspaメタデータ
                type: "kaspa-file",
                version: "3.4",
                // ... 完全な.kaspaフォーマット
            },
            
            // その他
            network: "testnet-10",      // [必須] ネットワーク識別子
            blockTime: "2025-01-28T12:01:00Z", // [オプション] ブロック確定時刻
            uploaderId: "user123"       // [オプション] アップローダー識別子
        }
        // ... 他のアップロード履歴
    ],
    
    // === ファイルリスト（v3.0新機能） ===
    fileList: [                        // [オプション] 管理ファイルリスト
        {
            id: "file_1737000000000_xyz789", // [必須] 一意識別子
            type: "file",              // [必須] タイプ（file/directory）
            name: "important.doc",      // [必須] ファイル/ディレクトリ名
            
            // ブロックチェーン参照
            metaTxId: "abc123...",     // [オプション] メタTxID
            blockId: "def456...",      // [オプション] ブロックID
            password: "file_pass",     // [オプション] パスワード
            
            // メタ情報
            size: 5432100,             // [オプション] サイズ（バイト）
            cid: "Xy9k3L2m...",        // [オプション] CID
            addedDate: "2025-01-28T14:00:00Z", // [必須] 追加日時
            
            // ダウンロード情報
            downloadable: true,        // [オプション] ダウンロード可能フラグ
            downloaded: false,         // [オプション] ダウンロード済みフラグ
            lastDownload: null,        // [オプション] 最終ダウンロード日時
            
            // カスタム属性
            tags: ["重要", "2025年"],   // [オプション] タグ
            notes: "プロジェクト関連",   // [オプション] メモ
            
            // ディレクトリ固有（type="directory"）
            fileCount: 5,              // [条件付き] ファイル数
            totalSize: 10864200        // [条件付き] 合計サイズ
        }
        // ... 他の管理ファイル
    ],
    
    // === アプリケーション設定（v3.0新機能） ===
    settings: {                        // [オプション] アプリケーション設定
        // 基本設定
        parallelDownloadEnabled: false, // [オプション] 並列ダウンロード
        devWalletEnabled: true,        // [オプション] 開発ウォレット
        
        // ネットワーク設定
        network: "testnet-10",         // [オプション] デフォルトネットワーク
        customRpcEndpoint: "",         // [オプション] カスタムRPCエンドポイント
        nodeType: "auto",              // [オプション] ノードタイプ（auto/archive/custom）
        
        // アーカイブノード設定
        archiveThreshold: 50,          // [オプション] アーカイブ閾値（M blocks）
        archiveAutoExplore: false,     // [オプション] 自動探査
        
        // UI/UX設定
        theme: "dark",                 // [オプション] テーマ（dark/light）
        language: "ja",                // [オプション] 言語
        showAdvancedOptions: false,    // [オプション] 高度なオプション表示
        
        // セキュリティ設定
        autoLockTimeout: 30,           // [オプション] 自動ロックタイムアウト（分）
        rememberPassword: false        // [オプション] パスワード記憶
    },
    
    // === ワークスペース情報（v3.0新機能） ===
    workspace: {                       // [オプション] ワークスペース情報
        lastOpened: "2025-01-28T15:00:00Z", // [オプション] 最終オープン日時
        folderName: "kaspa-files",     // [オプション] フォルダ名
        totalFiles: 45,                // [オプション] 総ファイル数
        totalSize: 567890123,          // [オプション] 総サイズ（バイト）
        
        // 統計情報
        statistics: {                  // [オプション] 統計情報
            totalUploads: 123,         // [オプション] 総アップロード数
            totalDownloads: 456,       // [オプション] 総ダウンロード数
            totalCost: 12.345,         // [オプション] 総コスト（KAS）
            lastActivity: "2025-01-28T15:20:00Z" // [オプション] 最終活動
        }
    },
    
    // === 拡張フィールド ===
    extensions: {                      // [オプション] 将来の拡張用
        customFields: {},              // カスタムフィールド
        plugins: []                    // プラグイン設定
    }
}
```

## フィールド定義詳細

### 必須フィールド

1. **version**: フォーマットバージョン（現在: "3.0"）
2. **schemaVersion**: スキーマバージョン（整数: 3）
3. **encrypted**: 暗号化フラグ（常にtrue）
4. **wallet**: ウォレット情報（address, network）
5. **created**: 作成日時（ISO-8601形式）
6. **lastModified**: 最終更新日時
7. **uploads**: アップロード履歴配列（空配列可）

### 暗号化仕様

- **アルゴリズム**: AES-256-GCM
- **鍵導出**: PBKDF2（100,000回反復）
- **暗号化対象**: データ構造全体をJSON文字列化してから暗号化
- **エンコーディング**: Base64

### ID生成規則

```javascript
// アップロード履歴ID
`upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// ファイルリストID
`file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

### ファイルサイズ制限

- **最大サイズ**: 100MB
- **アーカイブ作成**: 100件を超えたら古い履歴をアーカイブ
- **アーカイブ名**: `kaspa-uploads-archive-${timestamp}.kenv`

## 互換性

### 後方互換性

#### v1.0からの移行
```javascript
// v1.0構造
{
    wallet: { address, publicKey },
    uploads: [{ /* v1.0形式 */ }]
}

// v3.0への自動変換
- publicKeyフィールドを削除
- networkフィールドを推測（アドレスプレフィックスから）
- schemaVersionを追加
```

#### v2.0からの移行
```javascript
// v2.0構造（v3.0とほぼ同じ、fileListとsettingsがない）
// 自動的にv3.0として読み込み可能
```

### 前方互換性

- 不明なフィールドは保持（削除しない）
- extensionsフィールドで将来の拡張に対応

## セキュリティ考慮事項

1. **暗号化の必須化**
   - 平文での保存は許可しない
   - ウォレットの秘密鍵から暗号化キーを導出

2. **パスワード管理**
   - 個別ファイルパスワードは暗号化して保存
   - マスターパスワードによる二重保護

3. **データ整合性**
   - 暗号化前にデータ検証
   - 不正なデータ構造の拒否

4. **アクセス制御**
   - File System Access APIによるフォルダ権限
   - ブラウザのセキュリティサンドボックス内で動作

## 実装ガイドライン

### 1. 読み込み処理
```javascript
// 1. ファイルを読み込み
const file = await fileHandle.getFile();
const content = await file.text();
const data = JSON.parse(content);

// 2. バージョン確認
if (!data.version || !data.encrypted) {
    throw new Error('Invalid KENV file');
}

// 3. 復号化
const decrypted = await decrypt(data.data);
const kenv = JSON.parse(decrypted);

// 4. スキーマ移行（必要に応じて）
if (kenv.schemaVersion < 3) {
    kenv = migrateToV3(kenv);
}
```

### 2. 保存処理
```javascript
// 1. データ準備
const kenv = {
    version: "3.0",
    schemaVersion: 3,
    wallet: { /* ... */ },
    // ... 他のフィールド
    lastModified: new Date().toISOString()
};

// 2. 暗号化
const encrypted = await encrypt(JSON.stringify(kenv));

// 3. ファイル保存
const data = {
    version: "3.0",
    encrypted: true,
    data: encrypted
};

await writable.write(JSON.stringify(data, null, 2));
```

### 3. 設定の同期
```javascript
// LocalStorageからの移行
if (!kenv.settings) {
    kenv.settings = {
        parallelDownloadEnabled: localStorage.getItem('kaspaParallelDownload') === 'true',
        devWalletEnabled: localStorage.getItem('kaspaDevWalletEnabled') === 'true',
        // ... 他の設定
    };
}

// 設定変更時の処理
function updateSetting(key, value) {
    // 1. メモリ更新
    AppState.settings[key] = value;
    
    // 2. localStorage更新（後方互換）
    localStorage.setItem(`kaspa${key}`, value.toString());
    
    // 3. .kenv保存（遅延実行）
    scheduleSaveKenv();
}
```

### 4. ファイルリスト管理
```javascript
// ファイル追加
function addToFileList(fileInfo) {
    // 重複チェック
    const exists = kenv.fileList.find(f => 
        f.metaTxId === fileInfo.metaTxId
    );
    
    if (!exists) {
        kenv.fileList.push({
            id: generateFileId(),
            addedDate: new Date().toISOString(),
            ...fileInfo
        });
    }
}
```

### 5. アーカイブ処理
```javascript
// 100件を超えたらアーカイブ
if (kenv.uploads.length > 100) {
    const archive = kenv.uploads.slice(0, -100);
    const retained = kenv.uploads.slice(-100);
    
    // アーカイブファイル作成
    await createArchive(archive);
    
    // 現在のファイルを更新
    kenv.uploads = retained;
}
```

## パフォーマンス最適化

1. **遅延保存**
   - 変更を即座にメモリに反映
   - 実際のファイル保存は500ms遅延
   - 連続変更をバッチ処理

2. **部分更新**
   - 巨大な履歴の場合、差分のみ保存
   - インクリメンタルバックアップ

3. **圧縮**
   - 100MB制限内で最大限のデータ保存
   - 必要に応じてgzip圧縮を検討

## エラーハンドリング

1. **ファイル破損**
   - 自動バックアップから復元
   - 部分的な復元をサポート

2. **バージョン不一致**
   - 可能な限り自動移行
   - 移行不可の場合は明確なエラーメッセージ

3. **暗号化エラー**
   - 再試行メカニズム
   - エラーログの記録

## 拡張仕様

### プラグインサポート（将来）
```javascript
extensions: {
    plugins: [
        {
            id: "backup-plugin",
            version: "1.0",
            settings: { /* プラグイン固有設定 */ }
        }
    ]
}
```

### カスタムフィールド
```javascript
extensions: {
    customFields: {
        "projectId": "proj_123",
        "teamName": "開発チーム"
    }
}
```

## 変更履歴

### v3.0 (2025-01-28)
- **初期リリース**
  - fileListフィールドの追加（Fileタブ連携）
  - settingsフィールドの追加（設定の永続化）
  - workspaceフィールドの追加（作業環境情報）
  - v1.0/v2.0からの自動移行サポート

### v2.0 (2025-07-21)
- schemaVersionフィールドの追加
- ディレクトリサポート
- メタデータ構造の拡張

### v1.0 (2025-01-01)
- 初期実装
- 基本的なアップロード履歴管理

---

本仕様書は、Kaspa File Storageプロジェクトの作業環境管理フォーマットとして策定されました。