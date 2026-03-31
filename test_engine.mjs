/**
 * test_engine.mjs
 * Test de backend para el motor de min-cuts de CutWood.
 * Dataset real: 92 piezas del conjunto de dos muebles idénticos + piezas comunes.
 * Ejecutar: node test_engine.mjs
 */

import { runLeptonPack } from './src/engine/leptonPacker.js';
import { runHorizontalStripPack } from './src/engine/horizontalStripPacker.js';
import { optimizeCuts } from './src/engine/optimizer.js';

// ── Dataset real (del análisis Lepton vs CutWood) ───────────────────────────
// Dos módulos de mueble idénticos + piezas comunes (zócalos, tapas, etc.)
const pieces = [
  // ── Módulo A ──
  { id: 'a1',  name: 'Lateral A1',    width: 600,  height: 350,  quantity: 2 },
  { id: 'a2',  name: 'Tapa A2',       width: 744,  height: 335,  quantity: 1 },
  { id: 'a3',  name: 'Zócalo A3',     width: 744,  height: 100,  quantity: 2 },
  { id: 'a4',  name: 'Estante A4',    width: 743,  height: 300,  quantity: 1 },
  { id: 'a5',  name: 'Puerta A5',     width: 586,  height: 382,  quantity: 2 },
  { id: 'a6',  name: 'Panel A6',      width: 595,  height: 763,  quantity: 1 },
  // ── Módulo B (igual al A) ──
  { id: 'b1',  name: 'Lateral B1',    width: 600,  height: 350,  quantity: 2 },
  { id: 'b2',  name: 'Tapa B2',       width: 744,  height: 335,  quantity: 1 },
  { id: 'b3',  name: 'Zócalo B3',     width: 744,  height: 100,  quantity: 2 },
  { id: 'b4',  name: 'Estante B4',    width: 744,  height: 280,  quantity: 1 },
  { id: 'b5',  name: 'Puerta B5',     width: 586,  height: 382,  quantity: 2 },
  { id: 'b6',  name: 'Panel B6',      width: 595,  height: 763,  quantity: 1 },
  // ── Piezas comunes pequeñas ──
  { id: 'c1',  name: 'Tabla C1',      width: 262,  height: 335,  quantity: 5 },
  { id: 'c2',  name: 'Tirante C2',    width: 109,  height: 335,  quantity: 6 },
  // ── Módulo C ──
  { id: 'd1',  name: 'Lateral D1',    width: 600,  height: 400,  quantity: 2 },
  { id: 'd2',  name: 'Tapa D2',       width: 744,  height: 385,  quantity: 1 },
  { id: 'd3',  name: 'Zócalo D3',     width: 744,  height: 100,  quantity: 2 },
  { id: 'd4',  name: 'Vetical D4',    width: 190,  height: 771,  quantity: 3 },
  { id: 'd5',  name: 'Panel D5',      width: 595,  height: 763,  quantity: 1 },
  { id: 'd6',  name: 'Tira D6',       width: 717,  height: 160,  quantity: 6 },
  { id: 'd7',  name: 'Frente D7',     width: 700,  height: 333,  quantity: 6 },
  // ── Módulo D (igual al C) ──
  { id: 'e1',  name: 'Lateral E1',    width: 600,  height: 400,  quantity: 2 },
  { id: 'e2',  name: 'Tapa E2',       width: 744,  height: 385,  quantity: 1 },
  { id: 'e3',  name: 'Zócalo E3',     width: 744,  height: 100,  quantity: 2 },
  { id: 'e4',  name: 'Vertical E4',   width: 190,  height: 771,  quantity: 3 },
  { id: 'e5',  name: 'Panel E5',      width: 595,  height: 763,  quantity: 1 },
  { id: 'e6',  name: 'Tira E6',       width: 717,  height: 160,  quantity: 6 },
  { id: 'e7',  name: 'Tira E7',       width: 314,  height: 160,  quantity: 6 },
  { id: 'e8',  name: 'Frente E8',     width: 700,  height: 333,  quantity: 6 },
  // ── Piezas grandes (una por módulo) ──
  { id: 'f1',  name: 'Fondo F1',      width: 1870, height: 1590, quantity: 1 },
  { id: 'f2',  name: 'Fondo F2',      width: 1870, height: 1590, quantity: 1 },
  // ── Piezas de remate ──
  { id: 'g1',  name: 'Remate G1',     width: 736,  height: 250,  quantity: 2 },
  { id: 'g2',  name: 'Remate G2',     width: 606,  height: 250,  quantity: 2 },
  { id: 'g3',  name: 'Remate G3',     width: 736,  height: 250,  quantity: 3 },
  { id: 'g4',  name: 'Remate G4',     width: 300,  height: 250,  quantity: 4 },
  { id: 'g5',  name: 'Remate G5',     width: 300,  height: 250,  quantity: 2 },
];

