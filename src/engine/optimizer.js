/**
 * CutWood Optimizer v3 Ã¢â‚¬â€ Multi-Heuristic Best-of-N + MaxRects
 *
 * Strategy:
 * 1. Generate N configurations:
 *    - 2 bin types (Guillotine, MaxRects)
 *    - 3 heuristics (BSSF, BAF, BLF)
 *    - 2 split rules for Guillotine (SLA, LLA)
 *    - 7 sort orders
 *    - 2 packing modes (with-strips, all-singles)
 *    Total: ~126 variants
 * 2. Run each independently
 * 3. Select the solution with fewest boards (tie-break: highest utilization)
 * 4. Generate hierarchical cut sequences for winning solution
 *
 * Performance: <100ms total
 */

import { GuillotineBin } from './guillotine.js';
import { MaxRectsBin } from './maxrects.js';
import { runStripPack } from './stripPacker.js';

const SORT_ORDERS = [
  'area-desc',
  'area-asc',
  'perimeter-desc',
  'height-desc',
  'width-desc',
  'max-side-desc',
  'diff-desc',
];

/**
 * Compute effective rotation:
 * forceRotated=true means we pre-swapped w/h for grain alignment.
 * If the bin ALSO rotates it, they cancel out (back to original).
 */
function effectiveRotated(piece, binRotated) {
  const fr = piece.forceRotated || false;
  return fr !== binRotated;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Sort comparators Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    case 'area-desc':
    default:
      return (a, b) => (b.width * b.height) - (a.width * a.height);
  }
}

