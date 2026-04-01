/**
 * CutWood Result Validator
 * 
 * Validates packing results for:
 *   1. No piece overlaps (AABB collision detection)
 *   2. All pieces within board bounds
 *   3. All input pieces accounted for (placed or unfitted)
 *   4. Utilization <= 100% per board
 *
 * @module validate
 */

/**
 * Check if two pieces overlap (AABB collision).
 * Allows touching edges (kerf handles separation).
 */
function piecesOverlap(a, b) {
  return !(
    a.x + a.placedWidth  <= b.x ||
    b.x + b.placedWidth  <= a.x ||
    a.y + a.placedHeight <= b.y ||
    b.y + b.placedHeight <= a.y
  );
}

/**
 * Validate a complete optimization result.
 * 
 * @param {Object} result  - { boards: [...], unfitted: [...] }
 * @param {number} expectedPieceCount - total expanded pieces expected
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateResult(result, expectedPieceCount = null) {
  const errors = [];
  const warnings = [];

  if (!result || !result.boards) {
    errors.push('Result is null or has no boards');
    return { valid: false, errors, warnings };
  }

  let totalPlaced = 0;

  for (let b = 0; b < result.boards.length; b++) {
    const board = result.boards[b];
    const pieces = board.pieces || [];
    const W = board.stockWidth;
    const H = board.stockHeight;
    totalPlaced += pieces.length;

    // Check utilization
    const usedArea = pieces.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0);
    const totalArea = W * H;
    if (usedArea > totalArea * 1.001) { // allow 0.1% tolerance for rounding
      errors.push(`Board ${b + 1}: utilization ${(usedArea / totalArea * 100).toFixed(1)}% > 100%`);
    }

    // Check bounds
    for (const p of pieces) {
      if (p.x < -1 || p.y < -1) {
        errors.push(`Board ${b + 1}: piece "${p.name}" at (${p.x}, ${p.y}) is out of bounds (negative)`);
      }
      if (p.x + p.placedWidth > W + 1 || p.y + p.placedHeight > H + 1) {
        errors.push(`Board ${b + 1}: piece "${p.name}" extends beyond board (${p.x + p.placedWidth}>${W} or ${p.y + p.placedHeight}>${H})`);
      }
    }

    // Check overlaps (O(n²) but boards rarely have >50 pieces)
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        if (piecesOverlap(pieces[i], pieces[j])) {
          errors.push(
            `Board ${b + 1}: OVERLAP "${pieces[i].name}" (${pieces[i].x},${pieces[i].y},${pieces[i].placedWidth}x${pieces[i].placedHeight}) ` +
            `vs "${pieces[j].name}" (${pieces[j].x},${pieces[j].y},${pieces[j].placedWidth}x${pieces[j].placedHeight})`
          );
        }
      }
    }
  }

  // Check piece count
  const unfittedCount = result.unfitted?.length || 0;
  const accountedFor = totalPlaced + unfittedCount;

  if (expectedPieceCount !== null && accountedFor !== expectedPieceCount) {
    errors.push(`Piece count mismatch: placed=${totalPlaced} + unfitted=${unfittedCount} = ${accountedFor}, expected=${expectedPieceCount}`);
  }

  if (unfittedCount > 0) {
    warnings.push(`${unfittedCount} piece(s) could not be placed`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalBoards: result.boards.length,
      totalPlaced,
      totalUnfitted: unfittedCount,
    },
  };
}
