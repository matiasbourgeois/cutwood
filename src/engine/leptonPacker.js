/**
 * Lepton-Style Horizontal Strip Packer v3.0
 *
 * NUEVO en v3.0 — "Thin-Column Packing":
 *   Piezas pequeñas (height ≤ THIN_THRESHOLD) que no califican como row-worthy
 *   NI caben como sub-col son ahora agrupadas en COLUMNAS VERTICALES (igual que
 *   Lepton Board 3), en lugar de dispersarse en mini-rows individuales.
 *
 *   Estrategia:
 *   1. Agrupar fillers por ancho similar (THIN_WIDTH_TOL = 10mm)
 *   2. Apilar verticalmente dentro de cada grupo → crear "columna virtual"
 *   3. Tratar la columna virtual como una fila-ancha de alto = H_board
 *   4. Empaquetar las columnas virtuales juntas horizontalmente
 *   Resultado: 1 corte vertical por columna + N cortes horizontales dentro
 *   → Los mismos 30 cortes de Lepton en vez de los 58 actuales
 *
 * Two-phase strategy (original v2.0):
 *   PHASE 1 — Row-worthy: grupos que ocupan ≥ ROW_MIN_FILL del ancho → filas propias
 *   PHASE 2 — Sub-column fill: fillers en el espacio residual derecho de las filas
 *
 * @module leptonPacker
 */

const ROW_MIN_FILL    = 0.20; // ≥20% board width → row-worthy
const MIN_SUBCOL_W    = 30;   // residual mínimo para abrir sub-columna
const HEIGHT_SNAP_TOL = 5;    // mm — funde alturas dentro de esta tolerancia
const HEIGHT_MIX_TOL  = 55;   // mm — fillers pueden unirse a rows con Δh ≤ esto

// ── v3.0: Thin-Column Packing constants ──────────────────────────────────────
const THIN_THRESHOLD  = 150;  // mm — piezas con height ≤ esto son candidatas a columna
const THIN_WIDTH_TOL  = 15;   // mm — piezas con ancho dentro de esta tolerancia → misma columna
const MIN_COL_ITEMS   = 2;    // mínimo de piezas para formar columna (si hay 1 sola → mini-row)
const MIN_COL_FILL    = 0.30; // columna debe llenar ≥30% del alto del tablero para valer la pena

/**
 * Paquetizador estilo Lepton v3.0 con Thin-Column Packing.
 *
 * @param {Array} expandedPieces - { id, name, width, height, canRotate, forceRotated, ... }
 * @param {Object} stock         - { width, height, quantity, grain }
 * @param {Object} options       - { kerf, edgeTrim, allowRotation }
 * @returns {{ boards, unfitted }}
 */
