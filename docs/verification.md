# Verification record — 27 October 2026

Local Node 24 checks:20 domain/interface/CLI/server tests, static build and exact 12-run JSON/CSV/SVG reproduction passed. The tests include a real child-process loopback server and bounded regular-file inputs; no physical port is opened. A separate seeded RRT fixture checks exact endpoint reconstruction and every returned swept edge. Recorded run metrics are in reports/scenarios.json, rounded to six decimals for portable reproduction.

The parent independently reviewed the geometry, cloud pipeline, bench and protocol. Desktop browser QA checked Open reach (direct, 178 pose checks, 3.00 s, zero endpoint rates), Raised fixture (lift, 414 checks, 5.30 s), Keep-out and Beyond reach failures, and budget 1 rejection with no reference/replay. After the stale-input fix, seed, scene and budget changes each cleared the old evidence; a new run was required. The preview server was restarted after its file allowlist changed. No retained browser screenshot or narrow-viewport verification is claimed. Final local review and cross-platform CI are separate merge gates; see the repository checks.

The generated cover PNG was decoded and its SHA256 matched approved asset9: b30e65ee604d2da63cd617af8e58ad272176fe363c504615074a3441d58e849a. Portable provenance is tracked beside it. Actual run figure is generated from measured model data, not image synthesis.

No MCU firmware compilation, flashing, hardware communication, real LiDAR acquisition, physical motion/grasp, payload, human-use or rescue test occurred. Those are pending in docs/hardware.md. MyPortfolio and protected repositories are unchanged by this project.
