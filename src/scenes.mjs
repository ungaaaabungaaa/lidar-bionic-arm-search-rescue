// SPDX-License-Identifier: Apache-2.0
const box = (min, max) => Object.freeze({ min: Object.freeze(min), max: Object.freeze(max) });
const small = box([0.4, -0.05, 0.04], [0.48, 0.03, 0.12]);
export const SCENES = Object.freeze({
  open: Object.freeze({
    name: 'Open reach',
    description: 'A visible small object with a clear pregrasp route.',
    objects: [small],
    keepOut: [],
    sensor: [0, -0.65, 0.6],
    aim: [0.44, -0.01, 0.1],
  }),
  detour: Object.freeze({
    name: 'Raised fixture',
    description:
      'A raised obstacle can block direct joint motion; a checked lift route is available.',
    objects: [
      box([0.18, 0.34, 0.04], [0.26, 0.42, 0.13]),
      box([0.3, 0.14, 0.34], [0.35, 0.2, 0.4]),
    ],
    keepOut: [],
    sensor: [0, -0.65, 0.6],
    aim: [0.22, 0.38, 0.1],
  }),
  forbidden: Object.freeze({
    name: 'Keep-out volume',
    description:
      'A visible object has a pregrasp pose inside a configured virtual exclusion volume.',
    objects: [small],
    keepOut: [box([0.37, -0.1, 0.18], [0.52, 0.08, 0.31])],
    sensor: [0, -0.65, 0.6],
    aim: [0.44, -0.01, 0.1],
  }),
  occluded: Object.freeze({
    name: 'Occluded small object',
    description:
      'A front panel hides the small object. First-return observations do not reveal the object or prove unseen space is empty.',
    objects: [box([0.05, -0.3, 0.025], [0.65, -0.28, 0.7]), small],
    keepOut: [],
    sensor: [0, -0.65, 0.6],
    aim: [0.44, -0.01, 0.1],
  }),
  far: Object.freeze({
    name: 'Beyond reach',
    description: 'The scan sees an object outside the arm kinematic workspace.',
    objects: [box([0.86, -0.05, 0.04], [0.96, 0.05, 0.14])],
    keepOut: [],
    sensor: [0, -0.65, 0.65],
    aim: [0.9, 0, 0.12],
  }),
});
export function sceneByName(name) {
  if (!Object.hasOwn(SCENES, name)) throw Error('Unknown scene.');
  return SCENES[name];
}
