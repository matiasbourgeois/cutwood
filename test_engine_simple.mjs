/**
 * test_engine_simple.mjs — Outputs only summary (no Unicode, no emoji)
 */
import { runLeptonPack }        from './src/engine/leptonPacker.js';
import { runHorizontalStripPack } from './src/engine/horizontalStripPacker.js';

const RAW_PIECES = [
  { qty: 2,  w: 600,  h: 350  },
  { qty: 1,  w: 744,  h: 335  },
  { qty: 2,  w: 744,  h: 100  },
  { qty: 1,  w: 743,  h: 300  },
  { qty: 2,  w: 586,  h: 382.5},
  { qty: 1,  w: 595,  h: 763  },
  { qty: 2,  w: 600,  h: 350  },
  { qty: 1,  w: 744,  h: 335  },
  { qty: 2,  w: 744,  h: 100  },
  { qty: 1,  w: 744,  h: 280  },
  { qty: 2,  w: 586,  h: 382.5},
  { qty: 1,  w: 595,  h: 763  },
  { qty: 5,  w: 262,  h: 335  },
  { qty: 6,  w: 109,  h: 335  },
  { qty: 2,  w: 600,  h: 400  },
  { qty: 1,  w: 744,  h: 385  },
  { qty: 2,  w: 744,  h: 100  },
  { qty: 3,  w: 190,  h: 771  },
  { qty: 1,  w: 595,  h: 763  },
  { qty: 6,  w: 717,  h: 160  },
  { qty: 6,  w: 700,  h: 333  },
  { qty: 2,  w: 600,  h: 400  },
  { qty: 1,  w: 744,  h: 385  },
  { qty: 2,  w: 744,  h: 100  },
  { qty: 3,  w: 190,  h: 771  },
  { qty: 1,  w: 595,  h: 763  },
  { qty: 6,  w: 717,  h: 160  },
  { qty: 6,  w: 314,  h: 160  },
  { qty: 6,  w: 700,  h: 333  },
  { qty: 1,  w: 1870, h: 1590 },
  { qty: 1,  w: 1870, h: 1590 },
  { qty: 2,  w: 736,  h: 250  },
  { qty: 2,  w: 606,  h: 250  },
  { qty: 3,  w: 736,  h: 250  },
  { qty: 4,  w: 300,  h: 250  },
  { qty: 2,  w: 300,  h: 250  },
];

function expand(rawPieces) {
  const result = [];
  let id = 1;
  for (const r of rawPieces) {
    for (let i = 0; i < r.qty; i++) {
      result.push({ id:`p${id}`, name:`P${id}`, width:r.w, height:r.h, canRotate:true, forceRotated:false });
      id++;
    }
  }
  return result;
}

const STOCK  = { width:2750, height:1830, grain:'none', quantity:99 };
const OPTS   = { kerf:3, edgeTrim:0, allowRotation:true };

function summarize(r, label) {
  const boards = r.boards;
  const u = boards.reduce((s,b)=>s+b.pieces.reduce((a,p)=>a+p.placedWidth*p.placedHeight,0),0);
  const t = boards.reduce((s,b)=>s+b.stockWidth*b.stockHeight,0);
  const util = t>0?(u/t*100).toFixed(1):0;
  const unfitted = r.unfitted?.length??0;

  let totalStrips=0, totalHomogeneousStrips=0;
  const boardDetails = [];
  for(const b of boards){
    const yMap = new Map();
    for(const p of b.pieces){
      const yk = Math.round(p.y);
      if(!yMap.has(yk)) yMap.set(yk,[]);
      yMap.get(yk).push(p);
    }
    const strips = yMap.size;
    totalStrips += strips;
    // A strip is homogeneous if all pieces have same height (+/-2mm)
    for(const [,ps] of yMap){
      const hs = ps.map(p=>p.placedHeight);
      const mn = Math.min(...hs), mx = Math.max(...hs);
      if(mx-mn<=2) totalHomogeneousStrips++;
    }
    const pieceArea = b.pieces.reduce((s,p)=>s+p.placedWidth*p.placedHeight,0);
    const maxY = b.pieces.length>0?Math.max(...b.pieces.map(p=>p.y+p.placedHeight)):0;
    boardDetails.push({
      util:(pieceArea/(b.stockWidth*b.stockHeight)*100).toFixed(1),
      pieces:b.pieces.length,
      strips,
      maxY:Math.round(maxY),
      usedH_pct:(maxY/b.stockHeight*100).toFixed(1)
    });
  }

  process.stdout.write(`\n[${label}]\n`);
  process.stdout.write(`  Tableros: ${boards.length}  |  Unfitted: ${unfitted}  |  Util total: ${util}%\n`);
  process.stdout.write(`  Tiras totales: ${totalStrips}  |  Homogeneas: ${totalHomogeneousStrips}\n`);
  for(let i=0;i<boardDetails.length;i++){
    const d=boardDetails[i];
    process.stdout.write(`  T${i+1}: ${d.util}% | ${d.pieces} piezas | ${d.strips} tiras | max-Y=${d.maxY}mm (${d.usedH_pct}% board height)\n`);
  }
}

