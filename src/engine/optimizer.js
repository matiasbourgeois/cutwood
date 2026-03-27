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
  const MIN_OFFCUT_SIZE = 150;
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

  // Step 3: Build final results
  const allBoards = bestResult.boards;
  const { kerf = 3, edgeTrim = 0 } = options;

  const boardResults = allBoards.map((board, idx) => {
    const usableOffcuts = board.bin.freeRects
      .filter(r => r.width >= MIN_OFFCUT_SIZE && r.height >= MIN_OFFCUT_SIZE)
      .map(r => ({
        width: Math.round(r.width),
        height: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
      }));

    return {
      boardIndex: idx,
      stockWidth: board.stockWidth,
      stockHeight: board.stockHeight,
      isOffcut: board.isOffcut || false,
      offcutSource: board.offcutSource || null,
      pieces: board.pieces,
      cutSequence: generateHierarchicalCutSequence(board, kerf, edgeTrim, usableOffcuts),
      utilization: board.bin.getUtilization(),
      wasteArea: board.bin.getWasteArea(),
      offcuts: usableOffcuts,
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Cut sequence generation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function mergeKerfAdjacent(positions, kerf) {
  const sorted = [...positions].sort((a, b) => a - b);
  const merged = [];
  for (const pos of sorted) {
    if (merged.length > 0 && pos - merged[merged.length - 1] <= kerf) continue;
    merged.push(pos);
  }
  return merged;
}

function generateHierarchicalCutSequence(board, kerf, edgeTrim, offcuts = []) {
  const cuts = [];
  let cutNumber = 1;
  const pieces = board.pieces;
  if (!pieces.length) return cuts;

  const grain = board.boardGrain || 'none';

  // -- Collect unique cut positions from piece boundaries --
  const rawHCuts = new Set();
  const rawVCuts = new Set();
  for (const piece of pieces) {
    const bottom = piece.y + piece.placedHeight;
    const right = piece.x + piece.placedWidth;
    if (bottom > edgeTrim && bottom < board.stockHeight - edgeTrim) rawHCuts.add(bottom);
    if (right > edgeTrim && right < board.stockWidth - edgeTrim) rawVCuts.add(right);
  }
  const hPositions = mergeKerfAdjacent(rawHCuts, kerf);
  const vPositions = mergeKerfAdjacent(rawVCuts, kerf);
  const allPositions = [
    ...hPositions.map(p => ({ type: 'horizontal', pos: p })),
    ...vPositions.map(p => ({ type: 'vertical', pos: p })),
  ];

  // -- Helpers --
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

  function getPiecesInRegion(region) {
    const rp = [];
    const rpIdx = [];
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.x + p.placedWidth <= region.left || p.x >= region.right) continue;
      if (p.y + p.placedHeight <= region.top || p.y >= region.bottom) continue;
      rp.push(p);
      rpIdx.push(i);
    }
    return { rp, rpIdx };
  }

  // ============================================================
  // SLAB-AWARE RECURSIVE DECOMPOSITION
  //
  // Each recursive call operates on ONE physical slab.
  // After emitting a cut, the slab splits into two sub-slabs.
  // Edge/waste trim cuts are emitted WITHIN each slab so they
  // never span across already-separated physical pieces.
  // ============================================================
  const emitted = new Set();
  const MAX_DEPTH = 30;
  const grainPref = grain === 'horizontal' ? 'horizontal' : grain === 'vertical' ? 'vertical' : null;

  function recurse(region, depth) {
    if (depth > MAX_DEPTH) return;

    const { rp, rpIdx } = getPiecesInRegion(region);
    if (rp.length === 0) return;

    // Single piece: emit edge trims within THIS slab only
    if (rp.length === 1) {
      emitEdgeTrims(region, rp, rpIdx, depth);
      return;
    }

    // Find valid guillotine cuts where BOTH sides have pieces
    const candidates = [];
    for (const { type, pos } of allPositions) {
      if (type === 'vertical' && (pos <= region.left || pos >= region.right)) continue;
      if (type === 'horizontal' && (pos <= region.top || pos >= region.bottom)) continue;
      if (emitted.has(`${type}_${pos}`)) continue;

      // Guillotine check
      let valid = true;
      for (const p of rp) {
        if (type === 'vertical') {
          if (p.x < pos && p.x + p.placedWidth > pos + kerf) { valid = false; break; }
        } else {
          if (p.y < pos && p.y + p.placedHeight > pos + kerf) { valid = false; break; }
        }
      }
      if (!valid) continue;

      let before = 0, after = 0;
      const adj = [];
      for (let i = 0; i < rp.length; i++) {
        const p = rp[i];
        if (type === 'vertical') {
          if (p.x + p.placedWidth <= pos + kerf) before++;
          if (p.x >= pos) after++;
          if (Math.abs(p.x + p.placedWidth - pos) <= kerf || Math.abs(p.x - pos) <= kerf) adj.push(rpIdx[i]);
        } else {
          if (p.y + p.placedHeight <= pos + kerf) before++;
          if (p.y >= pos) after++;
          if (Math.abs(p.y + p.placedHeight - pos) <= kerf || Math.abs(p.y - pos) <= kerf) adj.push(rpIdx[i]);
        }
      }

      if (before === 0 || after === 0) continue;

      candidates.push({
        type, pos, adj, before, after,
        total: before + after,
        minSide: Math.min(before, after),
      });
    }

    if (candidates.length === 0) {
      // No structural cuts but multiple pieces - emit edge trims
      emitEdgeTrims(region, rp, rpIdx, depth);
      return;
    }

    // -- Option C Sort --
    candidates.sort((a, b) => {
      const hasVBal = candidates.some(c => c.type === 'vertical' && c.minSide >= 2);
      if (hasVBal) {
        const aCat = (a.type === 'vertical' && a.minSide >= 2) ? 0
                   : (a.type === 'horizontal' && a.minSide >= 2) ? 1 : 2;
        const bCat = (b.type === 'vertical' && b.minSide >= 2) ? 0
                   : (b.type === 'horizontal' && b.minSide >= 2) ? 1 : 2;
        if (aCat !== bCat) return aCat - bCat;
        if (aCat <= 1) {
          if (a.minSide !== b.minSide) return b.minSide - a.minSide;
          if (b.total !== a.total) return b.total - a.total;
        } else {
          const aEdge = a.before === 1 ? a.pos : (a.type === 'vertical' ? region.right - a.pos : region.bottom - a.pos);
          const bEdge = b.before === 1 ? b.pos : (b.type === 'vertical' ? region.right - b.pos : region.bottom - b.pos);
          if (aEdge !== bEdge) return aEdge - bEdge;
        }
      } else {
        const aPeel = a.minSide === 1 ? 1 : 0;
        const bPeel = b.minSide === 1 ? 1 : 0;
        if (aPeel !== bPeel) return bPeel - aPeel;
        if (aPeel && bPeel) {
          const aEdge = a.before === 1 ? a.pos : (a.type === 'vertical' ? region.right - a.pos : region.bottom - a.pos);
          const bEdge = b.before === 1 ? b.pos : (b.type === 'vertical' ? region.right - b.pos : region.bottom - b.pos);
          if (aEdge !== bEdge) return aEdge - bEdge;
        }
        if (b.total !== a.total) return b.total - a.total;
        if (b.minSide !== a.minSide) return b.minSide - a.minSide;
      }
      if (grainPref) {
        const ag = a.type === grainPref ? 0 : 1;
        const bg = b.type === grainPref ? 0 : 1;
        if (ag !== bg) return ag - bg;
      }
      return a.pos - b.pos;
    });

    const best = candidates[0];
    emitted.add(`${best.type}_${best.pos}`);
    const level = Math.min(depth + 1, 3);

    cuts.push({
      number: cutNumber++,
      type: best.type,
      position: best.pos,
      level,
      description: `Corte ${cutNumber - 1}: ${best.type === 'horizontal' ? 'Horizontal' : 'Vertical'} a ${best.pos}mm`,
      kerf,
      affectedPieceIndices: best.adj,
      region: { left: region.left, right: region.right, top: region.top, bottom: region.bottom },
    });

    // Split and recurse into EACH sub-slab
    const subRegions = splitRegion(region, best.type, best.pos);
    for (const sub of subRegions) {
      recurse(sub, depth + 1);
    }
  }

  // -- Edge/waste trims within a SINGLE physical slab --
  function emitEdgeTrims(region, rp, rpIdx, depth) {
    // Process edge trims ONE AT A TIME.
    // After each trim that splits the slab, recurse into sub-slabs.
    for (const { type, pos } of allPositions) {
      const key = `${type}_${pos}`;
      if (emitted.has(key)) continue;
      if (type === 'vertical' && (pos <= region.left || pos >= region.right)) continue;
      if (type === 'horizontal' && (pos <= region.top || pos >= region.bottom)) continue;

      // No piece may straddle this cut within THIS slab
      let straddled = false;
      for (const p of rp) {
        if (type === 'vertical') {
          if (p.x < pos && (p.x + p.placedWidth) > pos + kerf) { straddled = true; break; }
        } else {
          if (p.y < pos && (p.y + p.placedHeight) > pos + kerf) { straddled = true; break; }
        }
      }
      if (straddled) continue;

      // At least one piece in this slab must touch this cut
      let touches = false;
      const adj = [];
      for (let i = 0; i < rp.length; i++) {
        const p = rp[i];
        if (type === 'vertical') {
          if (Math.abs(p.x + p.placedWidth - pos) <= kerf || Math.abs(p.x - pos) <= kerf ||
              Math.abs(p.x - pos - kerf) <= kerf) { touches = true; adj.push(rpIdx[i]); }
        } else {
          if (Math.abs(p.y + p.placedHeight - pos) <= kerf || Math.abs(p.y - pos) <= kerf ||
              Math.abs(p.y - pos - kerf) <= kerf) { touches = true; adj.push(rpIdx[i]); }
        }
      }
      if (!touches) continue;

      emitted.add(key);
      cuts.push({
        number: cutNumber++,
        type,
        position: pos,
        level: 3,
        description: `Corte ${cutNumber - 1}: ${type === 'horizontal' ? 'Horizontal' : 'Vertical'} a ${pos}mm (Recorte)`,
        kerf,
        affectedPieceIndices: adj,
        region: { left: region.left, right: region.right, top: region.top, bottom: region.bottom },
      });

      // After emitting this trim, split the slab and recurse for remaining trims
      const subRegions = splitRegion(region, type, pos);
      for (const sub of subRegions) {
        const { rp: subRp, rpIdx: subRpIdx } = getPiecesInRegion(sub);
        if (subRp.length > 0) {
          emitEdgeTrims(sub, subRp, subRpIdx, depth);
        }
      }
      return; // Stop processing this slab's trims — sub-slabs handle the rest
    }
  }

  const fullBoard = { left: 0, right: board.stockWidth, top: 0, bottom: board.stockHeight };
  recurse(fullBoard, 0);
  return cuts;
}




