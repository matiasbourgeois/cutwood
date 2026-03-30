/**
 * CutWood — Skyline Bottom-Left Packer
 *
 * Fundamentally different approach vs Guillotine/MaxRects:
 * - Maintains a "skyline" (step function of occupied height per x)
 * - For each piece, finds the position that minimises the y-baseline
 *   (Bottom-Left fit) or minimises wasted area below the piece (Waste-Fit)
 * - Particularly strong with: narrow+tall pieces mixed with wide+short pieces,
 *   dense grids, and projects where Guillotine leaves staircase waste.
 *
 * Heuristics:
 *   'bl'  — Bottom-Left: pick the segment with lowest skyline
 *   'wf'  — Waste-Fit: pick the segment that wastes least area
 *   'min-max' — MinMax: minimise max skyline height after placement
 */

/** One segment of the skyline: x range [x, x+width), height y */
class SkylineSegment {
  constructor(x, y, width) {
    this.x = x;
    this.y = y;
    this.width = width;
  }
}

export class SkylineBin {
  /**
   * @param {number} binWidth
   * @param {number} binHeight
   * @param {string} heuristic  'bl' | 'wf' | 'min-max'
   * @param {boolean} allowRotation
   */
  constructor(binWidth, binHeight, heuristic = 'bl', allowRotation = true) {
    this.binWidth    = binWidth;
    this.binHeight   = binHeight;
    this.heuristic   = heuristic;
    this.allowRotation = allowRotation;

    // Skyline starts as a single flat segment at y=0
    this.skyline = [new SkylineSegment(0, 0, binWidth)];

    this.usedArea  = 0;
    this.freeRects = []; // populated lazily for compatibility with pipeline
    this.placements = []; // { x, y, width, height, piece }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Insert a piece. Returns placement { x, y } or null if it doesn't fit. */
  insert(pieceW, pieceH, piece) {
    const result = this._findBestNode(pieceW, pieceH);
    if (!result) return null;

    const { x, y, width, height } = result;
    this._addSkylineLevel(x, y, width, height);
    this.usedArea += width * height;
    const placement = { x, y, placedWidth: width, placedHeight: height };
    this.placements.push({ ...placement, piece });
    return placement;
  }

  getUtilization() {
    return this.binWidth * this.binHeight > 0
      ? this.usedArea / (this.binWidth * this.binHeight)
      : 0;
  }

  getWasteArea() {
    return this.binWidth * this.binHeight - this.usedArea;
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _findBestNode(w, h) {
    let best = null;

    const tryDimensions = (pw, ph) => {
      for (let i = 0; i < this.skyline.length; i++) {
        const fit = this._fitAtSegment(i, pw, ph);
        if (!fit) continue;

        const score = this._score(fit, pw, ph);
        if (!best || score < best.score) {
          best = { ...fit, width: pw, height: ph, score };
        }
      }
    };

    tryDimensions(w, h);
    if (this.allowRotation && w !== h) {
      tryDimensions(h, w);
    }

    return best;
  }

  /**
   * Try to fit a piece of size (pw × ph) starting at skyline segment i.
   * The piece must span as many segments as needed to cover pw width.
   * Returns { x, y } or null.
   */
  _fitAtSegment(startIdx, pw, ph) {
    const x = this.skyline[startIdx].x;

    // Check width available from startIdx
    let coveredWidth = 0;
    let maxY         = 0;
    let segIdx       = startIdx;

    while (coveredWidth < pw) {
      if (segIdx >= this.skyline.length) return null; // ran out of segments
      const seg = this.skyline[segIdx];
      if (seg.x + seg.width < x + coveredWidth) { segIdx++; continue; }
      maxY         = Math.max(maxY, seg.y);
      coveredWidth += seg.width - Math.max(0, (x + coveredWidth) - seg.x);
      segIdx++;
    }

    // Check if the piece actually starts at this segment's x
    if (x + pw > this.binWidth)  return null;
    if (maxY + ph > this.binHeight) return null;

    return { x, y: maxY };
  }

  /** Score a candidate — lower is better */
  _score(fit, pw, ph) {
    switch (this.heuristic) {
      case 'bl':
        // Bottom-Left: prefer lowest y, then leftmost x
        return fit.y * 100000 + fit.x;

      case 'wf': {
        // Waste-Fit: minimise wasted area below the piece
        let waste = 0;
        let coveredX = fit.x;
        for (const seg of this.skyline) {
          if (seg.x + seg.width <= fit.x) continue;
          if (seg.x >= fit.x + pw) break;
          const overlapStart = Math.max(seg.x, fit.x);
          const overlapEnd   = Math.min(seg.x + seg.width, fit.x + pw);
          waste += (fit.y - seg.y) * (overlapEnd - overlapStart);
          coveredX = overlapEnd;
        }
        return waste * 1000 + fit.y * 100 + fit.x;
      }

      case 'min-max': {
        // MinMax: minimise the new maximum height after placement
        const newMaxY = fit.y + ph;
        return newMaxY * 100000 + fit.x;
      }

      default:
        return fit.y * 100000 + fit.x;
    }
  }

  /**
   * Update the skyline after placing a piece at (x, y) with size (w, h).
   */
  _addSkylineLevel(x, y, w, h) {
    const newY    = y + h;
    const newSeg  = new SkylineSegment(x, newY, w);
    const newLine = [];

    for (const seg of this.skyline) {
      const segEnd    = seg.x + seg.width;
      const newSegEnd = newSeg.x + newSeg.width;

      if (segEnd <= newSeg.x || seg.x >= newSegEnd) {
        // no overlap
        newLine.push(seg);
      } else {
        // left remainder
        if (seg.x < newSeg.x) {
          newLine.push(new SkylineSegment(seg.x, seg.y, newSeg.x - seg.x));
        }
        // right remainder
        if (segEnd > newSegEnd) {
          newLine.push(new SkylineSegment(newSegEnd, seg.y, segEnd - newSegEnd));
        }
      }
    }

    newLine.push(newSeg);
    newLine.sort((a, b) => a.x - b.x);

    // Merge adjacent segments with same height
    this.skyline = [];
    for (const seg of newLine) {
      if (
        this.skyline.length > 0 &&
        this.skyline[this.skyline.length - 1].y === seg.y &&
        this.skyline[this.skyline.length - 1].x + this.skyline[this.skyline.length - 1].width === seg.x
      ) {
        this.skyline[this.skyline.length - 1].width += seg.width;
      } else {
        this.skyline.push(seg);
      }
    }
  }
}

// ── Multi-board Skyline Packer ──────────────────────────────────────────────

/**
 * Pack all pieces using the Skyline algorithm, opening new boards as needed.
 * Compatible with the runSinglePass result format used by optimizeCuts.
 *
 * @param {Array}  pieces    - expanded pieces array
 * @param {Object} stock     - { width, height, grain }
 * @param {Object} options   - { kerf, edgeTrim, allowRotation }
 * @param {string} heuristic - 'bl' | 'wf' | 'min-max'
 * @returns {{ boards, unfitted, boardCount, utilization, consumedOffcutIds }}
 */
const SKYLINE_SORT_COMPARATORS = {
  'area-desc':      (a, b) => (b.width * b.height) - (a.width * a.height),
  'area-asc':       (a, b) => (a.width * a.height) - (b.width * b.height),
  'perimeter-desc': (a, b) => (b.width + b.height) - (a.width + a.height),
  'height-desc':    (a, b) => b.height - a.height,
  'width-desc':     (a, b) => b.width  - a.width,
  'max-side-desc':  (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height),
  'diff-desc':      (a, b) => Math.abs(b.width - b.height) - Math.abs(a.width - a.height),
};

function applySkylineSort(pieces, sortOrder) {
  if (sortOrder !== 'group-area-desc') {
    const cmp = SKYLINE_SORT_COMPARATORS[sortOrder];
    return cmp ? [...pieces].sort(cmp) : [...pieces];
  }
  // Same-group consolidation for Skyline
  const groupMap = new Map();
  for (const p of pieces) {
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

export function runSkylinePack(pieces, stock, options = {}, heuristic = 'bl', sortOrder = 'area-desc') {
  const { kerf = 3, edgeTrim = 0, allowRotation = true } = options;
  const binW = stock.width  - 2 * edgeTrim;
  const binH = stock.height - 2 * edgeTrim;
  const kerfOffset = kerf;

  // Apply sort order (with group-area-desc support)
  const sortedPieces = applySkylineSort(pieces, sortOrder);


  const boards      = [];
  let currentBin    = new SkylineBin(binW, binH, heuristic, allowRotation);
  let currentPieces = [];

  const unfitted    = [];

  for (const piece of sortedPieces) {
    // Account for kerf in piece dimensions when packing
    const pw = piece.width  + kerfOffset;
    const ph = piece.height + kerfOffset;

    let placed = currentBin.insert(pw, ph, piece);

    if (!placed) {
      // Seal current board and open a new one
      if (currentPieces.length > 0) {
        boards.push({ bin: currentBin, pieces: currentPieces, stockWidth: stock.width, stockHeight: stock.height });
      }
      currentBin    = new SkylineBin(binW, binH, heuristic, allowRotation);
      currentPieces = [];
      placed = currentBin.insert(pw, ph, piece);
    }

    if (placed) {
      const rotated = placed.placedWidth !== pw || (piece.width === piece.height ? false : placed.placedWidth === ph);
      currentPieces.push({
        ...piece,
        x:            placed.x + edgeTrim,
        y:            placed.y + edgeTrim,
        placedWidth:  placed.placedWidth  - kerfOffset,
        placedHeight: placed.placedHeight - kerfOffset,
        rotated:      placed.placedWidth - kerfOffset !== piece.width,
      });
    } else {
      // Doesn't fit even in an empty board (piece too large)
      unfitted.push(piece);
    }
  }

  // Seal last board
  if (currentPieces.length > 0) {
    boards.push({ bin: currentBin, pieces: currentPieces, stockWidth: stock.width, stockHeight: stock.height });
  }

  // Compute stats
  const totalStock   = boards.reduce((s, b) => s + b.stockWidth * b.stockHeight, 0);
  const totalUsed    = boards.reduce((s, b) => s + b.pieces.reduce((a, p) => a + p.placedWidth * p.placedHeight, 0), 0);
  const utilization  = totalStock > 0 ? (totalUsed / totalStock) * 100 : 0;

  return {
    boards: boards.map(b => ({
      bin:         b.bin,
      stockWidth:  b.stockWidth,
      stockHeight: b.stockHeight,
      pieces:      b.pieces,
    })),
    unfitted,
    consumedOffcutIds: [],
    boardCount:   boards.length,
    utilization,
    totalStockArea: totalStock,
  };
}
