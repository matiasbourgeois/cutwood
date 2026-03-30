/**
 * CutWood — Comparativa V3 vs V4 (Skyline)
 * Corre todos los presets del sistema con ambas versiones del motor
 * y muestra una tabla comparativa de tableros y aprovechamiento.
 */

import { createRequire } from 'module';
import { GuillotineBin }   from '../engine/guillotine.js';
import { MaxRectsBin }     from '../engine/maxrects.js';
import { runStripPack }    from '../engine/stripPacker.js';
import { runSkylinePack }  from '../engine/skyline.js';

// ── Sort helpers ────────────────────────────────────────────────────────────
const SORT_ORDERS = ['area-desc','area-asc','perimeter-desc','height-desc','width-desc','max-side-desc','diff-desc'];

function getSortComparator(order) {
  switch (order) {
    case 'area-asc':       return (a,b)=>(a.width*a.height)-(b.width*b.height);
    case 'perimeter-desc': return (a,b)=>(2*(b.width+b.height))-(2*(a.width+a.height));
    case 'height-desc':    return (a,b)=>b.height-a.height;
    case 'width-desc':     return (a,b)=>b.width-a.width;
    case 'max-side-desc':  return (a,b)=>Math.max(b.width,b.height)-Math.max(a.width,a.height);
    case 'diff-desc':      return (a,b)=>Math.abs(b.width-b.height)-Math.abs(a.width-a.height);
    default:               return (a,b)=>(b.width*b.height)-(a.width*a.height);
  }
}

// ── Expand pieces ────────────────────────────────────────────────────────────
function expandPieces(pieces) {
  const out = [];
  for (const p of pieces) {
    for (let i = 0; i < (p.quantity||1); i++) {
      out.push({ ...p, width: p.width, height: p.height });
    }
  }
  return out;
}

// ── Minimal single-pass runner (mirrors optimizer.js) ───────────────────────
function runPass(expanded, stock, options, binType, heuristic, splitRule, sortOrder) {
  const { kerf=3, edgeTrim=0, allowRotation=true } = options;
  const bW = stock.width - edgeTrim*2;
  const bH = stock.height - edgeTrim*2;

  if (binType === 'skyline') {
    return runSkylinePack(expanded.map(p=>({...p})), stock, options, heuristic, sortOrder);
  }

  const sorted = [...expanded].sort(getSortComparator(sortOrder));
  const boards = [];
  let bin = binType==='maxrects'
    ? new MaxRectsBin(bW, bH, kerf, heuristic)
    : new GuillotineBin(bW, bH, kerf, heuristic, splitRule);
  let boardPieces = [];

  for (const piece of sorted) {
    const pw = piece.width + kerf;
    const ph = piece.height + kerf;
    let placed = null;

    if (allowRotation) {
      placed = bin.insert(pw, ph) || bin.insert(ph, pw);
    } else {
      placed = bin.insert(pw, ph);
    }

    if (!placed) {
      if (boardPieces.length) {
        boards.push({ bin, pieces: boardPieces, stockWidth: stock.width, stockHeight: stock.height });
      }
      bin = binType==='maxrects'
        ? new MaxRectsBin(bW, bH, kerf, heuristic)
        : new GuillotineBin(bW, bH, kerf, heuristic, splitRule);
      boardPieces = [];
      placed = allowRotation
        ? (bin.insert(pw,ph)||bin.insert(ph,pw))
        : bin.insert(pw,ph);
    }

    if (placed) {
      boardPieces.push({
        ...piece,
        x: placed.x + edgeTrim, y: placed.y + edgeTrim,
        placedWidth:  placed.width  - kerf,
        placedHeight: placed.height - kerf,
      });
    }
  }
  if (boardPieces.length) boards.push({ bin, pieces: boardPieces, stockWidth: stock.width, stockHeight: stock.height });

  const totalStock = boards.reduce((s,b)=>s+b.stockWidth*b.stockHeight,0);
  const totalUsed  = boards.reduce((s,b)=>s+b.pieces.reduce((a,p)=>a+p.placedWidth*p.placedHeight,0),0);
  const utilization = totalStock>0 ? (totalUsed/totalStock)*100 : 0;

  return { boards, unfitted:[], boardCount: boards.length, utilization, totalStockArea: totalStock };
}

