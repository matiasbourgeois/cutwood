/**
 * CutWood Optimizer v6.0 — Unified Pipeline Architecture
 *
 * Both optimization modes use the same pipeline:
 *   Input → Expand → [Pack] → Compact → GapFill → Merge → Validate → Output
 *
 * Pack stage uses HStrip + ColumnPack (formerly "Lepton") with variants:
 *   - Normal orientation + Transposed orientation
 *   - Single-pass and Two-Pass (thin piece segregation)
 *   - Permutation search (deep mode only)
 *
 * Differences between modes:
 *   min-cuts:         HStrip-focused, fewer permutations, operator-friendly layouts
 *   max-utilization:  More permutation search, rotation-aware scoring, aggressive gap-fill
 *
 * v6.0 changes:
 *   - Removed dead algorithms: Guillotine, MaxRects, Skyline, StripPacker
 *   - Unified min-cuts and max-utilization into same pipeline
 *   - Added collision validation via validate.js
 *   - Renamed LeptonPacker → ColumnPacker
 *   - Extracted duplicated logic into shared helpers
 */

import { runHorizontalStripPack } from './horizontalStripPacker.js';
import { runColumnPack } from './columnPacker.js';
import { postProcessGapFill } from './gapFiller.js';
import { validateResult } from './validate.js';

// ── Sort orders ─────────────────────────────────────────────────────────────

const SORT_ORDERS = [
  'area-desc',
  'area-asc',
  'perimeter-desc',
  'height-desc',
  'width-desc',
  'max-side-desc',
  'diff-desc',
  'group-area-desc',
];

function getSortComparator(order) {
  switch (order) {
    case 'area-asc':
      return (a, b) => (a.width * a.height) - (b.width * b.height);
    case 'perimeter-desc':
      return (a, b) => (2*(b.width + b.height)) - (2*(a.width + a.height));
    case 'height-desc':
      return (a, b) => b.height - a.height;
    case 'width-desc':
      return (a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height);
    case 'max-side-desc':
      return (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height);
    case 'diff-desc':
      return (a, b) => Math.abs(b.width - b.height) - Math.abs(a.width - a.height);
    case 'group-area-desc': {
      return (a, b) => {
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        const keyA = `${Math.min(a.width, a.height)}_${Math.max(a.width, a.height)}`;
        const keyB = `${Math.min(b.width, b.height)}_${Math.max(b.width, b.height)}`;
        if (keyA === keyB) return areaB - areaA;
        return areaB - areaA;
      };
    }
    case 'area-desc':
    default:
      return (a, b) => (b.width * b.height) - (a.width * a.height);
  }
}

