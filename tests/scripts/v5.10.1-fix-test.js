// arguments.callee修正のテストコード

// 現在の実装（エラーが発生する）
function testCurrentImplementation() {
    console.log("=== 現在の実装（arguments.callee使用）===");
    
    let timerCount = 0;
    const maxCount = 3;
    
    const AppState = { monitoring: { wsMonitorTimeout: null } };
    const FileState = { uploadSessionActive: true };
    
    AppState.monitoring.wsMonitorTimeout = setTimeout(async () => {
        timerCount++;
        console.log(`タイマー実行: ${timerCount}回目`);
        
        if (timerCount < maxCount && FileState.uploadSessionActive) {
            console.log("アップロード中 - タイマーリセット");
            clearTimeout(AppState.monitoring.wsMonitorTimeout);
            
            try {
                // ここでエラーが発生
                AppState.monitoring.wsMonitorTimeout = setTimeout(arguments.callee, 1000);
            } catch (error) {
                console.error("エラー発生:", error.message);
                console.error("タイマーのリセットに失敗しました！");
            }
            return;
        }
        
        console.log("監視停止");
    }, 1000);
}

// 修正案1: 名前付き関数式
function testFixedImplementation1() {
    console.log("\n=== 修正案1（名前付き関数式）===");
    
    let timerCount = 0;
    const maxCount = 3;
    
    const AppState = { monitoring: { wsMonitorTimeout: null } };
    const FileState = { uploadSessionActive: true };
    
    AppState.monitoring.wsMonitorTimeout = setTimeout(async function checkTimeout() {
        timerCount++;
        console.log(`タイマー実行: ${timerCount}回目`);
        
        if (timerCount < maxCount && FileState.uploadSessionActive) {
            console.log("アップロード中 - タイマーリセット");
            clearTimeout(AppState.monitoring.wsMonitorTimeout);
            
            try {
                // 正常に動作
                AppState.monitoring.wsMonitorTimeout = setTimeout(checkTimeout, 1000);
                console.log("タイマーリセット成功");
            } catch (error) {
                console.error("エラー発生:", error.message);
            }
            return;
        }
        
        console.log("監視停止");
    }, 1000);
}

// 修正案2: 外部関数定義
function testFixedImplementation2() {
    console.log("\n=== 修正案2（外部関数定義）===");
    
    let timerCount = 0;
    const maxCount = 3;
    
    const AppState = { monitoring: { wsMonitorTimeout: null } };
    const FileState = { uploadSessionActive: true };
    
    async function wsMonitorTimeoutHandler() {
        timerCount++;
        console.log(`タイマー実行: ${timerCount}回目`);
        
        if (timerCount < maxCount && FileState.uploadSessionActive) {
            console.log("アップロード中 - タイマーリセット");
            clearTimeout(AppState.monitoring.wsMonitorTimeout);
            
            try {
                // 正常に動作
                AppState.monitoring.wsMonitorTimeout = setTimeout(wsMonitorTimeoutHandler, 1000);
                console.log("タイマーリセット成功");
            } catch (error) {
                console.error("エラー発生:", error.message);
            }
            return;
        }
        
        console.log("監視停止");
    }
    
    AppState.monitoring.wsMonitorTimeout = setTimeout(wsMonitorTimeoutHandler, 1000);
}

// 実際の修正コード（v5.10.1用）
function actualFixedCode() {
    console.log("\n=== 実際の修正コード ===");
    
    const AppState = { monitoring: { wsMonitorTimeout: null } };
    const FileState = { 
        uploadSessionActive: true,
        isUploadingFile: false,
        uploadingChunksCount: 2,
        uploadingMetaTx: false,
        uploadingDirMeta: false
    };
    const NetworkState = { ws: { monitoredTransactions: new Map() } };
    
    // 修正版のコード
    AppState.monitoring.wsMonitorTimeout = setTimeout(async function checkTimeout() {
        // v5.3.7: Enhanced check - Don't stop monitoring during any upload activity
        if (FileState.uploadSessionActive || FileState.isUploadingFile || FileState.uploadingChunksCount > 0 || FileState.uploadingMetaTx || FileState.uploadingDirMeta) {
            console.log(`[DEBUG] アップロード中 - WebSocket監視を継続 (session=${FileState.uploadSessionActive}, file=${FileState.isUploadingFile}, chunks=${FileState.uploadingChunksCount})`);
            // Reset timeout
            clearTimeout(AppState.monitoring.wsMonitorTimeout);
            AppState.monitoring.wsMonitorTimeout = setTimeout(checkTimeout, 5 * 60 * 1000);
            return;
        }
        
        // Also check if there are monitored transactions
        if (NetworkState.ws.monitoredTransactions.size > 0) {
            console.log(`[DEBUG] 監視中のトランザクションあり (${NetworkState.ws.monitoredTransactions.size}件) - 監視を継続`);
            clearTimeout(AppState.monitoring.wsMonitorTimeout);
            AppState.monitoring.wsMonitorTimeout = setTimeout(checkTimeout, 5 * 60 * 1000);
            return;
        }
        
        console.log('WebSocket監視: 5分タイムアウト - 自動停止');
        // await stopMonitoring();
    }, 5 * 60 * 1000);
    
    console.log("修正版のタイマーが正常にセットされました");
}

// テスト実行
console.log("strict modeでのテスト開始...\n");

// strict modeを有効化
"use strict";

try {
    testCurrentImplementation();
} catch (e) {
    console.error("testCurrentImplementation failed:", e.message);
}

setTimeout(() => {
    testFixedImplementation1();
}, 2000);

setTimeout(() => {
    testFixedImplementation2();
}, 5000);

setTimeout(() => {
    actualFixedCode();
}, 8000);