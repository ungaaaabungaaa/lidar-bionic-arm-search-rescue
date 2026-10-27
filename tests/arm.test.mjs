import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL,
  fk,
  ik,
  poseClear,
  edgeClear,
  trajectory,
  planMotion,
  makeBudget,
} from '../src/arm.mjs';
const norm = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
test('FK and analytic IK agree in 3D and reject unreachable or invalid targets', () => {
  const q = [0.4, 0.7, -1.1, -0.4],
    points = fk(q),
    solutions = ik(points[3], q[1] + q[2] + q[3]);
  assert.ok(solutions.length);
  for (const solution of solutions) assert.ok(norm(fk(solution)[3], points[3]) < 1e-8);
  assert.deepEqual(ik([2, 0, 0.3], 0), []);
  assert.throws(() => fk([NaN, 0, 0, 0]));
  assert.throws(() => ik([0, 0, Infinity], 0));
});
test('full swept-link checks catch an intermediate obstacle with clear endpoints', () => {
  const a = [-0.7, 0.8, -1.2, 0.4],
    b = [0.7, 0.8, -1.2, 0.4],
    mid = fk([0, 0.8, -1.2, 0.4])[2];
  const obstacle = { min: mid.map((v) => v - 0.015), max: mid.map((v) => v + 0.015) };
  assert.equal(poseClear(a, [obstacle]), true);
  assert.equal(poseClear(b, [obstacle]), true);
  assert.equal(edgeClear(a, b, [obstacle], makeBudget()), false);
  assert.equal(edgeClear(a, b, [], makeBudget()), true);
});
test('joint limits, floor and self collision reject invalid poses', () => {
  assert.equal(poseClear([4, 0, 0, 0], []), false);
  assert.equal(poseClear([0, -1, 0, 0], []), false);
  assert.equal(poseClear(MODEL.home, []), true);
});
test('quintic references obey analytic velocity/acceleration limits and zero endpoints', () => {
  const goal = [0.5, 0.6, -0.8, -0.5],
    result = trajectory([MODEL.home, goal]);
  assert.ok(result.frames.length > 2);
  for (const frame of result.frames) {
    assert.ok(frame.velocity.every((v) => Math.abs(v) <= 1 + 1e-8));
    assert.ok(frame.acceleration.every((v) => Math.abs(v) <= 2 + 1e-8));
  }
  assert.ok(result.frames[0].velocity.every((v) => v === 0));
  assert.ok(result.frames.at(-1).velocity.every((v) => Math.abs(v) < 1e-8));
  assert.ok(norm(result.frames.at(-1).q, goal) < 1e-8);
});
test('planner is deterministic, respects work budget and never returns unsafe failed paths', () => {
  const goal = ik([0.43, 0.05, 0.25], -Math.PI / 2)[0];
  assert.ok(goal);
  const a = planMotion(MODEL.home, goal, [], { seed: 3 }),
    b = planMotion(MODEL.home, goal, [], { seed: 3 });
  assert.deepEqual(a, b);
  assert.equal(a.status, 'planned');
  const blocked = planMotion(MODEL.home, goal, [{ min: [-0.7, -0.7, 0.1], max: [0.7, 0.7, 0.7] }]);
  assert.equal(blocked.status, 'start_in_collision');
  assert.equal(blocked.path, null);
  assert.equal(planMotion(MODEL.home, goal, [], { poseBudget: 1 }).status, 'planning_budget');
});
test('IK considers folded poses whose TCP radial coordinate is behind the base axis', () => {
  const q = [0, 2, 0.15, -1];
  assert.equal(poseClear(q, []), true);
  const target = fk(q)[3],
    solutions = ik(target, q[1] + q[2] + q[3]);
  assert.ok(solutions.some((solution) => norm(fk(solution)[3], target) < 1e-8));
});

test('sparse joint vectors are rejected by exported helpers', () => {
  assert.throws(() => fk(Array(4)));
  assert.equal(poseClear(Array(4), []), false);
});

test('IK preserves a valid wrapped tool pitch', () => {
  const q = [0, 1.5, 1, 1],
    target = fk(q)[3],
    pitch = Math.atan2(Math.sin(3.5), Math.cos(3.5));
  assert.equal(poseClear(q, []), true);
  assert.ok(
    ik(target, pitch).some((candidate) => Math.hypot(...candidate.map((v, i) => v - q[i])) < 1e-7),
  );
});

test('bidirectional RRT reconstruction connects exact endpoints with checked edges', () => {
  const goal = [1.58, 1.14, -1.4, 0.33],
    boxes = [{ min: [0.14, 0.184, 0.344], max: [0.233, 0.277, 0.436] }];
  const first = planMotion(MODEL.home, goal, boxes, { seed: 11 });
  assert.equal(first.status, 'planned');
  assert.equal(first.method, 'rrt');
  assert.deepEqual(first, planMotion(MODEL.home, goal, boxes, { seed: 11 }));
  assert.deepEqual(first.path[0], MODEL.home);
  assert.deepEqual(first.path.at(-1), goal);
  assert.ok(first.path.length <= 64);
  for (let i = 1; i < first.path.length; i++)
    assert.equal(edgeClear(first.path[i - 1], first.path[i], boxes), true);
});
