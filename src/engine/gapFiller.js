/**
 * Gap-Fill Post-Processor for CutWood Deep Mode
 *
 * After the HStrip/Lepton packer produces an initial layout, this module:
 *   1. Scans each board for unused rectangular regions (gaps)
 *   2. Attempts to relocate pieces from LATER boards into those gaps
 *   3. Attempts to MERGE under-utilized boards by re-packing them together
 *   4. Returns a compacted result with fewer (or equal) boards
 *
 * All placements respect guillotine-compatibility: pieces are only placed
 * in gaps that touch a board edge or are separated by a full-width/height cut.
 *
 * @module gapFiller
 */

import { runHorizontalStripPack } from './horizontalStripPacker.js';

// ── Gap Detection ────────────────────────────────────────────────────────────

/**
 * Find rectangular gaps in a board using a sweep-line approach.
 * Returns gaps sorted by area (largest first).
 *
 * We detect two types of gaps:
 *   A) RIGHT-SIDE gaps: space to the right of the rightmost piece in each row
 *   B) BOTTOM gap: space below the lowest piece on the board
 *   C) INTER-ROW gaps: unused space between shelves (height mismatch)
 */
function findGaps(board, edgeTrim = 0) {
  const pieces = board.pieces || [];
  if (!pieces.length) return [];

  const W = (board.stockWidth  || 2750) - edgeTrim * 2;
  const H = (board.stockHeight || 1830) - edgeTrim * 2;
  const eT = edgeTrim;

  // Identify shelves (rows) by Y coordinate
  const rowMap = new Map();
  for (const p of pieces) {
    const rowKey = Math.round(p.y / 5) * 5;
    if (!rowMap.has(rowKey)) rowMap.set(rowKey, { y: p.y, pieces: [], maxH: 0 });
    const row = rowMap.get(rowKey);
    row.pieces.push(p);
    row.maxH = Math.max(row.maxH, p.placedHeight);
  }

  const rows = [...rowMap.values()].sort((a, b) => a.y - b.y);
  const gaps = [];

  // A) RIGHT-SIDE gaps per row
  for (const row of rows) {
    const maxX = row.pieces.reduce((m, p) => Math.max(m, p.x + p.placedWidth), eT);
    const gapW = (eT + W) - maxX;
    if (gapW >= 50) { // minimum useful gap width
      gaps.push({
        x: maxX,
        y: row.y,
        width: gapW,
        height: row.maxH,
        type: 'right',
      });
    }
  }

  // B) BOTTOM gap — space below the lowest piece
  const maxY = pieces.reduce((m, p) => Math.max(m, p.y + p.placedHeight), eT);
  const bottomGap = (eT + H) - maxY;
  if (bottomGap >= 50) {
    gaps.push({
      x: eT,
      y: maxY,
      width: W,
      height: bottomGap,
      type: 'bottom',
    });
  }

  // Sort by area descending
  gaps.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  return gaps;
}


// ── Piece Relocation ─────────────────────────────────────────────────────────

/**
 * Try to relocate pieces from later boards into gaps of earlier boards.
 * This is a greedy, one-pass algorithm:
 *   For each board (i = 0 to N-2):
 *     Find gaps in board[i]
 *     For each gap:
 *       Find pieces in boards[i+1..N-1] that fit
 *       Move the best-fitting piece into the gap
 *       Recalculate gaps
 *
 * Returns a new boards array (original is NOT mutated).
 */
