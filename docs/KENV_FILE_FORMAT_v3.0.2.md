# KENV File Format Specification v3.0.2

## 概要
KENVファイルシステムは、Kaspa P2P File Storageの作業環境を管理するハイブリッドストレージシステムです。統合されたファイルテーブルと個別メタデータファイルの組み合わせにより、大容量データでも高速な動作を実現します。

## フォーマットバージョン
- **現行バージョン**: 3.0.2
- **前バージョン**: 2.0（アップロード履歴のみ）
- **基準実装**: v5.12.0（予定）

## ファイル構成

### 1. .kenv（メイン設定ファイル - JSON形式）

#### 構造
```json
{
  "version": "3.0.2",
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
    "totalEntries": 0,
    "totalSize": 0,
    "lastActivity": "2025-01-28T15:30:00Z"
  },
  "references": {
    "entriesCSV": ".kenv-entries.csv",
    "kaspaDir": ".kaspa/"
  }
}
```

### 2. .kenv-entries.csv（統合エントリーテーブル - CSV形式）

#### 構造
```csv
id,type,name,metaTxId,metaBlockId,size,date,source,status,tags,notes,hasPassword,kaspaRef,fileCount,totalSize,cidFull,sha256,network,cost
file_001,file,document.pdf,abc123xxx,def456yyy,1048576,2025-01-28T10:00:00Z,upload,completed,"work,important",重要書類,true,file_001_abc123.kaspa,,,bafybeif8k2l9m3n7p4,sha256xxx,mainnet,0.001
file_002,file,image.jpg,ghi789xxx,jkl012yyy,2097152,2025-01-28T11:00:00Z,manual,completed,personal,,false,,,,bafybeigd1a2b3c4d5e6,sha256yyy,mainnet,0
dir_001,directory,project_folder,mno345xxx,pqr678yyy,0,2025-01-28T12:00:00Z,upload,completed,archive,開発資料,false,dir_001_mno345.kaspa,25,5432100,bafybeihe7f8g9h0i1j2,sha256zzz,mainnet,0.05
file_003,file,bigdata.zip,stu901xxx,vwx234yyy,234567890,2025-01-28T13:00:00Z,upload,completed,backup,1万チャンク,true,file_003_stu901.kaspa,,,bafybeijk3l4m5n6o7p8,sha256aaa,mainnet,0.5
```

#### カラム定義

| カラム名 | 型 | 必須 | 説明 |
|---------|-----|------|------|
| id | string | ✓ | 一意識別子（形式: {type}_{timestamp}_{random}） |
| type | string | ✓ | エントリータイプ（file/directory） |
| name | string | ✓ | ファイル/ディレクトリ名 |
| metaTxId | string | ✓ | メタトランザクションID |
| metaBlockId | string | ✓ | ブロックID |
| size | number | ✓ | ファイルサイズ（バイト、ディレクトリは0） |
| date | string | ✓ | 作成/アップロード日時（ISO 8601） |
| source | string | ✓ | 追加元（upload/manual/download） |
| status | string | ✓ | 状態（completed/pending/failed） |
| tags | string | | カンマ区切りタグ |
| notes | string | | メモ |
| hasPassword | boolean | ✓ | パスワード有無 |
| kaspaRef | string | | 大容量メタデータ参照（閾値超えの場合） |
| fileCount | number | | ディレクトリ内のファイル数 |
| totalSize | number | | ディレクトリの合計サイズ（バイト） |
| cidFull | string | | 完全なCID（IPFS互換） |
| sha256 | string | | ファイルのSHA256ハッシュ |
| network | string | ✓ | ネットワーク（mainnet/testnet） |
| cost | number | ✓ | アップロードコスト（KAS、手動追加は0） |

### 3. .kaspa/（個別メタデータディレクトリ）

#### 用途
- チャンク数が閾値（デフォルト100）を超えるエントリーの完全なメタデータ
- .kaspaファイル形式（v3.4.2準拠）で保存
- 必要時のみ読み込み

#### ファイル命名規則
```
.kaspa/
├── file_{id}_{metaTxId先頭8文字}.kaspa
├── dir_{id}_{metaTxId先頭8文字}.kaspa
└── progress_{id}_{timestamp}.kaspa.progress
```

#### 保存基準
```javascript
// チャンク数による自動判定
if (chunkCount > settings.storage.kaspaFileThreshold) {
    // 外部ファイルに保存
    entry.kaspaRef = `${type}_${id}_${metaTxId.substring(0, 8)}.kaspa`;
    // CSVには基本情報のみ
} else {
    // CSVに完全な情報を保存（小さいファイル）
    entry.kaspaRef = null;
}
```

## データ構造の互換性

