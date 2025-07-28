# KENV File Format Specification v3.1.3 - 拡張子統一と.kindex最適化

## 概要
KENVファイルシステムは、Kaspa P2P File Storageの作業環境を管理する軽量ストレージシステムです。v3.1.3では専用拡張子の採用と、.kindexの大幅な最適化を行いました。

## フォーマットバージョン
- **現行バージョン**: 3.1.3
- **前バージョン**: 3.1.2
- **基準実装**: v5.12.0（予定）
- **.kaspa互換**: v3.4.2準拠

## 主要な変更点（v3.1.2→v3.1.3）
1. **専用拡張子の採用**
   - `.kenv` - 設定ファイル（JSON形式）
   - `.kindex` - インデックスファイル（JSON形式）
   - `.kentry` - エントリーファイル（CSV形式）
2. **.kindex大幅最適化**
   - UIカラムに基づいた効率的インデックス
   - 10万件でも数MBに収まる設計
   - ソート・検索・フィルタの高速化

## ファイル構成

```
workspace/
├── workspace.kenv      # 設定ファイル（JSON、1-10KB）
├── workspace.kindex    # 検索インデックス（JSON、1-5MB @10万件）
├── workspace.kentry    # エントリーテーブル（CSVストリーミング）
└── *.kaspa            # 個別メタデータファイル
```

## 1. .kenv（設定ファイル）

### 構造（v3.1.2から変更なし）
```json
{
  "version": "3.1.3",
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
      "language": "ja",
      "defaultSort": "uploadDate",  // デフォルトソート
      "itemsPerPage": 100           // ページングサイズ
    },
    "storage": {
      "autoSaveInterval": 300,
      "csvEncryption": false,
      "streamingChunkSize": 65536,
      "externalFileThreshold": 10000,
      "minimalMode": true,
      "indexUpdateInterval": 60      // インデックス更新間隔（秒）
    },
    "technical": {
      // マジックナンバーの外部化
      "kaspaMaxPayload": 24000,
      "maxEncryptedSize": 22984,
      "processSegmentSize": 1048576,
      "chunksPerMeta": 160,
      "maxChunksSupported": 25600,
      "defaultChunkSize": 12288
    }
  },
  "workspace": {
    "folderName": "kaspa-workspace",
    "totalEntries": 0,
    "totalSize": 0,
    "lastActivity": "2025-01-28T15:30:00Z",
    "indexVersion": "2.0"  // インデックスバージョン
  }
}
```

## 2. .kindex（最適化インデックス）

### 構造（新設計）
```json
{
  "version": "2.0",
  "updated": "2025-01-28T10:00:00Z",
  "format": "optimized",
  
  // ソート用インデックス（UIカラム対応）
  "sortIndexes": {
    "name": [           // ファイル名順
      ["document.pdf", 0, "f"],    // [名前, 行番号, タイプ]
      ["image.jpg", 1, "f"],
      ["project", 2, "d"]          // ディレクトリ
    ],
    "size": [           // 容量順
      [1234, 2],        // [サイズ, 行番号]
      [1048576, 0],     
      [5242880, 1]
    ],
    "uploadDate": [     // アップロード日順
      [1737936000, 1],  // [UNIXタイムスタンプ, 行番号]
      [1737849600, 0],
      [1737763200, 2]
    ],
    "addedDate": [      // 登録日順
      [1737936000, 0],
      [1737849600, 2],
      [1737763200, 1]
    ]
  },
  
  // 高速検索インデックス（プレフィックス検索）
  "searchIndexes": {
    "name": {           // ファイル名検索（3文字プレフィックス）
      "doc": [0],
      "ima": [1],
      "pro": [2]
    },
    "metaTxId": {       // MetaTxID検索（8文字プレフィックス）
      "a1b2c3de": [0],
      "f4g5h6ij": [1]
    },
    "cid": {            // CID検索（8文字プレフィックス）
      "Qm1234ab": [0],
      "bafybeid": [1]
    },
    "uploader": {       // アップローダー検索（短縮）
      "qq": [0, 1],     // kaspa:qq...
      "qr": [2]         // kaspa:qr...
    }
  },
  
  // フィルタ用インデックス
  "filterIndexes": {
    "type": {
      "file": [0, 1],
      "directory": [2]
    },
    "fileType": {       // 拡張子ベース
      "pdf": [0],
      "jpg": [1],
      "": [2]           // ディレクトリ
    },
    "status": {
      "verified": [0, 1],
      "pending": [2]
    },
    "encrypted": {
      "true": [0, 2],
      "false": [1]
    },
    "hasPassword": {
      "true": [0],
      "false": [1, 2]
    }
  },
  
  // 統計情報（UIヒント用）
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
  
  // ページング最適化
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

### フォーマット（v3.1.2から変更なし、拡張子のみ変更）
```csv
id,type,version,created,network,name,path,metaTxId,metaTxBlockId,firstChunkTxId,uploadDate,blockTime,uploadedBy,source,status,fileSize,originalSize,compressedSize,mimeType,sha256,encrypted,compressionAlgorithm,compressionEnabled,variableChunk,payloadSplit,cid,totalChunks,chunkCount,chunkSize,segmentCount,totalFiles,fileCount,directoryCount,entryCount,checksum,uploadCost,uploadDuration,chunkStructureType,chunkLevel,totalGroups,passwordIncluded,password,externalRef,tags,notes,authWarning
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

## 5. 実装例

### ソート処理
```javascript
// 名前順でソート（降順）
const sorted = kindexData.sortIndexes.name
  .reverse()
  .map(([name, line]) => line);

// 複合ソート（タイプ→サイズ）
const filesSorted = kindexData.filterIndexes.type.file
  .map(line => [kindexData.sortIndexes.size.find(([_, l]) => l === line), line])
  .sort((a, b) => b[0][0] - a[0][0])
  .map(([_, line]) => line);
```

### 検索処理
```javascript
// ファイル名検索
function searchByName(query) {
  const prefix = query.substring(0, 3).toLowerCase();
  const candidates = kindexData.searchIndexes.name[prefix] || [];
  
  // 詳細検索（CSVから該当行のみ読み込み）
  return candidates.filter(line => {
    const entry = readCSVLine(line);
    return entry.name.toLowerCase().includes(query.toLowerCase());
  });
}
```

## 6. 移行ガイド

### v3.1.2からの移行
```bash
# ファイル名変更
mv .kenv workspace.kenv
mv .kenv-index workspace.kindex
mv .kenv-entries.csv workspace.kentry

# インデックス再構築
node rebuild-index.js workspace.kentry > workspace.kindex
```

## まとめ

v3.1.3では、専用拡張子の採用とインデックスの大幅な最適化により：
- **明確な役割分離** - 拡張子で用途が一目瞭然
- **高速アクセス** - UIカラムに最適化されたインデックス
- **省メモリ** - 10万件でも数MBで動作
- **拡張性** - 新しいソート条件の追加が容易

これにより、大規模ファイルリストでも快適な操作性を実現します。