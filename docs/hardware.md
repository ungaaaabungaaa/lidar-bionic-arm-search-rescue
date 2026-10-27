# Preliminary hardware and assembly plan

This document is an engineering starting point. No arm, electronics, firmware, point-cloud sensor or physical rescue system has been assembled or tested. No person may be supported by this model. The cover is concept art and depicts more hand articulation than the software implements.

## Mechanical envelope

The [model file](model.json) is machine-readable software geometry. Base yaw rotates a plane containing 0.30 m upper arm, 0.25 m forearm and 0.10 m tool links. Shoulder height is0.15m. Capsule radii approximate envelopes only, and the hand is a 35 mm sphere. The fixed base fixture occupies x/y ±60 mm, z 0..100 mm. The moving reference has no mass, friction, backlash, cable routing or payload model. Joint axis locations, bearings, shafts, mounts and fasteners need a separate mechanical design before fabrication.

Select actuators only after a worst-case torque and stability study. For a static horizontal link, each downstream mass contributes m·g·horizontal lever arm; add link self-weight, acceleration, friction, gearing efficiency and an engineering margin chosen by the designer. This repository contains no measured mass/torque data and does not rate a payload. The bench clamp/foundation must resist both overturning and dynamic reactions. No structural or fatigue verification has been done.

## Preliminary bill of materials

| Subsystem | Candidate quantity | Acceptance before selection |
| --- | --- | --- |
| Rigid bench fixture |1 | Verified anchoring and overturning resistance |
| Yaw / shoulder / elbow / wrist actuation |4 channels | Calculated torque/speed, feedback, mechanical stops and power-off behavior |
| Link/bearing/shaft assemblies |3 links plus joints | Measured dimensions, alignment, stiffness and cable clearance |
| Gripper/hand proxy |1 optional | Independent design, travel/contact limits; not a five-finger mechanism |
| Range sensor |1 | Documented XYZ output, range/field-of-view, timestamp and calibration; no driver chosen |
| Feedback/limit sensors |Per joint | Position reference, limit behavior and fault detection |
| Controller |1 | Reviewed bounded communication, independent watchdog, verified output ordering |
| Motor drivers and supply |Matched set | Measured peak/stall current, voltage, fusing and thermal protection |
| Independent stop and power isolation |1 system | Designed and tested to remove drive energy with known safe behavior |
| Harness/connectors/strain relief |As designed | Correct current rating, grounding, shielding and movement clearance |

These are functional requirements, not a purchasing list. Exact models, prices, compatibility and pin assignments are pending. No parts were bought. A consumer hobby servo or nominal current label alone does not establish safe joint torque or stopping behavior.

## Interface allocation, not a wiring pinout

The software host processes clouds and generates checked references. A future controller must accept a reviewed protocol, enforce joint/velocity/acceleration/limit feedback, and produce the actuator-specific outputs. The sensor needs its documented data transport and measured sensor-to-base transform. A physical stop must work independently of this host application and serial link.

No MCU pins or voltages are assigned because no controller/driver has been selected. Do not invent a pin map by wiring J1 text directly to a servo or sensor. Document actual signal names, connector pins, voltage/current ratings, feedback lines, protective devices and grounding after parts and datasheets are selected. Review that schematic before applying power. The repository intentionally provides no flash/upload command.

## Staged assembly and acceptance

1. Review the mechanical design, forces, base anchoring, joint stops, controller schematic and independent stop. Build an unpowered fixture and verify clearances through the intended range by a safe manual procedure.
2. Check wiring with power removed. Confirm polarity, protective devices, insulation, signal levels and isolation. Keep actuators mechanically unloaded and the work area clear for initial powered tests.
3. Validate one drive channel at a time with current-limited bench power and independent means to stop. Prove neutral boot, output ordering, watchdog, feedback loss and limit response using the actual controller. The JavaScript latch tests do not prove this.
4. Establish encoder/home references with a reviewed procedure. Measure physical joint zero/sign/limits and link lengths; compare known-pose FK coordinates with independent measurements. Record residuals and repeatability.
5. Mount and calibrate the sensor using measured reference objects/poses. Validate a proper sensor-to-base transform, time alignment and sensor noise/occlusion. Do not use partial visible bounds as the full collision envelope.
6. Expand conservative envelopes for the measured errors, cables, tools and all unseen obstacles. Start at reduced travel and speed, no payload, and verify physical stop distance and clearances. Software collision checks are only model evidence.
7. Compare commanded and measured paths, timing, drift, thermal behavior and fault recovery. Only after review should payload/contact experiments be considered in a protected fixture. Record every physical test separately from simulation.

Physical acceptance, human proximity, field deployment and rescue suitability are all pending. The immediate deliverable is the reproducible software bench and its explicit interfaces.
