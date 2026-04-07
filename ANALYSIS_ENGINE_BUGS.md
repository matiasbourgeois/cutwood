# 🔬 ANÁLISIS DEFINITIVO — CutWood vs Lepton (Dataset Muebles 30 piezas)

**Fecha:** 2026-04-07
**Dataset:** 24 líneas → 30 piezas expandidas (6 muebles con LATERAL, BASE, TRAV, ESTANTE, LAT, TAPA)
**Tablero:** 2750 × 1830 mm (usable: 2740 × 1820 con edgeTrim=5)

---

## 1. DATOS DEL PROBLEMA

### Piezas (30 totales)

| # | Nombre | Largo×Ancho | Cant | Área/ud | Área total |
|---|--------|-------------|------|---------|------------|
| 1 | LATERAL | 720×560 | 2 | 403,200 | 806,400 |
| 2 | BASE | 1134×545 | 1 | 617,730 | 617,730 |
| 3 | TRAV | 1134×100 | 1 | 113,400 | 113,400 |
| 4 | ESTANTE | 1133×540 | 1 | 611,820 | 611,820 |
| 5 | LATERAL | 720×550 | 2 | 396,000 | 792,000 |
| 6 | BASE | 1194×535 | 1 | 638,790 | 638,790 |
| 7 | TRAV | 1194×100 | 1 | 119,400 | 119,400 |
| 8 | ESTANTE | 1193×540 | 1 | 644,220 | 644,220 |
| 9 | LATERAL | 720×560 | 2 | 403,200 | 806,400 |
| 10 | BASE | 449×545 | 1 | 244,705 | 244,705 |
| 11 | TRAV | 449×100 | 1 | 44,900 | 44,900 |
| 12 | ESTANTE | 448×490 | 1 | 219,520 | 219,520 |
| 13 | LATERAL | 720×560 | 2 | 403,200 | 806,400 |
| 14 | BASE | 459×545 | 1 | 250,155 | 250,155 |
| 15 | TRAV | 459×100 | 1 | 45,900 | 45,900 |
| 16 | ESTANTE | 458×490 | 1 | 224,420 | 224,420 |
| 17 | LAT | 1540×100 | 2 | 154,000 | 308,000 |
| 18 | TAPA | 449×100 | 1 | 44,900 | 44,900 |
| 19 | BASE | 449×560 | 1 | 251,440 | 251,440 |
| 20 | ESTANTE | 525×500 | 1 | 262,500 | 262,500 |
| 21 | LAT | 1520×100 | 2 | 152,000 | 304,000 |
| 22 | TAPA | 459×100 | 1 | 45,900 | 45,900 |
| 23 | BASE | 459×560 | 1 | 257,040 | 257,040 |
| 24 | ESTANTE | 535×500 | 1 | 267,500 | 267,500 |

**Área total piezas: ~8,527,540 mm²**

### Cálculo de tableros mínimos:
- Área usable por tablero: 2740 × 1820 = 4,986,800 mm²
- Mínimo teórico: 8,527,540 / 4,986,800 = **1.71 tableros → necesita MÍNIMO 2 tableros**
- Con 2 tableros: utilización ideal = 85.5% → **perfectamente alcanzable**

---

## 2. QUÉ HACE LEPTON (REFERENCIA — 2 tableros)

### Tablero L1 — Desperdicio 7.6%

Layout columnar/mixto. Lepton NO piensa en "filas horizontales", piensa en **bloques**:

```
┌─────────────────────────────────────────────────────────────────┐
│ ESTANTE(8)   │        BASE(6)       │TRAV│TAPA│TRAV│  449│     │ 1830
│ 1193×540     │       1194×535       │ 100│ 100│ 100│     │     │
├──────────────┼──────────────────────┤    │    │    │BASE │     │
│   BASE(2)    │   ESTANTE(4)        │────┘────┘────┘(14) │     │
│  1134×545    │    1133×540         │               459× │     │
│              │                     │                545  │     │
├──────────────┼─────────────────────┼────────────────────┤     │
│ LATERAL(1)   │  LATERAL(1)        │  LATERAL(9)  │ESTANTE(24)│ │
│   720×560    │    720×560         │   720×560    │ 535×500  │ │
├──────────────┼────────────────────┤              │          │ │
│ LAT(17) 1540×100 │TRAV(7) 1194×100│              │          │ │
└──────────────────────────────────────────────────────────────┘
```

