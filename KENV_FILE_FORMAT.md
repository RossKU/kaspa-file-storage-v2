# KENV File Format Specification v3.1.4-fix2

## Overview
The KENV file system is a lightweight storage system that manages the working environment for Kaspa P2P File Storage. This specification defines a 47-column fixed format that is fully consistent with the implementation and clarifies the relationship with Kaspa File Format v3.4.3.

## Format Version
- **Current Version**: 3.1.4-fix2
- **Reference Implementation**: v6.2.31
- **.kaspa Compatible**: v3.4.3 compliant
- **Fixed Column Count**: 47 (including salt)

## Relationship with Kaspa File Format v3.4.3
- **Derived from .kaspa format**: 36 columns
- **KENV-specific additions**: 11 columns
- **Data format**: .kaspa (JSON) → KENV (CSV)

## File Structure

```
workspace/
├── workspace.kenv      # Configuration file (JSON, 1-10KB)
├── workspace.kindex    # Search index (JSON, 1-5MB @100k entries)
├── workspace.kentry    # Entry table (CSV streaming)
└── *.kaspa            # Individual metadata files
```

## 1. .kenv (Configuration File)

### Structure
```json
{
  "version": "3.1.4",
  "schemaVersion": 3,
  "kaspaCompatVersion": "3.4.3",
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
      "chunkSize": 22528,
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

## 2. .kindex (Index File)

### Structure
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
      "file": [],      // File line numbers
      "directory": []  // Directory line numbers
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

### Index Update Algorithm
1. **Incremental Update** (60-second interval)
   - Parse newly added entries
   - Update only affected indexes
   - Preserve existing index data

2. **Full Rebuild** (triggered by)
   - Significant deletions (>20% of entries)
   - Index corruption detected
   - Manual rebuild request

3. **Index Optimization**
   - Prefix search: First 3 characters hashed
   - Binary search on sorted arrays
   - Memory-efficient sparse arrays for filters

## 3. .kentry (Entry Table)

### CSV Format (47 columns)

#### Column List
```
id,type,version,created,network,name,path,metaTxId,metaTxBlockId,
firstChunkTxId,uploadDate,blockTime,uploadedBy,source,status,
fileSize,originalSize,compressedSize,mimeType,sha256,encrypted,
compressionAlgorithm,compressionEnabled,variableChunk,payloadSplit,
cid,totalChunks,chunkCount,chunkSize,segmentCount,totalFiles,
fileCount,directoryCount,entryCount,checksum,uploadCost,uploadDuration,
chunkStructureType,chunkLevel,totalGroups,passwordIncluded,password,
externalRef,tags,notes,authWarning,salt
```

#### Column Definitions

| # | Column Name | Source | Required | Type | Kaspa v3.4.3 JSON Path | Description |
|---|-------------|---------|----------|------|------------------------|-------------|
| 1 | id | KENV | Yes | string | - | UUID v4 |
| 2 | type | .kaspa | Yes | string | type | kaspa-file/kaspa-directory |
| 3 | version | .kaspa | Yes | string | version | Format version |
| 4 | created | .kaspa | Yes | string | created | ISO-8601 |
| 5 | network | .kaspa | Yes | string | network | testnet-10/mainnet |
| 6 | name | .kaspa | Yes | string | file.name/directory.name | File/folder name |
| 7 | path | KENV | No | string | - | Directory path |
| 8 | metaTxId | .kaspa | Yes | string | metadata.metaTxId | Meta transaction ID |
| 9 | metaTxBlockId | .kaspa | Yes | string | metadata.metaTxBlockId | Block ID |
| 10 | firstChunkTxId | .kaspa | No | string | chunks[0] | First chunk ID |
| 11 | uploadDate | .kaspa | Yes | string | metadata.uploadDate | ISO-8601 |
| 12 | blockTime | .kaspa | Yes | string | metadata.blockTime | ISO-8601 |
| 13 | uploadedBy | .kaspa | No | string | metadata.uploader | Wallet address |
| 14 | source | KENV | Yes | string | - | upload/download/manual |
| 15 | status | KENV | Yes | string | - | Status |
| 16 | fileSize | .kaspa | Yes | number | file.size | File size (bytes) |
| 17 | originalSize | .kaspa | No | number | file.compression.originalSize | Original size |
| 18 | compressedSize | .kaspa | No | number | file.compression.compressedSize | Compressed size |
| 19 | mimeType | .kaspa | No | string | file.mimeType | MIME type |
| 20 | sha256 | .kaspa | No | string | file.sha256 | SHA-256 hash |
| 21 | encrypted | .kaspa | Yes | boolean | file.encrypted | Encryption flag |
| 22 | compressionAlgorithm | .kaspa | No | string | file.compression.algorithm | Algorithm |
| 23 | compressionEnabled | .kaspa | No | boolean | file.compression.enabled | Compression flag |
| 24 | variableChunk | KENV | No | boolean | - | Variable chunk size |
| 25 | payloadSplit | .kaspa | No | boolean | metadata.payloadSplit | Payload split |
| 26 | cid | .kaspa | No | string | cid | Content ID |
| 27 | totalChunks | .kaspa | No | number | recovery.totalChunks | Total chunks |
| 28 | chunkCount | KENV | No | number | chunks.length | Chunk count |
| 29 | chunkSize | .kaspa | No | number | recovery.chunkSize | Chunk size |
| 30 | segmentCount | KENV | No | number | metadata.segmentBoundaries?.length | Segments |
| 31 | totalFiles | .kaspa | No | number | recovery.totalFiles | File count |
| 32 | fileCount | .kaspa | No | number | directory.fileCount | Direct files |
| 33 | directoryCount | .kaspa | No | number | directory.directoryCount | Subdirectories |
| 34 | entryCount | KENV | No | number | entries?.length | Entry count |
| 35 | checksum | .kaspa | No | string | recovery.checksum | Checksum |
| 36 | uploadCost | .kaspa | No | number | recovery.uploadCost | Cost (KAS) |
| 37 | uploadDuration | .kaspa | No | number | recovery.uploadDuration | Duration (ms) |
| 38 | chunkStructureType | .kaspa | No | string | chunkStructure.type | flat/single/super |
| 39 | chunkLevel | .kaspa | No | number | chunkStructure.level | Hierarchy level |
| 40 | totalGroups | .kaspa | No | number | chunkStructure.totalGroups | Group count |
| 41 | passwordIncluded | .kaspa | No | boolean | auth.passwordIncluded | Password flag |
| 42 | password | .kaspa | No | string | auth.password | Password (plaintext) |
| 43 | externalRef | KENV | No | string | - | External reference |
| 44 | tags | KENV | No | string | - | Comma-separated tags |
| 45 | notes | KENV | No | string | - | User notes |
| 46 | authWarning | .kaspa | No | string | auth.warning | Security warning |
| 47 | salt | .kaspa | Yes | string | encryption.pbkdf2.salt | Base64 salt |

### Special Values
- Empty strings: `""`
- Undefined/null: (empty, no quotes)
- Containing commas: Enclosed in quotes
- Containing quotes: Escaped as `""`

## 4. Implementation Details

### Streaming Processing
```javascript
class KenvStreamProcessor {
    async processLargeFile(filePath) {
        const CHUNK_SIZE = 65536; // 64KB chunks
        const stream = fs.createReadStream(filePath, {
            encoding: 'utf8',
            highWaterMark: CHUNK_SIZE
        });

        let buffer = '';
        for await (const chunk of stream) {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line

            for (const line of lines) {
                await this.processLine(line);
            }
        }
    }
}
```

### Index Build Strategy
```javascript
// Trigram index for fuzzy search
function buildTrigramIndex(text, lineNum) {
    const trigrams = [];
    for (let i = 0; i <= text.length - 3; i++) {
        trigrams.push(text.substr(i, 3).toLowerCase());
    }
    return trigrams;
}

