/* global __dirname */
// 서버·계약 파일을 앱이 읽을 수 있는 위치로 복사한다 (Metro는 app 밖 경로를 읽지 못한다).
//   contracts/examples/*.json        -> src/services/mock/examples/
//   server/data/programs-2026.json   -> src/services/mock/programs.json
// 사용: npm run sync-contracts
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const mock = path.resolve(__dirname, '..', 'src', 'services', 'mock');

fs.mkdirSync(path.join(mock, 'examples'), { recursive: true });

const exDir = path.join(root, 'contracts', 'examples');
for (const f of fs.readdirSync(exDir).filter((n) => n.endsWith('.json'))) {
  fs.copyFileSync(path.join(exDir, f), path.join(mock, 'examples', f));
  console.log('copied examples/' + f);
}

fs.copyFileSync(path.join(root, 'server', 'data', 'programs-2026.json'), path.join(mock, 'programs.json'));
console.log('copied programs.json');
