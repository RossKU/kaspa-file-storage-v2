# Kaspa File Format Specification v3.4.3

## Overview

This is the standard file format specification for the distributed file storage system utilizing the Kaspa blockchain.

## Format Version

- **Current Version**: 3.4.3
- **Reference Implementation**: v6.2.78
- **Created**: 2025-07-07
- **Updated**: 2025-09-29

## Terminology

### Chunk
- Basic unit for encryption and transfer (22KB)
- Corresponds to one transaction on the blockchain
- Also referred to as payload

### Segment
- Processing unit for compression and decryption (1MB)
- Larger unit containing multiple chunks
- Enables efficient processing in payloadSplit mode

## File Type Definitions

### 1. File Type (`kaspa-file`)

```javascript
{
    // === Basic Information ===
    type: 'kaspa-file',              // [Required] File type identifier
    version: "3.4",                  // [Required] Format version
    created: "2025-01-07T12:34:56Z", // [Required] Creation date (ISO-8601 format)
    network: "testnet-10",           // [Required] Network identifier
    
    // === Encryption Information (Top Level) ===
    encryption: {                    // [Required] Encryption settings
        algorithm: "AES-256-GCM",    // [Required] Encryption algorithm
        pbkdf2: {                    // [Required] Key derivation settings
            salt: "base64-encoded-salt",     // [Required] Base64-encoded salt
            iterations: 100000              // [Required] PBKDF2 iteration count
        }
    },
    
    // === File Information ===
    file: {                          // [Required] File metadata
        name: "example.pdf",         // [Required] Original filename
        size: 12345678,              // [Required] File size (bytes)
        mimeType: "application/pdf", // [Required] MIME type
        sha256: "abc123...",         // [Required] SHA256 hash of entire file
        encrypted: true,             // [Required] Encryption flag
        compression: {               // [Required] Compression information
            algorithm: "none",       // [Required] Compression algorithm (none, lz77, etc.)
            enabled: false,          // [Required] Compression enabled flag
            originalSize: 12345678,  // [Required] Size before compression
            compressedSize: 12345678 // [Required] Size after compression
        }
    },
    
    // === Content Identifier (CID) ===
    cid: "Qf3nR8m2L1p4K9j7H6g5D4s3A2z1X0c9V8b7N6m5",  // [Optional] Content identifier (added in v3.3)
    
    // === Chunk Information (Flat Structure) ===
    chunks: [                        // [Required] Array of chunk transaction IDs
        "txid1234567890abcdef...",   // Note: .kaspa files always store all chunks
        "txid2345678901bcdef0...",   // No upper limit on chunk count (theoretically unlimited)
        // ...
    ],
    chunkBlockIds: [                 // [Required] Array of chunk block IDs
        "blockid1234567890abc...",   // Corresponds to chunks array in same order
        "blockid2345678901bcd...",
        // ...
    ],
    
    // === Chunk Hierarchy Information (Extended Feature) ===
    chunkStructure: {                // [Optional] Hierarchy structure for metadata transactions (auto-determined)
        type: "flat",                // [Required] Structure type (flat, single, super)
        
        // For type="single" (intermediate metadata)
        level: 1,                    // [Conditional] Hierarchy level
        groupIndex: 0,               // [Conditional] Group index
        totalGroups: 40,             // [Conditional] Total number of groups
        chunkRange: [0, 1],          // [Conditional] Managed chunk range
        
        // For type="super" (super metadata)
        level: 2,                    // [Conditional] Hierarchy level
        totalChunks: 8000,           // [Conditional] Total chunk count
        hierarchy: {                 // [Conditional] Hierarchy information
            chunksPerMeta: 2,        // Chunks per intermediate metadata
            metasPerSuper: 2         // Intermediate metadata per super metadata
        }
    },
    
    // === Recovery Information ===
    recovery: {                      // [Required] Information needed for recovery
        totalChunks: 123,            // [Required] Total chunk count
        chunkSize: 12288,            // [Required] Chunk size (bytes)
        checksum: "abc123...",       // [Required] Checksum (same as file.sha256)
        uploadCost: 0.02583,         // [Required] Upload cost (KAS)
        uploadDuration: 123456       // [Optional] Upload duration (milliseconds)
    },
    
    // === Metadata ===
    metadata: {                      // [Required] Blockchain-related information
        metaTxId: "meta_tx_id...",   // [Required] Meta transaction ID
        metaTxBlockId: "meta_blk...", // [Required] Meta transaction block ID
        uploadDate: "2025-01-07T12:34:56Z", // [Required] Upload date
        blockTime: "2025-01-07T12:34:57Z",  // [Required] Block confirmation time
        uploader: "kaspatest:qqk8...", // [Optional] Uploader address
        payloadSplit: false,          // [Optional] Payload split optimization flag
        segmentBoundaries: [          // [Optional] Segment (1MB compression unit) boundary information
            {
                index: 0,             // Segment index
                offset: 0,            // Offset position
                size: 12288,          // Size after encryption
                originalSize: 10000,  // Original size
                compressedSize: 8000, // Size after compression
                payloadIndex: 0       // Starting chunk (payload) index
            },
            // ...
        ]
    },
    
    // === Authentication Information ===
    auth: {                          // [Optional] Password protection information
        passwordIncluded: true,      // [Required] Password inclusion flag
        password: "plaintext-pass",  // [Conditional] Password (if passwordIncluded=true)
        warning: "Password is stored in plaintext. Share only with trusted parties." // [Recommended] Warning message
    },
    
    // === Extension Fields ===
    extensions: {                    // [Optional] For future extensions
        v4_5_6_compat: true,         // v4.5.6 compatibility flag
        custom: {}                   // Custom fields
    }
}
```