Piezas en L1: (8), (6), (15)(22)(11) TRAV/TAPA/TRAV arriba derecha,
(2), (4), (14) BASE en el medio,
(1)×2 LATERAL, (9) LATERAL, (24) ESTANTE abajo,
(17) LAT, (7) TRAV al fondo.
**Total: ~16 piezas, 92.4% utilización**

### Tablero L2 — Desperdicio 19%

Layout columnar con todas las LATERAL a la izquierda:

```
┌─────────────────────────────────────────────────────────────────┐
│ LATERAL(9) │LATERAL(13)│ ESTANTE(20)│LAT │LAT │ESTANTE(16)│    │
│  720×560   │  720       │  525×500  │1540│1520│  458×490  │    │
│            │  ×560      │           │×100│×100│           │TRAV│
├────────────┤           ├───────────┤    │    │ ESTANTE   │448 │
│ LATERAL(5) │  720       │  525      │    │    │  (12)    │    │
│  720×550   │  ×560      │  (23)    │────┘────┘  448×490 │    │
│            ├───────────┤  BASE     │           │        │    │
│ LATERAL    │LATERAL(13)│  459×560  │ BASE(10)  │ BASE   │    │
│  720×550   │  720×560  │           │  449×545  │(19)449 │    │
├────────────┤           │           │           │ ×560   │TAPA│
│ LATERAL(5) │           │  BASE     │  100 100  │        │    │
│  720×560   │  560      │  525     │  100 100  │  449   │100 │
│            │  ×712     │          │           │        │    │
│   720      │  449      │          │  490      │        │    │
└─────────────────────────────────────────────────────────────┘
```

**Total: ~14 piezas, 81% utilización**

**CLAVE: Lepton usa un approach COLUMNAR — columna de LATERALes (720mm ancho × todo el alto), columna de BASEs/ESTANTEs, y rellena huecos con piezas chicas.**

---

## 3. QUÉ HACE CUTWOOD (PROBLEMÁTICO — 3 tableros + overlap)

### Tablero CW1 — 16 piezas, UI dice 58.3%

```
┌──────────────────────────────────────────────────────────────────┐
│ LAT 1540×100           │                                         │
│ LAT 1540×100           │    BASE 1134×545                        │
│ LAT 1520×100           │                                         │
│ LAT 1520×100           │    TRAV 1134×100                        │
├────────────────────────┤                                         │
│   BASE 1194×535        │TAPA│    ESTANTE 1133×540                │
│                        │100 │                                    │
│                        │×449│                                    │
├────────────────────────┤    ├─────────────────┬──────────────────┤
│ TRAV 1194×100          │    │   LATERAL 720   │  BASE 459×560    │
├────────────────────────┤    │    ×560          │                  │
│ ESTANTE 1193×540       │TRAV│                  │                  │
│                        │TAPA│                  │                  │
│                        │TRAV│                  │                  │
├────────────────────────┼────┴─────────────────┴──────────────────┤
│ R1: 1198×219           │ retazos chicos                          │
└──────────────────────────────────────────────────────────────────┘
```

**Problema visible:** Las 4 LATs de 100mm de alto en la esquina superior izquierda ocupan 400mm de alto, pero al lado hay BASE 1134×545 que ocupa 545mm. Hay un mismatch de 145mm en altura de las filas → espacio desperdiciado.

### Tablero CW2 — 13 piezas, UI dice 58.3% — 🚨 HAY OVERLAP

