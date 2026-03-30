/**
 * CutWood — Comparación honesta Fast vs Deep
 * Corre los 15 casos con ambos modos y compara tableros + aprovechamiento.
 */
import { optimizeCuts, optimizeDeep } from '../engine/optimizer.js';

const STOCK_STD = { width: 2750, height: 1830, thickness: 18, grain: 'none' };
const OPT_STD   = { kerf: 3, edgeTrim: 5, allowRotation: true };

const CASES = [
  {
    name: '01 · Cocina Modular Simple',
    pieces: [
      { id:'p1', name:'Costado alto',  width:1830, height:560,  quantity:4 },
      { id:'p2', name:'Tapa/fondo',    width:560,  height:550,  quantity:4 },
      { id:'p3', name:'Estante',       width:550,  height:350,  quantity:6 },
      { id:'p4', name:'Puerta alta',   width:720,  height:396,  quantity:4 },
      { id:'p5', name:'Puerta baja',   width:560,  height:396,  quantity:4 },
      { id:'p6', name:'Zócalo',        width:550,  height:120,  quantity:4 },
      { id:'p7', name:'Cajón frente',  width:520,  height:200,  quantity:4 },
      { id:'p8', name:'Entrepaño',     width:540,  height:330,  quantity:4 },
    ],
  },
  {
    name: '02 · Grilla Masiva de Idénticos',
    pieces: [
      { id:'p1', name:'Frente',  width:500, height:500, quantity:81 },
      { id:'p2', name:'Zócalo',  width:2000, height:100, quantity:21 },
    ],
  },
  {
    name: '03 · Piezas Gigantes',
    pieces: [
      { id:'p1', name:'Panel A', width:2600, height:1100, quantity:1 },
      { id:'p2', name:'Panel B', width:2300, height:1200, quantity:1 },
      { id:'p3', name:'Panel C', width:2100, height:1500, quantity:1 },
    ],
  },
  {
    name: '04 · Tiras y Zócalos',
    pieces: [
      { id:'p1', name:'Zócalo largo',   width:2600, height:100, quantity:8 },
      { id:'p2', name:'Zócalo corto',   width:800,  height:100, quantity:6 },
      { id:'p3', name:'Tira estrecha',  width:1800, height:60,  quantity:6 },
      { id:'p4', name:'Remate lateral', width:400,  height:80,  quantity:4 },
      { id:'p5', name:'Zócalo mini',    width:300,  height:100, quantity:4 },
    ],
  },
  {
    name: '05 · Armario 3 Cuerpos',
    pieces: [
      { id:'p1', name:'Lateral ext',  width:2200, height:580, quantity:6 },
      { id:'p2', name:'Lateral int',  width:2200, height:560, quantity:3 },
      { id:'p3', name:'Estante',      width:560,  height:550, quantity:9 },
      { id:'p4', name:'Base/Techo',   width:580,  height:550, quantity:6 },
      { id:'p5', name:'Puerta',       width:730,  height:396, quantity:6 },
      { id:'p6', name:'Fondo',        width:560,  height:400, quantity:3 },
      { id:'p7', name:'Cajón fr.',    width:520,  height:200, quantity:6 },
      { id:'p8', name:'Cajonera lat', width:200,  height:150, quantity:4 },
    ],
  },
  {
    name: '06 · Micro Piezas',
    pieces: [
      { id:'p1', name:'Chico A', width:200, height:150, quantity:40 },
      { id:'p2', name:'Chico B', width:300, height:120, quantity:30 },
      { id:'p3', name:'Chico C', width:180, height:180, quantity:30 },
      { id:'p4', name:'Chico D', width:250, height:100, quantity:25 },
      { id:'p5', name:'Chico E', width:150, height:200, quantity:15 },
    ],
  },
  {
    name: '07 · Mix Extremo de Tamaños',
    pieces: [
      { id:'p1',  name:'Jumbo',    width:2400, height:900, quantity:2 },
      { id:'p2',  name:'Grande A', width:1800, height:600, quantity:3 },
      { id:'p3',  name:'Grande B', width:1500, height:800, quantity:2 },
      { id:'p4',  name:'Medio A',  width:1200, height:500, quantity:4 },
      { id:'p5',  name:'Medio B',  width:900,  height:700, quantity:3 },
      { id:'p6',  name:'Medio C',  width:800,  height:600, quantity:4 },
      { id:'p7',  name:'Chico A',  width:600,  height:400, quantity:5 },
      { id:'p8',  name:'Chico B',  width:500,  height:300, quantity:5 },
      { id:'p9',  name:'Chico C',  width:400,  height:500, quantity:4 },
      { id:'p10', name:'Mini A',   width:300,  height:200, quantity:6 },
      { id:'p11', name:'Mini B',   width:250,  height:350, quantity:4 },
      { id:'p12', name:'Mini C',   width:200,  height:150, quantity:5 },
      { id:'p13', name:'Tira A',   width:2000, height:80,  quantity:2 },
      { id:'p14', name:'Tira B',   width:1500, height:60,  quantity:2 },
      { id:'p15', name:'Tira C',   width:1000, height:50,  quantity:2 },
    ],
  },
  {
    name: '08 · Cajonería Estándar',
    pieces: [
      { id:'p1', name:'Fondo cajón grande',   width:786, height:200, quantity:12 },
      { id:'p2', name:'Lateral cajón grande', width:500, height:200, quantity:24 },
      { id:'p3', name:'Base cajón grande',    width:800, height:500, quantity:12 },
      { id:'p4', name:'Frente cajón chico',   width:400, height:150, quantity:8  },
      { id:'p5', name:'Lateral cajón chico',  width:450, height:150, quantity:16 },
      { id:'p6', name:'Fondo cajón chico',    width:400, height:150, quantity:12 },
    ],
  },
  {
    name: '09 · Veta Estricta (sin rotación)',
    stock: { width: 2750, height: 1830, thickness: 18, grain: 'vertical' },
    pieces: [
      { id:'p1', name:'Lateral',  width:2100, height:550, quantity:4, grain:'vertical' },
      { id:'p2', name:'Estante',  width:2000, height:300, quantity:8, grain:'vertical' },
      { id:'p3', name:'Cajonera', width:600,  height:550, quantity:4, grain:'vertical' },
      { id:'p4', name:'Puerta',   width:2100, height:396, quantity:6, grain:'vertical' },
      { id:'p5', name:'Tapa',     width:800,  height:550, quantity:4, grain:'vertical' },
    ],
  },
  {
    name: '10 · Multi-tablero (4+ tableros)',
    pieces: [
      { id:'p1', name:'Panel grande', width:2500, height:800, quantity:12 },
      { id:'p2', name:'Panel medio',  width:1800, height:600, quantity:12 },
      { id:'p3', name:'Panel chico',  width:1200, height:400, quantity:12 },
      { id:'p4', name:'Tira',         width:2600, height:100, quantity:12 },
    ],
  },
  {
    name: '11 · Packing Casi Perfecto',
    pieces: [
      { id:'p1', name:'Pieza A', width:1375, height:1830, quantity:2 },
      { id:'p2', name:'Pieza B', width:1370, height:610,  quantity:2 },
      { id:'p3', name:'Pieza C', width:1370, height:610,  quantity:1 },
    ],
  },
  {
    name: '12 · Biblioteca 5 Cuerpos',
    pieces: [
      { id:'p1', name:'Lateral', width:2100, height:300, quantity:12 },
      { id:'p2', name:'Estante', width:900,  height:290, quantity:25 },
      { id:'p3', name:'Base',    width:900,  height:300, quantity:10 },
      { id:'p4', name:'Techo',   width:900,  height:300, quantity:10 },
    ],
  },
  {
    name: '13 · Stress Test 50 Piezas Únicas',
    pieces: Array.from({ length: 50 }, (_, i) => ({
      id: `p${i+1}`,
      name: `Pieza ${i+1}`,
      width:  300 + (i * 47) % 2000,
      height: 200 + (i * 83) % 1400,
      quantity: 1,
    })),
  },
  {
    name: '14 · Tablero Jumbo 3660×1830',
    stock: { width: 3660, height: 1830, thickness: 18, grain: 'none' },
    pieces: [
      { id:'p1', name:'Panel XL A', width:3400, height:800,  quantity:4 },
      { id:'p2', name:'Panel XL B', width:3200, height:700,  quantity:4 },
      { id:'p3', name:'Panel XL C', width:2800, height:900,  quantity:4 },
      { id:'p4', name:'Panel XL D', width:3500, height:300,  quantity:6 },
    ],
  },
  {
    name: '15 · Proyecto Real Complejo',
    pieces: [
      { id:'p1',  name:'Cost. alto cocina', width:1830, height:560,  quantity:4 },
      { id:'p2',  name:'Tapa/fondo coc.',   width:560,  height:550,  quantity:4 },
      { id:'p3',  name:'Estante coc.',       width:550,  height:350,  quantity:6 },
      { id:'p4',  name:'Puerta alta coc.',  width:720,  height:396,  quantity:4 },
      { id:'p5',  name:'Puerta baja coc.',  width:560,  height:396,  quantity:4 },
      { id:'p6',  name:'Zócalo coc.',       width:550,  height:120,  quantity:4 },
      { id:'p7',  name:'Cajón fr. coc.',    width:520,  height:200,  quantity:4 },
      { id:'p8',  name:'Load plac.',        width:2200, height:580,  quantity:4 },
      { id:'p9',  name:'Estante plac.',     width:560,  height:550,  quantity:8 },
      { id:'p10', name:'Base/Techo plac.',  width:580,  height:550,  quantity:4 },
      { id:'p11', name:'Puerta plac.',      width:730,  height:396,  quantity:4 },
      { id:'p12', name:'Fondo plac.',       width:560,  height:400,  quantity:2 },
      { id:'p13', name:'Cajón fr. plac.',   width:520,  height:200,  quantity:8 },
    ],
  },
];

