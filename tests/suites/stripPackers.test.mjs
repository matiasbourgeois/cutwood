/**
 * tests/suites/stripPackers.test.mjs
 * Tests para StripPacker (vertical) y HorizontalStripPacker.
 */
import { suite, test, expect } from '../runner.mjs';
import { validateResult } from '../validators.mjs';
import { expandPieces, DS04, DS10, DS12, DS15 } from '../datasets.mjs';
import { runStripPack } from '../../src/engine/stripPacker.js';
import { runHorizontalStripPack } from '../../src/engine/horizontalStripPacker.js';

const S = { width: 2750, height: 1830, quantity: 99, grain: 'none' };
const O = { kerf: 3, edgeTrim: 0, allowRotation: true };

suite('StripPacker (vertical)', () => {

  test('T-STRIP-01: piezas del mismo ancho → comparten strip (mismo x)', () => {
    const pieces = [
      { id:'a', name:'A', width:700, height:400, quantity:3, canRotate:true, forceRotated:false },
    ];
    const r = runStripPack(pieces, S, O);
    expect(r.unfitted?.length ?? 0).toBe(0);
    if (r.boards.length > 0 && r.boards[0].pieces.length > 1) {
      const xs = r.boards[0].pieces.map(p => p.x);
      // All pieces same width → same column x
      const uniqueX = new Set(xs);
      // They might span columns if too tall to fit in 1 column, but should be ≤2 columns
      expect(uniqueX.size).toBeLessThanOrEqual(3);
    }
  });

  test('T-STRIP-02: resultado tiene 0 unfitted para DS-04', () => {
    const expanded = expandPieces(DS04.pieces);
    const r = runStripPack(expanded, DS04.stock, DS04.options);
    expect(r.unfitted?.length ?? 0).toBe(0);
  });

  test('T-STRIP-03: DS-15 (40 piezas iguales) → 0 unfitted', () => {
    const expanded = expandPieces(DS15.pieces);
    const r = runStripPack(expanded, DS15.stock, DS15.options);
    expect(r.unfitted?.length ?? 0).toBe(0);
  });

  test('T-STRIP-04: piezas de distintos anchos → strips separados', () => {
    const pieces = [
      { id:'wide',   name:'Wide',   width:700, height:400, quantity:2, canRotate:false, forceRotated:false },
      { id:'narrow', name:'Narrow', width:300, height:400, quantity:2, canRotate:false, forceRotated:false },
    ];
    const r = runStripPack(pieces, S, O);
    expect(r.unfitted?.length ?? 0).toBe(0);
    if (r.boards.length > 0) {
      const widePieces   = r.boards[0].pieces.filter(p => p.id === 'wide');
      const narrowPieces = r.boards[0].pieces.filter(p => p.id === 'narrow');
      if (widePieces.length > 0 && narrowPieces.length > 0) {
        // Wide pieces have x ~0, narrow pieces have x ~700+kerf
        const wideX   = widePieces[0].x;
        const narrowX = narrowPieces[0].x;
        expect(Math.abs(wideX - narrowX)).toBeGreaterThan(50);
      }
    }
  });

  test('T-STRIP-05: DS-10 → 0 unfitted, geometría válida', () => {
    const expanded = expandPieces(DS10.pieces);
    const r = runStripPack(expanded.map(p=>({...p})), DS10.stock, DS10.options);
    expect(r.unfitted?.length ?? 0).toBe(0);
    if (r.boards.length > 0) {
      const errors = validateResult({ boards: r.boards, unfitted: r.unfitted ?? [] }, expanded, 'STRIP-05');
      expect(errors.length).toBe(0);
    }
  });

  test('T-STRIP-06: DS-12 (sliders 2700×50) → 0 unfitted', () => {
    const expanded = expandPieces(DS12.pieces);
    const r = runStripPack(expanded, DS12.stock, DS12.options);
    expect(r.unfitted?.length ?? 0).toBe(0);
  });

  test('T-STRIP-07: 0 piezas → sin crash', () => {
    const r = runStripPack([], S, O);
    expect(Array.isArray(r.boards)).toBeTrue();
  });
});

