# Kaspa File Storage v2

A decentralized file storage system built on the Kaspa blockchain, enabling permanent file storage using transaction payloads.

## 🚀 Live Demo

Visit: https://rossku.github.io/kaspa-file-storage-v2/

## ✨ Features

- 📤 Upload files of any size to Kaspa blockchain
- 🔐 Military-grade AES-256-GCM encryption
- 📥 Download files using .kaspa metadata files
- ⚡ Parallel downloads (1.2 MB/s)
- 🔄 Auto-resume for interrupted transfers
- ⚛️ TxID mining for searchability (43,295 H/s)
- 📦 Meta-transactions for efficient chunk management

## 🛠️ Technology Stack

- Pure HTML/JavaScript (no build process)
- Kaspa WASM SDK
- Web Workers for performance
- IndexedDB for progress tracking

## 🚀 Getting Started

### Online Usage
1. Visit https://rossku.github.io/kaspa-file-storage-v2/
2. Import your wallet or generate a new one
3. Start uploading files!

### Local Development
```bash
# Clone the repository
git clone https://github.com/RossKU/kaspa-file-storage-v2.git

# Navigate to the project
cd kaspa-file-storage-v2

# Start a local server
python -m http.server 8000

# Open in browser
# http://localhost:8000
```

## 📖 Documentation

See the [docs](./docs) folder for detailed documentation:
- [Technical Notes](./docs/TECHNICAL_NOTES.md)
- [Project Status](./docs/kaspa-file-storage/overview/PROJECT_STATUS.md)
- [Development Progress](./docs/kaspa-file-storage/overview/DEVELOPMENT_PROGRESS.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Kaspa Development Team
- Contributors to rusty-kaspa
- Community testers and feedback providers