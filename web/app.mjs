// SPDX-License-Identifier: Apache-2.0
import { MODEL, fk } from './src/arm.mjs';
import { SCENES } from './src/scenes.mjs';
import { encodeFrame } from './src/protocol.mjs';
const $ = (id) => document.getElementById(id),
  canvas = $('view'),
  ctx = canvas.getContext('2d');
let report = null,
  index = 0,
  playing = false,
  previous = 0,
  worker = null;
const messages = {
  planned: 'A full checked pregrasp route is available. Replay has no object contact.',
  goal_in_collision:
    'The pregrasp pose intersects a configured obstacle or keep-out volume. No motion reference was emitted.',
  unreachable: 'No joint-limited IK pose reaches this target. No motion reference was emitted.',
  planning_budget:
    'The finite planning budget was reached. No motion reference was emitted; this does not prove no route exists.',
  start_in_collision: 'The configured home pose is in collision. No motion reference was emitted.',
  no_candidates: 'No cluster met the small-object rules. No motion reference was emitted.',
};
function help() {
  $('scene-help').textContent = SCENES[$('scene').value].description;
}
function frame() {
  return (
    report?.reference?.frames[index] ?? {
      time: 0,
      q: MODEL.home,
      velocity: [0, 0, 0, 0],
      acceleration: [0, 0, 0, 0],
      tcp: fk(MODEL.home)[3],
    }
  );
}
function project(point) {
  const az = (Number($('azimuth').value) * Math.PI) / 180,
    el = (Number($('elevation').value) * Math.PI) / 180,
    [x, y, z] = point;
  return [
    canvas.width * 0.46 + 480 * (-Math.sin(az) * x + Math.cos(az) * y),
    canvas.height * 0.73 -
      480 * (z * Math.cos(el) - (Math.cos(az) * x + Math.sin(az) * y) * Math.sin(el)),
  ];
}
function line(a, b, color, width = 1, dash = []) {
  const p = project(a),
    q = project(b);
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.moveTo(...p);
  ctx.lineTo(...q);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
}
function dot(point, color, r = 3) {
  ctx.beginPath();
  ctx.arc(...project(point), r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
function box(box, color, dashed = false) {
  const vertices = [];
  for (let x = 0; x < 2; x++)
    for (let y = 0; y < 2; y++)
      for (let z = 0; z < 2; z++)
        vertices.push([
          x ? box.max[0] : box.min[0],
          y ? box.max[1] : box.min[1],
          z ? box.max[2] : box.min[2],
        ]);
  for (let i = 0; i < 8; i++)
    for (const bit of [1, 2, 4])
      if ((i & bit) === 0) line(vertices[i], vertices[i | bit], color, 1.5, dashed ? [5, 4] : []);
}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = -5; i <= 10; i++) {
    const n = i / 10;
    line([-0.5, n, 0], [1, n, 0], '#eef0eb');
    line([n, -0.5, 0], [n, 1, 0], '#eef0eb');
  }
  line([0, 0, 0], [0.2, 0, 0], '#647d6e', 2);
  line([0, 0, 0], [0, 0.2, 0], '#647d6e', 2);
  line([0, 0, 0], [0, 0, 0.2], '#647d6e', 2);
  ctx.font = '13px Arial';
  ctx.fillStyle = '#617169';
  for (const [p, label] of [
    [[0.22, 0, 0], 'x'],
    [[0, 0.22, 0], 'y'],
    [[0, 0, 0.22], 'z'],
  ])
    ctx.fillText(label, ...project(p));
  box({ min: [-0.06, -0.06, 0], max: [0.06, 0.06, 0.1] }, '#a9b2a9');
  if (report) {
    for (const obstacle of report.obstacles)
      box(
        obstacle,
        report.keepOut.includes(obstacle) ? '#b02b47' : '#a5afa5',
        report.keepOut.includes(obstacle),
      );
    for (const point of report.points) dot(point, '#c64f1c', 2.5);
    if (report.reference) {
      for (let i = 1; i <= index; i++)
        line(report.reference.frames[i - 1].tcp, report.reference.frames[i].tcp, '#dfb69f', 2);
    }
    for (const candidate of report.candidates) {
      const p = candidate.target;
      line([p[0] - 0.018, p[1], p[2]], [p[0] + 0.018, p[1], p[2]], '#b34513', 2);
      line([p[0], p[1] - 0.018, p[2]], [p[0], p[1] + 0.018, p[2]], '#b34513', 2);
      line([p[0], p[1], p[2] - 0.018], [p[0], p[1], p[2] + 0.018], '#b34513', 2);
    }
  }
  const points = fk(frame().q);
  for (let i = 1; i < points.length; i++)
    line(points[i - 1], points[i], '#263d32', i === 1 ? 12 : i === 2 ? 10 : 7);
  for (const point of points) dot(point, '#263d32', 7);
  dot(points[3], '#b34513', 10);
  ctx.fillStyle = '#62716a';
  ctx.font = '14px Arial';
  ctx.fillText('BASE FRAME / metres / orthographic view', 20, canvas.height - 20);
}
function update() {
  $('packet-text').textContent = 'No frame built for this pose.';
  const f = frame();
  $('frame').value = String(index);
  $('frame-label').textContent = report?.reference
    ? `${index} / ${report.reference.frames.length - 1}`
    : '—';
  $('time').textContent = f.time.toFixed(2) + ' s';
  $('joints').replaceChildren();
  for (let i = 0; i < 4; i++) {
    const tr = document.createElement('tr');
    for (const text of [
      ['Base yaw', 'Shoulder', 'Elbow', 'Wrist'][i],
      f.q[i].toFixed(3),
      f.velocity[i].toFixed(3),
      f.acceleration[i].toFixed(3),
    ]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    $('joints').append(tr);
  }
  $('tcp').textContent =
    `TCP xyz: ${f.tcp.map((v) => v.toFixed(3)).join(', ')} m${report?.reference ? '' : ' · parked model only'}`;
  draw();
}
function stop() {
  playing = false;
  $('play').textContent = 'Play';
}
function invalidate(message = 'Inputs changed. Run again.') {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  stop();
  report = null;
  index = 0;
  $('run').disabled = false;
  for (const id of ['play', 'step', 'frame', 'export']) $(id).disabled = true;
  $('frame').max = '0';
  $('packet-text').textContent = 'No frame built.';
  for (const id of ['points', 'route', 'duration', 'rates']) $(id).textContent = '—';
  $('candidates').replaceChildren();
  $('status').textContent = message;
  $('outcome').textContent = 'No current result. Run the bench with these inputs.';
  update();
}
function load(value) {
  report = value;
  index = 0;
  stop();
  const m = value.metrics,
    has = Boolean(value.reference);
  $('status').textContent = m.status.replaceAll('_', ' ');
  $('outcome').textContent = messages[m.status];
  $('points').textContent = `${m.inputPoints} / ${m.voxelPoints}`;
  $('route').textContent = `${m.method ?? 'none'} / ${m.collisionEvaluations}`;
  $('duration').textContent =
    m.durationSeconds === null ? 'No reference' : m.durationSeconds.toFixed(2) + ' s';
  $('rates').textContent =
    m.maxVelocityObserved === null
      ? '—'
      : m.maxVelocityObserved.toFixed(3) + ' / ' + m.maxAccelerationObserved.toFixed(3);
  $('frame').max = String((value.reference?.frames.length ?? 1) - 1);
  for (const id of ['play', 'step', 'frame']) $(id).disabled = !has;
  $('export').disabled = false;
  $('candidates').replaceChildren();
  for (const c of value.candidates) {
    const tr = document.createElement('tr');
    for (const text of [String(c.clusterId), String(c.count), c.status.replaceAll('_', ' ')]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    $('candidates').append(tr);
  }
  if (!value.candidates.length) {
    const tr = document.createElement('tr'),
      td = document.createElement('td');
    td.colSpan = 3;
    td.textContent = 'No eligible clusters.';
    tr.append(td);
    $('candidates').append(tr);
  }
  update();
}
$('config').addEventListener('submit', (event) => {
  event.preventDefault();
  invalidate('Processing scan…');
  for (const id of ['run', 'play', 'step', 'frame', 'export']) $(id).disabled = true;
  $('status').textContent = 'Processing scan…';
  $('outcome').textContent = 'Work is bounded. Planning runs in a separate browser worker.';
  update();
  worker = new Worker('/worker.mjs', { type: 'module' });
  worker.onmessage = ({ data }) => {
    $('run').disabled = false;
    worker.terminate();
    worker = null;
    if (data.error) {
      $('status').textContent = 'Run rejected';
      $('outcome').textContent = data.error;
      return;
    }
    load(data.report);
  };
  worker.onerror = () => {
    $('run').disabled = false;
    $('status').textContent = 'Run failed';
    $('outcome').textContent =
      'The local worker could not run. Check that the application is served with its source files.';
    worker?.terminate();
    worker = null;
  };
  worker.postMessage({
    scene: $('scene').value,
    seed: Number($('seed').value),
    poseBudget: Number($('budget').value),
  });
});
$('scene').addEventListener('change', () => {
  help();
  invalidate();
});
for (const id of ['seed', 'budget']) $(id).addEventListener('input', () => invalidate());
for (const id of ['azimuth', 'elevation']) $(id).addEventListener('input', draw);
$('frame').addEventListener('input', () => {
  stop();
  index = Number($('frame').value);
  update();
});
$('step').addEventListener('click', () => {
  stop();
  index = Math.min(index + 1, report.reference.frames.length - 1);
  update();
});
$('play').addEventListener('click', () => {
  if (playing) {
    stop();
    return;
  }
  if (index === report.reference.frames.length - 1) index = 0;
  playing = true;
  previous = 0;
  $('play').textContent = 'Pause';
});
function animate(now) {
  if (playing) {
    if (!previous) previous = now;
    if (now - previous >= 50) {
      const jump = Math.floor((now - previous) / 50);
      index = Math.min(index + jump, report.reference.frames.length - 1);
      previous += jump * 50;
      update();
      if (index === report.reference.frames.length - 1) stop();
    }
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
$('export').addEventListener('click', () => {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2) + '\n'], { type: 'application/json' }),
    ),
    a = document.createElement('a');
  a.href = url;
  a.download = `arm-${report.scene}-seed-${report.seed}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
help();
update();

$('packet').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    $('packet-text').textContent = encodeFrame({
      seq: Number($('sequence').value),
      command: $('command').value,
      q: frame().q,
      opening: Number($('opening').value) / 1000,
      lease: Number($('lease').value),
    });
  } catch (error) {
    $('packet-text').textContent = error.message;
  }
});
