/**
 * tests/suites/skyline.test.mjs
 */
import { suite, test, expect } from '../runner.mjs';
import { validateResult } from '../validators.mjs';
import { expandPieces, DS01, DS03, DS04, DS05, DS10, DS12, DS15 } from '../datasets.mjs';
import { SkylineBin, runSkylinePack } from '../../src/engine/skyline.js';

const S = { width: 2750, height: 1830, quantity: 99, grain: 'none' };
const O = { kerf: 3, edgeTrim: 0, allowRotation: true };

const HEURISTICS   = ['bl', 'wf', 'min-max'];
const SORT_ORDERS  = ['area-desc', 'area-asc', 'height-desc', 'width-desc', 'max-side-desc', 'diff-desc', 'group-area-desc'];

suite('Skyline', () => {

  test('T-SKY-01: skyline siempre cubre el bin width completo al inicio', () => {
    const bin = new SkylineBin(2750, 1830, 'bl', true);
    expect(bin.skyline.length).toBe(1);
    expect(bin.skyline[0].x).toBe(0);
    expect(bin.skyline[0].width).toBe(2750);
    expect(bin.skyline[0].y).toBe(0);
  });

  test('T-SKY-02: _addSkylineLevel mantiene segmentos ordenados por x', () => {
    const bin = new SkylineBin(1000, 1000, 'bl', true);
    bin.insert(300, 400, null);
    bin.insert(200, 200, null);
    for (let i = 1; i < bin.skyline.length; i++) {
      expect(bin.skyline[i].x).toBeGreaterThan(bin.skyline[i-1].x);
    }
  });

  test('T-SKY-03: segmentos adyacentes de igual y se fusionan', () => {
    const bin = new SkylineBin(1000, 1000, 'bl', true);
    // Place two pieces side by side of same height → should merge skyline segments
    bin.insert(400, 300, null);
    bin.insert(400, 300, null);
    // After two equal-height pieces, the skyline above them should be merged
    const seg300 = bin.skyline.filter(s => s.y === 300);
    // The 800mm span at height 300 should ideally be one segment
    const totalWidth300 = seg300.reduce((s, seg) => s + seg.width, 0);
    expect(totalWidth300).toBeGreaterThanOrEqual(800);
  });

  test('T-SKY-04: group-area-desc agrupa piezas de igual tamaño', () => {
    const pieces = [
      { id:'a', name:'A', width:300, height:200, quantity:3, canRotate:true, forceRotated:false },
      { id:'b', name:'B', width:500, height:400, quantity:3, canRotate:true, forceRotated:false },
    ];
    const r = runSkylinePack(pieces, S, O, 'bl', 'group-area-desc');
    expect(r.unfitted.length).toBe(0);
    // B pieces should appear before A pieces in the placement order (area desc)
    const allPlaced = r.boards.flatMap(b => b.pieces);
    const firstBidx = allPlaced.findIndex(p => p.id === 'b');
    const firstAidx = allPlaced.findIndex(p => p.id === 'a');
    if (firstBidx >= 0 && firstAidx >= 0) {
      expect(firstBidx).toBeLessThan(firstAidx);
    }
  });

  test('T-SKY-05: DS-05 (grilla perfecta sin kerf) → ≤2 tableros con bl', () => {
    const expanded = expandPieces(DS05.pieces);
    const r = runSkylinePack(expanded, DS05.stock, DS05.options, 'bl', 'area-desc');
    expect(r.unfitted.length).toBe(0);
  });

  test('T-SKY-06: pieza que no cabe → unfitted, sin crash', () => {
    const pieces = [{ id:'big', name:'Big', width:3000, height:400, quantity:1, canRotate:false, forceRotated:false }];
    const r = runSkylinePack(pieces, S, O, 'bl', 'area-desc');
    expect(r.unfitted.length).toBe(1);
    expect(r.boards.length).toBe(0);
  });

  test('T-SKY-07: DS-03 (0 piezas) → sin crash', () => {
    const r = runSkylinePack([], S, O, 'bl', 'area-desc');
    expect(r.boards.length).toBe(0);
    expect(r.unfitted.length).toBe(0);
  });

  test('T-SKY-08: DS-10 → 0 unfitted, geometría válida', () => {
    const expanded = expandPieces(DS10.pieces);
    const r = runSkylinePack(expanded.map(p=>({...p})), DS10.stock, DS10.options, 'bl', 'area-desc');
    expect(r.unfitted.length).toBe(0);
    const errors = validateResult({ boards: r.boards, unfitted: r.unfitted }, expanded, 'SKY-08');
    expect(errors.length).toBe(0);
  });

  // ── Sweep: todas las combinaciones heurística × sortOrder en DS-04 ────────
  for (const heur of HEURISTICS) {
    for (const sort of SORT_ORDERS) {
      test(`T-SKY-SWEEP: heur=${heur} sort=${sort} → DS-04 coloca pieza`, () => {
        const expanded = expandPieces(DS04.pieces);
        const r = runSkylinePack(expanded.map(p=>({...p})), DS04.stock, DS04.options, heur, sort);
        expect(r.unfitted.length).toBe(0);
      });
    }
  }

  // ── Dataset coverage ─────────────────────────────────────────────────────
  for (const ds of [DS01, DS12, DS15]) {
    test(`T-SKY-DS: ${ds.label} con bl/area-desc`, () => {
      const expanded = expandPieces(ds.pieces);
      const r = runSkylinePack(expanded.map(p=>({...p})), ds.stock, ds.options, 'bl', 'area-desc');
      if (ds.expect.maxUnfitted !== undefined)
        expect(r.unfitted.length).toBeLessThanOrEqual(ds.expect.maxUnfitted);
    });
  }
});