export function runLeptonPack(expandedPieces, stock, options = {}) {
  const { kerf = 3, edgeTrim = 0, allowRotation = true } = options;
  const W = stock.width  - edgeTrim * 2;
  const H = stock.height - edgeTrim * 2;
  const boardGrain = stock.grain || 'none';

  if (W <= 0 || H <= 0 || !expandedPieces.length) {
    return { boards: [], unfitted: [...expandedPieces] };
  }

  // ── Step 1: Orient (w >= h) + assign stable IDs ────────────────────────────
  const items = expandedPieces.map((p, idx) => {
    const canRot = allowRotation && (p.canRotate !== false);
    const doRot  = canRot && p.height > p.width;
    return {
      ...p,
      _w:  doRot ? p.height : p.width,
      _h:  doRot ? p.width  : p.height,
      _rotated: doRot,
      _sid: `${p.id || 'p'}_${idx}`,
    };
  });

  // Filter unfittable
  const unfittable = items.filter(it => it._w > W || it._h > H);
  const fittable   = items.filter(it => it._w <= W && it._h <= H);

  // ── Step 2: Group by similar height (within HEIGHT_SNAP_TOL) ─────────────
  const hGroups = new Map();
  const hKeys   = [];
  for (const it of fittable) {
    let canonKey = null;
    for (const k of hKeys) {
      if (Math.abs(it._h - k) <= HEIGHT_SNAP_TOL) { canonKey = k; break; }
    }
    if (canonKey === null) {
      hGroups.set(it._h, { pieces: [], maxH: it._h });
      hKeys.push(it._h);
      canonKey = it._h;
    }
    const grp = hGroups.get(canonKey);
    grp.pieces.push(it);
    if (it._h > grp.maxH) grp.maxH = it._h;
  }

  const hGroupsFlat = new Map();
  for (const [canonH, grp] of hGroups) {
    for (const p of grp.pieces) p._hGroup = grp.maxH;
    hGroupsFlat.set(canonH, grp.pieces);
  }

  // ── Step 3: Two-way classification: row-worthy vs thin/filler ─────────────
  //
  // v3.1 KEY CHANGE — "Sub-col First" strategy:
  //   Thin pieces (height ≤ THIN_THRESHOLD) are now kept in a separate pool
  //   but are offered to sub-column filling FIRST (Step 5).
  //   Only thin pieces that couldn't fit any row's residual are then column-packed.
  //
  //   This allows 1900×450 rows (residual=840mm) to absorb thin columns of 414mm,
  //   677mm, etc. — avoiding a dedicated 4th board for thin pieces.
  //
  const rowWorthy = new Set();

  for (const [canonH, group] of hGroupsFlat) {
    const totalW = group.reduce((s, it) => s + it._w, 0) + kerf * (group.length - 1);
    const maxW   = Math.max(...group.map(it => it._w));
    if (totalW >= ROW_MIN_FILL * W || maxW >= 0.40 * W) rowWorthy.add(canonH);
  }

  const mainPool   = new Map(); // row-worthy pieces
  const thinPool   = new Map(); // thin pieces (≤ THIN_THRESHOLD height)
  const fillerPool = new Map(); // non-row-worthy non-thin pieces

  for (const it of fittable) {
    let canonH = it._h;
    for (const k of hKeys) {
      if (Math.abs(it._h - k) <= HEIGHT_SNAP_TOL) { canonH = k; break; }
    }
    const isThin = (it._hGroup || it._h) <= THIN_THRESHOLD;
    if (rowWorthy.has(canonH))  mainPool.set(it._sid, it);
    else if (isThin)            thinPool.set(it._sid, it);
    else                        fillerPool.set(it._sid, it);
  }

  // ── Step 4: Build main rows from row-worthy pieces ─────────────────────────
  const rows = [];
  const heights = [...rowWorthy].sort((a, b) => b - a);

  for (const canonH of heights) {
    const group = hGroupsFlat.get(canonH).filter(it => mainPool.has(it._sid));
    if (!group.length) continue;
    const rowH = group[0]._hGroup || canonH;
    group.sort((a, b) => b._w - a._w);

    let rowCells = [], usedW = 0;
    for (const it of group) {
      const needed = it._w + (rowCells.length > 0 ? kerf : 0);
      if (usedW + needed <= W) {
        rowCells.push(it); usedW += needed; mainPool.delete(it._sid);
      } else {
        if (rowCells.length) rows.push({ h: rowH, usedW, cells: rowCells, subCols: [] });
        rowCells = [it]; usedW = it._w; mainPool.delete(it._sid);
      }
    }
    if (rowCells.length) rows.push({ h: rowH, usedW, cells: rowCells, subCols: [] });
  }

  // ── Step 5: Fill sub-columns with filler pieces ────────────────────────────
  {
    const rowsByResidual = [...rows].sort((a, b) => (W - b.usedW) - (W - a.usedW));
    for (const row of rowsByResidual) {
      const resW = W - row.usedW - kerf;
      if (resW < MIN_SUBCOL_W) continue;
      if (!fillerPool.size) break;

      const candidates = [...fillerPool.values()].sort((a, b) => (b._w * b._h) - (a._w * a._h));
      const sc = { x: row.usedW + kerf, w: resW, items: [], usedH: 0 };

      for (const it of candidates) {
        if (!fillerPool.has(it._sid)) continue;
        if (it._w > resW) continue;
        const freeH = row.h - sc.usedH - (sc.items.length > 0 ? kerf : 0);
        if (it._h > freeH) continue;
        sc.items.push(it);
        sc.usedH += (sc.items.length > 1 ? kerf : 0) + it._h;
        fillerPool.delete(it._sid);
      }

      if (sc.items.length > 0) {
        row.subCols.push(sc);
        row.usedW = W;
      }
    }
  }

  // ── Step 6: HEIGHT_MIX_TOL — absorb remaining filler into existing rows ────
  for (const it of [...fillerPool.values()]) {
    let placed = false;
    for (const row of rows) {
      const hDiff = row.h - it._h;
      if (hDiff < 0 || hDiff > HEIGHT_MIX_TOL) continue;
      const spaceLeft = W - row.usedW - (row.subCols.length > 0 ? 0 : kerf);
      if (it._w > spaceLeft) continue;
      row.cells.push(it);
      row.usedW += kerf + it._w;
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

  // ── Step 6b: THIN-COLUMN PACKING — remaining thin pieces → vertical columns ─
  //
  // Any thin pieces NOT absorbed by sub-cols in Step 5 are now stacked into
  // vertical columns and converted into a thinSuperRow.
  //
  const thinColumns = [];

  if (thinPool.size > 0) {
    // Group remaining thin pieces by similar width
    const widthBuckets = new Map();
    for (const it of [...thinPool.values()].sort((a, b) => b._w - a._w)) {
      let found = false;
      for (const [bw] of widthBuckets) {
        if (Math.abs(bw - it._w) <= THIN_WIDTH_TOL) {
          widthBuckets.get(bw).push(it); found = true; break;
        }
      }
      if (!found) widthBuckets.set(it._w, [it]);
    }

    for (const [, items] of widthBuckets) {
      items.sort((a, b) => b._h - a._h);
      const colW = Math.max(...items.map(it => it._w));
      let colItems = [], colH = 0;

      for (const it of items) {
        const needed = it._h + (colItems.length > 0 ? kerf : 0);
        if (colH + needed <= H) {
          colItems.push(it); colH += needed;
        } else {
          if (colItems.length > 0) thinColumns.push({ colW, items: colItems, totalH: colH });
          colItems = [it]; colH = it._h;
        }
      }
      if (colItems.length > 0) thinColumns.push({ colW, items: colItems, totalH: colH });
    }
  }

  // Convert thinColumns → superRow(s) — placed last on each board
  if (thinColumns.length > 0) {
    const buildSuperRow = (cols) => {
      const sr = { h: H, usedW: 0, cells: [], subCols: [], _isThinSuperRow: true };
      let cx = 0;
      for (const col of cols) {
        sr.subCols.push({ x: cx, w: col.colW, items: col.items, usedH: col.totalH, _isThinCol: true });
        cx += col.colW + kerf;
        sr.usedW += col.colW + kerf;
      }
      sr.usedW = Math.max(0, sr.usedW - kerf);
      return sr;
    };

    const totalThinW = thinColumns.reduce((s, c) => s + c.colW, 0) + kerf * (thinColumns.length - 1);
    if (totalThinW <= W) {
      rows.push(buildSuperRow(thinColumns));
    } else {
      let batch = [], batchW = 0;
      for (const col of thinColumns) {
        const needed = col.colW + (batch.length > 0 ? kerf : 0);
        if (batchW + needed > W) { rows.push(buildSuperRow(batch)); batch = []; batchW = 0; }
        batch.push(col); batchW += needed;
      }
      if (batch.length > 0) rows.push(buildSuperRow(batch));
    }
  }


  // ── Step 7: Sort rows tallest first ───────────────────────────────────────
  // ThinSuperRows siempre al FINAL (son las columnas de piezas thin)
  rows.sort((a, b) => {
    if (a._isThinSuperRow && !b._isThinSuperRow) return 1;
    if (!a._isThinSuperRow && b._isThinSuperRow) return -1;
    return b.h - a.h;
  });

  // ── Step 8: Pack rows onto boards (First-Fit Decreasing Height) ────────────
  const boards  = [];
  let rowsLeft  = [...rows];

  while (rowsLeft.length > 0) {
    const boardRows = [];
    let usedH = 0;
    const used = new Set();

    for (let i = 0; i < rowsLeft.length; i++) {
      const row = rowsLeft[i];

      if (row._isThinSuperRow) {
        const avail = H - usedH - (usedH > 0 ? kerf : 0);
        if (avail < 50) continue; // not enough room → try next board

        // Re-stack sub-col items to fit within avail (columns may have been built for full H)
        const fittingSubCols = [];
        const overflowCols   = [];

        for (const sc of row.subCols) {
          const fitItems  = [];
          const overItems = [];
          let colH = 0;
          for (const item of sc.items) {
            const needed = item._h + (fitItems.length > 0 ? kerf : 0);
            if (colH + needed <= avail) { fitItems.push(item); colH += needed; }
            else { overItems.push(item); }
          }
          if (fitItems.length > 0)  fittingSubCols.push({ ...sc, items: fitItems, usedH: colH });
          if (overItems.length > 0) overflowCols.push({ ...sc, items: overItems, usedH: overItems.reduce((s, it) => s + it._h, 0) + kerf * (overItems.length - 1) });
        }

        if (fittingSubCols.length > 0) {
          boardRows.push({ ...row, h: avail, boardY: usedH > 0 ? usedH + kerf : 0, subCols: fittingSubCols });
          usedH = H;
          used.add(i);

          // Re-queue overflow items as a new thinSuperRow for the next board
          if (overflowCols.length > 0) {
            let cx = 0, srW = 0;
            const newSR = { h: H, usedW: 0, cells: [], subCols: [], _isThinSuperRow: true };
            for (const oc of overflowCols) {
              newSR.subCols.push({ ...oc, x: cx });
              cx += oc.w + kerf; srW += oc.w + kerf;
            }
            newSR.usedW = Math.max(0, srW - kerf);
            rowsLeft.push(newSR); // add to end for next board
          }
        }
        continue;
      }

      const needed = row.h + (usedH > 0 ? kerf : 0);
      if (usedH + needed <= H) {
        boardRows.push({ ...row, boardY: usedH > 0 ? usedH + kerf : 0 });
        usedH += needed;
        used.add(i);
      }
    }

    if (!boardRows.length) break;
    rowsLeft = rowsLeft.filter((_, i) => !used.has(i));

    const boardPieces = [];
    for (const row of boardRows) {
      const rowY = edgeTrim + row.boardY;
      let   curX = edgeTrim;

      // Main cells (piezas de la fila principal)
      for (const item of row.cells) {
        const finalRotated = item._rotated !== (item.forceRotated || false);
        boardPieces.push({
          ...item,
          x: curX, y: rowY,
          placedWidth: item._w, placedHeight: item._h,
          rotated: finalRotated,
        });
        curX += item._w + kerf;
      }

      // Sub-columns (incluye thin columns)
      for (const sc of row.subCols) {
        const subX   = edgeTrim + sc.x;
        let   subY   = rowY;
        // For thin super rows, limit to available height to avoid overflow
        const maxY   = edgeTrim + (row._isThinSuperRow ? row.boardY + row.h : row.boardY + row.h);
        const limit  = stock.height - edgeTrim;

        for (const item of sc.items) {
          if (subY + item._h > limit + 1) break; // skip if would overflow board
          const finalRotated = item._rotated !== (item.forceRotated || false);
          boardPieces.push({
            ...item,
            x: subX, y: subY,
            placedWidth: item._w, placedHeight: item._h,
            rotated: finalRotated,
          });
          subY += item._h + kerf;
        }
      }
    }

    boards.push({
      stockWidth:  stock.width,
      stockHeight: stock.height,
      boardGrain,
      pieces:      boardPieces,
      usedH,
      strips: boardRows,
    });
  }

  return { boards, unfitted: [...unfittable] };
}
