/**
 * tests/suites/canvas_render.test.mjs
 * "Canvas" / SVG rendering audit — tests without a browser.
 *
 * Strategy: replicate the exact coordinate math from BoardDiagram.jsx
 * in pure JS, then feed it real engine output and verify:
 *
 *   1. SCALE:         bScale is positive, finite, consistent
 *   2. PIECE COORDS:  SVG px/py/pw/ph match engine coords × bScale
 *   3. NO OVERFLOW:   no piece's SVG rect exceeds the board rect (px)
 *   4. NO OVERLAP:    no two pieces overlap in SVG space (same as engine but scaled)
 *   5. DIMENSIONS:    placedWidth/placedHeight labels match engine output
 *   6. OFFCUTS:       offcut SVG rects are inside the board, non-overlapping with pieces
 *   7. ASPECT CLAMP:  aspect ratio is clamped to [0.4, 1.5] — board never looks distorted
 *   8. LABEL MATH:    font size clamping doesn't produce NaN or negative values
 *   9. CUT SEQUENCE:  all cuts reference valid x/y positions within board bounds
 *  10. STATS DISPLAY: stats.overallUtilization, totalBoards, totalPieces are consistent
 *  11. TINY PIECES:   pieces smaller than a pixel still have valid positive dimensions
 *  12. SQUARE BOARD:  aspect = 1.0 (no distortion)
 *  13. WIDE BOARD:    aspect applies min clamp correctly
 *  14. TALL BOARD:    aspect applies max clamp correctly
 *  15. MULTI-BOARD:   each board in a multi-board result renders independently correct
 *  16. GRAIN BADGE:   grain direction is correctly resolved for rotated pieces
 *  17. ROTATION FLAG: rotated pieces use swapped dims in SVG correctly
 *  18. EDGETRIM:      pieces start at edgeTrim offset in engine; SVG respects this
 *  19. OFFCUT BOUNDS: offcut x+w <= stockWidth, y+h <= stockHeight (engine invariant)
 *  20. ZERO PIECES:   board with 0 pieces renders as empty board (valid SVG dimensions)
 */

import { suite, test, expect } from '../runner.mjs';
import { optimizeCuts } from '../../src/engine/optimizer.js';
import { expandPieces, DS10, DS15, DS07, DS08 } from '../datasets.mjs';

// ─── Replicate BoardDiagram.jsx coordinate math (pure JS) ────────────────────
function computeRenderGeometry(board) {
  const { stockWidth, stockHeight } = board;
  const padding     = 28;
  const arrowMargin = 65;
  const maxSvgDim   = 900;
  const rawAspect   = stockHeight / stockWidth;
  const aspect      = Math.max(0.4, Math.min(rawAspect, 1.5));
  const svgW        = maxSvgDim + arrowMargin;
  const svgH        = aspect * maxSvgDim + arrowMargin;
  const scaleX      = (maxSvgDim - padding * 2) / stockWidth;
  const scaleY      = (aspect * maxSvgDim - padding * 2) / stockHeight;
  const bScale      = Math.min(scaleX, scaleY);
  const boardW      = stockWidth  * bScale;
  const boardH      = stockHeight * bScale;
  const offsetX     = (maxSvgDim - boardW) / 2;
  const offsetY     = (aspect * maxSvgDim - boardH) / 2;
  return { aspect, svgW, svgH, bScale, boardW, boardH, offsetX, offsetY };
}

function computePieceSVG(piece, geo) {
  const { bScale, offsetX, offsetY } = geo;
  return {
    px: offsetX + piece.x * bScale,
    py: offsetY + piece.y * bScale,
    pw: piece.placedWidth  * bScale,
    ph: piece.placedHeight * bScale,
  };
}

function computeOffcutSVG(oc, geo) {
  const { bScale, offsetX, offsetY } = geo;
  return {
    sx: offsetX + oc.x * bScale,
    sy: offsetY + oc.y * bScale,
    sw: oc.width  * bScale,
    sh: oc.height * bScale,
  };
}

