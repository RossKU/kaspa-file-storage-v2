# KENV File Format Specification v3.1.1 - .kaspa互換CSVストリーミング設計

## 概要
KENVファイルシステムは、Kaspa P2P File Storageの作業環境を管理する軽量ストレージシステムです。v3.1.1では.kaspaファイルフォーマットv3.4.2との完全互換性を確保し、CSVから.kaspaファイルの生成を可能にします。

## フォーマットバージョン
- **現行バージョン**: 3.1.1
- **前バージョン**: 3.1.0
- **基準実装**: v5.12.0（予定）
- **.kaspa互換**: v3.4.2準拠

## 主要な変更点（v3.1.0→v3.1.1）
1. **カラム名を.kaspaフォーマットに準拠**
2. **セグメントバウンダリーのインライン格納**
3. **完全な.kaspa生成に必要な全フィールド追加**
4. **後で最適化する前提で包括的なカラム定義**

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
  "version": "3.1.1",
  "schemaVersion": 3,
  "kaspaCompatVersion": "3.4.2",
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
      "streamingChunkSize": 65536,
      "externalFileThreshold": 10000
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
    "totalSize": 104857600
  }
}
```

## 3. .kenv-entries.csv（統合エントリーテーブル）

### CSVヘッダー（固定カラム）

```csv
id,type,version,created,network,name,path,metaTxId,metaTxBlockId,firstChunkTxId,uploadDate,blockTime,uploadedBy,source,status,fileSize,originalSize,compressedSize,mimeType,sha256,encrypted,compressionAlgorithm,compressionEnabled,variableChunk,payloadSplit,cid,totalChunks,chunkCount,chunkSize,segmentCount,totalFiles,fileCount,directoryCount,entryCount,checksum,uploadCost,uploadDuration,chunkStructureType,chunkLevel,totalGroups,passwordIncluded,hasPassword,downloadable,isTemporary,addedDate,externalRef,tags,notes,authWarning
```

### カラム定義詳細（.kaspaフォーマット準拠）

#### 基本情報（0-4）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 0 | id | string | ✓ | - （KENV独自） |
| 1 | type | string | ✓ | type |
| 2 | version | string | ✓ | version |
| 3 | created | string | ✓ | created |
| 4 | network | string | ✓ | network |

#### ファイル/ディレクトリ情報（5-8）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 5 | name | string | ✓ | file.name / directory.name |
| 6 | path | string | | entries[].path |
| 7 | metaTxId | string | ✓ | metadata.metaTxId |
| 8 | metaTxBlockId | string | ✓ | metadata.metaTxBlockId |

#### トランザクション情報（9-12）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 9 | firstChunkTxId | string | | chunks[0] |
| 10 | uploadDate | string | ✓ | metadata.uploadDate |
| 11 | blockTime | string | | metadata.blockTime |
| 12 | uploadedBy | string | | metadata.uploader |

#### ステータス情報（13-14）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 13 | source | string | ✓ | - （KENV独自） |
| 14 | status | string | ✓ | - （KENV独自） |

#### ファイルサイズ情報（15-17）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 15 | fileSize | number | ✓ | file.size |
| 16 | originalSize | number | | file.compression.originalSize |
| 17 | compressedSize | number | | file.compression.compressedSize |

#### ファイル属性（18-20）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 18 | mimeType | string | | file.mimeType |
| 19 | sha256 | string | | file.sha256 |
| 20 | encrypted | boolean | | file.encrypted |

#### 圧縮情報（21-24）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 21 | compressionAlgorithm | string | | file.compression.algorithm |
| 22 | compressionEnabled | boolean | | file.compression.enabled |
| 23 | variableChunk | boolean | | file.compression.variableChunk |
| 24 | payloadSplit | boolean | | metadata.payloadSplit |

#### 識別子（25）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 25 | cid | string | | cid |

#### チャンク情報（26-29）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 26 | totalChunks | number | | recovery.totalChunks |
| 27 | chunkCount | number | ✓ | chunks.length（インライン数） |
| 28 | chunkSize | number | | recovery.chunkSize |
| 29 | segmentCount | number | | metadata.segmentBoundaries.length |

#### ディレクトリ情報（30-33）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 30 | totalFiles | number | | recovery.totalFiles |
| 31 | fileCount | number | | directory.fileCount |
| 32 | directoryCount | number | | directory.directoryCount |
| 33 | entryCount | number | | entries.length |

#### リカバリ情報（34-36）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 34 | checksum | string | | recovery.checksum |
| 35 | uploadCost | number | | recovery.uploadCost |
| 36 | uploadDuration | number | | recovery.uploadDuration |

#### チャンク構造（37-39）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 37 | chunkStructureType | string | | chunkStructure.type |
| 38 | chunkLevel | number | | chunkStructure.level |
| 39 | totalGroups | number | | chunkStructure.totalGroups |

#### 認証情報（40-43）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 40 | passwordIncluded | boolean | | auth.passwordIncluded |
| 41 | hasPassword | boolean | ✓ | - （KENV独自） |
| 42 | downloadable | boolean | ✓ | - （KENV独自） |
| 43 | isTemporary | boolean | | - （KENV独自） |

#### その他（44-48）
| 列 | カラム名 | 型 | 必須 | .kaspa対応フィールド |
|----|---------|-----|------|-------------------|
| 44 | addedDate | string | | - （KENV独自） |
| 45 | externalRef | string | | - （KENV独自） |
| 46 | tags | string | | - （KENV独自） |
| 47 | notes | string | | - （KENV独自） |
| 48 | authWarning | string | | auth.warning |

### 可変カラム（49以降）

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

### データ行の例

#### 小規模ファイル（チャンク・セグメントインライン）
```csv
file_001,kaspa-file,3.4.2,2025-01-28T10:00:00Z,testnet-10,test.pdf,,abc123,def456,chunk1,2025-01-28T10:00:00Z,2025-01-28T10:01:00Z,kaspatest:qq,upload,completed,1048576,1048576,1000000,application/pdf,sha256hash,true,lz77,true,true,true,bafybeif,100,100,12288,3,0,0,0,0,sha256hash,0.01,60000,flat,0,0,false,true,true,false,,,work,重要書類,,tx1,blk1,tx2,blk2,...,seg,0,0,12288,10000,8000,0,seg,1,1048576,12288,10000,8000,45
```

#### 大規模ファイル（外部参照）
```csv
file_002,kaspa-file,3.4.2,2025-01-28T11:00:00Z,mainnet,bigdata.zip,,,,,2025-01-28T11:00:00Z,,,upload,completed,9999999999,9999999999,8000000000,application/zip,sha256big,true,lz77,true,true,true,bafybeid,15000,0,12288,1000,0,0,0,0,sha256big,1.5,3600000,super,2,94,true,true,false,false,,,backup,15000チャンク,file_002_bigdata.kaspa
```

#### ディレクトリ
```csv
dir_001,kaspa-directory,3.4.2,2025-01-28T12:00:00Z,testnet-10,project,,mno345,pqr678,,2025-01-28T12:00:00Z,,,upload,completed,0,0,0,,,false,none,false,false,false,bafybeihe,0,0,0,0,10,8,2,2,,0.05,10000,,,,,false,true,false,,,archive,開発資料,,file,doc.pdf,folder1,1024,filemeta1,fileblk1,pass1,filecid1,directory,subfolder,folder1,0,dirmeta1,dirblk1,,,2,3456
```

### パース実装

```javascript
const FIXED_COLUMN_COUNT = 49;

