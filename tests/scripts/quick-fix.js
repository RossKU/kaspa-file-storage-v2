// index.htmlの<head>タグ直後に以下を追加してください：
// <script src="quick-fix.js"></script>

console.log('🚀 Quick Fix: 初期化最適化を適用中...');

// 1. 重複するDOMContentLoadedを防ぐ
let domReady = false;
const originalAddEventListener = document.addEventListener;
document.addEventListener = function(type, listener, ...args) {
    if (type === 'DOMContentLoaded') {
        if (domReady) {
            // 既にDOMが準備できている場合は即座に実行
            setTimeout(listener, 0);
            return;
        }
    }
    return originalAddEventListener.call(this, type, listener, ...args);
};

// 2. ConnectionManagerの初期化を非同期化
if (typeof ConnectionManager !== 'undefined') {
    const originalInit = ConnectionManager.init;
    ConnectionManager.init = async function() {
        console.log('ConnectionManager.init() を非同期実行');
        await new Promise(resolve => setTimeout(resolve, 0));
        return originalInit.call(this);
    };
}

// 3. 重いsetIntervalを最適化
const heavyIntervals = new Set();
const originalSetInterval = window.setInterval;
window.setInterval = function(fn, delay, ...args) {
    // 2秒未満のインターバルは警告
    if (delay < 2000) {
        console.warn(`⚠️ 高頻度のsetInterval検出: ${delay}ms`);
    }
    
    // アーカイブノード関連の高頻度更新を低減
    const fnString = fn.toString();
    if (fnString.includes('updateArchiveNodeStatus') && delay < 5000) {
        console.log('🔧 アーカイブノード更新頻度を5秒に調整');
        delay = 5000;
    }
    
    return originalSetInterval.call(this, fn, delay, ...args);
};

// 4. 巨大なHTMLの解析を最適化
document.addEventListener('DOMContentLoaded', () => {
    domReady = true;
    
    // 不要な要素を遅延表示
    const deferredElements = [
        '.debug-panel',
        '.advanced-settings',
        '.developer-tools'
    ];
    
    deferredElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.display = 'none';
            setTimeout(() => {
                el.style.display = '';
            }, 1000);
        });
    });
});

// 5. パフォーマンス計測
const initStart = performance.now();
window.addEventListener('load', () => {
    const loadTime = performance.now() - initStart;
    console.log(`📊 ページ読み込み時間: ${loadTime.toFixed(0)}ms`);
    
    if (loadTime > 5000) {
        console.error('❌ ページ読み込みが遅すぎます');
        console.log('🔍 推奨事項:');
        console.log('1. HTMLファイルを分割する');
        console.log('2. インラインJavaScriptを外部ファイルに移動');
        console.log('3. 不要な初期化処理を削除');
    }
});

console.log('✅ Quick Fix 適用完了');