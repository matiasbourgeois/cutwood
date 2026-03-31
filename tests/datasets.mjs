/**
 * tests/datasets.mjs
 * Todos los datasets de prueba DS-01 a DS-15.
 * Cada dataset = { label, pieces, stock, options, expand() }
 */

/** Expand pieces array (qty → individual entries) */
export function expandPieces(pieces, grain = 'none') {
  const out = [];
  for (const p of pieces) {
    const qty = p.quantity || 1;
    const pieceGrain = p.grain || 'none';
    let canRotate = true, forceRotated = false;
    let w = p.width, h = p.height;
    if (pieceGrain !== 'none' && grain !== 'none') {
      if (pieceGrain !== grain) { w = p.height; h = p.width; forceRotated = true; }
      canRotate = false;
    } else if (pieceGrain !== 'none') {
      canRotate = false;
    }
    for (let i = 0; i < qty; i++) {
      out.push({ ...p, width: w, height: h, canRotate, forceRotated, copyIndex: i });
    }
  }
  return out;
}

// ── DS-01: Pieza única que encaja perfecto ──────────────────────────────────
export const DS01 = {
  label: 'DS-01 — pieza exacta al tablero',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 0, edgeTrim: 0, allowRotation: true },
  pieces: [{ id: 'p1', name: 'Panel', width: 2750, height: 1830, quantity: 1 }],
  expect: { maxBoards: 1, maxUnfitted: 0, minUtil: 99.0 },
};

// ── DS-02: Pieza que NO cabe (1mm más ancha) ────────────────────────────────
export const DS02 = {
  label: 'DS-02 — pieza 1mm mayor que tablero',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 0, edgeTrim: 0, allowRotation: false },
  pieces: [{ id: 'p1', name: 'Gigante', width: 2751, height: 1830, quantity: 1 }],
  expect: { maxBoards: 0, exactUnfitted: 1 },
};

// ── DS-03: Sin piezas ───────────────────────────────────────────────────────
export const DS03 = {
  label: 'DS-03 — cero piezas',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [],
  expect: { maxBoards: 0, exactUnfitted: 0 },
};

// ── DS-04: Una pieza diminuta ───────────────────────────────────────────────
export const DS04 = {
  label: 'DS-04 — pieza pequeña 100×100',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [{ id: 'p1', name: 'Taquito', width: 100, height: 100, quantity: 1 }],
  expect: { maxBoards: 1, maxUnfitted: 0 },
};

// ── DS-05: Grilla perfecta sin kerf ────────────────────────────────────────
// 5 × 550 = 2750 ancho. 3 × 610 = 1830 alto. Entra justo en UN tablero.
export const DS05 = {
  label: 'DS-05 — grilla perfecta sin kerf (5×3=15 piezas)',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 0, edgeTrim: 0, allowRotation: false },
  pieces: [{ id: 'p1', name: 'Celda', width: 550, height: 610, quantity: 15 }],
  expect: { maxBoards: 1, maxUnfitted: 0 },
};

// ── DS-06: Con kerf — grilla que sigue cabiendo ────────────────────────────
// 4 × 540 + 3 kerf = 2160 + 9 = 2169 (<2750). 3 × 590 + 2 kerf = 1770 + 6 = 1776 (<1830).
export const DS06 = {
  label: 'DS-06 — grilla con kerf=5',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 5, edgeTrim: 0, allowRotation: false },
  pieces: [{ id: 'p1', name: 'Celda', width: 540, height: 590, quantity: 12 }],
  expect: { maxBoards: 1, maxUnfitted: 0 },
};

// ── DS-07: Con edgeTrim ─────────────────────────────────────────────────────
export const DS07 = {
  label: 'DS-07 — con edgeTrim=10',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 10, allowRotation: true },
  pieces: [
    { id: 'p1', name: 'A', width: 500, height: 500, quantity: 2 },
    { id: 'p2', name: 'B', width: 400, height: 400, quantity: 2 },
  ],
  expect: { maxBoards: 1, maxUnfitted: 0, minEdgeOffset: 10 },
};

