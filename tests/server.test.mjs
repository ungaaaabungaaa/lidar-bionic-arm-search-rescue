import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { once } from 'node:events';
test('loopback lab serves only fixed public files with CSP and no write methods', async () => {
  const port = 19000 + (process.pid % 10000),
    child = spawn(process.execPath, ['scripts/serve.mjs', '--port', String(port)], {
      cwd: new URL('../', import.meta.url),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  let stderr = '';
  child.stderr.on('data', (part) => (stderr += part));
  const request = (pathname, method = 'GET', host = `127.0.0.1:${port}`) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        { host: '127.0.0.1', port, path: pathname, method, headers: { Host: host } },
        (res) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (text += chunk));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
        },
      );
      req.on('error', reject);
      req.end();
    });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Local server did not start: ' + stderr)), 5000);
      let text = '';
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(Error('Server exited ' + code + ': ' + stderr));
      });
      child.stdout.on('data', (part) => {
        text += part;
        if (text.includes('Arm lab:')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    const page = await request('/');
    assert.equal(page.status, 200);
    assert.match(page.text, /A clear path/);
    assert.match(page.headers['content-security-policy'], /connect-src 'none'/);
    assert.equal(page.headers['x-content-type-options'], 'nosniff');
    assert.equal((await request('/src/protocol.mjs')).status, 200);
    assert.equal((await request('/', 'HEAD')).text, '');
    for (const url of ['/package.json', '/../LICENSE', '/%2e%2e/LICENSE', '/?secret=x'])
      assert.equal((await request(url)).status, 404);
    assert.equal((await request('/', 'POST')).status, 405);
    assert.equal((await request('/', 'GET', 'evil.example')).status, 403);
  } finally {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
  }
});
