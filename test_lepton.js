/**
 * Quick test for leptonPacker v2.0 logic (no ES module imports, inline)
 * Tests the 16-piece case from the user's image 4
 */

const W_STOCK = 2750, H_STOCK = 1830, KERF = 3, EDGE = 5;
const W = W_STOCK - EDGE * 2; // 2740
const H = H_STOCK - EDGE * 2; // 1820

const ROW_MIN_FILL   = 0.38;
const MIN_SUBCOL_W   = 30;
const HEIGHT_MIX_TOL = 60;

const pieceDefs = [
  { id:'P1',  name:'Pieza 1',  qty:2, w:670,  h:280 },
  { id:'P2',  name:'Pieza 2',  qty:1, w:869,  h:280 },
  { id:'P3',  name:'Pieza 3',  qty:2, w:869,  h:100 },
  { id:'P4',  name:'Pieza 4',  qty:1, w:868,  h:250 },
  { id:'P5',  name:'Pieza 5',  qty:2, w:670,  h:100 },
  { id:'P6',  name:'Pieza 6',  qty:2, w:945,  h:70  },
  { id:'P7',  name:'Pieza 7',  qty:3, w:220,  h:70  },
  { id:'P8',  name:'Pieza 8',  qty:2, w:945,  h:600 },
  { id:'P9',  name:'Pieza 9',  qty:1, w:1273, h:193 },
  { id:'P10', name:'Pieza 10', qty:1, w:1309, h:200 },
  { id:'P11', name:'Pieza 11', qty:1, w:1043, h:193 },
  { id:'P12', name:'Pieza 12', qty:1, w:1041, h:200 },
  { id:'P13', name:'Pieza 13', qty:1, w:830,  h:190 },
  { id:'P14', name:'Pieza 14', qty:1, w:1023, h:200 },
  { id:'P15', name:'Pieza 15', qty:1, w:805,  h:177 },
  { id:'P16', name:'Pieza 16', qty:1, w:805,  h:200 },
];

const expanded = [];
for (const p of pieceDefs)
  for (let i = 0; i < p.qty; i++)
    expanded.push({ ...p, _sid: `${p.id}_${i}` });

// Orient w >= h
const items = expanded.map(p =>
  p.h > p.w ? { ...p, _w: p.h, _h: p.w } : { ...p, _w: p.w, _h: p.h }
);

// Group by exact height
const hGroups = new Map();
for (const it of items) {
  if (!hGroups.has(it._h)) hGroups.set(it._h, []);
  hGroups.get(it._h).push(it);
}

// Classify row-worthy vs filler
const rowWorthy = new Set();
for (const [h, group] of hGroups) {
  const totalW = group.reduce((s, it) => s + it._w, 0) + KERF * (group.length - 1);
  const maxW   = Math.max(...group.map(it => it._w));
  if (totalW >= ROW_MIN_FILL * W || maxW >= 0.40 * W) rowWorthy.add(h);
}

console.log('\n📊 ROW-WORTHY heights:', [...rowWorthy].sort((a,b)=>b-a).join(', '));
console.log('📦 FILLER heights:', [...hGroups.keys()].filter(h => !rowWorthy.has(h)).sort((a,b)=>b-a).join(', '));

const mainPool   = new Map(items.filter(it =>  rowWorthy.has(it._h)).map(it => [it._sid, it]));
const fillerPool = new Map(items.filter(it => !rowWorthy.has(it._h)).map(it => [it._sid, it]));

console.log(`\nMain pool: ${mainPool.size} pieces, Filler pool: ${fillerPool.size} pieces`);

// Build main rows
const rows = [];
const heights = [...rowWorthy].sort((a, b) => b - a);

for (const h of heights) {
  const group = hGroups.get(h).filter(it => mainPool.has(it._sid));
  if (!group.length) continue;
  group.sort((a, b) => b._w - a._w);

  let cells = [], usedW = 0;
  for (const it of group) {
    const needed = it._w + (cells.length > 0 ? KERF : 0);
    if (usedW + needed <= W) {
      cells.push(it); usedW += needed; mainPool.delete(it._sid);
    } else {
      if (cells.length) rows.push({ h, usedW, cells, subCols: [] });
      cells = [it]; usedW = it._w; mainPool.delete(it._sid);
    }
  }
  if (cells.length) rows.push({ h, usedW, cells, subCols: [] });
}