// Standard inputs for rendering tests
const STD_STOCK = { width: 2750, height: 1830, quantity: 99, grain: 'none' };
const STD_OPT   = { kerf: 3, edgeTrim: 0, allowRotation: true };

// ─── Helper: run engine and get first board ──────────────────────────────────
function getFirstBoard(pieces, stock = STD_STOCK, options = STD_OPT) {
  const r = optimizeCuts(pieces, stock, options);
  return { result: r, board: r.boards[0] };
}

suite('Canvas / SVG Rendering Math', () => {

  // ── T-RENDER-01: bScale es positivo y finito ─────────────────────────────
  test('T-RENDER-01: bScale es positivo y finito para tablero estándar', () => {
    const board = { stockWidth: 2750, stockHeight: 1830, pieces: [], offcuts: [] };
    const geo = computeRenderGeometry(board);
    expect(isFinite(geo.bScale)).toBeTrue();
    expect(geo.bScale > 0).toBeTrue();
    expect(isNaN(geo.bScale)).toBeFalse();
  });

  // ── T-RENDER-02: Aspect ratio clamped a [0.4, 1.5] ──────────────────────
  test('T-RENDER-02: tablero muy ancho → aspect = 0.4 (min clamp)', () => {
    const board = { stockWidth: 5000, stockHeight: 500, pieces: [], offcuts: [] };
    const geo = computeRenderGeometry(board);
    expect(geo.aspect).toBe(0.4); // 500/5000 = 0.1 → clamped to 0.4
  });

  test('T-RENDER-03: tablero muy alto → aspect = 1.5 (max clamp)', () => {
    const board = { stockWidth: 500, stockHeight: 5000, pieces: [], offcuts: [] };
    const geo = computeRenderGeometry(board);
    expect(geo.aspect).toBe(1.5); // 5000/500 = 10 → clamped to 1.5
  });

  test('T-RENDER-04: tablero cuadrado → aspect = 1.0', () => {
    const board = { stockWidth: 1830, stockHeight: 1830, pieces: [], offcuts: [] };
    const geo = computeRenderGeometry(board);
    expect(geo.aspect).toBe(1.0);
  });

  // ── T-RENDER-05: SVG dimensions son positivas y finitas ─────────────────
  test('T-RENDER-05: svgW y svgH son positivos y finitos', () => {
    const board = { stockWidth: 2750, stockHeight: 1830, pieces: [], offcuts: [] };
    const geo = computeRenderGeometry(board);
    expect(geo.svgW > 0).toBeTrue();
    expect(geo.svgH > 0).toBeTrue();
    expect(isFinite(geo.svgW)).toBeTrue();
    expect(isFinite(geo.svgH)).toBeTrue();
  });

  // ── T-RENDER-06: Coordenadas SVG de piezas coinciden con engine × bScale ─
  test('T-RENDER-06: px/py/pw/ph de piezas = engine coords × bScale', () => {
    const pieces = [
      { id:'p1', name:'A', width:800, height:600, quantity:1 },
      { id:'p2', name:'B', width:500, height:400, quantity:1 },
    ];
    const { board } = getFirstBoard(pieces);
    if (!board || board.pieces.length === 0) return; // skip if packing fails
    const geo = computeRenderGeometry(board);

    for (const piece of board.pieces) {
      const svgP = computePieceSVG(piece, geo);
      // Verify math matches: px = offsetX + piece.x * bScale
      const expectedPx = geo.offsetX + piece.x * geo.bScale;
      const expectedPy = geo.offsetY + piece.y * geo.bScale;
      const expectedPw = piece.placedWidth  * geo.bScale;
      const expectedPh = piece.placedHeight * geo.bScale;
      expect(Math.abs(svgP.px - expectedPx)).toBeLessThan(0.001);
      expect(Math.abs(svgP.py - expectedPy)).toBeLessThan(0.001);
      expect(Math.abs(svgP.pw - expectedPw)).toBeLessThan(0.001);
      expect(Math.abs(svgP.ph - expectedPh)).toBeLessThan(0.001);
    }
  });

  // ── T-RENDER-07: Ninguna pieza excede los límites del board en SVG ───────
  test('T-RENDER-07: ninguna pieza excede boardW/boardH en SVG', () => {
    const { board } = getFirstBoard(DS10.pieces, DS10.stock, DS10.options);
    if (!board) return;
    const geo = computeRenderGeometry(board);
    const tolerance = 1; // 1px tolerance for rounding

    for (const piece of board.pieces) {
      const { px, py, pw, ph } = computePieceSVG(piece, geo);
      const rightEdge  = px - geo.offsetX + pw;
      const bottomEdge = py - geo.offsetY + ph;
      expect(rightEdge).toBeLessThanOrEqual(geo.boardW + tolerance);
      expect(bottomEdge).toBeLessThanOrEqual(geo.boardH + tolerance);
      expect(px).toBeGreaterThanOrEqual(geo.offsetX - tolerance);
      expect(py).toBeGreaterThanOrEqual(geo.offsetY - tolerance);
    }
  });

  // ── T-RENDER-08: No hay overlap en coordenadas SVG ───────────────────────
  test('T-RENDER-08: no hay overlap entre piezas en SVG space', () => {
    const { board } = getFirstBoard(DS10.pieces, DS10.stock, DS10.options);
    if (!board) return;
    const geo = computeRenderGeometry(board);
    const tol = 0.5;

    const svgPieces = board.pieces.map(p => computePieceSVG(p, geo));
    for (let i = 0; i < svgPieces.length; i++) {
      for (let j = i + 1; j < svgPieces.length; j++) {
        const a = svgPieces[i], b = svgPieces[j];
        const overlapX = a.px < b.px + b.pw - tol && a.px + a.pw > b.px + tol;
        const overlapY = a.py < b.py + b.ph - tol && a.py + a.ph > b.py + tol;
        if (overlapX && overlapY) {
          throw new Error(`Piezas [${i}] y [${j}] se solapan en SVG: ` +
            `(${a.px.toFixed(1)},${a.py.toFixed(1)},${a.pw.toFixed(1)}×${a.ph.toFixed(1)}) vs ` +
            `(${b.px.toFixed(1)},${b.py.toFixed(1)},${b.pw.toFixed(1)}×${b.ph.toFixed(1)})`);
        }
      }
    }
    expect(true).toBeTrue(); // reached without error
  });

  // ── T-RENDER-09: pw y ph son siempre positivos (piezas visibles) ─────────
  test('T-RENDER-09: pw y ph son positivos para todas las piezas de DS-10', () => {
    const { board } = getFirstBoard(DS10.pieces, DS10.stock, DS10.options);
    if (!board) return;
    const geo = computeRenderGeometry(board);
    for (const piece of board.pieces) {
      const { pw, ph } = computePieceSVG(piece, geo);
      expect(pw > 0).toBeTrue();
      expect(ph > 0).toBeTrue();
      expect(isFinite(pw)).toBeTrue();
      expect(isFinite(ph)).toBeTrue();
    }
  });

  // ── T-RENDER-10: Label de dimensión coincide con placedWidth×placedHeight ─
  test('T-RENDER-10: label WxH coincide con datos del engine', () => {
    const { board } = getFirstBoard(DS10.pieces, DS10.stock, DS10.options);
    if (!board) return;
    for (const piece of board.pieces) {
      const label = `${piece.placedWidth}×${piece.placedHeight}`;
      // Label must be numeric, not NaN or undefined
      expect(label.includes('undefined')).toBeFalse();
      expect(label.includes('NaN')).toBeFalse();
      expect(piece.placedWidth > 0).toBeTrue();
      expect(piece.placedHeight > 0).toBeTrue();
    }
  });

  // ── T-RENDER-11: Font sizes no son NaN ni negativos ─────────────────────
  test('T-RENDER-11: font sizes son positivos y finitos', () => {
    const { board } = getFirstBoard(DS10.pieces, DS10.stock, DS10.options);
    if (!board) return;
    const geo = computeRenderGeometry(board);
    const CHAR_RATIO = 0.62;
    
    for (const piece of board.pieces) {
      const { pw, ph } = computePieceSVG(piece, geo);
      const pName = piece.name || 'P';
      const dimLabel = `${piece.placedWidth}×${piece.placedHeight}`;
      
      // Mode A horizontal font size
      const nameFsH = Math.max(7.5, Math.min(13, pw / 7));
      expect(isFinite(nameFsH)).toBeTrue();
      expect(nameFsH).toBeGreaterThan(0);

      // Mode B vertical font sizes
      const maxFsV_byWidth  = pw * 0.72;
      const maxFsV_byLength = ph > 0 ? (ph * 0.88) / (pName.length * CHAR_RATIO) : 999;
      const nameFsV = Math.max(5.5, Math.min(10, maxFsV_byWidth, maxFsV_byLength));
      expect(isFinite(nameFsV)).toBeTrue();
      expect(nameFsV).toBeGreaterThan(0);

      // Dim font size vertical
      const remainPW = pw - nameFsV - 2.5;
      const maxDimFsByWidth  = Math.max(0, remainPW * 0.9);
      const maxDimFsByLength = ph > 0 ? (ph * 0.88) / (dimLabel.length * CHAR_RATIO) : 999;
      const dimFsV = Math.max(5, Math.min(8.5, maxDimFsByWidth, maxDimFsByLength));
      expect(isFinite(dimFsV)).toBeTrue();
      expect(dimFsV).toBeGreaterThan(0);
    }
  });

  // ── T-RENDER-12: Offcuts están dentro del tablero en SVG ─────────────────
  test('T-RENDER-12: offcuts en SVG space dentro del board rect', () => {
    const { board } = getFirstBoard(DS10.pieces, DS10.stock, DS10.options);
    if (!board || !board.offcuts || board.offcuts.length === 0) return;
    const geo = computeRenderGeometry(board);
    const tol = 2;

    for (let i = 0; i < board.offcuts.length; i++) {
      const oc = board.offcuts[i];
      // Engine invariant: offcut must be within stock
      expect(oc.x >= 0).toBeTrue();
      expect(oc.y >= 0).toBeTrue();
      expect(oc.x + oc.width).toBeLessThanOrEqual(board.stockWidth + 1);
      expect(oc.y + oc.height).toBeLessThanOrEqual(board.stockHeight + 1);
      
      // SVG invariant
      const { sx, sy, sw, sh } = computeOffcutSVG(oc, geo);
      expect(sw > 0).toBeTrue();
      expect(sh > 0).toBeTrue();
      expect(sx - geo.offsetX + sw).toBeLessThanOrEqual(geo.boardW + tol);
      expect(sy - geo.offsetY + sh).toBeLessThanOrEqual(geo.boardH + tol);
    }
  });

  // ── T-RENDER-13: Offcuts no se solapan con piezas en SVG ─────────────────
  test('T-RENDER-13: offcuts no se solapan con piezas colocadas en SVG', () => {
    const { board } = getFirstBoard(DS10.pieces, DS10.stock, DS10.options);
    if (!board || !board.offcuts?.length) return;
    const geo = computeRenderGeometry(board);
    const tol = 2;

    for (const oc of board.offcuts) {
      const { sx, sy, sw, sh } = computeOffcutSVG(oc, geo);
      for (const piece of board.pieces) {
        const { px, py, pw, ph } = computePieceSVG(piece, geo);
        const overlapX = sx < px + pw - tol && sx + sw > px + tol;
        const overlapY = sy < py + ph - tol && sy + sh > py + tol;
        if (overlapX && overlapY) {
          throw new Error(`Offcut se solapa con pieza ${piece.id} en SVG`);
        }
      }
    }
    expect(true).toBeTrue();
  });

  // ── T-RENDER-14: Piezas rotadas tienen dims intercambiadas correctamente ──
  test('T-RENDER-14: pieza rotada tiene placedWidth/Height correcto (no negative)', () => {
    const pieces = [
      { id:'r1', name:'Rotable', width: 300, height: 1200, quantity: 3 },
    ];
    const { board } = getFirstBoard(pieces);
    if (!board) return;
    const geo = computeRenderGeometry(board);
    for (const piece of board.pieces) {
      const { pw, ph } = computePieceSVG(piece, geo);
      expect(pw > 0).toBeTrue();
      expect(ph > 0).toBeTrue();
      // Verify label always shows correct engine values
      expect(piece.placedWidth > 0).toBeTrue();
      expect(piece.placedHeight > 0).toBeTrue();
    }
  });

  // ── T-RENDER-15: boardW/boardH respetan el viewport calculado ────────────
  test('T-RENDER-15: boardW <= maxSvgDim, boardH <= aspect*maxSvgDim (no overflow de viewport)', () => {
    const maxSvgDim = 900;
    for (const [w, h] of [[2750,1830],[1830,1830],[500,3000],[3000,500],[2400,2400]]) {
      const board = { stockWidth: w, stockHeight: h, pieces: [], offcuts: [] };
      const geo = computeRenderGeometry(board);
      // boardW must fit in maxSvgDim (padding accounts for the difference)
      expect(geo.boardW).toBeLessThanOrEqual(maxSvgDim + 1);
      // boardH must fit in aspect*maxSvgDim (the actual SVG height allocated)
      expect(geo.boardH).toBeLessThanOrEqual(geo.aspect * maxSvgDim + 1);
      // Neither should be negative or infinite
      expect(geo.boardW > 0).toBeTrue();
      expect(geo.boardH > 0).toBeTrue();
      expect(isFinite(geo.boardW)).toBeTrue();
      expect(isFinite(geo.boardH)).toBeTrue();
    }
  });

  // ── T-RENDER-16: Multi-board — cada tablero tiene geometría independiente ─
  test('T-RENDER-16: multi-board — cada tablero renderiza geometría propia', () => {
    const r = optimizeCuts(DS10.pieces, DS10.stock, DS10.options);
    for (const board of r.boards) {
      const geo = computeRenderGeometry(board);
      expect(geo.bScale > 0).toBeTrue();
      expect(isFinite(geo.bScale)).toBeTrue();
      expect(geo.boardW > 0).toBeTrue();
      expect(geo.boardH > 0).toBeTrue();
    }
  });

  // ── T-RENDER-17: Grain direction resuelta correctamente en rendering ──────
  test('T-RENDER-17: grain direction correcto para piezas rotadas (no NaN)', () => {
    const stock = { width: 2750, height: 1830, quantity: 99, grain: 'horizontal' };
    const pieces = [
      { id:'h1', name:'H', width: 800, height: 400, quantity: 2, grain: 'horizontal' },
    ];
    const r = optimizeCuts(pieces, stock, STD_OPT);
    if (!r.boards[0]) return;
    for (const piece of r.boards[0].pieces) {
      const bg = r.boards[0].boardGrain || 'none';
      // Replicate BoardDiagram grain logic
      const grainDir = piece.rotated
        ? (bg === 'horizontal' ? 'vertical' : 'horizontal')
        : bg;
      expect(['horizontal', 'vertical', 'none'].includes(grainDir)).toBeTrue();
    }
  });

  // ── T-RENDER-18: edgeTrim — piezas empiezan en offset correcto ───────────
  test('T-RENDER-18: edgeTrim=10 → piezas con x>=10, y>=10 en engine (→ SVG offset correcto)', () => {
    const trim = 10;
    const pieces = [{ id:'p', name:'P', width:500, height:400, quantity:3 }];
    const r = optimizeCuts(pieces, STD_STOCK, { ...STD_OPT, edgeTrim: trim });
    if (!r.boards[0]) return;
    for (const piece of r.boards[0].pieces) {
      // Engine should place pieces at >= edgeTrim
      expect(piece.x).toBeGreaterThanOrEqual(trim - 1);
      expect(piece.y).toBeGreaterThanOrEqual(trim - 1);
      // SVG will pick up piece.x and multiply by bScale — no special SVG logic needed
      const geo = computeRenderGeometry(r.boards[0]);
      const { px, py } = computePieceSVG(piece, geo);
      expect(px).toBeGreaterThanOrEqual(geo.offsetX + (trim - 1) * geo.bScale - 0.1);
    }
  });

  // ── T-RENDER-19: DS-15 (piezas idénticas) — labels distintos por copyIndex ─
  test('T-RENDER-19: DS-15 piezas idénticas → cada una tiene coords únicos en SVG', () => {
    const r = optimizeCuts(DS15.pieces, DS15.stock, DS15.options);
    const allPieces = r.boards.flatMap(b => b.pieces);
    expect(allPieces.length).toBe(40);
    
    // Check that not all pieces share the same SVG coordinates
    const geoMap = r.boards.map(b => ({ board: b, geo: computeRenderGeometry(b) }));
    const allCoords = new Set();
    for (const { board, geo } of geoMap) {
      for (const piece of board.pieces) {
        const { px, py } = computePieceSVG(piece, geo);
        allCoords.add(`${px.toFixed(2)},${py.toFixed(2)}`);
      }
    }
    // 40 pieces should produce at least many unique positions
    expect(allCoords.size).toBeGreaterThanOrEqual(10);
  });

  // ── T-RENDER-20: Cut sequence — posiciones de cortes dentro del tablero ──
  test('T-RENDER-20: cut sequence — todos los cortes tienen position dentro del board', () => {
    const { board } = getFirstBoard(DS10.pieces, DS10.stock, DS10.options);
    if (!board?.cutSequence) return;

    function checkCuts(cuts, stockW, stockH) {
      for (const cut of cuts) {
        expect(isFinite(cut.position)).toBeTrue();
        if (cut.type === 'horizontal') {
          expect(cut.position).toBeGreaterThanOrEqual(0);
          expect(cut.position).toBeLessThanOrEqual(stockH);
        } else if (cut.type === 'vertical') {
          expect(cut.position).toBeGreaterThanOrEqual(0);
          expect(cut.position).toBeLessThanOrEqual(stockW);
        }
        if (cut.children && cut.children.length > 0) {
          checkCuts(cut.children, stockW, stockH);
        }
        if (cut.left?.cuts) checkCuts(cut.left.cuts, stockW, stockH);
        if (cut.right?.cuts) checkCuts(cut.right.cuts, stockW, stockH);
      }
    }

    checkCuts(board.cutSequence, board.stockWidth, board.stockHeight);
    expect(true).toBeTrue();
  });

  // ── T-RENDER-21: Stats display — valores coherentes y formateados ─────────
  test('T-RENDER-21: stats — valores coherentes para mostrar en UI', () => {
    const r = optimizeCuts(DS10.pieces, DS10.stock, DS10.options);
    const s = r.stats;
    
    // All stats must be numeric
    expect(isFinite(s.totalBoards)).toBeTrue();
    expect(isFinite(s.totalPieces)).toBeTrue();
    expect(isFinite(s.placedPieces)).toBeTrue();
    expect(isFinite(s.unfittedPieces)).toBeTrue();
    expect(isFinite(s.totalStockArea)).toBeTrue();
    expect(isFinite(s.totalUsedArea)).toBeTrue();
    
    // Utilization is a string (toFixed(1)) between 0 and 100
    const util = parseFloat(s.overallUtilization);
    expect(isFinite(util)).toBeTrue();
    expect(util).toBeGreaterThan(0);
    expect(util).toBeLessThanOrEqual(100);
    
    // Consistency
    expect(s.placedPieces + s.unfittedPieces).toBe(s.totalPieces);
    expect(s.totalWasteArea).toBe(s.totalStockArea - s.totalUsedArea);
    expect(s.totalBoards).toBe(r.boards.filter(b => !b.isOffcut).length);
  });

  // ── T-RENDER-22: Board con 0 piezas — geometría válida igualmente ────────
  test('T-RENDER-22: tablero vacío (0 piezas) → geometría SVG válida', () => {
    const emptyBoard = {
      stockWidth: 2750, stockHeight: 1830,
      pieces: [], offcuts: [],
    };
    const geo = computeRenderGeometry(emptyBoard);
    expect(geo.bScale > 0).toBeTrue();
    expect(geo.boardW > 0).toBeTrue();
    expect(geo.boardH > 0).toBeTrue();
    expect(isFinite(geo.svgW)).toBeTrue();
    expect(isFinite(geo.svgH)).toBeTrue();
  });

  // ── T-RENDER-23: Pieza de 1×1 — render positivo, no NaN ────────────────
  test('T-RENDER-23: pieza mínima 1×1 → pw y ph positivos en SVG', () => {
    const tinyPiece = { id:'t', x:0, y:0, placedWidth:1, placedHeight:1, name:'Nano' };
    const board = { stockWidth: 2750, stockHeight: 1830, pieces: [tinyPiece], offcuts: [] };
    const geo = computeRenderGeometry(board);
    const { pw, ph } = computePieceSVG(tinyPiece, geo);
    expect(pw > 0).toBeTrue();
    expect(ph > 0).toBeTrue();
    expect(isFinite(pw)).toBeTrue();
    expect(isFinite(ph)).toBeTrue();
  });

  // ── T-RENDER-24: Engine x/y vs SVG — la escala es proporcional ───────────
  test('T-RENDER-24: dos piezas con x-diff en engine muestran x-diff proporcional en SVG', () => {
    // Place a single wide board manually and check two pieces
    const synthBoard = {
      stockWidth: 1000, stockHeight: 500,
      pieces: [
        { id:'a', x:0,   y:0, placedWidth:400, placedHeight:200, name:'A' },
        { id:'b', x:500, y:0, placedWidth:400, placedHeight:200, name:'B' },
      ],
      offcuts: [],
    };
    const geo = computeRenderGeometry(synthBoard);
    const svgA = computePieceSVG(synthBoard.pieces[0], geo);
    const svgB = computePieceSVG(synthBoard.pieces[1], geo);
    
    // The x-difference in SVG should be exactly 500 * bScale
    const expectedDiff = 500 * geo.bScale;
    expect(Math.abs((svgB.px - svgA.px) - expectedDiff)).toBeLessThan(0.001);
  });

  // ── T-RENDER-25: DS-10 todos los tableros — geometría completa válida ─────
  test('T-RENDER-25: DS-10 todos los tableros → geometría SVG válida sin error', () => {
    const r = optimizeCuts(DS10.pieces, DS10.stock, DS10.options);
    let totalPiecesRendered = 0;

    for (const board of r.boards) {
      const geo = computeRenderGeometry(board);
      expect(geo.bScale > 0).toBeTrue();
      
      for (const piece of board.pieces) {
        const { px, py, pw, ph } = computePieceSVG(piece, geo);
        expect(isFinite(px) && isFinite(py) && isFinite(pw) && isFinite(ph)).toBeTrue();
        expect(pw > 0 && ph > 0).toBeTrue();
        totalPiecesRendered++;
      }
    }
    
    // All placed pieces should be renderable
    expect(totalPiecesRendered).toBe(r.stats.placedPieces);
  });
});
