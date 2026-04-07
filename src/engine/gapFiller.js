/**
 * Gap-Fill Post-Processor for CutWood Deep Mode v2.0
 *
 * After the HStrip/Lepton packer produces an initial layout, this module:
 *   1. Scans each board for unused rectangular regions (gaps)
 *   2. Attempts to STACK multiple pieces into each gap (not just one!)
 *   3. Attempts to MERGE under-utilized boards by re-packing them together
 *   4. Returns a compacted result with fewer (or equal) boards
 *
 * Key improvement over v1: Sub-column stacking within gaps.
 * A gap of 131×450mm can fit 3-4 thin pieces stacked vertically.
 *
 * @module gapFiller
 */

import { runHorizontalStripPack } from './horizontalStripPacker.js';

// ── Gap Detection ────────────────────────────────────────────────────────────

/**
 * Find ALL rectangular gaps in a board using a comprehensive scan.
 * Returns gaps sorted by area (largest first).
 *
 * Detects three types of gaps:
 *   A) INTER-PIECE gaps: unused space between pieces within a row
 *   B) RIGHT-SIDE gaps: space to the right of the rightmost piece in each row
 *   C) BOTTOM gap: space below the lowest piece on the board
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

  for (const row of rows) {
    // Sort pieces in this row by X coordinate
    const sorted = [...row.pieces].sort((a, b) => a.x - b.x);

    // A) INTER-PIECE gaps — space between consecutive pieces in the same row
    for (let k = 0; k < sorted.length - 1; k++) {
      const curr = sorted[k];
      const next = sorted[k + 1];
      const gapX = curr.x + curr.placedWidth;
      const gapW = next.x - gapX;
      if (gapW >= 50) {
        gaps.push({
          x: gapX,
          y: row.y,
          width: gapW,
          height: row.maxH,
          type: 'inter',
        });
      }
    }

    // B) RIGHT-SIDE gap — space to the right of the rightmost piece
    const maxX = sorted.reduce((m, p) => Math.max(m, p.x + p.placedWidth), eT);
    const gapW = (eT + W) - maxX;
    if (gapW >= 50) {
      gaps.push({
        x: maxX,
        y: row.y,
        width: gapW,
        height: row.maxH,
        type: 'right',
      });
    }
  }

  // C) BOTTOM gap — space below the lowest piece
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


// ── Piece Relocation with Sub-Column Stacking ────────────────────────────────

/**
 * Try to relocate pieces from later boards into gaps of earlier boards.
 * 
 * KEY FEATURE: Sub-column stacking.
 * For each gap, we don't just place ONE piece — we try to STACK multiple
 * pieces vertically within the gap (like Lepton does in its side-columns).
 * 
 * Example: A gap of 131×450mm can fit:
 *   P5 (414×100) rotated to 100×414 → 100mm wide, 414mm tall → NO (414 > 450 but close)
 *   Actually it stacks: piece1 at y=0 (120mm tall), piece2 at y=125 (120mm), etc.
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
    const gaps = findGaps(result[i], edgeTrim);

    for (const gap of gaps) {
      // For each gap, try to fill it with MULTIPLE pieces stacked
      _fillGapWithStack(gap, result, i, kerf);
    }
  }

  // Remove empty boards
  return result.filter(b => b.pieces.length > 0);
}

/**
 * Check if placing a piece at (x, y) with dimensions (w, h) would
 * overlap with any existing piece on the board.
 */
function wouldOverlap(boardPieces, x, y, w, h, kerf) {
  for (const p of boardPieces) {
    // Check AABB overlap (with kerf margin)
    const noOverlap =
      x + w + kerf <= p.x ||     // new piece is fully left
      p.x + p.placedWidth + kerf <= x ||  // new piece is fully right
      y + h + kerf <= p.y ||     // new piece is fully above
      p.y + p.placedHeight + kerf <= y;   // new piece is fully below
    if (!noOverlap) return true;
  }
  return false;
}


