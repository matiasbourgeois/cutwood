/**
 * CutWood Optimizer — Benchmark Extremo (15 casos)
 * Corre directo en Node.js: node src/tests/benchmark_cutwood.mjs
 */

import { optimizeCuts } from '../engine/optimizer.js';

const STOCK_STD  = { width: 2750, height: 1830, thickness: 18, quantity: 20, grain: 'none' };
const STOCK_GRAN = { width: 3660, height: 1830, thickness: 18, quantity: 20, grain: 'none' };
const STOCK_VETA = { width: 2750, height: 1830, thickness: 18, quantity: 20, grain: 'vertical' };
const OPT_STD    = { kerf: 3, edgeTrim: 5, allowRotation: true };
const OPT_NOVROT = { kerf: 3, edgeTrim: 5, allowRotation: false };

// ─── 15 casos de prueba ──────────────────────────────────────────────────────

const CASES = [

  // 1. CASO REAL TÍPICO — cocina modular pequeña
  {
    name: '01 · Cocina Modular Simple',
    desc: '8 tipos de piezas, tamaños mixtos, volumen medio',
    pieces: [
      { id:'p1', name:'Costado alto',   width:1830, height:560, quantity:4, grain:'none' },
      { id:'p2', name:'Tapa/fondo',     width:560,  height:550, quantity:4, grain:'none' },
      { id:'p3', name:'Estante',        width:550,  height:350, quantity:6, grain:'none' },
      { id:'p4', name:'Puerta alta',    width:720,  height:396, quantity:4, grain:'none' },
      { id:'p5', name:'Puerta baja',    width:560,  height:396, quantity:4, grain:'none' },
      { id:'p6', name:'Zócalo',         width:550,  height:120, quantity:4, grain:'none' },
      { id:'p7', name:'Cajón frente',   width:520,  height:200, quantity:4, grain:'none' },
      { id:'p8', name:'Cajón fondo',    width:520,  height:150, quantity:4, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 2. GRILLA DE IDÉNTICOS — el peor caso para variabilidad
  {
    name: '02 · Grilla Masiva de Idénticos',
    desc: '81 frontales 500×500 + 21 zócalos 2000×100',
    pieces: [
      { id:'p1', name:'Frente',  width:500,  height:500, quantity:81, grain:'none' },
      { id:'p2', name:'Zócalo',  width:2000, height:100, quantity:21, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 3. PIEZAS GIGANTES — solo 3 piezas enormes
  {
    name: '03 · Piezas Gigantes',
    desc: '3 piezas que casi llenan el tablero entero',
    pieces: [
      { id:'p1', name:'Panel trasero grande', width:2600, height:1700, quantity:1, grain:'none' },
      { id:'p2', name:'Tapa larga',           width:2600, height:560,  quantity:1, grain:'none' },
      { id:'p3', name:'Base ancha',           width:2600, height:560,  quantity:1, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 4. TIRAS ANGOSTAS — pesadilla para el packer
  {
    name: '04 · Tiras y Zócalos',
    desc: 'Muchas tiras angostas de ancho diferente',
    pieces: [
      { id:'p1', name:'Tira 2720×80',  width:2720, height:80,  quantity:8, grain:'none' },
      { id:'p2', name:'Tira 2720×100', width:2720, height:100, quantity:6, grain:'none' },
      { id:'p3', name:'Tira 2720×120', width:2720, height:120, quantity:4, grain:'none' },
      { id:'p4', name:'Tira 2720×150', width:2720, height:150, quantity:4, grain:'none' },
      { id:'p5', name:'Tira 1364×80',  width:1364, height:80,  quantity:6, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 5. ARMARIO COMPLETO — caso clásico de carpintería
  {
    name: '05 · Armario 3 Cuerpos',
    desc: 'Armario con 3 módulos: muchas piezas variadas',
    pieces: [
      { id:'p1',  name:'Costado lateral', width:2200, height:570, quantity:2, grain:'none' },
      { id:'p2',  name:'Costado interno', width:2200, height:570, quantity:2, grain:'none' },
      { id:'p3',  name:'Techo',           width:570,  height:880, quantity:3, grain:'none' },
      { id:'p4',  name:'Base',            width:570,  height:880, quantity:3, grain:'none' },
      { id:'p5',  name:'Estante fijo',    width:554,  height:880, quantity:6, grain:'none' },
      { id:'p6',  name:'Puerta 1/2',      width:1100, height:600, quantity:6, grain:'none' },
      { id:'p7',  name:'Puerta entera',   width:2200, height:600, quantity:0, grain:'none' },
      { id:'p8',  name:'Cajón frente',    width:570,  height:200, quantity:6, grain:'none' },
      { id:'p9',  name:'Cajón lat.',      width:460,  height:200, quantity:6, grain:'none' },
      { id:'p10', name:'Cajón fondo',     width:450,  height:200, quantity:6, grain:'none' },
      { id:'p11', name:'Zócalo frontal',  width:870,  height:100, quantity:3, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 6. MICRO PIEZAS — muchas piezas chicas
  {
    name: '06 · Micro Piezas',
    desc: 'Piezas muy pequeñas en grandes cantidades',
    pieces: [
      { id:'p1', name:'Pieza 200×150', width:200, height:150, quantity:30, grain:'none' },
      { id:'p2', name:'Pieza 180×120', width:180, height:120, quantity:30, grain:'none' },
      { id:'p3', name:'Pieza 150×100', width:150, height:100, quantity:40, grain:'none' },
      { id:'p4', name:'Pieza 300×200', width:300, height:200, quantity:20, grain:'none' },
      { id:'p5', name:'Pieza 250×180', width:250, height:180, quantity:20, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 7. MIX EXTREMO — todo distinto, sin orden
  {
    name: '07 · Mix Extremo de Tamaños',
    desc: '15 tipos de piezas, todas distintas, sin patrón',
    pieces: [
      { id:'p1',  name:'Pieza A', width:1830, height:560,  quantity:2, grain:'none' },
      { id:'p2',  name:'Pieza B', width:1200, height:800,  quantity:1, grain:'none' },
      { id:'p3',  name:'Pieza C', width:900,  height:700,  quantity:3, grain:'none' },
      { id:'p4',  name:'Pieza D', width:750,  height:500,  quantity:2, grain:'none' },
      { id:'p5',  name:'Pieza E', width:600,  height:450,  quantity:4, grain:'none' },
      { id:'p6',  name:'Pieza F', width:500,  height:400,  quantity:3, grain:'none' },
      { id:'p7',  name:'Pieza G', width:400,  height:350,  quantity:5, grain:'none' },
      { id:'p8',  name:'Pieza H', width:350,  height:300,  quantity:4, grain:'none' },
      { id:'p9',  name:'Pieza I', width:2600, height:150,  quantity:2, grain:'none' },
      { id:'p10', name:'Pieza J', width:2200, height:200,  quantity:3, grain:'none' },
      { id:'p11', name:'Pieza K', width:1800, height:120,  quantity:4, grain:'none' },
      { id:'p12', name:'Pieza L', width:220,  height:180,  quantity:8, grain:'none' },
      { id:'p13', name:'Pieza M', width:180,  height:140,  quantity:6, grain:'none' },
      { id:'p14', name:'Pieza N', width:1694, height:300,  quantity:2, grain:'none' },
      { id:'p15', name:'Pieza O', width:345,  height:280,  quantity:4, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 8. CAJONERÍA COMPLETA — muchos cajones iguales en varios tamaños
  {
    name: '08 · Cajonería Estándar',
    desc: '3 tamaños de cajón × muchas unidades cada uno',
    pieces: [
      { id:'p1', name:'Frente cajón grande',  width:800, height:200, quantity:12, grain:'none' },
      { id:'p2', name:'Lateral cajón grande', width:500, height:200, quantity:24, grain:'none' },
      { id:'p3', name:'Fondo cajón grande',   width:786, height:200, quantity:12, grain:'none' },
      { id:'p4', name:'Base cajón grande',    width:800, height:500, quantity:12, grain:'none' },
      { id:'p5', name:'Frente cajón chico',   width:400, height:150, quantity:8,  grain:'none' },
      { id:'p6', name:'Lateral cajón chico',  width:450, height:150, quantity:16, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 9. VETA ESTRICTA — todas con restricción de veta
  {
    name: '09 · Veta Estricta (sin rotación)',
    desc: 'Piezas que no pueden rotar por requisito de veta',
    pieces: [
      { id:'p1', name:'Panel v',     width:1830, height:400, quantity:4, grain:'vertical' },
      { id:'p2', name:'Puerta v',    width:720,  height:400, quantity:6, grain:'vertical' },
      { id:'p3', name:'Estante v',   width:800,  height:350, quantity:8, grain:'vertical' },
      { id:'p4', name:'Tapa v',      width:600,  height:580, quantity:4, grain:'vertical' },
      { id:'p5', name:'Costado v',   width:720,  height:560, quantity:4, grain:'vertical' },
    ],
    stock: STOCK_VETA, options: OPT_NOVROT,
  },

  // 10. MULTI-TABLERO FORZADO — diseñado para necesitar 4+ tableros
  {
    name: '10 · Multi-tablero (4+ tableros)',
    desc: 'Volumen alto que garantiza múltiples tableros',
    pieces: [
      { id:'p1', name:'Costado',   width:2200, height:580, quantity:12, grain:'none' },
      { id:'p2', name:'Techo',     width:580,  height:900, quantity:6,  grain:'none' },
      { id:'p3', name:'Estante',   width:554,  height:880, quantity:18, grain:'none' },
      { id:'p4', name:'Puerta',    width:1100, height:420, quantity:12, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 11. CASI PERFECTO — diseñado para ~95% aprovechamiento
  {
    name: '11 · Packing Casi Perfecto',
    desc: 'Piezas elegidas para aprovechar casi el 100% del tablero',
    pieces: [
      // Dos filas de 5 × 550mm = 2750mm exactos (menos kerf)
      { id:'p1', name:'Panel A', width:1366, height:910, quantity:2, grain:'none' },
      { id:'p2', name:'Panel B', width:1366, height:910, quantity:2, grain:'none' },
      { id:'p3', name:'Tira C',  width:2750, height:100, quantity:1, grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 12. BIBLIOTECA — vertical y angosta, muchos estantes
  {
    name: '12 · Biblioteca 5 Cuerpos',
    desc: 'Librería: piezas altas angostas + estantes horizontales',
    pieces: [
      { id:'p1', name:'Costado',     width:1800, height:300, quantity:12, grain:'none' },
      { id:'p2', name:'Techo/Base',  width:300,  height:800, quantity:10, grain:'none' },
      { id:'p3', name:'Estante',     width:300,  height:786, quantity:30, grain:'none' },
      { id:'p4', name:'Trasero',     width:1800, height:800, quantity:5,  grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

  // 13. STRESS TEST — 50 tamaños distintos, 1 unidad c/u
  {
    name: '13 · Stress Test 50 Piezas Únicas',
    desc: '50 piezas distintas de 1 unidad — máximo estrés para el packer',
    pieces: Array.from({ length: 50 }, (_, i) => ({
      id: `p${i+1}`,
      name: `Pieza ${i+1}`,
      width:  200 + Math.round((i * 47) % 2000),
      height: 150 + Math.round((i * 31) % 1500),
      quantity: 1,
      grain: 'none',
    })).filter(p => p.width <= 2740 && p.height <= 1820),
    stock: STOCK_STD, options: OPT_STD,
  },

  // 14. TABLERO GRANDE 3660mm — uso de tableros jumbo
  {
    name: '14 · Tablero Jumbo 3660×1830',
    desc: 'Piezas largas que normalmente no entran en estándar',
    pieces: [
      { id:'p1', name:'Panel corrido', width:3500, height:400,  quantity:4, grain:'none' },
      { id:'p2', name:'Tira larga',    width:3500, height:120,  quantity:6, grain:'none' },
      { id:'p3', name:'Puerta larga',  width:2400, height:600,  quantity:4, grain:'none' },
      { id:'p4', name:'Lateral',       width:2000, height:580,  quantity:4, grain:'none' },
    ],
    stock: STOCK_GRAN, options: OPT_STD,
  },

  // 15. CASO REAL COMPLEJO — cocina + placard mezclados
  {
    name: '15 · Proyecto Real Complejo',
    desc: 'Cocina 3 módulos + placard 2 cuerpos en mismo pedido',
    pieces: [
      // Cocina
      { id:'k1',  name:'Costado cocina alto',  width:2100, height:560, quantity:4,  grain:'none' },
      { id:'k2',  name:'Estante cocina',        width:554,  height:560, quantity:8,  grain:'none' },
      { id:'k3',  name:'Puerta cocina alta',    width:680,  height:396, quantity:6,  grain:'none' },
      { id:'k4',  name:'Puerta cocina baja',    width:540,  height:396, quantity:6,  grain:'none' },
      { id:'k5',  name:'Zócalo cocina',         width:550,  height:100, quantity:6,  grain:'none' },
      { id:'k6',  name:'Cajón cocina F',        width:520,  height:200, quantity:6,  grain:'none' },
      { id:'k7',  name:'Cajón cocina L',        width:450,  height:200, quantity:12, grain:'none' },
      // Placard
      { id:'cl1', name:'Costado placard',       width:2200, height:600, quantity:4,  grain:'none' },
      { id:'cl2', name:'Estante placard',        width:580,  height:900, quantity:6,  grain:'none' },
      { id:'cl3', name:'Puerta placard',         width:2200, height:450, quantity:4,  grain:'none' },
      { id:'cl4', name:'Cajón placard F',        width:860,  height:200, quantity:4,  grain:'none' },
      { id:'cl5', name:'Cajón placard L',        width:470,  height:200, quantity:8,  grain:'none' },
      { id:'cl6', name:'Separador vertical',     width:1050, height:580, quantity:4,  grain:'none' },
    ],
    stock: STOCK_STD, options: OPT_STD,
  },

];

// ─── Runner ──────────────────────────────────────────────────────────────────

const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

function utilColor(u) {
  if (u >= 85) return GREEN;
  if (u >= 70) return YELLOW;
  return RED;
}

console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}${CYAN}   CutWood Optimizer — Benchmark Extremo (15 casos)${RESET}`);
console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════${RESET}\n`);

const summary = [];

for (const c of CASES) {
  const validPieces = c.pieces.filter(p => p.width > 0 && p.height > 0 && p.quantity > 0);
  const totalQty = validPieces.reduce((s, p) => s + p.quantity, 0);

  const t0 = performance.now();
  const result = optimizeCuts(validPieces, c.stock, c.options);
  const ms = (performance.now() - t0).toFixed(1);

  const { stats, boards, unfitted } = result;
  const util = parseFloat(stats.overallUtilization);

  const totalRetazos = boards.reduce((s, b) => s + (b.offcuts?.length || 0), 0);
  const totalCuts    = boards.reduce((s, b) => s + (b.cutSequence?.length || 0), 0);
  const boardsUsed   = boards.length;

  const uc = utilColor(util);

  console.log(`${BOLD}${c.name}${RESET}`);
  console.log(`  ${c.desc}`);
  console.log(`  ${CYAN}Tablero:${RESET} ${c.stock.width}×${c.stock.height}mm | ${CYAN}Piezas tipos:${RESET} ${validPieces.length} | ${CYAN}Total uds:${RESET} ${totalQty}`);
  console.log(`  ${CYAN}Tableros usados:${RESET} ${BOLD}${boardsUsed}${RESET}  |  ${CYAN}Aprovechamiento:${RESET} ${uc}${BOLD}${util}%${RESET}  |  ${CYAN}Tiempo:${RESET} ${ms}ms`);
  console.log(`  ${CYAN}Retazos útiles:${RESET} ${totalRetazos}  |  ${CYAN}Pasos de corte:${RESET} ${totalCuts}  |  ${CYAN}No ubicadas:${RESET} ${unfitted.length > 0 ? RED : GREEN}${unfitted.length}${RESET}`);

  if (unfitted.length > 0) {
    console.log(`  ${RED}⚠ No entraron: ${unfitted.map(p => p.name).join(', ')}${RESET}`);
  }

  console.log();
  summary.push({ name: c.name, boards: boardsUsed, util, ms: parseFloat(ms), unfitted: unfitted.length, retazos: totalRetazos });
}

// ─── Summary table ───────────────────────────────────────────────────────────

console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}${CYAN}   RESUMEN COMPARATIVO${RESET}`);
console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════${RESET}`);
console.log(`${'Caso'.padEnd(40)} ${'Tableros'.padStart(8)} ${'Aprov.'.padStart(8)} ${'Tiempo'.padStart(8)} ${'Retazos'.padStart(8)} ${'No entr.'.padStart(8)}`);
console.log('─'.repeat(82));

for (const s of summary) {
  const uc = utilColor(s.util);
  console.log(
    `${s.name.substring(0, 39).padEnd(40)} ` +
    `${String(s.boards).padStart(8)} ` +
    `${uc}${String(s.util + '%').padStart(8)}${RESET} ` +
    `${String(s.ms + 'ms').padStart(8)} ` +
    `${String(s.retazos).padStart(8)} ` +
    `${(s.unfitted > 0 ? RED : '') + String(s.unfitted).padStart(8) + RESET}`
  );
}

const avgUtil = (summary.reduce((s, r) => s + r.util, 0) / summary.length).toFixed(1);
const totalMs = summary.reduce((s, r) => s + r.ms, 0).toFixed(1);
const totalUnfitted = summary.reduce((s, r) => s + r.unfitted, 0);

console.log('─'.repeat(82));
console.log(`${BOLD}${'PROMEDIO / TOTAL'.padEnd(40)} ${String(Math.round(summary.reduce((s,r)=>s+r.boards,0)/summary.length)).padStart(8)} ${utilColor(parseFloat(avgUtil))}${String(avgUtil + '%').padStart(8)}${RESET} ${String(totalMs + 'ms').padStart(8)} ${String(summary.reduce((s,r)=>s+r.retazos,0)).padStart(8)} ${totalUnfitted > 0 ? RED : GREEN}${String(totalUnfitted).padStart(8)}${RESET}${BOLD}${RESET}`);
console.log(`\n${GREEN}✅ Benchmark completo. Todos los 15 casos ejecutados en ${totalMs}ms total.${RESET}\n`);
