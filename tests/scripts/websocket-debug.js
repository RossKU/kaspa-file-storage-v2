// WebSocketデバッグパッチ - block-addedイベントの内容を詳細に確認

(function() {
    console.log('[DEBUG] WebSocketデバッグパッチを適用');
    
    // 元のaddEventListenerを保存
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    // addEventListenerをオーバーライド
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'block-added') {
            console.log('[DEBUG] block-addedイベントリスナーを登録');
            
            // ラップされたリスナー
            const wrappedListener = function(event) {
                console.log('[DEBUG] block-addedイベント受信！');
                console.log('[DEBUG] event.data:', event.data);
                
                if (event.data && event.data.block) {
                    const block = event.data.block;
                    console.log('[DEBUG] block.header.hash:', block.header?.hash);
                    console.log('[DEBUG] block.transactions:', block.transactions);
                    console.log('[DEBUG] transactions count:', block.transactions?.length || 0);
                    
                    if (block.transactions && block.transactions.length > 0) {
                        console.log('[DEBUG] First transaction:', block.transactions[0]);
                        console.log('[DEBUG] Transaction keys:', Object.keys(block.transactions[0] || {}));
                        
                        // 各トランザクションの構造を確認
                        block.transactions.forEach((tx, idx) => {
                            const txId = tx.verboseData?.transactionId || tx.id || tx.transactionId;
                            console.log(`[DEBUG] Transaction ${idx}: ID=${txId}, keys=${Object.keys(tx).join(', ')}`);
                            if (tx.verboseData) {
                                console.log(`[DEBUG] verboseData keys: ${Object.keys(tx.verboseData).join(', ')}`);
                            }
                        });
                    } else {
                        console.log('[DEBUG] ⚠️ No transactions in block or transactions is undefined');
                    }
                }
                
                // 元のリスナーを呼び出す
                return listener.call(this, event);
            };
            
            // ラップされたリスナーを登録
            return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        
        // 他のイベントは通常通り
        return originalAddEventListener.call(this, type, listener, options);
    };
    
    console.log('[DEBUG] WebSocketデバッグパッチ適用完了');
})();