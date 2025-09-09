#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Route 1: Serve local files (HTML, JS, etc.)
    if (parsedUrl.pathname === '/' || parsedUrl.pathname.endsWith('.html') || 
        parsedUrl.pathname.endsWith('.js') || parsedUrl.pathname.endsWith('.wasm')) {
        
        let filePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
        filePath = path.join(__dirname, filePath);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            const contentType = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.wasm': 'application/wasm',
                '.css': 'text/css'
            }[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('File not found');
        }
        return;
    }
    
    // Route 2: Proxy requests (paths starting with /proxy/)
    if (parsedUrl.pathname.startsWith('/proxy/')) {
        const targetUrl = parsedUrl.pathname.slice(7); // Remove /proxy/
        console.log(`Proxying: ${targetUrl}`);
        
        try {
            const targetParsed = url.parse(targetUrl);
            const isHttps = targetParsed.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options = {
                hostname: targetParsed.hostname,
                port: targetParsed.port || (isHttps ? 443 : 80),
                path: targetParsed.path,
                method: req.method,
                headers: {
                    ...req.headers,
                    host: targetParsed.host
                }
            };
            
            delete options.headers['origin'];
            delete options.headers['referer'];
            
            const proxyReq = client.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, {
                    ...proxyRes.headers,
                    'Access-Control-Allow-Origin': '*'
                });
                proxyRes.pipe(res);
            });
            
            proxyReq.on('error', (err) => {
                console.error(`Proxy error: ${err.message}`);
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            });
            
            req.pipe(proxyReq);
            
        } catch (err) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid URL' }));
        }
        return;
    }
    
    // Default: 404
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║     Local Server with CORS Proxy Started          ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  Access your app at:                               ║
║  http://localhost:${PORT}/                              ║
║                                                    ║
║  This server:                                      ║
║  1. Serves index.html and other files             ║
║  2. Proxies requests to /proxy/https://...        ║
║  3. No CORS errors!                               ║
║                                                    ║
╚════════════════════════════════════════════════════╝
    `);
});

process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        process.exit(0);
    });
});