// Also: detailed strip breakdown per board for the best variant diagnostic
function detailBoard(boards, label) {
  process.stdout.write(`\n=== DETALLE BANDAS: ${label} ===\n`);
  for(let i=0;i<boards.length;i++){
    const b = boards[i];
    process.stdout.write(`\n-- Tablero ${i+1} --\n`);
    const yMap = new Map();
    for(const p of b.pieces){
      const yk = Math.round(p.y);
      if(!yMap.has(yk)) yMap.set(yk,[]);
      yMap.get(yk).push(p);
    }
    for(const [y,ps] of [...yMap].sort((a,b)=>a[0]-b[0])){
      const h = Math.max(...ps.map(p=>p.placedHeight));
      const ws = ps.map(p=>p.placedWidth).join('+');
      const totalW = ps.reduce((s,p)=>s+p.placedWidth,0);
      process.stdout.write(`  y=${y} h=${h}: [${ws}] total_w=${totalW}\n`);
    }
  }
}

function transpose(pieces, stock){
  const tP = pieces.map(p=>({...p,_ow:p.width,_oh:p.height,width:p.canRotate!==false?p.height:p.width,height:p.canRotate!==false?p.width:p.height}));
  const tS = {...stock,width:stock.height,height:stock.width};
  return {tP,tS};
}
function untranspose(r,rW,rH){
  return {...r,boards:r.boards.map(b=>({...b,stockWidth:rW,stockHeight:rH,pieces:b.pieces.map(p=>({...p,width:p._ow??p.placedHeight,height:p._oh??p.placedWidth,x:p.y,y:p.x,placedWidth:p.placedHeight,placedHeight:p.placedWidth}))}))}
}

const expanded = expand(RAW_PIECES);
process.stdout.write(`Dataset: ${expanded.length} piezas | Tablero ${STOCK.width}x${STOCK.height}\n`);
process.stdout.write(`Area piezas: ${(expanded.reduce((s,p)=>s+p.width*p.height,0)/1e6).toFixed(3)} m2 | Minimo: ${(expanded.reduce((s,p)=>s+p.width*p.height,0)/(STOCK.width*STOCK.height)).toFixed(2)} tableros\n`);

const rA = runLeptonPack(expanded.map(p=>({...p})), STOCK, OPTS);
summarize(rA, 'A) LeptonPacker Normal');

const rB = runHorizontalStripPack(expanded.map(p=>({...p})), STOCK, OPTS);
summarize(rB, 'B) HorizontalStrip Normal');

const {tP:tpC,tS:tsC} = transpose(expanded.map(p=>({...p})),STOCK);
const rC_raw = runLeptonPack(tpC,tsC,OPTS);
const rC = untranspose(rC_raw,STOCK.width,STOCK.height);
summarize(rC, 'C) Lepton Transpuesto');

const {tP:tpD,tS:tsD} = transpose(expanded.map(p=>({...p})),STOCK);
const rD_raw = runHorizontalStripPack(tpD,tsD,OPTS);
const rD = untranspose(rD_raw,STOCK.width,STOCK.height);
summarize(rD, 'D) HStrip Transpuesto');

// Lepton con height-snap
function runLeptonSnap(pieces,stock,opts){
  const SNAP=10;
  const allH = [...new Set(pieces.map(p=>Math.min(p.width,p.height)<Math.max(p.width,p.height)?p.height:Math.min(p.width,p.height)))].sort((a,b)=>a-b);
  const centers=[];
  for(const h of allH){ if(centers.length===0||Math.abs(h-centers[centers.length-1])>SNAP) centers.push(h); }
  const snap_h = h => { let b=h,bd=Infinity; for(const c of centers){const d=Math.abs(h-c);if(d<bd){bd=d;b=c;}} return bd<=SNAP?b:h; };
  const snapped = pieces.map(p=>({...p,height:snap_h(p.height)}));
  return runLeptonPack(snapped,stock,opts);
}

const rE = runLeptonSnap(expanded.map(p=>({...p})),STOCK,OPTS);
summarize(rE, 'E) Lepton+HeightSnap');

// Best variant analysis — show C in detail (4 boards transposed)
process.stdout.write(`\n=== ANALISIS VARIANTE C (4 tableros, pero 2 sin colocar) ===\n`);
process.stdout.write(`Unfitted: ${rC.unfitted?.map(p=>`${p.placedWidth??p.width}x${p.placedHeight??p.height}`).join(', ')??'ninguno'}\n`);
detailBoard(rC.boards, 'C) Lepton Transpuesto');

// Final
process.stdout.write(`\n=== DETALLE B (HStrip Normal - 5 tabs) ===\n`);
detailBoard(rB.boards, 'B) HStrip Normal');
