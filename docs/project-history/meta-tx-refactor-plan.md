# メタトランザクション リファクタリング計画

## Phase 1: 共通送信関数の作成
**優先度：最高**
```javascript
async function sendTransactionWithRetry(pendingTx, txType = 'transaction') {
    let txid = null;
    let retries = 0;
    const maxRetries = config.retryCount || 3;
    
    while (retries < maxRetries && !txid) {
        try {
            // 接続確認（UTXO取得で暗黙的に確認）
            const { entries } = await NetworkState.rpcClient.getUtxosByAddresses([UserState.address.toString()]);
            if (!entries || entries.length === 0) {
                throw new Error('No UTXOs available');
            }
            
            // トランザクション送信
            txid = await pendingTx.submit(NetworkState.rpcClient);
            
            if (!txid) {
                throw new Error('Transaction submission returned null');
            }
            
            log(`[${txType}] Successfully sent: ${txid.substring(0, 16)}...`, 'success');
            return txid;
            
        } catch (error) {
            retries++;
            const errorMsg = error?.message || error?.toString() || 'Unknown error';
            
            // WebSocket切断は特別扱い
            if (errorMsg.includes('WebSocket') || errorMsg.includes('disconnected')) {
                log(`[${txType}] WebSocket disconnected (attempt ${retries}/${maxRetries})`, 'warning');
                
                // ConnectionManagerの再接続を待つ
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            
            // その他のエラー
            log(`[${txType}] Error (attempt ${retries}/${maxRetries}): ${errorMsg}`, 'error');
            
            if (retries >= maxRetries) {
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    throw new Error(`Failed to send ${txType} after ${maxRetries} attempts`);
}
```

## Phase 2: 通常メタTx修正
**場所**: 14830-14850行目
```javascript
// Before: 
try {
    metaTxId = await pendingTx.submit(NetworkState.rpcClient);
} catch (error) {
    // エラー処理...
}

// After:
metaTxId = await sendTransactionWithRetry(pendingTx, 'meta-transaction');
```

## Phase 3: SuperMeta中間メタ修正
**場所**: 15134-15150行目
```javascript
// Before:
try {
    metaTxId = await pendingTx.submit(NetworkState.rpcClient);
} catch (error) {
    throw error;
}

// After:
metaTxId = await sendTransactionWithRetry(pendingTx, `intermediate-meta-${groupIndex}`);
```

## Phase 4: SuperMeta最終メタ修正
**場所**: 15329行目
```javascript
// Before:
const superMetaTxId = await pendingTx.submit(NetworkState.rpcClient);

// After:
const superMetaTxId = await sendTransactionWithRetry(pendingTx, 'super-meta');
```

## Phase 5: BlockID待機の統一
**新関数作成**:
```javascript
async function waitForBlockIdWithFallback(txid, txType = 'transaction') {
    let blockId = null;
    let waitTime = 0;
    const maxWaitTime = config.timeout || 300000;
    
    log(`[${txType}] Waiting for BlockID...`);
    
    while (!blockId && waitTime < maxWaitTime) {
        // WebSocket監視チェック
        if (NetworkState.ws.monitoredTransactions.has(txid)) {
            const monitorData = NetworkState.ws.monitoredTransactions.get(txid);
            if (monitorData.blockId) {
                blockId = monitorData.blockId;
                log(`[${txType}] BlockID from WebSocket: ${blockId.substring(0, 16)}...`, 'success');
                break;
            }
        }
        
        // REST APIフォールバック（10秒後）
        if (waitTime >= config.restApiWaitTime && NetworkState.restApiControl.globalEnabled) {
            try {
                const apiUrl = `${config.apiEndpoints[config.network]}/transactions/${txid}`;
                const response = await fetch(apiUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.block_id) {
                        blockId = data.block_id;
                        log(`[${txType}] BlockID from REST API: ${blockId.substring(0, 16)}...`, 'success');
                        break;
                    }
                }
            } catch (err) {
                // 無視して継続
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        waitTime += 500;
    }
    
    if (!blockId) {
        log(`[${txType}] BlockID timeout - saving with TxID only`, 'warning');
    }
    
    return blockId;
}
```

## Phase 6: 通常チャンクもリファクタリング（オプション）
通常チャンクも同じ関数を使うように統一。

## テスト計画
1. 通常接続時の動作確認
2. WebSocket切断時の自動リトライ確認
3. REST APIフォールバック確認
4. エラーメッセージの一貫性確認

## リスク評価
- **低リスク**: 既存のロジックを関数化するだけ
- **中リスク**: リトライタイミングの調整が必要
- **要注意**: ConnectionManagerとの協調動作

## 実装順序
1. Phase 1: 共通関数作成（まず追加のみ）
2. Phase 2: 通常メタTxで動作確認
3. Phase 3-4: SuperMeta修正
4. Phase 5: BlockID待機統一
5. Phase 6: 全体最適化（オプション）