### 2. Directory Type (`kaspa-directory`)

```javascript
{
    // === Basic Information (Common with File) ===
    type: 'kaspa-directory',         // [Required] Directory type identifier
    version: "3.4",                  // [Required] Format version
    created: "2025-01-07T12:34:56Z", // [Required] Creation date
    network: "testnet-10",           // [Required] Network identifier
    
    // === Encryption Information (Common with File) ===
    encryption: {                    // [Required] Encryption settings
        algorithm: "AES-256-GCM",
        pbkdf2: {
            salt: "base64-encoded-salt",
            iterations: 100000
        }
    },
    
    // === Directory Information ===
    directory: {                     // [Required] Directory metadata
        name: "my_folder",           // [Required] Directory name
        totalSize: 123456789,        // [Required] Total size of all files
        fileCount: 10,               // [Required] Number of direct files
        directoryCount: 2            // [Optional] Number of direct subdirectories
    },
    
    // === Content Identifier (CID) ===
    cid: "D7k9L2m4N8p1Q5r3T6w0X9y2A4b7C1e5",  // [Optional] Directory identifier (added in v3.3)
    
    // === Entry Information ===
    entries: [                       // [Required] File/directory list
        {
            type: 'file',            // [Required] Entry type (file/directory)
            name: 'document.pdf',    // [Required] Filename
            path: 'folder1/folder2',     // [Required] Directory path (v3.4 change: excludes filename)
            size: 1234567,           // [Required] File size
            metaTxId: "file_meta...", // [Required] File meta TxID
            blockId: "file_block...", // [Required] File block ID
            password: "file_pass123", // [Optional] Individual password (added in v3.3)
            cid: "bafybeif8k2l9m3n7p4..." // [Optional] Complete file CID (null allowed)
        },
        {
            type: 'directory',       // [Required] Entry type (file/directory)
            name: 'subfolder',       // [Required] Subdirectory name
            path: 'parent',            // [Required] Parent directory path (v3.4 change: excludes directory name)
            size: 0,                 // [Required] Directory size (0 or total size)
            metaTxId: "dir_meta...", // [Conditional] Directory meta TxID (can be omitted for empty folders)
            blockId: "dir_block...", // [Conditional] Directory block ID (can be omitted for empty folders)
            password: null,          // [Optional] Individual password (added in v3.3, null for empty folders)
            cid: "bafybeigd1a2b3c4...",   // [Optional] Complete directory CID (null allowed)
            fileCount: 5,            // [Optional] Number of files in subdirectory
            totalSize: 5432100       // [Optional] Total size of subdirectory
        }
    ],
    
    // === Recovery Information ===
    recovery: {                      // [Required] Information needed for recovery
        totalFiles: 10,              // [Required] Total file count (recursive)
        totalSize: 123456789,        // [Required] Total size (recursive)
        uploadCost: 0.12345,         // [Required] Upload cost (KAS)
        uploadDuration: 234567       // [Optional] Upload duration (milliseconds)
    },
    
    // === Metadata (Common with File) ===
    metadata: {                      // [Required] Blockchain-related information
        metaTxId: "dir_meta_tx...",
        metaTxBlockId: "dir_meta_blk...",
        uploadDate: "2025-01-07T12:34:56Z",
        blockTime: "2025-01-07T12:34:57Z",
        payloadSplit: false,          // [Optional] Payload split optimization flag
        segmentBoundaries: []         // [Optional] Usually empty array for directories
    },
    
    // === Authentication Information (Common with File) ===
    auth: {                          // [Optional] Password protection information
        passwordIncluded: false,
        password: null,
        warning: null
    },
    
    // === Extension Fields ===
    extensions: {                    // [Optional] For future extensions
        v4_5_6_compat: true,
        custom: {}
    }
}
```

