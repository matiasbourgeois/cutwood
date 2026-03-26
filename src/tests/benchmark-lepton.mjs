/**
 * Benchmark v3: CutWood v3 (multi-heuristic) vs Lepton Sistemas Pro
 * Uses ES module imports from actual engine files.
 */

import { optimizeCuts } from '../engine/optimizer.js';

const examples = [
  {
    name: 'Ejemplo 1 — Piezas variadas',
    board: { w: 2750, h: 1830, trim: 5 },
    kerf: 3,
    pieces: [
      { id: 'p2',  name: 'Ref 2',  width: 910,  height: 1349, quantity: 1 },
      { id: 'p14', name: 'Ref 14', width: 534,  height: 1622, quantity: 1 },
      { id: 'p16', name: 'Ref 16', width: 1018, height: 902,  quantity: 1 },
      { id: 'p19', name: 'Ref 19', width: 2620, height: 280,  quantity: 1 },
      { id: 'p15', name: 'Ref 15', width: 1018, height: 262,  quantity: 1 },
      { id: 'p17', name: 'Ref 17', width: 1018, height: 262,  quantity: 1 },
      { id: 'p5',  name: 'Ref 5',  width: 447,  height: 331,  quantity: 2 },
    ],
    pro: { waste: 9.092, boards: 1 },
  },
  {
    name: 'Ejemplo 2 — Complejo, muchas piezas',
    board: { w: 2750, h: 1830, trim: 5 },
    kerf: 3,
    pieces: [
      { id: 'p1',  name: 'Ref 1',  width: 1694, height: 300,  quantity: 1 },
      { id: 'p18', name: 'Ref 18', width: 1018, height: 518,  quantity: 1 },
      { id: 'p12', name: 'Ref 12', width: 1568, height: 280,  quantity: 2 },
      { id: 'p7',  name: 'Ref 7',  width: 1024, height: 280,  quantity: 2 },
      { id: 'p10', name: 'Ref 10', width: 1024, height: 280,  quantity: 2 },
      { id: 'p4',  name: 'Ref 4',  width: 874,  height: 280,  quantity: 2 },
      { id: 'p13', name: 'Ref 13', width: 534,  height: 280,  quantity: 1 },
      { id: 'p23', name: 'Ref 23', width: 990,  height: 100,  quantity: 1 },
      { id: 'p24', name: 'Ref 24', width: 990,  height: 100,  quantity: 1 },
      { id: 'p3',  name: 'Ref 3',  width: 345,  height: 280,  quantity: 2 },
      { id: 'p6',  name: 'Ref 6',  width: 345,  height: 280,  quantity: 2 },
    ],
    pro: { waste: 14.876, boards: 1 },
  },
  {
    name: 'Ejemplo 3 — Piezas largas 2620mm',
    board: { w: 2750, h: 1830, trim: 5 },
    kerf: 3,
    pieces: [
      { id: 'p1',  name: 'Ref 1',  width: 1694, height: 300,  quantity: 3 },
      { id: 'p9',  name: 'Ref 9',  width: 345,  height: 280,  quantity: 2 },
      { id: 'p20', name: 'Ref 20', width: 2620, height: 100,  quantity: 1 },
      { id: 'p21', name: 'Ref 21', width: 2620, height: 100,  quantity: 1 },
      { id: 'p22', name: 'Ref 22', width: 2620, height: 100,  quantity: 1 },
      { id: 'p8',  name: 'Ref 8',  width: 522,  height: 331,  quantity: 2 },
      { id: 'p11', name: 'Ref 11', width: 522,  height: 331,  quantity: 2 },
      { id: 'p13', name: 'Ref 13', width: 534,  height: 280,  quantity: 1 },
    ],
    pro: { waste: 33.543, boards: 1 },
  },
  {
    name: 'Ejemplo 4 — Alta eficiencia, tablero 2600',
    board: { w: 2600, h: 1830, trim: 5 },
    kerf: 3,
    pieces: [
      { id: 'p13', name: 'Ref 13', width: 1658, height: 630,  quantity: 1 },
      { id: 'p11', name: 'Ref 11', width: 1014, height: 1060, quantity: 2 },
      { id: 'p1',  name: 'Ref 1',  width: 910,  height: 282,  quantity: 2 },
      { id: 'p15', name: 'Ref 15', width: 1292, height: 100,  quantity: 1 },
      { id: 'p8',  name: 'Ref 8',  width: 534,  height: 250,  quantity: 4 },
      { id: 'p18', name: 'Ref 18', width: 1027, height: 70,   quantity: 1 },
    ],
    pro: { waste: 6.630, boards: 1 },
  },
];

console.log('');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  🏆 BENCHMARK v3: CutWood Multi-Heuristic vs Lepton PRO  🏆  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

const results = [];

for (const ex of examples) {
  const stock = { width: ex.board.w, height: ex.board.h, grain: 'none' };
  const opts = { kerf: ex.kerf, allowRotation: true, edgeTrim: ex.board.trim };

  const t0 = performance.now();
  const result = optimizeCuts(ex.pieces, stock, opts);
  const t1 = performance.now();

  const ourWaste = 100 - parseFloat(result.stats.overallUtilization);
  const delta = ourWaste - ex.pro.waste;
  const rating = delta <= 0 ? '🏆 MEJOR' : delta <= 2 ? '✅ CERCANO' : delta <= 5 ? '⚠️ OK' : '❌ MEJORAR';

  results.push({ name: ex.name, ourWaste, proWaste: ex.pro.waste, delta, rating,
    ourBoards: result.stats.totalBoards, proBoards: ex.pro.boards,
    time: (t1-t0).toFixed(1), unfitted: result.stats.unfittedPieces,
    placed: result.stats.placedPieces });

  console.log(`${rating}  ${ex.name}`);
  console.log(`  CutWood: ${ourWaste.toFixed(2)}% waste, ${result.stats.totalBoards} tablero(s) | Lepton: ${ex.pro.waste}% waste, ${ex.pro.boards} tablero(s)`);
  console.log(`  Delta: ${(delta > 0 ? '+' : '')}${delta.toFixed(2)}% | Time: ${(t1-t0).toFixed(1)}ms | Placed: ${result.stats.placedPieces}/${result.stats.totalPieces}`);
  
  // Board details
  for (const b of result.boards) {
    console.log(`  Board ${b.boardIndex+1}: ${b.pieces.length} pzas, ${b.utilization.toFixed(1)}% util`);
  }
  console.log('');
}

// Summary
const avgOurWaste = results.reduce((s,r) => s + r.ourWaste, 0) / results.length;
const avgProWaste = results.reduce((s,r) => s + r.proWaste, 0) / results.length;
const avgDelta = avgOurWaste - avgProWaste;
const totalExtraBoards = results.reduce((s,r) => s + (r.ourBoards - r.proBoards), 0);

console.log('Summary:');
console.log(`  Avg waste: CutWood ${avgOurWaste.toFixed(2)}% vs Lepton ${avgProWaste.toFixed(2)}% (Δ ${avgDelta > 0 ? '+' : ''}${avgDelta.toFixed(2)}%)`);
console.log(`  Extra boards: ${totalExtraBoards}`);
console.log(`  ${avgDelta <= 5 ? '✅ DENTRO DEL TARGET' : '❌ FUERA DEL TARGET (<5%)'}`);
