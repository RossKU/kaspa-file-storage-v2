// WebSocket通知問題の修正パッチ
// 問題: subscribeBlockAddedで受信するブロックにトランザクション詳細が含まれていない可能性

(function() {
    console.log('[FIX] WebSocket通知修正パッチを適用');
    
    // 元のwaitForConfirmation関数を保存
    const originalWaitForConfirmation = window.waitForConfirmation;
    
    // 修正版：より積極的なポーリング
    window.waitForConfirmation = async function(txid) {
        console.log(`[FIX] waitForConfirmation開始 - TxID: ${txid.substring(0, 16)}...`);
        
        let blockId = null;
        let waitTime = 0;
        const maxWaitTime = 30000;
        
        // 初回待機を短縮（2秒→0.5秒）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        while (!blockId && waitTime < maxWaitTime) {
            // ネットワーク接続チェック
            if (!ConnectionManager.isConnected || !NetworkState.ws.connected) {
                throw new Error('Network disconnected while waiting for BlockID');
            }
            
            // WebSocketモニターチェック（従来通り）
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
            
            // 1秒後からRPCチェック開始（30秒待たない）
            if (NetworkState.rpcClient && waitTime >= 1000) {
                try {
                    const txInfo = await NetworkState.rpcClient.getTransaction({
                        transactionId: txid,
                        includeBlockInfo: true
                    });
                    
                    if (txInfo && txInfo.blockHash) {
                        blockId = txInfo.blockHash;
                        console.log(`[FIX] RPC経由でBlockID取得 (${(waitTime/1000).toFixed(1)}秒): ${blockId.substring(0, 16)}...`);
                        
                        // WebSocketモニターも更新
                        if (NetworkState.ws.monitoredTransactions?.has(txid)) {
                            const monitorData = NetworkState.ws.monitoredTransactions.get(txid);
                            monitorData.blockId = blockId;
                            monitorData.foundAt = new Date();
                        }
                        
                        return blockId;
                    }
                } catch (err) {
                    // まだ確認されていない（正常）
                    if (waitTime % 2000 === 0) { // 2秒ごとにログ
                        console.log(`[FIX] 確認待機中... (${waitTime/1000}秒経過)`);
                    }
                }
            }
            
            // 250msごとにチェック（より高頻度）
            await new Promise(resolve => setTimeout(resolve, 250));
            waitTime += 250;
        }
        
        // タイムアウト時はExplorer API
        if (!blockId) {
            console.log('[FIX] タイムアウト - Explorer APIを試します');
            return await fetchBlockIdFromExplorer(txid);
        }
        
        return blockId;
    };
    
    // WebSocketイベントの改善（オプション）
    if (window.NetworkState && NetworkState.rpcClient) {
        console.log('[FIX] WebSocketイベントハンドラーを強化');
        
        // subscribeBlockAddedの呼び出しを監視
        const originalSubscribe = NetworkState.rpcClient.subscribeBlockAdded;
        if (originalSubscribe) {
            NetworkState.rpcClient.subscribeBlockAdded = async function(...args) {
                console.log('[FIX] subscribeBlockAdded呼び出し');
                
                try {
                    // オプションを追加（トランザクション詳細を含める）
                    const options = args[0] || {};
                    options.includeTransactions = true;
                    options.includeVerboseData = true;
                    
                    const result = await originalSubscribe.call(this, options);
                    console.log('[FIX] subscribeBlockAdded成功（トランザクション詳細を要求）');
                    return result;
                } catch (error) {
                    console.error('[FIX] subscribeBlockAddedエラー:', error);
                    throw error;
                }
            };
        }
    }
    
    console.log('[FIX] 修正パッチ適用完了');
    console.log('[FIX] 主な変更:');
    console.log('[FIX] - RPCチェックを1秒後から開始（30秒待たない）');
    console.log('[FIX] - ポーリング間隔を250msに短縮');
    console.log('[FIX] - subscribeBlockAddedでトランザクション詳細を要求');
})();