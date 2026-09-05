const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5411;
const DEFAULT_API_KEY = Buffer.from("QVEuQWI4Uk42SWc1Z0Q4enVzZVZ3NWFseU1XbnNpa1I5ck84TnR4bjJvZzlQWTUzZTM4RkE=", "base64").toString("utf-8");

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check / ping
  if (req.url === '/api/ping' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'Hammy AI Backend' }));
    return;
  }

  // API Chat Proxy
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const apiKey = parsed.apiKey || DEFAULT_API_KEY;
        const model = parsed.model || 'gemini-3.6-flash';
        const payloadStr = JSON.stringify(parsed.payload);

        const geminiReq = https.request({
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
          method: 'POST',
          family: 4, // Force IPv4 for fast WSL networking
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payloadStr)
          }
        }, (geminiRes) => {
          let responseData = '';
          geminiRes.on('data', chunk => responseData += chunk);
          geminiRes.on('end', () => {
            res.writeHead(geminiRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(responseData);
          });
        });

        geminiReq.on('error', (err) => {
          console.error('[Gemini Proxy Error]:', err);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Proxy network error: ' + err.message } }));
        });

        geminiReq.write(payloadStr);
        geminiReq.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON request: ' + err.message } }));
      }
    });
    return;
  }

  // Static File Serving
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading index.html');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Hammy server with AI Proxy running at http://localhost:${PORT}`);
});
