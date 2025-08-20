# KENV File Format Specification v3.1.4-fix2

## 概要
KENVファイルシステムは、Kaspa P2P File Storageの作業環境を管理する軽量ストレージシステムです。本仕様書は実装と完全に一致する47カラムの固定フォーマットを定義し、Kaspa File Format v3.4.2との対応関係を明確化します。

## フォーマットバージョン
- **現行バージョン**: 3.1.4-fix2
- **基準実装**: v6.2.31
- **.kaspa互換**: v3.4.2準拠
- **固定カラム数**: 47（salt含む）

## Kaspa File Format v3.4.2との関係
- **.kaspaフォーマット由来**: 36カラム
- **KENV独自追加**: 11カラム
- **データ形式**: .kaspa（JSON） → KENV（CSV）

## ファイル構成

```
workspace/
├── workspace.kenv      # 設定ファイル（JSON、1-10KB）
├── workspace.kindex    # 検索インデックス（JSON、1-5MB @10万件）
├── workspace.kentry    # エントリーテーブル（CSVストリーミング）
└── *.kaspa            # 個別メタデータファイル
```

## 1. .kenv（設定ファイル）

### 構造
```json
{
  "version": "3.1.4",
  "schemaVersion": 3,
  "kaspaCompatVersion": "3.4.2",
  "createdAt": "2025-01-28T10:00:00Z",
  "updatedAt": "2025-01-28T15:30:00Z",
  "wallet": "kaspa:qpxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "encryption": {
    "enabled": true,
    "algorithm": "AES-256-GCM",
    "iterations": 100000,
    "passwordStorage": "encrypted"
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
      "language": "en",
      "defaultSort": "uploadDate",
      "itemsPerPage": 100
    },
    "storage": {
      "autoSaveInterval": 300,
      "csvEncryption": false,
      "streamingChunkSize": 65536,
      "externalFileThreshold": 10000,
      "minimalMode": true,
      "indexUpdateInterval": 60
    },
    "technical": {
      "chunkSize": 12288,
      "maxTransactionSize": 102400,
      "minTransactionFee": 0.00001,
      "maxChunksPerFile": 10000,
      "defaultCompression": "lz77",
      "cipherAlgorithm": "AES-256-GCM",
      "pbkdf2Iterations": 100000
    }
  },
  "stats": {
    "totalFiles": 150,
    "totalSize": 1073741824,
    "lastSync": "2025-01-28T15:00:00Z",
    "lastBackup": "2025-01-28T14:00:00Z"
  }
}
```

## 2. .kindex（インデックスファイル）

### 構造
```json
{
  "version": "2.0",
  "updated": "2025-01-28T15:30:00Z",
  "format": "optimized",
  
  "sortIndexes": {
    "name": [],      // [[name, lineNum, type], ...]
    "size": [],      // [[size, lineNum], ...]
    "uploadDate": [] // [[timestamp, lineNum], ...]
  },
  
  "searchIndexes": {
    "name": {},      // {"doc": [0,1,2], "ima": [3,4], ...}
    "metaTxId": {},  // {"a1b2c3de": [0], ...}
    "cid": {},       // {"Qm1234ab": [1], ...}
    "uploader": {}   // {"qq": [0,1], "qr": [2], ...}
  },
  
  "filterIndexes": {
    "type": {
      "file": [],      // ファイルの行番号リスト
      "directory": []  // ディレクトリの行番号リスト
    },
    "status": {
      "pending": [],    // Unverified
      "verifying": [],  // Verifying
      "verified": [],   // Verified
      "failed": []      // Failed
    },
    "encrypted": {
      "true": [],
      "false": []
    },
    "hasPassword": {
      "true": [],
      "false": []
    }
  },
  
  "stats": {
    "totalEntries": 3,
    "totalSize": 6291456,
    "oldestDate": "2025-01-26",
    "newestDate": "2025-01-28",
    "largestFile": 5242880,
    "smallestFile": 1234,
    "typeDistribution": {
      "pdf": 1,
      "jpg": 1,
      "directory": 1
    }
  },
  
  "pageHints": {
    "pageSize": 100,
    "totalPages": 1,
    "buckets": [
      {
        "startLine": 0,
        "endLine": 99,
        "startOffset": 0,
        "endOffset": 204800
      }
    ]
  }
}
```

### インデックス更新戦略

