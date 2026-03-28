/**
 * Strip-Based Packer v3 — Industry-Standard Layout for Panel Saws
 *
 * Strategy: group pieces by width into vertical strips.
 * Each strip = a column of pieces with the same (or similar) width.
 * Strips are placed left-to-right. Within each strip, pieces stack top-to-bottom.
 *
 * This produces CutList-style sequences:
 *   V@strip1 → V@strip2 → ... then H@piece within each strip
 */

export function runStripPack(expandedPieces, stock, options = {}) {
  const { kerf = 3, edgeTrim = 0, allowRotation = true } = options;
  const boardGrain = stock.grain || 'none';
  const W = stock.width - edgeTrim * 2;
  const H = stock.height - edgeTrim * 2;

  if (W <= 0 || H <= 0 || !expandedPieces.length) {
    return { boards: [], unfitted: [...expandedPieces] };
  }

  // For each piece, compute both orientations
  const items = expandedPieces.map(p => {
    const cr = allowRotation && (p.canRotate !== false);
    return { p, w1: p.width, h1: p.height, w2: cr ? p.height : p.width, h2: cr ? p.width : p.height, cr };
  });

  // Try multiple grouping strategies and pick the one that fits in fewest boards
  let bestResult = null;
  let bestBoardCount = Infinity;

  for (const strategy of ['natural', 'rotated', 'mixed-wide', 'mixed-narrow']) {
    const result = tryStrategy(items, strategy, W, H, kerf, edgeTrim, stock, boardGrain);
    if (result && result.boards.length < bestBoardCount) {
      bestBoardCount = result.boards.length;
      bestResult = result;
    }
    if (result && result.boards.length === bestBoardCount && bestResult) {
      // Same board count — pick higher utilization
      const rUtil = result.boards.reduce((s,b) => s + b.pieces.reduce((a,p) => a + p.placedWidth * p.placedHeight, 0), 0);
      const bUtil = bestResult.boards.reduce((s,b) => s + b.pieces.reduce((a,p) => a + p.placedWidth * p.placedHeight, 0), 0);
      if (rUtil > bUtil) bestResult = result;
    }
  }

  return bestResult || { boards: [], unfitted: expandedPieces.map(i => i.p || i) };
}

function tryStrategy(items, strategy, W, H, kerf, edgeTrim, stock, boardGrain) {
  // Assign orientation to each piece based on strategy
  const entries = [];
  for (const it of items) {
    let w, h, rot;
    const fits1 = it.w1 <= W && it.h1 <= H;
    const fits2 = it.w2 <= W && it.h2 <= H;

    switch (strategy) {
      case 'natural':
        if (!fits1) { if (!fits2) continue; w = it.w2; h = it.h2; rot = true; break; }
        w = it.w1; h = it.h1; rot = false; break;
      case 'rotated':
        if (!it.cr || !fits2) { if (!fits1) continue; w = it.w1; h = it.h1; rot = false; break; }
        w = it.w2; h = it.h2; rot = true; break;
      case 'mixed-wide':
        // Prefer wider orientation (fits more per strip height)
        if (fits1 && fits2 && it.cr) { 
          if (it.w1 >= it.w2) { w = it.w1; h = it.h1; rot = false; }
          else { w = it.w2; h = it.h2; rot = true; }
        } else if (fits1) { w = it.w1; h = it.h1; rot = false; }
        else if (fits2 && it.cr) { w = it.w2; h = it.h2; rot = true; }
        else continue;
        break;
      case 'mixed-narrow':
        // Prefer narrower width (more strips fit side by side)
        if (fits1 && fits2 && it.cr) {
          if (it.w1 <= it.w2) { w = it.w1; h = it.h1; rot = false; }
          else { w = it.w2; h = it.h2; rot = true; }
        } else if (fits1) { w = it.w1; h = it.h1; rot = false; }
        else if (fits2 && it.cr) { w = it.w2; h = it.h2; rot = true; }
        else continue;
        break;
    }
    entries.push({ item: it, w, h, rot });
  }

  // Group entries by width
  const groups = [];
  // Sort descending by width for consistent grouping
  entries.sort((a, b) => b.w - a.w);

  for (const e of entries) {
    let added = false;
    for (const g of groups) {
      if (Math.abs(g.width - e.w) <= kerf) {
        g.entries.push(e);
        g.width = Math.max(g.width, e.w);
        added = true;
        break;
      }
    }
    if (!added) {
      groups.push({ width: e.w, entries: [e] });
    }
  }

  // Build strips from groups (split if height exceeds board)
  const strips = [];
  for (const g of groups) {
    g.entries.sort((a, b) => b.h - a.h); // Tallest first
    let strip = { width: g.width, entries: [], totalH: 0 };
    for (const e of g.entries) {
      if (strip.entries.length > 0 && strip.totalH + e.h > H) {
        strips.push(strip);
        strip = { width: g.width, entries: [], totalH: 0 };
      }
      strip.entries.push(e);
      strip.totalH += e.h + kerf;
    }
    if (strip.entries.length) strips.push(strip);
  }

  // Sort strips: tallest first
  strips.sort((a, b) => b.totalH - a.totalH);

  // Place strips on boards left-to-right
  const boards = [];
  const unfitted = [];

  for (const strip of strips) {
    let placed = false;
    for (const board of boards) {
      if (board.usedW + strip.width + kerf <= W) {
        placeStrip(board, strip, edgeTrim, kerf);
        placed = true;
        break;
      }
    }
    if (!placed) {
      if (strip.width <= W) {
        const board = {
          stockWidth: stock.width, stockHeight: stock.height, boardGrain,
          pieces: [], usedW: 0, strips: [],
        };
        placeStrip(board, strip, edgeTrim, kerf);
        boards.push(board);
      } else {
        for (const e of strip.entries) unfitted.push(e.item.p);
      }
    }
  }

  return { boards, unfitted };
}

function placeStrip(board, strip, edgeTrim, kerf) {
  const x = board.usedW + edgeTrim;
  let y = edgeTrim;
  for (const e of strip.entries) {
    board.pieces.push({
      ...e.item.p,
      x, y,
      placedWidth: e.w,
      placedHeight: e.h,
      rotated: e.rot,
    });
    y += e.h + kerf;
  }
  board.usedW += strip.width + kerf;
  board.strips.push(strip);
}
