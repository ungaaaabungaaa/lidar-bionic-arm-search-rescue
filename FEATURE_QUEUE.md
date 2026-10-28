# Feature queue

Delivered 28 October 2026: invalid emulator clock input clears an armed setpoint before throwing. Both `tick` and `receive` fail closed, preserve sequence history, and require explicit fresh ARM. This is a software latch check, not a motor stop or physical safety certification.

Next useful work:
Delivered final round: CLI/library scene `occluded` puts a wide panel in front of the small target. Its first-return scan matches the panel-only scan at zero noise; no small candidate or motion is emitted across seeds1–3. Observed points do not establish unseen free space.

- Expand obstacle clearance cases across full paths.
- Add bounded controller fault/recovery sequences before implementing any device adapter.