function formatRow(label, boards, util, ms, winner) {
  const w = winner ? ' ← MEJOR' : '';
  return `${label.padEnd(8)} │ ${String(boards).padStart(7)} │ ${String(util + '%').padStart(7)} │ ${String(ms + 'ms').padStart(8)}${w}`;
}

console.log('\n' + '═'.repeat(72));
console.log('   CutWood — Comparación HONESTA: Fast vs Deep');
console.log('═'.repeat(72));

let totalDeltaBoards = 0;
let totalDeltaUtil   = 0;
let deepWins = 0;
let ties     = 0;
let fastWins = 0;

for (const tc of CASES) {
  const stock   = tc.stock || STOCK_STD;
  const options = OPT_STD;

  const t0f = performance.now();
  const fast = optimizeCuts(tc.pieces, stock, options, []);
  const msFast = (performance.now() - t0f).toFixed(1);

  const t0d = performance.now();
  const deep = optimizeDeep(tc.pieces, stock, options, [], {});
  const msDeep = (performance.now() - t0d).toFixed(1);

  const fBoards = fast.stats.totalBoards;
  const dBoards = deep.stats.totalBoards;
  const fUtil   = parseFloat(fast.stats.overallUtilization);
  const dUtil   = parseFloat(deep.stats.overallUtilization);

  const deltaBoards = fBoards - dBoards;   // positive = deep uses fewer boards
  const deltaUtil   = dUtil - fUtil;        // positive = deep has better utilization

  totalDeltaBoards += deltaBoards;
  totalDeltaUtil   += deltaUtil;

  let winner = '';
  if (dBoards < fBoards || (dBoards === fBoards && dUtil > fUtil + 0.1)) {
    deepWins++;
    winner = '🏆 Deep';
  } else if (fBoards < dBoards || fUtil > dUtil + 0.1) {
    fastWins++;
    winner = '⚡ Fast';
  } else {
    ties++;
    winner = '= Empate';
  }

  console.log('\n' + tc.name);
  console.log('─'.repeat(65));
  console.log(formatRow('Fast', fBoards, fUtil.toFixed(1), msFast, false));
  console.log(formatRow('Deep', dBoards, dUtil.toFixed(1), msDeep, false));
  console.log(`  → ${winner}  |  ΔTableros: ${deltaBoards >= 0 ? '+' : ''}${deltaBoards}  |  ΔAprov.: ${deltaUtil >= 0 ? '+' : ''}${deltaUtil.toFixed(1)}%`);
}

console.log('\n' + '═'.repeat(72));
console.log('   RESUMEN FINAL');
console.log('═'.repeat(72));
console.log(`  🏆 Deep ganó:    ${deepWins} / ${CASES.length} casos`);
console.log(`  ⚡ Fast ganó:    ${fastWins} / ${CASES.length} casos`);
console.log(`  = Empates:       ${ties}  / ${CASES.length} casos`);
console.log(`  ΔTableros total: ${totalDeltaBoards >= 0 ? '+' : ''}${totalDeltaBoards} (+ = Deep ahorró tableros)`);
console.log(`  ΔAprov. promedio:${totalDeltaUtil >= 0 ? '+' : ''}${(totalDeltaUtil / CASES.length).toFixed(1)}% por caso`);
console.log('═'.repeat(72));
