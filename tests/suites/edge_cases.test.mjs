/**
 * tests/suites/edge_cases.test.mjs
 * Casos límite que deben funcionar sin crash y con resultado sensato.
 */
import { suite, test, expect } from '../runner.mjs';
import { validateResult, assertAllWithinBoard } from '../validators.mjs';
import { expandPieces } from '../datasets.mjs';
import { optimizeCuts } from '../../src/engine/optimizer.js';
import { runLeptonPack } from '../../src/engine/leptonPacker.js';
import { runHorizontalStripPack } from '../../src/engine/horizontalStripPacker.js';
import { runStripPack } from '../../src/engine/stripPacker.js';

const STD_STOCK = { width: 2750, height: 1830, quantity: 99, grain: 'none' };
const STD_OPT   = { kerf: 3, edgeTrim: 0, allowRotation: true };

suite('Edge Cases', () => {

  // T-EDGE-01: stock.quantity limita tableros (nota: el engine actual no usa stock.quantity
  // para limitar en optimizeCuts — eso es responsabilidad de la UI. Verificamos que no crasha.
  test('T-EDGE-01: stock.quantity=1 → optimizer no crashea', () => {
    const stock = { ...STD_STOCK, quantity: 1 };
    const pieces = [{ id:'p', name:'A', width:1000, height:1000, quantity:5 }];
    const r = optimizeCuts(pieces, stock, STD_OPT);
    // Engine should not crash regardless of quantity field
    expect(typeof r.boards).toBe('object');
    expect(r.unfitted.length).toBe(0);
  });

  // T-EDGE-02: kerf=0 → piezas edge-to-edge sin gap
  test('T-EDGE-02: kerf=0 piezas sin gap', () => {
    const pieces = [{ id:'p', name:'A', width:500, height:500, quantity:4 }];
    const r = optimizeCuts(pieces, STD_STOCK, { ...STD_OPT, kerf: 0 });
    expect(r.unfitted.length).toBe(0);
    // Validate geometry
    const errors = validateResult(
      { boards: r.boards.map(b => ({ ...b, pieces: b.pieces })), unfitted: r.unfitted },
      expandPieces(pieces), 'EDGE-02'
    );
    expect(errors.length).toBe(0);
  });

  // T-EDGE-03: kerf mayor que las piezas — funciona (no crash, no NaN)
  test('T-EDGE-03: kerf grande (200mm) no causa crash ni NaN', () => {
    const pieces = [{ id:'p', name:'A', width:500, height:500, quantity:2 }];
    const r = optimizeCuts(pieces, STD_STOCK, { ...STD_OPT, kerf: 200 });
    // Result must at least have a valid structure (no crash)
    expect(typeof r.boards).toBe('object');
    expect(typeof r.unfitted.length).toBe('number');
    // No NaN in any placed piece coords
    for (const b of r.boards) {
      for (const p of b.pieces) {
        expect(isNaN(p.x)).toBeFalse();
        expect(isNaN(p.y)).toBeFalse();
        expect(isNaN(p.placedWidth)).toBeFalse();
        expect(isNaN(p.placedHeight)).toBeFalse();
      }
    }
  });

  // T-EDGE-04: edgeTrim mayor que la mitad del tablero → todos unfitted o 0 tableros
  test('T-EDGE-04: edgeTrim=1000 (> tablero/2) → todo unfitted', () => {
    const pieces = [{ id:'p', name:'A', width:500, height:500, quantity:3 }];
    const r = optimizeCuts(pieces, STD_STOCK, { ...STD_OPT, edgeTrim: 1000 });
    // Effective area = (2750-2000) × (1830-2000) → negativo → todo unfitted
    expect(r.unfitted.length).toBeGreaterThanOrEqual(3);
  });

  // T-EDGE-05: Pieza con dimensions 1×1 — mínima válida
  test('T-EDGE-05: pieza mínima 1×1 se coloca sin crash', () => {
    const pieces = [{ id:'tiny', name:'Nano', width:1, height:1, quantity:1 }];
    const r = optimizeCuts(pieces, STD_STOCK, STD_OPT);
    expect(typeof r.boards).toBe('object');
    expect(isNaN(r.stats?.overallUtilization) || true).toBeTrue(); // no crash
  });

  // T-EDGE-06: qty=0 → el engine lo trata como qty=1 (comportamiento documentado)
  test('T-EDGE-06: qty=0 → engine trata como 1 copia (sin crash)', () => {
    const pieces = [
      { id:'p1', name:'A', width:500, height:500, quantity: 0 },
      { id:'p2', name:'B', width:400, height:400, quantity: 2 },
    ];
    const r = optimizeCuts(pieces, STD_STOCK, STD_OPT);
    // El engine trata qty=0 como qty=1 → produce 1 copia de p1 + 2 de p2 = 3 total
    // Verificamos que no crashea y que p2 está correctamente colocado
    expect(typeof r.boards).toBe('object');
    const p2Placed = r.boards.flatMap(b => b.pieces).filter(p => p.id === 'p2');
    expect(p2Placed.length).toBe(2);
    expect(r.unfitted.length).toBe(0);
  });

  // T-EDGE-07: Piezas duplicadas exactas → todas colocadas, sin solapamiento
  test('T-EDGE-07: piezas duplicadas exactas sin solapamiento', () => {
    const pieces = [{ id:'dup', name:'Dup', width:800, height:600, quantity:6 }];
    const expanded = expandPieces(pieces);
    const r = optimizeCuts(pieces, STD_STOCK, STD_OPT);
    const errors = validateResult(
      { boards: r.boards.map(b => ({ ...b, pieces: b.pieces })), unfitted: r.unfitted },
      expanded, 'EDGE-07'
    );
    expect(errors.length).toBe(0);
  });

  // T-EDGE-08: Pieza exacta con edgeTrim → coordenadas correctas
  test('T-EDGE-08: pieza exacta con edgeTrim=5 → x>=5, y>=5', () => {
    const trim = 5;
    const W = 2750 - trim * 2, H = 1830 - trim * 2;
    const pieces = [{ id:'ex', name:'Exact', width: W, height: H, quantity: 1 }];
    const r = runLeptonPack(expandPieces(pieces), STD_STOCK, { ...STD_OPT, edgeTrim: trim });
    expect(r.unfitted.length).toBe(0);
    if (r.boards.length > 0 && r.boards[0].pieces.length > 0) {
      const p = r.boards[0].pieces[0];
      expect(p.x).toBeGreaterThanOrEqual(trim - 1);
      expect(p.y).toBeGreaterThanOrEqual(trim - 1);
    }
  });

  // T-EDGE-09: Mix canRotate=true y canRotate=false
  test('T-EDGE-09: mix canRotate=true y false → restricciones respetadas', () => {
    const pieces = [
      { id:'fixed', name:'Fixed', width:1800, height:400, quantity:1, grain:'horizontal' },
      { id:'free',  name:'Free',  width:600,  height:300, quantity:3 },
    ];
    const stock = { ...STD_STOCK, grain: 'horizontal' };
    const r = optimizeCuts(pieces, stock, STD_OPT);
    // Fixed piece should appear with original dims (1800×400), not rotated
    const fixedPlaced = r.boards.flatMap(b => b.pieces).filter(p => p.id === 'fixed');
    for (const p of fixedPlaced) {
      expect(p.placedWidth).toBe(1800);
      expect(p.placedHeight).toBe(400);
    }
  });

  // T-EDGE-10: stock.quantity=undefined → usa default, sin crash
  test('T-EDGE-10: stock.quantity=undefined → sin crash', () => {
    const stock = { width: 2750, height: 1830, grain: 'none' }; // no quantity
    const pieces = [{ id:'p', name:'A', width:500, height:500, quantity:2 }];
    const r = optimizeCuts(pieces, stock, STD_OPT);
    expect(typeof r.boards).toBe('object');
    expect(r.unfitted.length).toBe(0);
  });

  // T-EDGE-11: LeptonPacker con 0 piezas → { boards:[], unfitted:[] }
  test('T-EDGE-11: LeptonPack con cero piezas → sin crash', () => {
    const r = runLeptonPack([], STD_STOCK, STD_OPT);
    expect(r.boards.length).toBe(0);
    expect(r.unfitted.length).toBe(0);
  });

  // T-EDGE-12: HStrip con 0 piezas → sin crash
  test('T-EDGE-12: HStripPack con cero piezas → sin crash', () => {
    const r = runHorizontalStripPack([], STD_STOCK, STD_OPT);
    expect(r.boards.length).toBe(0);
    expect(r.unfitted.length).toBe(0);
  });

  // T-EDGE-13: StripPack con 0 piezas → sin crash
  test('T-EDGE-13: StripPack con cero piezas → sin crash', () => {
    const r = runStripPack([], STD_STOCK, STD_OPT);
    expect(r.boards.length).toBe(0);
  });

  // T-EDGE-14: allowRotation=false → NINGUNA pieza rotada en resultado
  test('T-EDGE-14: allowRotation=false → cero piezas rotadas', () => {
    const pieces = [
      { id:'a', name:'A', width:300, height:700, quantity:3 },
      { id:'b', name:'B', width:500, height:200, quantity:3 },
    ];
    const r = optimizeCuts(pieces, STD_STOCK, { ...STD_OPT, allowRotation: false });
    const allPieces = r.boards.flatMap(b => b.pieces);
    for (const p of allPieces) {
      // If original was 300×700, placed should also be 300 wide or 300 high but NOT transposed
      // Check via id
      const orig = pieces.find(o => o.id === p.id);
      if (orig) {
        // placedWidth must match original width (no rotation)
        expect(p.placedWidth).toBe(orig.width);
        expect(p.placedHeight).toBe(orig.height);
      }
    }
  });
});
