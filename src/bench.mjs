// SPDX-License-Identifier: Apache-2.0
import { MODEL, ik, planMotion, trajectory } from './arm.mjs';
import { simulateScan, processCloud } from './cloud.mjs';
import { sceneByName } from './scenes.mjs';
export function runBench({ scene = 'open', seed = 1, poseBudget = 25000, dt = 0.05 } = {}) {
  const definition = sceneByName(scene);
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 4294967295 ||
    !Number.isInteger(poseBudget) ||
    poseBudget < 1 ||
    poseBudget > 25000 ||
    !Number.isFinite(dt) ||
    dt < 0.02 ||
    dt > 0.1
  )
    throw Error('Invalid bounded bench configuration.');
  const cloud = simulateScan(definition, { seed }),
    processed = processCloud(cloud),
    obstacles = [...definition.objects, ...definition.keepOut],
    candidates = processed.clusters
      .filter(
        (cluster) =>
          cluster.center[2] <= 0.25 &&
          Math.max(...cluster.size) <= 0.18 &&
          Math.hypot(cluster.center[0], cluster.center[1]) >= 0.15,
      )
      .slice(0, 8)
      .map((cluster) => ({
        clusterId: cluster.id,
        count: cluster.count,
        target: [cluster.center[0], cluster.center[1], cluster.max[2] + 0.12],
        status: 'pending',
      }));
  let remaining = poseBudget,
    selected = null,
    plan = null,
    reference = null;
  const jointDistance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  for (const candidate of candidates) {
    const solutions = ik(candidate.target, -Math.PI / 2).sort(
      (a, b) => jointDistance(a, MODEL.home) - jointDistance(b, MODEL.home),
    );
    if (!solutions.length) {
      candidate.status = 'unreachable';
      continue;
    }
    for (const goal of solutions) {
      if (remaining < 1) {
        candidate.status = 'planning_budget';
        break;
      }
      const attempt = planMotion(MODEL.home, goal, obstacles, { seed, poseBudget: remaining });
      remaining = Math.max(0, remaining - attempt.evaluations);
      candidate.status = attempt.status;
      if (attempt.status === 'planned') {
        selected = candidate;
        plan = attempt;
        reference = trajectory(attempt.path, { dt });
        break;
      }
    }
    if (selected) break;
  }
  const status = selected
    ? 'planned'
    : !candidates.length
      ? 'no_candidates'
      : candidates.every((item) => item.status === 'unreachable')
        ? 'unreachable'
        : candidates.some((item) => item.status === 'planning_budget')
          ? 'planning_budget'
          : candidates.some((item) => item.status === 'start_in_collision')
            ? 'start_in_collision'
            : 'goal_in_collision';
  const metrics = {
    status,
    inputPoints: processed.inputCount,
    filteredPoints: processed.filteredCount,
    voxelPoints: processed.voxelCount,
    clusters: processed.clusters.length,
    candidates: candidates.length,
    neighborComparisons: processed.neighborComparisons,
    collisionEvaluations: poseBudget - remaining,
    method: plan?.method ?? null,
    waypoints: plan?.path.length ?? 0,
    frames: reference?.frames.length ?? 0,
    durationSeconds: reference?.duration ?? null,
    maxVelocityObserved: reference?.maxVelocityObserved ?? null,
    maxAccelerationObserved: reference?.maxAccelerationObserved ?? null,
  };
  const report = {
    schemaVersion: 1,
    scene,
    seed,
    assumptions: {
      pointCloud: 'seeded ideal first-return simulation with bounded uniform noise',
      obstacles: 'supplied conservative envelopes and virtual keep-out volumes',
      motion: 'kinematic pregrasp reference only; no object contact or hardware',
    },
    sensorToBase: cloud.sensorToBase,
    points: processed.points,
    clusters: processed.clusters,
    obstacles,
    keepOut: definition.keepOut,
    candidates,
    selected,
    plan,
    reference,
    metrics,
  };
  if (new TextEncoder().encode(JSON.stringify(report)).byteLength > 3 * 1024 * 1024)
    throw Error('Bench report exceeds3MiB.');
  return report;
}
