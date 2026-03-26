/**
 * Maximal Rectangles Bin Packing — v1
 * Maintains ALL maximal free rectangles (not just 2 from guillotine split).
 * Much better space utilization at the cost of slightly more computation.
 *
 * Key difference from Guillotine:
 * - Guillotine: each split creates exactly 2 free rects
 * - MaxRects: maintains ALL possible free rects, removes overlapping portions
 * - Result: more placement options → better packing → less waste
 */

const MAX_FREE_RECTS = 150;

export class MaxRectsBin {
  constructor(width, height, kerf = 0, heuristic = 'bssf') {
    this.width = width;
    this.height = height;
    this.kerf = kerf;
    this.heuristic = heuristic;
    this.usedRects = [];
    this.freeRects = [{ x: 0, y: 0, width, height }];
  }

  /**
   * Insert a single rectangle. Returns placement or null.
   */
  insert(pieceWidth, pieceHeight, allowRotation = true) {
    const best = this._findBestFit(pieceWidth, pieceHeight, allowRotation);
    if (!best) return null;

    const placed = {
      x: best.x, y: best.y,
      width: best.w, height: best.h,
      rotated: best.rotated,
    };

    // The piece occupies space including kerf around it
    const occupied = {
      x: placed.x,
      y: placed.y,
      width: placed.width + this.kerf,
      height: placed.height + this.kerf,
    };

    this.usedRects.push(placed);
    this._splitAndPrune(occupied);
    return placed;
  }

  /**
   * Insert a strip of N identical pieces.
   */
  insertStrip(pieceWidth, pieceHeight, count, allowRotation = true) {
    if (count <= 1) {
      const r = this.insert(pieceWidth, pieceHeight, allowRotation);
      return r ? [r] : null;
    }

    const candidates = [];
    const pw = pieceWidth, ph = pieceHeight;

    candidates.push({
      stripW: pw * count + this.kerf * (count - 1), stripH: ph,
      cellW: pw, cellH: ph, horizontal: true, rotated: false,
    });
    candidates.push({
      stripW: pw, stripH: ph * count + this.kerf * (count - 1),
      cellW: pw, cellH: ph, horizontal: false, rotated: false,
    });

    if (allowRotation) {
      candidates.push({
        stripW: ph * count + this.kerf * (count - 1), stripH: pw,
        cellW: ph, cellH: pw, horizontal: true, rotated: true,
      });
      candidates.push({
        stripW: ph, stripH: pw * count + this.kerf * (count - 1),
        cellW: ph, cellH: pw, horizontal: false, rotated: true,
      });
    }

    let bestFit = null;
    let bestScore = Infinity;

    for (const cand of candidates) {
      for (let i = 0; i < this.freeRects.length; i++) {
        const fr = this.freeRects[i];
        if (cand.stripW <= fr.width && cand.stripH <= fr.height) {
          const score = this._score(fr, cand.stripW, cand.stripH);
          if (score < bestScore) {
            bestScore = score;
            bestFit = { ...cand, x: fr.x, y: fr.y };
          }
        }
      }
    }

    if (!bestFit) return null;

    // Place the strip block
    const occupied = {
      x: bestFit.x, y: bestFit.y,
      width: bestFit.stripW + this.kerf,
      height: bestFit.stripH + this.kerf,
    };
    this._splitAndPrune(occupied);

    const placements = [];
    for (let i = 0; i < count; i++) {
      const px = bestFit.horizontal
        ? bestFit.x + i * (bestFit.cellW + this.kerf)
        : bestFit.x;
      const py = bestFit.horizontal
        ? bestFit.y
        : bestFit.y + i * (bestFit.cellH + this.kerf);

      const placed = {
        x: px, y: py,
        width: bestFit.cellW, height: bestFit.cellH,
        rotated: bestFit.rotated,
      };
      this.usedRects.push(placed);
      placements.push(placed);
    }

    return placements;
  }

