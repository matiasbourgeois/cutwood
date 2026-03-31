/**
 * Gap-Fill + Deep Mode Tests
 * 
 * Tests:
 *  1. gapFiller internals (findGaps, relocatePieces, tryMergeBoards)
 *  2. optimizeDeep with min-cuts mode
 *  3. Comparison: fast vs deep mode (deep should be >= fast)
 *  4. TC1 (54 pieces) and TC2 (85 pieces) validation
 */
import { findGaps, relocatePieces, tryMergeBoards, postProcessGapFill } from '../src/engine/gapFiller.js';
import { optimizeCuts, optimizeDeep } from '../src/engine/optimizer.js';

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.error(`  ❌ ${msg}`); } }

// ── Test Data ─────────────────────────────────────────────────────────────

const TC1_PIECES = [
  {id:'p01',name:'P1',width:1900,height:450,quantity:2},{id:'p08',name:'P8',width:1900,height:450,quantity:2},
  {id:'p15',name:'P15',width:1900,height:450,quantity:2},{id:'p03',name:'P3',width:704,height:450,quantity:4},
  {id:'p10',name:'P10',width:704,height:450,quantity:4},{id:'p18',name:'P18',width:734,height:450,quantity:2},
  {id:'p20',name:'P20',width:734,height:450,quantity:2},{id:'p17',name:'P17',width:450,height:450,quantity:2},
  {id:'p19',name:'P19',width:450,height:450,quantity:2},{id:'p02',name:'P2',width:704,height:100,quantity:2},
  {id:'p09',name:'P9',width:704,height:100,quantity:2},{id:'p16',name:'P16',width:704,height:100,quantity:2},
  {id:'p04',name:'P4',width:677,height:100,quantity:4},{id:'p13',name:'P13',width:677,height:100,quantity:4},
  {id:'p05',name:'P5',width:414,height:100,quantity:4},{id:'p14',name:'P14',width:414,height:100,quantity:2},
  {id:'p06',name:'P6',width:677,height:120,quantity:2},{id:'p11',name:'P11',width:677,height:120,quantity:4},
  {id:'p07',name:'P7',width:414,height:120,quantity:2},{id:'p12',name:'P12',width:414,height:120,quantity:4}
];

const TC2_PIECES = [
  {id:'1',name:'Pieza 1',width:1900,height:450,quantity:4},
  {id:'2',name:'Pieza 2',width:704,height:100,quantity:4},
  {id:'3',name:'Pieza 3',width:704,height:450,quantity:8},
  {id:'4',name:'Pieza 4',width:677,height:100,quantity:8},
  {id:'5',name:'Pieza 5',width:414,height:100,quantity:4},
  {id:'6',name:'Pieza 6',width:677,height:120,quantity:4},
  {id:'7',name:'Pieza 7',width:414,height:120,quantity:4},
  {id:'8',name:'Pieza 8',width:1900,height:450,quantity:4},
  {id:'9',name:'Pieza 9',width:704,height:100,quantity:4},
  {id:'10',name:'Pieza 10',width:704,height:450,quantity:8},
  {id:'11',name:'Pieza 11',width:677,height:100,quantity:4},
  {id:'12',name:'Pieza 12',width:414,height:100,quantity:2},
  {id:'13',name:'Pieza 13',width:677,height:120,quantity:4},
  {id:'14',name:'Pieza 14',width:414,height:120,quantity:2},
  {id:'15',name:'Pieza 15',width:1900,height:450,quantity:4},
  {id:'16',name:'Pieza 16',width:734,height:450,quantity:4},
  {id:'17',name:'Pieza 17',width:450,height:450,quantity:4},
  {id:'18',name:'Pieza 18',width:450,height:450,quantity:4}
];

const STOCK = { width: 2750, height: 1830, quantity: 99, grain: 'none' };
const OPTS_MINCUTS = { kerf: 5, edgeTrim: 5, optimizationMode: 'min-cuts', allowRotation: false };
const OPTS_MAXUTIL = { kerf: 5, edgeTrim: 5, optimizationMode: 'max-utilization', allowRotation: false };

// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ 1. findGaps() Tests ═══\n');

// Create a synthetic board with known gaps
const synthBoard = {
  stockWidth: 2750,
  stockHeight: 1830,
  pieces: [
    { x: 5, y: 5, placedWidth: 1900, placedHeight: 450 },
    { x: 5, y: 460, placedWidth: 1900, placedHeight: 450 },
  ]
};

