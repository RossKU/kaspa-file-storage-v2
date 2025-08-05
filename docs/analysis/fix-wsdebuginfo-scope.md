# WSDebugInfo スコープエラー修正案

## 問題
WSDebugInfoがmodule script内で定義されているため、グローバルスコープからアクセスできない

## 修正方法

### オプション1: windowオブジェクトに公開（推奨）
```javascript
// WSDebugInfo定義の後に追加
window.WSDebugInfo = WSDebugInfo;
```

### オプション2: グローバル変数として定義
```javascript
// module scriptの外（通常のscriptタグ内）で定義
<script>
    window.WSDebugInfo = {
        enabled: false,
        blockCount: 0,
        // ... 他のプロパティ
    };
</script>
```

### オプション3: AppStateに統合
```javascript
AppState.wsDebug = {
    info: {
        enabled: false,
        blockCount: 0,
        // ... 他のプロパティ
    }
};
```

## 推奨される修正

最も簡単で影響が少ない方法は、WSDebugInfoをwindowオブジェクトに公開することです。

index.htmlの2440行目付近（WSDebugInfo定義の後）に追加：
```javascript
// WSDebugInfoをグローバルに公開
window.WSDebugInfo = WSDebugInfo;
```

## テスト手順
1. 修正を適用
2. ローカルでテスト
3. エラーが発生しないことを確認
4. デバッグ機能が正常動作することを確認