// ── Best-of-N for a given config set ────────────────────────────────────────
function runBestOfN(expanded, stock, options, configs) {
  let best = null;
  let bestScore = { boards: Infinity, waste: Infinity };

  // Strip packer
  const strip = runStripPack(expanded.map(p=>({...p})), stock, options);
  if (strip.boards.length > 0) {
    const su = strip.boards.reduce((s,b)=>s+b.pieces.reduce((a,p)=>a+p.placedWidth*p.placedHeight,0),0);
    const sa = strip.boards.reduce((s,b)=>s+b.stockWidth*b.stockHeight,0);
    const util = sa>0?(su/sa)*100:0;
    const score = { boards: strip.boards.length, waste: 100-util };
    if (score.boards < bestScore.boards || (score.boards===bestScore.boards && score.waste<bestScore.waste)) {
      bestScore = score;
      best = { boardCount: strip.boards.length, utilization: util };
    }
  }

  for (const cfg of configs) {
    const r = runPass(expanded, stock, options, cfg.binType, cfg.heuristic, cfg.splitRule, cfg.sortOrder);
    const score = { boards: r.boardCount + r.unfitted.length*100, waste: 100-r.utilization };
    if (score.boards < bestScore.boards || (score.boards===bestScore.boards && score.waste<bestScore.waste)) {
      bestScore = score;
      best = { boardCount: r.boardCount, utilization: r.utilization };
    }
  }

  return best || { boardCount: 0, utilization: 0 };
}

// ── Build config sets ────────────────────────────────────────────────────────
function buildV3Configs() {
  const configs = [];
  for (const h of ['bssf','baf','blf'])
    for (const s of ['sla','lla'])
      for (const o of SORT_ORDERS)
        configs.push({ binType:'guillotine', heuristic:h, splitRule:s, sortOrder:o });
  for (const h of ['bssf','baf','blf'])
    for (const o of SORT_ORDERS)
      configs.push({ binType:'maxrects', heuristic:h, splitRule:'sla', sortOrder:o });
  return configs;
}

function buildV4Configs() {
  const configs = buildV3Configs();
  // +21 Skyline variants
  for (const h of ['bl','wf','min-max'])
    for (const o of SORT_ORDERS)
      configs.push({ binType:'skyline', heuristic:h, splitRule:'sla', sortOrder:o });
  return configs;
}

// ── Presets (extracted from App.jsx) ────────────────────────────────────────
const eb0 = { top:false, bottom:false, left:false, right:false };
const STD  = { width:2750, height:1830, grain:'none' };
const GRAN = { width:3660, height:1830, grain:'none' };
const VETA = { width:2750, height:1830, grain:'vertical' };
const OPT     = { kerf:3, edgeTrim:5, allowRotation:true };
const NOVROT  = { kerf:3, edgeTrim:5, allowRotation:false };

