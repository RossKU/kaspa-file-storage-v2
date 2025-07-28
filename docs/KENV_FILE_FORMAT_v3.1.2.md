# KENV File Format Specification v3.1.2 - 最適化CSVストリーミング設計

## 概要
KENVファイルシステムは、Kaspa P2P File Storageの作業環境を管理する軽量ストレージシステムです。v3.1.2では不要なカラムを削除し、より効率的な設計に最適化しました。

## フォーマットバージョン
- **現行バージョン**: 3.1.2
- **前バージョン**: 3.1.1
- **基準実装**: v5.12.0（予定）
- **.kaspa互換**: v3.4.2準拠

## 主要な変更点（v3.1.1→v3.1.2）
1. **重複・不要カラムの削除**（49→45カラム）
   - hasPassword削除（passwordIncludedと重複）
   - downloadable削除（statusから判断可能）
   - isTemporary削除（使用場面なし）
   - addedDate削除（uploadDateで十分）
2. **必須項目の最小化**
3. **パスワード保管の推奨**

## ファイル構成

```
workspace/
├── .kenv               # 設定ファイル（JSON、1-10KB）
├── .kenv-index        # 高速検索用インデックス（JSON、10-100KB）
├── .kenv-entries.csv  # 統合エントリーテーブル（CSVストリーミング）
└── *.kaspa            # 超大容量ファイルのみ（10000チャンク以上）
```

## 1. .kenv（設定ファイル）

### 構造
```json
{
  "version": "3.1.2",
  "schemaVersion": 3,
  "kaspaCompatVersion": "3.4.2",
  "createdAt": "2025-01-28T10:00:00Z",
  "updatedAt": "2025-01-28T15:30:00Z",
  "wallet": "kaspa:qpxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "encryption": {
    "enabled": true,
    "algorithm": "AES-256-GCM",
    "iterations": 100000,
    "passwordStorage": "encrypted"  // パスワード保管方式
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
      "streamingChunkSize": 65536,
      "externalFileThreshold": 10000,
      "minimalMode": true  // 最小必須項目モード
    }
  },
  "workspace": {
    "folderName": "kaspa-workspace",
    "totalEntries": 0,
    "totalSize": 0,
    "lastActivity": "2025-01-28T15:30:00Z"
  }
}
```

## 2. .kenv-index（検索インデックス）

### 構造（変更なし）
```json
{
  "version": "1.0",
  "updated": "2025-01-28T10:00:00Z",
  "entries": {
    "file_001": { "line": 1, "offset": 0, "length": 2048 },
    "file_002": { "line": 2, "offset": 2049, "length": 4096 },
    "dir_001": { "line": 3, "offset": 6146, "length": 1024 }
  },
  "metaTxIdIndex": {
    "abc123xxx...": "file_001",
    "def456yyy...": "file_002"
  },
  "firstChunkIndex": {
    "chunk1aaa...": "file_001"
  },
  "stats": {
    "totalEntries": 10000,
    "totalSize": 104857600,
    "verifiedCount": 8500,
    "pendingCount": 1500
  }
}
```

## 3. .kenv-entries.csv（統合エントリーテーブル）

### CSVヘッダー（固定カラム）

```csv
id,type,version,created,network,name,path,metaTxId,metaTxBlockId,firstChunkTxId,uploadDate,blockTime,uploadedBy,source,status,fileSize,originalSize,compressedSize,mimeType,sha256,encrypted,compressionAlgorithm,compressionEnabled,variableChunk,payloadSplit,cid,totalChunks,chunkCount,chunkSize,segmentCount,totalFiles,fileCount,directoryCount,entryCount,checksum,uploadCost,uploadDuration,chunkStructureType,chunkLevel,totalGroups,passwordIncluded,password,externalRef,tags,notes,authWarning
```

### カラム定義詳細（.kaspaフォーマット準拠）

#### 基本情報（0-4）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 0 | id | string | ✓ | - （KENV独自） | ローカル一意ID |
| 1 | type | string | ✓ | type | kaspa-file/kaspa-directory |
| 2 | version | string | | version | デフォルト: 3.4.2 |
| 3 | created | string | | created | ISO8601形式 |
| 4 | network | string | | network | mainnet/testnet-10等 |

#### ファイル/ディレクトリ情報（5-8）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 5 | name | string | ✓ | file.name / directory.name | 表示名 |
| 6 | path | string | | entries[].path | ディレクトリ内パス |
| 7 | metaTxId | string | ✓ | metadata.metaTxId | メタデータTxID |
| 8 | metaTxBlockId | string | ✓ | metadata.metaTxBlockId | メタデータBlockID |