### 3. Progress File Type (`kaspa-file-progress`)

```javascript
{
    // === Basic Information (Same as .kaspa file) ===
    type: 'kaspa-file',              // [Required] File type identifier
    version: "3.4",                  // [Required] Format version
    created: "2025-01-07T12:34:56Z", // [Required] Creation date
    network: "testnet-10",           // [Required] Network identifier
    
    // === Encryption Information (Same as .kaspa file) ===
    encryption: {                    // [Required] Encryption settings
        algorithm: "AES-256-GCM",
        pbkdf2: {
            salt: "base64-encoded-salt",
            iterations: 100000
        }
    },
    
    // === File Information (Same as .kaspa file) ===
    file: {                          // [Required] File metadata
        name: "example.pdf",
        size: 12345678,
        mimeType: "application/pdf",
        sha256: "abc123...",
        encrypted: true,
        compression: {
            algorithm: "none",
            enabled: false,
            originalSize: 12345678,
            compressedSize: 12345678
        }
    },
    
    // === Content Identifier (CID) ===
    cid: "Qf3nR8m2L1p4K9j7H6g5D4s3A2z1X0c9V8b7N6m5",  // [Required] Set at upload start
    
    // === Chunk Information (Same as .kaspa file) ===
    chunks: [],                      // [Required] Array of uploaded chunk TxIDs
    chunkBlockIds: [],               // [Required] Array of uploaded chunk BlockIDs
    
    // === Recovery Information (Same as .kaspa file) ===
    recovery: {                      // [Required] Information needed for recovery
        totalChunks: 123,
        chunkSize: 12288,
        checksum: "abc123...",
        uploadCost: 0.02583,
        uploadDuration: null         // Not finalized as upload is in progress
    },
    
    // === Metadata (Same as .kaspa file) ===
    metadata: {                      // [Required] Blockchain-related information
        metaTxId: "",                // Empty as incomplete
        metaTxBlockId: "",           // Empty as incomplete
        uploadDate: "2025-01-07T12:34:56Z",
        blockTime: "",               // Empty as incomplete
        payloadSplit: false,
        segmentBoundaries: []
    },
    
    // === Progress Information (.kprogress file specific) ===
    _progress: {                     // [Required] Upload progress information
        cid: "Qf3nR8m2",             // [Required] Display format of above CID (8 characters)
        completedChunks: 45,         // [Required] Number of completed chunks
        startedAt: 1704628496000,    // [Required] Start time (milliseconds)
        lastUpdateAt: 1704628596000, // [Required] Last update time (milliseconds)
        estimatedCompletion: null,   // [Optional] Estimated completion time
        resume: {                    // [Required] Resume information
            nextChunkIndex: 45,      // [Required] Next chunk index to upload
            failedChunks: [],        // [Required] Array of failed chunk indices
            retryCount: {}           // [Required] Retry count for each chunk
        },
        chunkDetails: [              // [Required] Details of completed chunks
            {
                index: 0,            // [Required] Chunk index
                txid: "txid123...",  // [Required] Transaction ID
                blockId: "blk123...", // [Optional] Block ID (after confirmation)
                size: 12288,         // [Required] Chunk size
                uploadedAt: 1704628500000, // [Required] Upload time
                confirmed: true      // [Required] Block confirmation flag
            },
            // ...
        ],
        // v3.4.3: SuperMeta progress tracking
        intermediateMetaTxs: []     // [Optional] Array of intermediate meta transactions
    }
}
```