### .kaspaファイルとの関係
統合エントリーテーブルは.kaspaファイル（v3.4.2）の基本構造から以下を除いたもの：
- `chunks[]` - チャンクTxIDの配列
- `chunkBlockIds[]` - チャンクブロックIDの配列
- `chunkStructure` - チャンク構造情報
- `encryption` - 暗号化詳細情報（.kenvで管理）
- `metadata.segmentBoundaries[]` - セグメント境界情報

### エントリー種別の統一
```javascript
// ファイルエントリー（アップロード）
{
    type: 'file',
    source: 'upload',
    // 全フィールドが埋まる
}

// ファイルエントリー（手動追加）
{
    type: 'file', 
    source: 'manual',
    cost: 0,  // 手動追加はコスト0
    // metaTxId/metaBlockIdは既知の値
}

// ディレクトリエントリー
{
    type: 'directory',
    size: 0,  // ディレクトリ自体のサイズは0
    fileCount: 25,  // 含まれるファイル数
    totalSize: 5432100  // 合計サイズ
}
```

## 動作モード

### 1. 作業フォルダ未設定時（LocalStorageモード）
```javascript
// 設定のみLocalStorageに保存
localStorage.setItem('kaspa-settings', JSON.stringify(settings));

// 最近のエントリー（最大100件）をキャッシュ
localStorage.setItem('kaspa-recent-entries', JSON.stringify(recentEntries));
```

### 2. 作業フォルダ設定時（フルモード）
```javascript
workspace/
├── .kenv                    # 設定（暗号化）
├── .kenv-entries.csv       # 統合エントリーテーブル
└── .kaspa/                 # 個別メタデータ
    ├── file_001_abc123xx.kaspa
    ├── dir_001_mno345xx.kaspa
    └── file_003_stu901xx.kaspa
```

## パフォーマンス最適化

### CSVの追記専用モード
```javascript
// ファイル末尾に追記（高速）
async function appendEntry(entry) {
    const line = Object.values(entry).map(v => 
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    ).join(',') + '\n';
    await writeStream.write(line);
}
```

### 遅延読み込み
```javascript
// 基本情報のみ読み込み（高速）
const entries = await loadEntriesCSV();

// 大容量メタデータは必要時のみ
if (entry.kaspaRef && needsFullMetadata) {
    const metadata = await loadKaspaFile(entry.kaspaRef);
}
```

### メモリ効率
```javascript
// ストリーミング読み込み（大量エントリー対応）
async function* streamEntries() {
    const stream = await file.stream();
    const reader = stream.getReader();
    let buffer = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 未完成の行を保持
        
        for (const line of lines) {
            yield parseCSVLine(line);
        }
    }
}
```

## 互換性

### v2.0からの移行
```javascript
// 自動移行スクリプト
async function migrateFromV2(oldKenv) {
    const entries = [];
    
    // アップロード履歴を統合エントリーに変換
    for (const upload of oldKenv.uploads) {
        entries.push({
            id: upload.id,
            type: upload.type || 'file',
            name: upload.fileName,
            source: 'upload',
            // ... その他のフィールドマッピング
        });
        
        // 大容量メタデータを分離
        if (upload.metadata?.chunks?.length > 100) {
            await saveKaspaFile(upload.id, upload.metadata);
        }
    }
    
    // 新形式で保存
    await saveEntriesCSV(entries);
    await saveKenvV3(settings);
}
```

## セキュリティ考慮事項

### 暗号化
- **.kenv**: 常に暗号化（AES-256-GCM）
- **CSV**: オプション（settings.storage.csvEncryption）
- **.kaspa**: 個別パスワード対応

### CSVインジェクション対策
```javascript
function escapeCSV(value) {
    if (typeof value !== 'string') return value;
    
    // 危険な文字をエスケープ
    if (value.match(/[,"\n\r=+@-]/)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
```

## エラーハンドリング

### CSV破損時の復旧
```javascript
// 行単位での部分読み込み
async function recoverCorruptedCSV() {
    const entries = [];
    const lines = await readLines('.kenv-entries.csv');
    
    for (const [index, line] of lines.entries()) {
        try {
            entries.push(parseCSVLine(line));
        } catch (error) {
            console.error(`Line ${index} corrupted: ${error.message}`);
            // 破損行をスキップして継続
        }
    }
    
    // 復旧したデータで再構築
    await saveEntriesCSV(entries);
}
```

## 変更履歴

### v3.0.2 (2025-01-28)
- アップロード/ファイル/ディレクトリを統合エントリーテーブルに一元化
- sourceフラグによる追加元の区別
- .kaspaファイルフォーマットとの互換性確保
- CSVストリーミング対応

### v3.0.1 (2025-01-28)  
- 初期ハイブリッドストレージ設計（別テーブル案）

### v3.0 (構想のみ)
- 初期設計案

### v2.0 (現行)
- アップロード履歴のみ管理