```javascript
// 差分更新
function updateIndex(newEntry, lineNumber) {
  // ソートインデックスに挿入
  const nameIndex = sortIndexes.name;
  const insertPos = binarySearch(nameIndex, newEntry.name);
  nameIndex.splice(insertPos, 0, [newEntry.name, lineNumber, newEntry.type[0]]);
  
  // 検索インデックスに追加
  const prefix = newEntry.name.substring(0, 3).toLowerCase();
  if (!searchIndexes.name[prefix]) {
    searchIndexes.name[prefix] = [];
  }
  searchIndexes.name[prefix].push(lineNumber);
  
  // 統計更新
  stats.totalEntries++;
  stats.totalSize += newEntry.size;
}
```

## 3. .kentry（エントリーファイル）

### CSVヘッダー（47カラム固定）
```csv
id,type,version,created,network,name,path,metaTxId,metaTxBlockId,firstChunkTxId,uploadDate,blockTime,uploadedBy,source,status,fileSize,originalSize,compressedSize,mimeType,sha256,encrypted,compressionAlgorithm,compressionEnabled,variableChunk,payloadSplit,cid,totalChunks,chunkCount,chunkSize,segmentCount,totalFiles,fileCount,directoryCount,entryCount,checksum,uploadCost,uploadDuration,chunkStructureType,chunkLevel,totalGroups,passwordIncluded,password,externalRef,tags,notes,authWarning,salt
```

### カラム定義（全47項目）

| # | カラム名 | ソース | 必須 | 型 | Kaspa v3.4.2 JSONパス | 説明 |
|---|---------|--------|------|-----|---------------------|------|
| 1 | id | **KENV** | ✓ | string | - | ローカル一意識別子 |
| 2 | type | .kaspa | ✓ | string | type | エントリータイプ |
| 3 | version | .kaspa | | string | version | フォーマットバージョン |
| 4 | created | .kaspa | | string | created | 作成日時（ISO8601） |
| 5 | network | .kaspa | | string | network | ネットワーク |
| 6 | name | .kaspa | ✓ | string | file.name / directory.name | ファイル/ディレクトリ名 |
| 7 | path | **KENV** | | string | - | ローカルパス |
| 8 | metaTxId | .kaspa | | string | metadata.metaTxId | メタトランザクションID |
| 9 | metaTxBlockId | .kaspa | | string | metadata.metaTxBlockId | メタトランザクションブロックID |
| 10 | firstChunkTxId | .kaspa* | | string | chunks[0] | 最初のチャンクTxID（最適化） |
| 11 | uploadDate | .kaspa | | string | metadata.uploadDate | アップロード日時 |
| 12 | blockTime | .kaspa | | string | metadata.blockTime | ブロック生成時刻 |
| 13 | uploadedBy | .kaspa | | string | metadata.uploader | アップロード者アドレス |
| 14 | source | **KENV** | ✓ | string | - | upload/manual/download |
| 15 | status | **KENV** | ✓ | string | - | pending/verifying/verified/failed |
| 16 | fileSize | .kaspa | | number | file.size | ファイルサイズ（バイト） |
| 17 | originalSize | .kaspa | | number | file.compression.originalSize | 元のサイズ |
| 18 | compressedSize | .kaspa | | number | file.compression.compressedSize | 圧縮後サイズ |
| 19 | mimeType | .kaspa | | string | file.mimeType | MIMEタイプ |
| 20 | sha256 | .kaspa | | string | file.sha256 | SHA256ハッシュ |
| 21 | encrypted | .kaspa | | boolean | file.encrypted | 暗号化フラグ |
| 22 | compressionAlgorithm | .kaspa | | string | file.compression.algorithm | 圧縮アルゴリズム |
| 23 | compressionEnabled | .kaspa | | boolean | file.compression.enabled | 圧縮有効フラグ |
| 24 | variableChunk | **KENV** | | boolean | - | KENV可変チャンクフラグ |
| 25 | payloadSplit | .kaspa | | boolean | metadata.payloadSplit | ペイロード分割フラグ |
| 26 | cid | .kaspa | | string | cid | コンテンツ識別子 |
| 27 | totalChunks | .kaspa | | number | recovery.totalChunks | 総チャンク数 |
| 28 | chunkCount | .kaspa* | | number | chunks.length | チャンク数（キャッシュ） |
| 29 | chunkSize | .kaspa | | number | recovery.chunkSize | チャンクサイズ |
| 30 | segmentCount | .kaspa | | number | metadata.segmentBoundaries.length | セグメント数 |
| 31 | totalFiles | .kaspa | | number | recovery.totalFiles | ディレクトリ内総ファイル数 |
| 32 | fileCount | .kaspa | | number | directory.fileCount | 直下のファイル数 |
| 33 | directoryCount | .kaspa | | number | directory.directoryCount | 直下のディレクトリ数 |
| 34 | entryCount | .kaspa* | | number | entries.length | エントリー数（キャッシュ） |
| 35 | checksum | .kaspa | | string | recovery.checksum | チェックサム |
| 36 | uploadCost | .kaspa | | number | recovery.uploadCost | アップロードコスト（KAS） |
| 37 | uploadDuration | .kaspa | | number | recovery.uploadDuration | アップロード時間（ミリ秒） |
| 38 | chunkStructureType | .kaspa | | string | chunkStructure.type | チャンク構造タイプ |
| 39 | chunkLevel | .kaspa | | number | chunkStructure.level | チャンクレベル |
| 40 | totalGroups | .kaspa | | number | chunkStructure.totalGroups | 総グループ数 |
| 41 | passwordIncluded | .kaspa | | boolean | auth.passwordIncluded | パスワード含有フラグ |
| 42 | password | .kaspa | | string | auth.password | 暗号化パスワード |
| 43 | externalRef | **KENV** | | string | - | 外部参照 |
| 44 | tags | **KENV** | | string | - | タグ |
| 45 | notes | **KENV** | | string | - | ノート |
| 46 | authWarning | .kaspa | | string | auth.warning | 認証警告 |
| 47 | salt | .kaspa | | string | encryption.pbkdf2.salt | 暗号化ソルト（Base64） |