function getStripSortComparator(order) {
  switch (order) {
    case 'area-asc':
      return (a, b) => a.totalArea - b.totalArea;
    case 'perimeter-desc':
      return (a, b) => (2*(b.pieceWidth + b.pieceHeight)*b.count) - (2*(a.pieceWidth + a.pieceHeight)*a.count);
    case 'height-desc':
      return (a, b) => b.pieceHeight - a.pieceHeight;
    case 'width-desc':
      return (a, b) => Math.min(b.pieceWidth, b.pieceHeight) - Math.min(a.pieceWidth, a.pieceHeight);
    case 'max-side-desc':
      return (a, b) => Math.max(b.pieceWidth, b.pieceHeight) - Math.max(a.pieceWidth, a.pieceHeight);
    case 'diff-desc':
      return (a, b) => Math.abs(b.pieceWidth - b.pieceHeight) - Math.abs(a.pieceWidth - a.pieceHeight);
    case 'area-desc':
    default:
      return (a, b) => b.totalArea - a.totalArea;
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Create the right bin type Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function createBin(width, height, kerf, binType, heuristic, splitRule) {
  if (binType === 'maxrects') {
    return new MaxRectsBin(width, height, kerf, heuristic);
  }
  return new GuillotineBin(width, height, kerf, heuristic, splitRule);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Core packing pass Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function runSinglePass(expandedPieces, stock, options, binType, heuristic, splitRule, sortOrder, useStrips, availableOffcuts, presorted = false) {
  const {
    kerf = 3,
    allowRotation = true,
    edgeTrim = 0,
  } = options;

  const boardGrain = stock.grain || 'none';
  const effectiveWidth = stock.width - edgeTrim * 2;
  const effectiveHeight = stock.height - edgeTrim * 2;

  let allPiecesToPlace;

  if (useStrips) {
    // Detect strips + singles
    const { strips, singles } = detectStripsFromExpanded(expandedPieces, effectiveWidth, effectiveHeight, kerf);
    strips.sort(getStripSortComparator(sortOrder));
    singles.sort(getSortComparator(sortOrder));
    allPiecesToPlace = { strips, singles };
  } else if (presorted) {
    // Use pieces in their given order (for anchor-piece strategy)
    allPiecesToPlace = { strips: [], singles: [...expandedPieces] };
  } else {
    // All pieces as individuals (no strips)
    const all = [...expandedPieces];
    all.sort(getSortComparator(sortOrder));
    allPiecesToPlace = { strips: [], singles: all };
  }

  const boards = [];
  const unfitted = [];
  const consumedOffcutIds = [];

  // Pre-load offcuts
  if (availableOffcuts && availableOffcuts.length > 0) {
    const sorted = [...availableOffcuts].sort((a, b) => (b.width * b.height) - (a.width * a.height));
    for (const oc of sorted) {
      const bin = createBin(oc.width, oc.height, kerf, binType, heuristic, splitRule);
      boards.push({
        bin, stockWidth: oc.width, stockHeight: oc.height,
        isOffcut: true, offcutId: oc.id, offcutSource: oc.source || 'Retazo',
        pieces: [],
      });
    }
  }

  // Place strips first
  for (const strip of allPiecesToPlace.strips) {
    let placed = false;

    for (const board of boards) {
      const results = board.bin.insertStrip(
        strip.pieceWidth, strip.pieceHeight, strip.count, allowRotation && strip.canRotate
      );
      if (results) {
        for (let i = 0; i < results.length; i++) {
          board.pieces.push({
            ...strip.pieces[i],
            x: results[i].x + (board.isOffcut ? 0 : edgeTrim),
            y: results[i].y + (board.isOffcut ? 0 : edgeTrim),
            placedWidth: results[i].width,
            placedHeight: results[i].height,
            rotated: effectiveRotated(strip.pieces[i], results[i].rotated),
            stripId: strip.id,
          });
        }
        placed = true;
        break;
      }
    }

    // Try individual pieces in offcut boards
    if (!placed && availableOffcuts && availableOffcuts.length > 0) {
      let allOk = true;
      const temp = [];
      for (const piece of strip.pieces) {
        let ok = false;
        for (const board of boards) {
          if (!board.isOffcut) continue;
          const result = board.bin.insert(piece.width, piece.height, allowRotation && (piece.canRotate !== false));
          if (result) {
            temp.push({ board, piece, result });
            ok = true;
            break;
          }
        }
        if (!ok) { allOk = false; break; }
      }
      if (allOk) {
        for (const tp of temp) {
          tp.board.pieces.push({
            ...tp.piece,
            x: tp.result.x, y: tp.result.y,
            placedWidth: tp.result.width, placedHeight: tp.result.height,
            rotated: effectiveRotated(tp.piece, tp.result.rotated),
          });
        }
        placed = true;
      }
    }

    // New full board
    if (!placed) {
      const maxBoards = stock.quantity || 99;
      const fullBoardCount = boards.filter(b => !b.isOffcut).length;
      if (fullBoardCount < maxBoards) {
        const bin = createBin(effectiveWidth, effectiveHeight, kerf, binType, heuristic, splitRule);
        const results = bin.insertStrip(
          strip.pieceWidth, strip.pieceHeight, strip.count, allowRotation && strip.canRotate
        );
        if (results) {
          const bpcs = results.map((r, i) => ({
            ...strip.pieces[i],
            x: r.x + edgeTrim, y: r.y + edgeTrim,
            placedWidth: r.width, placedHeight: r.height,
            rotated: effectiveRotated(strip.pieces[i], r.rotated),
            stripId: strip.id,
          }));
          boards.push({ bin, stockWidth: stock.width, stockHeight: stock.height, boardGrain, pieces: bpcs });
          placed = true;
        }
      }
    }

    if (!placed) {
      for (const piece of strip.pieces) {
        placeSingle(piece, boards, stock, options, binType, heuristic, splitRule, unfitted);
      }
    }
  }

  // Place singles
  for (const piece of allPiecesToPlace.singles) {
    placeSingle(piece, boards, stock, options, binType, heuristic, splitRule, unfitted);
  }

  // Mark consumed offcuts
  for (const board of boards) {
    if (board.isOffcut && board.pieces.length > 0) {
      consumedOffcutIds.push(board.offcutId);
    }
  }

  const allBoards = boards.filter(b => !b.isOffcut || b.pieces.length > 0);

  const totalPiecesArea = allBoards.reduce(
    (sum, b) => sum + b.pieces.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0), 0
  );
  const totalStockArea = allBoards.reduce((sum, b) => sum + b.stockWidth * b.stockHeight, 0);
  const utilization = totalStockArea > 0 ? (totalPiecesArea / totalStockArea) * 100 : 0;

  return {
    boards: allBoards,
    unfitted,
    consumedOffcutIds,
    boardCount: allBoards.filter(b => !b.isOffcut).length,
    utilization,
    totalStockArea,
  };
}

function placeSingle(piece, boards, stock, options, binType, heuristic, splitRule, unfitted) {
  const { kerf = 3, allowRotation = true, edgeTrim = 0 } = options;
  const effectiveWidth = stock.width - edgeTrim * 2;
  const effectiveHeight = stock.height - edgeTrim * 2;
  const boardGrain = stock.grain || 'none';
  const pieceCanRotate = allowRotation && (piece.canRotate !== false);

  for (const board of boards) {
    const result = board.bin.insert(piece.width, piece.height, pieceCanRotate);
    if (result) {
      board.pieces.push({
        ...piece,
        x: result.x + (board.isOffcut ? 0 : edgeTrim),
        y: result.y + (board.isOffcut ? 0 : edgeTrim),
        placedWidth: result.width, placedHeight: result.height,
        rotated: effectiveRotated(piece, result.rotated),
      });
      return;
    }
  }

  const maxBoards = stock.quantity || 99;
  const fullBoardCount = boards.filter(b => !b.isOffcut).length;
  if (fullBoardCount < maxBoards) {
    const bin = createBin(effectiveWidth, effectiveHeight, kerf, binType, heuristic, splitRule);
    const result = bin.insert(piece.width, piece.height, pieceCanRotate);
    if (result) {
      boards.push({
        bin, stockWidth: stock.width, stockHeight: stock.height, boardGrain,
        pieces: [{
          ...piece,
          x: result.x + edgeTrim, y: result.y + edgeTrim,
          placedWidth: result.width, placedHeight: result.height,
          rotated: effectiveRotated(piece, result.rotated),
        }],
      });
      return;
    }
  }
  unfitted.push(piece);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Main entry point Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export function optimizeCuts(pieces, stock, options = {}, availableOffcuts = []) {
  const MIN_OFFCUT_FOR_CUTS = 0;    // Cut sequence sees ALL waste areas (even small ones)
  const MIN_OFFCUT_DISPLAY = 100;   // Only show retazos >= 100mm as reusable to the user
  const boardGrain = stock.grain || 'none';

  // Step 1: Expand pieces once
  const expanded = expandPieces(pieces, boardGrain);

  // Step 2: Run ALL strategy combinations
  let bestResult = null;
  let bestScore = { boards: Infinity, waste: Infinity };

  const configs = [];

  // Guillotine variants: 3 heuristics Ãƒâ€” 2 splits Ãƒâ€” 7 sorts Ãƒâ€” 2 strip modes = 84
  for (const heuristic of ['bssf', 'baf', 'blf']) {
    for (const splitRule of ['sla', 'lla']) {
      for (const sortOrder of SORT_ORDERS) {
        configs.push({ binType: 'guillotine', heuristic, splitRule, sortOrder, useStrips: true });
        configs.push({ binType: 'guillotine', heuristic, splitRule, sortOrder, useStrips: false });
      }
    }
  }

  // MaxRects variants: 3 heuristics Ãƒâ€” 7 sorts Ãƒâ€” 2 strip modes = 42
  for (const heuristic of ['bssf', 'baf', 'blf']) {
    for (const sortOrder of SORT_ORDERS) {
      configs.push({ binType: 'maxrects', heuristic, splitRule: 'sla', sortOrder, useStrips: true });
      configs.push({ binType: 'maxrects', heuristic, splitRule: 'sla', sortOrder, useStrips: false });
    }
  }

  
  // ── Strip-based packing strategy ──
  // Groups pieces by width into vertical strips for industry-standard cut sequences
  const stripResult = runStripPack(expanded.map(p => ({ ...p })), stock, options);
  if (stripResult.boards.length > 0) {
    const stripBoardCount = stripResult.boards.length;
    const stripTotalPiecesArea = stripResult.boards.reduce(
      (sum, b) => sum + b.pieces.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0), 0
    );
    const stripTotalStockArea = stripResult.boards.reduce((sum, b) => sum + b.stockWidth * b.stockHeight, 0);
    const stripUtilization = stripTotalStockArea > 0 ? (stripTotalPiecesArea / stripTotalStockArea) * 100 : 0;

    const stripScore = {
      boards: stripBoardCount + stripResult.unfitted.length * 100,
      waste: 100 - stripUtilization,
    };

    if (
      stripScore.boards < bestScore.boards ||
      (stripScore.boards === bestScore.boards && stripScore.waste < bestScore.waste)
    ) {
      bestScore = stripScore;
      // Convert strip-pack boards to the format expected by the rest of the pipeline
      bestResult = {
        boards: stripResult.boards.map(b => ({
          bin: { freeRects: [], getUtilization: () => stripUtilization, getWasteArea: () => stripTotalStockArea - stripTotalPiecesArea },
          stockWidth: b.stockWidth,
          stockHeight: b.stockHeight,
          boardGrain: b.boardGrain || boardGrain,
          pieces: b.pieces,
        })),
        unfitted: stripResult.unfitted,
        consumedOffcutIds: [],
        boardCount: stripBoardCount,
        utilization: stripUtilization,
        totalStockArea: stripTotalStockArea,
      };
    }
  }

  for (const cfg of configs) {
    const clonedPieces = expanded.map(p => ({ ...p }));

    const result = runSinglePass(
      clonedPieces, stock, options,
      cfg.binType, cfg.heuristic, cfg.splitRule, cfg.sortOrder, cfg.useStrips,
      availableOffcuts
    );

    const score = {
      boards: result.boardCount + result.unfitted.length * 100,
      waste: 100 - result.utilization,
    };

    if (
      score.boards < bestScore.boards ||
      (score.boards === bestScore.boards && score.waste < bestScore.waste)
    ) {
      bestScore = score;
      bestResult = result;
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Phase 3: Board elimination Ã¢â‚¬â€ permutation-based repack Ã¢â€â‚¬Ã¢â€â‚¬
  // If we're using 2+ boards, try shuffled orderings to see if all pieces
  // can fit in fewer boards. This catches cases where the sort order
  // happens to place a "blocking" piece early that fragments the space.
  if (bestScore.boards >= 2 && expanded.length <= 30) {
    const isLarge = expanded.length > 15;
    const binTypes = isLarge ? ['maxrects'] : ['maxrects', 'guillotine'];
    const heuristics = ['bssf', 'baf', 'blf'];
    const splitRules = ['sla', 'lla'];
    const anchorSorts = isLarge ? ['area-desc', 'height-desc', 'width-desc'] : SORT_ORDERS;

    // Strategy A: Anchor-piece Ãƒâ€” sort orders for the rest
    const seenAnchors = new Set();
    for (let anchor = 0; anchor < expanded.length; anchor++) {
      const anchorKey = `${expanded[anchor].width}_${expanded[anchor].height}`;
      if (seenAnchors.has(anchorKey)) continue;
      seenAnchors.add(anchorKey);

      const rest = expanded.filter((_, i) => i !== anchor);

      for (const sortOrder of anchorSorts) {
        const sortedRest = [...rest].sort(getSortComparator(sortOrder)).map(p => ({ ...p }));
        const reordered = [{ ...expanded[anchor] }, ...sortedRest];

        for (const bt of binTypes) {
          for (const h of heuristics) {
            const splits = bt === 'guillotine' ? splitRules : ['sla'];
            for (const sr of splits) {
              const result = runSinglePass(
                reordered.map(p => ({ ...p })), stock, options,
                bt, h, sr, 'area-desc', false, availableOffcuts, true
              );
              const score = {
                boards: result.boardCount + result.unfitted.length * 100,
                waste: 100 - result.utilization,
              };
              if (
                score.boards < bestScore.boards ||
                (score.boards === bestScore.boards && score.waste < bestScore.waste)
              ) {
                bestScore = score;
                bestResult = result;
              }
            }
          }
        }
        if (bestScore.boards <= 1) break;
      }
      if (bestScore.boards <= 1) break;
    }

    // Strategy B: Sorted orderings with all combos (if still 2+ boards)
    if (bestScore.boards >= 2) {
      const specialOrders = [
        [...expanded].sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height)),
        [...expanded].sort((a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height)),
        [...expanded].sort((a, b) => b.height - a.height),
        [...expanded].sort((a, b) => b.width - a.width),
        [...expanded].sort((a, b) => (a.width * a.height) - (b.width * b.height)),
      ];

      for (const order of specialOrders) {
        for (const bt of binTypes) {
          for (const h of heuristics) {
            const splits = bt === 'guillotine' ? splitRules : ['sla'];
            for (const sr of splits) {
              const result = runSinglePass(
                order.map(p => ({ ...p })), stock, options,
                bt, h, sr, 'area-desc', false, availableOffcuts, true
              );
              const score = {
                boards: result.boardCount + result.unfitted.length * 100,
                waste: 100 - result.utilization,
              };
              if (score.boards < bestScore.boards ||
                (score.boards === bestScore.boards && score.waste < bestScore.waste)) {
                bestScore = score;
                bestResult = result;
              }
            }
          }
        }
        if (bestScore.boards <= 1) break;
      }
    }

    // Strategy C: Random shuffles (scaled by piece count)
    if (bestScore.boards >= 2) {
      const maxShuffles = expanded.length > 25 ? 30 : expanded.length > 15 ? 80 : 300;
      for (let attempt = 0; attempt < maxShuffles; attempt++) {
        const shuffled = expanded.map(p => ({ ...p }));
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        for (const bt of binTypes) {
          for (const h of heuristics) {
            const result = runSinglePass(
              shuffled.map(p => ({ ...p })), stock, options,
              bt, h, 'sla', 'area-desc', false, availableOffcuts, true
            );
            const score = {
              boards: result.boardCount + result.unfitted.length * 100,
              waste: 100 - result.utilization,
            };
            if (score.boards < bestScore.boards ||
              (score.boards === bestScore.boards && score.waste < bestScore.waste)) {
              bestScore = score;
              bestResult = result;
            }
          }
        }
        if (bestScore.boards <= 1) break;
      }
    }
  }

  // ── computeFreeRectsFromPlacements ──────────────────────────────────────────
  // Fallback for packers that don't maintain freeRects (e.g. StripPack).
  // Given the placed pieces, reconstructs the remaining free rectangles using
  // guillotine-style subtraction, so retazos and cut sequences always work.
  function computeFreeRectsFromPlacements(stockW, stockH, placedPieces, kerfMm, edgeTrimMm) {
    // Work in internal coords (no edgeTrim offset — pieces already have it baked in)
    let free = [{ x: 0, y: 0, width: stockW, height: stockH }];

    for (const p of placedPieces) {
      // Piece footprint (including kerf margin on all sides for splitting)
      const px = Math.max(0, p.x - edgeTrimMm);
      const py = Math.max(0, p.y - edgeTrimMm);
      const pw = p.placedWidth  + kerfMm;
      const ph = p.placedHeight + kerfMm;

      const nextFree = [];
      for (const r of free) {
        // If no overlap, keep rect as-is
        const noOverlap =
          px >= r.x + r.width  ||
          px + pw <= r.x       ||
          py >= r.y + r.height ||
          py + ph <= r.y;
        if (noOverlap) { nextFree.push(r); continue; }

        // Guillotine split: up to 4 sub-rects around the piece
        // Left slice
        if (px > r.x)
          nextFree.push({ x: r.x, y: r.y, width: px - r.x, height: r.height });
        // Right slice
        if (px + pw < r.x + r.width)
          nextFree.push({ x: px + pw, y: r.y, width: (r.x + r.width) - (px + pw), height: r.height });
        // Top slice (between left/right columns)
        if (py > r.y)
          nextFree.push({ x: Math.max(r.x, px), y: r.y, width: Math.min(r.x + r.width, px + pw) - Math.max(r.x, px), height: py - r.y });
        // Bottom slice (between left/right columns)
        if (py + ph < r.y + r.height)
          nextFree.push({ x: Math.max(r.x, px), y: py + ph, width: Math.min(r.x + r.width, px + pw) - Math.max(r.x, px), height: (r.y + r.height) - (py + ph) });
      }
      free = nextFree.filter(r => r.width > 0 && r.height > 0);
    }

    return free;
  }

  // Step 3: Build final results
  const allBoards = bestResult.boards;
  const { kerf = 3, edgeTrim = 0 } = options;

  const boardResults = allBoards.map((board, idx) => {
    // Get freeRects from the bin — or recompute if the packer didn't maintain them
    // (StripPack returns bin.freeRects = [] — we fix this here permanently)
    const rawFreeRects = (board.bin.freeRects && board.bin.freeRects.length > 0)
      ? board.bin.freeRects
      : computeFreeRectsFromPlacements(board.stockWidth, board.stockHeight, board.pieces, kerf, edgeTrim);

    // All offcuts (down to 0mm) — used by cut sequence to see ALL waste boundaries
    const allOffcutsForCuts = rawFreeRects
      .filter(r => r.width >= MIN_OFFCUT_FOR_CUTS && r.height >= MIN_OFFCUT_FOR_CUTS)
      .map(r => ({
        width: Math.round(r.width),
        height: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
      }));

    // Only show retazos >= 100mm as reusable in the UI
    const displayOffcuts = allOffcutsForCuts.filter(
      r => r.width >= MIN_OFFCUT_DISPLAY && r.height >= MIN_OFFCUT_DISPLAY
    );

    return {
      boardIndex: idx,
      stockWidth: board.stockWidth,
      stockHeight: board.stockHeight,
      isOffcut: board.isOffcut || false,
      offcutSource: board.offcutSource || null,
      pieces: board.pieces,
      cutSequence: generateHierarchicalCutSequence(board, kerf, edgeTrim, allOffcutsForCuts),
      utilization: board.bin.getUtilization(),
      wasteArea: board.bin.getWasteArea(),
      offcuts: displayOffcuts,
    };
  });


  const expandedTotal = pieces.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const placedCount = expandedTotal - bestResult.unfitted.length;
  const totalStockArea = allBoards.reduce((sum, b) => sum + b.stockWidth * b.stockHeight, 0);
  const totalUsedArea = boardResults.reduce(
    (sum, b) => sum + b.pieces.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0), 0
  );

  return {
    boards: boardResults,
    unfitted: bestResult.unfitted,
    consumedOffcutIds: bestResult.consumedOffcutIds,
    stats: {
      totalBoards: allBoards.filter(b => !b.isOffcut).length,
      totalOffcutBoards: allBoards.filter(b => b.isOffcut).length,
      totalPieces: expandedTotal,
      placedPieces: placedCount,
      unfittedPieces: bestResult.unfitted.length,
      totalStockArea,
      totalUsedArea,
      totalWasteArea: totalStockArea - totalUsedArea,
      overallUtilization: totalStockArea > 0
        ? ((totalUsedArea / totalStockArea) * 100).toFixed(1)
        : 0,
    },
  };
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Piece expansion Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function expandPieces(pieces, boardGrain) {
  const expanded = [];

  for (const piece of pieces) {
    const qty = piece.quantity || 1;
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Strip detection Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function detectStripsFromExpanded(expandedPieces, boardWidth, boardHeight, kerf) {
  const strips = [];
  const singles = [];
  let stripIdCounter = 0;

  const groups = {};
  for (const p of expandedPieces) {
    const dimKey = `${Math.min(p.width, p.height)}_${Math.max(p.width, p.height)}_${p.grain}`;
    if (!groups[dimKey]) groups[dimKey] = [];
    groups[dimKey].push(p);
  }

  for (const [key, group] of Object.entries(groups)) {
    if (group.length >= 2) {
      const pw = group[0].width;
      const ph = group[0].height;
      const maxInStripH = Math.floor((boardWidth + kerf) / (pw + kerf));
      const maxInStripV = Math.floor((boardWidth + kerf) / (ph + kerf));
      const maxInStrip = Math.max(maxInStripH, maxInStripV);
      if (maxInStrip >= 2) {
        let remaining = [...group];
        while (remaining.length >= 2) {
          const count = Math.min(remaining.length, maxInStrip);
          const stripPieces = remaining.splice(0, count);
          strips.push({
            id: `strip_${stripIdCounter++}`,
            pieceWidth: pw, pieceHeight: ph,
            count, pieces: stripPieces,
            totalArea: pw * ph * count,
            canRotate: stripPieces[0].canRotate !== false,
          });
        }
        singles.push(...remaining);
      } else {
        singles.push(...group);
      }
    } else {
      singles.push(...group);
    }
  }

  return { strips, singles };
}

// ── Cut sequence generation (Panel-Reduction / CutList style) ────────────────
//
// Each cut operates on the CURRENT PANEL and produces:
//   piece (or zone) + remainder
// This matches how CutList Optimizer and real saw operators work:
//   "I have THIS panel → I make ONE cut → I get a piece + leftover"
//
// Two cut types:
//   ZONE CUT: both sides of the cut have pieces → recurse into both
//   PEEL CUT: one side has piece(s), other is waste → extract piece, remainder is new panel
// ─────────────────────────────────────────────────────────────────────────────

function generateHierarchicalCutSequence(board, kerf, edgeTrim, offcuts = []) {
  const cuts = [];
  let cutNumber = 1;
  const pieces = board.pieces;
  if (!pieces.length) return cuts;

  const MAX_DEPTH = 40;
  const MIN_CUT_REGION = 50; // Don't emit cuts that create regions smaller than this

  // Build combined list: real pieces + offcuts (treated as virtual pieces)
  // This ensures the cut sequence never breaks through usable offcuts
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
        // Reject cuts that create a kerf-sliver (region smaller than MIN_CUT_REGION)
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

    // Merge kerf-adjacent positions: if two positions of the same type
    // are within 'kerf' mm of each other, keep only the first (they're the same physical cut)
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

  // Panel-reduction recursion (CutList-style)
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

    // ── V-FIRST INDUSTRIAL SCORING ──
    // Priority order (like CutList / seccionadoras):
    //   1. V zone cuts (vertical edge-to-edge, both sides have pieces)
    //   2. V peel cuts (vertical edge-to-edge, one side waste)
    //   3. H zone cuts (horizontal edge-to-edge, both sides have pieces)
    //   4. H peel cuts (horizontal edge-to-edge, one side waste)
    // Within each category: prefer cuts closest to the panel edge (smallest waste/strip first)

    const vZone = scored.filter(s => s.type === 'vertical' && s.cat.isZone);
    const vPeel = scored.filter(s => s.type === 'vertical' && !s.cat.isZone);
    const hZone = scored.filter(s => s.type === 'horizontal' && s.cat.isZone);
    const hPeel = scored.filter(s => s.type === 'horizontal' && !s.cat.isZone);

    // Edge-proximity sort: prefer the cut that creates the smallest strip on one side
    // (This peels thin strips first, like CutList's x=100 peels)
    const edgeSort = (a, b) => {
      const aRel = a.type === 'vertical' ? a.pos - region.left : a.pos - region.top;
      const aRelEnd = a.type === 'vertical' ? region.right - a.pos : region.bottom - a.pos;
      const bRel = b.type === 'vertical' ? b.pos - region.left : b.pos - region.top;
      const bRelEnd = b.type === 'vertical' ? region.right - b.pos : region.bottom - b.pos;
      return Math.min(aRel, aRelEnd) - Math.min(bRel, bRelEnd);
    };

    // Pick the best cut from the highest-priority non-empty category
    let best = null;
    if (vZone.length > 0) {
      vZone.sort(edgeSort);
      best = vZone[0];
    } else if (vPeel.length > 0) {
      vPeel.sort(edgeSort);
      best = vPeel[0];
    } else if (hZone.length > 0) {
      hZone.sort(edgeSort);
      best = hZone[0];
    } else if (hPeel.length > 0) {
      hPeel.sort(edgeSort);
      best = hPeel[0];
    }

    if (best) {
      const subs = emitCut(region, best.type, best.pos, best.cat.adj, depth);
      for (const sub of subs) recurse(sub, depth + 1);
    }
  }

  function emitTrimsForSinglePiece(region, piece, pieceIdx, depth) {
    const px = piece.x, py = piece.y;
    const pr = px + piece.placedWidth, pb = py + piece.placedHeight;
    const trims = [];
    // Only emit trims where the waste strip is >= MIN_CUT_REGION
    // This prevents "cutting" board edges (5mm margins) which aren't real cuts
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
