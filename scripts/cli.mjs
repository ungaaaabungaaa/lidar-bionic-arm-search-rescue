// SPDX-License-Identifier: Apache-2.0
import { open, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runBench } from '../src/bench.mjs';
import { processCloud } from '../src/cloud.mjs';
import { encodeFrame } from '../src/protocol.mjs';
import { MODEL } from '../src/arm.mjs';
export async function readCloudFile(filename) {
  const maximum = 2 * 1024 * 1024,
    file = await open(filename, 'r');
  try {
    if (!(await file.stat()).isFile()) throw Error('A regular cloud JSON file is required.');
    const buffer = Buffer.alloc(maximum + 1);
    let length = 0;
    while (length < buffer.length) {
      const part = await file.read(buffer, length, buffer.length - length, null);
      if (!part.bytesRead) break;
      length += part.bytesRead;
    }
    if (length > maximum) throw Error('Cloud JSON exceeds2MiB.');
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length)));
  } finally {
    await file.close();
  }
}
export async function main(args) {
  const command = args.shift(),
    options = {};
  if (!['run', 'scan', 'packet'].includes(command))
    throw Error('Usage: node scripts/cli.mjs run|scan|packet [--key value].');
  const allowed = {
    run: ['scene', 'seed', 'budget', 'output'],
    scan: ['input', 'output'],
    packet: ['seq', 'command', 'q', 'opening', 'lease'],
  }[command];
  while (args.length) {
    const flag = args.shift(),
      key = flag?.slice(2),
      value = args.shift();
    if (
      !flag?.startsWith('--') ||
      !allowed.includes(key) ||
      Object.hasOwn(options, key) ||
      value === undefined ||
      !value.length
    )
      throw Error('Unknown, duplicate or missing CLI option.');
    options[key] = value;
  }
  let result;
  if (command === 'run')
    result = runBench({
      scene: options.scene ?? 'open',
      seed: options.seed === undefined ? 1 : Number(options.seed),
      poseBudget: options.budget === undefined ? 25000 : Number(options.budget),
    });
  if (command === 'scan') {
    if (!options.input) throw Error('--input is required.');
    result = processCloud(await readCloudFile(options.input));
  }
  if (command === 'packet') {
    const q = options.q === undefined ? MODEL.home : options.q.split(',').map(Number);
    return encodeFrame({
      seq: Number(options.seq ?? 1),
      command: options.command ?? 'S',
      q,
      opening: Number(options.opening ?? 0.04),
      lease: Number(options.lease ?? 300),
    });
  }
  const serialized = JSON.stringify(result, null, 2) + '\n';
  if (options.output) {
    await writeFile(options.output, serialized, { flag: 'wx' });
    return 'Created ' + options.output + '\n';
  }
  return serialized;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(await main(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