function applySortOrder(arr, order) {
  if (order !== 'group-area-desc') {
    return [...arr].sort(getSortComparator(order));
  }
  const groupMap = new Map();
  for (const p of arr) {
    const key = `${Math.min(p.width, p.height)}_${Math.max(p.width, p.height)}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(p);
  }
  const sortedGroups = [...groupMap.values()].sort(
    (ga, gb) => (gb[0].width * gb[0].height) - (ga[0].width * ga[0].height)
  );
  return sortedGroups.flatMap(g =>
    g.sort((a, b) => (b.width * b.height) - (a.width * a.height))
  );
}


// ── Shared utilities ────────────────────────────────────────────────────────

/** Mulberry32 — fast, high-quality seeded PRNG. Same seed → same sequence. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


// ── Scoring (unified for both modes) ────────────────────────────────────────

const BOARD_COST = 1000;
const UNFIT_COST = 100000;
const HOMO_BONUS = 8;

/** Count homogeneous rows (all pieces in a row have same height). */
function _countHomoRows(result) {
  if (!result?.boards) return 0;
  let homoRows = 0;
  for (const b of result.boards) {
    const rowMap = new Map();
    for (const p of b.pieces) {
      const rowKey = Math.round((p.y ?? 0) / 5) * 5;
      if (!rowMap.has(rowKey)) rowMap.set(rowKey, new Set());
      rowMap.get(rowKey).add(p.placedHeight);
    }
    for (const heights of rowMap.values()) {
      if (heights.size === 1) homoRows++;
    }
  }
  return homoRows;
}

/** Combined score for min-cuts mode (lower = better). */
function combinedScore(r) {
  if (!r) return Infinity;
  const boards = r.boardCount ?? r.boards?.length ?? 999;
  const unfit = r.unfitted?.length ?? 0;
  const homo = _countHomoRows(r);
  return boards * BOARD_COST + unfit * UNFIT_COST - homo * HOMO_BONUS;
}

/** Pick the result with a lower combined score. */
function pickBetter(a, b) {
  if (!a) return b;
  if (!b) return a;
  const sa = combinedScore(a), sb = combinedScore(b);
  if (sa !== sb) return sa < sb ? a : b;
  const a2p = a._algoName?.includes('2P') ?? false;
  const b2p = b._algoName?.includes('2P') ?? false;
  if (a2p !== b2p) return a2p ? a : b;
  return (a.utilization || 0) >= (b.utilization || 0) ? a : b;
}


// ── Wrap/Untranspose helpers ────────────────────────────────────────────────

/** Wrap a strip-style result into the standard raw-result format. */
function _wrapStripResult(stripResult, stock, boardGrain) {
  const placedArea = stripResult.boards.reduce((s,b) => s + b.pieces.reduce((a,p) => a + p.placedWidth * p.placedHeight, 0), 0);
  const stockArea  = stripResult.boards.reduce((s,b) => s + b.stockWidth * b.stockHeight, 0);
  const util = stockArea > 0 ? (placedArea / stockArea) * 100 : 0;
  return {
    boards: stripResult.boards.map(b => ({
      bin: { freeRects: [], getUtilization: () => util, getWasteArea: () => stockArea - placedArea },
      stockWidth: b.stockWidth, stockHeight: b.stockHeight,
      boardGrain: b.boardGrain || boardGrain, pieces: b.pieces,
    })),
    unfitted: stripResult.unfitted,
    consumedOffcutIds: [],
    boardCount: stripResult.boards.length,
    utilization: util,
    totalStockArea: stockArea,
  };
}

/** Convert a transposed packing result back to real board coordinates. */
function _untransposeResult(wrappedResult, realStockW, realStockH) {
  if (!wrappedResult || !wrappedResult.boards) return null;
  return {
    ...wrappedResult,
    boards: wrappedResult.boards.map(b => ({
      ...b,
      stockWidth: realStockW,
      stockHeight: realStockH,
      pieces: b.pieces.map(p => ({
        ...p,
        width:        p._origWidth  !== undefined ? p._origWidth  : p.placedHeight,
        height:       p._origHeight !== undefined ? p._origHeight : p.placedWidth,
        _origWidth:   undefined,
        _origHeight:  undefined,
        x:            p.y,
        y:            p.x,
        placedWidth:  p.placedHeight,
        placedHeight: p.placedWidth,
      })),
    })),
  };
}


// ── Two-Pass HStrip (extracted helper) ──────────────────────────────────────

const MIN_THIN_DIM = 135;

/** Run HStrip in two passes: large pieces first, then backfill thin pieces. */
function _runTwoPassHStrip(expanded, stock, options) {
  const largePieces = expanded.filter(p => Math.min(p.width, p.height) >= MIN_THIN_DIM).map(p => ({ ...p }));
  const thinPieces  = expanded.filter(p => Math.min(p.width, p.height) <  MIN_THIN_DIM).map(p => ({ ...p }));

  if (largePieces.length === 0 || thinPieces.length === 0) return null;

  const r1 = runHorizontalStripPack(largePieces, stock, options);
  const r2 = runHorizontalStripPack(thinPieces,  stock, options);
  const eT = options.edgeTrim || 0;
  const k  = options.kerf || 3;
  const maxH = stock.height - eT * 2;

  const mergedBoards = r1.boards.map(b => ({ ...b, pieces: [...b.pieces] }));
  const lastBoard = mergedBoards[mergedBoards.length - 1];
  let lastMaxY = lastBoard.pieces.reduce((m, p) => Math.max(m, p.y + p.placedHeight), eT);

  const overflow = [];
  for (const tb of r2.boards) {
    const thinMaxY = tb.pieces.reduce((m, p) => Math.max(m, p.y + p.placedHeight), eT);
    const thinH = thinMaxY - eT;
    if (lastMaxY + k + thinH <= maxH + eT) {
      const yShift = lastMaxY + k - eT;
      for (const p of tb.pieces) lastBoard.pieces.push({ ...p, y: p.y + yShift });
      lastMaxY += k + thinH;
    } else {
      overflow.push(tb);
    }
  }

  mergedBoards.push(...overflow);
  return { boards: mergedBoards, unfitted: [...r1.unfitted, ...r2.unfitted] };
}


// ── Transposed variant runner ───────────────────────────────────────────────

/**
 * Run a packer function with transposed board dimensions.
 * Pre-swaps each piece's width↔height and sets canRotate:false.
 */
function _runTransposed(packer, expanded, stock, options) {
  const tPieces = expanded.map(p => ({
    ...p,
    _origWidth:  p.width,
    _origHeight: p.height,
    width:  p.canRotate !== false ? p.height : p.width,
    height: p.canRotate !== false ? p.width  : p.height,
    canRotate: false,
  }));
  const tStock = { ...stock, width: stock.height, height: stock.width };

  try {
    const r = packer(tPieces.map(p => ({ ...p })), tStock, options);
    const w = _wrapStripResult(r, tStock, stock.grain || 'none');
    const result = _untransposeResult(w, stock.width, stock.height);
    return result;
  } catch (e) {
    return null;
  }
}


// ── Run all standard variants ───────────────────────────────────────────────

/**
 * Run all standard packing variants and return the best result.
 * Used by both optimizeCuts (fast) and optimizeDeep.
 */
function _runAllVariants(expanded, stock, options, boardGrain) {
  let best = null;

  const tryResult = (r, name) => {
    if (!r) return;
    r._algoName = name;
    best = pickBetter(best, r);
  };

  // A) ColumnPack normal
  try {
    const r = runColumnPack(expanded.map(p => ({ ...p })), stock, options);
    tryResult(_wrapStripResult(r, stock, boardGrain), 'ColumnPack');
  } catch (e) { /* skip */ }

  // B) HStrip normal
  const hResult = runHorizontalStripPack(expanded.map(p => ({ ...p })), stock, options);
  tryResult(_wrapStripResult(hResult, stock, boardGrain), 'HStrip');

  // C) Two-Pass HStrip
  try {
    const r = _runTwoPassHStrip(expanded, stock, options);
    if (r) tryResult(_wrapStripResult(r, stock, boardGrain), 'HStrip-2P');
  } catch (e) { /* skip */ }

  // Transposed variants (skip for square or grain-constrained boards)
  const isSquare = stock.width === stock.height;
  const hasGrain = boardGrain && boardGrain !== 'none';

  if (!isSquare && !hasGrain) {
    // D) ColumnPack transposed
    const cpT = _runTransposed(runColumnPack, expanded, stock, options);
    if (cpT) tryResult(cpT, 'ColumnPack (T)');

    // E) HStrip transposed
    const hT = _runTransposed(runHorizontalStripPack, expanded, stock, options);
    if (hT) tryResult(hT, 'HStrip (T)');

    // F) Two-Pass HStrip transposed
    try {
      const tPieces = expanded.map(p => ({
        ...p, _origWidth: p.width, _origHeight: p.height,
        width: p.canRotate !== false ? p.height : p.width,
        height: p.canRotate !== false ? p.width : p.height,
        canRotate: false,
      }));
      const tStock = { ...stock, width: stock.height, height: stock.width };
      const r = _runTwoPassHStrip(tPieces, tStock, options);
      if (r) {
        const w = _wrapStripResult(r, tStock, boardGrain);
        const ut = _untransposeResult(w, stock.width, stock.height);
        if (ut) tryResult(ut, 'HStrip-2P (T)');
      }
    } catch (e) { /* skip */ }
  }

  return best;
}


// ── Piece expansion ─────────────────────────────────────────────────────────

function expandPieces(pieces, boardGrain) {
  const expanded = [];
  for (const piece of pieces) {
    const qty = Math.max(0, piece.quantity ?? 1);
    if (qty === 0) continue;
    const pieceGrain = piece.grain || 'none';
    let canRotate = true;
    let actualWidth = piece.width;
    let actualHeight = piece.height;
    let forceRotated = false;

    if (pieceGrain !== 'none' && boardGrain !== 'none') {
      if (pieceGrain !== boardGrain) {
        actualWidth = piece.height;
        actualHeight = piece.width;
        forceRotated = true;
      }
      canRotate = false;
    } else if (pieceGrain !== 'none') {
      canRotate = false;
    }

    for (let i = 0; i < qty; i++) {
      expanded.push({
        id: piece.id, name: piece.name,
        width: actualWidth, height: actualHeight,
        originalWidth: piece.width, originalHeight: piece.height,
        grain: pieceGrain, canRotate, forceRotated,
        originalIndex: pieces.indexOf(piece), copyIndex: i,
      });
    }
  }
  return expanded;
}


// ── Free rects / Retazos computation ────────────────────────────────────────

function computeFreeRectsFromPlacements(stockW, stockH, placedPieces, kerfMm, edgeTrimMm) {
  let free = [{ x: 0, y: 0, width: stockW, height: stockH }];
  for (const p of placedPieces) {
    const px = Math.max(0, p.x - edgeTrimMm);
    const py = Math.max(0, p.y - edgeTrimMm);
    const pw = p.placedWidth  + kerfMm;
    const ph = p.placedHeight + kerfMm;
    const nextFree = [];
    for (const r of free) {
      const noOverlap = px >= r.x + r.width || px + pw <= r.x || py >= r.y + r.height || py + ph <= r.y;
      if (noOverlap) { nextFree.push(r); continue; }
      if (px > r.x)             nextFree.push({ x: r.x,   y: r.y,   width: px - r.x,                                                  height: r.height });
      if (px+pw < r.x+r.width)  nextFree.push({ x: px+pw, y: r.y,   width: (r.x+r.width)-(px+pw),                                    height: r.height });
      if (py > r.y)             nextFree.push({ x: Math.max(r.x,px), y: r.y,   width: Math.min(r.x+r.width,px+pw)-Math.max(r.x,px), height: py-r.y });
      if (py+ph < r.y+r.height) nextFree.push({ x: Math.max(r.x,px), y: py+ph, width: Math.min(r.x+r.width,px+pw)-Math.max(r.x,px), height: (r.y+r.height)-(py+ph) });
    }
    free = nextFree.filter(r => r.width > 0 && r.height > 0);
  }
  return free;
}

function computeRetazosFromCutSequence(stockW, stockH, pieces, cutSequence, kerf, minSize) {
  if (!cutSequence || cutSequence.length === 0) return [];

  let panels = [{ left: 0, right: stockW, top: 0, bottom: stockH }];

  for (const cut of cutSequence) {
    const cr  = cut.region;
    const pos = cut.position;
    const type = cut.type;
    const TOLERANCE = 2;

    let bestIdx  = -1;
    let bestArea = Infinity;
    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      if (
        p.left   <= cr.left   + TOLERANCE &&
        p.right  >= cr.right  - TOLERANCE &&
        p.top    <= cr.top    + TOLERANCE &&
        p.bottom >= cr.bottom - TOLERANCE
      ) {
        const area = (p.right - p.left) * (p.bottom - p.top);
        if (area < bestArea) { bestArea = area; bestIdx = i; }
      }
    }

    if (bestIdx < 0) continue;

    const panel = panels[bestIdx];
    panels.splice(bestIdx, 1);

    if (type === 'horizontal') {
      if (pos > panel.top && pos < panel.bottom) {
        panels.push({ left: panel.left, right: panel.right, top: panel.top,    bottom: pos      });
        if (pos + kerf < panel.bottom)
          panels.push({ left: panel.left, right: panel.right, top: pos + kerf, bottom: panel.bottom });
      } else {
        panels.push(panel);
      }
    } else {
      if (pos > panel.left && pos < panel.right) {
        panels.push({ left: panel.left, right: pos,         top: panel.top, bottom: panel.bottom });
        if (pos + kerf < panel.right)
          panels.push({ left: pos + kerf, right: panel.right, top: panel.top, bottom: panel.bottom });
      } else {
        panels.push(panel);
      }
    }
  }

  const retazos = [];
  for (const panel of panels) {
    const w = Math.round(panel.right  - panel.left);
    const h = Math.round(panel.bottom - panel.top);
    if (w < minSize || h < minSize) continue;

    const hasPiece = pieces.some(p => {
      if (!p.placedWidth || !p.placedHeight) return false;
      return p.x          < panel.right  &&
             p.x + p.placedWidth  > panel.left  &&
             p.y          < panel.bottom &&
             p.y + p.placedHeight > panel.top;
    });

    if (!hasPiece) {
      retazos.push({ x: Math.round(panel.left), y: Math.round(panel.top), width: w, height: h });
    }
  }

  return retazos;
}


// ── Cut sequence generation ─────────────────────────────────────────────────

function generateHierarchicalCutSequence(board, kerf, edgeTrim, offcuts = []) {
  const cuts = [];
  let cutNumber = 1;
  const pieces = board.pieces;
  if (!pieces.length) return cuts;

  const MAX_DEPTH = 40;
  const MIN_CUT_REGION = 50;

  const allItems = [
    ...pieces.map((p, i) => ({ ...p, _idx: i, _isOffcut: false })),
    ...offcuts.map((o, i) => ({
      x: o.x, y: o.y,
      placedWidth: o.width, placedHeight: o.height,
      _idx: pieces.length + i, _isOffcut: true,
      name: `Retazo ${o.width}×${o.height}`,
    })),
  ];

  function getPiecesInRegion(region) {
    const rp = [];
    const rpIdx = [];
    for (let i = 0; i < allItems.length; i++) {
      const p = allItems[i];
      const pr = p.x + p.placedWidth, pb = p.y + p.placedHeight;
      if (pr <= region.left || p.x >= region.right) continue;
      if (pb <= region.top || p.y >= region.bottom) continue;
      rp.push(p);
      rpIdx.push(p._idx);
    }
    return { rp, rpIdx };
  }

  function splitRegion(region, type, pos) {
    if (type === 'vertical') {
      return [
        { left: region.left, right: pos, top: region.top, bottom: region.bottom },
        { left: pos + kerf, right: region.right, top: region.top, bottom: region.bottom },
      ].filter(r => r.right > r.left);
    } else {
      return [
        { left: region.left, right: region.right, top: region.top, bottom: pos },
        { left: region.left, right: region.right, top: pos + kerf, bottom: region.bottom },
      ].filter(r => r.bottom > r.top);
    }
  }

  function regionW(r) { return r.right - r.left; }
  function regionH(r) { return r.bottom - r.top; }

  function findCutPositions(region, rp) {
    const positions = [];
    const seen = new Set();
    for (const p of rp) {
      const edges = [
        { type: 'vertical', pos: p.x + p.placedWidth },
        { type: 'horizontal', pos: p.y + p.placedHeight },
        { type: 'vertical', pos: p.x },
        { type: 'horizontal', pos: p.y },
      ];
      for (const { type, pos } of edges) {
        if (type === 'vertical' && (pos <= region.left || pos >= region.right)) continue;
        if (type === 'horizontal' && (pos <= region.top || pos >= region.bottom)) continue;
        const key = `${type}_${pos}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let valid = true;
        for (const q of rp) {
          if (type === 'vertical') {
            if (q.x < pos && q.x + q.placedWidth > pos + kerf) { valid = false; break; }
          } else {
            if (q.y < pos && q.y + q.placedHeight > pos + kerf) { valid = false; break; }
          }
        }
        if (!valid) continue;
        if (type === 'vertical') {
          const leftW = pos - region.left;
          const rightW = region.right - pos - kerf;
          if (leftW > 0 && leftW < MIN_CUT_REGION) continue;
          if (rightW > 0 && rightW < MIN_CUT_REGION) continue;
        } else {
          const topH = pos - region.top;
          const bottomH = region.bottom - pos - kerf;
          if (topH > 0 && topH < MIN_CUT_REGION) continue;
          if (bottomH > 0 && bottomH < MIN_CUT_REGION) continue;
        }
        positions.push({ type, pos });
      }
    }

    const vRaw = positions.filter(p => p.type === 'vertical').sort((a, b) => a.pos - b.pos);
    const hRaw = positions.filter(p => p.type === 'horizontal').sort((a, b) => a.pos - b.pos);
    const merged = [];
    for (const list of [vRaw, hRaw]) {
      for (let i = 0; i < list.length; i++) {
        if (i > 0 && list[i].pos - list[i - 1].pos <= kerf) continue;
        merged.push(list[i]);
      }
    }
    return merged;
  }

  function categorizeCut(rp, rpIdx, type, pos) {
    let beforeCount = 0, afterCount = 0;
    const adj = [];
    for (let i = 0; i < rp.length; i++) {
      const p = rp[i];
      if (type === 'vertical') {
        if (p.x + p.placedWidth <= pos + kerf) beforeCount++;
        if (p.x >= pos) afterCount++;
        if (Math.abs(p.x + p.placedWidth - pos) <= kerf || Math.abs(p.x - pos) <= kerf) adj.push(rpIdx[i]);
      } else {
        if (p.y + p.placedHeight <= pos + kerf) beforeCount++;
        if (p.y >= pos) afterCount++;
        if (Math.abs(p.y + p.placedHeight - pos) <= kerf || Math.abs(p.y - pos) <= kerf) adj.push(rpIdx[i]);
      }
    }
    const isZone = beforeCount > 0 && afterCount > 0;
    return { beforeCount, afterCount, adj, isZone };
  }

  function emitCut(region, type, pos, adj, depth) {
    const pw = regionW(region);
    const ph = regionH(region);
    const level = Math.min(depth + 1, 3);
    const subRegions = splitRegion(region, type, pos);
    const side1Pcs = subRegions[0] ? getPiecesInRegion(subRegions[0]).rp.length : 0;
    const side2Pcs = subRegions[1] ? getPiecesInRegion(subRegions[1]).rp.length : 0;
    const relPos = type === 'vertical' ? pos - region.left : pos - region.top;
    const dir = type === 'horizontal' ? 'H' : 'V';
    let desc = `Corte ${cutNumber}: ${dir}@${relPos} en panel ${pw}×${ph}`;
    if (side1Pcs === 0 && subRegions[0]) {
      desc += ` → surplus ${regionW(subRegions[0])}×${regionH(subRegions[0])}`;
    }
    if (side2Pcs === 0 && subRegions[1]) {
      desc += ` → surplus ${regionW(subRegions[1])}×${regionH(subRegions[1])}`;
    }
    cuts.push({
      number: cutNumber++,
      type,
      position: pos,
      level,
      description: desc,
      kerf,
      affectedPieceIndices: adj,
      region: { left: region.left, right: region.right, top: region.top, bottom: region.bottom },
      panelWidth: pw,
      panelHeight: ph,
    });
    return subRegions;
  }

  function recurse(region, depth) {
    if (depth > MAX_DEPTH) return;
    const { rp, rpIdx } = getPiecesInRegion(region);
    if (rp.length === 0) return;

    if (rp.length === 1) {
      emitTrimsForSinglePiece(region, rp[0], rpIdx[0], depth);
      return;
    }

    const positions = findCutPositions(region, rp);
    if (positions.length === 0) return;

    const scored = [];
    for (const { type, pos } of positions) {
      const cat = categorizeCut(rp, rpIdx, type, pos);
      if (cat.beforeCount === 0 && cat.afterCount === 0) continue;
      scored.push({ type, pos, cat });
    }
    if (scored.length === 0) return;

    // V-FIRST INDUSTRIAL SCORING
    const vZone = scored.filter(s => s.type === 'vertical' && s.cat.isZone);
    const vPeel = scored.filter(s => s.type === 'vertical' && !s.cat.isZone);
    const hZone = scored.filter(s => s.type === 'horizontal' && s.cat.isZone);
    const hPeel = scored.filter(s => s.type === 'horizontal' && !s.cat.isZone);

    const edgeSort = (a, b) => {
      const aRel = a.type === 'vertical' ? a.pos - region.left : a.pos - region.top;
      const aRelEnd = a.type === 'vertical' ? region.right - a.pos : region.bottom - a.pos;
      const bRel = b.type === 'vertical' ? b.pos - region.left : b.pos - region.top;
      const bRelEnd = b.type === 'vertical' ? region.right - b.pos : region.bottom - b.pos;
      return Math.min(aRel, aRelEnd) - Math.min(bRel, bRelEnd);
    };

    let best = null;
    if (vZone.length > 0)      { vZone.sort(edgeSort); best = vZone[0]; }
    else if (vPeel.length > 0) { vPeel.sort(edgeSort); best = vPeel[0]; }
    else if (hZone.length > 0) { hZone.sort(edgeSort); best = hZone[0]; }
    else if (hPeel.length > 0) { hPeel.sort(edgeSort); best = hPeel[0]; }

    if (best) {
      const subs = emitCut(region, best.type, best.pos, best.cat.adj, depth);
      for (const sub of subs) recurse(sub, depth + 1);
    }
  }

  function emitTrimsForSinglePiece(region, piece, pieceIdx, depth) {
    const px = piece.x, py = piece.y;
    const pr = px + piece.placedWidth, pb = py + piece.placedHeight;
    const trims = [];
    const leftDist = px - region.left;
    const rightDist = region.right - pr;
    const topDist = py - region.top;
    const bottomDist = region.bottom - pb;
    if (leftDist >= MIN_CUT_REGION) trims.push({ type: 'vertical', pos: px, dist: leftDist });
    if (rightDist >= MIN_CUT_REGION) trims.push({ type: 'vertical', pos: pr, dist: rightDist });
    if (topDist >= MIN_CUT_REGION) trims.push({ type: 'horizontal', pos: py, dist: topDist });
    if (bottomDist >= MIN_CUT_REGION) trims.push({ type: 'horizontal', pos: pb, dist: bottomDist });
    trims.sort((a, b) => b.dist - a.dist);

    let currentRegion = region;
    for (const trim of trims) {
      if (trim.type === 'vertical' && (trim.pos <= currentRegion.left || trim.pos >= currentRegion.right)) continue;
      if (trim.type === 'horizontal' && (trim.pos <= currentRegion.top || trim.pos >= currentRegion.bottom)) continue;
      const subs = emitCut(currentRegion, trim.type, trim.pos, [pieceIdx], depth);
      for (const sub of subs) {
        const { rp: subPieces } = getPiecesInRegion(sub);
        if (subPieces.length > 0) { currentRegion = sub; break; }
      }
    }
  }

  const fullBoard = { left: 0, right: board.stockWidth, top: 0, bottom: board.stockHeight };
  recurse(fullBoard, 0);
  return cuts;
}