#### トランザクション情報（9-12）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 9 | firstChunkTxId | string | | chunks[0] | 最初のチャンクTxID |
| 10 | uploadDate | string | | metadata.uploadDate | アップロード日時 |
| 11 | blockTime | string | | metadata.blockTime | ブロック確定時刻 |
| 12 | uploadedBy | string | | metadata.uploader | アップロード者 |

#### ステータス情報（13-14）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 13 | source | string | ✓ | - （KENV独自） | upload/manual/download |
| 14 | status | string | ✓ | - （KENV独自） | pending/verifying/verified/failed |

#### ファイルサイズ情報（15-17）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 15 | fileSize | number | | file.size | ファイルサイズ（バイト） |
| 16 | originalSize | number | | file.compression.originalSize | 圧縮前サイズ |
| 17 | compressedSize | number | | file.compression.compressedSize | 圧縮後サイズ |

#### ファイル属性（18-20）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 18 | mimeType | string | | file.mimeType | MIMEタイプ |
| 19 | sha256 | string | | file.sha256 | ファイルハッシュ |
| 20 | encrypted | boolean | | file.encrypted | 暗号化フラグ |

#### 圧縮情報（21-24）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 21 | compressionAlgorithm | string | | file.compression.algorithm | 圧縮アルゴリズム |
| 22 | compressionEnabled | boolean | | file.compression.enabled | 圧縮有効フラグ |
| 23 | variableChunk | boolean | | file.compression.variableChunk | 可変チャンクフラグ |
| 24 | payloadSplit | boolean | | metadata.payloadSplit | ペイロード分割フラグ |

#### 識別子（25）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 25 | cid | string | | cid | Content Identifier |

#### チャンク情報（26-29）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 26 | totalChunks | number | | recovery.totalChunks | 総チャンク数 |
| 27 | chunkCount | number | | chunks.length | インライン格納数 |
| 28 | chunkSize | number | | recovery.chunkSize | チャンクサイズ |
| 29 | segmentCount | number | | metadata.segmentBoundaries.length | セグメント数 |

#### ディレクトリ情報（30-33）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 30 | totalFiles | number | | recovery.totalFiles | 総ファイル数 |
| 31 | fileCount | number | | directory.fileCount | ファイル数 |
| 32 | directoryCount | number | | directory.directoryCount | サブディレクトリ数 |
| 33 | entryCount | number | | entries.length | エントリー数 |

#### リカバリ情報（34-36）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 34 | checksum | string | | recovery.checksum | チェックサム |
| 35 | uploadCost | number | | recovery.uploadCost | アップロードコスト |
| 36 | uploadDuration | number | | recovery.uploadDuration | アップロード時間(ms) |

#### チャンク構造（37-39）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 37 | chunkStructureType | string | | chunkStructure.type | チャンク構造タイプ |
| 38 | chunkLevel | number | | chunkStructure.level | チャンクレベル |
| 39 | totalGroups | number | | chunkStructure.totalGroups | 総グループ数 |

#### 認証・セキュリティ（40-41）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 40 | passwordIncluded | boolean | | auth.passwordIncluded | パスワード付きフラグ |
| 41 | password | string | | - （KENV拡張） | 暗号化パスワード（推奨） |

#### その他（42-45）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド | 備考 |
|----|---------|-----|------|-------------------|------|
| 42 | externalRef | string | | - （KENV独自） | 外部ファイル参照 |
| 43 | tags | string | | - （KENV独自） | タグ（カンマ区切り） |
| 44 | notes | string | | - （KENV独自） | メモ |
| 45 | authWarning | string | | auth.warning | 認証警告メッセージ |

### 可変カラム（46以降）

#### ファイルの場合
1. **チャンクペア**（chunkCount > 0 && externalRef == null）
   ```
   tx1,blk1,tx2,blk2,tx3,blk3,...
   ```

2. **セグメントバウンダリー**（segmentCount > 0 && payloadSplit == true）
   ```
   seg,0,0,12288,10000,8000,0,seg,1,1048576,12288,10000,8000,45,...
   ```
   各セグメント: `seg,index,offset,size,originalSize,compressedSize,payloadIndex`

#### ディレクトリの場合
```
type,name,path,size,metaTxId,blockId,password,cid[,fileCount,totalSize]
```

### データ例

#### 最小構成（マニュアル追加）
```csv
file_001,kaspa-file,,,mainnet,重要書類.pdf,,abc123xxx,def456yyy,,,,,manual,pending,,,,,,,,,,,,,,,,,,,,,,,,,,,,,mypass123,,,重要ファイル,
```