```
┌────────────────────────────────────────────────────────────────────┐
│ LATERAL   │ LATERAL    │ LATERAL    │ BASE       │                  │
│ 720×560   │ 720×560    │ 720×550    │ 449×545    │                  │
├───────────┼────────────┼─────┬──────┼────────────┤ R5: 192×...     │
│ LATERAL   │ LATERAL    │EST. │ EST. │ ESTANTE    │                  │
│ 720×560   │ 720×560    │BASE │ 490  │ 448×490    │ R3: 105×1820    │
│           │            │459× │      │            │                  │
│           │            │545  │      │            │                  │
├───────────┼────────────┤🔴🔴🔴│──────┤────────────┤                  │
│ LATERAL   │ LATERAL    │OVERLAP│     │  R6: 643  │                  │
│ 720×560   │ 720×550    │EST.  │     │   ×271     │ ESTANTE          │
│           │            │525×  │     │            │ 458×490          │
│           │            │ 500  │     │            │                  │
├───────────┼────────────┤      ├─────┼────────────┤                  │
│ R1: ×126  │ R2: ×136   │ R4   │ R7  │            │                  │
└────────────────────────────────────────────────────────────────────┘
```

**🔴 BUG CRÍTICO: En la fila 2, columna 3 hay "ESTANTE BASE" superpuesto.**
Se ve que ESTANTE (525×500 o similar) y BASE (459×545) se pisaron las coordenadas.
La pieza BASE 459×545 y ESTANTE 525×500 están en la MISMA posición visual → COLISIÓN.

### Tablero CW3 — 1 pieza, UI dice 58.3%

```
┌─────────────────────────────────────────────────────────────────┐
│ BASE     │                                                      │
│ 449×560  │            R1: 2283 × 1820                           │
│          │                                                      │
├──────────┤                                                      │
│ R2: 454  │           (todo vacío)                               │
│  ×1252   │                                                      │
│          │                                                      │
│          │                                                      │
│          │                                                      │
│          │                                                      │
└─────────────────────────────────────────────────────────────────┘
```

**1 pieza solitaria en un tablero entero = ~5% utilización real.**
La UI muestra "58.3%" para TODOS los tableros → también hay un bug en la UI de utilización.

---

## 4. BUGS IDENTIFICADOS (3 bugs, por orden de gravedad)

### 🚨 BUG #1 — COLISIÓN/OVERLAP en Board 2

**Gravedad: CRÍTICA** — Esto es un error funcional que hace que el resultado sea INVÁLIDO.

**Evidencia visual:** En CW Board 2, fila 2 columna 3, hay dos piezas dibujadas una encima de la otra. El texto "ESTANTE BASE" aparece superpuesto con dimensiones de ambas piezas.

**Causa probable:**
El `gapFiller.js` mueve piezas entre tableros sin validar correctamente las colisiones. 
La función `_fillGapWithStack()` usa `wouldOverlap()` que checkea AABB con kerf, pero:
- La detección de gaps (`findGaps`) agrupa por `rowKey = Math.round(p.y / 5) * 5`, lo que puede meter piezas de alturas MUY diferentes en el mismo "row" si su Y está cerca
- Cuando mueve una pieza con `rotated` flag, puede calcular mal `placedWidth/placedHeight`
- El `boardConsolidator.js` hace `greedyDrain` que también mueve piezas, pero su collision check usa `kerf` en sentido estricto — si hay un off-by-one, permite superposición

**Investigación pendiente:** Correr el optimizer completo (no solo HStrip+GapFill) con validate.js y ver si lanza warnings de colisión.

### 🔴 BUG #2 — TABLERO 3 CON 1 SOLA PIEZA (3 tableros en vez de 2)

**Gravedad: ALTA** — Lepton mete todo en 2 tableros. CutWood usa 3 y el tercero tiene UNA pieza.

**Datos del test_merge.mjs:**
```
After GapFill: 3 boards
  T1: 14 piezas, maxY=1784, remaining=43mm, util=92.5%
  T2: 15 piezas, maxY=1750, remaining=77mm, util=77.9%
  T3: 1 pieza, LAT(1520x100), util=3.0%
```

Nota: el test muestra que T3 tiene LAT 1520×100, pero la UI muestra BASE 449×560. 
Esto es porque el test usa solo HStrip+GapFill, mientras que la app usa el pipeline completo 
(que incluye boardConsolidator). El resultado final varía.

**Causa raíz:**
1. El `postProcessGapFill` absorbe piezas del último tablero solo si `lastUtil < 0.10` (línea 485 de gapFiller.js). 
   Con 1 pieza LAT(1520×100) → área = 152,000 / 5,032,500 = 3% → sí pasa el umbral.
