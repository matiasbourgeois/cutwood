/**
 * Guillotine Bin Packing Algorithm — v3
 * Multi-heuristic: BSSF, BAF, BLF selection + SLA/LLA split rules.
 * Supports strip insertion for repeated identical pieces.
 */

export class GuillotineBin {
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} kerf
   * @param {'bssf'|'baf'|'blf'} heuristic - Selection heuristic
   * @param {'sla'|'lla'} splitRule - Split rule
   */
  constructor(width, height, kerf = 0, heuristic = 'bssf', splitRule = 'sla') {
    this.width = width;
    this.height = height;
    this.kerf = kerf;
    this.heuristic = heuristic;
    this.splitRule = splitRule;
    this.usedRects = [];
    this.freeRects = [{ x: 0, y: 0, width, height }];
  }

  /**
   * Try to insert a single rectangle.
   * Returns { x, y, width, height, rotated } or null.
   */
  insert(pieceWidth, pieceHeight, allowRotation = true) {
    const best = this._findBestFit(pieceWidth, pieceHeight, allowRotation);
    if (!best) return null;

    const placed = {
      x: best.x,
      y: best.y,
      width: best.w,
      height: best.h,
      rotated: best.rotated,
    };

    this.usedRects.push(placed);
    this._splitFreeRect(best.freeIdx, placed);
    return placed;
  }

  /**
   * Try to insert a strip of N identical pieces.
   * Packs them side by side in a horizontal or vertical strip.
   * Returns array of placements or null if strip doesn't fit.
   */
  insertStrip(pieceWidth, pieceHeight, count, allowRotation = true) {
    if (count <= 1) {
      const r = this.insert(pieceWidth, pieceHeight, allowRotation);
      return r ? [r] : null;
    }

    // Build all valid strip candidates
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

    // Find best fitting candidate across all free rects
    let bestFit = null;
    let bestScore = Infinity;

    for (const cand of candidates) {
      for (let i = 0; i < this.freeRects.length; i++) {
        const fr = this.freeRects[i];
        if (cand.stripW <= fr.width && cand.stripH <= fr.height) {
          const score = this._scoreCandidate(fr, cand.stripW, cand.stripH);
          if (score < bestScore) {
            bestScore = score;
            bestFit = { ...cand, freeIdx: i };
          }
        }
      }
    }

    if (!bestFit) return null;

    const fr = this.freeRects[bestFit.freeIdx];
    const stripBlock = { x: fr.x, y: fr.y, width: bestFit.stripW, height: bestFit.stripH };
    this._splitFreeRect(bestFit.freeIdx, stripBlock);

    const placements = [];
    for (let i = 0; i < count; i++) {
      const px = bestFit.horizontal
        ? stripBlock.x + i * (bestFit.cellW + this.kerf)
        : stripBlock.x;
      const py = bestFit.horizontal
        ? stripBlock.y
        : stripBlock.y + i * (bestFit.cellH + this.kerf);

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

  /**
   * Score a candidate placement in a free rect based on heuristic.
   * Lower is better.
   */
  _scoreCandidate(fr, pw, ph) {
    switch (this.heuristic) {
      case 'baf': {
        // Best Area Fit — minimize leftover area
        return (fr.width * fr.height) - (pw * ph);
      }
      case 'blf': {
        // Bottom-Left Fill — prefer lower Y, then lower X
        return fr.y * 100000 + fr.x;
      }
      case 'bssf':
      default: {
        // Best Short Side Fit — minimize the shorter leftover side
        const leftoverW = fr.width - pw - this.kerf;
        const leftoverH = fr.height - ph - this.kerf;
        return Math.min(Math.max(0, leftoverW), Math.max(0, leftoverH));
      }
    }
  }

  /**
   * Find the best free rectangle using the configured heuristic.
   */
  _findBestFit(pw, ph, allowRotation) {
    let bestScore = Infinity;
    let bestResult = null;

    for (let i = 0; i < this.freeRects.length; i++) {
      const fr = this.freeRects[i];

      // Normal orientation
      if (pw <= fr.width && ph <= fr.height) {
        const score = this._scoreCandidate(fr, pw, ph);
        if (score < bestScore) {
          bestScore = score;
          bestResult = { freeIdx: i, rotated: false, x: fr.x, y: fr.y, w: pw, h: ph };
        }
      }

      // Rotated orientation
      if (allowRotation && ph <= fr.width && pw <= fr.height) {
        const score = this._scoreCandidate(fr, ph, pw);
        if (score < bestScore) {
          bestScore = score;
          bestResult = { freeIdx: i, rotated: true, x: fr.x, y: fr.y, w: ph, h: pw };
        }
      }
    }

    return bestResult;
  }

  /**
   * Split free rectangle after placement.
   * SLA = Shorter Leftover Axis (original)
   * LLA = Longer Leftover Axis (opposite split)
   */
  _splitFreeRect(freeIdx, placed) {
    const fr = this.freeRects[freeIdx];
    const rightWidth = fr.width - placed.width - this.kerf;
    const bottomHeight = fr.height - placed.height - this.kerf;

    this.freeRects.splice(freeIdx, 1);

    if (rightWidth > 0 || bottomHeight > 0) {
      // SLA: shorter residual gets the full-span split
      // LLA: longer residual gets the full-span split (opposite)
      const splitHorizontally = this.splitRule === 'lla'
        ? rightWidth >= bottomHeight  // LLA: opposite of SLA
        : rightWidth < bottomHeight;  // SLA: original behavior

      if (splitHorizontally) {
        // Horizontal split — bottom spans full width
        if (bottomHeight > 0) {
          this.freeRects.push({
            x: fr.x,
            y: fr.y + placed.height + this.kerf,
            width: fr.width,
            height: bottomHeight,
          });
        }
        if (rightWidth > 0) {
          this.freeRects.push({
            x: fr.x + placed.width + this.kerf,
            y: fr.y,
            width: rightWidth,
            height: placed.height,
          });
        }
      } else {
        // Vertical split — right spans full height
        if (rightWidth > 0) {
          this.freeRects.push({
            x: fr.x + placed.width + this.kerf,
            y: fr.y,
            width: rightWidth,
            height: fr.height,
          });
        }
        if (bottomHeight > 0) {
          this.freeRects.push({
            x: fr.x,
            y: fr.y + placed.height + this.kerf,
            width: placed.width,
            height: bottomHeight,
          });
        }
      }
    }
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
