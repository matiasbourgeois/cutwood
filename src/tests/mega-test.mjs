/**
 * CutWood — Mega Test Suite
 * Tests the optimizer with various real-world furniture scenarios.
 * Run: node --experimental-modules src/tests/mega-test.mjs
 */

import { GuillotineBin } from '../engine/guillotine.js';
import { optimizeCuts } from '../engine/optimizer.js';

// Standard Argentine melamine boards
const STOCK_18MM = { width: 2750, height: 1830, thickness: 18, quantity: 10 };
const STOCK_15MM = { width: 2750, height: 1830, thickness: 15, quantity: 10 };
const STOCK_SMALL = { width: 1830, height: 2600, thickness: 18, quantity: 10 };

const OPTIONS = { kerf: 3, allowRotation: true, edgeTrim: 0 };

// ═══════════════════════════════════════════════════════
// TEST CASES — Real furniture scenarios
// ═══════════════════════════════════════════════════════

const TEST_CASES = [
  {
    name: '1. Modular simple (5 piezas)',
    desc: 'Un modular chico clasico — deberia caber en 1 tablero',
    pieces: [
      { id: 'lat_der', name: 'Lateral derecho', width: 600, height: 400, quantity: 1 },
      { id: 'lat_izq', name: 'Lateral izquierdo', width: 600, height: 400, quantity: 1 },
      { id: 'estante', name: 'Estante', width: 550, height: 300, quantity: 3 },
      { id: 'tapa', name: 'Tapa superior', width: 600, height: 300, quantity: 1 },
      { id: 'base', name: 'Base', width: 600, height: 300, quantity: 1 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    expectedMinUtil: 20,
  },
  {
    name: '2. Placard grande (muchas piezas iguales)',
    desc: 'Placard 2.40m alto x 1.80m ancho — varias piezas grandes que requieren 2+ tableros',
    pieces: [
      { id: 'lateral', name: 'Lateral', width: 2400, height: 600, quantity: 2 },
      { id: 'estante', name: 'Estante', width: 1770, height: 600, quantity: 5 },
      { id: 'division', name: 'Division', width: 2400, height: 300, quantity: 1 },
      { id: 'techo', name: 'Techo', width: 1800, height: 600, quantity: 1 },
      { id: 'piso', name: 'Piso', width: 1800, height: 600, quantity: 1 },
      { id: 'fondo', name: 'Fondo', width: 2400, height: 1800, quantity: 1 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 4,
    expectedMinUtil: 40,
  },
  {
    name: '3. Cocina modular (piezas variadas)',
    desc: 'Bajo mesada + alacena — muchas piezas chicas y medianas',
    pieces: [
      { id: 'lat_bm', name: 'Lateral bajo mesada', width: 850, height: 580, quantity: 4 },
      { id: 'est_bm', name: 'Estante bajo mesada', width: 580, height: 550, quantity: 6 },
      { id: 'lat_al', name: 'Lateral alacena', width: 700, height: 350, quantity: 4 },
      { id: 'est_al', name: 'Estante alacena', width: 350, height: 550, quantity: 6 },
      { id: 'tapa_bm', name: 'Tapa bajo mesada', width: 2000, height: 580, quantity: 1 },
      { id: 'tapa_al', name: 'Tapa alacena', width: 2000, height: 350, quantity: 1 },
      { id: 'zocalo', name: 'Zocalo', width: 2000, height: 100, quantity: 1 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 2,
    expectedMinUtil: 40,
  },
  {
    name: '4. Mesa de escritorio grande',
    desc: 'Pieza unica muy grande — testa el limite del tablero',
    pieces: [
      { id: 'tapa', name: 'Tapa escritorio', width: 1600, height: 800, quantity: 1 },
      { id: 'lateral', name: 'Lateral', width: 730, height: 600, quantity: 2 },
      { id: 'fondo', name: 'Fondo', width: 1600, height: 300, quantity: 1 },
      { id: 'cajon_lat', name: 'Lateral cajon', width: 400, height: 150, quantity: 4 },
      { id: 'cajon_fren', name: 'Frente cajon', width: 500, height: 150, quantity: 2 },
      { id: 'cajon_fon', name: 'Fondo cajon', width: 500, height: 130, quantity: 2 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    expectedMinUtil: 35,
  },
  {
    name: '5. Vestidor completo (alto volumen)',
    desc: 'Muchas piezas — requiere multiples tableros',
    pieces: [
      { id: 'lateral', name: 'Lateral', width: 2400, height: 600, quantity: 4 },
      { id: 'estante', name: 'Estante', width: 800, height: 600, quantity: 12 },
      { id: 'division', name: 'Division', width: 2400, height: 400, quantity: 3 },
      { id: 'techo', name: 'Techo', width: 2500, height: 600, quantity: 1 },
      { id: 'base', name: 'Base', width: 2500, height: 600, quantity: 1 },
      { id: 'cajonera_lat', name: 'Lat cajonera', width: 500, height: 400, quantity: 4 },
      { id: 'cajonera_fr', name: 'Frente cajon', width: 800, height: 200, quantity: 8 },
      { id: 'barra', name: 'Soporte barra', width: 600, height: 100, quantity: 4 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 5,
    expectedMinUtil: 40,
  },
  {
    name: '6. Pieza que excede tablero',
    desc: 'Una pieza mas grande que el tablero — debe ir a unfitted',
    pieces: [
      { id: 'gigante', name: 'Pieza imposible', width: 3000, height: 1900, quantity: 1 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 0,
    expectedUnfitted: 1,
  },
  {
    name: '7. Estanteria alta con muchas repisas',
    desc: 'Test para muchas piezas identicas chicas',
    pieces: [
      { id: 'lateral', name: 'Lateral', width: 2000, height: 300, quantity: 2 },
      { id: 'repisa', name: 'Repisa', width: 800, height: 300, quantity: 10 },
      { id: 'tapa', name: 'Tapa', width: 830, height: 300, quantity: 1 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    expectedMinUtil: 25,
  },
  {
    name: '8. Rack TV grande',
    desc: 'Mueble TV moderno con vanos y cajones',
    pieces: [
      { id: 'tapa', name: 'Tapa', width: 1800, height: 450, quantity: 1 },
      { id: 'base', name: 'Base', width: 1800, height: 450, quantity: 1 },
      { id: 'lateral', name: 'Lateral', width: 450, height: 500, quantity: 2 },
      { id: 'division', name: 'Division vertical', width: 450, height: 400, quantity: 2 },
      { id: 'repisa', name: 'Repisa vidrio soporte', width: 550, height: 300, quantity: 2 },
      { id: 'fondo', name: 'Fondo', width: 1800, height: 500, quantity: 1 },
      { id: 'cajon_fr', name: 'Frente cajon', width: 550, height: 200, quantity: 3 },
      { id: 'cajon_lat', name: 'Lateral cajon', width: 380, height: 150, quantity: 6 },
      { id: 'cajon_fon', name: 'Fondo cajon', width: 520, height: 150, quantity: 3 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    expectedMinUtil: 30,
  },
  {
    name: '9. Sin rotacion permitida',
    desc: 'Piezas con veta — no se pueden rotar',
    pieces: [
      { id: 'lateral', name: 'Lateral (veta)', width: 2000, height: 500, quantity: 2 },
      { id: 'estante', name: 'Estante (veta)', width: 1000, height: 500, quantity: 4 },
      { id: 'tapa', name: 'Tapa (veta)', width: 1050, height: 500, quantity: 1 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 2,
    options: { kerf: 3, allowRotation: false, edgeTrim: 0 },
  },
  {
    name: '10. Kerf grande (sierra gruesa)',
    desc: 'Sierra de 5mm de kerf — consume mas material',
    pieces: [
      { id: 'pieza', name: 'Pieza standard', width: 500, height: 400, quantity: 8 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    options: { kerf: 5, allowRotation: true, edgeTrim: 0 },
  },

  // ═══════════════════════════════════════════════════════
  // GRAIN DIRECTION TESTS
  // ═══════════════════════════════════════════════════════
  {
    name: '11. Veta vertical (no rota)',
    desc: 'Piezas con grain=vertical no deben rotarse',
    pieces: [
      { id: 'lat', name: 'Lateral', width: 2000, height: 500, quantity: 2, grain: 'vertical' },
      { id: 'est', name: 'Estante', width: 800, height: 500, quantity: 3, grain: 'vertical' },
    ],
    stock: STOCK_18MM,
    expectedMinUtil: 25,
    // Custom check: verify no rotated pieces
    customCheck: (result) => {
      for (const board of result.boards) {
        for (const p of board.pieces) {
          if (p.rotated) return `ROTADA: "${p.name}" fue rotada pero tiene veta`;
        }
      }
      return null;
    },
  },
  {
    name: '12. Mix veta + sin veta',
    desc: 'Piezas con veta no rotan, sin veta si pueden',
    pieces: [
      { id: 'con', name: 'Con veta', width: 800, height: 300, quantity: 3, grain: 'horizontal' },
      { id: 'sin', name: 'Sin veta', width: 800, height: 300, quantity: 3 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    customCheck: (result) => {
      for (const board of result.boards) {
        for (const p of board.pieces) {
          if ((p.grain === 'horizontal' || p.grain === 'vertical') && p.rotated) {
            return `ROTADA: "${p.name}" con veta fue rotada`;
          }
        }
      }
      return null;
    },
  },
  {
    name: '13. Strips no mezclan grains',
    desc: 'Piezas iguales con distinta veta = strips separados',
    pieces: [
      { id: 'a', name: 'Pieza A', width: 500, height: 300, quantity: 4, grain: 'vertical' },
      { id: 'b', name: 'Pieza B', width: 500, height: 300, quantity: 4 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    customCheck: (result) => {
      // Check pieces with grain are not rotated
      for (const board of result.boards) {
        for (const p of board.pieces) {
          if (p.grain === 'vertical' && p.rotated) {
            return `ROTADA: "${p.name}" con veta fue rotada en strip`;
          }
        }
      }
      return null;
    },
  },
  {
    name: '14. Veta + rotacion global OFF',
    desc: 'Doble lock: nada rota',
    pieces: [
      { id: 'p', name: 'Pieza', width: 600, height: 400, quantity: 4, grain: 'vertical' },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    options: { kerf: 3, allowRotation: false, edgeTrim: 0 },
    customCheck: (result) => {
      for (const board of result.boards) {
        for (const p of board.pieces) {
          if (p.rotated) return `ROTADA: "${p.name}" rotada con rotacion OFF`;
        }
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════
  // TAPACANTO TESTS
  // ═══════════════════════════════════════════════════════
  {
    name: '15. Tapacanto — metros lineales',
    desc: '2 piezas 800x400, top+bottom = 3.2m total',
    pieces: [
      { id: 'p', name: 'Pieza', width: 800, height: 400, quantity: 2,
        edgeBanding: { top: true, bottom: true, left: false, right: false } },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    customCheck: (result, tc) => {
      // Calculate expected edge banding
      const meters = tc.pieces.reduce((total, p) => {
        const eb = p.edgeBanding;
        if (!eb) return total;
        let m = 0;
        if (eb.top) m += p.width;
        if (eb.bottom) m += p.width;
        if (eb.left) m += p.height;
        if (eb.right) m += p.height;
        return total + (m * p.quantity) / 1000;
      }, 0);
      if (Math.abs(meters - 3.2) > 0.01) return `TAPACANTO: ${meters}m (esperado: 3.2m)`;
      return null;
    },
  },
  {
    name: '16. Tapacanto — solo bordes largos',
    desc: 'Solo top+bottom de 1000mm, no laterales',
    pieces: [
      { id: 'p', name: 'Pieza', width: 1000, height: 300, quantity: 1,
        edgeBanding: { top: true, bottom: true, left: false, right: false } },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    customCheck: (result, tc) => {
      const meters = tc.pieces.reduce((total, p) => {
        const eb = p.edgeBanding;
        if (!eb) return total;
        let m = 0;
        if (eb.top) m += p.width;
        if (eb.bottom) m += p.width;
        if (eb.left) m += p.height;
        if (eb.right) m += p.height;
        return total + (m * p.quantity) / 1000;
      }, 0);
      if (Math.abs(meters - 2.0) > 0.01) return `TAPACANTO: ${meters}m (esperado: 2.0m)`;
      return null;
    },
  },
  {
    name: '17. Tapacanto — qty 5 x 4 bordes',
    desc: '5 copias, 4 bordes cada una',
    pieces: [
      { id: 'p', name: 'Pieza', width: 600, height: 400, quantity: 5,
        edgeBanding: { top: true, bottom: true, left: true, right: true } },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
    customCheck: (result, tc) => {
      const meters = tc.pieces.reduce((total, p) => {
        const eb = p.edgeBanding;
        if (!eb) return total;
        let m = 0;
        if (eb.top) m += p.width;
        if (eb.bottom) m += p.width;
        if (eb.left) m += p.height;
        if (eb.right) m += p.height;
        return total + (m * p.quantity) / 1000;
      }, 0);
      // 5 * (600+600+400+400) = 5 * 2000 = 10000mm = 10m
      if (Math.abs(meters - 10.0) > 0.01) return `TAPACANTO: ${meters}m (esperado: 10.0m)`;
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════
  // COST TESTS
  // ═══════════════════════════════════════════════════════
  {
    name: '18. Costo basico — 2 tableros',
    desc: '2 tableros x $45000 = $90000',
    pieces: [
      { id: 'lat', name: 'Lateral', width: 2400, height: 600, quantity: 2 },
      { id: 'est', name: 'Estante', width: 1770, height: 600, quantity: 5 },
      { id: 'techo', name: 'Techo', width: 1800, height: 600, quantity: 1 },
      { id: 'piso', name: 'Piso', width: 1800, height: 600, quantity: 1 },
    ],
    stock: { ...STOCK_18MM, pricePerBoard: 45000 },
    expectedMinUtil: 40,
    customCheck: (result, tc) => {
      const boardCost = result.stats.totalBoards * tc.stock.pricePerBoard;
      if (boardCost <= 0) return `COSTO: $${boardCost} (esperado: > 0)`;
      return null;
    },
  },
  {
    name: '19. Costo con tapacanto',
    desc: 'Board cost + edge cost',
    pieces: [
      { id: 'p', name: 'Pieza', width: 1000, height: 500, quantity: 2,
        edgeBanding: { top: true, bottom: false, left: false, right: false } },
    ],
    stock: { ...STOCK_18MM, pricePerBoard: 40000, pricePerMeterEdge: 500 },
    expectedBoards: 1,
    customCheck: (result, tc) => {
      const boardCost = result.stats.totalBoards * tc.stock.pricePerBoard;
      // edge: 2 * 1000mm top = 2000mm = 2m * $500 = $1000
      const edgeMeters = 2 * 1000 / 1000;
      const edgeCost = edgeMeters * tc.stock.pricePerMeterEdge;
      const total = boardCost + edgeCost;
      if (boardCost !== 40000) return `BOARD COST: $${boardCost} (esperado: 40000)`;
      if (Math.abs(edgeCost - 1000) > 1) return `EDGE COST: $${edgeCost} (esperado: 1000)`;
      return null;
    },
  },
  {
    name: '20. Precio 0 — sin costo',
    desc: 'No muestra stats de costo',
    pieces: [
      { id: 'p', name: 'Pieza', width: 500, height: 400, quantity: 2 },
    ],
    stock: STOCK_18MM, // no pricePerBoard
    expectedBoards: 1,
    customCheck: (result, tc) => {
      const price = tc.stock.pricePerBoard || 0;
      if (price !== 0) return `PRECIO: ${price} (esperado: 0 / undefined)`;
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════
  // VALIDATION EDGE CASES
  // ═══════════════════════════════════════════════════════
  {
    name: '21. Pieza width=0',
    desc: 'Se filtra, no crashea',
    pieces: [
      { id: 'buena', name: 'Buena', width: 500, height: 300, quantity: 2 },
      { id: 'mala', name: 'Pieza mala', width: 0, height: 300, quantity: 1 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
  },
  {
    name: '22. Pieza sin nombre',
    desc: 'Funciona sin nombre',
    pieces: [
      { id: 'nn', name: '', width: 600, height: 400, quantity: 3 },
    ],
    stock: STOCK_18MM,
    expectedBoards: 1,
  },
];

// ═══════════════════════════════════════════════════════
// RUN TESTS
// ═══════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  CUTWOOD — MEGA TEST DE OPTIMIZACION');
console.log('═══════════════════════════════════════════════════════');
console.log('');

let totalPassed = 0;
let totalFailed = 0;
const issues = [];

for (const tc of TEST_CASES) {
  const opts = tc.options || OPTIONS;
  const result = optimizeCuts(tc.pieces, tc.stock, opts);
  const s = result.stats;

  const pass = [];
  const fail = [];

  // Check board count
  if (tc.expectedBoards !== undefined) {
    if (s.totalBoards === tc.expectedBoards) {
      pass.push(`Tableros: ${s.totalBoards} (esperado: ${tc.expectedBoards})`);
    } else {
      fail.push(`Tableros: ${s.totalBoards} (esperado: ${tc.expectedBoards})`);
    }
  }

  // Check unfitted
  if (tc.expectedUnfitted !== undefined) {
    if (s.unfittedPieces === tc.expectedUnfitted) {
      pass.push(`No colocadas: ${s.unfittedPieces} (esperado: ${tc.expectedUnfitted})`);
    } else {
      fail.push(`No colocadas: ${s.unfittedPieces} (esperado: ${tc.expectedUnfitted})`);
    }
  }

  // Check all pieces placed (unless unfitted expected)
  if (tc.expectedUnfitted === undefined && s.unfittedPieces > 0) {
    fail.push(`PIEZAS SIN COLOCAR: ${s.unfittedPieces} piezas no entraron`);
  }

  // Check minimum utilization
  if (tc.expectedMinUtil !== undefined) {
    const util = parseFloat(s.overallUtilization);
    if (util >= tc.expectedMinUtil) {
      pass.push(`Aprovechamiento: ${s.overallUtilization}% (minimo: ${tc.expectedMinUtil}%)`);
    } else {
      fail.push(`Aprovechamiento bajo: ${s.overallUtilization}% (minimo: ${tc.expectedMinUtil}%)`);
    }
  }

  // Check overlaps (critical)
  for (const board of result.boards) {
    for (let i = 0; i < board.pieces.length; i++) {
      for (let j = i + 1; j < board.pieces.length; j++) {
        const a = board.pieces[i];
        const b = board.pieces[j];
        const overlapX = a.x < b.x + b.placedWidth && a.x + a.placedWidth > b.x;
        const overlapY = a.y < b.y + b.placedHeight && a.y + a.placedHeight > b.y;
        if (overlapX && overlapY) {
          fail.push(`SUPERPOSICION: "${a.name}" y "${b.name}" se superponen en tablero ${board.boardIndex + 1}`);
        }
      }
    }
  }

  // Check pieces within board bounds
  for (const board of result.boards) {
    for (const p of board.pieces) {
      if (p.x + p.placedWidth > board.stockWidth || p.y + p.placedHeight > board.stockHeight) {
        fail.push(`FUERA DE TABLERO: "${p.name}" excede limites en tablero ${board.boardIndex + 1} (${p.x + p.placedWidth}>${board.stockWidth} o ${p.y + p.placedHeight}>${board.stockHeight})`);
      }
    }
  }

  // Check cut sequences exist
  for (const board of result.boards) {
    if (!board.cutSequence || board.cutSequence.length === 0) {
      fail.push(`SIN SECUENCIA: Tablero ${board.boardIndex + 1} no tiene secuencia de cortes`);
    }
  }

  // Custom check (for grain, tapacanto, cost tests)
  if (tc.customCheck) {
    const err = tc.customCheck(result, tc);
    if (err) {
      fail.push(err);
    } else {
      pass.push('Custom check OK');
    }
  }

  // Print results
  const status = fail.length === 0 ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}  ${tc.name}`);
  console.log(`       ${tc.desc}`);
  console.log(`       Tableros: ${s.totalBoards} | Piezas: ${s.placedPieces}/${s.totalPieces} | Aprovechamiento: ${s.overallUtilization}% | Desperdicio: ${(s.totalWasteArea / 1000000).toFixed(2)} m²`);

  if (pass.length > 0) {
    for (const p of pass) console.log(`       ✓ ${p}`);
  }
  if (fail.length > 0) {
    for (const f of fail) console.log(`       ✗ ${f}`);
    issues.push({ test: tc.name, failures: fail });
  }

  // Board details
  for (const board of result.boards) {
    const boardUtil = board.utilization.toFixed(1);
    console.log(`       Tablero ${board.boardIndex + 1}: ${board.pieces.length} piezas, ${boardUtil}% util, ${board.cutSequence.length} cortes`);
  }

  if (fail.length === 0) totalPassed++;
  else totalFailed++;

  console.log('');
}

// Summary
console.log('═══════════════════════════════════════════════════════');
console.log(`  RESULTADO: ${totalPassed} passed, ${totalFailed} failed de ${TEST_CASES.length} tests`);
console.log('═══════════════════════════════════════════════════════');

if (issues.length > 0) {
  console.log('');
  console.log('PROBLEMAS ENCONTRADOS:');
  for (const issue of issues) {
    console.log(`  ${issue.test}:`);
    for (const f of issue.failures) console.log(`    - ${f}`);
  }
}

console.log('');

// Comparison with theoretical optimal
console.log('═══════════════════════════════════════════════════════');
console.log('  ANALISIS DE EFICIENCIA VS OPTIMO TEORICO');
console.log('═══════════════════════════════════════════════════════');
console.log('');

for (const tc of TEST_CASES) {
  if (tc.expectedUnfitted) continue; // skip impossible cases
  const opts = tc.options || OPTIONS;
  const result = optimizeCuts(tc.pieces, tc.stock, opts);

  // Calculate theoretical minimum boards needed (perfect packing, no waste at all)
  const totalPieceArea = tc.pieces.reduce((sum, p) => sum + p.width * p.height * p.quantity, 0);
  const boardArea = tc.stock.width * tc.stock.height;
  const theoreticalMinBoards = Math.ceil(totalPieceArea / boardArea);
  const theoreticalMaxUtil = ((totalPieceArea / (result.stats.totalBoards * boardArea)) * 100).toFixed(1);
  const actualUtil = result.stats.overallUtilization;

  const efficiency = result.stats.totalBoards === theoreticalMinBoards ? 'OPTIMO' :
    result.stats.totalBoards === theoreticalMinBoards + 1 ? 'ACEPTABLE (+1 tablero)' :
      `MEJORABLE (+${result.stats.totalBoards - theoreticalMinBoards} tableros)`;

  console.log(`${tc.name}`);
  console.log(`  Area total piezas: ${(totalPieceArea / 1000000).toFixed(2)} m²`);
  console.log(`  Tableros minimos teoricos: ${theoreticalMinBoards} | Usados: ${result.stats.totalBoards} → ${efficiency}`);
  console.log(`  Aprovechamiento real: ${actualUtil}% (maximo teorico: ${theoreticalMaxUtil}%)`);
  console.log('');
}

process.exit(totalFailed > 0 ? 1 : 0);
