# メタトランザクション修正 - シンプルアプローチ

## 修正箇所：14769-14850行目

### 現在のコード（問題あり）
```javascript
// Upload meta-tx to blockchain
const utxoResponse = await NetworkState.rpcClient.getUtxosByAddresses([UserState.address.toString()]);
const entries = utxoResponse.entries || [];
// ...UTXO処理...
// ...トランザクション作成...
try {
    metaTxId = await pendingTx.submit(NetworkState.rpcClient);
} catch (error) {
    // WebSocket切断時の処理
}
```

### 修正後（通常チャンクと同じパターン）
```javascript
// Upload meta-tx to blockchain
let metaTxId = null;
let retries = 0;

while (retries < config.retryCount && !metaTxId) {
    try {
        // リトライごとにUTXO取得（接続確認を兼ねる）
        const utxoResponse = await NetworkState.rpcClient.getUtxosByAddresses([UserState.address.toString()]);
        const entries = utxoResponse.entries || [];
        
        if (!entries || entries.length === 0) {
            throw new Error('利用可能なUTXOがありません');
        }
        
        log(`${entries.length} UTXOs available for meta-tx`);
        
        // UTXOフォーマット処理
        const formattedUtxos = entries.map(utxo => ({
            address: UserState.address.toString(),
            outpoint: {
                transactionId: utxo.outpoint.transactionId,
                index: utxo.outpoint.index
            },
            scriptPublicKey: utxo.scriptPublicKey,
            amount: BigInt(utxo.amount),
            isCoinbase: utxo.isCoinbase || false,
            blockDaaScore: BigInt(utxo.blockDaaScore)
        }));
        
        // トランザクション作成
        const result = await NetworkState.kaspa.createTransactions({
            entries: formattedUtxos,
            outputs: [{
                address: UserState.address.toString(),
                amount: AppState.settings.transactionAmount
            }],
            changeAddress: UserState.address.toString(),
            priorityFee: 0n,
            networkId: config.network,
            payload: metaPayload
        });
        
        // Sign and submit
        const pendingTx = result.transactions[0];
        await pendingTx.sign([UserState.privateKey]);
        metaTxId = await pendingTx.submit(NetworkState.rpcClient);
        
        if (!metaTxId) {
            throw new Error('submit()がnullを返しました');
        }
        
        log(`Meta transaction sent: ${metaTxId}`, 'success');
        break;
        
    } catch (error) {
        retries++;
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        
        log(`メタTx送信エラー (試行 ${retries}/${config.retryCount}): ${errorMessage}`, 'error');
        
        if (retries >= config.retryCount) {
            throw error;
        }
        
        // 再接続を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

if (!metaTxId) {
    throw new Error('メタトランザクションの送信に失敗しました');
}
```

## なぜこれが動作するか

1. **UTXO取得 = 接続確認**
   - getUtxosByAddresses()が失敗 = RPC切断
   - 成功 = RPC接続済み

2. **リトライで自動回復**
   - ConnectionManagerが2秒後に再接続
   - 次のリトライでUTXO取得成功 → 送信も成功

3. **通常チャンクと同じ**
   - 実績のあるパターン
   - 新しい概念を導入しない

## 追加修正箇所

### SuperMeta中間メタ（15050-15150行）
同じパターンを適用

### SuperMeta最終（15300-15350行）
同じパターンを適用

## リスク
- コードの重複（でも既に通常チャンクも重複している）
- 後でリファクタリングすればいい

## テスト
1. 正常時の動作確認
2. WebSocket切断時の自動リトライ確認
3. 3回失敗時のエラー表示確認