## Field Definition Details

### Required Fields

1. **type**: File type identifier
   - `kaspa-file`: Single file
   - `kaspa-directory`: Directory

2. **version**: Format version (current: "3.4")

3. **created**: Creation date (ISO-8601 format)

4. **network**: Network identifier
   - `testnet-10`: Testnet
   - `mainnet`: Mainnet

5. **encryption**: Encryption settings (required structure)

6. **recovery**: Recovery information (required for v4.3.2 compatibility)

### MetaTxID Format (v3.3 Extension)

MetaTxID supports the following formats:

1. **TxID-only format**
   - Example: `d3b8e5c4f2a1b9c7e8d6f4a2b3c5e7d9f1a3b5c7e9d2f4a6b8c1e3d5f7a9b2c4`
   - Requires REST API to resolve BlockID

2. **TxID:BlockID format** (Recommended)
   - Example: `d3b8e5c4f2a1b9c7e8d6f4a2b3c5e7d9f1a3b5c7e9d2f4a6b8c1e3d5f7a9b2c4:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2`
   - Contains BlockID, enabling direct blockchain retrieval
   - Fast without REST API

3. **TxID:BlockID:Password format** (Legacy)
   - Example: `d3b8e5c4f2a1b9c7e8d6f4a2b3c5e7d9f1a3b5c7e9d2f4a6b8c1e3d5f7a9b2c4:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2:mypassword123`
   - Format including password (not recommended for security)
   - Supported for backward compatibility

### Optional Fields

1. **chunkStructure**: Metadata transaction structure information
   - **Note**: In `.kaspa files`, all chunks are stored in the `chunks` array
   - This field indicates the hierarchical structure of metadata transactions
   
   **Structure Types**:
   - `type: "flat"`: Normal flat structure (1-160 chunks)
   - `type: "single"`: Intermediate metadata (part of hierarchical structure)
   - `type: "super"`: Super metadata (161-25,600 chunks)
   
   **Automatic Switching Specification** (Metadata Transactions):
   - 1-160 chunks: `type: "flat"`
   - 161-25,600 chunks: `type: "super"` (intermediate metadata every 160 chunks)
   - 25,601+ chunks: No metadata transaction created

2. **auth**: Password protection (security option)

3. **extensions**: For future extensions

4. **metadata.payloadSplit**: Payload split optimization flag (added in v3.3)
   - true: Payload split enabled
   - false: Normal chunk splitting

5. **metadata.segmentBoundaries**: Segment boundary information (added in v3.3)
   - Records boundary information for each segment (1MB compression unit)
   - Maintains actual size after encryption
   - Used for efficient decryption in payloadSplit mode

6. **_progress**: Progress information (.kprogress file specific)
   - Used for tracking and resuming upload progress
   - Converted to .kaspa file upon completion

7. **cid**: Content Identifier (added in v3.3)
   - Unique identifier for file or directory
   - Generation methods:
     - **Random mode**: 8-character random string (a-z0-9)
     - **File deterministic mode**: SHA-256 hash of first 4KB + file size (Base64 URL-safe)
     - **Directory deterministic mode**: See calculation logic below
   - Formats:
     - **full**: Complete 43-character hash (for metadata)
     - **display**: First 8 characters (for filenames)
   - Purpose:
     - Unique identification of files/directories
     - Association with progress files (.kprogress)
     - Upload history management
   
   **Directory CID Calculation Logic**:
   ```
   1. Extract (metaTxId, directory path) pairs from all entries
   2. Remove filename from path (use directory path only)
   3. Sort by "metaTxId:directory path" (lexicographic, case-sensitive)
   4. Remove duplicates (same file in same directory counted once)
   5. Join with newline character (\n)
   6. UTF-8 encode
   7. Calculate SHA-256 hash
   8. Base64 URL-safe encode (+→-, /→_, remove =)
   ```
   
   Example:
   ```
   entries = [
       { metaTxId: "abc123...", path: "folder2/file2.pdf" },
       { metaTxId: "def456...", path: "folder1/file1.doc" },
       { metaTxId: "abc123...", path: "backup/file2.pdf" }  // Same file in different directory
   ]
   ↓ Extract directory paths
   [
       { metaTxId: "abc123...", dir: "folder2" },
       { metaTxId: "def456...", dir: "folder1" },
       { metaTxId: "abc123...", dir: "backup" }
   ]
   ↓ Sort & remove duplicates
   "abc123...:backup\nabc123...:folder2\ndef456...:folder1"
   ↓ SHA-256 → Base64
   "Qm1234567890abcdef..."
   ```
   
   This method achieves deterministic CID invariant to filename changes
   
   **Empty Folder Handling**:
   - Directory entries (type: "directory") are processed similarly
   - If metaTxId is undefined, treat as "null"
   - Example: "null:folder3/subfolder"

