/**
 * tests/validators.mjs
 * Funciones de validación geométrica compartidas por toda la suite.
 * Cada función retorna { ok: bool, msg: string }.
 */

/** Verifica que ningún par de piezas en el tablero se superponga. */
export function assertNoPieceOverlap(board, tol = 0.5) {
  const ps = board.pieces;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      const ax1 = a.x, ax2 = a.x + a.placedWidth;
      const ay1 = a.y, ay2 = a.y + a.placedHeight;
      const bx1 = b.x, bx2 = b.x + b.placedWidth;
      const by1 = b.y, by2 = b.y + b.placedHeight;
      const overlapX = ax1 < bx2 - tol && ax2 > bx1 + tol;
      const overlapY = ay1 < by2 - tol && ay2 > by1 + tol;
      if (overlapX && overlapY) {
        return { ok: false, msg: `Piezas [${i}] y [${j}] se solapan: (${ax1},${ay1},${a.placedWidth}×${a.placedHeight}) vs (${bx1},${by1},${b.placedWidth}×${b.placedHeight})` };
      }
    }
  }
  return { ok: true, msg: 'Sin solapamientos' };
}

/** Verifica que todas las piezas estén dentro de los límites del tablero. */
export function assertAllWithinBoard(board, tol = 1) {
  const W = board.stockWidth, H = board.stockHeight;
  for (let i = 0; i < board.pieces.length; i++) {
    const p = board.pieces[i];
    if (p.x < -tol || p.y < -tol) return { ok: false, msg: `Pieza [${i}] tiene coordenadas negativas: x=${p.x}, y=${p.y}` };
    if (p.x + p.placedWidth > W + tol) return { ok: false, msg: `Pieza [${i}] excede ancho del tablero: x+w=${p.x+p.placedWidth} > stockW=${W}` };
    if (p.y + p.placedHeight > H + tol) return { ok: false, msg: `Pieza [${i}] excede alto del tablero: y+h=${p.y+p.placedHeight} > stockH=${H}` };
    if (p.placedWidth <= 0 || p.placedHeight <= 0) return { ok: false, msg: `Pieza [${i}] tiene dimensiones inválidas: ${p.placedWidth}×${p.placedHeight}` };
  }
  return { ok: true, msg: 'Todas las piezas dentro del tablero' };
}

/** Verifica que placed + unfitted = total de piezas expandidas. */
export function assertPieceCount(result, totalExpanded) {
  const placed = result.boards.reduce((s, b) => s + b.pieces.length, 0);
  const unfitted = result.unfitted?.length ?? 0;
  const total = placed + unfitted;
  if (total !== totalExpanded) {
    return { ok: false, msg: `Conteo incorrecto: placed(${placed}) + unfitted(${unfitted}) = ${total} ≠ expected(${totalExpanded})` };
  }
  return { ok: true, msg: `Conteo correcto: ${placed} placed + ${unfitted} unfitted` };
}

/** Verifica que la utilización reportada sea consistente con las áreas reales (±1%). */
export function assertUtilizationConsistent(result, tol = 1.0) {
  for (let i = 0; i < result.boards.length; i++) {
    const b = result.boards[i];
    const stockArea = b.stockWidth * b.stockHeight;
    if (stockArea <= 0) continue;
    const usedArea = b.pieces.reduce((s, p) => s + p.placedWidth * p.placedHeight, 0);
    const reportedUtil = b.bin?.getUtilization?.() ?? (usedArea / stockArea * 100);
    const computedUtil = usedArea / stockArea * 100;
    if (Math.abs(reportedUtil - computedUtil) > tol) {
      return { ok: false, msg: `Tablero[${i}]: utilización reportada ${reportedUtil.toFixed(2)}% ≠ calculada ${computedUtil.toFixed(2)}%` };
    }
  }
  return { ok: true, msg: 'Utilización consistente' };
}

/** Verifica que ninguna pieza tenga coordenadas negativas. */
export function assertNoNegativeCoords(board) {
  for (let i = 0; i < board.pieces.length; i++) {
    const p = board.pieces[i];
    if (p.x < 0 || p.y < 0) return { ok: false, msg: `Pieza [${i}] tiene coords negativas: x=${p.x}, y=${p.y}` };
  }
  return { ok: true, msg: 'Sin coordenadas negativas' };
}

/** Verifica que piezas con canRotate=false no estén rotadas. */
export function assertRotationRespected(board, expandedPieces) {
  for (const p of board.pieces) {
    // Find matching expanded piece by id+copy
    const orig = expandedPieces.find(e => e.id === p.id && e.canRotate === false);
    if (!orig) continue;
    // If canRotate=false, placedWidth must equal original width (or forced-rotated width)
    const expectedW = orig.forceRotated ? orig.height : orig.width;
    const expectedH = orig.forceRotated ? orig.width  : orig.height;
    if (Math.abs(p.placedWidth - expectedW) > 1 || Math.abs(p.placedHeight - expectedH) > 1) {
      return { ok: false, msg: `Pieza id=${p.id} con canRotate=false fue rotada: placed ${p.placedWidth}×${p.placedHeight} ≠ expected ${expectedW}×${expectedH}` };
    }
  }
  return { ok: true, msg: 'Rotaciones respetadas' };
}

/** Aplica todos los validators a un resultado completo. Retorna array de errores. */
export function validateResult(result, expandedPieces = [], label = '') {
  const errors = [];
  const totalExpanded = expandedPieces.length;

  // Global checks
  const countCheck = assertPieceCount(result, totalExpanded);
  if (!countCheck.ok) errors.push(`[${label}] CONTEO: ${countCheck.msg}`);

  // Per-board checks
  for (let i = 0; i < result.boards.length; i++) {
    const b = result.boards[i];
    const overlapCheck = assertNoPieceOverlap(b);
    if (!overlapCheck.ok) errors.push(`[${label}] TABLERO-${i+1} OVERLAP: ${overlapCheck.msg}`);

    const boundsCheck = assertAllWithinBoard(b);
    if (!boundsCheck.ok) errors.push(`[${label}] TABLERO-${i+1} BOUNDS: ${boundsCheck.msg}`);

    const coordCheck = assertNoNegativeCoords(b);
    if (!coordCheck.ok) errors.push(`[${label}] TABLERO-${i+1} NEGCOORDS: ${coordCheck.msg}`);

    if (expandedPieces.length > 0) {
      const rotCheck = assertRotationRespected(b, expandedPieces);
      if (!rotCheck.ok) errors.push(`[${label}] TABLERO-${i+1} ROTATION: ${rotCheck.msg}`);
    }
  }

  return errors;
}
