# Feature queue

Delivered 28 October 2026: invalid emulator clock input clears an armed setpoint before throwing. Both `tick` and `receive` fail closed, preserve sequence history, and require explicit fresh ARM. This is a software latch check, not a motor stop or physical safety certification.

Next useful work:
- Add sensor occlusion scenes with explicit partial-observation limits.
- Expand obstacle clearance cases across full paths.
- Add bounded controller fault/recovery sequences before implementing any device adapter.