// Binary search for sorted indexes
function binarySearch(arr, target) {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid][0] === target) return mid;
        if (arr[mid][0] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}
```

### Performance Optimization
1. **Lazy Loading**: Load only visible entries
2. **Virtual Scrolling**: Render only viewport items
3. **Debounced Search**: 300ms delay for typing
4. **Cached Computations**: Store derived values
5. **Incremental Updates**: Update only changed parts

## 5. Compatibility with Kaspa v3.4.3

### Data Type Mapping
| Kaspa JSON | KENV CSV | Notes |
|------------|----------|-------|
| Object | Multiple columns | Flattened structure |
| Array | Comma-separated | Strings only |
| Boolean | true/false | String representation |
| Number | Numeric string | Preserves precision |
| null/undefined | Empty field | No quotes |

### Migration Path
1. **v3.1.3 → v3.1.4**: No data migration required
2. **v3.1.4 → v3.1.4-fix2**: Salt column addition (auto-filled)

### Backward Compatibility
- Can read v3.1.3 and v3.1.4 formats
- Missing salt column auto-generated from metaTxId
- Preserves all Kaspa v3.4.3 metadata

## 6. Security Considerations

1. **Password Storage**: Plaintext passwords in CSV (warning displayed)
2. **Encryption**: Optional CSV encryption available
3. **Salt Management**: Required for decryption, stored separately
4. **Access Control**: File-system level permissions

## 7. Change History

### v3.1.4-fix2 (Current)
- Added salt column (47th column) for full implementation consistency
- Clarified Kaspa v3.4.3 compatibility
- Fixed column mapping documentation

### v3.1.4
- Expanded to 46 columns
- Added support for SuperMeta structure
- Improved index performance

### v3.1.3
- Initial 43-column format
- Basic KENV functionality

## 8. Implementation Notes

### Relationship with Kaspa v3.4.3
- All .kaspa file data preserved in CSV format
- Round-trip conversion without data loss
- Optimized for large dataset handling (100k+ entries)

### Known Limitations
1. CSV format limits complex nested structures
2. Large text fields may impact performance
3. Binary data requires Base64 encoding

### Best Practices
1. Regular index rebuilds for optimal performance
2. Backup before major operations
3. Use streaming for files >10MB
4. Enable CSV encryption for sensitive data

---

This specification ensures complete compatibility between KENV v3.1.4-fix2 and Kaspa File Format v3.4.3.