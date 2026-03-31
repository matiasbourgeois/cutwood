export function runHorizontalStripPack(expandedPieces, stock, options = {}) {
  const { kerf = 3, edgeTrim = 0, allowRotation = true } = options;
  const boardGrain = stock.grain || 'none';
  const W = stock.width - edgeTrim * 2;
  const H = stock.height - edgeTrim * 2;

  if (W <= 0 || H <= 0 || !expandedPieces.length)
    return { boards: [], unfitted: [...expandedPieces] };

  // Choose orientation: prefer smaller height for shelf efficiency
  const fitted = [], unfitted = [];
  for (const p of expandedPieces) {
    const canRot = allowRotation && p.canRotate !== false;
    const w1 = p.width, h1 = p.height;
    const w2 = p.height, h2 = p.width;
    const f1 = w1 <= W && h1 <= H, f2 = canRot && w2 <= W && h2 <= H;
    if (!f1 && !f2) { unfitted.push(p); continue; }
    if (f1 && f2) fitted.push(h1 <= h2 ? { p, w:w1, h:h1, rot:false } : { p, w:w2, h:h2, rot:true });
    else if (f1)  fitted.push({ p, w:w1, h:h1, rot:false });
    else          fitted.push({ p, w:w2, h:h2, rot:true });
  }

  // Sort: tall+wide first
  fitted.sort((a, b) => b.h - a.h || b.w - a.w);

  // Shelf structure:
  //   mainItems  — placed left-to-right in the main row
  //   subCols    — vertical sub-columns packed in the RIGHT residual space
  //   mainW      — width used by main items + kerfs
  //   subW       — width used by all sub-cols + kerfs
  //   Total horizontal used = mainW + (subW > 0 ? kerf + subW : 0)
  const shelves = [];

  function shelfAvailableForMain(s) {
    return W - s.mainW - (s.subW > 0 ? kerf + s.subW : 0);
  }

  function placeInMain(s, item) {
    s.mainW += (s.mainItems.length > 0 ? kerf : 0) + item.w;
    s.mainItems.push(item);
  }

  function placeInSubCol(s, sc, item) {
    sc.usedH += (sc.items.length > 0 ? kerf : 0) + item.h;
    sc.items.push(item);
  }

  for (const item of fitted) {
    let placed = false;

    // ── Priority 1: exact-height fit in existing shelf main row ──
    for (const s of shelves) {
      if (item.h === s.h && shelfAvailableForMain(s) >= item.w) {
        placeInMain(s, item); placed = true; break;
      }
    }

    // ── Priority 2: fit into an existing sub-column (no new board height) ──
    if (!placed) {
      let bestSub = null, bestSubWaste = Infinity;
      for (const s of shelves) {
        if (item.h > s.h) continue;
        for (const sc of s.subCols) {
          const spaceH = s.h - sc.usedH - (sc.items.length > 0 ? kerf : 0);
          if (item.w <= sc.w && item.h <= spaceH) {
            const waste = s.h - item.h;
            if (waste < bestSubWaste) { bestSubWaste = waste; bestSub = { s, sc }; }
          }
        }
      }
      if (bestSub) { placeInSubCol(bestSub.s, bestSub.sc, item); placed = true; }
    }

    // ── Priority 3: open a NEW sub-column in existing shelf's residual ──
    if (!placed) {
      let bestNew = null, bestNewWaste = Infinity;
      for (const s of shelves) {
        if (item.h > s.h) continue;
        // Available residual width for a new sub-col
        const residualAvail = W - s.mainW - (s.subW > 0 ? kerf + s.subW : 0) - kerf;
        if (item.w <= residualAvail) {
          const waste = s.h - item.h;
          if (waste < bestNewWaste) { bestNewWaste = waste; bestNew = s; }
        }
      }
      if (bestNew) {
        const sc = { w: item.w, usedH: item.h, items: [item] };
        bestNew.subCols.push(sc);
        bestNew.subW += (bestNew.subCols.length > 1 ? kerf : 0) + item.w;
        placed = true;
      }
    }

    // ── Priority 4: best-fit into existing shelf main row (any height waste) ──
    if (!placed) {
      let best = null, bestWaste = Infinity;
      for (const s of shelves) {
        if (item.h <= s.h && shelfAvailableForMain(s) >= item.w) {
          const waste = s.h - item.h;
          if (waste < bestWaste) { bestWaste = waste; best = s; }
        }
      }
      if (best) { placeInMain(best, item); placed = true; }
    }

    // ── Priority 5: open a new shelf ──
    if (!placed) {
      shelves.push({ h: item.h, mainW: item.w, mainItems: [item], subCols: [], subW: 0 });
    }
  }

  // ── Pack shelves onto boards (greedy skip-fill) ──
  const boards = [];
  const toPlace = [...shelves].sort((a, b) => b.h - a.h);

  while (toPlace.length > 0) {
    const board = { stockWidth: stock.width, stockHeight: stock.height, boardGrain, pieces: [], usedH: 0 };
    let i = 0;
    while (i < toPlace.length) {
      const shelf = toPlace[i];
      const needed = shelf.h + (board.usedH > 0 ? kerf : 0);
      if (board.usedH + needed <= H) {
        const shelfY = edgeTrim + board.usedH + (board.usedH > 0 ? kerf : 0);
        // Place main items
        let curX = edgeTrim;
        for (const item of shelf.mainItems) {
          board.pieces.push({ ...item.p, x: curX, y: shelfY,
            placedWidth: item.w, placedHeight: item.h,
            rotated: item.rot !== (item.p.forceRotated || false) });
          curX += item.w + kerf;
        }
        // Place sub-columns (packed to the right of main items)
        let subX = edgeTrim + shelf.mainW + kerf;
        for (const sc of shelf.subCols) {
          let subY = shelfY;
          for (const item of sc.items) {
            board.pieces.push({ ...item.p, x: subX, y: subY,
              placedWidth: item.w, placedHeight: item.h,
              rotated: item.rot !== (item.p.forceRotated || false) });
            subY += item.h + kerf;
          }
          subX += sc.w + kerf;
        }
        board.usedH += needed;
        toPlace.splice(i, 1);
      } else i++;
    }
    if (board.pieces.length > 0) boards.push(board);
    else { for (const s of toPlace) for (const it of s.mainItems) unfitted.push(it.p); break; }
  }

  return { boards, unfitted };
}