## Compatibility

### Backward Compatibility

- Can read v3.0 (v4.3.2) format
- Maintains `recovery` section
- All existing fields preserved

### Forward Compatibility

- Future extensions supported via `extensions` field
- Unknown fields ignored (no error)

## Chunk Count and File Size Guidelines

Default chunk size: 22,528 bytes (22KB)

### Limitations by Metadata Transaction Format

| File Size | Chunk Count | Structure Type | Description |
|------------|----------|----------|------|
| ~3.5MB | 1-160 | flat | Normal metadata |
| 3.5MB~560MB | 161-25,600 | super | Super metadata (automatic) |
| 560MB+ | 25,601+ | none | No metadata Tx creation |

### .kaspa File (Local) Limitations

| Chunk Count | Limit | Description |
|-----------|------|------|
| Any | None | Theoretically unlimited (up to JavaScript array limit) |

**Note**: The 25,600 chunk limit is not a limitation of the Kaspa blockchain itself, but a limitation of this file storage system's hierarchical metadata format design.

**Important Differences**:
- `.kaspa files`: No chunk count limit, always store all chunks in flat `chunks` array
- `Metadata transactions`: Support up to 25,600 chunks by this system's format design, use hierarchical structure for 161+ chunks
- For 25,601+ chunks, `.kaspa files` can be generated but metadata transactions are not created

*If compression is enabled, actual file size may be larger

## Security Considerations

1. **Password Protection**
   - Passwords stored in plaintext (with warning)
   - Recommended to share only with trusted parties

2. **Encryption**
   - Uses AES-256-GCM
   - 100,000 iterations with PBKDF2

3. **Hash Verification**
   - File integrity check with SHA-256

## Implementation Guidelines

1. **Required Field Validation**
   - Verify presence of all required fields
   - Validate data types

2. **Version Handling**
   - Ensure interoperability between 3.0, 3.1, 3.1.1, 3.3
   - Prepare for future version upgrades

3. **Error Handling**
   - Ignore unknown fields
   - Missing required fields cause error

4. **Path Field Handling (v3.1.1)**
   - Path field is optional (maintaining backward compatibility)
   - Process with name only if path doesn't exist
   - Prioritize path when restoring directory structure
   - Always include path field when creating new

5. **.kprogress File Processing (v3.3)**
   - Identify .kaspa vs .kprogress by presence of _progress section
   - Remove _progress section and convert to .kaspa upon upload completion
   - Use _progress.resume information when resuming

6. **Segment-based Processing (v3.3)**
   - Use segmentBoundaries information when payloadSplit is true
   - Consider actual size and offset of each segment (1MB compression unit) for decryption

7. **Hierarchical Metadata Processing**
   - Automatically determine structure based on chunk count
   - 1-160 chunks: Normal flat structure, record all chunks directly in metadata
   - 161-25,600 chunks:
     - Generate intermediate metadata (type="single") every 160 chunks
     - Manage all intermediate metadata with super metadata (type="super")
     - Maximum 160 intermediate metadata × 160 chunks = 25,600 chunks supported
   - When downloading, traverse hierarchy to collect all chunk information

8. **.kaspa File and Metadata Transaction Separation**
   - `.kaspa files` always store all chunks in `chunks` array (no upper limit)
   - Metadata transactions support up to 25,600 chunks by this system's hierarchical structure design
   - For 25,601+ chunks, generate local file only after warning display

9. **CID Placement Rules in Hierarchical Structure**
   - **Normal structure (1-160 chunks)**:
     - `.kaspa file`: CID field at root level
     - Metadata transaction: CID field at root level as well
   - **Hierarchical structure (161-25,600 chunks)**:
     - `.kaspa file`: CID field at root level (always the same)
     - Super metadata: CID field at root level (identifies entire file)
     - Intermediate metadata: No CID field (manages chunk groups only)
   - **Design reason**: CID is an identifier for the entire file, included only in metadata representing the entire file

