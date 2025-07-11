// Phase 1: Basic wallet generation and storage
// このファイルをindex.htmlに追加してください

class SimpleWalletManager {
    constructor() {
        this.subWallets = [];
        this.isTestMode = true; // テストモードで開始
        this.version = '1.0';
    }

    // シンプルなウォレット生成
    generateTestWallet(index) {
        try {
            console.log(`Generating test wallet ${index}...`);
            
            // Kaspa WASM SDKを使用してウォレット生成
            const privateKey = new kaspa.PrivateKey();
            const publicKey = privateKey.toPublicKey();
            const address = publicKey.toAddress(NETWORK).toString();
            
            const wallet = {
                id: `test_wallet_${index}`,
                index: index,
                privateKeyHex: privateKey.toString(),
                publicKeyHex: publicKey.toString(),
                address: address,
                created: new Date().toISOString(),
                balance: 0,
                status: 'new'
            };
            
            console.log(`Generated wallet ${index}:`, {
                id: wallet.id,
                address: wallet.address,
                created: wallet.created
            });
            
            return wallet;
        } catch (error) {
            console.error('Wallet generation error:', error);
            alert(`Error generating wallet: ${error.message}`);
            return null;
        }
    }

    // 複数のウォレットを一度に生成
    generateMultipleWallets(count) {
        console.log(`Generating ${count} test wallets...`);
        const newWallets = [];
        
        for (let i = 0; i < count; i++) {
            const wallet = this.generateTestWallet(i);
            if (wallet) {
                newWallets.push(wallet);
            }
        }
        
        this.subWallets = newWallets;
        console.log(`Successfully generated ${newWallets.length} wallets`);
        return newWallets;
    }

    // ローカルストレージへの保存（セキュリティ注意: テスト用のみ）
    saveToLocalStorage() {
        try {
            // 公開情報のみ保存（秘密鍵は除外）
            const publicData = {
                version: this.version,
                testMode: this.isTestMode,
                timestamp: new Date().toISOString(),
                wallets: this.subWallets.map(w => ({
                    id: w.id,
                    index: w.index,
                    address: w.address,
                    created: w.created,
                    status: w.status
                }))
            };
            
            localStorage.setItem('multiWalletTest_public', JSON.stringify(publicData));
            
            // 秘密鍵は別途暗号化して保存（実装予定）
            // この段階では保存しない
            
            console.log('Wallet data saved to localStorage');
            console.log('Public data:', publicData);
            
            return true;
        } catch (error) {
            console.error('Save error:', error);
            alert(`Error saving wallets: ${error.message}`);
            return false;
        }
    }

    // ローカルストレージから読み込み
    loadFromLocalStorage() {
        try {
            const publicData = localStorage.getItem('multiWalletTest_public');
            
            if (!publicData) {
                console.log('No saved wallet data found');
                return false;
            }
            
            const data = JSON.parse(publicData);
            console.log('Loaded wallet data:', data);
            
            // バージョンチェック
            if (data.version !== this.version) {
                console.warn(`Version mismatch: ${data.version} vs ${this.version}`);
            }
            
            return data;
        } catch (error) {
            console.error('Load error:', error);
            return false;
        }
    }

    // ウォレット情報の表示
    displayWalletInfo() {
        if (this.subWallets.length === 0) {
            console.log('No wallets generated yet');
            return;
        }
        
        console.log('=== Wallet Information ===');
        console.log(`Total wallets: ${this.subWallets.length}`);
        
        this.subWallets.forEach((wallet, index) => {
            console.log(`\nWallet ${index}:`);
            console.log(`  ID: ${wallet.id}`);
            console.log(`  Address: ${wallet.address}`);
            console.log(`  Created: ${wallet.created}`);
            console.log(`  Status: ${wallet.status}`);
        });
    }

    // テスト用: ウォレットの検証
    validateWallets() {
        console.log('=== Validating Wallets ===');
        let valid = true;
        
        this.subWallets.forEach((wallet, index) => {
            try {
                // 秘密鍵からアドレスを再生成して検証
                const privateKey = new kaspa.PrivateKey(wallet.privateKeyHex);
                const publicKey = privateKey.toPublicKey();
                const address = publicKey.toAddress(NETWORK).toString();
                
                if (address === wallet.address) {
                    console.log(`✓ Wallet ${index} valid`);
                } else {
                    console.error(`✗ Wallet ${index} invalid: address mismatch`);
                    valid = false;
                }
            } catch (error) {
                console.error(`✗ Wallet ${index} validation error:`, error);
                valid = false;
            }
        });
        
        return valid;
    }
}

// グローバル変数
let simpleWalletManager = null;

// === テスト関数 ===

function testPhase1_Basic() {
    console.log('\n=== Phase 1 Basic Test ===');
    
    // マネージャーの初期化
    simpleWalletManager = new SimpleWalletManager();
    console.log('Manager initialized');
    
    // 2つのウォレットを生成
    const wallets = simpleWalletManager.generateMultipleWallets(2);
    
    if (wallets.length === 2) {
        console.log('✓ Successfully generated 2 wallets');
    } else {
        console.error('✗ Failed to generate wallets');
        return;
    }
    
    // ウォレット情報表示
    simpleWalletManager.displayWalletInfo();
    
    // 検証
    const isValid = simpleWalletManager.validateWallets();
    console.log(`Validation result: ${isValid ? 'PASS' : 'FAIL'}`);
    
    // 保存テスト
    const saved = simpleWalletManager.saveToLocalStorage();
    console.log(`Save result: ${saved ? 'SUCCESS' : 'FAILED'}`);
    
    // 読み込みテスト
    const loaded = simpleWalletManager.loadFromLocalStorage();
    console.log(`Load result: ${loaded ? 'SUCCESS' : 'FAILED'}`);
}

function testPhase1_Recovery() {
    console.log('\n=== Phase 1 Recovery Test ===');
    
    // 新しいマネージャーで既存データを読み込み
    const newManager = new SimpleWalletManager();
    const loaded = newManager.loadFromLocalStorage();
    
    if (loaded) {
        console.log('✓ Successfully loaded saved data');
        console.log(`Found ${loaded.wallets.length} wallets`);
        loaded.wallets.forEach(w => {
            console.log(`  - ${w.id}: ${w.address}`);
        });
    } else {
        console.log('✗ No saved data found');
    }
}

function testPhase1_Stress() {
    console.log('\n=== Phase 1 Stress Test ===');
    
    const manager = new SimpleWalletManager();
    const startTime = Date.now();
    
    // 10個のウォレットを生成
    const wallets = manager.generateMultipleWallets(10);
    
    const elapsed = Date.now() - startTime;
    console.log(`Generated ${wallets.length} wallets in ${elapsed}ms`);
    console.log(`Average: ${(elapsed / wallets.length).toFixed(2)}ms per wallet`);
}

// === ヘルパー関数 ===

function clearTestData() {
    localStorage.removeItem('multiWalletTest_public');
    console.log('Test data cleared');
}

// === 実行 ===

// ページロード時の自動テスト（コメントアウトして必要時に実行）
// window.addEventListener('load', () => {
//     console.log('Multi-Wallet Phase 1 Test Suite');
//     console.log('Run testPhase1_Basic() to start');
// });

// コンソールで使用可能なコマンド
console.log(`
Multi-Wallet Phase 1 Commands:
- testPhase1_Basic()     : Run basic test
- testPhase1_Recovery()  : Test data recovery
- testPhase1_Stress()    : Generate 10 wallets
- clearTestData()        : Clear saved data
`);