const PRESETS = [
  { name:'01 · Cocina Modular Simple', stock:STD, options:OPT, pieces:[
    {width:1830,height:560,quantity:4},{width:560,height:550,quantity:4},
    {width:550,height:350,quantity:6},{width:720,height:396,quantity:4},
    {width:560,height:396,quantity:4},{width:550,height:120,quantity:4},
    {width:520,height:200,quantity:4},{width:520,height:150,quantity:4},
  ]},
  { name:'02 · Grilla Masiva de Idénticos', stock:STD, options:OPT, pieces:[
    {width:500,height:500,quantity:81},{width:2000,height:100,quantity:21},
  ]},
  { name:'03 · Piezas Gigantes', stock:STD, options:OPT, pieces:[
    {width:2600,height:1700,quantity:1},{width:2600,height:560,quantity:1},{width:2600,height:560,quantity:1},
  ]},
  { name:'04 · Tiras y Zócalos', stock:STD, options:OPT, pieces:[
    {width:2720,height:80,quantity:8},{width:2720,height:100,quantity:6},
    {width:2720,height:120,quantity:4},{width:2720,height:150,quantity:4},{width:1364,height:80,quantity:6},
  ]},
  { name:'05 · Armario 3 Cuerpos', stock:STD, options:OPT, pieces:[
    {width:2200,height:570,quantity:2},{width:2200,height:570,quantity:2},
    {width:570,height:880,quantity:3},{width:570,height:880,quantity:3},
    {width:554,height:880,quantity:6},{width:1100,height:600,quantity:6},
    {width:570,height:200,quantity:6},{width:460,height:200,quantity:6},
    {width:450,height:200,quantity:6},{width:870,height:100,quantity:3},
  ]},
  { name:'06 · Micro Piezas (140 uds)', stock:STD, options:OPT, pieces:[
    {width:200,height:150,quantity:30},{width:180,height:120,quantity:30},
    {width:150,height:100,quantity:40},{width:300,height:200,quantity:20},{width:250,height:180,quantity:20},
  ]},
  { name:'07 · Mix Extremo de Tamaños', stock:STD, options:OPT, pieces:[
    {width:1830,height:560,quantity:2},{width:1200,height:800,quantity:1},
    {width:900,height:700,quantity:3},{width:750,height:500,quantity:2},
    {width:600,height:450,quantity:4},{width:500,height:400,quantity:3},
    {width:400,height:350,quantity:5},{width:2600,height:150,quantity:2},
    {width:2200,height:200,quantity:3},{width:1800,height:120,quantity:4},
    {width:220,height:180,quantity:8},{width:1694,height:300,quantity:2},{width:345,height:280,quantity:4},
  ]},
  { name:'08 · Cajonería Estándar (84 uds)', stock:STD, options:OPT, pieces:[
    {width:800,height:200,quantity:12},{width:500,height:200,quantity:24},
    {width:786,height:200,quantity:12},{width:800,height:500,quantity:12},
    {width:400,height:150,quantity:8},{width:450,height:150,quantity:16},
  ]},
  { name:'09 · Veta Estricta (sin rot.)', stock:VETA, options:NOVROT, pieces:[
    {width:1830,height:400,quantity:4},{width:720,height:400,quantity:6},
    {width:800,height:350,quantity:8},{width:600,height:580,quantity:4},{width:720,height:560,quantity:4},
  ]},
  { name:'10 · Multi-tablero (8 tableros)', stock:STD, options:OPT, pieces:[
    {width:2200,height:580,quantity:12},{width:580,height:900,quantity:6},
    {width:554,height:880,quantity:18},{width:1100,height:420,quantity:12},
  ]},
  { name:'12 · Biblioteca 5 Cuerpos', stock:STD, options:OPT, pieces:[
    {width:1800,height:300,quantity:12},{width:300,height:800,quantity:10},
    {width:300,height:786,quantity:30},{width:1800,height:800,quantity:5},
  ]},
  { name:'14 · Tablero Jumbo 3660×1830', stock:GRAN, options:OPT, pieces:[
    {width:3500,height:400,quantity:4},{width:3500,height:120,quantity:6},
    {width:2400,height:600,quantity:4},{width:2000,height:580,quantity:4},
  ]},
  { name:'15 · Proyecto Real — Cocina+Placard', stock:STD, options:OPT, pieces:[
    {width:2100,height:560,quantity:4},{width:554,height:560,quantity:8},
    {width:680,height:396,quantity:6},{width:540,height:396,quantity:6},
    {width:550,height:100,quantity:6},{width:520,height:200,quantity:6},
    {width:450,height:200,quantity:12},{width:2200,height:600,quantity:4},
    {width:580,height:900,quantity:6},{width:2200,height:450,quantity:4},
    {width:860,height:200,quantity:4},{width:470,height:200,quantity:8},{width:1050,height:580,quantity:4},
  ]},
];

// ── Run comparison ────────────────────────────────────────────────────────────
const v3Configs = buildV3Configs();
const v4Configs = buildV4Configs();