※ .kaspa* = .kaspaデータから派生したKENV最適化項目

### KENV独自カラムの目的

| カラム名 | 目的 | 詳細 |
|---------|------|------|
| id | ローカルDB管理 | 各エントリーの一意識別子として使用 |
| path | ファイルシステム管理 | ローカルでのファイル配置を記録 |
| source | エントリー作成元追跡 | upload（自分でアップロード）、manual（手動追加）、download（ダウンロード） |
| status | 検証状態管理 | ブロックチェーン上のデータ検証状態を追跡 |
| variableChunk | KENV処理フラグ | KENV独自の可変チャンク処理の有無 |
| externalRef | 大容量ファイル参照 | LocalStorageに収まらない大容量ファイルの外部参照 |
| tags | ユーザー分類 | ユーザーによるファイル分類用タグ |
| notes | ユーザーメモ | ユーザーによる自由記述メモ |
| firstChunkTxId | アクセス最適化 | 最初のチャンクへの直接アクセス用（配列参照を回避） |
| chunkCount | キャッシュ | チャンク数の事前計算値（配列長の計算を回避） |
| entryCount | キャッシュ | エントリー数の事前計算値（ディレクトリ用） |

### 固定カラム数
```javascript
const FIXED_COLUMN_COUNT = 47;  // v3.1.4-fix2で47カラム固定（saltを含む）
```

### データ例

#### kaspa-fileタイプ

##### 最小構成（オンチェーンモード）
```csv
file_001,kaspa-file,,,mainnet,重要書類.pdf,,abc123xxx,def456yyy,,,,,manual,pending,,,,,,,,,,,,,,,,,,,,,,,,,,,,,mypass123,,,重要ファイル,,
```

##### 検証済みファイル（全情報）
```csv
file_003,kaspa-file,3.4.2,2025-01-28T10:00:00Z,mainnet,document.pdf,,abc123xxx,def456yyy,chunk1aaa,2025-01-28T10:00:00Z,2025-01-28T10:01:00Z,kaspa:qq...,upload,verified,1048576,1048576,1000000,application/pdf,a1b2c3d4...,true,lz77,true,true,true,bafybeif...,100,100,12288,3,0,0,0,0,sha256sum,0.01,60000,flat,0,0,true,mypass123,,work,業務資料,,YmFzZTY0c2FsdA==,tx1,blk1,tx2,blk2,...
```

#### kaspa-directoryタイプ

##### 単純なディレクトリ（3ファイル、1サブディレクトリ）
```csv
dir_002,kaspa-directory,3.4.2,2025-08-03T10:00:00Z,testnet-10,SimpleProject,,,,,,,,manual,pending,307200,,,,,true,,,false,false,,0,0,,,4,3,1,0,,0,0,,,0,true,pass123,simple_project.kaspa,work,シンプル,,YmFzZTY0c2FsdA==,entries,3,1,f,README.md,,102400,aaa111,bbb222,pass1,f,index.html,,204800,ccc333,ddd444,pass2,f,config.json,settings,51200,eee555,fff666,pass3,d,settings,,0,,,
```

### 可変カラム（48列目以降）

#### kaspa-fileタイプ
- チャンクペア: `tx1,blk1,tx2,blk2,...`
- セグメントバウンダリー: `seg,index,offset,size,originalSize,compressedSize,payloadIndex`

