import { optimizeCuts, optimizeDeep } from '../src/engine/optimizer.js';

const P = [
  {id:'u1',name:'Costado A',width:600,height:350,quantity:2},
  {id:'u2',name:'Lateral A',width:744,height:335,quantity:1},
  {id:'u3',name:'Fondo A',width:744,height:100,quantity:2},
  {id:'u4',name:'Estante A',width:743,height:300,quantity:1},
  {id:'u5',name:'Puerta A',width:586,height:383,quantity:2},
  {id:'u6',name:'Panel alto A',width:595,height:763,quantity:1},
  {id:'u7',name:'Costado B',width:600,height:350,quantity:2},
  {id:'u8',name:'Lateral B',width:744,height:335,quantity:1},
  {id:'u9',name:'Fondo B',width:744,height:100,quantity:2},
  {id:'u10',name:'Repisa B',width:744,height:280,quantity:1},
  {id:'u11',name:'Puerta B',width:586,height:383,quantity:2},
  {id:'u12',name:'Panel alto B',width:595,height:763,quantity:1},
  {id:'u13',name:'Separador',width:262,height:335,quantity:5},
  {id:'u14',name:'Tapa angosta',width:109,height:335,quantity:6},
  {id:'u15',name:'Costado C',width:600,height:400,quantity:2},
  {id:'u16',name:'Lateral C',width:744,height:385,quantity:1},
  {id:'u17',name:'Fondo C',width:744,height:100,quantity:2},
  {id:'u18',name:'Columna C',width:190,height:771,quantity:3},
  {id:'u19',name:'Panel alto C',width:595,height:763,quantity:1},
  {id:'u20',name:'Zócalo C',width:717,height:160,quantity:6},
  {id:'u21',name:'Entrepaño C',width:700,height:333,quantity:6},
  {id:'u22',name:'Costado D',width:600,height:400,quantity:2},
  {id:'u23',name:'Lateral D',width:744,height:385,quantity:1},
  {id:'u24',name:'Fondo D',width:744,height:100,quantity:2},
  {id:'u25',name:'Columna D',width:190,height:771,quantity:3},
  {id:'u26',name:'Panel alto D',width:595,height:763,quantity:1},
  {id:'u27',name:'Zócalo D',width:717,height:160,quantity:6},
  {id:'u28',name:'Frente cajón',width:314,height:160,quantity:6},
  {id:'u29',name:'Entrepaño D',width:700,height:333,quantity:6},
  {id:'u30',name:'Trasero gde',width:1870,height:1590,quantity:1},
  {id:'u31',name:'Trasero gde 2',width:1870,height:1590,quantity:1},
  {id:'u32',name:'Estante E',width:736,height:250,quantity:2},
  {id:'u33',name:'Estante F',width:606,height:250,quantity:2},
  {id:'u34',name:'Estante G',width:736,height:250,quantity:3},
  {id:'u35',name:'Tapa chica',width:300,height:250,quantity:4},
  {id:'u36',name:'Tapa chica 2',width:300,height:250,quantity:2},
];

const stock = { width:2750, height:1830, quantity:99, grain:'none' };
const opts = { kerf:3, edgeTrim:5, optimizationMode:'min-cuts', allowRotation:false };

const deep = optimizeDeep(P, stock, opts, []);
console.log(`Boards: ${deep.stats.totalBoards}, Algo: ${deep.stats.algorithmUsed}`);

// Check for overlaps
let overlapCount = 0;
for (let b = 0; b < deep.boards.length; b++) {
  const pieces = deep.boards[b].pieces;
  const area = pieces.reduce((s,p) => s + p.placedWidth * p.placedHeight, 0);
  const util = (area / (2750*1830) * 100).toFixed(1);
  console.log(`Board ${b+1}: ${pieces.length} pcs, util=${util}%`);
  
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i+1; j < pieces.length; j++) {
      const a = pieces[i], b2 = pieces[j];
      const ax2 = a.x + a.placedWidth;
      const ay2 = a.y + a.placedHeight;
      const bx2 = b2.x + b2.placedWidth;
      const by2 = b2.y + b2.placedHeight;
      if (a.x < bx2 && ax2 > b2.x && a.y < by2 && ay2 > b2.y) {
        overlapCount++;
        console.log(`  OVERLAP: ${a.name}(${a.x},${a.y},${ax2},${ay2}) vs ${b2.name}(${b2.x},${b2.y},${bx2},${by2})`);
      }
    }
  }
}

console.log(`\nTotal overlaps: ${overlapCount}`);
if (overlapCount === 0) console.log('✅ NO OVERLAPS - FIX WORKS!');
else console.log('❌ STILL HAS OVERLAPS');

process.exit(0);
