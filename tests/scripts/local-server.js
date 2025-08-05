const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const ROOT = __dirname;

// MIMEタイプ
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    let filePath = path.join(ROOT, url.parse(req.url).pathname);
    
    // デフォルトファイル
    if (filePath.endsWith('/')) {
        filePath += 'index.html';
    }
    
    // セキュリティ: ディレクトリトラバーサル防止
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
            return;
        }
        
        // MIMEタイプを設定
        const ext = path.extname(filePath);
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        
        // CORSヘッダー（開発用）
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', mimeType);
        
        // WASMファイルのキャッシュ設定
        if (ext === '.wasm' || ext === '.js') {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
        
        res.writeHead(200);
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ローカルサーバー起動完了`);
    console.log(`📱 アクセスURL:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://127.0.0.1:${PORT}`);
    
    // ネットワークIPを表示
    const os = require('os');
    const interfaces = os.networkInterfaces();
    Object.keys(interfaces).forEach(name => {
        interfaces[name].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`   http://${iface.address}:${PORT} (${name})`);
            }
        });
    });
    
    console.log(`\n⏹️  停止: Ctrl+C`);
    console.log(`📊 アクセスログ:`);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
    console.log('\n\n👋 サーバーを停止しています...');
    server.close(() => {
        console.log('✅ サーバー停止完了');
        process.exit(0);
    });
});