// パフォーマンストレース用スクリプト
// index.htmlに追加して、RPC呼び出しのタイミングを詳細に記録

class PerformanceTracer {
    constructor() {
        this.traces = [];
        this.enabled = true;
    }

    start(operation) {
        if (!this.enabled) return;
        
        const trace = {
            operation,
            startTime: performance.now(),
            timestamp: new Date().toISOString(),
            stack: new Error().stack
        };
        
        this.traces.push(trace);
        return trace;
    }

    end(trace, result = null, error = null) {
        if (!this.enabled || !trace) return;
        
        trace.endTime = performance.now();
        trace.duration = trace.endTime - trace.startTime;
        trace.result = result;
        trace.error = error;
        
        // 遅いオペレーションを警告
        if (trace.duration > 5000) {
            console.warn(`🐢 遅いRPC操作: ${trace.operation} - ${trace.duration.toFixed(2)}ms`);
        }
        
        return trace;
    }

    // RPC呼び出しをラップ
    wrapRpcCall(originalFunction, operationName) {
        const tracer = this;
        return async function(...args) {
            const trace = tracer.start(operationName);
            
            try {
                const result = await originalFunction.apply(this, args);
                tracer.end(trace, result);
                return result;
            } catch (error) {
                tracer.end(trace, null, error);
                throw error;
            }
        };
    }

    // 統計情報を取得
    getStats() {
        const stats = {
            totalCalls: this.traces.length,
            averageDuration: 0,
            slowestOperation: null,
            errorCount: 0,
            operationBreakdown: {}
        };

        if (this.traces.length === 0) return stats;

        let totalDuration = 0;
        let slowestDuration = 0;

        for (const trace of this.traces) {
            if (!trace.duration) continue;
            
            totalDuration += trace.duration;
            
            if (trace.duration > slowestDuration) {
                slowestDuration = trace.duration;
                stats.slowestOperation = trace;
            }
            
            if (trace.error) {
                stats.errorCount++;
            }
            
            // オペレーション別統計
            if (!stats.operationBreakdown[trace.operation]) {
                stats.operationBreakdown[trace.operation] = {
                    count: 0,
                    totalDuration: 0,
                    errors: 0
                };
            }
            
            const opStats = stats.operationBreakdown[trace.operation];
            opStats.count++;
            opStats.totalDuration += trace.duration;
            if (trace.error) opStats.errors++;
        }

        stats.averageDuration = totalDuration / this.traces.length;
        
        // 各オペレーションの平均時間を計算
        for (const op in stats.operationBreakdown) {
            const opStats = stats.operationBreakdown[op];
            opStats.averageDuration = opStats.totalDuration / opStats.count;
        }

        return stats;
    }

    // レポート出力
    printReport() {
        const stats = this.getStats();
        
        console.group('📊 RPCパフォーマンスレポート');
        console.log(`総呼び出し数: ${stats.totalCalls}`);
        console.log(`平均応答時間: ${stats.averageDuration.toFixed(2)}ms`);
        console.log(`エラー数: ${stats.errorCount}`);
        
        if (stats.slowestOperation) {
            console.warn(`最も遅い操作: ${stats.slowestOperation.operation} (${stats.slowestOperation.duration.toFixed(2)}ms)`);
        }
        
        console.group('オペレーション別統計');
        for (const [op, opStats] of Object.entries(stats.operationBreakdown)) {
            console.log(`${op}:`);
            console.log(`  - 呼び出し回数: ${opStats.count}`);
            console.log(`  - 平均時間: ${opStats.averageDuration.toFixed(2)}ms`);
            if (opStats.errors > 0) {
                console.log(`  - エラー: ${opStats.errors}`);
            }
        }
        console.groupEnd();
        
        console.groupEnd();
        
        return stats;
    }

    // CSVエクスポート
    exportToCSV() {
        const headers = ['timestamp', 'operation', 'duration_ms', 'error'];
        const rows = [headers];
        
        for (const trace of this.traces) {
            if (!trace.duration) continue;
            rows.push([
                trace.timestamp,
                trace.operation,
                trace.duration.toFixed(2),
                trace.error ? trace.error.message : ''
            ]);
        }
        
        return rows.map(row => row.join(',')).join('\n');
    }
}

// グローバルに公開
window.performanceTracer = new PerformanceTracer();

// 使用例：
// index.htmlでRPC呼び出しをラップ
/*
const originalSubmitTransaction = rpcClient.submitTransaction.bind(rpcClient);
rpcClient.submitTransaction = performanceTracer.wrapRpcCall(originalSubmitTransaction, 'submitTransaction');

const originalGetBlock = rpcClient.getBlock.bind(rpcClient);
rpcClient.getBlock = performanceTracer.wrapRpcCall(originalGetBlock, 'getBlock');

// レポート表示
setTimeout(() => {
    performanceTracer.printReport();
}, 60000); // 1分後
*/