10. **Directory Entry Processing (v3.3)**
    - **File entries**:
      - metaTxId, blockId are required
      - Individual password can be set via password field
      - If password is omitted, use directory-wide password
    - **Directory entries (empty folders)**:
      - metaTxId, blockId can be omitted (null or undefined)
      - Set size to 0
      - Create as empty directory when downloading
    - **Password management**:
      - Individual file passwords managed by entry.password
      - Use individual password for decryption when downloading

11. **Directory Entry Optimization (v3.4.2)**
    - **Intermediate Directory Omission**:
      - Directory entries with null metaTxId and child elements can be omitted
      - Automatically restore hierarchical structure from paths
      - Reduce metadata size (addressing 20KB limit)
    - **Directory Entries to Retain**:
      - Directories with metaTxId/blockId (directories with actual metadata)
      - Empty directories without child elements (explicitly created empty folders)
    - **Read-time Processing**:
      - Auto-generate intermediate directories from paths
      - Maintain backward compatibility with existing implementations
    - **Recommended Implementation**:
      - Display all directories in UI (maintain usability)
      - Apply optimization only during export/upload

## File Naming Convention

### .kaspa Files
```
{original_filename}.{CID}.kaspa
Example: document.pdf.abc12345.kaspa
         image.png.xyz98765.kaspa
```

### .kprogress Files
```
{original_filename}.{CID}.kprogress
Example: document.pdf.abc12345.kprogress
```

### CID Part
- **display format**: 8 characters (used in filenames)
- **full format**: 43 characters (stored in metadata)

## Known Issues (Implementation Inconsistencies)

### 1. CID Field in Super Metadata
- **Issue**: Current implementation doesn't include CID field in super metadata
- **Expected behavior**: Super metadata should include CID field as it represents the entire file
- **Impact**: Cannot identify by CID when restoring file from metadata transaction
- **Workaround**: No impact on restoration from local files as .kaspa files always contain CID

### 2. Directory Type Inconsistencies
- **Version inconsistency**: Implementation hardcodes version: '3.1.1', documentation specifies v3.3
- **Missing CID field**: Directory metadata doesn't include CID
- **CID calculation logic**: DirectoryManager uses old method (hash of entire JSON), new method (metaTxId:path) not implemented
- **Incomplete metadata field**: Implementation lacks payloadSplit and segmentBoundaries fields (v3.3)
- **Individual password management**: Password field in entries not implemented

## Change History

### v3.4.3 (2025-09-29)
- **SuperMeta Progress Tracking**: Added intermediateMetaTxs field to _progress
- **Implementation Update**: Reference implementation updated to v6.2.78
- **Progress Resume Enhancement**: Support for resuming SuperMeta uploads with existing intermediate meta-txs

### v3.4.2 (2025-07-25)
- **Directory Entry Optimization**: Allow omission of intermediate directory entries
  - Directories with null metaTxId and child elements can be omitted
  - Reduce metadata size (addressing 20KB limit)
  - Retain empty directories and directories with TxID
  - Maintain backward compatibility (auto-restore when reading)

### v3.4.1 (2025-07-25)
- **CID Field Specification Relaxation**: Made entry CID field optional (null allowed)
  - Allow null when CID cannot be generated for implementation consistency
  - Maintain backward compatibility with existing v3.4 implementations

### v3.4 (2025-07-24)
- **Path Field Specification Change**: Entry path contains directory path only (excludes filename/directory name)
  - Example: `path: 'folder1/folder2/document.pdf'` → `path: 'folder1/folder2'`
  - Empty string for root directory: `path: ''`
- **CID Field Format Unification**: Complete CID format recommended (null allowed)
  - Example: `cid: "F8k2L9m3N7p4..."` → `cid: "bafybeif8k2l9m3n7p4..."` or `null`
- **Recommended Field Order**: Recommend placing path first for logical grouping

### v3.3 (2025-07-21)
- Introduction of segmentBoundaries field
- Support for payloadSplit mode
- Addition of individual file password feature

### v3.1.1 (2025-07-07)
- Initial implementation of directory support
- Addition of path field (full path format)

---

This specification was established as the standard format for the Kaspa File Storage project.