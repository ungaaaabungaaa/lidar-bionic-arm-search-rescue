// SPDX-License-Identifier: Apache-2.0
import { runBench } from './src/bench.mjs';
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ report: runBench(data) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
