# Kaspa File Storage v2

A decentralized file storage system built on the Kaspa blockchain, enabling permanent file storage using transaction payloads.

## 🚀 Features

- **Unlimited File Size**: Support for files from bytes to 100GB+
- **Military-Grade Encryption**: AES-256-GCM with PBKDF2 key derivation
- **High-Speed Transfer**: 100 chunks/second parallel download capability
- **P2P File Sharing**: Share files using .kaspa metadata files
- **Auto-Resume**: Automatic recovery for interrupted transfers
- **Cost Efficient**: ~1.7 KAS per GB on testnet

## 🛠️ Quick Start

1. Open `src/index.html` in your browser
2. Connect to Kaspa testnet-10
3. Upload files or download using .kaspa metadata

## 📁 Project Structure

```
kaspa-file-storage-v2/
├── src/
│   ├── index.html          # Main application
│   ├── kaspa-core.js       # Kaspa WASM SDK
│   ├── kaspa-core_bg.wasm  # WASM binary
│   └── txid-miner-worker.js # TxID mining worker
├── docs/
│   └── README.md           # This file
└── tests/                  # Test files (coming soon)
```

## 🔧 Technical Specifications

- **Network**: Kaspa Testnet-10 / Mainnet
- **Chunk Size**: 12KB (optimized)
- **Encryption**: AES-256-GCM
- **Parallel Downloads**: 8 concurrent connections
- **TxID Mining**: 43,295 H/s (Web Workers)

## 📊 Performance

| Operation | Speed | Notes |
|-----------|-------|-------|
| Upload | 6 KB/s | Sequential processing |
| Download | 1.2 MB/s | 8-way parallel |
| TxID Mining | 43,295 H/s | Pattern matching |

## 🔐 Security

- All files are encrypted before upload
- Password-protected .kaspa files
- Optional password embedding for trusted sharing
- Unique IV per chunk

## 🌐 Demo

**Testnet Address**: `kaspatest:qqk8m83ypfr4yg0ykaszpwjfm86c9vf22jgfg0jpc39h2k80nx8rxrumw8zpd`

## 📝 Version History

- **v4.5.6** - Current stable version
- **v4.3.0** - Unified .kaspa structure
- **v3.6.0** - Parallel downloads implementation
- **v3.0.0** - P2P file sharing system

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Kaspa Development Team for the WASM SDK
- Contributors to the rusty-kaspa project
- Community testers and feedback providers

---

**Note**: This is a testnet application. Use appropriate caution when deploying to mainnet.