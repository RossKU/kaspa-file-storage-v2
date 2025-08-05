// WebSocket通知が動作しない場合の回避策
// waitForConfirmation関数を置き換える

async function waitForConfirmationPolling(txid, timeout = 30000) {
    console.log(`[WORKAROUND] ポーリングモードでトランザクション確認: ${txid}`);
    
    const startTime = Date.now();
    const pollInterval = 100; // 0.1秒ごとにチェック
    
    while (Date.now() - startTime < timeout) {
        try {
            // トランザクションを直接確認
            const txInfo = await NetworkState.rpcClient.getTransaction({
                transactionId: txid,
                includeBlockInfo: true
            });
            
            if (txInfo && txInfo.block && txInfo.block.hash) {
                console.log(`[SUCCESS] トランザクション確認完了: ${(Date.now() - startTime)}ms`);
                return txInfo.block.hash;
            }
        } catch (e) {
            // トランザクションがまだ見つからない場合は継続
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`トランザクション確認タイムアウト: ${timeout}ms`);
}

// 既存のwaitForConfirmation関数を置き換え
window.waitForConfirmationOriginal = window.waitForConfirmation;
window.waitForConfirmation = waitForConfirmationPolling;

console.log('[WORKAROUND] WebSocket通知の代わりにポーリングモードを使用します');