/**
 * tests/run.mjs
 * Entry point de la suite completa.
 * Uso: node tests/run.mjs
 */

// Import all suites (order = priority)
import './suites/edge_cases.test.mjs';
import './suites/columnPacker.test.mjs';
import './suites/optimizer_mcuts.test.mjs';
import './suites/optimizer_maxutil.test.mjs';
import './suites/canvas_render.test.mjs';

import { run } from './runner.mjs';

const { totalFail } = await run();
process.exit(totalFail > 0 ? 1 : 0);
