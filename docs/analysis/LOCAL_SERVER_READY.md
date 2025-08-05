# 🚀 ローカルサーバー起動完了！

## アクセス方法

ローカルサーバーは既に起動しています（ポート8080）。

### 📱 Termux内のブラウザから
```
http://localhost:8080
http://127.0.0.1:8080
```

### 🖥️ 同じデバイスの他のブラウザから
上記と同じURLでアクセス可能です。

### 📂 利用可能なファイル

1. **メインアプリ**: http://localhost:8080/index.html
2. **ローカルテスト**: http://localhost:8080/local-test.html
3. **各種診断ツール**:
   - http://localhost:8080/rpc-core-analysis.html
   - http://localhost:8080/submit-transaction-diagnosis.html
   - http://localhost:8080/simple-rpc-test.html
   - http://localhost:8080/rpc-usage-pattern-analysis.html

## 🔍 速度比較テスト

1. まず http://localhost:8080/local-test.html を開く
2. 「速度テスト開始」ボタンをクリック
3. GitHub Pagesとの速度差を確認

## ⚡ 期待される結果

ローカルサーバーからアクセスすることで：
- WASM読み込みが高速化
- RPC接続制限が回避される
- 全体的なパフォーマンスが改善

## 🛑 サーバーの停止

```bash
# プロセスを確認
ps aux | grep http.server

# 停止（PID: 14902）
kill 14902
```

## 📝 注意事項

- ローカルサーバーはTermuxが起動している間のみ有効
- 外部ネットワークからはアクセス不可（セキュリティ上安全）
- ファイルを編集した場合はブラウザをリロード

---

**重要**: ローカルサーバーで速度が改善された場合、GitHub Pages/ドメインがRPC側で制限されていることが確定します。