// ── Build final output ──────────────────────────────────────────────────────

function buildFinalOutput(pieces, rawResult, options, expanded, algoName) {
  const { kerf = 3, edgeTrim = 0 } = options;
  if (!expanded) {
    expanded = [];
    for (const piece of pieces) {
      const qty = Math.max(0, piece.quantity ?? 1);
      for (let i = 0; i < qty; i++) expanded.push({ id: piece.id, copyIndex: i });
    }
  }
  const MIN_OFFCUT_DISPLAY = 100;
  const allBoards = rawResult.boards;

  const boardResults = allBoards.map((board, idx) => {
    const cutSequence = generateHierarchicalCutSequence(board, kerf, edgeTrim, []);
    const displayOffcuts = computeRetazosFromCutSequence(
      board.stockWidth, board.stockHeight,
      board.pieces, cutSequence, kerf, MIN_OFFCUT_DISPLAY
    );

    return {
      boardIndex:   idx,
      stockWidth:   board.stockWidth,
      stockHeight:  board.stockHeight,
      isOffcut:     board.isOffcut    || false,
      offcutSource: board.offcutSource || null,
      pieces:       board.pieces,
      cutSequence,
      utilization:  board.bin.getUtilization(),
      wasteArea:    board.bin.getWasteArea(),
      offcuts:      displayOffcuts,
    };
  });

  // Safety reconciliation: catch silently dropped pieces
  const placedIds = new Set();
  for (const b of boardResults) {
    for (const p of b.pieces) {
      placedIds.add(`${p.id}_${p.copyIndex ?? '?'}`);
    }
  }
  const unfittedIds = new Set(
    rawResult.unfitted.map(p => `${p.id}_${p.copyIndex ?? '?'}`)
  );

  const reconciledUnfitted = [...rawResult.unfitted];
  for (const ep of expanded) {
    const key = `${ep.id}_${ep.copyIndex ?? '?'}`;
    if (!placedIds.has(key) && !unfittedIds.has(key)) {
      reconciledUnfitted.push(ep);
    }
  }

  const expandedTotal = expanded.length;
  const placedCount   = placedIds.size;
  const totalStock    = allBoards.reduce((s, b) => s + b.stockWidth * b.stockHeight, 0);
  const totalUsed     = boardResults.reduce((s, b) => s + b.pieces.reduce((a, p) => a + p.placedWidth * p.placedHeight, 0), 0);

  const result = {
    boards:            boardResults,
    unfitted:          reconciledUnfitted,
    consumedOffcutIds: rawResult.consumedOffcutIds,
    stats: {
      totalBoards:        allBoards.filter(b => !b.isOffcut).length,
      totalOffcutBoards:  allBoards.filter(b =>  b.isOffcut).length,
      totalPieces:        expandedTotal,
      placedPieces:       placedCount,
      unfittedPieces:     reconciledUnfitted.length,
      totalStockArea:     totalStock,
      totalUsedArea:      totalUsed,
      totalWasteArea:     totalStock - totalUsed,
      overallUtilization: totalStock > 0
        ? ((totalUsed / totalStock) * 100).toFixed(1)
        : 0,
      algorithmUsed:      algoName ?? null,
    },
  };

  // Validate result integrity
  const validation = validateResult(result, expandedTotal);
  if (!validation.valid) {
    console.warn('[CutWood Validator] Issues detected:', validation.errors);
  }

  return result;
}


