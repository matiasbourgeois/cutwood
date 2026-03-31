/**
 * Lepton-Style Horizontal Strip Packer v2.0
 *
 * Two-phase strategy matching Lepton software:
 *
 * PHASE 1 — "Row-worthy" classification:
 *   A height group is "row-worthy" if sum(widths) >= ROW_MIN_FILL × boardW.
 *   These form the main horizontal rows.
 *
 * PHASE 2 — Sub-column fill ("filler" pieces):
 *   Singletons and small groups fill the RIGHT residual of main rows.
 *   Packing order: rows sorted by residual width DESC (most room first).
 *   Within each sub-col: pieces stacked vertically, tallest first.
 *
 * PHASE 3 — Overflow:
 *   Pieces that couldn't fit any sub-col form their own mini-rows.
 *   These are then mixed into existing bands using HEIGHT_CLUSTER_TOL=50mm.
 *
 * Result: clean horizontal guillotine layout with minimal cuts.
 *
 * Mathematical note for the standard 16-piece test case:
 *   - All pieces CAN fit in 1 board (81% utilization)
 *   - Strict same-height rows would need 1914mm > 1820mm → impossible
 *   - Mixing P4(250)+P10(200) in 1 band of 250mm is REQUIRED to fit
 *   - P13+P15+P5×2 → sub-col of h=600 row (fits: 573mm ≤ 600mm) ✅
 *
 * @module leptonPacker
 */

const ROW_MIN_FILL    = 0.20; // height group needs ≥20% board width to be row-worthy
                               // Lowered from 0.30 so small groups (e.g. 6× 109mm = 660mm on 2750-wide
                               // board = 24%) form their own clean row instead of being dispersed
const MIN_SUBCOL_W    = 30;   // minimum residual to open a sub-column
const HEIGHT_SNAP_TOL = 5;    // mm — fuse height groups within this tolerance
                               // (e.g. 333mm and 335mm → same row, like Lepton Board 2)
const HEIGHT_MIX_TOL  = 55;   // mm — overflow fillers can join rows within this Δh
                               // (P13 h=190 joins h=200 rows: diff=10 ✅)
                               // (P4 h=250 joins h=200 rows: diff=50 ✅ — the Lepton compromise)

