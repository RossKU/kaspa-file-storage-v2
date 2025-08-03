// v5.11.110 DirectoryMetadata デコードテスト

// kentryファイルから取得したエンコードされたdirectoryMetadata
const encodedData = 'JTdCJTIydHlwZSUyMiUzQSUyMmthc3BhLWRpcmVjdG9yeSUyMiUyQyUyMnZlcnNpb24lMjIlM0ElMjIzLjQuMiUyMiUyQyUyMmNyZWF0ZWQlMjIlM0ElMjIyMDI1LTA4LTAzVDE0JTNBMjklM0EwOS44OThaJTIyJTJDJTIybmV0d29yayUyMiUzQSUyMnRlc3RuZXQtMTAlMjIlMkMlMjJlbmNyeXB0aW9uJTIyJTNBJTdCJTIyYWxnb3JpdGhtJTIyJTNBJTIyQUVTLTI1Ni1HQ00lMjIlMkMlMjJwYmtkZjIlMjIlM0ElN0IlMjJzYWx0JTIyJTNBJTIyWkJ0eVNTZlg2cE5xMDRQU0xBM2VadyUzRCUzRCUyMiUyQyUyMml0ZXJhdGlvbnMlMjIlM0ExMDAwMDAlN0QlN0QlMkMlMjJkaXJlY3RvcnklMjIlM0ElN0IlMjJuYW1lJTIyJTNBJTIyV0RFJTIyJTJDJTIydG90YWxTaXplJTIyJTNBOTI2MTQlMkMlMjJmaWxlQ291bnQlMjIlM0ExJTJDJTIyZGlyZWN0b3J5Q291bnQlMjIlM0EwJTdEJTJDJTIyY2lkJTIyJTNBJTIyMWtvYnVDb3ZSRGN4a3ZJM2ZEQk5yTVNjZU5kc0dyRHJ1dlp1Z0NSZjM4TSUyMiUyQyUyMmVudHJpZXMlMjIlM0ElNUIlN0IlMjJ0eXBlJTIyJTNBJTIyZmlsZSUyMiUyQyUyMm5hbWUlMjIlM0ElMjJfMGMzZDFhZmItNzcxYy00OWI0LTljZjctNmFmNTQwYWVmZGQ5LmpwZWclMjIlMkMlMjJwYXRoJTIyJTNBJTIyJTIyJTJDJTIyc2l6ZSUyMiUzQTkyNjE0JTJDJTIybWV0YVR4SWQlMjIlM0ElMjI1NjgxNGM1YTBlYjdlOWE3MzQ5NWQ5ZDRiOGZlMDAxMjMwNjJiZjA1ZWQzY2I4YTBhN2ZjYjQ0ZjFkZTM0NTE3JTIyJTJDJTIyYmxvY2tJZCUyMiUzQSUyMmU4MWIyYmVkNGRkNTg3MTYxMmViMjZkYWVkNTM1ZjQ5Y2I0YTc3Mzg5OTk4ODg4NDhhODMzZDlmZDk0ZDViNTUlMjIlMkMlMjJjaWQlMjIlM0FudWxsJTJDJTIycGFzc3dvcmQlMjIlM0ElMjJmZmZkZGRnZ2clMjIlMkMlMjJ2ZXJpZmllZCUyMiUzQXRydWUlN0QlNUQlMkMlMjJyZWNvdmVyeSUyMiUzQSU3QiUyMnRvdGFsRmlsZXMlMjIlM0ExJTJDJTIydG90YWxTaXplJTIyJTNBOTI2MTQlMkMlMjJ1cGxvYWRDb3N0JTIyJTNBMCUyQyUyMnVwbG9hZER1cmF0aW9uJTIyJTNBbnVsbCU3RCUyQyUyMm1ldGFkYXRhJTIyJTNBJTdCJTIybWV0YVR4SWQlMjIlM0FudWxsJTJDJTIybWV0YVR4QmxvY2tJZCUyMiUzQW51bGwlMkMlMjJ1cGxvYWREYXRlJTIyJTNBJTIyMjAyNS0wOC0wM1QxNCUzQTI5JTNBMDkuODk4WiUyMiUyQyUyMmJsb2NrVGltZSUyMiUzQW51bGwlMkMlMjJwYXlsb2FkU3BsaXQlMjIlM0FmYWxzZSUyQyUyMnNlZ21lbnRCb3VuZGFyaWVzJTIyJTNBJTVCJTVEJTdEJTJDJTIyYXV0aCUyMiUzQSU3QiUyMnBhc3N3b3JkSW5jbHVkZWQlMjIlM0FmYWxzZSUyQyUyMnBhc3N3b3JkJTIyJTNBbnVsbCUyQyUyMndhcm5pbmclMjIlM0FudWxsJTdEJTJDJTIyZXh0ZW5zaW9ucyUyMiUzQSU3QiUyMnY0XzVfNl9jb21wYXQlMjIlM0F0cnVlJTJDJTIyY3VzdG9tJTIyJTNBJTdCJTIybWVya2xlUm9vdCUyMiUzQSUyMjRkNmY5YWU2YWVhYTRjZjVkOWU0ZWZkZWI4Y2NkZjdmOGE2MjNiMTBkMWZkNTIyNDFjN2RiYTBiOTEwMzJhYmElMjIlN0QlN0QlN0Q.';

// デコード処理
try {
    // URLセーフなBase64デコード（-_. を +/= に戻す）
    const base64 = encodedData
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .replace(/\./g, '=');
    
    const jsonStr = decodeURIComponent(atob(base64));
    const metadata = JSON.parse(jsonStr);
    
    console.log('=== デコードされたDirectoryMetadata ===');
    console.log(JSON.stringify(metadata, null, 2));
    
    // 主要情報の確認
    console.log('\n=== 主要情報 ===');
    console.log('タイプ:', metadata.type);
    console.log('バージョン:', metadata.version);
    console.log('ディレクトリ名:', metadata.directory.name);
    console.log('ファイル数:', metadata.directory.fileCount);
    console.log('総サイズ:', metadata.directory.totalSize);
    console.log('CID:', metadata.cid);
    console.log('エントリー数:', metadata.entries.length);
    
    // エントリー情報
    console.log('\n=== エントリー情報 ===');
    metadata.entries.forEach((entry, index) => {
        console.log(`エントリー${index + 1}:`);
        console.log('  名前:', entry.name);
        console.log('  サイズ:', entry.size);
        console.log('  metaTxId:', entry.metaTxId);
        console.log('  blockId:', entry.blockId);
        console.log('  パスワード:', entry.password);
        console.log('  検証済み:', entry.verified);
    });
} catch (error) {
    console.error('デコードエラー:', error);
}