// ── DS-08: Grain constrained — no rotation ─────────────────────────────────
export const DS08 = {
  label: 'DS-08 — veta: pieza y tablero mismo grain, sin rotación',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'horizontal' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [
    { id: 'p1', name: 'Horizontal', width: 400, height: 1500, quantity: 2, grain: 'horizontal' },
  ],
  expect: { maxBoards: 1, maxUnfitted: 0, noRotation: true },
};

// ── DS-09: Grain — forced rotation ─────────────────────────────────────────
export const DS09 = {
  label: 'DS-09 — veta: pieza vertical en tablero horizontal → forzar rotación',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'horizontal' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [
    { id: 'p1', name: 'Vertical', width: 400, height: 1500, quantity: 1, grain: 'vertical' },
  ],
  // After forced rotation: placedWidth=1500, placedHeight=400
  expect: { maxBoards: 1, maxUnfitted: 0, forcedRotation: true },
};

// ── DS-10: Dataset real — 92 piezas ────────────────────────────────────────
export const DS10 = {
  label: 'DS-10 — dataset real 92 piezas (muebles)',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [
    { id: 'a1', name: 'Lateral A1',   width: 600,  height: 350,  quantity: 2 },
    { id: 'a2', name: 'Tapa A2',      width: 744,  height: 335,  quantity: 1 },
    { id: 'a3', name: 'Zócalo A3',    width: 744,  height: 100,  quantity: 2 },
    { id: 'a4', name: 'Estante A4',   width: 743,  height: 300,  quantity: 1 },
    { id: 'a5', name: 'Puerta A5',    width: 586,  height: 382,  quantity: 2 },
    { id: 'a6', name: 'Panel A6',     width: 595,  height: 763,  quantity: 1 },
    { id: 'b1', name: 'Lateral B1',   width: 600,  height: 350,  quantity: 2 },
    { id: 'b2', name: 'Tapa B2',      width: 744,  height: 335,  quantity: 1 },
    { id: 'b3', name: 'Zócalo B3',    width: 744,  height: 100,  quantity: 2 },
    { id: 'b4', name: 'Estante B4',   width: 744,  height: 280,  quantity: 1 },
    { id: 'b5', name: 'Puerta B5',    width: 586,  height: 382,  quantity: 2 },
    { id: 'b6', name: 'Panel B6',     width: 595,  height: 763,  quantity: 1 },
    { id: 'c1', name: 'Tabla C1',     width: 262,  height: 335,  quantity: 5 },
    { id: 'c2', name: 'Tirante C2',   width: 109,  height: 335,  quantity: 6 },
    { id: 'd1', name: 'Lateral D1',   width: 600,  height: 400,  quantity: 2 },
    { id: 'd2', name: 'Tapa D2',      width: 744,  height: 385,  quantity: 1 },
    { id: 'd3', name: 'Zócalo D3',    width: 744,  height: 100,  quantity: 2 },
    { id: 'd4', name: 'Vertical D4',  width: 190,  height: 771,  quantity: 3 },
    { id: 'd5', name: 'Panel D5',     width: 595,  height: 763,  quantity: 1 },
    { id: 'd6', name: 'Tira D6',      width: 717,  height: 160,  quantity: 6 },
    { id: 'd7', name: 'Frente D7',    width: 700,  height: 333,  quantity: 6 },
    { id: 'e1', name: 'Lateral E1',   width: 600,  height: 400,  quantity: 2 },
    { id: 'e2', name: 'Tapa E2',      width: 744,  height: 385,  quantity: 1 },
    { id: 'e3', name: 'Zócalo E3',    width: 744,  height: 100,  quantity: 2 },
    { id: 'e4', name: 'Vertical E4',  width: 190,  height: 771,  quantity: 3 },
    { id: 'e5', name: 'Panel E5',     width: 595,  height: 763,  quantity: 1 },
    { id: 'e6', name: 'Tira E6',      width: 717,  height: 160,  quantity: 6 },
    { id: 'e7', name: 'Tira E7',      width: 314,  height: 160,  quantity: 6 },
    { id: 'e8', name: 'Frente E8',    width: 700,  height: 333,  quantity: 6 },
    { id: 'f1', name: 'Fondo F1',     width: 1870, height: 1590, quantity: 1 },
    { id: 'f2', name: 'Fondo F2',     width: 1870, height: 1590, quantity: 1 },
    { id: 'g1', name: 'Remate G1',    width: 736,  height: 250,  quantity: 2 },
    { id: 'g2', name: 'Remate G2',    width: 606,  height: 250,  quantity: 2 },
    { id: 'g3', name: 'Remate G3',    width: 736,  height: 250,  quantity: 3 },
    { id: 'g4', name: 'Remate G4',    width: 300,  height: 250,  quantity: 4 },
    { id: 'g5', name: 'Remate G5',    width: 300,  height: 250,  quantity: 2 },
  ],
  expect: { maxBoards: 7, maxUnfitted: 0 },
};

