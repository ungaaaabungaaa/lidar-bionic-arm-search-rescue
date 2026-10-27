import test from 'node:test';
import assert from 'node:assert/strict';
import { processCloud, validateCloud, simulateScan } from '../src/cloud.mjs';
const identity = { rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1], translation: [0, 0, 0] },
  cloud = (points) => ({ version: 1, frame: 'lidar', units: 'm', sensorToBase: identity, points });
test('cloud validation rejects malformed transforms, units, numbers and count bounds', () => {
  for (const input of [
    { ...cloud([]), units: 'mm' },
    { ...cloud([]), sensorToBase: { ...identity, rotation: [2, 0, 0, 0, 1, 0, 0, 0, 1] } },
    cloud([[NaN, 0, 0]]),
    cloud(Array(10001).fill([0, 0, 0])),
    { ...cloud([]), extra: 1 },
  ])
    assert.throws(() => validateCloud(input));
});
test('bounded voxelization and Euclidean components recover two separated groups', () => {
  const points = [];
  for (const offset of [0.3, 0.6])
    for (let x = 0; x < 4; x++)
      for (let y = 0; y < 4; y++) points.push([offset + x * 0.012, 0.1 + y * 0.012, 0.08]);
  points.push([0, 0, 0], [4, 4, 4]);
  const result = processCloud(cloud(points));
  assert.equal(result.clusters.length, 2);
  assert.ok(result.filteredCount < points.length);
  assert.ok(result.neighborComparisons > 0);
  assert.ok(result.clusters.every((item) => item.count >= 5));
});
test('seeded first-return scans are reproducible and report a proper sensor transform', () => {
  const scene = {
    objects: [{ min: [0.35, -0.05, 0.04], max: [0.45, 0.05, 0.14] }],
    sensor: [0, -0.65, 0.6],
    aim: [0.4, 0, 0.15],
  };
  const a = simulateScan(scene, { seed: 1 }),
    b = simulateScan(scene, { seed: 1 });
  assert.deepEqual(a, b);
  validateCloud(a);
  assert.ok(a.points.length > 20);
  assert.ok(a.points.length <= 4096);
  assert.ok(processCloud(a).clusters.length > 0);
});
test('reflections, sparse data and dense-neighborhood work overflow are rejected', () => {
  assert.throws(() =>
    validateCloud({
      ...cloud([]),
      sensorToBase: { ...identity, rotation: [-1, 0, 0, 0, 1, 0, 0, 0, 1] },
    }),
  );
  assert.throws(() => validateCloud(cloud([Array(3)])));
  assert.throws(() => validateCloud(cloud(Array(2))));
  const points = [];
  for (let x = 0; x < 22; x++)
    for (let y = 0; y < 22; y++)
      for (let z = 0; z < 20; z++) points.push([0.2 + x * 0.01, -0.1 + y * 0.01, 0.04 + z * 0.01]);
  assert.throws(() => processCloud(cloud(points)), /comparison budget/);
});
