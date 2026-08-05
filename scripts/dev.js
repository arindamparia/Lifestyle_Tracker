import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

console.log('⚡ Starting DailyAlign Full-Stack Dev Environment...\n');

// 1. Start Backend Functions Server
const backend = spawn('node', ['scripts/serve-functions.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});

// 2. Start Frontend Vite Dev Server
const frontend = spawn('npx', ['vite', '--host'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});

const cleanup = () => {
  console.log('\n🛑 Shutting down development servers...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

backend.on('error', (err) => console.error('Backend process error:', err));
frontend.on('error', (err) => console.error('Frontend process error:', err));