function parseCSVLine(line) {
    const columns = parseCSVColumns(line);
    
    // 固定部分（.kaspaフォーマット準拠）
    const entry = {
        // 基本情報
        id: columns[0],
        type: columns[1],
        version: columns[2],
        created: columns[3],
        network: columns[4],
        
        // ファイル/ディレクトリ情報
        name: columns[5],
        path: columns[6] || null,
        metaTxId: columns[7] || null,
        metaTxBlockId: columns[8] || null,
        
        // ... 全49カラムをマッピング
        
        // チャンク関連
        chunkCount: parseInt(columns[27]) || 0,
        segmentCount: parseInt(columns[29]) || 0,
        
        // ディレクトリ関連
        entryCount: parseInt(columns[33]) || 0
    };
    
    let index = FIXED_COLUMN_COUNT;
    
    // 1. チャンクペアの読み込み
    if (entry.chunkCount > 0 && !entry.externalRef) {
        entry.chunks = [];
        entry.chunkBlockIds = [];
        for (let i = 0; i < entry.chunkCount; i++) {
            entry.chunks.push(columns[index++]);
            entry.chunkBlockIds.push(columns[index++]);
        }
    }
    
    // 2. セグメントバウンダリーの読み込み
    if (entry.segmentCount > 0 && entry.payloadSplit) {
        entry.segmentBoundaries = [];
        for (let i = 0; i < entry.segmentCount; i++) {
            if (columns[index] === 'seg') {
                index++; // 'seg'マーカーをスキップ
                entry.segmentBoundaries.push({
                    index: parseInt(columns[index++]),
                    offset: parseInt(columns[index++]),
                    size: parseInt(columns[index++]),
                    originalSize: parseInt(columns[index++]),
                    compressedSize: parseInt(columns[index++]),
                    payloadIndex: parseInt(columns[index++])
                });
            }
        }
    }
    
    // 3. ディレクトリエントリーの読み込み
    if (entry.type === 'kaspa-directory' && entry.entryCount > 0) {
        entry.entries = parseDirectoryEntries(columns, index, entry.entryCount);
    }
    
    return entry;
}
```

### .kaspaファイル生成

```javascript
function generateKaspaFromCSV(entry) {
    const kaspaFile = {
        // 基本情報（CSVから直接マッピング）
        type: entry.type,
        version: entry.version,
        created: entry.created,
        network: entry.network,
        
        // 暗号化情報（.kenvから補完）
        encryption: {
            algorithm: "AES-256-GCM",
            pbkdf2: {
                salt: generateSalt(), // 新規生成または.kenvから
                iterations: 100000
            }
        },
        
        // ファイル情報
        file: entry.type === 'kaspa-file' ? {
            name: entry.name,
            size: entry.fileSize,
            mimeType: entry.mimeType || 'application/octet-stream',
            sha256: entry.sha256,
            encrypted: entry.encrypted,
            compression: {
                algorithm: entry.compressionAlgorithm || "none",
                enabled: entry.compressionEnabled || false,
                originalSize: entry.originalSize || entry.fileSize,
                compressedSize: entry.compressedSize || entry.fileSize,
                variableChunk: entry.variableChunk || false
            }
        } : undefined,
        
        // ディレクトリ情報
        directory: entry.type === 'kaspa-directory' ? {
            name: entry.name,
            totalSize: entry.fileSize || 0,
            fileCount: entry.fileCount || 0,
            directoryCount: entry.directoryCount || 0
        } : undefined,
        
        // CID
        cid: entry.cid,
        
        // チャンク情報
        chunks: entry.chunks || [],
        chunkBlockIds: entry.chunkBlockIds || [],
        
        // チャンク構造
        chunkStructure: entry.chunkStructureType ? {
            type: entry.chunkStructureType,
            level: entry.chunkLevel,
            totalGroups: entry.totalGroups,
            totalChunks: entry.totalChunks
        } : undefined,
        
        // リカバリ情報
        recovery: {
            totalChunks: entry.totalChunks || entry.chunkCount,
            chunkSize: entry.chunkSize || 12288,
            checksum: entry.checksum || entry.sha256,
            uploadCost: entry.uploadCost || 0,
            uploadDuration: entry.uploadDuration || null
        },
        
        // メタデータ
        metadata: {
            metaTxId: entry.metaTxId || "",
            metaTxBlockId: entry.metaTxBlockId || "",
            uploadDate: entry.uploadDate,
            blockTime: entry.blockTime || entry.uploadDate,
            uploader: entry.uploadedBy || null,
            payloadSplit: entry.payloadSplit || false,
            segmentBoundaries: entry.segmentBoundaries || []
        },
        
        // 認証情報
        auth: entry.passwordIncluded ? {
            passwordIncluded: true,
            password: null, // セキュリティのため別途管理
            warning: entry.authWarning || "パスワードは平文で保存されています。"
        } : undefined,
        
        // エントリー（ディレクトリ）
        entries: entry.entries || [],
        
        // 拡張
        extensions: {
            v4_5_6_compat: true,
            custom: {}
        }
    };
    
    return kaspaFile;
}
```

## パフォーマンス特性

### データサイズ見積もり
| 項目 | サイズ | 備考 |
|------|------|------|
| 固定カラム | 約500バイト | 49カラム |
| 1000チャンク | 約130KB | ペア形式 |
| 100セグメント | 約10KB | 6値×100 |
| 合計（1000チャンク） | 約140KB/行 | 実用範囲内 |

### ストリーミング効率
- 64KBバッファで処理可能
- メモリ使用量一定
- 数百万エントリーも処理可能

## セキュリティ考慮事項

### パスワード管理
- CSVにはパスワード自体は保存しない
- `passwordIncluded`フラグのみ記録
- 実際のパスワードは暗号化された.kenvまたは別管理

### CSVインジェクション対策
- 特殊文字のエスケープ
- セグメントバウンダリーの'seg'マーカーで境界明確化

## 互換性

### .kaspaファイルv3.4.2との完全互換
- 全必須フィールドをカバー
- オプションフィールドも網羅
- CSVから完全な.kaspaファイル生成可能

### 将来の最適化
- 使用頻度の低いカラムは後で削除可能
- 現時点では包括的に定義
- 実運用後に最適化

## まとめ

v3.1.1では：
1. **.kaspaファイルフォーマットv3.4.2完全準拠**
2. **セグメントバウンダリーのインライン格納実現**
3. **CSVから.kaspaファイルの完全生成可能**
4. **後の最適化を前提とした包括的設計**

これにより、KENVシステムは.kaspaファイルとの完全な相互運用性を持ち、大規模データでも効率的に動作します。

## 変更履歴

### v3.1.1 (2025-01-28)
- .kaspaファイルフォーマットv3.4.2準拠のカラム名採用
- セグメントバウンダリーのインライン格納追加
- 完全な.kaspa生成に必要な全フィールド追加
- 後の最適化を前提とした包括的カラム定義

### v3.1.0 (2025-01-28)
- CSVストリーミング設計の採用
- チャンクデータのペア形式採用
- ヘッダーレス可変部の導入