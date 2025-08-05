// v5.11.110 DirectoryMetadata CSV保存テスト

// テスト用のディレクトリメタデータ
const testMetadata = {
    type: 'kaspa-directory',
    version: '3.4.2',
    created: new Date().toISOString(),
    network: 'testnet-10',
    encryption: {
        algorithm: 'AES-256-GCM',
        pbkdf2: {
            salt: 'test-salt-base64',
            iterations: 100000
        }
    },
    directory: {
        name: 'TestDirectory',
        cid: 'test-cid-123456',
        entries: [
            {
                name: 'file1.txt',
                metaTxId: 'abc123',
                blockId: 'def456',
                size: 1024
            },
            {
                name: 'file2.jpg',
                metaTxId: 'ghi789',
                blockId: 'jkl012',
                size: 2048
            }
        ]
    }
};

// テスト実行
console.log('=== DirectoryMetadata CSV保存テスト ===');

// 1. エンコードテスト
console.log('\n1. エンコードテスト');
const encoded = FileState.kenvManager.encodeDirectoryMetadata(testMetadata);
console.log('エンコード結果:', encoded);
console.log('文字数:', encoded.length);

// 2. デコードテスト
console.log('\n2. デコードテスト');
const decoded = FileState.kenvManager.decodeDirectoryMetadata(encoded);
console.log('デコード結果:', decoded);

// 3. 一致確認
console.log('\n3. 一致確認');
const isEqual = JSON.stringify(testMetadata) === JSON.stringify(decoded);
console.log('元データと一致:', isEqual);

// 4. エラーケーステスト
console.log('\n4. エラーケーステスト');
console.log('null入力:', FileState.kenvManager.encodeDirectoryMetadata(null));
console.log('空文字列デコード:', FileState.kenvManager.decodeDirectoryMetadata(''));
console.log('不正な文字列:', FileState.kenvManager.decodeDirectoryMetadata('invalid-base64'));

// 5. CSV特殊文字テスト
console.log('\n5. CSV特殊文字テスト');
const specialMetadata = {
    name: 'Test,Directory"With\nSpecial',
    description: '"Quotes", commas, and\nnewlines'
};
const specialEncoded = FileState.kenvManager.encodeDirectoryMetadata(specialMetadata);
const specialDecoded = FileState.kenvManager.decodeDirectoryMetadata(specialEncoded);
console.log('特殊文字を含むメタデータ:', specialMetadata);
console.log('エンコード後:', specialEncoded);
console.log('デコード後:', specialDecoded);
console.log('一致確認:', JSON.stringify(specialMetadata) === JSON.stringify(specialDecoded));

console.log('\n=== テスト完了 ===');