#### 検証済みファイル（全情報）
```csv
file_002,kaspa-file,3.4.2,2025-01-28T10:00:00Z,mainnet,document.pdf,,abc123xxx,def456yyy,chunk1aaa,2025-01-28T10:00:00Z,2025-01-28T10:01:00Z,kaspa:qq...,upload,verified,1048576,1048576,1000000,application/pdf,a1b2c3d4...,true,lz77,true,true,true,bafybeif...,100,100,12288,3,0,0,0,0,sha256sum,0.01,60000,flat,0,0,true,mypass123,,work,業務資料,,tx1,blk1,tx2,blk2,...,seg,0,0,12288,10000,8000,0,seg,1,1048576,12288,10000,8000,45
```

#### 大規模ファイル（外部参照）
```csv
file_003,kaspa-file,3.4.2,2025-01-28T11:00:00Z,mainnet,bigdata.zip,,,,,2025-01-28T11:00:00Z,,,upload,verified,9999999999,9999999999,8000000000,application/zip,sha256big,true,lz77,true,true,true,bafybeid,15000,0,12288,1000,0,0,0,0,sha256big,1.5,3600000,super,2,94,true,mypass456,file_003_bigdata.kaspa,backup,大容量バックアップ,
```

### パース実装

```javascript
const FIXED_COLUMN_COUNT = 46;  // v3.1.2で45カラムに削減

function parseCSVLine(line) {
    const columns = parseCSVColumns(line);
    
    // 固定部分
    const entry = {
        // 必須項目（最小構成）
        id: columns[0],
        type: columns[1] || 'kaspa-file',
        name: columns[5],
        metaTxId: columns[7],
        metaTxBlockId: columns[8],
        source: columns[13],
        status: columns[14],
        
        // オプション項目（自動補完可能）
        version: columns[2] || '3.4.2',
        created: columns[3] || null,
        network: columns[4] || 'mainnet',
        
        // パスワード（推奨保管）
        passwordIncluded: columns[40] === 'true',
        password: columns[41] || null,  // 暗号化して保管
        
        // 外部参照
        externalRef: columns[42] || null,
        
        // ユーザー管理用
        tags: columns[43] || '',
        notes: columns[44] || ''
    };
    
    let index = FIXED_COLUMN_COUNT;
    
    // 可変部分の処理（v3.1.1と同じ）
    // ...
    
    return entry;
}
```

### ステータス管理

```javascript
// エントリーのライフサイクル
const EntryStatus = {
    PENDING: 'pending',         // 未検証（最小情報のみ）
    VERIFYING: 'verifying',     // 検証中
    VERIFIED: 'verified',       // 検証済み（全情報補完）
    FAILED: 'failed',          // 検証失敗
    INCOMPLETE: 'incomplete'    // 部分的失敗
};

// 段階的情報補完
async function verifyAndComplete(entry) {
    if (entry.status !== 'pending') return;
    
    entry.status = 'verifying';
    
    try {
        // 1. MetaTxIDから.kaspaファイル取得
        const kaspaData = await fetchKaspaMetadata(
            entry.metaTxId, 
            entry.metaTxBlockId,
            entry.password
        );
        
        // 2. 自動情報補完
        Object.assign(entry, {
            fileSize: kaspaData.file.size,
            sha256: kaspaData.file.sha256,
            encrypted: kaspaData.file.encrypted,
            // ... その他の情報
            status: 'verified'
        });
        
    } catch (error) {
        entry.status = 'failed';
        entry.authWarning = error.message;
    }
}
```

### 最適化のポイント

1. **最小構成での動作**
   - 必須7項目だけで登録可能
   - 後からバックグラウンドで情報補完

2. **パスワード管理**
   - .kenv暗号化による二重保護
   - 復元時の利便性向上

3. **効率的なCSV処理**
   - 45カラムに削減（v3.1.1の49から4カラム削減）
   - ストリーミング処理対応

4. **柔軟な検証**
   - 未検証でも登録可能
   - オフライン対応

## 移行ガイド

### v3.1.1からの移行
```javascript
// カラム削除対応
function migrateFromV311(oldEntry) {
    const newEntry = {...oldEntry};
    
    // 削除カラムの処理
    delete newEntry.hasPassword;     // passwordIncludedを使用
    delete newEntry.downloadable;    // statusから判断
    delete newEntry.isTemporary;     // 使用しない
    delete newEntry.addedDate;       // uploadDateで代用
    
    return newEntry;
}
```

## まとめ

v3.1.2では、実用性を重視した最適化を行いました：
- 不要カラムの削除により45カラムに削減
- 最小7項目での登録を可能に
- パスワード保管を推奨し利便性向上
- 段階的検証による柔軟な運用

これにより、高速なCSV処理と使いやすさを両立しています。