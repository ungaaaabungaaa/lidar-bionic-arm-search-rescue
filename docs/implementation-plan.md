# LiDAR arm bench implementation

Approved project9: Color-Detection-and-Servo-Actuation → lidar-bionic-arm-search-rescue. Original main `7c8a9005c2cc54d0f9f4b47e0c0cafdc9c199cb5` is preserved and verified remotely at `archive/before-lidar-arm-2026-10-27`. ID 769099550 / R_kgDOLdeHHg and 18 stars retained. Keep the existing Apache2.0 LICENSE unchanged. MyPortfolio remains unchanged. User-approved v3 cover9 will be copied with verified hash and portable provenance.

Deliver a dependency-free 3D LiDAR/arm software bench: seeded first-return point-cloud simulation, bounded transform/filter/voxel/Euclidean clustering, analytic four-joint IK with branch/joint-limit checks, collision-aware joint planning, certified swept-link motion and a rate-bounded quintic trajectory. A coupled-gripper proxy and a stand-off pregrasp pose explain the interface; no physical grasp or five-finger hand is claimed. Planning uses supplied conservative obstacle boxes, not a claim that a partial scan proves free space.

A browser worker/replay, CLI, real multi-scenario result record and examples share the core. A versioned bounded joint command codec/controller emulator provides neutral boot, explicit arm/stop, sequence/CRC/lease checks; it emits text and never opens a real device. No firmware, real LiDAR driver, ROS, rescue deployment, human attachment or hardware test is claimed. Include preliminary mechanical/electrical/BOM/calibration/bench documentation.

1. Preserve/rename/history/license and isolated branch; write interface and work/output bounds before code.
2. Test first: FK/IK branches, reachability, invalid transforms, sparse/noisy clusters, whole swept links, self collision, planner budgets, joint rate/acceleration, determinism and protocol faults.
3. Implement original lean JS modules, controlled scenes and measured demos with honest success/budget/failure outcomes.
4. Add accessible browser orbit/replay and text protocol builder, fixed-file loopback server, static build, README/license/security/contributing/history and primary method references.
5. Run domain/CLI/server/codec tests, reproduce all results, browser review, CI and independent root review. Commit/push/attach PR; root merges only after checks. Remove task-created sources/tools after remote preservation.

Swept safety uses analytic link-displacement bounds over joint interpolation and conservatively inflated capsule/box checks; static endpoint checks alone are insufficient. Quintic scaling is not a torque/force controller. Bound points, neighbor work, planner nodes, collision evaluations, edge subdivisions, trajectory frames and serialized bytes. Collision-free model output is not physical safety under sensor/calibration/actuator uncertainty.
