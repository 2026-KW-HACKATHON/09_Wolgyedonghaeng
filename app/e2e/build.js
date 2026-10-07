// E2E용 웹 내보내기. 목 모드 앱(e2e/.build/mock)과 실서버 연결 앱(e2e/.build/real)을 만든다.
// 사용: node e2e/build.js   (E2E_SKIP_BUILD=1 이면 이미 만든 것을 그대로 쓴다)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = path.resolve(__dirname, '..');
const out = path.join(__dirname, '.build');
const API = process.env.E2E_API_URL || 'http://localhost:8010';

if (process.env.E2E_SKIP_BUILD === '1' && fs.existsSync(path.join(out, 'real', 'index.html'))) {
  console.log('E2E_SKIP_BUILD=1: 내보내기를 건너뜁니다');
  process.exit(0);
}

const builds = [
  ['mock', { EXPO_PUBLIC_USE_MOCK_API: '1' }],
  ['real', { EXPO_PUBLIC_USE_MOCK_API: '0', EXPO_PUBLIC_API_BASE_URL: API }],
];
for (const [name, env] of builds) {
  console.log(`expo export (${name})`);
  execSync(`npx expo export -p web --clear --output-dir ${JSON.stringify(path.join(out, name))}`, {
    cwd: app,
    stdio: 'inherit',
    env: { ...process.env, ...env, CI: '1' },
  });
}