#### kaspa-directoryタイプ
```
entries,<fileCount>,<dirCount>,<entry1>,...,<entryN>
```

エントリーフォーマット（7カラム固定）：
- `type`: 'f' (file) または 'd' (directory)
- `name`: ファイル/ディレクトリ名
- `path`: 親ディレクトリのパス（空=ルート）
- `size`: サイズ（バイト）
- `metaTxId`: メタトランザクションID（オプション）
- `blockId`: ブロックID（オプション）
- `password`: 個別パスワード（オプション）

### パース実装
```javascript
const FIXED_COLUMN_COUNT = 47;  // v3.1.4-fix2で47カラム固定

function parseKENVEntry(line) {
    const columns = parseCSVColumns(line);
    
    // 固定カラム処理（47個）
    const entry = {
        id: columns[0],
        type: columns[1] || 'kaspa-file',
        name: columns[5],
        source: columns[13],
        status: columns[14],
        metaTxId: columns[7] || null,
        metaTxBlockId: columns[8] || null,
        password: columns[41] || null,
        externalRef: columns[42] || null,
        salt: columns[46] || null  // 47番目のカラム
    };
    
    // 可変カラム処理
    if (columns.length > FIXED_COLUMN_COUNT) {
        if (entry.type === 'kaspa-directory' && columns[47] === 'entries') {
            // ディレクトリエントリーのパース
            const fileCount = parseInt(columns[48]) || 0;
            const dirCount = parseInt(columns[49]) || 0;
            const entries = [];
            
            let index = 50;
            const totalEntries = fileCount + dirCount;
            
            for (let i = 0; i < totalEntries && index < columns.length; i++) {
                const entryData = {
                    type: columns[index] === 'f' ? 'file' : 'directory',
                    name: columns[index + 1],
                    path: columns[index + 2] || '',
                    size: parseInt(columns[index + 3]) || 0,
                    metaTxId: columns[index + 4] || null,
                    blockId: columns[index + 5] || null,
                    password: columns[index + 6] || null
                };
                entries.push(entryData);
                index += 7;
            }
            
            entry.entries = entries;
            entry.parsedFileCount = fileCount;
            entry.parsedDirCount = dirCount;
            
        } else if (entry.type === 'kaspa-file') {
            // 従来のファイルエントリー処理
            parseFileVariableColumns(entry, columns, FIXED_COLUMN_COUNT);
        }
    }
    
    return entry;
}
```

## 4. 性能特性

### メモリ使用量（10万エントリー時）
| コンポーネント | サイズ | 備考 |
|--------------|--------|------|
| sortIndexes | 約2.5MB | 各ソート順を保持 |
| searchIndexes | 約0.5MB | プレフィックスのみ |
| filterIndexes | 約0.1MB | ビットマップ可能 |
| stats/hints | 約0.01MB | 固定サイズ |
| **合計** | **約3.1MB** | gzip圧縮で1-2MB |

### アクセス性能
| 操作 | 計算量 | 備考 |
|------|--------|------|
| ソート済み取得 | O(1) | インデックス参照のみ |
| 名前検索 | O(log n) | プレフィックス→バイナリサーチ |
| フィルタ | O(1) | ビットマップ演算 |
| ページング | O(1) | バケット直接アクセス |

## 5. Kaspa v3.4.2との互換性

### データフロー
```
.kaspaファイル（JSON）
    ↓ パース
ブロックチェーンメタデータ
    ↓ 変換
KENVエントリー（CSV）
    ↓ 保存
.kentryファイル
```

### 互換性の保証
- **完全互換**: 36カラム（76.6%）が.kaspaフォーマットから直接マッピング
- **拡張性**: KENV独自の11カラムはローカル管理専用で、.kaspaファイル生成時は無視
- **双方向変換**: KENVエントリーから.kaspaファイルの再生成が可能

## まとめ

v3.1.4-fix2では、実装との完全一致とKaspa v3.4.2との互換性を明確化しました：

### 技術仕様
- **47カラムCSV固定フォーマット** - saltカラムを含む完全仕様
- **専用拡張子** - .kenv/.kindex/.kentry
- **効率的なインデックス** - 10万件で約3MB
- **ストリーミング対応** - 大規模CSV処理

### 実装との整合性
- HTML実装（v6.2.31）と完全一致
- CSV出力時：47カラム
- 可変カラム：48列目以降
- saltカラム：47番目に配置

### Kaspa v3.4.2との関係
- 76.6%のカラムが.kaspaフォーマットと互換
- 23.4%のKENV独自カラムでローカル管理を強化
- 双方向のデータ変換が可能