// 웹 내보내기 결과(정적 파일)를 서빙하는 작은 서버. 사용: node e2e/static-server.js <폴더> <포트>
// 동적 경로(/program/C01, /card/xxx)는 [id].html 로 보낸다.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 8099);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolve(p) {
  const direct = path.join(root, p);
  if (p === '/') return path.join(root, 'index.html');
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  if (/^\/program\//.test(p)) return path.join(root, 'program', '[id].html');
  if (/^\/card\//.test(p)) return path.join(root, 'card', '[id].html');
  return direct + '.html';
}

http
  .createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    let file = resolve(p);
    let status = 200;
    if (!file.startsWith(root) || !fs.existsSync(file)) {
      file = path.join(root, '+not-found.html');
      status = 404;
      if (!fs.existsSync(file)) {
        res.writeHead(404);
        return res.end('not found');
      }
    }
    res.writeHead(status, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`static ${root} on ${port}`));
