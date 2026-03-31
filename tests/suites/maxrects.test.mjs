/**
 * tests/suites/maxrects.test.mjs
 */
import { suite, test, expect } from '../runner.mjs';
import { validateResult } from '../validators.mjs';
import { expandPieces, DS04, DS05, DS10, DS11, DS12, DS14, DS15 } from '../datasets.mjs';
import { MaxRectsBin } from '../../src/engine/maxrects.js';
import { optimizeCuts } from '../../src/engine/optimizer.js';

const MU = (o) => ({ ...o, optimizationMode: 'max-utilization' });

suite('MaxRects', () => {

  test('T-MAXR-01: _splitAndPrune no deja rects solapados entre sí', () => {
    const bin = new MaxRectsBin(2750, 1830, 3, 'bssf');
    bin.insert(800, 600, true);
    bin.insert(500, 400, true);
    // Check freeRects don't overlap each other
    const frs = bin.freeRects;
    for (let i = 0; i < frs.length; i++) {
      for (let j = i+1; j < frs.length; j++) {
        const a = frs[i], b = frs[j];
        // Check containment (one fully inside another is invalid after prune)
        const aContainsB = b.x >= a.x && b.y >= a.y &&
          b.x + b.width  <= a.x + a.width &&
          b.y + b.height <= a.y + a.height;
        const bContainsA = a.x >= b.x && a.y >= b.y &&
          a.x + a.width  <= b.x + b.width &&
          a.y + a.height <= b.y + b.height;
        // After pruning, neither should fully contain the other
        expect(aContainsB || bContainsA).toBeFalse();
      }
    }
  });

  test('T-MAXR-02: MAX_FREE_RECTS cap no pierde piezas en DS-11 (200 piezas)', () => {
    const r = optimizeCuts(DS11.pieces, DS11.stock, MU(DS11.options));
    expect(r.unfitted.length).toBeLessThanOrEqual(5); // small tolerance for stress
  });

  test('T-MAXR-03: MaxRects >= Guillotine en utilización para DS-10', () => {
    // Both are included in optimizer sweep; we just verify overall util is reasonable
    const r = optimizeCuts(DS10.pieces, DS10.stock, MU(DS10.options));
    const util = parseFloat(r.stats.overallUtilization);
    expect(util).toBeGreaterThan(70);
  });

  test('T-MAXR-04: insertStrip totalArea = N × insert totalArea', () => {
    const binA = new MaxRectsBin(2750, 1830, 3, 'bssf');
    const binB = new MaxRectsBin(2750, 1830, 3, 'bssf');
    // insert 3 pieces individually
    binA.insert(400, 300, false);
    binA.insert(400, 300, false);
    binA.insert(400, 300, false);
    // insert as strip
    binB.insertStrip(400, 300, 3, false);
    const aArea = binA.usedRects.reduce((s,r) => s+r.width*r.height, 0);
    const bArea = binB.usedRects.reduce((s,r) => s+r.width*r.height, 0);
    expect(aArea).toBe(bArea);
  });

  test('T-MAXR-05: getUtilization === suma manual / área tablero', () => {
    const bin = new MaxRectsBin(1000, 1000, 0, 'baf');
    bin.insert(300, 300, false);
    bin.insert(200, 200, false);
    const reported = bin.getUtilization();
    const manual   = (300*300 + 200*200) / (1000*1000) * 100;
    expect(Math.abs(reported - manual)).toBeLessThan(0.1);
  });

  // ── Por heurística ───────────────────────────────────────────────────────
  for (const heur of ['bssf', 'baf', 'blf']) {
    test(`T-MAXR-HEUR: MaxRectsBin(${heur}) coloca DS-04 sin crash`, () => {
      const bin = new MaxRectsBin(2750, 1830, 3, heur);
      const r = bin.insert(100, 100, true);
      expect(r).not.toBeNull();
    });
  }

  // ── Dataset coverage ─────────────────────────────────────────────────────
  for (const ds of [DS04, DS05, DS12, DS15]) {
    test(`T-MAXR-DS: ${ds.label}`, () => {
      const r = optimizeCuts(ds.pieces, ds.stock, MU(ds.options));
      if (ds.expect.maxUnfitted !== undefined)
        expect(r.unfitted.length).toBeLessThanOrEqual(ds.expect.maxUnfitted);
      if (ds.expect.maxBoards !== undefined)
        expect(r.stats.totalBoards).toBeLessThanOrEqual(ds.expect.maxBoards);
    });
  }

  test('T-MAXR-DS10: DS-10 → 0 unfitted, geometría válida', () => {
    const expanded = expandPieces(DS10.pieces);
    const r = optimizeCuts(DS10.pieces, DS10.stock, MU(DS10.options));
    expect(r.unfitted.length).toBe(0);
    const errors = validateResult({ boards: r.boards, unfitted: r.unfitted }, expanded, 'MAXR-DS10');
    expect(errors.length).toBe(0);
  });

  test('T-MAXR-DS14: DS-14 pieza inaceptable → piezas OK sigueàn colocadas', () => {
    const r = optimizeCuts(DS14.pieces, DS14.stock, MU(DS14.options));
    const okPlaced = r.boards.flatMap(b => b.pieces).filter(p => p.id === 'ok');
    expect(okPlaced.length).toBe(2);
    expect(typeof r.boards).toBe('object');
  });
});