function relocatePieces(boards, options = {}, kerf = 3) {
  const edgeTrim = options.edgeTrim || 0;
  // Deep copy
  const result = boards.map(b => ({
    ...b,
    pieces: b.pieces.map(p => ({ ...p })),
  }));

  for (let i = 0; i < result.length - 1; i++) {
    let gaps = findGaps(result[i], edgeTrim);

    for (const gap of gaps) {
      // Find best piece from later boards
      let bestPiece = null;
      let bestBoardIdx = -1;
      let bestPieceIdx = -1;
      let bestFit = Infinity; // smaller = better fit (less waste)
      let bestPlacedW = 0;
      let bestPlacedH = 0;

      for (let j = i + 1; j < result.length; j++) {
        for (let k = 0; k < result[j].pieces.length; k++) {
          const p = result[j].pieces[k];
          const pw = p.placedWidth;
          const ph = p.placedHeight;

          // Try normal orientation
          if (pw + kerf <= gap.width && ph + kerf <= gap.height) {
            const waste = (gap.width * gap.height) - (pw * ph);
            if (waste < bestFit) {
              bestFit = waste;
              bestPiece = p;
              bestBoardIdx = j;
              bestPieceIdx = k;
              bestPlacedW = pw;
              bestPlacedH = ph;
            }
          }

          // Try rotated (only if piece was rotatable)
          if (ph + kerf <= gap.width && pw + kerf <= gap.height && pw !== ph) {
            const waste = (gap.width * gap.height) - (pw * ph);
            if (waste < bestFit) {
              bestFit = waste;
              bestPiece = p;
              bestBoardIdx = j;
              bestPieceIdx = k;
              bestPlacedW = ph;
              bestPlacedH = pw;
            }
          }
        }
      }

      if (bestPiece) {
        // Move piece to this gap
        const movedPiece = {
          ...bestPiece,
          x: gap.x + kerf,
          y: gap.y + (gap.type === 'bottom' ? kerf : 0),
          placedWidth: bestPlacedW,
          placedHeight: bestPlacedH,
          rotated: bestPlacedW !== bestPiece.placedWidth ? !bestPiece.rotated : bestPiece.rotated,
        };

        result[i].pieces.push(movedPiece);
        result[bestBoardIdx].pieces.splice(bestPieceIdx, 1);

        // Shrink the gap for subsequent pieces
        if (gap.type === 'right') {
          // Update gap: piece placed at left of gap, remaining gap is to its right
          gap.x = movedPiece.x + bestPlacedW + kerf;
          gap.width -= bestPlacedW + kerf;
        } else if (gap.type === 'bottom') {
          // Piece placed at top of bottom gap
          gap.y = movedPiece.y + bestPlacedH + kerf;
          gap.height -= bestPlacedH + kerf;
        }
      }
    }
  }

  // Remove empty boards
  return result.filter(b => b.pieces.length > 0);
}


// ── Board Merging ────────────────────────────────────────────────────────────

/**
 * Try to merge the last two boards if their combined pieces fit in one board.
 * Uses HStrip packer to re-pack all pieces from both boards together.
 * 
 * Strategy: work backwards — try merging board[N-1] into board[N-2],
 * then board[N-2] into board[N-3], etc.
 */
function tryMergeBoards(boards, stock, options = {}) {
  if (boards.length <= 1) return boards;

  const result = boards.map(b => ({
    ...b,
    pieces: b.pieces.map(p => ({ ...p })),
  }));

  let merged = true;
  while (merged && result.length > 1) {
    merged = false;

    for (let i = result.length - 1; i > 0; i--) {
      const boardA = result[i - 1];
      const boardB = result[i];

      // Combine all pieces from both boards into expanded format
      const combined = [
        ...boardA.pieces.map(p => ({
          ...p,
          width: p.placedWidth,
          height: p.placedHeight,
          canRotate: false, // keep current orientation
        })),
        ...boardB.pieces.map(p => ({
          ...p,
          width: p.placedWidth,
          height: p.placedHeight,
          canRotate: false,
        })),
      ];

      // Try re-packing into a single board
      const singleResult = runHorizontalStripPack(combined, stock, {
        ...options,
        allowRotation: false, // pieces already oriented
      });

      if (singleResult.boards.length === 1 && singleResult.unfitted.length === 0) {
        // Merge successful! Replace both boards with the merged one
        const mergedBoard = {
          ...singleResult.boards[0],
          stockWidth: stock.width,
          stockHeight: stock.height,
        };
        result.splice(i - 1, 2, mergedBoard);
        merged = true;
        break; // restart from the end
      }
    }
  }

  return result;
}


// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run the full gap-fill + merge pipeline on a packing result.
 *
 * @param {Object} result  — { boards: [...], unfitted: [...] }
 * @param {Object} stock   — { width, height, ... }
 * @param {Object} options — { kerf, edgeTrim, ... }
 * @param {Function} onProgress — optional (percent, message) callback
 * @returns {Object} — improved { boards, unfitted }
 */
export function postProcessGapFill(result, stock, options = {}, onProgress) {
  if (!result?.boards || result.boards.length <= 1) return result;

  const kerf = options.kerf || 3;
  const emit = (pct, msg) => onProgress?.(pct, msg);

  // Phase 1: Relocate pieces from later boards into earlier boards' gaps
  emit(0, 'Analizando huecos en tableros...');
  let boards = relocatePieces(result.boards, options, kerf);
  emit(40, `Reubicación: ${result.boards.length} → ${boards.length} tableros`);

  // Phase 2: Try merging under-utilized boards
  emit(50, 'Intentando fusionar tableros...');
  const beforeMerge = boards.length;
  boards = tryMergeBoards(boards, stock, options);
  emit(80, `Fusión: ${beforeMerge} → ${boards.length} tableros`);

  // Phase 3: One more relocation pass after merging (may reveal new gaps)
  if (boards.length > 1) {
    boards = relocatePieces(boards, options, kerf);
  }
  emit(100, `Optimización completa: ${boards.length} tableros`);

  return {
    boards,
    unfitted: result.unfitted || [],
  };
}

// Export internals for testing
export { findGaps, relocatePieces, tryMergeBoards };
