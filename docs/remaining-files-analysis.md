# 残存ファイル分析と整理計画（Ultrathink）

## 現在のルートディレクトリ（23ファイル）

### 1. 必須ファイル（残す）✅
- `index.html` - メインアプリケーション
- `kaspa-core.js` - WASMローダー（必須）
- `kaspa-core_bg.wasm` - WASMバイナリ（必須）
- `README.md` - プロジェクト説明
- `.gitignore` - Git設定

### 2. 動作中の機能ファイル（残す）🔧
- `mainnet-resolver-rolling-v29.html` - メインネット用アーカイブノード探索（最新版）
- `testnet-resolver-rolling-v29.html` - テストネット用アーカイブノード探索（最新版）

### 3. セッションログ（移動対象）📝
- `2025-07-19-this-session-is-being-continued-from-a-previous-co.txt`
- `2025-07-20-this-session-is-being-continued-from-a-previous-co.txt`
- `2025-07-31-2025-07-31-this-session-is-being-continued-from-a.txt`
- `2025-07-31-storageemulated0downloadclaudeclikaspa-file.txt`
- `2025-07-31-this-session-is-being-continued-from-a-previous-co.txt`
→ **docs/analysis/** へ移動

### 4. バックアップファイル（移動対象）💾
- `kaspa-core.js.backup`
- `kaspa-core_bg.wasm.backup`
→ **archive/backup/** へ移動

### 5. カラーパレット関連（移動対象）🎨
- `color-palette.html`
- `color-palette-v5.11.51.html`
- `color-palette-v5.11.52.html`
- `color-palette-v5.11.53-final.html`
→ **tests/debug/** へ移動（開発ツール）

### 6. 古いバージョンファイル（移動対象）📦
- `index.v5.11.48.html`
- `index-v5.11.68-from-github.html`
- `mainnet-resolver-rolling-v3.html` （古いバージョン）
→ **archive/html/** へ移動

### 7. その他のファイル（判断必要）❓
- `.github_trigger` - GitHub Actions関連？
- `repository-cleanup-status.txt` - 今回作成した状況ファイル

## 推奨アクション

### Phase 1: 明確な移動対象（14ファイル）
1. セッションログ 5ファイル → docs/analysis/
2. バックアップ 2ファイル → archive/backup/
3. カラーパレット 4ファイル → tests/debug/
4. 古いバージョン 3ファイル → archive/html/

### Phase 2: 判断が必要なファイル（2ファイル）
1. `.github_trigger` - 内容確認後、必要なら残す
2. `repository-cleanup-status.txt` - docs/ へ移動

### 最終的なルートディレクトリ（理想：7ファイル）
1. index.html
2. kaspa-core.js
3. kaspa-core_bg.wasm
4. README.md
5. .gitignore
6. mainnet-resolver-rolling-v29.html
7. testnet-resolver-rolling-v29.html

## 実装の優先順位
1. **高**: セッションログの移動（プライバシー）
2. **中**: バックアップ・古いバージョンの移動
3. **低**: カラーパレット等の開発ツール移動