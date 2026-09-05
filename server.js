const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 5411;

http.createServer((req, res) => {
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
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Hammy server running at http://localhost:${PORT}`);
});