const stock   = { width: 2750, height: 1830, quantity: 99, grain: 'none' };
const options = { kerf: 3, edgeTrim: 0, allowRotation: true };

// ── Expanded pieces helper ──────────────────────────────────────────────────
function expand(pieces) {
  const out = [];
  for (const p of pieces) {
    for (let i = 0; i < (p.quantity || 1); i++) {
      out.push({ ...p, canRotate: true, forceRotated: false });
    }
  }
  return out;
}

// ── Scoring helpers ─────────────────────────────────────────────────────────
function scoreResult(result) {
  const boards  = result.boards;
  const nBoards = boards.length;
  const totalW  = boards.reduce((s, b) => s + (b.stockWidth  || stock.width)  * (b.stockHeight || stock.height), 0);
  const usedW   = boards.reduce((s, b) => s + b.pieces.reduce((a, p) => a + p.placedWidth * p.placedHeight, 0), 0);
  const util    = totalW > 0 ? (usedW / totalW * 100) : 0;

  // Count homogeneous rows: rows where all pieces have same placedHeight
  let homoRows = 0;
  for (const b of boards) {
    const rowMap = new Map();
    for (const p of b.pieces) {
      const rowKey = Math.round(p.y / 5) * 5; // snap Y to 5mm grid
      if (!rowMap.has(rowKey)) rowMap.set(rowKey, new Set());
      rowMap.get(rowKey).add(p.placedHeight);
    }
    for (const heights of rowMap.values()) {
      if (heights.size === 1) homoRows++;
    }
  }

  return { nBoards, util: util.toFixed(1), unfitted: result.unfitted?.length ?? 0, homoRows };
}

function printResult(label, result) {
  const s = scoreResult(result);
  const icon = s.unfitted > 0 ? '🚨' : s.nBoards <= 5 ? '✅' : '⚠️ ';
  const utilLine = result.boards.map((b, i) => {
    const bW = b.stockWidth || stock.width;
    const bH = b.stockHeight || stock.height;
    const bUsed = b.pieces.reduce((a, p) => a + p.placedWidth * p.placedHeight, 0);
    return `T${i+1}:${(bUsed/(bW*bH)*100).toFixed(0)}%`;
  }).join('  ');
  console.log(`${icon} ${label.padEnd(28)} | Tableros: ${String(s.nBoards).padStart(2)} | Util: ${String(s.util).padStart(5)}% | Filas homog.: ${String(s.homoRows).padStart(3)} | Unfitted: ${s.unfitted}`);
  console.log(`   ${' '.repeat(28)}   Per-board: ${utilLine}`);
}

