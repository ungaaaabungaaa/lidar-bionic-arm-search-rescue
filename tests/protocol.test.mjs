import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL } from '../src/arm.mjs';
import { encodeFrame, decodeFrame, crc8, SafetyLatch } from '../src/protocol.mjs';
const packet = (seq, command = 'A', extra = {}) =>
  encodeFrame({ seq, command, q: MODEL.home, opening: 0.04, lease: 300, ...extra });
test('bounded protocol round trips quantized units and known CRC vector', () => {
  assert.equal(crc8('123456789'), 0xf4);
  const wire = packet(65535),
    value = decodeFrame(wire);
  assert.equal(value.seq, 65535);
  assert.equal(value.command, 'A');
  assert.equal(value.opening, 0.04);
  assert.equal(value.lease, 300);
  value.q.forEach((q, i) => assert.ok(Math.abs(q - MODEL.home[i]) < 0.001));
  assert.equal(decodeFrame(wire.replace('\n', '\r\n')).seq, 65535);
  for (const bad of [
    wire.replace('J1', 'J2'),
    wire.replace('*', '*0'),
    wire.replace(',A,', ',M,'),
    'x'.repeat(97),
    wire.slice(0, -1),
    wire + 'more',
  ])
    assert.throws(() => decodeFrame(bad));
  assert.throws(() => packet(1, 'A', { q: [NaN, 0, 0, 0] }));
  assert.throws(() => packet(1, 'A', { lease: 501 }));
});
test('latch starts neutral, requires arm at known pose and drops output on corruption', () => {
  const latch = new SafetyLatch(MODEL.home);
  assert.equal(latch.tick(0).output, null);
  assert.equal(latch.receive(packet(1, 'M'), 0).armed, false);
  assert.equal(latch.receive(packet(2, 'A', { q: [0, 1, -1, 0] }), 1).output, null);
  assert.equal(latch.receive(packet(3), 2).armed, true);
  assert.equal(latch.receive(packet(4, 'M', { q: [0.2, 1, -1, 0] }), 3).output.q[0], 0.2);
  assert.equal(latch.receive('bad', 4).output, null);
  assert.equal(latch.tick(5).armed, false);
});
test('freshness, STOP, lease expiry before late commands and uint32 clock wrap fail closed', () => {
  const latch = new SafetyLatch(MODEL.home);
  latch.receive(packet(65535), 0xfffffff0);
  assert.equal(latch.receive(packet(0, 'M'), 0xfffffff1).armed, true);
  assert.equal(latch.receive(packet(0, 'M'), 0xfffffff2).output, null);
  latch.receive(packet(1), 0xfffffff3);
  assert.equal(latch.tick(0x120).output, null);
  assert.equal(latch.receive(packet(2, 'M'), 0x121).output, null);
  latch.receive(packet(3), 0x122);
  assert.equal(latch.receive(packet(0, 'S'), 0x123).output, null);
  assert.throws(() => latch.tick(-1));
});
test('invalid clock input clears a latched output before rejecting and requires re-arm', () => {
  for (const now of [-1, 0.5, 0x100000000, NaN, Infinity]) {
    for (const method of ['tick', 'receive']) {
      const latch = new SafetyLatch(MODEL.home);
      assert.equal(latch.receive(packet(1), 0).armed, true);
      assert.throws(() => method === 'tick' ? latch.tick(now) : latch.receive(packet(2, 'M'), now), /Clock/);
      assert.deepEqual(latch.snapshot(), { armed: false, output: null, reason: 'invalid_clock' });
      assert.equal(latch.sequence, 1);
      assert.equal(latch.receive(packet(2, 'M'), 1).reason, 'unarmed');
      assert.equal(latch.receive(packet(3), 2).armed, true);
    }
  }
});