// ── Main entry point (fast mode) ────────────────────────────────────────────

export function optimizeCuts(pieces, stock, options = {}, availableOffcuts = []) {
  const boardGrain = stock.grain || 'none';
  const expanded = expandPieces(pieces, boardGrain);

  // Run all packing variants and pick the best
  let best = _runAllVariants(expanded, stock, options, boardGrain);

  // Always run GapFill to redistribute pieces across boards
  if (best && best.boards && best.boards.length > 1) {
    try {
      const gapFilled = postProcessGapFill(
        { boards: best.boards, unfitted: best.unfitted || [] },
        stock, options
      );
      const gapWrapped = _wrapStripResult(gapFilled, stock, boardGrain);
      if (gapWrapped) {
        gapWrapped._algoName = (best._algoName || 'HStrip') + '+GapFill';
        best = gapWrapped;
      }
    } catch (e) { /* GapFill failed, use original result */ }
  }

  const algoName = best?._algoName ?? 'HStrip';
  return buildFinalOutput(pieces, best, options, expanded, algoName);
}


// ── Deep Optimization ───────────────────────────────────────────────────────
//
// Unified deep mode for both min-cuts and max-utilization:
//   Phase 1 (0-25%)  : All standard variants (HStrip + ColumnPack, normal + transposed)
//   Phase 2 (25-60%) : Permutation search with seeded shuffles
//   Phase 3 (60-85%) : Gap-Fill Post-Processor + Board Merging
//   Phase 4 (85-100%): Validate + Build final output

