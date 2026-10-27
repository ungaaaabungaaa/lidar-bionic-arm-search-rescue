// SPDX-License-Identifier: Apache-2.0
import { writeFile, readFile } from 'node:fs/promises';
import { runBench } from '../src/bench.mjs';
const check = process.argv.slice(2).join(' ') === '--check';
if (process.argv.length > 2 && !check) throw Error('Only --check is supported.');
const records = [];
for (const scene of ['open', 'detour', 'forbidden', 'far'])
  for (const seed of [1, 2, 3]) {
    const m = runBench({ scene, seed }).metrics;
    records.push({
      scene,
      seed,
      ...Object.fromEntries(
        Object.entries(m).map(([key, v]) => [
          key,
          typeof v === 'number' ? Number(v.toFixed(6)) : v,
        ]),
      ),
    });
  }
const json =
  JSON.stringify(
    {
      schemaVersion: 1,
      note: 'Actual deterministic model runs, not physical trials. Null motion metrics mean no reference was emitted.',
      configuration: { seeds: [1, 2, 3], poseBudget: 25000, dt: 0.05 },
      records,
    },
    null,
    2,
  ) + '\n';
const keys = Object.keys(records[0]),
  csv =
    keys.join(',') +
    '\n' +
    records.map((row) => keys.map((key) => row[key] ?? '').join(',')).join('\n') +
    '\n';
let svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="690" viewBox="0 0 1000 690" role="img" aria-labelledby="title desc"><title id="title">LiDAR arm bench: twelve measured model runs</title><desc id="desc">Open scenes have direct routes, raised fixtures need a lift, keep-out and beyond-reach scenes emit no motion. Bars show model reference seconds only, not elapsed compute time.</desc><rect width="1000" height="690" fill="#f6f5ef"/><g font-family="monospace" fill="#253d32"><text x="30" y="38" font-size="24">REACH / Measured pregrasp references</text><text x="30" y="67" font-size="13">4 scenes × 3 seeds · fixed 25000-pose budget · dt 0.05 s · no hardware</text><text x="30" y="105" font-size="13">SCENE / SEED</text><text x="260" y="105" font-size="13">REFERENCE DURATION (s)</text><text x="640" y="105" font-size="13">OUTCOME / POSE CHECKS</text>';
records.forEach((row, index) => {
  const y = 137 + index * 41;
  svg += `<text x="30" y="${y}" font-size="13">${row.scene} / ${row.seed}</text>`;
  if (row.durationSeconds !== null)
    svg += `<rect x="260" y="${y - 13}" width="${row.durationSeconds * 52}" height="18" fill="${row.method === 'lift' ? '#b54c20' : '#365344'}"/><text x="${270 + row.durationSeconds * 52}" y="${y}" font-size="12">${row.durationSeconds.toFixed(2)}</text>`;
  else svg += `<text x="260" y="${y}" font-size="12">No motion reference</text>`;
  svg += `<text x="640" y="${y}" font-size="12">${row.status} / ${row.collisionEvaluations}</text>`;
});
svg +=
  '<text x="30" y="661" font-size="12">Kinematic simulation only. Failure is reported; planner limits do not prove no route exists.</text></g></svg>\n';
for (const [name, value] of [
  ['reports/scenarios.json', json],
  ['reports/scenarios.csv', csv],
  ['docs/images/measured-runs.svg', svg],
]) {
  const url = new URL('../' + name, import.meta.url);
  if (check) {
    if ((await readFile(url, 'utf8')) !== value) throw Error('Recorded result changed: ' + name);
  } else await writeFile(url, value);
}
console.log(
  `${check ? 'Reproduced' : 'Recorded'} all ${records.length} actual scenario runs, CSV and SVG.`,
);