console.log(`\n📋 Main rows formed: ${rows.length}`);
for (const r of rows) {
  const res = W - r.usedW - KERF;
  console.log(`  h=${r.h}, usedW=${r.usedW}, residual=${res}: [${r.cells.map(i=>i.name+'('+i._w+')').join(', ')}]`);
}
console.log(`  Fillers to place: ${[...fillerPool.values()].map(i=>i.name+'('+i._w+'×'+i._h+')').join(', ')}`);

// Fill sub-columns
const byResidual = () => [...rows].sort((a, b) => (W - b.usedW) - (W - a.usedW));
const sortedFill = () => [...fillerPool.values()].sort((a, b) => (b._w * b._h) - (a._w * a._h));

let changed = true;
while (changed && fillerPool.size > 0) {
  changed = false;
  for (const row of byResidual()) {
    if (!fillerPool.size) break;
    const resW = W - row.usedW - KERF;
    if (resW < MIN_SUBCOL_W) continue;
    const sc = { x: row.usedW + KERF, w: resW, items: [], usedH: 0 };
    for (const it of sortedFill()) {
      if (!fillerPool.has(it._sid)) continue;
      if (it._w > resW) continue;
      const freeH = row.h - sc.usedH - (sc.items.length > 0 ? KERF : 0);
      if (it._h > freeH) continue;
      sc.items.push(it);
      sc.usedH += (sc.items.length > 1 ? KERF : 0) + it._h;
      fillerPool.delete(it._sid);
      changed = true;
    }
    if (sc.items.length > 0) {
      row.subCols.push(sc);
      row.usedW = W;
    }
  }
}

// Handle remaining fillers with height mixing
for (const it of [...fillerPool.values()]) {
  let placed = false;
  for (const row of rows) {
    const hDiff = row.h - it._h;
    if (hDiff < 0 || hDiff > HEIGHT_MIX_TOL) continue;
    const spaceLeft = W - row.usedW - KERF;
    if (it._w > spaceLeft) continue;
    row.cells.push(it);
    row.usedW += KERF + it._w;
    row.h = Math.max(row.h, it._h);
    fillerPool.delete(it._sid);
    placed = true;
    break;
  }
  if (!placed) {
    rows.push({ h: it._h, usedW: it._w, cells: [it], subCols: [] });
    fillerPool.delete(it._sid);
  }
}

// Sort & pack
rows.sort((a, b) => b.h - a.h);

console.log('\n📋 Final rows (sorted):');
let totalRowH = 0;
for (const r of rows) {
  totalRowH += r.h + KERF;
  const sc = r.subCols.map(sc => `SubCol[${sc.items.map(i=>i.name).join('+')}]`).join(' ');
  console.log(`  h=${r.h}: [${r.cells.map(i=>i.name+'('+i._w+'×'+i._h+')').join(', ')}] ${sc}`);
}
totalRowH -= KERF;
console.log(`\nTotal height needed: ${totalRowH}mm (board H=${H}mm) → ${totalRowH <= H ? '✅ FITS' : '❌ OVERFLOW'}`);

// Pack onto board
let boardH = 0;
const board1 = [], board2 = [];
for (const row of rows) {
  const needed = row.h + (boardH > 0 ? KERF : 0);
  if (boardH + needed <= H) { board1.push(row); boardH += needed; }
  else board2.push(row);
}

const placed = new Set([...board1, ...board2].flatMap(r => [...r.cells.map(c=>c._sid), ...r.subCols.flatMap(sc=>sc.items.map(i=>i._sid))]));
const missing = expanded.filter(p => !placed.has(p._sid));

console.log(`\n🎯 RESULTADO:`);
console.log(`Tableros: ${board2.length > 0 ? 2 : 1}`);
console.log(`Tablero 1: ${boardH}mm de ${H}mm usados`);
if (board2.length) console.log(`Tablero 2: rows → ${board2.map(r=>r.h+'mm').join(', ')}`);

// Count cuts
let hCuts = Math.max(0, board1.length - 1), vCuts = 0;
for (const row of board1) {
  vCuts += Math.max(0, row.cells.length - 1);
  vCuts += row.subCols.length + row.subCols.reduce((s,sc) => s + Math.max(0, sc.items.length-1), 0);
}
console.log(`Cortes estimados: ${hCuts}H + ${vCuts}V = ${hCuts+vCuts} total`);
console.log(`Piezas faltantes: ${missing.length === 0 ? '✅ Ninguna' : missing.map(p=>p.name).join(', ')}`);