export function optimizeDeep(pieces, stock, options = {}, availableOffcuts = [], { onProgress } = {}) {
  const emit = (pct, msg) => onProgress?.(pct, msg);
  const boardGrain = stock.grain || 'none';
  const expanded   = expandPieces(pieces, boardGrain);
  const optimizationMode = options.optimizationMode || 'min-cuts';

  const seed = pieces.reduce((h, p) => (h * 31 + p.width * 1000 + p.height * 7 + p.quantity) | 0, 127);
  const rng = mulberry32(seed);

  // ── Phase 1: All standard variants (0-25%) ──────────────────────────────
  emit(3, 'Fase 1: Evaluando variantes HStrip + ColumnPack...');
  let best = _runAllVariants(expanded, stock, options, boardGrain);
  emit(25, `Fase 1 ✓ Mejor: ${best?.boards?.length ?? '?'} tableros (${best?._algoName || '?'})`);

  // ── Phase 2: Permutation search (25-60%) ────────────────────────────────
  const n = expanded.length;
  // Max-utilization gets more permutations to explore more solutions
  const PERM_N = optimizationMode === 'max-utilization'
    ? (n > 50 ? 400 : n > 30 ? 1000 : n > 20 ? 2000 : 4000)
    : (n > 50 ? 200 : n > 30 ? 500  : n > 20 ? 1000 : 2000);

  emit(27, `Fase 2: ${PERM_N} permutaciones...`);

  for (let attempt = 0; attempt < PERM_N; attempt++) {
    const shuffled = expanded.map(p => ({ ...p }));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Try HStrip with shuffled order
    const r = runHorizontalStripPack(shuffled, stock, options);
    const wrapped = _wrapStripResult(r, stock, boardGrain);
    if (wrapped) {
      wrapped._algoName = 'HStrip-perm';
      best = pickBetter(best, wrapped);
    }

    // Try ColumnPack with shuffled order
    try {
      const rl = runColumnPack(shuffled.map(p => ({ ...p })), stock, options);
      const wl = _wrapStripResult(rl, stock, boardGrain);
      if (wl) {
        wl._algoName = 'ColumnPack-perm';
        best = pickBetter(best, wl);
      }
    } catch (e) { /* skip */ }

    if (attempt % 100 === 0) {
      emit(27 + Math.round(attempt / PERM_N * 33), `Permutación ${attempt}/${PERM_N} · Mejor: ${best?.boards?.length ?? '?'} tableros`);
    }
  }
  emit(60, `Fase 2 ✓ Mejor: ${best?.boards?.length ?? '?'} tableros (${best?._algoName || '?'})`);

  // ── Phase 3: Gap-Fill + Board Merge (60-85%) ────────────────────────────
  emit(62, 'Fase 3: Gap-Fill Post-Processor...');
  if (best && best.boards && best.boards.length > 1) {
    const gapFilled = postProcessGapFill(
      { boards: best.boards, unfitted: best.unfitted || [] },
      stock, options,
      (pct, msg) => emit(62 + Math.round(pct / 100 * 23), msg)
    );
    const gapWrapped = _wrapStripResult(gapFilled, stock, boardGrain);
    if (gapWrapped) {
      gapWrapped._algoName = (best._algoName || 'HStrip') + '+GapFill';
      best = gapWrapped;
    }
  }
  emit(85, `Fase 3 ✓ Final: ${best?.boards?.length ?? '?'} tableros`);

  // ── Phase 4: Build result (85-100%) ─────────────────────────────────────
  emit(90, 'Construyendo resultado final...');
  const algoName = best?._algoName ?? 'HStrip';
  return buildFinalOutput(pieces, best, options, expanded, algoName);
}
