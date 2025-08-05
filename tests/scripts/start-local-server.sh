#!/bin/bash
# ローカルサーバー起動スクリプト

PORT=8080
echo "🚀 ローカルサーバーを起動中..."
echo "ポート: $PORT"
echo ""

# IPアドレスを取得
IP=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
if [ -z "$IP" ]; then
    IP=$(ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1)
fi

echo "📱 アクセス可能なURL:"
echo "  http://localhost:$PORT"
echo "  http://127.0.0.1:$PORT"
if [ ! -z "$IP" ]; then
    echo "  http://$IP:$PORT (同じネットワーク内から)"
fi
echo ""
echo "停止するには Ctrl+C を押してください"
echo "=========================================="
echo ""

# Python HTTPサーバーを起動
cd /storage/emulated/0/Download/ClaudeCLI/kaspa-file-storage-v2
python3 -m http.server $PORT --bind 0.0.0.0