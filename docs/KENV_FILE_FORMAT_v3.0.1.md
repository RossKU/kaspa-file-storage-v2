# KENV File Format Specification v3.0.1

## 概要
KENVファイルシステムは、Kaspa P2P File Storageの作業環境を管理するハイブリッドストレージシステムです。データの特性に応じて最適な保存形式（JSON/CSV/個別ファイル）を使い分けることで、大容量データでも高速な動作を実現します。

## フォーマットバージョン
- **現行バージョン**: 3.0.1
- **前バージョン**: 2.0（アップロード履歴のみ）
- **基準実装**: v5.12.0（予定）

## ファイル構成

### 1. .kenv（メイン設定ファイル - JSON形式）

#### 構造
```json
{
  "version": "3.0.1",
  "schemaVersion": 3,
  "createdAt": "2025-01-28T10:00:00Z",
  "updatedAt": "2025-01-28T15:30:00Z",
  "wallet": "kaspa:qpxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "encryption": {
    "enabled": true,
    "algorithm": "AES-256-GCM",
    "iterations": 100000
  },
  "settings": {
    "network": {
      "parallelDownloadEnabled": false,
      "devWalletEnabled": true,
      "customRpcEndpoint": "",
      "archiveNodeThreshold": 50
    },
    "ui": {
      "theme": "dark",
      "accentColor": "#2A6F65",
      "language": "ja"
    },
    "storage": {
      "autoSaveInterval": 300,
      "csvEncryption": false,
      "kaspaFileThreshold": 100
    }
  },
  "workspace": {
    "folderName": "kaspa-workspace",
    "totalFiles": 0,
    "totalUploads": 0,
    "totalSize": 0,
    "lastActivity": "2025-01-28T15:30:00Z"
  },
  "references": {
    "filesCSV": ".kenv-files.csv",
    "uploadsCSV": ".kenv-uploads.csv",
    "kaspaDir": ".kaspa/"
  }
}
```

#### フィールド定義
- **version**: ファイルフォーマットバージョン
- **schemaVersion**: スキーマバージョン（整数）
- **wallet**: 使用中のウォレットアドレス
- **encryption**: 暗号化設定
- **settings**: アプリケーション設定
- **workspace**: ワークスペース統計情報
- **references**: 関連ファイルへの参照

### 2. .kenv-files.csv（ファイル管理リスト - CSV形式）

#### 構造
```csv
id,fileName,metaTxId,metaBlockId,fileSize,uploadDate,status,tags,notes,hasPassword,kaspaRef
file_001,document.pdf,abc123xxx,def456yyy,1048576,2025-01-28T10:00:00Z,completed,"work,important",重要書類,true,file_001_abc123.kaspa
file_002,image.jpg,ghi789xxx,jkl012yyy,2097152,2025-01-28T11:00:00Z,completed,personal,,false,
file_003,bigdata.zip,mno345xxx,pqr678yyy,234567890,2025-01-28T12:00:00Z,completed,archive,1万チャンク,true,file_003_mno345.kaspa
```

#### カラム定義
| カラム名 | 型 | 必須 | 説明 |
|---------|-----|------|------|
| id | string | ✓ | 一意識別子 |
| fileName | string | ✓ | ファイル名 |
| metaTxId | string | ✓ | メタトランザクションID |
| metaBlockId | string | ✓ | ブロックID |
| fileSize | number | ✓ | ファイルサイズ（バイト） |
| uploadDate | string | ✓ | アップロード日時（ISO 8601） |
| status | string | ✓ | 状態（completed/pending/failed） |
| tags | string | | カンマ区切りタグ |
| notes | string | | メモ |
| hasPassword | boolean | ✓ | パスワード有無 |
| kaspaRef | string | | 大容量メタデータ参照 |

### 3. .kenv-uploads.csv（アップロード履歴 - CSV形式）

#### 構造
```csv
id,fileName,fileSize,metaTxId,metaBlockId,uploadDate,totalCost,chunkCount,duration,network,kaspaRef
upload_001,large-file.zip,234567890,mno345xxx,pqr678yyy,2025-01-28T12:00:00Z,0.5,10234,300000,mainnet,upload_001_mno345.kaspa
upload_002,small.txt,1024,stu901xxx,vwx234yyy,2025-01-28T13:00:00Z,0.001,1,1000,mainnet,
```