/**
 * Fill a single gap with as many pieces as possible from later boards.
 * Pieces are stacked vertically within the gap (sub-column packing).
 * Now includes collision detection to prevent overlapping.
 */
function _fillGapWithStack(gap, boards, targetBoardIdx, kerf) {
  let currentX = gap.x + kerf;
  let currentY = gap.y;
  let columnW = 0; // width of current column
  let remainingH = gap.height;
  let remainingW = gap.width - kerf;

  let placedCount = 0;
  const MAX_ATTEMPTS = 50; // safety limit

  for (let attempt = 0; attempt < MAX_ATTEMPTS && remainingW > 50; attempt++) {
    // Find best piece that fits in remaining space [remainingW × remainingH]
    let best = null;
    let bestBoardIdx = -1;
    let bestPieceIdx = -1;
    let bestW = 0;
    let bestH = 0;
    let bestWaste = Infinity;

    for (let j = targetBoardIdx + 1; j < boards.length; j++) {
      for (let k = 0; k < boards[j].pieces.length; k++) {
        const p = boards[j].pieces[k];
        const pw = p.placedWidth;
        const ph = p.placedHeight;

        // Try normal orientation
        if (pw <= remainingW && ph <= remainingH) {
          // Check collision BEFORE considering this piece
          if (!wouldOverlap(boards[targetBoardIdx].pieces, currentX, currentY, pw, ph, kerf)) {
            const waste = remainingH - ph;
            if (waste < bestWaste || (waste === bestWaste && pw * ph > bestW * bestH)) {
              bestWaste = waste;
              best = p; bestBoardIdx = j; bestPieceIdx = k;
              bestW = pw; bestH = ph;
            }
          }
        }

        // Try rotated
        if (ph <= remainingW && pw <= remainingH && pw !== ph) {
          if (!wouldOverlap(boards[targetBoardIdx].pieces, currentX, currentY, ph, pw, kerf)) {
            const waste = remainingH - pw;
            if (waste < bestWaste || (waste === bestWaste && pw * ph > bestW * bestH)) {
              bestWaste = waste;
              best = p; bestBoardIdx = j; bestPieceIdx = k;
              bestW = ph; bestH = pw;
            }
          }
        }
      }
    }

    if (!best) {
      // No piece fits in current column space. Start new column?
      if (columnW > 0) {
        currentX += columnW + kerf;
        remainingW -= columnW + kerf;
        currentY = gap.y;
        remainingH = gap.height;
        columnW = 0;
        continue; // retry with new column
      }
      break; // truly no piece fits anywhere
    }

    // Place piece
    const movedPiece = {
      ...best,
      x: currentX,
      y: currentY,
      placedWidth: bestW,
      placedHeight: bestH,
      rotated: bestW !== best.placedWidth ? !best.rotated : best.rotated,
    };

    boards[targetBoardIdx].pieces.push(movedPiece);
    boards[bestBoardIdx].pieces.splice(bestPieceIdx, 1);
    placedCount++;

    // Update column tracking
    columnW = Math.max(columnW, bestW);
    currentY += bestH + kerf;
    remainingH -= bestH + kerf;

    // If no more vertical space, start new column
    if (remainingH < 50) {
      currentX += columnW + kerf;
      remainingW -= columnW + kerf;
      currentY = gap.y;
      remainingH = gap.height;
      columnW = 0;
    }
  }

  return placedCount;
}


// ── Board Merging ────────────────────────────────────────────────────────────