2. PERO la absorción busca `freeH = stock.height - maxY - kerf`. T1 tiene remaining=43mm, T2 tiene 77mm.
   La pieza LAT necesita 100mm + kerf(3) = 103mm → NO CABE en ninguno.
3. El `boardConsolidator` intenta `tailRepack(last 2)` → combina T2(15 piezas)+T3(1 pieza) y 
   re-empaqueta → podría funcionar si hay espacio. Pero maxY de T2 ya es 1750mm + T3 tiene 
   pieza de 100mm. 1750+3+100=1853 > 1820 → no cabe por apilamiento simple.
4. `tryMergeBoards` re-empaqueta con HStrip → puede resultar en 1 board si el re-sort 
   es mejor, pero no está garantizado.

**El problema fundamental:** El packer INICIAL (HStrip o ColumnPack) genera layouts con 
filas demasiado gruesas que dejan muy poco espacio vertical al final. Si la pieza sobrante
es larga horizontalmente (1520mm), no hay forma de meterla en 43-77mm de espacio vertical.

### 🟡 BUG #3 — UI muestra 58.3% de utilización para TODOS los tableros

**Gravedad: MEDIA** — Bug cosmético pero confuso.

El header de los 3 tableros dice "58.3% uso" y "Desperdicio: 6.233 m²", todos iguales.
Esto es claramente incorrecto: T1 tiene 92.5%, T2 tiene 77.9%, T3 tiene 3%.

**Causa probable:** La UI está mostrando la utilización GLOBAL promedio en vez de la 
individual por tablero, o hay un bug en cómo se calcula `board.bin.getUtilization()` 
cuando los boards vienen del GapFiller (que no produce objetos `bin` genuinos).

---

## 5. ANÁLISIS DE POR QUÉ LEPTON LOGRA 2 TABLEROS Y NOSOTROS NO

### El approach de Lepton vs CutWood

**Lepton (columnar):**
- Agrupa las 3 LATERAL(720×560) en una COLUMNA de 720mm de ancho × 1680mm de alto
- Al lado pone BASE(1134×545) + ESTANTE(1133×540) = 1085mm alto → debajo cabe más
- Las piezas de 100mm de alto (LAT, TRAV, TAPA) van en los gaps horizontales al fondo
- Resultado: piezas de 500-560mm se apilan 3 en una columna de ~1700mm, dejando ~120mm 
  para piezas de 100mm

**CutWood (horizontal strip):**
- Arma FILAS por altura: todas las piezas de ~560mm van en filas de h=560
- 3 LATERAL(720) en una fila = 720+3+720+3+720 = 2166mm → caben 3 en una fila de 2740mm
- Pero eso deja solo 574mm de ancho residual → no cabe BASE (1134mm) al lado
- Entonces BASE va en su propia fila de h=545
- Las LAT/TRAV de 100mm van en su propia fila de h=100
- Resultado: fila1(560) + fila2(545) + fila3(540) + fila4(100) = 1745 → queda solo 75mm

**El gap fundamental:**
CutWood agrupa por ALTURA DE FILA → 3 filas de ~550mm = 1650mm.
Lepton agrupa por ANCHO DE COLUMNA → 3 piezas de ~560mm en columna de 720mm = 1680mm alto.

En ambos casos caben ~3 piezas grandes verticalmente. Pero Lepton es más flexible porque:
1. Las columnas tienen ancho variable → puede mezclar columna de 720mm con columna de 1134mm
2. Los gaps entre columnas se rellenan con sub-strips horizontales
3. Las piezas de 100mm entran DENTRO de la columna como strip final

CutWood necesitaría un packer que sepa hacer AMBAS estrategias (filas Y columnas) y elegir la mejor.

---

## 6. PLAN DE ACCIÓN PARA FIX

### PRIORIDAD 1: Fix el overlap (BUG #1) — BLOQUEANTE

1. Crear test que reproduzca exactamente el dataset con el pipeline COMPLETO (optimizeCuts/optimizeDeep)
2. Capturar las coordenadas exactas de todas las piezas del Board 2
3. Identificar cuáles 2 piezas se superponen
4. Trazar la cadena de llamadas que las pone ahí (¿es gapFiller? ¿boardConsolidator? ¿el packer base?)
5. Fix el bug de colisión
6. Agregar validación post-GapFill que rechace resultados con overlap