#### カラム定義
| カラム名 | 型 | 必須 | 説明 |
|---------|-----|------|------|
| id | string | ✓ | 一意識別子 |
| fileName | string | ✓ | ファイル名 |
| fileSize | number | ✓ | ファイルサイズ（バイト） |
| metaTxId | string | ✓ | メタトランザクションID |
| metaBlockId | string | ✓ | ブロックID |
| uploadDate | string | ✓ | アップロード日時（ISO 8601） |
| totalCost | number | ✓ | 総コスト（KAS） |
| chunkCount | number | ✓ | チャンク数 |
| duration | number | ✓ | 処理時間（ミリ秒） |
| network | string | ✓ | ネットワーク（mainnet/testnet） |
| kaspaRef | string | | 大容量メタデータ参照 |

### 4. .kaspa/（個別メタデータディレクトリ）

#### 用途
- チャンク数が閾値（デフォルト100）を超えるファイルのメタデータ
- 完全な.kaspaファイル形式で保存
- 必要時のみ読み込み

#### ファイル命名規則
```
.kaspa/
├── file_[id]_[metaTxId先頭8文字].kaspa
├── upload_[id]_[metaTxId先頭8文字].kaspa
└── directory_[id]_[metaTxId先頭8文字].kaspa
```

## 動作モード

### 1. 作業フォルダ未設定時（LocalStorageモード）
```javascript
// 設定のみLocalStorageに保存
localStorage.setItem('kaspa-settings', JSON.stringify(settings));

// 最近のファイル（最大50件）をキャッシュ
localStorage.setItem('kaspa-recent-files', JSON.stringify(recentFiles));

// アップロード履歴（最大100件）をキャッシュ
localStorage.setItem('kaspa-recent-uploads', JSON.stringify(recentUploads));
```

### 2. 作業フォルダ設定時（フルモード）
```javascript
// 全機能が利用可能
workspace/
├── .kenv                    # 設定（暗号化）
├── .kenv-files.csv         # ファイルリスト
├── .kenv-uploads.csv       # アップロード履歴
└── .kaspa/                 # 個別メタデータ
    ├── file_001_abc123xx.kaspa
    └── upload_001_mno345x.kaspa
```

## 暗号化仕様

### .kenvファイル
- **必須**: 常に暗号化
- **アルゴリズム**: AES-256-GCM
- **鍵導出**: PBKDF2（100,000イテレーション）

### CSVファイル
- **オプション**: settings.storage.csvEncryptionで制御
- **暗号化時**: .kenv-files.csv.enc形式

### .kaspaファイル
- **個別制御**: ファイルごとにパスワード設定

## パフォーマンス最適化

### CSVの追記専用モード
```javascript
// ファイル末尾に追記（高速）
async function appendToCSV(data) {
    const line = `${data.id},${data.fileName},...\n`;
    await writeStream.write(line);
}
```

### 遅延読み込み
```javascript
// 基本情報のみ読み込み
const files = await loadFilesCSV();

// 必要時のみメタデータ読み込み
if (needsFullMetadata && file.kaspaRef) {
    const metadata = await loadKaspaFile(file.kaspaRef);
}
```

## 互換性

### v2.0からの移行
```javascript
// 自動移行
if (oldKenv.version === "2.0") {
    // uploadsをCSVに変換
    const csv = convertUploadsToCSV(oldKenv.uploads);
    await saveUploadsCSV(csv);
    
    // 大容量メタデータを分離
    await separateLargeMetadata(oldKenv.uploads);
    
    // 新形式で保存
    await saveKenvV3(settings);
}
```

## エラーハンドリング

### CSV破損時の復旧
```javascript
try {
    const files = await loadFilesCSV();
} catch (error) {
    // バックアップから復旧
    const backup = await loadFilesCSV('.kenv-files.csv.bak');
    // または部分的な読み込み
    const partial = await loadPartialCSV();
}
```

## セキュリティ考慮事項

1. **暗号化キーの管理**
   - ウォレット秘密鍵から導出
   - メモリ内のみ保持

2. **CSVインジェクション対策**
   - 特殊文字のエスケープ
   - 数式の無効化

3. **ファイルサイズ制限**
   - .kenv: 最大1MB
   - CSV: 最大100MB/ファイル
   - .kaspa: 無制限（個別管理）

## 変更履歴

### v3.0.1 (2025-01-28)
- ハイブリッドストレージ設計を採用
- JSON/CSV/個別ファイルの組み合わせ
- 作業フォルダ未設定時のLocalStorageフォールバック
- 大容量メタデータの外部参照化

### v3.0 (構想のみ)
- 初期設計案

### v2.0 (現行)
- アップロード履歴のみ管理
- 完全JSON形式