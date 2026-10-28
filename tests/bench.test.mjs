import test from 'node:test';
import assert from 'node:assert/strict';
import { runBench } from '../src/bench.mjs';
import { poseClear, edgeClear } from '../src/arm.mjs';
test('end-to-end scan and reach scenarios return measured outcomes with no motion on failure', () => {
  for (const [scene, status, method] of [
    ['open', 'planned', 'direct'],
    ['detour', 'planned', 'lift'],
    ['forbidden', 'goal_in_collision', null],
    ['far', 'unreachable', null],
  ]) {
    const report = runBench({ scene, seed: 1 });
    assert.equal(report.metrics.status, status);
    assert.equal(report.metrics.method, method);
    assert.ok(report.metrics.inputPoints > 0);
    assert.ok(report.metrics.collisionEvaluations <= 25000);
    if (status === 'planned') {
      assert.equal(report.metrics.frames, report.reference.frames.length);
      assert.ok(report.metrics.durationSeconds > 0);
      for (const frame of report.reference.frames)
        assert.equal(poseClear(frame.q, report.obstacles), true);
      for (let i = 1; i < report.plan.path.length; i++)
        assert.equal(
          edgeClear(report.plan.path[i - 1], report.plan.path[i], report.obstacles),
          true,
        );
      assert.ok(report.metrics.maxVelocityObserved <= 1 + 1e-9);
      assert.ok(report.metrics.maxAccelerationObserved <= 2 + 1e-9);
    } else {
      assert.equal(report.reference, null);
      assert.equal(report.plan, null);
      assert.equal(report.metrics.frames, 0);
      assert.equal(report.metrics.durationSeconds, null);
    }
  }
});
test('bench seed is reproducible; low global budget rejects rather than emitting partial motion', () => {
  assert.deepEqual(runBench({ scene: 'detour', seed: 2 }), runBench({ scene: 'detour', seed: 2 }));
  const low = runBench({ poseBudget: 1 });
  assert.equal(low.metrics.status, 'planning_budget');
  assert.equal(low.metrics.collisionEvaluations, 1);
  assert.equal(low.reference, null);
  for (const config of [
    { scene: '__proto__' },
    { seed: NaN },
    { poseBudget: 25001 },
    { dt: 0.001 },
  ])
    assert.throws(() => runBench(config));
});
test('an occluded small object is absent from first-return scans and emits no motion', async () => {
  const { sceneByName } = await import('../src/scenes.mjs');
  const { simulateScan } = await import('../src/cloud.mjs');
  const scene = sceneByName('occluded');
  assert.equal(scene.objects.length,2);
  const hidden = simulateScan(scene,{noise:0});
  const panelOnly = simulateScan({...scene,objects:[scene.objects[0]]},{noise:0});
  assert.deepEqual(hidden,panelOnly);
  for(const seed of [1,2,3]){
    const report=runBench({scene:'occluded',seed});
    assert.equal(report.metrics.status,'no_candidates');
    assert.ok(report.metrics.inputPoints>0);
    assert.ok(report.clusters.length>0);
    assert.equal(report.candidates.length,0);
    assert.equal(report.reference,null);
    assert.equal(report.metrics.collisionEvaluations,0);
  }
});