const gaps = findGaps(synthBoard, 5);
assert(gaps.length >= 1, `Found ${gaps.length} gaps in synthetic board (expected ≥1)`);

// Right-side gap should exist (2740 - 1905 = 835mm wide)
const rightGap = gaps.find(g => g.type === 'right');
assert(rightGap !== undefined, `Found right-side gap`);
if (rightGap) {
  assert(rightGap.width >= 800, `Right gap width ${rightGap.width}mm ≥ 800mm`);
}

// Bottom gap should exist (1820 - 910 = 910mm tall)
const bottomGap = gaps.find(g => g.type === 'bottom');
assert(bottomGap !== undefined, `Found bottom gap`);
if (bottomGap) {
  assert(bottomGap.height >= 900, `Bottom gap height ${bottomGap.height}mm ≥ 900mm`);
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ 2. relocatePieces() Tests ═══\n');

// Two boards: board1 has big gap, board2 has a piece that fits
const board1 = {
  stockWidth: 2750, stockHeight: 1830,
  pieces: [
    { x: 5, y: 5, placedWidth: 1500, placedHeight: 1500, id: 'big', rotated: false },
  ]
};
const board2 = {
  stockWidth: 2750, stockHeight: 1830,
  pieces: [
    { x: 5, y: 5, placedWidth: 500, placedHeight: 500, id: 'small', rotated: false },
    { x: 5, y: 510, placedWidth: 200, placedHeight: 200, id: 'tiny', rotated: false },
  ]
};

const relocated = relocatePieces([board1, board2], { edgeTrim: 5 }, 5);
const totalPiecesAfter = relocated.reduce((s, b) => s + b.pieces.length, 0);
assert(totalPiecesAfter === 3, `All 3 pieces preserved after relocation (got ${totalPiecesAfter})`);
// At least one piece should have moved from board2 to board1
const b1Moved = relocated[0].pieces.length;
assert(b1Moved >= 2, `Board 1 has ${b1Moved} pieces (≥2 means a piece was moved)`);

// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ 3. tryMergeBoards() Tests ═══\n');

// Two boards that should merge into one (combined area < board area)
const mergeB1 = {
  stockWidth: 2750, stockHeight: 1830,
  pieces: [
    { x: 5, y: 5, placedWidth: 500, placedHeight: 450, id: 'a1', name: 'A1', originalWidth: 500, originalHeight: 450, width: 500, height: 450, canRotate: false, rotated: false },
  ]
};
const mergeB2 = {
  stockWidth: 2750, stockHeight: 1830,
  pieces: [
    { x: 5, y: 5, placedWidth: 500, placedHeight: 450, id: 'b1', name: 'B1', originalWidth: 500, originalHeight: 450, width: 500, height: 450, canRotate: false, rotated: false },
  ]
};
const merged = tryMergeBoards([mergeB1, mergeB2], STOCK, OPTS_MINCUTS);
assert(merged.length === 1, `Two small boards merged into 1 (got ${merged.length})`);
if (merged.length === 1) {
  assert(merged[0].pieces.length === 2, `Merged board has all 2 pieces`);
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ 4. Fast vs Deep — TC1 (54 pieces) ═══\n');

const t1Start = Date.now();
const fastTC1 = optimizeCuts(TC1_PIECES, STOCK, OPTS_MINCUTS, []);
const t1Fast = Date.now() - t1Start;
console.log(`  Fast: ${fastTC1.stats.totalBoards} boards, ${t1Fast}ms, algo=${fastTC1.stats.algorithmUsed}`);

const t1dStart = Date.now();
const deepTC1 = optimizeDeep(TC1_PIECES, STOCK, OPTS_MINCUTS, [], {
  onProgress: (pct, msg) => { if (pct % 25 === 0) console.log(`    [${pct}%] ${msg}`); }
});
const t1Deep = Date.now() - t1dStart;
console.log(`  Deep: ${deepTC1.stats.totalBoards} boards, ${t1Deep}ms, algo=${deepTC1.stats.algorithmUsed}`);

assert(fastTC1.stats.totalBoards <= 3, `Fast TC1: ≤3 boards (got ${fastTC1.stats.totalBoards})`);
assert(deepTC1.stats.totalBoards <= fastTC1.stats.totalBoards, `Deep TC1 ≤ Fast TC1: ${deepTC1.stats.totalBoards} ≤ ${fastTC1.stats.totalBoards}`);

// Verify no piece is lost
const fastPieces1 = fastTC1.boards.reduce((s, b) => s + b.pieces.length, 0);
const deepPieces1 = deepTC1.boards.reduce((s, b) => s + b.pieces.length, 0);
assert(fastPieces1 === 54, `Fast TC1: 54 pieces on boards (got ${fastPieces1})`);
assert(deepPieces1 === 54, `Deep TC1: 54 pieces on boards (got ${deepPieces1})`);

// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ 5. Fast vs Deep — TC2 (85 pieces) ═══\n');

const t2Start = Date.now();
const fastTC2 = optimizeCuts(TC2_PIECES, STOCK, OPTS_MINCUTS, []);
const t2Fast = Date.now() - t2Start;
console.log(`  Fast: ${fastTC2.stats.totalBoards} boards, ${t2Fast}ms, algo=${fastTC2.stats.algorithmUsed}`);

const t2dStart = Date.now();
const deepTC2 = optimizeDeep(TC2_PIECES, STOCK, OPTS_MINCUTS, [], {
  onProgress: (pct, msg) => { if (pct % 25 === 0) console.log(`    [${pct}%] ${msg}`); }
});
const t2Deep = Date.now() - t2dStart;
console.log(`  Deep: ${deepTC2.stats.totalBoards} boards, ${t2Deep}ms, algo=${deepTC2.stats.algorithmUsed}`);

assert(fastTC2.stats.totalBoards <= 5, `Fast TC2: ≤5 boards (got ${fastTC2.stats.totalBoards})`);
assert(deepTC2.stats.totalBoards <= fastTC2.stats.totalBoards, `Deep TC2 ≤ Fast TC2: ${deepTC2.stats.totalBoards} ≤ ${fastTC2.stats.totalBoards}`);
const deepPieces2 = deepTC2.boards.reduce((s, b) => s + b.pieces.length, 0);
assert(deepPieces2 === 80, `Deep TC2: all 80 pieces placed (got ${deepPieces2})`);

// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ 6. Deep Mode with max-utilization ═══\n');

const deepMaxUtil = optimizeDeep(TC1_PIECES, STOCK, OPTS_MAXUTIL, [], {
  onProgress: (pct, msg) => { if (pct % 25 === 0) console.log(`    [${pct}%] ${msg}`); }
});
assert(deepMaxUtil.stats.totalBoards <= 4, `Deep MaxUtil TC1: ≤4 boards (got ${deepMaxUtil.stats.totalBoards})`);
const deepMaxPieces = deepMaxUtil.boards.reduce((s, b) => s + b.pieces.length, 0);
assert(deepMaxPieces === 54, `Deep MaxUtil TC1: 54 pieces (got ${deepMaxPieces})`);

// ══════════════════════════════════════════════════════════════════════════
console.log('\n═══ 7. postProcessGapFill end-to-end ═══\n');

// Create synthetic 3-board result where board 3 has pieces that fit in board 1's gaps
const synth3board = {
  boards: [
    { stockWidth: 2750, stockHeight: 1830, pieces: [
      { x: 5, y: 5, placedWidth: 1800, placedHeight: 1000, id: 'big1', rotated: false },
    ]},
    { stockWidth: 2750, stockHeight: 1830, pieces: [
      { x: 5, y: 5, placedWidth: 1800, placedHeight: 1000, id: 'big2', rotated: false },
    ]},
    { stockWidth: 2750, stockHeight: 1830, pieces: [
      { x: 5, y: 5, placedWidth: 400, placedHeight: 400, id: 'small1', rotated: false },
      { x: 410, y: 5, placedWidth: 400, placedHeight: 400, id: 'small2', rotated: false },
    ]},
  ],
  unfitted: [],
};

const gfResult = postProcessGapFill(synth3board, STOCK, OPTS_MINCUTS);
assert(gfResult.boards.length <= 3, `Gap-fill: ≤3 boards (got ${gfResult.boards.length})`);
const totalAfterGF = gfResult.boards.reduce((s, b) => s + b.pieces.length, 0);
assert(totalAfterGF === 4, `Gap-fill: all 4 pieces preserved (got ${totalAfterGF})`);
if (gfResult.boards.length < 3) {
  console.log(`  🎯 Gap-fill REDUCED boards from 3 to ${gfResult.boards.length}!`);
}

// ══════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RESULTS: ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log(`${'═'.repeat(60)}\n`);

process.exit(fail > 0 ? 1 : 0);
