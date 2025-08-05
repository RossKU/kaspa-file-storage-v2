// index.htmlの waitForConfirmation を即座に修正するパッチ
// このスクリプトをindex.htmlの最後に追加してください

(function() {
    // 元のwaitForConfirmation関数を保存
    const originalWaitForConfirmation = window.waitForConfirmation;
    
    // 修正版のwaitForConfirmation
    window.waitForConfirmation = async function(txid) {
        console.log(`[FIX] waitForConfirmation修正版開始 - TxID: ${txid.substring(0, 16)}...`);
        
        let blockId = null;
        let waitTime = 0;
        const maxWaitTime = 30000;
        const pollInterval = 500; // 0.5秒ごとにチェック
        
        // 初回の待機時間を短縮（2秒→0.5秒）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        while (!blockId && waitTime < maxWaitTime) {
            // ネットワーク接続チェック
            if (!ConnectionManager.isConnected || !NetworkState.ws.connected) {
                console.log(`[FIX] ネットワーク切断を検出`);
                throw new Error('Network disconnected while waiting for BlockID');
            }
            
            // WebSocketモニターチェック（高速）
            if (NetworkState.ws.monitorActive && NetworkState.ws.monitoredTransactions?.has(txid)) {
                const monitorData = NetworkState.ws.monitoredTransactions.get(txid);
                if (monitorData.blockId) {
                    blockId = monitorData.blockId;
                    console.log(`[FIX] WebSocket経由でBlockID取得: ${blockId.substring(0, 16)}...`);
                    NetworkState.ws.monitoredTransactions.delete(txid);
                    if (FileState.uploadingChunksCount > 0) {
                        FileState.uploadingChunksCount--;
                    }
                    return blockId;
                }
            }
            
            // 即座にRPCチェック開始（30秒待たない！）
            if (NetworkState.rpcClient && waitTime >= 1000) { // 1秒後から開始
                try {
                    const txInfo = await NetworkState.rpcClient.getTransaction({
                        transactionId: txid,
                        includeBlockInfo: true
                    });
                    
                    if (txInfo && txInfo.blockHash) {
                        blockId = txInfo.blockHash;
                        console.log(`[FIX] RPC経由でBlockID取得 (${waitTime/1000}秒): ${blockId.substring(0, 16)}...`);
                        return blockId;
                    }
                } catch (err) {
                    // まだ確認されていない（正常）
                    if (waitTime % 5000 === 0) { // 5秒ごとにログ
                        console.log(`[FIX] 確認待機中... (${waitTime/1000}秒経過)`);
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            waitTime += pollInterval;
        }
        
        // 30秒経過してもダメなら Explorer API
        if (!blockId && waitTime >= maxWaitTime) {
            console.log('[FIX] 30秒タイムアウト - Explorer APIを試します');
            
            try {
                const explorerUrl = `${config.apiEndpoints[config.network]}/transactions/${txid}?resolve_previous_outpoints=no`;
                const response = await fetch(explorerUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.accepting_block_hash) {
                        blockId = data.accepting_block_hash;
                        console.log(`[FIX] Explorer API経由でBlockID取得: ${blockId.substring(0, 16)}...`);
                        return blockId;
                    }
                }
            } catch (error) {
                console.error('[FIX] Explorer APIエラー:', error);
            }
        }
        
        throw new Error(`BlockID取得失敗 (30秒タイムアウト) - TxID: ${txid}`);
    };
    
    console.log('[FIX] waitForConfirmation関数を修正版に置き換えました');
    console.log('[FIX] 主な変更点:');
    console.log('[FIX] - 30秒待機を削除、1秒後からRPCチェック開始');
    console.log('[FIX] - ポーリング間隔: 0.5秒');
    console.log('[FIX] - 初回待機: 2秒→0.5秒に短縮');
})();