import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const PORT = 3000;
const URL = `http://localhost:${PORT}`;

function openBrowser(targetUrl) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', targetUrl], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else if (platform === 'darwin') {
      spawn('open', [targetUrl], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [targetUrl], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (err) {
    console.log(`Hãy mở trình duyệt và truy cập: ${targetUrl}`);
  }
}

function isServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('==================================================');
  console.log('   FLEET BATTLE — KHOI DONG WEB GAME TREN VS CODE ');
  console.log('==================================================\n');

  if (await isServerReady()) {
    console.log(`Game đã sẵn sàng tại ${URL} — đang mở trình duyệt...`);
    openBrowser(URL);
    return;
  }

  const nodeModulesPath = path.join(rootDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('Lần chạy đầu tiên: đang tự động cài đặt thư viện (npm install)...');
    const installRes = spawnSync('npm', ['install'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });
    if (installRes.status !== 0) {
      console.error('Lỗi khi chạy npm install. Hãy kiểm tra kết nối mạng hoặc Node.js.');
      process.exit(1);
    }
    console.log('Cài đặt thư viện hoàn tất!\n');
  }

  console.log('Đang khởi chạy máy chủ game tại http://localhost:3000 ...');
  const devProc = spawn('npm', ['run', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });

  // Poll until Vite is listening, then auto-open browser
  let opened = false;
  const pollTimer = setInterval(async () => {
    if (opened) return;
    if (await isServerReady()) {
      opened = true;
      clearInterval(pollTimer);
      console.log(`\n>>> Đang mở trình duyệt tới ${URL} <<<\n`);
      openBrowser(URL);
    }
  }, 450);

  devProc.on('exit', (code) => {
    clearInterval(pollTimer);
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    devProc.kill('SIGINT');
    process.exit(0);
  });
}

main();