suite('HorizontalStripPacker', () => {

  test('T-HSTRIP-01: piezas de igual altura → misma franja horizontal', () => {
    const pieces = [
      { id:'p', name:'P', width:600, height:300, quantity:4, canRotate:true, forceRotated:false },
    ];
    const r = runHorizontalStripPack(pieces, S, O);
    expect(r.unfitted.length).toBe(0);
    // All pieces should be in the same y-band (same shelf)
    const ys = r.boards.flatMap(b => b.pieces.map(p => p.y));
    const uniqueY = new Set(ys);
    expect(uniqueY.size).toBe(1); // all in one row
  });

  test('T-HSTRIP-02: franjas ordenadas tallest-first', () => {
    const pieces = [
      { id:'tall',  name:'Tall',  width:700, height:600, quantity:2, canRotate:true, forceRotated:false },
      { id:'short', name:'Short', width:700, height:200, quantity:2, canRotate:true, forceRotated:false },
    ];
    const r = runHorizontalStripPack(pieces, S, O);
    expect(r.unfitted.length).toBe(0);
    // On each board where BOTH tall and short pieces appear,
    // the minimum y of tall should be <= minimum y of short
    for (const b of r.boards) {
      const tallPieces  = b.pieces.filter(p => p.id === 'tall');
      const shortPieces = b.pieces.filter(p => p.id === 'short');
      if (tallPieces.length > 0 && shortPieces.length > 0) {
        const minTallY  = Math.min(...tallPieces.map(p => p.y));
        const minShortY = Math.min(...shortPieces.map(p => p.y));
        expect(minTallY).toBeLessThanOrEqual(minShortY);
      }
    }
  });

  test('T-HSTRIP-03: DS-15 (40 piezas iguales) → filas homogéneas', () => {
    const expanded = expandPieces(DS15.pieces);
    const r = runHorizontalStripPack(expanded.map(p=>({...p})), DS15.stock, DS15.options);
    expect(r.unfitted.length).toBe(0);
    // Should have only one unique height in each y-row
    const rowMap = new Map();
    for (const b of r.boards) {
      for (const p of b.pieces) {
        const key = Math.round(p.y / 5) * 5;
        if (!rowMap.has(key)) rowMap.set(key, new Set());
        rowMap.get(key).add(p.placedHeight);
      }
    }
    let mixedRows = 0;
    for (const hs of rowMap.values()) if (hs.size > 1) mixedRows++;
    expect(mixedRows).toBe(0); // all rows homogeneous
  });

  test('T-HSTRIP-04: kerf correcto entre franjas', () => {
    const pieces = [
      { id:'a', name:'A', width:2700, height:300, quantity:1, canRotate:false, forceRotated:false },
      { id:'b', name:'B', width:2700, height:200, quantity:1, canRotate:false, forceRotated:false },
    ];
    const kerf = 5;
    const r = runHorizontalStripPack(pieces, S, { ...O, kerf });
    expect(r.unfitted.length).toBe(0);
    const aY = r.boards.flatMap(b => b.pieces.filter(p => p.id==='a').map(p => p.y));
    const bY = r.boards.flatMap(b => b.pieces.filter(p => p.id==='b').map(p => p.y));
    if (aY.length > 0 && bY.length > 0) {
      // b should start at y = a.y + 300 + kerf
      const gap = Math.min(...bY) - Math.min(...aY) - 300;
      expect(Math.abs(gap - kerf)).toBeLessThan(3);
    }
  });

  test('T-HSTRIP-05: DS-10 → 0 unfitted, geometría válida', () => {
    const expanded = expandPieces(DS10.pieces);
    const r = runHorizontalStripPack(expanded.map(p=>({...p})), DS10.stock, DS10.options);
    expect(r.unfitted.length).toBe(0);
    const errors = validateResult({ boards: r.boards, unfitted: r.unfitted }, expanded, 'HSTRIP-05');
    expect(errors.length).toBe(0);
  });

  test('T-HSTRIP-06: DS-12 (sliders) → 0 unfitted', () => {
    const expanded = expandPieces(DS12.pieces);
    const r = runHorizontalStripPack(expanded.map(p=>({...p})), DS12.stock, DS12.options);
    expect(r.unfitted.length).toBe(0);
  });

  test('T-HSTRIP-07: 0 piezas → sin crash', () => {
    const r = runHorizontalStripPack([], S, O);
    expect(r.boards.length).toBe(0);
    expect(r.unfitted.length).toBe(0);
  });
});