### PRIORIDAD 2: Lograr 2 tableros (BUG #2)

Dos caminos posibles:
A) **Mejorar el GapFill/Consolidator** para que absorba la pieza solitaria
   → Problema: si no hay espacio vertical (43-77mm) para una pieza de 100mm, no se puede
   → Solución: re-empaquetar TODO desde cero con un sort order diferente que deje más espacio

B) **Agregar un packer columnar** (como Lepton hace)
   → Esto es más trabajo pero es la solución correcta a largo plazo
   → El columnPacker.js actual NO es columnar — es horizontal strip con sub-columns

C) **Mejorar el re-pack del boardConsolidator** para que intente MÁS variantes 
   cuando fusiona boards (actualmente solo prueba HStrip y ColumnPack con canRotate=false)

### PRIORIDAD 3: Fix la UI de utilización (BUG #3)

Revisar cómo `buildFinalOutput` calcula la utilización por tablero cuando los boards 
vienen del GapFiller (no tienen `bin` real).

---

## 7. MÉTRICAS TARGET

| Métrica | CutWood actual | Lepton | Target CutWood |
|---------|---------------|--------|----------------|
| Tableros | 3 | 2 | **2** |
| Overlap | SÍ (Board 2) | NO | **NO** |
| Util Board 1 | ~58% (UI) / 92.5% (real) | ~92% | ≥85% |
| Util Board 2 | ~58% (UI) / 77.9% (real) | ~81% | ≥75% |
| Tablero vacío | Sí (Board 3, 1 pieza) | No | **No** |
| Desperdicio total | ~3 tableros de material | 2 tableros | **2 tableros** |

---

## 8. REPRODUCTOR EXACTO (para test)

```javascript
const RAW = [
  { n:'LATERAL',  w:720,  h:560, qty:2 },
  { n:'BASE',     w:1134, h:545, qty:1 },
  { n:'TRAV',     w:1134, h:100, qty:1 },
  { n:'ESTANTE',  w:1133, h:540, qty:1 },
  { n:'LATERAL',  w:720,  h:550, qty:2 },
  { n:'BASE',     w:1194, h:535, qty:1 },
  { n:'TRAV',     w:1194, h:100, qty:1 },
  { n:'ESTANTE',  w:1193, h:540, qty:1 },
  { n:'LATERAL',  w:720,  h:560, qty:2 },
  { n:'BASE',     w:449,  h:545, qty:1 },
  { n:'TRAV',     w:449,  h:100, qty:1 },
  { n:'ESTANTE',  w:448,  h:490, qty:1 },
  { n:'LATERAL',  w:720,  h:560, qty:2 },
  { n:'BASE',     w:459,  h:545, qty:1 },
  { n:'TRAV',     w:459,  h:100, qty:1 },
  { n:'ESTANTE',  w:458,  h:490, qty:1 },
  { n:'LAT',      w:1540, h:100, qty:2 },
  { n:'TAPA',     w:449,  h:100, qty:1 },
  { n:'BASE',     w:449,  h:560, qty:1 },
  { n:'ESTANTE',  w:525,  h:500, qty:1 },
  { n:'LAT',      w:1520, h:100, qty:2 },
  { n:'TAPA',     w:459,  h:100, qty:1 },
  { n:'BASE',     w:459,  h:560, qty:1 },
  { n:'ESTANTE',  w:535,  h:500, qty:1 },
];
const STOCK = { width:2750, height:1830, grain:'none', quantity:99 };
const OPTS  = { kerf:3, edgeTrim:5, allowRotation:true };
```

---

## 9. RESULTADOS DEL TEST COMPLETO (test_full_pipeline.mjs)

**Ejecutado: 2026-04-07 16:08**
**Algoritmo elegido:** `HStrip(T)+GapFill+Cons` (HStrip transpuesto + GapFill + Consolidator)

### Resultado: 2 tableros, 30/30 piezas colocadas, PERO 4 OVERLAPS 🚨

```
Overall utilization: 86.7%
```

### Board 1 — 17 piezas, util real=88.4%

