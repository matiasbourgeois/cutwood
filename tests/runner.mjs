/**
 * tests/runner.mjs
 * Framework de test minimalista. 
 * Uso: import { suite, test, run } from './runner.mjs'
 */

const suites = [];
let currentSuite = null;

export function suite(name, fn) {
  currentSuite = { name, tests: [], time: 0 };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

export function test(name, fn) {
  currentSuite.tests.push({ name, fn });
}

/** expect helpers */
export function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeLessThanOrEqual: (expected) => {
      if (actual > expected) throw new Error(`Expected ${actual} <= ${expected}`);
    },
    toBeGreaterThanOrEqual: (expected) => {
      if (actual < expected) throw new Error(`Expected ${actual} >= ${expected}`);
    },
    toBeGreaterThan: (expected) => {
      if (actual <= expected) throw new Error(`Expected ${actual} > ${expected}`);
    },
    toBeLessThan: (expected) => {
      if (actual >= expected) throw new Error(`Expected ${actual} < ${expected}`);
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeNull: () => {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    not: {
      toBeNull: () => {
        if (actual === null) throw new Error(`Expected not null`);
      },
      toBe: (expected) => {
        if (actual === expected) throw new Error(`Expected NOT ${JSON.stringify(expected)}`);
      },
    },
    toBeTrue: () => {
      if (actual !== true) throw new Error(`Expected true, got ${JSON.stringify(actual)}`);
    },
    toBeFalse: () => {
      if (actual !== false) throw new Error(`Expected false, got ${JSON.stringify(actual)}`);
    },
  };
}

/** Run all suites and print report */
export async function run() {
  const COL_W = 34;
  console.log('');
  console.log('═'.repeat(80));
  console.log(' CutWood Engine Test Suite');
  console.log('═'.repeat(80));

  let totalPass = 0, totalFail = 0, totalMs = 0;
  const failures = [];

  for (const s of suites) {
    let pass = 0, fail = 0;
    const t0 = Date.now();

    for (const t of s.tests) {
      try {
        await t.fn();
        pass++;
      } catch (e) {
        fail++;
        failures.push({ suite: s.name, test: t.name, error: e.message });
      }
    }

    const ms = Date.now() - t0;
    totalPass += pass; totalFail += fail; totalMs += ms;

    const status = fail === 0 ? '✅' : '❌';
    const total = pass + fail;
    const name = s.name.padEnd(COL_W);
    const passStr = String(pass).padStart(4);
    const failStr = String(fail).padStart(4);
    const msStr   = String(ms + 'ms').padStart(7);
    console.log(` ${status} ${name} | PASS:${passStr} | FAIL:${failStr} | ${msStr}`);
  }

  console.log('─'.repeat(80));
  const icon = totalFail === 0 ? '🎉' : '🚨';
  console.log(` ${icon} ${'TOTAL'.padEnd(COL_W+3)} | PASS:${String(totalPass).padStart(4)} | FAIL:${String(totalFail).padStart(4)} | ${String(totalMs + 'ms').padStart(7)}`);
  console.log('═'.repeat(80));

  if (failures.length > 0) {
    console.log('');
    console.log(' DETALLES DE FALLOS:');
    console.log('─'.repeat(80));
    for (const f of failures) {
      console.log(` ❌ [${f.suite}] › ${f.test}`);
      console.log(`    ${f.error}`);
    }
    console.log('');
  } else {
    console.log(' Todos los tests pasaron. 🚀');
    console.log('');
  }

  return { totalPass, totalFail };
}
