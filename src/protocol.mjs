// SPDX-License-Identifier: Apache-2.0
import { validQ } from './arm.mjs';
const uint = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
export function crc8(text) {
  let crc = 0;
  for (const ch of text) {
    crc ^= ch.charCodeAt(0);
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 128 ? 7 : 0)) & 255;
  }
  return crc;
}
function validate({ seq, command, q, opening, lease }) {
  if (
    !uint(seq, 65535) ||
    !['A', 'M', 'S'].includes(command) ||
    !validQ(q) ||
    !Number.isFinite(opening) ||
    opening < 0 ||
    opening > 0.08 ||
    !Number.isInteger(lease) ||
    lease < 100 ||
    lease > 500
  )
    throw Error('Invalid bounded J1 fields.');
}
export function encodeFrame(value) {
  validate(value);
  const body = [
    'J1',
    value.seq,
    value.command,
    ...value.q.map((v) => Math.trunc(v * 1000)),
    Math.trunc(value.opening * 1000),
    value.lease,
  ].join(',');
  return body + '*' + crc8(body).toString(16).toUpperCase().padStart(2, '0') + '\n';
}
export function decodeFrame(wire) {
  if (
    typeof wire !== 'string' ||
    wire.length > 96 ||
    !/^J1,\d{1,5},[AMS],-?\d{1,4},-?\d{1,4},-?\d{1,4},-?\d{1,4},\d{1,2},\d{3}\*[0-9A-F]{2}\r?\n$/.test(
      wire,
    )
  )
    throw Error('Malformed or oversized J1 frame.');
  const [body, suffix] = wire.split('*');
  if (crc8(body) !== Number.parseInt(suffix.slice(0, 2), 16)) throw Error('J1 CRC mismatch.');
  const fields = body.split(','),
    value = {
      seq: Number(fields[1]),
      command: fields[2],
      q: fields.slice(3, 7).map((v) => Number(v) / 1000),
      opening: Number(fields[7]) / 1000,
      lease: Number(fields[8]),
    };
  validate(value);
  return value;
}
/** Setpoint latch emulator only: no motor driver, feedback loop or device port. */
export class SafetyLatch {
  constructor(current) {
    if (!validQ(current)) throw Error('Known current pose required.');
    this.current = [...current];
    this.armed = false;
    this.output = null;
    this.sequence = null;
    this.acceptedAt = 0;
    this.lease = 0;
    this.reason = 'neutral_boot';
  }
  stop(reason) {
    this.armed = false;
    this.output = null;
    this.reason = reason;
  }
  snapshot() {
    return {
      armed: this.armed,
      output: this.output ? { q: [...this.output.q], opening: this.output.opening } : null,
      reason: this.reason,
    };
  }
  tick(now) {
    if (!uint(now, 0xffffffff)) throw Error('Clock must be uint32 milliseconds.');
    if (this.armed && (now - this.acceptedAt) >>> 0 >= this.lease) this.stop('lease_expired');
    return this.snapshot();
  }
  receive(wire, now) {
    this.tick(now);
    let value;
    try {
      value = decodeFrame(wire);
    } catch {
      this.stop('invalid_frame');
      return this.snapshot();
    }
    if (value.command === 'S') {
      this.stop('stop');
      return this.snapshot();
    }
    const delta = this.sequence === null ? 1 : (value.seq - this.sequence + 65536) % 65536;
    if (delta === 0 || delta >= 32768) {
      this.stop('stale_sequence');
      return this.snapshot();
    }
    this.sequence = value.seq;
    if (value.command === 'A') {
      if (value.q.some((q, i) => Math.abs(q - this.current[i]) > 0.01)) {
        this.stop('arm_pose_mismatch');
        return this.snapshot();
      }
      this.armed = true;
    } else if (!this.armed) {
      this.stop('unarmed');
      return this.snapshot();
    }
    this.output = { q: [...value.q], opening: value.opening };
    this.acceptedAt = now;
    this.lease = value.lease;
    this.reason = 'accepted';
    return this.snapshot();
  }
}