| Pieza | Dimensión | Posición (x,y) | Esquina (right,bottom) |
|-------|-----------|----------------|----------------------|
| LAT | 1540×100 | (5, 5) | (1545, 105) |
| LAT | 1540×100 | (5, 108) | (1545, 208) |
| LAT | 1520×100 | (5, 211) | (1525, 311) |
| LAT | 1520×100 | (5, 314) | (1525, 414) |
| BASE | 1194×535 | (5, 417) | (1199, 952) |
| TRAV | 1194×100 | (5, 955) | (1199, 1055) |
| ESTANTE | 1193×540 | (5, 1058) | (1198, 1598) |
| BASE | 1134×545 | (1548, 5) | (2682, 550) |
| TRAV | 1134×100 | (1548, 553) | (2682, 653) |
| ESTANTE | 1133×540 | **(1548, 656)** | **(2681, 1196)** |
| LATERAL | 720×560 | **(1548, 1199)** | **(2268, 1759)** |
| TRAV | 100×459 | (1201, 1058) | (1301, 1517) |
| TAPA | 100×459 | (1304, 1058) | (1404, 1517) |
| TAPA | 100×449 | (1202, 417) | (1302, 866) |
| BASE | 459×560 | (2271, 1199) | (2730, 1759) |
| **BASE** | **449×560** | **(1407, 1058)** | **(1856, 1618)** |
| TRAV | 100×449 | (1305, 417) | (1405, 866) |

**🚨 OVERLAP 1:** ESTANTE(1133×540)@(1548,656→2681,1196) vs BASE(449×560)@(1407,1058→1856,1618)
→ **Overlap: 308×138 = 42,504mm²** — La BASE se mete debajo de ESTANTE en el rango x=1548-1856, y=1058-1196

**🚨 OVERLAP 2:** LATERAL(720×560)@(1548,1199→2268,1759) vs BASE(449×560)@(1407,1058→1856,1618)
→ **Overlap: 308×419 = 129,052mm²** — La BASE se mete debajo de LATERAL en el rango x=1548-1856, y=1199-1618

**CAUSA:** La pieza BASE(449×560) está en x=1407, pero las piezas de la columna derecha empiezan en x=1548. La BASE se superpone porque arranca 141mm antes (1548-1407=141) que la columna derecha. Esto fue puesto por el GapFill o Consolidator al mover la pieza sin verificar el ancho de la columna existente.

### Board 2 — 13 piezas, util real=85.0%

| Pieza | Dimensión | Posición (x,y) | Esquina (right,bottom) |
|-------|-----------|----------------|----------------------|
| LATERAL | 720×560 | (5, 5) | (725, 565) |
| LATERAL | 720×560 | (5, 568) | (725, 1128) |
| LATERAL | 720×560 | (5, 1131) | (725, 1691) |
| LATERAL | 720×560 | (728, 5) | (1448, 565) |
| LATERAL | 720×560 | (728, 568) | (1448, 1128) |
| LATERAL | 720×550 | (728, 1131) | (1448, 1681) |
| LATERAL | 720×550 | (1451, 5) | (2171, 555) |
| **ESTANTE** | **535×500** | **(1451, 558)** | **(1986, 1058)** |
| ESTANTE | 525×500 | (1451, 1061) | (1976, 1561) |
| **BASE** | **459×545** | **(1451, 568)** | **(1910, 1113)** |
| ESTANTE | 458×490 | (2174, 1322) | (2632, 1812) |
| ESTANTE | 448×490 | (1989, 558) | (2437, 1048) |
| BASE | 449×545 | (2174, 5) | (2623, 550) |

**🚨 OVERLAP 3:** ESTANTE(535×500)@(1451,558→1986,1058) vs BASE(459×545)@(1451,568→1910,1113)
→ **Overlap: 459×490 = 224,910mm²** — MISMA POSICIÓN X! La BASE está casi completamente dentro de ESTANTE

**🚨 OVERLAP 4:** ESTANTE(525×500)@(1451,1061→1976,1561) vs BASE(459×545)@(1451,568→1910,1113)
→ **Overlap: 459×52 = 23,868mm²** — El borde inferior de BASE toca el borde superior de ESTANTE

