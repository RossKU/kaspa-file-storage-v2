#!/bin/bash
# Rusty Kaspaから公式WASM/JSファイルを取得

echo "🔍 Rusty Kaspa公式リポジトリから最新のWASMファイルを取得..."

# バックアップ作成
if [ -f "kaspa-core.js" ]; then
    mv kaspa-core.js kaspa-core.js.backup.$(date +%Y%m%d-%H%M%S)
fi
if [ -f "kaspa-core_bg.wasm" ]; then
    mv kaspa-core_bg.wasm kaspa-core_bg.wasm.backup.$(date +%Y%m%d-%H%M%S)
fi

# Rusty Kaspaの公式リリースから取得
# Option 1: 最新リリースから
echo "Option 1: GitHubリリースから取得"
echo "https://github.com/kaspanet/rusty-kaspa/releases"

# Option 2: npmパッケージから
echo -e "\nOption 2: npm経由で取得（推奨）"
echo "npm install @kaspa/core-lib"

# Option 3: 直接ダウンロード（CDN経由）
echo -e "\nOption 3: 直接ダウンロード"
echo "最新安定版:"
curl -L -o kaspa-core.js "https://unpkg.com/@kaspa/core-lib@latest/kaspa-core.js"
curl -L -o kaspa-core_bg.wasm "https://unpkg.com/@kaspa/core-lib@latest/kaspa-core_bg.wasm"

# サイズ確認
echo -e "\n📊 ダウンロードしたファイル:"
ls -lah kaspa-core*

echo -e "\n✅ 完了！ブラウザをリロードしてテストしてください。"