// ── DS-11: Stress — 200 piezas aleatorias (seed fijo) ──────────────────────
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
const rng11 = seededRng(42);
export const DS11 = {
  label: 'DS-11 — stress: 200 piezas aleatorias (seed=42)',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: Array.from({ length: 200 }, (_, i) => ({
    id: `s${i}`,
    name: `Stress-${i}`,
    width:  Math.round(100 + rng11() * 500),
    height: Math.round(100 + rng11() * 500),
    quantity: 1,
  })),
  expect: { maxUnfitted: 0 },
};

// ── DS-12: Extreme aspect ratio — sliders largos y finos ───────────────────
export const DS12 = {
  label: 'DS-12 — sliders 2700×50 (ratio 54:1)',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [{ id: 'sl', name: 'Slider', width: 2700, height: 50, quantity: 10 }],
  expect: { maxBoards: 2, maxUnfitted: 0 },
};

// ── DS-13: Stock cuadrado — transposición debe saltearse ────────────────────
export const DS13 = {
  label: 'DS-13 — tablero cuadrado 1830×1830',
  stock: { width: 1830, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [
    { id: 'p1', name: 'A', width: 400, height: 300, quantity: 6 },
    { id: 'p2', name: 'B', width: 600, height: 200, quantity: 4 },
  ],
  expect: { maxUnfitted: 0 },
};

// ── DS-14: Pieza más grande que el tablero en una dimensión ────────────────
// 3000×400: con rotation → 400×3000, pero 3000>1830 → unfitted
export const DS14 = {
  label: 'DS-14 — pieza inaceptable en ambas orientaciones',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [
    { id: 'big', name: 'Gigante', width: 3000, height: 400, quantity: 1 },
    { id: 'ok',  name: 'Normal',  width: 500,  height: 300, quantity: 2 },
  ],
  expect: { exactUnfitted: 1 }, // solo la gigante
};

// ── DS-15: Todas las piezas del mismo tamaño ────────────────────────────────
export const DS15 = {
  label: 'DS-15 — 40 piezas idénticas 300×250',
  stock: { width: 2750, height: 1830, quantity: 99, grain: 'none' },
  options: { kerf: 3, edgeTrim: 0, allowRotation: true },
  pieces: [{ id: 'uni', name: 'Universal', width: 300, height: 250, quantity: 40 }],
  expect: { maxUnfitted: 0, maxBoards: 3 },
};

export const ALL_DATASETS = [DS01, DS02, DS03, DS04, DS05, DS06, DS07, DS08, DS09, DS10, DS11, DS12, DS13, DS14, DS15];
