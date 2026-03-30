/**
 * Test aislado del Strip Packer v4 con Vertical Gap Fill
 * Simula el caso real: puertas cocina baja + zócalos → ¿se combinan en mismo tablero?
 */
import { runStripPack } from '../engine/stripPacker.js';

const stock   = { width: 2750, height: 1830, grain: 'none' };
const options = { kerf: 3, edgeTrim: 5, allowRotation: true };

// Solo puertas + zócalos del Preset 15
const pieces = [];
for (let i = 0; i < 6; i++) pieces.push({ id: `p${i}`, name: 'Puerta cocina baja', width: 540, height: 396 });
for (let i = 0; i < 6; i++) pieces.push({ id: `z${i}`, name: 'Zócalo cocina',      width: 550, height: 100 });

console.log('── Strip Packer Aislado: Puertas (540×396 ×6) + Zócalos (550×100 ×6) ──\n');
console.log(`Stock: ${stock.width}×${stock.height}mm`);
console.log(`Columna disponible: ~550mm de ancho\n`);

const result = runStripPack(pieces, stock, options);

console.log(`✅ Tableros: ${result.boards.length}`);
console.log(`⚠️  No ubicadas: ${result.unfitted.length}\n`);

for (const [i, b] of result.boards.entries()) {
  console.log(`━━ Tablero ${i + 1}: ${b.pieces.length} piezas ━━`);
  const puertas = b.pieces.filter(p => p.name === 'Puerta cocina baja');
  const zocalos = b.pieces.filter(p => p.name === 'Zócalo cocina');
  console.log(`   Puertas en este tablero: ${puertas.length}`);
  console.log(`   Zócalos en este tablero: ${zocalos.length}`);
  if (zocalos.length > 0 && puertas.length > 0) {
    const maxPuertaY = Math.max(...puertas.map(p => p.y + p.placedHeight));
    const minZocaloY = Math.min(...zocalos.map(p => p.y));
    if (minZocaloY > maxPuertaY - 10) {
      console.log(`   🎯 GAP FILL ACTIVO: Zócalos ubicados en el hueco debajo de las puertas (y=${minZocaloY}mm)`);
    }
  }
  for (const p of b.pieces) {
    console.log(`   ${p.name.padEnd(20)} x=${String(p.x).padStart(4)}, y=${String(p.y).padStart(4)} → ${p.placedWidth}×${p.placedHeight}`);
  }
  console.log();
}