console.log('\n════════════════════════════════════════════════════════════════════════════');
console.log('   CutWood — Comparativa V3 (126 vars) vs V4 (168 vars + Skyline)');
console.log('════════════════════════════════════════════════════════════════════════════');
console.log(
  'Preset'.padEnd(38) + ' ' +
  'V3 Tabl'.padStart(7) + ' ' + 'V3 Aprov'.padStart(9) + ' ' +
  'V4 Tabl'.padStart(7) + ' ' + 'V4 Aprov'.padStart(9) + ' ' +
  'D-Tabl'.padStart(7)  + ' ' + 'D-Aprov'.padStart(8)  + '  Ganador'
);

console.log('─'.repeat(100));

let v4Wins = 0, ties = 0, v3Wins = 0;
let totalV3Boards = 0, totalV4Boards = 0;
let totalV3Util = 0, totalV4Util = 0;
const t0 = Date.now();

for (const preset of PRESETS) {
  const expanded = expandPieces(preset.pieces);

  const ta = Date.now();
  const v3 = runBestOfN(expanded, preset.stock, preset.options, v3Configs);
  const tb = Date.now();
  const v4 = runBestOfN(expanded, preset.stock, preset.options, v4Configs);
  const tc = Date.now();

  const deltaBoards = v3.boardCount - v4.boardCount;   // positive = v4 usa menos tableros
  const deltaUtil   = v4.utilization - v3.utilization; // positive = v4 mejor aprovechamiento

  let winner = '🟰 Empate';
  if      (deltaBoards > 0) { winner = '🚀 V4 mejor'; v4Wins++; }
  else if (deltaBoards < 0) { winner = '❌ V3 mejor'; v3Wins++; }
  else if (deltaUtil   > 0.05) { winner = '📈 V4 aprov'; v4Wins++; }
  else if (deltaUtil   < -0.05){ winner = '📉 V3 aprov'; v3Wins++; }
  else    { ties++; }

  totalV3Boards += v3.boardCount;
  totalV4Boards += v4.boardCount;
  totalV3Util   += v3.utilization;
  totalV4Util   += v4.utilization;

  const dBStr = deltaBoards === 0 ? '  ±0' : deltaBoards > 0 ? `  -${deltaBoards}` : `  +${Math.abs(deltaBoards)}`;
  const dUStr = (deltaUtil >= 0 ? '+' : '') + deltaUtil.toFixed(1) + '%';

  console.log(
    `${preset.name.padEnd(38)} ${String(v3.boardCount).padStart(7)} ${(v3.utilization.toFixed(1)+'%').padStart(9)} ` +
    `${String(v4.boardCount).padStart(7)} ${(v4.utilization.toFixed(1)+'%').padStart(9)} ` +
    `${dBStr.padStart(7)} ${dUStr.padStart(8)}  ${winner}`
  );
}

const totalMs = Date.now() - t0;

console.log('─'.repeat(100));
console.log(`${'TOTAL / PROMEDIO'.padEnd(38)} ${String(totalV3Boards).padStart(7)} ${(totalV3Util/PRESETS.length).toFixed(1).padStart(8)}% ${String(totalV4Boards).padStart(7)} ${(totalV4Util/PRESETS.length).toFixed(1).padStart(8)}%`);
console.log();
console.log(`   🚀 V4 mejor: ${v4Wins} casos   🟰 Empate: ${ties} casos   ❌ V3 mejor: ${v3Wins} casos`);
console.log(`   Tableros totales V3: ${totalV3Boards}  →  V4: ${totalV4Boards}  (${totalV3Boards > totalV4Boards ? '✅ V4 ahorra '+( totalV3Boards-totalV4Boards)+' tablero(s)' : totalV3Boards === totalV4Boards ? 'Sin diferencia' : '⚠ V4 usa más tableros'})`);
console.log(`   Tiempo total de ambas corridas: ${totalMs}ms`);
console.log('════════════════════════════════════════════════════════════════════════════\n');
