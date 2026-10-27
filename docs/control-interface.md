# Data and control interfaces

## Cloud file

A regular UTF8 JSON file must be at most2MiB, with exactly these keys:

```json
{
  "version": 1,
  "frame": "lidar",
  "units": "m",
  "sensorToBase": {
    "rotation": [1,0,0,0,1,0,0,0,1],
    "translation": [0,0,0]
  },
  "points": [[0.4,0.02,0.1]]
}
```

The row-major proper rotation maps sensor XYZ to base XYZ, followed by translation in metres. Rotation rows must be orthonormal and determinant+1 within 1e-6. Translation is bounded to ±2 m; at most 10,000 dense finite XYZ vectors, each component within±5m. Unknown top-level/transform keys, reflections, invalid units, sparse library arrays, nonfinite numbers and malformed data are rejected. CLI byte limits apply before JSON parsing; library callers must supply a validated-size in-memory object.

Processing keeps |x|,|y|≤1.25m and0.025≤z≤0.8m, voxelizes into0.01m cells and clusters at 0.035 m. Clusters need at least 5 voxel centroids. The neighbor-comparison ceiling is1,000,000 globally per cloud. The ground filter is fixed bench knowledge, not plane estimation. A new calibration must be measured, not guessed from the cover image. `scan` only returns processed observations; an imported partial scan does not become a collision map.

## J1 setpoint text

```text
J1,SEQ,CMD,Q0,Q1,Q2,Q3,OPEN,LEASE*HH\n
```

SEQ is uint16 decimal; CMD is A(ARM), M(SETPOINT) or S(STOP). Q0..Q3 are signed integer milliradians within the model limits, OPEN is 0..80 millimetres, LEASE is 100..500 milliseconds. No spaces or additional fields are accepted. The entire input is at most96 ASCII characters; a trailing LF is required, CRLF also accepted. HH is two uppercase hexadecimal digits: CRC8 polynomial 0x07, initial 0, no reflection or final xor, over all characters before `*`. Test vector `123456789` produces F4. The encoder truncates angle/opening conversions toward zero so quantization does not exceed joint limits.

The `SafetyLatch` class is a setpoint emulator, not firmware or a tracking controller:

- Boot has no output. ARM requires a supplied known current pose and a matching target within 0.01 rad per joint. The simulator cannot measure a physical current pose.
- ARM/M accept forward sequence deltas 1..32767 modulo 65536. Duplicate/backward/ambiguous-half-range sequence input drops output. Accepted sequence history remains after a fault.
- Invalid/oversized frames drop output. M while unarmed drops output. STOP drops output even with a stale sequence; it cannot start motion.
- The uint32 millisecond clock handles wrap. Lease expiry is checked **before** processing another frame. A late M cannot revive an expired latch; explicit fresh ARM is required.
- Output is a copied target pose/opening only. No acceleration control, servo pulses, feedback, inverse dynamics, homing or port is implemented here. The trajectory module separately creates a checked kinematic reference; arbitrary protocol targets are not implicitly collision checked.

The browser and CLI only generate text. Do not route it to an unreviewed actuator controller. A future controller needs independent limits, real feedback, safe stopping hardware, bounded streaming parsing, verified neutral output and bench tests. The emulator is not that controller.

## Library and result structure

`runBench({scene,seed,poseBudget,dt})` supports four fixed scenes, uint32 seeds,1..25000 global pose checks and dt0.02..0.1s. Reference limits are1rad/s and2rad/s². `planMotion` additionally bounds total RRT nodes to 1000, iterations to 1000 and accepted waypoints to 64. Each edge has at most512 certified subsegments. Reference output is limited to 3001 frames and the serialized run report to 3 MiB.

Reports include configuration/assumptions, transformed voxel points, clusters, candidate targets/statuses, supplied obstacles/virtual keep-outs, accepted plan/reference if any, and actual operation counts. `planned` is the only outcome with a motion reference. Other outcomes are no_candidates, unreachable, start_in_collision, goal_in_collision and planning_budget. The latter includes search, node, edge and global work limits; it is not proof of geometric impossibility. `pending` candidates after a selected target were not evaluated. Duration is analytic reference time; it does not measure compute latency.
