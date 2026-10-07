import { defineConfig } from '@playwright/test';
import path from 'path';

// 앱: 목 모드 8099, 실서버 연결 8098. 서버(가짜 모드): 8010.
const MOCK_PORT = 8099;
const REAL_PORT = 8098;
const API_PORT = 8010;
const build = path.join(__dirname, '.build');
const server = path.resolve(__dirname, '../../server');
const python = process.env.E2E_PYTHON || path.join(server, '.venv/bin/python');

export const MOCK_URL = `http://localhost:${MOCK_PORT}`;
export const REAL_URL = `http://localhost:${REAL_PORT}`;

export default defineConfig({
  testDir: __dirname,
  testMatch: '*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  outputDir: path.resolve(__dirname, '../test-results'),
  use: {
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mock', testMatch: 'mock.spec.ts', use: { baseURL: MOCK_URL } },
    { name: 'real', testMatch: 'real.spec.ts', use: { baseURL: REAL_URL } },
  ],
  webServer: [
    {
      command: `node ${path.join(__dirname, 'static-server.js')} ${path.join(build, 'mock')} ${MOCK_PORT}`,
      url: MOCK_URL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `node ${path.join(__dirname, 'static-server.js')} ${path.join(build, 'real')} ${REAL_PORT}`,
      url: REAL_URL,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `${python} -m uvicorn main:app --port ${API_PORT}`,
      cwd: server,
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        CORS_ORIGINS: `${REAL_URL},${MOCK_URL}`,
        OPENROUTER_API_KEY: '',
        FAKE_CLASSIFIER_CONFIDENCE: '0.82',
        RATE_LIMIT_PER_MIN: '0',
        PATH: process.env.PATH ?? '',
      },
    },
  ],
});