/**
 * Paquetizador estilo Lepton.
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
  // Pieces with nearly identical heights (e.g. 333 and 335) are merged into one
  // group, keyed by the FIRST height encountered within the tolerance band.
  // Row height is then set to the MAX of all heights in that group so every
  // piece fits without overflow. This replicates Lepton Board 2's ultra-dense
  // same-row packing of 332×700 and 335×385/744 pieces.
  const hGroups = new Map();
  const hKeys   = []; // ordered list of canonical heights already seen
  for (const it of fittable) {
    let canonKey = null;
    for (const k of hKeys) {
      if (Math.abs(it._h - k) <= HEIGHT_SNAP_TOL) {
        canonKey = k;
        break;
      }
    }
    if (canonKey === null) {
      // New canonical height — create new group
      hGroups.set(it._h, { pieces: [], maxH: it._h });
      hKeys.push(it._h);
      canonKey = it._h;
    }
    const grp = hGroups.get(canonKey);
    grp.pieces.push(it);
    if (it._h > grp.maxH) grp.maxH = it._h;
  }
  // Rewrite hGroups to be a flat Map<canonH, Array<piece>> for compatibility,
  // but store resolved row-height in each piece's _hGroup property.
  const hGroupsFlat = new Map();
  for (const [canonH, grp] of hGroups) {
    // Stamp each piece with the resolved row height (max of the group)
    for (const p of grp.pieces) p._hGroup = grp.maxH;
    hGroupsFlat.set(canonH, grp.pieces);
  }

  // ── Step 3: Classify as row-worthy vs filler ───────────────────────────────
  // A group is row-worthy if total width >= ROW_MIN_FILL * W
  // Also row-worthy if any single piece width >= 40% of W (dominant piece)
  const rowWorthy = new Set();
  for (const [canonH, group] of hGroupsFlat) {
    const totalW = group.reduce((s, it) => s + it._w, 0) + kerf * (group.length - 1);
    const maxW   = Math.max(...group.map(it => it._w));
    if (totalW >= ROW_MIN_FILL * W || maxW >= 0.40 * W) rowWorthy.add(canonH);
  }

  const mainPool   = new Map(); // row-worthy pieces
  const fillerPool = new Map(); // filler pieces

  for (const it of fittable) {
    // canonH is the group key — look it up from hGroupsFlat
    let canonH = it._h;
    for (const k of hKeys) {
      if (Math.abs(it._h - k) <= HEIGHT_SNAP_TOL) { canonH = k; break; }
    }
    if (rowWorthy.has(canonH)) mainPool.set(it._sid, it);
    else                        fillerPool.set(it._sid, it);
  }

  // ── Step 4: Build main rows from row-worthy pieces ─────────────────────────
  // Heights sorted desc → tallest rows first
  // NOTE: row height = _hGroup (max of the fused height group), NOT the
  // individual piece's _h, so all pieces in the group fit without overflow.
  const rows = [];
  const heights = [...rowWorthy].sort((a, b) => b - a);

  for (const canonH of heights) {
    const group = hGroupsFlat.get(canonH).filter(it => mainPool.has(it._sid));
    if (!group.length) continue;
    // Resolved row height = max _h across the fused group (already in _hGroup)
    const rowH = group[0]._hGroup || canonH;
    group.sort((a, b) => b._w - a._w); // widest first within same height

    let rowCells = [], usedW = 0;
    for (const it of group) {
      const needed = it._w + (rowCells.length > 0 ? kerf : 0);
      if (usedW + needed <= W) {
        rowCells.push(it); usedW += needed; mainPool.delete(it._sid);
      } else {
        // overflow → start new row for this group
        if (rowCells.length) rows.push({ h: rowH, usedW, cells: rowCells, subCols: [] });
        rowCells = [it]; usedW = it._w; mainPool.delete(it._sid);
      }
    }
    if (rowCells.length) rows.push({ h: rowH, usedW, cells: rowCells, subCols: [] });
  }

  // ── Step 5: Fill sub-columns with filler pieces ────────────────────────────
  // Sort rows by residual desc (most room first)
  const byResidual = () => [...rows].sort((a, b) => (W - b.usedW) - (W - a.usedW));
  const sortedFill = () => [...fillerPool.values()].sort((a, b) => (b._w * b._h) - (a._w * a._h));

  let changed = true;
  while (changed && fillerPool.size > 0) {
    changed = false;
    for (const row of byResidual()) {
      if (!fillerPool.size) break;
      const resW = W - row.usedW - kerf;
      if (resW < MIN_SUBCOL_W) continue;

      const sc = { x: row.usedW + kerf, w: resW, items: [], usedH: 0 };
      for (const it of sortedFill()) {
        if (!fillerPool.has(it._sid)) continue;
        if (it._w > resW) continue;
        const freeH = row.h - sc.usedH - (sc.items.length > 0 ? kerf : 0);
        if (it._h > freeH) continue;
        sc.items.push(it);
        sc.usedH += (sc.items.length > 1 ? kerf : 0) + it._h;
        fillerPool.delete(it._sid);
        changed = true;
      }
      if (sc.items.length > 0) {
        row.subCols.push(sc);
        row.usedW = W; // mark fully used to avoid double sub-col
      }
    }
  }

  // ── Step 6: Handle remaining fillers ──────────────────────────────────────
  // Try to absorb into existing rows using HEIGHT_MIX_TOL (height mixing)
  // This is the "Lepton compromise" for pieces that can't fit as sub-col
  for (const it of [...fillerPool.values()]) {
    let placed = false;

    // Try joining an existing row's main cells (allow mixed heights up to TOL)
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

    // Last resort: own mini-row
    if (!placed) {
      rows.push({ h: it._h, usedW: it._w, cells: [it], subCols: [] });
      fillerPool.delete(it._sid);
    }
  }

  // ── Step 7: Sort rows tallest first ───────────────────────────────────────
  rows.sort((a, b) => b.h - a.h);

  // ── Step 8: Pack rows onto boards (First-Fit Decreasing Height) ────────────
  const boards  = [];
  let rowsLeft  = [...rows];

  while (rowsLeft.length > 0) {
    const boardRows = [];
    let usedH = 0;
    const used = new Set();

    for (let i = 0; i < rowsLeft.length; i++) {
      const row    = rowsLeft[i];
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

      for (const sc of row.subCols) {
        const subX = edgeTrim + sc.x;
        let   subY = rowY;
        for (const item of sc.items) {
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
      strips: boardRows, // cut-sequence compatibility
    });
  }

  return { boards, unfitted: [...unfittable] };
}