  _score(fr, pw, ph) {
    switch (this.heuristic) {
      case 'baf':
        return (fr.width * fr.height) - (pw * ph);
      case 'blf':
        return fr.y * 100000 + fr.x;
      case 'bssf':
      default: {
        const leftoverW = fr.width - pw;
        const leftoverH = fr.height - ph;
        return Math.min(leftoverW, leftoverH);
      }
    }
  }

  _findBestFit(pw, ph, allowRotation) {
    let bestScore = Infinity;
    let bestResult = null;

    for (let i = 0; i < this.freeRects.length; i++) {
      const fr = this.freeRects[i];

      if (pw <= fr.width && ph <= fr.height) {
        const score = this._score(fr, pw, ph);
        if (score < bestScore) {
          bestScore = score;
          bestResult = { rotated: false, x: fr.x, y: fr.y, w: pw, h: ph };
        }
      }

      if (allowRotation && ph <= fr.width && pw <= fr.height) {
        const score = this._score(fr, ph, pw);
        if (score < bestScore) {
          bestScore = score;
          bestResult = { rotated: true, x: fr.x, y: fr.y, w: ph, h: pw };
        }
      }
    }

    return bestResult;
  }

  /**
   * Core MaxRects operation:
   * For each free rect that overlaps with the occupied area,
   * generate up to 4 new free rects (top, bottom, left, right portions).
   * Then prune any free rect that is fully contained in another.
   */
  _splitAndPrune(occupied) {
    const newFreeRects = [];

    for (const fr of this.freeRects) {
      // Check if this free rect overlaps with occupied area
      if (!this._overlaps(fr, occupied)) {
        newFreeRects.push(fr);
        continue;
      }

      // Generate sub-rects from the non-overlapping portions

      // Left portion
      if (occupied.x > fr.x) {
        newFreeRects.push({
          x: fr.x, y: fr.y,
          width: occupied.x - fr.x,
          height: fr.height,
        });
      }

      // Right portion
      const occupiedRight = occupied.x + occupied.width;
      if (occupiedRight < fr.x + fr.width) {
        newFreeRects.push({
          x: occupiedRight, y: fr.y,
          width: (fr.x + fr.width) - occupiedRight,
          height: fr.height,
        });
      }

      // Top portion
      if (occupied.y > fr.y) {
        newFreeRects.push({
          x: fr.x, y: fr.y,
          width: fr.width,
          height: occupied.y - fr.y,
        });
      }

      // Bottom portion
      const occupiedBottom = occupied.y + occupied.height;
      if (occupiedBottom < fr.y + fr.height) {
        newFreeRects.push({
          x: fr.x, y: occupiedBottom,
          width: fr.width,
          height: (fr.y + fr.height) - occupiedBottom,
        });
      }
    }

    // Prune: remove any rect fully contained within another
    this.freeRects = [];
    for (let i = 0; i < newFreeRects.length; i++) {
      let isContained = false;
      for (let j = 0; j < newFreeRects.length; j++) {
        if (i === j) continue;
        if (this._contains(newFreeRects[j], newFreeRects[i])) {
          isContained = true;
          break;
        }
      }
      if (!isContained) {
        this.freeRects.push(newFreeRects[i]);
      }
    }

    // Cap free rects to prevent O(n²) explosion
    if (this.freeRects.length > MAX_FREE_RECTS) {
      this.freeRects.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      this.freeRects.length = MAX_FREE_RECTS;
    }
  }

  _overlaps(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  _contains(outer, inner) {
    return inner.x >= outer.x &&
           inner.y >= outer.y &&
           inner.x + inner.width <= outer.x + outer.width &&
           inner.y + inner.height <= outer.y + outer.height;
  }

  getUtilization() {
    const totalArea = this.width * this.height;
    const usedArea = this.usedRects.reduce((sum, r) => sum + r.width * r.height, 0);
    return (usedArea / totalArea) * 100;
  }

  getWasteArea() {
    const totalArea = this.width * this.height;
    const usedArea = this.usedRects.reduce((sum, r) => sum + r.width * r.height, 0);
    return totalArea - usedArea;
  }
}
