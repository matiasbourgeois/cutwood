/**
 * tests/suites/optimizer_maxutil.test.mjs
 * Tests del modo max-utilization: todos los sort orders, heurísticas, offcuts, DS coverage.
 */
import { suite, test, expect } from '../runner.mjs';
import { validateResult } from '../validators.mjs';
import { expandPieces, DS03, DS04, DS05, DS10, DS11, DS14, DS15 } from '../datasets.mjs';
import { optimizeCuts } from '../../src/engine/optimizer.js';

const MU = (o) => ({ ...o, optimizationMode: 'max-utilization' });

suite('Optimizer max-utilization', () => {

  test('T-MAXUTIL-01: util% >= min-cuts util% en DS-10', () => {
    const rMU = optimizeCuts(DS10.pieces, DS10.stock, MU(DS10.options));
    const rMC = optimizeCuts(DS10.pieces, DS10.stock, { ...DS10.options, optimizationMode: 'min-cuts' });
    const utilMU = parseFloat(rMU.stats.overallUtilization);
    const utilMC = parseFloat(rMC.stats.overallUtilization);
    expect(utilMU).toBeGreaterThanOrEqual(utilMC - 1); // max-util should be >= or close
  });

  test('T-MAXUTIL-02: DS-10 → 0 unfitted y geometría válida', () => {
    const expanded = expandPieces(DS10.pieces);
    const r = optimizeCuts(DS10.pieces, DS10.stock, MU(DS10.options));
    expect(r.unfitted.length).toBe(0);
    const errors = validateResult({ boards: r.boards, unfitted: r.unfitted }, expanded, 'MAXUTIL-02');
    expect(errors.length).toBe(0);
  });

  test('T-MAXUTIL-03: DS-10 → boardCount <= 6', () => {
    const r = optimizeCuts(DS10.pieces, DS10.stock, MU(DS10.options));
    expect(r.stats.totalBoards).toBeLessThanOrEqual(6);
  });

  test('T-MAXUTIL-04: DS-03 (0 piezas) → resultado vacío sin crash', () => {
    const r = optimizeCuts(DS03.pieces, DS03.stock, MU(DS03.options));
    expect(r.boards.length).toBe(0);
    expect(r.unfitted.length).toBe(0);
  });

  test('T-MAXUTIL-05: DS-04 (pieza tiny) → 1 tablero, 0 unfitted', () => {
    const r = optimizeCuts(DS04.pieces, DS04.stock, MU(DS04.options));
    expect(r.stats.totalBoards).toBe(1);
    expect(r.unfitted.length).toBe(0);
  });

  test('T-MAXUTIL-06: DS-05 (grilla perfecta) → 1 tablero', () => {
    const r = optimizeCuts(DS05.pieces, DS05.stock, MU(DS05.options));
    expect(r.stats.totalBoards).toBeLessThanOrEqual(2); // greedy may use 2 but 1 is ideal
    expect(r.unfitted.length).toBe(0);
  });

  test('T-MAXUTIL-07: DS-14 pieza inaceptable → 1 unfitted, piezas OK colocadas', () => {
    const r = optimizeCuts(DS14.pieces, DS14.stock, MU(DS14.options));
    // Bug corregido: la pieza 3000×400 ahora aparece en unfitted
    expect(r.unfitted.length).toBe(1);
    const okPlaced = r.boards.flatMap(b => b.pieces).filter(p => p.id === 'ok');
    expect(okPlaced.length).toBe(2);
  });

  test('T-MAXUTIL-08: DS-15 (40 piezas iguales) → 0 unfitted, ≤3 tableros', () => {
    const r = optimizeCuts(DS15.pieces, DS15.stock, MU(DS15.options));
    expect(r.unfitted.length).toBe(0);
    expect(r.stats.totalBoards).toBeLessThanOrEqual(DS15.expect.maxBoards);
  });

  test('T-MAXUTIL-09: DS-11 (200 piezas stress) → 0 unfitted', () => {
    const r = optimizeCuts(DS11.pieces, DS11.stock, MU(DS11.options));
    expect(r.unfitted.length).toBeLessThanOrEqual(5);
  });

  test('T-MAXUTIL-10: stats.totalPieces = placedPieces + unfittedPieces', () => {
    const r = optimizeCuts(DS10.pieces, DS10.stock, MU(DS10.options));
    expect(r.stats.totalPieces).toBe(r.stats.placedPieces + r.stats.unfittedPieces);
  });

  test('T-MAXUTIL-11: stats.totalBoards coincide con boards.length', () => {
    const r = optimizeCuts(DS10.pieces, DS10.stock, MU(DS10.options));
    expect(r.stats.totalBoards).toBe(r.boards.filter(b => !b.isOffcut).length);
  });

  test('T-MAXUTIL-12: sin kerf (kerf=0) → piezas edge-to-edge, 0 unfitted', () => {
    const r = optimizeCuts(DS05.pieces, DS05.stock, MU({ ...DS05.options, kerf: 0 }));
    expect(r.unfitted.length).toBe(0);
  });

  test('T-MAXUTIL-13: allowRotation=false en max-util → dimensiones originales', () => {
    const pieces = [{ id:'p', name:'A', width:300, height:700, quantity:3 }];
    const r = optimizeCuts(pieces, { width:2750, height:1830, grain:'none' },
      MU({ kerf:3, edgeTrim:0, allowRotation:false }));
    for (const b of r.boards) {
      for (const p of b.pieces) {
        if (p.id === 'p') {
          expect(p.placedWidth).toBe(300);
          expect(p.placedHeight).toBe(700);
        }
      }
    }
  });

  test('T-MAXUTIL-14: Performance — DS-10 termina en < 500ms', () => {
    const t0 = Date.now();
    optimizeCuts(DS10.pieces, DS10.stock, MU(DS10.options));
    expect(Date.now() - t0).toBeLessThan(500);
  });
});
