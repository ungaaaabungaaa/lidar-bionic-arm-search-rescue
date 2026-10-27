// SPDX-License-Identifier: Apache-2.0
import { mkdir, rm, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url)),
  out = path.join(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'src'), { recursive: true });
for (const name of ['index.html', 'style.css', 'app.mjs', 'worker.mjs'])
  await copyFile(path.join(root, 'web', name), path.join(out, name));
for (const name of ['arm.mjs', 'cloud.mjs', 'bench.mjs', 'scenes.mjs', 'protocol.mjs'])
  await copyFile(path.join(root, 'src', name), path.join(out, 'src', name));
const html = await readFile(path.join(out, 'index.html'), 'utf8');
if (/https?:\/\//.test(html)) throw Error('External HTML resource found.');
console.log('Built dependency-free offline lab in dist/.');
