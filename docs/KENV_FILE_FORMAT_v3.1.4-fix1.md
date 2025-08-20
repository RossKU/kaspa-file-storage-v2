# KENV File Format Specification v3.1.4-fix1

## 概要
KENVファイルシステムは、Kaspa P2P File Storageの作業環境を管理する軽量ストレージシステムです。本仕様書は実装と完全に一致する47カラムの固定フォーマットを定義します。

## フォーマットバージョン
- **現行バージョン**: 3.1.4-fix1
- **基準実装**: v6.2.31
- **.kaspa互換**: v3.4.2準拠
- **固定カラム数**: 47（salt含む）

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

| # | カラム名 | 必須 | 型 | 説明 | 例 |
|---|---------|------|-----|------|-----|
| 1 | id | ✓ | string | ローカル一意識別子 | kaspa-file_1234567890_abc123 |
| 2 | type | ✓ | string | エントリータイプ | kaspa-file, kaspa-directory |
| 3 | version | | string | フォーマットバージョン | 3.4.2 |
| 4 | created | | string | 作成日時（ISO8601） | 2025-01-28T10:00:00Z |
| 5 | network | | string | ネットワーク | mainnet, testnet-10 |
| 6 | name | ✓ | string | ファイル/ディレクトリ名 | document.pdf |
| 7 | path | | string | パス | /documents |
| 8 | metaTxId | | string | メタトランザクションID | abc123xxx... |
| 9 | metaTxBlockId | | string | メタトランザクションブロックID | def456yyy... |
| 10 | firstChunkTxId | | string | 最初のチャンクトランザクションID | chunk1aaa... |
| 11 | uploadDate | | string | アップロード日時 | 2025-01-28T10:00:00Z |
| 12 | blockTime | | string | ブロック生成時刻 | 2025-01-28T10:01:00Z |
| 13 | uploadedBy | | string | アップロード者アドレス | kaspa:qq... |
| 14 | source | ✓ | string | ソース | upload, manual, download |
| 15 | status | ✓ | string | ステータス | pending, verifying, verified, failed |
| 16 | fileSize | | number | ファイルサイズ（バイト） | 1048576 |
| 17 | originalSize | | number | 元のサイズ | 1048576 |
| 18 | compressedSize | | number | 圧縮後サイズ | 1000000 |
| 19 | mimeType | | string | MIMEタイプ | application/pdf |
| 20 | sha256 | | string | SHA256ハッシュ | a1b2c3d4... |
| 21 | encrypted | | boolean | 暗号化フラグ | true |
| 22 | compressionAlgorithm | | string | 圧縮アルゴリズム | lz77 |
| 23 | compressionEnabled | | boolean | 圧縮有効フラグ | true |
| 24 | variableChunk | | boolean | 可変チャンクフラグ | true |
| 25 | payloadSplit | | boolean | ペイロード分割フラグ | true |
| 26 | cid | | string | コンテンツ識別子 | bafybeif... |
| 27 | totalChunks | | number | 総チャンク数 | 100 |
| 28 | chunkCount | | number | チャンク数 | 100 |
| 29 | chunkSize | | number | チャンクサイズ | 12288 |
| 30 | segmentCount | | number | セグメント数 | 3 |
| 31 | totalFiles | | number | ディレクトリ内総ファイル数 | 10 |
| 32 | fileCount | | number | 直下のファイル数 | 5 |
| 33 | directoryCount | | number | 直下のディレクトリ数 | 2 |
| 34 | entryCount | | number | エントリー数 | 7 |
| 35 | checksum | | string | チェックサム | sha256sum |
| 36 | uploadCost | | number | アップロードコスト（KAS） | 0.01 |
| 37 | uploadDuration | | number | アップロード時間（ミリ秒） | 60000 |
| 38 | chunkStructureType | | string | チャンク構造タイプ | flat |
| 39 | chunkLevel | | number | チャンクレベル | 0 |
| 40 | totalGroups | | number | 総グループ数 | 0 |
| 41 | passwordIncluded | | boolean | パスワード含有フラグ | true |
| 42 | password | | string | 暗号化パスワード | mypass123 |
| 43 | externalRef | | string | 外部参照 | file_002_document.kaspa |
| 44 | tags | | string | タグ | work,important |
| 45 | notes | | string | ノート | 業務資料 |
| 46 | authWarning | | string | 認証警告 | |
| 47 | salt | | string | 暗号化ソルト（Base64） | YmFzZTY0c2FsdA== |

### 固定カラム数
```javascript
const FIXED_COLUMN_COUNT = 47;  // v3.1.4-fix1で47カラム固定（saltを含む）
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
const FIXED_COLUMN_COUNT = 47;  // v3.1.4-fix1で47カラム固定

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

## まとめ

v3.1.4-fix1では、実装と完全に一致する仕様を定義しました：

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
