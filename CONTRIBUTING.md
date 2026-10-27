# Contributing

Use Node 22 or 24 and keep the core dependency-free unless a concrete need justifies a package. Explain the user-visible behavior or model limitation in a focused issue/PR. Preserve units, frame conventions and work/output ceilings in docs/contract.md. Write a meaningful regression before changing geometry, state transitions, schema or limits.

Run `npm ci --ignore-scripts`, `npm run check`, `npm run test:coverage` and `npm run demo -- --check`. Change a recorded result only when the model/configuration intentionally changes, and explain the difference. Test planned, rejected and budget cases. Review the browser on desktop and narrow viewports, keyboard controls, stale-input clearing and the text tables. Keep the generated cover separate from measured output.

Do not imply physical tests from simulation, add a paid API requirement, silently connect to hardware or remove independent safety needs. New device/firmware work requires a written protocol/hardware contract, the appropriate official toolchain checks and staged physical acceptance. Never flash a device as part of automated tests.
