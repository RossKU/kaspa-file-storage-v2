#!/usr/bin/env node

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8080;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Get target URL from query parameter or path
    let targetUrl;
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.query.url) {
        // Format: http://localhost:8080/?url=https://example.com
        targetUrl = parsedUrl.query.url;
    } else if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
        // Format: http://localhost:8080/https://example.com
        targetUrl = parsedUrl.pathname.slice(1);
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>CORS Proxy Server</h1>
            <p>Usage:</p>
            <ul>
                <li>http://localhost:${PORT}/?url=https://example.com</li>
                <li>http://localhost:${PORT}/https://example.com</li>
            </ul>
            <p>Status: Running on port ${PORT}</p>
        `);
        return;
    }
    
    console.log(`[${new Date().toISOString()}] Proxying: ${targetUrl}`);
    
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
        
        // Remove unwanted headers
        delete options.headers['host'];
        delete options.headers['origin'];
        delete options.headers['referer'];
        
        const proxyReq = client.request(options, (proxyRes) => {
            // Copy status and headers
            res.writeHead(proxyRes.statusCode, {
                ...proxyRes.headers,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': '*'
            });
            
            // Pipe the response
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
            console.error(`Proxy error: ${err.message}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        });
        
        // Pipe request body if exists
        req.pipe(proxyReq);
        
    } catch (err) {
        console.error(`Error parsing URL: ${err.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid URL' }));
    }
});

// WebSocket support
server.on('upgrade', (req, socket, head) => {
    console.log('[WebSocket] Upgrade request received');
    
    const targetUrl = req.url.slice(1);
    const targetParsed = url.parse(targetUrl);
    
    const isHttps = targetParsed.protocol === 'wss:' || targetParsed.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
        hostname: targetParsed.hostname,
        port: targetParsed.port || (isHttps ? 443 : 80),
        path: targetParsed.path,
        method: 'GET',
        headers: {
            ...req.headers,
            host: targetParsed.host
        }
    };
    
    const proxyReq = client.request(options);
    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
        socket.write('HTTP/1.1 101 Switching Protocols\r\n');
        
        for (const [key, value] of Object.entries(proxyRes.headers)) {
            socket.write(`${key}: ${value}\r\n`);
        }
        socket.write('\r\n');
        
        proxySocket.pipe(socket);
        socket.pipe(proxySocket);
    });
    
    proxyReq.on('error', (err) => {
        console.error(`WebSocket proxy error: ${err.message}`);
        socket.end();
    });
    
    proxyReq.end();
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║       CORS Proxy Server Started            ║
╠════════════════════════════════════════════╣
║  Port: ${PORT}                                 ║
║  URL:  http://localhost:${PORT}/              ║
║                                            ║
║  Example usage:                            ║
║  http://localhost:${PORT}/?url=TARGET_URL     ║
╚════════════════════════════════════════════╝
    `);
});

process.on('SIGINT', () => {
    console.log('\nShutting down CORS proxy server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});