// ── Run tests ──────────────────────────────────────────────────────────────
const expanded = expand(pieces);
const totalPieces = expanded.length;
const totalArea = expanded.reduce((s, p) => s + p.width * p.height, 0);
const boardArea = stock.width * stock.height;
const minBoards = Math.ceil(totalArea / boardArea);

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(' CutWood Engine Test — Dataset Real 92 piezas');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Piezas expandidas: ${totalPieces}`);
console.log(`  Área total piezas: ${(totalArea/1e6).toFixed(3)} m²`);
console.log(`  Área tablero:      ${(boardArea/1e6).toFixed(3)} m²`);
console.log(`  Mínimo teórico:    ${(totalArea/boardArea).toFixed(2)} tableros → se necesitan ${minBoards}`);
console.log('');

// ── A) Lepton Normal ────────────────────────────────────────────────────────
const rLepNorm = runLeptonPack(expanded.map(p => ({...p})), stock, options);
printResult('A) Lepton Normal', rLepNorm);

// ── B) HStrip Normal ────────────────────────────────────────────────────────
const rHNorm = runHorizontalStripPack(expanded.map(p => ({...p})), stock, options);
printResult('B) HStrip Normal', rHNorm);

// ── C) Lepton Transposed (columnas verticales) ─────────────────────────────
const tPieces = expanded.map(p => ({
  ...p,
  _origWidth: p.width,
  _origHeight: p.height,
  width:  p.height,
  height: p.width,
  canRotate: false,
}));
const tStock = { ...stock, width: stock.height, height: stock.width };
const rLepT = runLeptonPack(tPieces.map(p => ({...p})), tStock, options);
// Untranspose
rLepT.boards.forEach(b => {
  b.stockWidth  = stock.width;
  b.stockHeight = stock.height;
  b.pieces = b.pieces.map(p => ({
    ...p,
    x: p.y, y: p.x,
    placedWidth: p.placedHeight, placedHeight: p.placedWidth,
  }));
});
printResult('C) Lepton Transposed (col. vert.)', rLepT);

// ── C2) HStrip Transposed (columnas verticales) ────────────────────────────
const rHT = runHorizontalStripPack(tPieces.map(p => ({...p})), tStock, options);
rHT.boards.forEach(b => {
  b.stockWidth  = stock.width;
  b.stockHeight = stock.height;
  b.pieces = b.pieces.map(p => ({
    ...p,
    x: p.y, y: p.x,
    placedWidth: p.placedHeight, placedHeight: p.placedWidth,
  }));
});
printResult('C2) HStrip Transposed (col. vert.)', rHT);

// ── D) optimizeCuts min-cuts (full engine) ─────────────────────────────────
console.log('');
console.log('  Ejecutando optimizeCuts(min-cuts)... (puede tardar 1-2s)');
const t0 = Date.now();
const rMinCuts = optimizeCuts(pieces, stock, { ...options, optimizationMode: 'min-cuts' });
const elapsed = Date.now() - t0;

// Convert boardResults format
const minCutsRaw = {
  boards: rMinCuts.boards.map(b => ({
    stockWidth:  b.stockWidth,
    stockHeight: b.stockHeight,
    pieces: b.pieces,
  })),
  unfitted: rMinCuts.unfitted,
};
printResult(`D) optimizeCuts min-cuts (${elapsed}ms)`, minCutsRaw);

// ── E) optimizeCuts max-utilization (comparación) ─────────────────────────
console.log('');
console.log('  Ejecutando optimizeCuts(max-utilization)... (puede tardar 3-5s)');
const t1 = Date.now();
const rMaxUtil = optimizeCuts(pieces, stock, { ...options, optimizationMode: 'max-utilization' });
const elapsed2 = Date.now() - t1;

const maxUtilRaw = {
  boards: rMaxUtil.boards.map(b => ({
    stockWidth:  b.stockWidth,
    stockHeight: b.stockHeight,
    pieces: b.pieces,
  })),
  unfitted: rMaxUtil.unfitted,
};
printResult(`E) optimizeCuts max-util (${elapsed2}ms)`, maxUtilRaw);

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(' Comparativa de referencia (sesión anterior, sin fixes):');
console.log('  Lepton Normal      → 6 tableros, 67.0% util, 0 unfitted');
console.log('  HStrip Normal      → 5 tableros, 80.4% util, 0 unfitted  ← era el ganador');
console.log('  Lepton Transposed  → 4 tableros, 71.0% util, 2 unfitted  ← bugueado');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// ── Detalle por tablero del mejor resultado ─────────────────────────────────
console.log(' DETALLE POR TABLERO — optimizeCuts min-cuts:');
for (const b of rMinCuts.boards) {
  const bArea = b.stockWidth * b.stockHeight;
  const used  = b.pieces.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0);
  const util  = (used / bArea * 100).toFixed(1);

  // Group pieces by Y-row
  const rowMap = new Map();
  for (const p of b.pieces) {
    const rowKey = Math.round(p.y / 5) * 5;
    if (!rowMap.has(rowKey)) rowMap.set(rowKey, []);
    rowMap.get(rowKey).push(p);
  }
  const rows = [...rowMap.entries()].sort((a,b) => a[0]-b[0]);

  console.log(`\n  Tablero ${b.boardIndex + 1}: ${util}% util | ${b.pieces.length} piezas | ${rows.length} filas`);
  for (const [y, ps] of rows) {
    const heights = [...new Set(ps.map(p => p.placedHeight))].join('/');
    const widths  = ps.map(p => `${p.placedWidth}`).join('+');
    const homo    = new Set(ps.map(p=>p.placedHeight)).size === 1 ? '✅' : '⚠️ ';
    console.log(`    y=${String(y).padStart(4)}mm | h=${heights.padEnd(8)} | piezas: ${ps.length} | ${homo} | anchos: ${widths}`);
  }
}