**CAUSA:** En Board 2, ESTANTE(535×500)@y=558 y BASE(459×545)@y=568 están a solo 10mm de diferencia en Y, y comparten x=1451. Es IMPOSIBLE que un gap-filler legítimo haya puesto dos piezas de 500mm y 545mm de alto en la misma posición. Esto es el GapFill o Consolidator colocando piezas en un "gap" que no existe realmente.

### ROOT CAUSE — Trazabilidad del bug

El algoritmo reportado es `HStrip(T)+GapFill+Cons`:
1. **HStrip(T)** = HorizontalStripPacker en modo transpuesto — produce N tableros iniciales
2. **+GapFill** = postProcessGapFill mueve piezas entre tableros
3. **+Cons** = boardConsolidator intenta reducir número de tableros

El overlap ocurre cuando el Consolidator (tailRepack o greedyDrain) fusiona tableros y 
mueve piezas sin validar colisiones correctamente. El `validate.js` DETECTA el problema 
(console.warn) pero **no lo RECHAZA** — el resultado inválido pasa igual a la UI.

### FIX REQUERIDO

1. `boardConsolidator.js` → `greedyDrain()` y `crossBoardSwap()` deben validar NO OVERLAP 
   antes de aceptar cualquier movimiento
2. `optimizer.js` → después de GapFill+Cons, si `validateResult` detecta overlaps, 
   **RECHAZAR** el resultado y usar el anterior (sin GapFill/Cons)
3. FIX de fondo: la lógica del packer transpuesto produce layouts donde las piezas 
   movidas por GapFill/Cons no respetan las restricciones de la grilla original

---

## 10. FIX IMPLEMENTADO Y VERIFICADO ✅ (2026-04-07 16:42)

### Cambios realizados:

**A. `validate.js` — Nuevas funciones de detección rápida**
- `hasOverlapsRaw(boards)` — check O(n²) rápido para arrays de boards raw
- `hasOverlaps(result)` — wrapper para resultados wrapped

**B. `optimizer.js` — Pipeline nuclear anti-overlap**

1. **`tryResult()` en `_runAllVariants()`**: Ahora rechaza cualquier packer que genere overlaps ANTES de entrar al ranking.

2. **`_tryPostProcess()`** nueva función: Ejecuta GapFill→Consolidator con safety gates:
   - Si GapFill introduce overlaps → retorna `null` (aborta esta variante)
   - Si Consolidator introduce overlaps → mantiene el resultado de GapFill (no aborta todo)
   - Si el resultado final tiene overlaps → retorna `null`

3. **`_tryAllVariantsWithPostProcess()`** nueva función: Fallback nuclear. Si la variante ganadora no se puede post-procesar sin overlaps, esta función:
   - Corre TODAS las combinaciones de packer × sort order × transposed
   - Post-procesa CADA UNA con GapFill+Cons
   - Filtra las que tienen overlaps
   - Devuelve la MEJOR resultado limpio

4. **`optimizeCuts()`** nueva lógica:
   ```
   best = _runAllVariants()
   pp = _tryPostProcess(best)        → si funciona, usar
   si no → allPP = _tryAllVariants() → usar la mejor limpia
   ```

### Resultado verificado:

| Métrica | Antes del fix | Después del fix | Target (=Lepton) |
|---------|--------------|-----------------|-------------------|
| Tableros | 3 (o 2 con overlap) | **2** | 2 |
| Overlaps | **4 overlaps** | **0** | 0 |
| Algoritmo | HStrip(T)+GapFill+Cons | **HStrip+GapFill+Cons** | cualquiera |
| Board 1 util | 88.4% | **92.5%** | ~92% |
| Board 2 util | 85.0% (con overlap) | **80.9%** | ~81% |
| Overall util | 86.7% | **86.7%** | ~86% |
| Piezas | 30/30 | **30/30** | 30 |

### Garantías del fix:
- **NUNCA** puede pasar un resultado con overlaps a la UI — hay 3 niveles de validación
- Si TODOS los post-processors fallan, se usa el resultado crudo del packer (que no tiene overlaps)
- El sistema siempre encuentra la MEJOR combinación packer+post-processing que sea válida