/**
 * Try to merge boards by re-packing their combined pieces into fewer boards.
 * Works backwards: try merging board[N-1] into board[N-2], etc.
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

      const combined = [
        ...boardA.pieces.map(p => ({
          ...p,
          width: p.placedWidth,
          height: p.placedHeight,
          canRotate: false,
        })),
        ...boardB.pieces.map(p => ({
          ...p,
          width: p.placedWidth,
          height: p.placedHeight,
          canRotate: false,
        })),
      ];

      const singleResult = runHorizontalStripPack(combined, stock, {
        ...options,
        allowRotation: false,
      });

      if (singleResult.boards.length === 1 && singleResult.unfitted.length === 0) {
        const mergedBoard = {
          ...singleResult.boards[0],
          stockWidth: stock.width,
          stockHeight: stock.height,
        };
        result.splice(i - 1, 2, mergedBoard);
        merged = true;
        break;
      }
    }
  }

  return result;
}


/**
 * Compact rows within each board by closing inter-piece gaps.
 * 
 * Example BEFORE: [P18(734)][P18(734)]  [GAP 422mm]  [P10(704)]
 * Example AFTER:  [P18(734)][P18(734)][P10(704)]  [GAP 562mm on right]
 * 
 * This makes cutting MUCH easier because:
 * - Big pieces are all together (fewer cuts needed)
 * - Gap space is consolidated to the right edge
 * - Thin pieces can be placed in one clean area
 */
function compactRows(boards, kerf = 3) {
  return boards.map(board => {
    const pieces = board.pieces.map(p => ({ ...p }));
    
    // Group pieces by row (Y coordinate)
    const rowMap = new Map();
    for (const p of pieces) {
      const rowKey = Math.round(p.y / 5) * 5;
      if (!rowMap.has(rowKey)) rowMap.set(rowKey, []);
      rowMap.get(rowKey).push(p);
    }
    
    for (const [, rowPieces] of rowMap) {
      // Sort by X position
      rowPieces.sort((a, b) => a.x - b.x);
      
      if (rowPieces.length < 2) continue;
      
      // Check for inter-piece gaps and close them
      for (let k = 1; k < rowPieces.length; k++) {
        const prev = rowPieces[k - 1];
        const expectedX = prev.x + prev.placedWidth + kerf;
        const curr = rowPieces[k];
        
        if (curr.x > expectedX + 5) { // gap > 5mm = worth compacting
          // Shift this piece (and all after it) left to close the gap
          const shift = curr.x - expectedX;
          for (let m = k; m < rowPieces.length; m++) {
            rowPieces[m].x -= shift;
          }
        }
      }
    }
    
    return { ...board, pieces };
  });
}

/**
 * Re-pack boards that have excessive waste (scattered thin pieces).
 * When a board has >40% waste, re-pack all its pieces using HStrip
 * to get a tighter layout with pieces grouped by height.
 */
function repackScatteredBoards(boards, stock, options = {}) {
  return boards.map(board => {
    const pieces = board.pieces || [];
    if (pieces.length < 3) return board;

    // Calculate utilization
    const W = stock.width;
    const H = stock.height;
    const totalArea = W * H;
    const usedArea = pieces.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0);
    const util = usedArea / totalArea;

    // Only re-pack if utilization < 60% (lots of waste = scattered layout)
    if (util >= 0.60) return board;

    // Re-pack using HStrip
    const expandedPieces = pieces.map(p => ({
      ...p,
      width: p.placedWidth,
      height: p.placedHeight,
      quantity: 1,
      canRotate: false,
    }));

    try {
      const repacked = runHorizontalStripPack(expandedPieces, stock, {
        ...options,
        allowRotation: false,
      });

      if (repacked.boards.length === 1 && repacked.unfitted.length === 0) {
        // Copy over the original piece metadata (names, IDs, etc)
        const newBoard = repacked.boards[0];
        // Map repacked pieces back to originals
        for (let i = 0; i < newBoard.pieces.length; i++) {
          const rp = newBoard.pieces[i];
          // Find the matching original piece by dimensions
          const orig = expandedPieces.find(ep => 
            ep.width === rp.placedWidth && ep.height === rp.placedHeight && !ep._used
          ) || expandedPieces.find(ep =>
            ep.height === rp.placedWidth && ep.width === rp.placedHeight && !ep._used
          );
          if (orig) {
            orig._used = true;
            rp.name = orig.name;
            rp.id = orig.id;
          }
        }
        return {
          ...newBoard,
          stockWidth: stock.width,
          stockHeight: stock.height,
        };
      }
    } catch (e) { /* keep original */ }

    return board;
  });
}


// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run the full gap-fill + merge pipeline on a packing result.
 */
export function postProcessGapFill(result, stock, options = {}, onProgress) {
  if (!result?.boards || result.boards.length <= 1) return result;

  const kerf = options.kerf || 3;
  const emit = (pct, msg) => onProgress?.(pct, msg);

  // Phase 0: Compact rows — close internal gaps, push space to right edge
  emit(0, 'Fase gap-fill: compactando filas...');
  let boards = compactRows(result.boards, kerf);

  // Phase 1: Relocate with sub-column stacking
  emit(10, 'Fase gap-fill: analizando huecos...');
  boards = relocatePieces(boards, options, kerf);
  emit(30, `Reubicación: ${result.boards.length} → ${boards.length} tableros`);

  // Phase 2: Try merging under-utilized boards
  emit(40, 'Intentando fusionar tableros...');
  const beforeMerge = boards.length;
  boards = tryMergeBoards(boards, stock, options);
  emit(60, `Fusión: ${beforeMerge} → ${boards.length} tableros`);

  // Phase 3: Re-pack scattered boards (thin pieces in individual rows)
  emit(65, 'Re-empaquetando tableros dispersos...');
  boards = repackScatteredBoards(boards, stock, options);

  // Phase 4: Compact + relocate again after re-packing
  boards = compactRows(boards, kerf);
  if (boards.length > 1) {
    boards = relocatePieces(boards, options, kerf);
  }
  emit(80, `Re-empaquetado completo`);

  // Phase 5: Final merge attempt
  if (boards.length > 1) {
    boards = tryMergeBoards(boards, stock, options);
  }

  // Phase 6: Absorb near-empty last board into earlier boards.
  // When the last board has <10% util, try to place its pieces in the
  // bottom-gap of any earlier board. Eliminates "1 piece on Board 3".
  if (boards.length > 1) {
    const lastBoard = boards[boards.length - 1];
    const lastArea = lastBoard.pieces.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0);
    const lastUtil = lastArea / (lastBoard.stockWidth * lastBoard.stockHeight);

    if (lastUtil < 0.10 && lastBoard.pieces.length > 0) {
      const eT = options.edgeTrim || 0;
      let allAbsorbed = true;

      for (const orphan of lastBoard.pieces) {
        let placed = false;
        for (let bi = 0; bi < boards.length - 1 && !placed; bi++) {
          const b = boards[bi];
          const maxY = b.pieces.reduce((m, p) => Math.max(m, p.y + p.placedHeight), eT);
          const freeH = stock.height - eT - maxY - kerf;
          const freeW = stock.width - eT * 2;

          // Try normal orientation
          if (orphan.placedWidth <= freeW && orphan.placedHeight <= freeH) {
            b.pieces.push({ ...orphan, x: eT, y: maxY + kerf });
            placed = true;
          }
          // Try rotated
          if (!placed && orphan.placedWidth !== orphan.placedHeight &&
              orphan.placedHeight <= freeW && orphan.placedWidth <= freeH) {
            b.pieces.push({
              ...orphan, x: eT, y: maxY + kerf,
              placedWidth: orphan.placedHeight, placedHeight: orphan.placedWidth,
              rotated: !orphan.rotated,
            });
            placed = true;
          }
        }
        if (!placed) { allAbsorbed = false; break; }
      }

      if (allAbsorbed) boards = boards.slice(0, -1);
    }
  }

  emit(100, `Optimización completa: ${boards.length} tableros`);

  return {
    boards,
    unfitted: result.unfitted || [],
  };
}

// Export internals for testing
export { findGaps, relocatePieces, tryMergeBoards, repackScatteredBoards };
