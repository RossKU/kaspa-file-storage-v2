// v5.11.111 7カラム形式テスト

// テスト用のディレクトリメタデータ
const testDirectoryMetadata = {
    type: 'kaspa-directory',
    version: '3.4.2',
    created: '2025-08-03T14:29:09.898Z',
    network: 'testnet-10',
    directory: {
        name: 'TestDir',
        totalSize: 102400,
        fileCount: 2,
        directoryCount: 1
    },
    entries: [
        {
            type: 'file',
            name: 'file1.txt',
            path: '',
            size: 51200,
            metaTxId: 'abc123',
            blockId: 'def456',
            password: 'pass1'
        },
        {
            type: 'file',
            name: 'file2.jpg',
            path: 'images',
            size: 51200,
            metaTxId: 'ghi789',
            blockId: 'jkl012',
            password: null
        },
        {
            type: 'directory',
            name: 'images',
            path: '',
            size: 0,
            metaTxId: null,
            blockId: null,
            password: null
        }
    ]
};

console.log('=== 7カラム形式テスト ===\n');

// 1. 7カラム形式への変換をシミュレート
console.log('1. 7カラム形式への変換');
const entries = testDirectoryMetadata.entries;
const fileCount = entries.filter(e => !e.type || e.type === 'file').length;
const dirCount = entries.filter(e => e.type === 'directory').length;

let csvLine = 'entries,' + fileCount + ',' + dirCount;
entries.forEach(e => {
    const type = (!e.type || e.type === 'file') ? 'f' : 'd';
    csvLine += ',' + type;
    csvLine += ',' + (e.name || '');
    csvLine += ',' + (e.path || '');
    csvLine += ',' + (e.size || 0);
    csvLine += ',' + (e.metaTxId || '');
    csvLine += ',' + (e.blockId || '');
    csvLine += ',' + (e.password || '');
});

console.log('CSV形式:', csvLine);
console.log('');

// 2. CSV形式から再構築をシミュレート
console.log('2. CSV形式から再構築');
const values = csvLine.split(',');
if (values[0] === 'entries') {
    const parsedFileCount = parseInt(values[1]);
    const parsedDirCount = parseInt(values[2]);
    const totalEntries = parsedFileCount + parsedDirCount;
    const parsedEntries = [];
    
    let i = 3;
    for (let k = 0; k < totalEntries && i + 6 < values.length; k++) {
        parsedEntries.push({
            type: values[i] === 'f' ? 'file' : 'directory',
            name: values[i + 1],
            path: values[i + 2] || '',
            size: parseInt(values[i + 3]) || 0,
            metaTxId: values[i + 4] || null,
            blockId: values[i + 5] || null,
            password: values[i + 6] || null
        });
        i += 7;
    }
    
    console.log('パースされたエントリー:');
    parsedEntries.forEach((e, idx) => {
        console.log(`  ${idx + 1}. ${e.type}: ${e.name} (${e.size} bytes)`);
        if (e.metaTxId) console.log(`     TxID: ${e.metaTxId}`);
        if (e.password) console.log(`     Password: ${e.password}`);
    });
}

console.log('\n=== 比較 ===');
console.log('元のエントリー数:', entries.length);
console.log('パース後のエントリー数:', parsedEntries.length);
console.log('データ整合性:', JSON.stringify(entries) === JSON.stringify(parsedEntries) ? '✅ 完全一致' : '❌ 不一致');