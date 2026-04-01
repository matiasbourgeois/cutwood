import { runColumnPack } from '../src/engine/columnPacker.js';
import { runHorizontalStripPack } from '../src/engine/horizontalStripPacker.js';

const P = [
  {id:'p01',name:'P1',width:1900,height:450,quantity:2},{id:'p08',name:'P8',width:1900,height:450,quantity:2},
  {id:'p15',name:'P15',width:1900,height:450,quantity:2},{id:'p03',name:'P3',width:704,height:450,quantity:4},
  {id:'p10',name:'P10',width:704,height:450,quantity:4},{id:'p18',name:'P18',width:734,height:450,quantity:2},
  {id:'p20',name:'P20',width:734,height:450,quantity:2},{id:'p17',name:'P17',width:450,height:450,quantity:2},
  {id:'p19',name:'P19',width:450,height:450,quantity:2},{id:'p02',name:'P2',width:704,height:100,quantity:2},
  {id:'p09',name:'P9',width:704,height:100,quantity:2},{id:'p16',name:'P16',width:704,height:100,quantity:2},
  {id:'p04',name:'P4',width:677,height:100,quantity:4},{id:'p13',name:'P13',width:677,height:100,quantity:4},
  {id:'p05',name:'P5',width:414,height:100,quantity:4},{id:'p14',name:'P14',width:414,height:100,quantity:2},
  {id:'p06',name:'P6',width:677,height:120,quantity:2},{id:'p11',name:'P11',width:677,height:120,quantity:4},
  {id:'p07',name:'P7',width:414,height:120,quantity:2},{id:'p12',name:'P12',width:414,height:120,quantity:4},
];
const stock  = { width:2750, height:1830, quantity:99, grain:'none' };
const opts   = { kerf:5, edgeTrim:5, allowRotation:false };
const exp    = P.flatMap(p => Array.from({length:p.quantity},(_,i) => ({...p,copyIndex:i})));

// Transposed pieces + stock
const tPieces = exp.map(p => ({ ...p, width: p.height, height: p.width, canRotate: false }));
const tStock  = { ...stock, width: stock.height, height: stock.width };

const BOARD_COST = 1000, UNFIT_COST = 100000, HOMO_BONUS = 8;

function countHomoRows(boards) {
  let h = 0;
  for (const b of boards) {
    const rm = new Map();
    for (const p of b.pieces) {
      const y = Math.round(p.y / 5) * 5;
      if (!rm.has(y)) rm.set(y, new Set());
      rm.get(y).add(p.placedHeight);
    }
    for (const s of rm.values()) if (s.size === 1) h++;
  }
  return h;
}
function score(boards, unfitted) {
  return boards.length * BOARD_COST + (unfitted?.length||0) * UNFIT_COST - countHomoRows(boards) * HOMO_BONUS;
}
function analyze(label, r, isTransposed = false) {
  const h = countHomoRows(r.boards);
  const s = score(r.boards, r.unfitted);
  console.log(`\n${label}:`);
  console.log(`  boards:${r.boards.length} unfitted:${r.unfitted.length} homoRows:${h} score:${s}`);
  for (let i = 0; i < r.boards.length; i++) {
    const b = r.boards[i];
    const thin = b.pieces.filter(p => p.placedHeight <= (isTransposed ? 2750 : 150)).length;
    const tall = b.pieces.filter(p => p.placedHeight >  (isTransposed ? 2750 : 150)).length;
    const util = ((b.pieces.reduce((s,p)=>s+p.placedWidth*p.placedHeight,0)/(r.boards[0].width||2750)/(r.boards[0].height||1830))*100).toFixed(1);
    console.log(`  Board${i+1}: piezas=${b.pieces.length} util~${util}%`);
  }
  return { score: s, label, boards: r.boards.length, homo: h };
}

const rLA = runLeptonPack(exp.map(p=>({...p})), stock, opts);
const rHA = runHorizontalStripPack(exp.map(p=>({...p})), stock, opts);
const rLT = runLeptonPack(tPieces.map(p=>({...p})), tStock, opts);
const rHT = runHorizontalStripPack(tPieces.map(p=>({...p})), tStock, opts);

// Two-Pass with BACKFILL: split by min dimension, then merge thin into last large board
const MIN_THIN = 135;
const eT = 5, k = 5;

function backfillMerge(r1, r2, stockH) {
  const maxH = stockH - eT * 2;
  const boards = r1.boards.map(b => ({ ...b, pieces: [...b.pieces] }));
  const last = boards[boards.length - 1];
  let lastMaxY = last.pieces.reduce((m, p) => Math.max(m, p.y + p.placedHeight), eT);
  const overflow = [];
  for (const tb of r2.boards) {
    const thinMaxY = tb.pieces.reduce((m, p) => Math.max(m, p.y + p.placedHeight), eT);
    const thinH = thinMaxY - eT;
    if (lastMaxY + k + thinH <= maxH + eT) {
      const yShift = lastMaxY + k - eT;
      for (const p of tb.pieces) last.pieces.push({ ...p, y: p.y + yShift });
      lastMaxY += k + thinH;
    } else {
      overflow.push(tb);
    }
  }
  boards.push(...overflow);
  return { boards, unfitted: [...r1.unfitted, ...r2.unfitted] };
}

const largePieces = exp.filter(p => Math.min(p.width, p.height) >= MIN_THIN).map(p => ({...p}));
const thinPieces  = exp.filter(p => Math.min(p.width, p.height) <  MIN_THIN).map(p => ({...p}));
const r2pLarge = runHorizontalStripPack(largePieces, stock, opts);
const r2pThin  = runHorizontalStripPack(thinPieces,  stock, opts);
const r2P = backfillMerge(r2pLarge, r2pThin, stock.height);

// Two-Pass transposed with backfill
const tLarge = tPieces.filter(p => Math.min(p.width, p.height) >= MIN_THIN).map(p => ({...p}));
const tThin  = tPieces.filter(p => Math.min(p.width, p.height) <  MIN_THIN).map(p => ({...p}));
const r2pTL = runHorizontalStripPack(tLarge, tStock, opts);
const r2pTT = runHorizontalStripPack(tThin,  tStock, opts);
const r2PT = backfillMerge(r2pTL, r2pTT, tStock.height);

const sLA = analyze('A — LeptonPack normal',       rLA);
const sHA = analyze('B — HStrip normal',            rHA);
const sLT = analyze('C — LeptonPack transposed',    rLT, true);
const sHT = analyze('D — HStrip transposed',        rHT, true);
const s2P = analyze('E — HStrip-2P normal',         r2P);
const s2PT= analyze('F — HStrip-2P transposed',     r2PT, true);

// Detail: show Board 2 piece names for 2P variants
console.log('\n── Board 2 detail (E — HStrip-2P) ──');
if (r2P.boards[1]) {
  const names = r2P.boards[1].pieces.map(p => p.name || p.id).sort();
  console.log(`  ${names.join(', ')}`);
  const thinInB2 = r2P.boards[1].pieces.filter(p => Math.min(p.placedWidth, p.placedHeight) < MIN_THIN);
  console.log(`  thin pieces in Board2: ${thinInB2.length}`);
}

const all = [sLA, sHA, sLT, sHT, s2P, s2PT].sort((a,b) => a.score - b.score);
console.log('\n══ RANKING ══');
all.forEach((r,i) => console.log(`  ${i+1}. ${r.label}: score=${r.score}`));
console.log(`\n🏆 WINNER: ${all[0].label}`);
