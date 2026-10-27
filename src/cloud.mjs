// SPDX-License-Identifier: Apache-2.0
import { validateBoxes } from './arm.mjs';
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
  sub = (a, b) => a.map((v, i) => v - b[i]),
  cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  unit = (a) => {
    const length = Math.hypot(...a);
    if (length < 1e-9) throw Error('Degenerate sensor direction.');
    return a.map((v) => v / length);
  };
const dense = (value, length) =>
  Array.isArray(value) && value.length === length && Array.from(value).every(Number.isFinite);
export function transform(point, pose) {
  const r = pose.rotation;
  return [0, 1, 2].map(
    (i) =>
      r[i * 3] * point[0] + r[i * 3 + 1] * point[1] + r[i * 3 + 2] * point[2] + pose.translation[i],
  );
}
export function validateCloud(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).sort().join(',') !== 'frame,points,sensorToBase,units,version' ||
    input.version !== 1 ||
    input.frame !== 'lidar' ||
    input.units !== 'm'
  )
    throw Error('Expected v1 LiDAR cloud in metres.');
  const pose = input.sensorToBase;
  if (
    !pose ||
    Object.keys(pose).sort().join(',') !== 'rotation,translation' ||
    !dense(pose.rotation, 9) ||
    !dense(pose.translation, 3) ||
    pose.translation.some((v) => Math.abs(v) > 2)
  )
    throw Error('Invalid sensor-to-base transform.');
  const r = pose.rotation,
    rows = [r.slice(0, 3), r.slice(3, 6), r.slice(6, 9)];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (Math.abs(dot(rows[i], rows[j]) - (i === j ? 1 : 0)) > 1e-6)
        throw Error('Sensor rotation must be orthonormal.');
  if (Math.abs(dot(rows[0], cross(rows[1], rows[2])) - 1) > 1e-6)
    throw Error('Sensor rotation must have determinant+1.');
  if (
    !Array.isArray(input.points) ||
    input.points.length > 10000 ||
    Array.from(input.points).some((point) => !dense(point, 3) || point.some((v) => Math.abs(v) > 5))
  )
    throw Error('Cloud needs at most10000 finite xyz points within±5m.');
  return input;
}
export function processCloud(input) {
  validateCloud(input);
  const transformed = input.points.map((point) => transform(point, input.sensorToBase)),
    filtered = transformed.filter(
      ([x, y, z]) => Math.abs(x) <= 1.25 && Math.abs(y) <= 1.25 && z >= 0.025 && z <= 0.8,
    ),
    voxels = new Map();
  for (const point of filtered) {
    const key = point.map((v) => Math.floor(v / 0.01 + 1e-9)).join(',');
    const bucket = voxels.get(key) ?? { sum: [0, 0, 0], count: 0 };
    point.forEach((v, i) => {
      bucket.sum[i] += v;
    });
    bucket.count++;
    voxels.set(key, bucket);
  }
  const points = [...voxels.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, bucket]) => bucket.sum.map((v) => v / bucket.count));
  const tolerance = 0.035,
    bins = new Map(),
    location = (point) => point.map((v) => Math.floor(v / tolerance));
  points.forEach((point, i) => {
    const key = location(point).join(',');
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push(i);
  });
  const visited = new Uint8Array(points.length),
    clusters = [];
  let comparisons = 0;
  for (let start = 0; start < points.length; start++)
    if (!visited[start]) {
      const queue = [start];
      visited[start] = 1;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const point = points[queue[cursor]],
          cell = location(point);
        for (let dx = -1; dx <= 1; dx++)
          for (let dy = -1; dy <= 1; dy++)
            for (let dz = -1; dz <= 1; dz++)
              for (const next of bins.get([cell[0] + dx, cell[1] + dy, cell[2] + dz].join(',')) ??
                []) {
                if (++comparisons > 1000000)
                  throw Error('Cloud neighbor comparison budget exceeded.');
                if (!visited[next] && Math.hypot(...sub(point, points[next])) <= tolerance + 1e-9) {
                  visited[next] = 1;
                  queue.push(next);
                }
              }
      }
      if (queue.length >= 5) {
        const min = [0, 1, 2].map((axis) => Math.min(...queue.map((i) => points[i][axis]))),
          max = [0, 1, 2].map((axis) => Math.max(...queue.map((i) => points[i][axis])));
        clusters.push({
          id: clusters.length,
          count: queue.length,
          min,
          max,
          center: min.map((v, i) => (v + max[i]) / 2),
          size: min.map((v, i) => max[i] - v),
        });
      }
    }
  clusters.sort((a, b) => b.count - a.count || a.id - b.id);
  return {
    inputCount: input.points.length,
    filteredCount: filtered.length,
    voxelCount: points.length,
    points,
    clusters,
    neighborComparisons: comparisons,
  };
}
function rng(seed) {
  let state = seed >>> 0;
  for (let i = 0; i < 8; i++) state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function rayBox(origin, direction, box, maximum) {
  let lo = 0,
    hi = maximum;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(direction[i]) < 1e-9) {
      if (origin[i] < box.min[i] || origin[i] > box.max[i]) return null;
    } else {
      let a = (box.min[i] - origin[i]) / direction[i],
        b = (box.max[i] - origin[i]) / direction[i];
      if (a > b) [a, b] = [b, a];
      lo = Math.max(lo, a);
      hi = Math.min(hi, b);
      if (lo > hi) return null;
    }
  }
  return lo;
}
export function simulateScan(scene, { seed = 1, columns = 80, rows = 40, noise = 0.001 } = {}) {
  validateBoxes(scene.objects);
  if (
    !dense(scene.sensor, 3) ||
    !dense(scene.aim, 3) ||
    [...scene.sensor, ...scene.aim].some((v) => Math.abs(v) > 2) ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 4294967295 ||
    !Number.isInteger(columns) ||
    columns < 8 ||
    columns > 128 ||
    !Number.isInteger(rows) ||
    rows < 8 ||
    rows > 128 ||
    rows * columns > 4096 ||
    !Number.isFinite(noise) ||
    noise < 0 ||
    noise > 0.005
  )
    throw Error('Invalid bounded scan configuration.');
  const forward = unit(sub(scene.aim, scene.sensor)),
    lateral = unit(cross(Math.abs(forward[2]) > 0.99 ? [0, 1, 0] : [0, 0, 1], forward)),
    up = unit(cross(forward, lateral)),
    rotation = [0, 1, 2].flatMap((i) => [lateral[i], up[i], forward[i]]),
    sensorToBase = { rotation, translation: [...scene.sensor] },
    points = [],
    random = rng(seed);
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const ray = unit([
          Math.tan((column / (columns - 1) - 0.5) * 1.6),
          Math.tan((row / (rows - 1) - 0.5) * 1.1),
          1,
        ]),
        direction = transform(ray, { rotation, translation: [0, 0, 0] });
      let range = 1.8,
        hit = false;
      if (direction[2] < -1e-9) {
        const floor = -scene.sensor[2] / direction[2];
        if (floor >= 0 && floor < range) {
          range = floor;
          hit = true;
        }
      }
      for (const box of scene.objects) {
        const distance = rayBox(scene.sensor, direction, box, range);
        if (distance !== null && distance <= range) {
          range = distance;
          hit = true;
        }
      }
      if (hit) {
        const world = scene.sensor.map(
            (v, i) => v + direction[i] * range + (random() - 0.5) * 2 * noise,
          ),
          delta = sub(world, scene.sensor);
        points.push(
          [0, 1, 2].map(
            (i) => rotation[i] * delta[0] + rotation[i + 3] * delta[1] + rotation[i + 6] * delta[2],
          ),
        );
      }
    }
  return { version: 1, frame: 'lidar', units: 'm', sensorToBase, points };
}
