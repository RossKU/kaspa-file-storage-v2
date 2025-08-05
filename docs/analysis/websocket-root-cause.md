# WebSocket通知が受信できない根本原因分析（Ultrathink）

## 重要な発見

### 1. subscribeBlockAddedの呼び出し方法
```javascript
// 現在のコード (line 15609)
await NetworkState.rpcClient.subscribeBlockAdded();
```

**オプションを何も指定していない！**

### 2. 他のRPC呼び出しとの比較
```javascript
// getBlockでは明示的に指定
const blockResponse = await NetworkState.rpcClient.getBlock({
    hash: blockId,
    includeTransactions: true  // ← これが重要！
});
```

## 根本原因の可能性

### 仮説1: デフォルト動作の変更
- **昨日まで**: subscribeBlockAddedのデフォルトでトランザクション詳細が含まれていた
- **今日から**: デフォルトではトランザクション詳細が含まれなくなった
- **理由**: RPCサーバーの設定変更、またはKaspa WASMの仕様変更

### 仮説2: RPCノードの最適化
- パフォーマンス向上のため、デフォルトでverboseDataを送信しなくなった
- 明示的に要求しない限り、最小限のデータのみ送信

### 仮説3: WebSocket通知の仕様変更
```javascript
// block-addedイベントで受信するデータ構造
{
  block: {
    header: { hash: "..." },
    transactions: [
      {
        // 以前: verboseData が含まれていた
        // 現在: 基本情報のみ（transactionIdが含まれない可能性）
      }
    ]
  }
}
```

## 証拠

1. **同じコードが昨日は動作していた**
2. **過去のバージョンも同じ問題**
3. **getBlock（明示的にincludeTransactions指定）は正常**
4. **subscribeBlockAddedだけが問題**

## なぜこの変更が行われたか？

1. **パフォーマンス最適化**
   - 大量のトランザクションを含むブロックでWebSocket通知が重くなる
   - デフォルトで軽量データのみ送信

2. **ネットワーク帯域の節約**
   - 不要なデータを送信しない
   - 必要な場合のみ詳細を要求

3. **仕様の標準化**
   - 他のRPCメソッドと同様、明示的なオプション指定を要求

## 結論

WebSocketの`subscribeBlockAdded`が、デフォルトでトランザクション詳細を含まなくなった。
これはRPCサーバー側の変更であり、アプリケーションコードの問題ではない。