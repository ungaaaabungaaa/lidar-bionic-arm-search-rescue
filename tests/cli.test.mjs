import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { main, readCloudFile } from '../scripts/cli.mjs';
test('CLI rejects unknown options, bounds cloud bytes, preserves existing exports and emits no device operations', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'arm-cli-'));
  try {
    const cloud = path.join(dir, 'cloud.json');
    await writeFile(
      cloud,
      JSON.stringify({
        version: 1,
        frame: 'lidar',
        units: 'm',
        sensorToBase: { rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1], translation: [0, 0, 0] },
        points: [],
      }),
    );
    assert.equal(JSON.parse(await main(['scan', '--input', cloud])).inputCount, 0);
    await writeFile(cloud, ' '.repeat(2 * 1024 * 1024 + 1));
    await assert.rejects(readCloudFile(cloud), /exceeds/);
    await assert.rejects(main(['run', '--seed', 'no']));
    await assert.rejects(main(['run', '--unknown', '1']));
    await assert.rejects(main(['run', '--seed', '1', '--seed', '2']));
    const out = path.join(dir, 'existing.json');
    await writeFile(out, 'keep');
    await assert.rejects(main(['run', '--output', out]));
    assert.equal(await readFile(out, 'utf8'), 'keep');
    assert.match(
      await main(['packet', '--seq', '1', '--command', 'S']),
      /^J1,1,S,.*\*[0-9A-F]{2}\n$/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
