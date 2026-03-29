import React from 'react';

/**
 * ArchitecturalPlan — Plano técnico GOD LEVEL v4.
 *
 * Modos (sin mezcla de tipos — siempre coherente):
 *  A  : AMBAS flechas H+V + nombre (pw≥80 && ph≥50)
 *  C-H: texto horizontal "Nombre\nW×H mm" (sin flechas)
 *  C-V: texto vertical rotado (piezas angostas)
 *  D  : badge de código + tabla de leyenda fuera del tablero
 *
 * REGLA: nunca una sola flecha. O ambas o ninguna.
 * LEYENDA: piezas D reciben código L1..Ln dentro y tabla al pie del SVG.
 */
export default function ArchitecturalPlan({ board, allPieceIds, boardIndex, theme = 'dark' }) {
  if (!board) return null;
  const { stockWidth, stockHeight, pieces } = board;

  const MARGIN    = 80;
  const SVG_INNER = 790;
  const aspectRaw = stockHeight / stockWidth;
  const aspect    = Math.max(0.3, Math.min(2.4, aspectRaw));

  const bScale = Math.min(SVG_INNER / stockWidth, (SVG_INNER * aspect) / stockHeight);
  const boardW = stockWidth  * bScale;
  const boardH = stockHeight * bScale;
  const ox     = MARGIN + (SVG_INNER - boardW) / 2;
  const oy     = MARGIN + (SVG_INNER * aspect - boardH) / 2;

  const FONT   = "'Inter','Arial',system-ui,sans-serif";
  const isDark = theme === 'dark';
  const uid    = `ap${boardIndex}`;

  const C = {
    bg:          isDark ? '#070c18'               : '#eef2f7',
    paper:       isDark ? '#0d1424'               : '#ffffff',
    grid:        isDark ? 'rgba(255,255,255,0.03)': 'rgba(0,0,50,0.04)',
    boardStroke: isDark ? '#334155'               : '#1e293b',
    pieceStroke: isDark ? '#475569'               : '#1e293b',
    pieceFill:   isDark ? 'rgba(30,58,138,0.22)'  : 'rgba(214,229,252,0.50)',
    cross:       isDark ? 'rgba(148,163,184,0.06)': 'rgba(30,41,59,0.04)',
    dimLine:     isDark ? 'rgba(148,163,184,0.70)': 'rgba(15,32,60,0.62)',
    dimText:     isDark ? '#cbd5e1'               : '#1e293b',
    dimBg:       isDark ? 'rgba(7,12,24,0.90)'    : 'rgba(255,255,255,0.93)',
    labelBg:     isDark ? 'rgba(13,20,36,0.94)'   : 'rgba(255,255,255,0.96)',
    labelText:   isDark ? '#f1f5f9'               : '#0f172a',
    accent:      isDark ? '#06b6d4'               : '#0369a1',
    accentBg:    isDark ? 'rgba(6,182,212,0.15)'  : 'rgba(3,105,161,0.10)',
    amber:       '#f59e0b',
    amberLine:   isDark ? 'rgba(245,158,11,0.75)' : 'rgba(180,110,5,0.78)',
    amberBg:     isDark ? 'rgba(7,12,24,0.92)'    : 'rgba(255,253,235,0.96)',
    offcutFill:  isDark ? 'rgba(90,80,30,0.18)'   : 'rgba(254,252,232,0.60)',
    offcutStr:   isDark ? '#78716c'               : '#d97706',
    hatch:       isDark ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.28)',
    legBg:       isDark ? 'rgba(13,20,36,0.97)'   : 'rgba(248,250,252,0.98)',
    legBorder:   isDark ? '#334155'               : '#cbd5e1',
  };

  // ── Primitive arrows ─────────────────────────────────────────────────────────
  const HArrow = ({ x1, x2, y, label, fs, cl, bg }) => {
    const span = x2 - x1; if (span < 14) return null;
    const mx = (x1+x2)/2, al = Math.min(4, span/7);
    const lW = label.length * fs * 0.60 + 9, lH = fs + 4;
    return (
      <g>
        <line x1={x1} y1={y-2.5} x2={x1} y2={y+2.5} stroke={cl} strokeWidth="0.9"/>
        <line x1={x2} y1={y-2.5} x2={x2} y2={y+2.5} stroke={cl} strokeWidth="0.9"/>
        <line x1={x1} y1={y} x2={mx-lW/2-1.5} y2={y} stroke={cl} strokeWidth="0.75"/>
        <line x1={mx+lW/2+1.5} y1={y} x2={x2} y2={y} stroke={cl} strokeWidth="0.75"/>
        <polygon points={`${x1},${y} ${x1+al},${y-1.8} ${x1+al},${y+1.8}`} fill={cl}/>
        <polygon points={`${x2},${y} ${x2-al},${y-1.8} ${x2-al},${y+1.8}`} fill={cl}/>
        <rect x={mx-lW/2} y={y-lH/2} width={lW} height={lH} fill={bg} rx="2"/>
        <text x={mx} y={y} textAnchor="middle" dominantBaseline="middle"
          fill={cl} fontSize={fs} fontFamily={FONT} fontWeight="700"
          style={{fontVariantNumeric:'tabular-nums'}}>{label}</text>
      </g>
    );
  };

  const VArrow = ({ x, y1, y2, label, fs, cl, bg }) => {
    const span = y2 - y1; if (span < 14) return null;
    const my = (y1+y2)/2, al = Math.min(4, span/7);
    const lH = label.length * fs * 0.60 + 9, lW = fs + 4;
    return (
      <g>
        <line x1={x-2.5} y1={y1} x2={x+2.5} y2={y1} stroke={cl} strokeWidth="0.9"/>
        <line x1={x-2.5} y1={y2} x2={x+2.5} y2={y2} stroke={cl} strokeWidth="0.9"/>
        <line x1={x} y1={y1} x2={x} y2={my-lH/2-1.5} stroke={cl} strokeWidth="0.75"/>
        <line x1={x} y1={my+lH/2+1.5} x2={x} y2={y2} stroke={cl} strokeWidth="0.75"/>
        <polygon points={`${x},${y1} ${x-1.8},${y1+al} ${x+1.8},${y1+al}`} fill={cl}/>
        <polygon points={`${x},${y2} ${x-1.8},${y2-al} ${x+1.8},${y2-al}`} fill={cl}/>
        <rect x={x-lW/2} y={my-lH/2} width={lW} height={lH} fill={bg} rx="2"/>
        <text x={x} y={my} textAnchor="middle" dominantBaseline="middle"
          fill={cl} fontSize={fs} fontFamily={FONT} fontWeight="700"
          transform={`rotate(-90,${x},${my})`}
          style={{fontVariantNumeric:'tabular-nums'}}>{label}</text>
      </g>
    );
  };

  // ── Board external dimensions ────────────────────────────────────────────────
  const DIM_ABOVE = oy - 34, DIM_LEFT = ox - 42;

  const BoardDimH = ({ x1, x2, y, label }) => {
    const mx = (x1+x2)/2, al = Math.min(5,(x2-x1)/12);
    const lbl = `${label} mm`, lW = lbl.length*8*0.60+10, lH = 12;
    return (
      <g>
        <line x1={x1} y1={oy} x2={x1} y2={y} stroke={C.dimLine} strokeWidth="0.6" strokeDasharray="4 2"/>
        <line x1={x2} y1={oy} x2={x2} y2={y} stroke={C.dimLine} strokeWidth="0.6" strokeDasharray="4 2"/>
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.dimLine} strokeWidth="1"/>
        <polygon points={`${x1},${y} ${x1+al},${y-2} ${x1+al},${y+2}`} fill={C.dimLine}/>
        <polygon points={`${x2},${y} ${x2-al},${y-2} ${x2-al},${y+2}`} fill={C.dimLine}/>
        <rect x={mx-lW/2} y={y-lH/2} width={lW} height={lH} fill={C.dimBg} rx="2"/>
        <text x={mx} y={y} textAnchor="middle" dominantBaseline="middle"
          fill={C.dimText} fontSize="8" fontFamily={FONT} fontWeight="700"
          style={{fontVariantNumeric:'tabular-nums'}}>{lbl}</text>
      </g>
    );
  };

  const BoardDimV = ({ x, y1, y2, label }) => {
    const my = (y1+y2)/2, al = Math.min(5,(y2-y1)/12);
    const lbl = `${label} mm`, tW = lbl.length*8*0.60+10, tH = 12;
    return (
      <g>
        <line x1={ox} y1={y1} x2={x} y2={y1} stroke={C.dimLine} strokeWidth="0.6" strokeDasharray="4 2"/>
        <line x1={ox} y1={y2} x2={x} y2={y2} stroke={C.dimLine} strokeWidth="0.6" strokeDasharray="4 2"/>
        <line x1={x} y1={y1} x2={x} y2={y2} stroke={C.dimLine} strokeWidth="1"/>
        <polygon points={`${x},${y1} ${x-2},${y1+al} ${x+2},${y1+al}`} fill={C.dimLine}/>
        <polygon points={`${x},${y2} ${x-2},${y2-al} ${x+2},${y2-al}`} fill={C.dimLine}/>
        <rect x={x-tH/2} y={my-tW/2} width={tH} height={tW} fill={C.dimBg} rx="2"/>
        <text x={x} y={my} textAnchor="middle" dominantBaseline="middle"
          fill={C.dimText} fontSize="8" fontFamily={FONT} fontWeight="700"
          transform={`rotate(-90,${x},${my})`}
          style={{fontVariantNumeric:'tabular-nums'}}>{lbl}</text>
      </g>
    );
  };

  // ── Pass 1: determine mode for every piece ───────────────────────────────────
  const CW = 0.62; // char width ratio

  const pieceModes = pieces.map((piece, i) => {
    const pw  = piece.placedWidth  * bScale;
    const ph  = piece.placedHeight * bScale;
    const nm  = piece.name || `P${i + 1}`;
    const dim = `${piece.placedWidth}×${piece.placedHeight}`;
    const cotaFS = Math.max(5.5, Math.min(8, Math.min(pw, ph) / 12));

    // Mode A: BOTH arrows (pw≥80 && ph≥50)
    if (pw >= 80 && ph >= 50) return { mode: 'A', pw, ph, nm, dim, cotaFS };

    // Mode C-H: horizontal text fits?
    const nFSh = Math.max(6, Math.min(8.5, pw / 9));
    const dFSh = Math.max(5, Math.min(7.5, pw / 10));
    const nWh  = nm.length  * nFSh * CW + 8;
    const dWh  = dim.length * dFSh * 0.60 + 6;
    const stkH = (nFSh + 4) + 3 + (dFSh + 3);
    if (nWh < pw - 2 && dWh < pw - 2 && stkH < ph - 4)
      return { mode: 'CH', pw, ph, nm, dim, nFSh, dFSh, nWh, dWh, stkH };

    // Mode C-V: vertical rotated text fits?
    const nFSv = Math.max(5.5, Math.min(9, ph / 9));
    const dFSv = Math.max(5,   Math.min(8, ph / 12));
    const nSHv = nm.length  * nFSv * CW + 8; // screen height after rot
    const dSHv = dim.length * dFSv * CW + 6;
    const nSWv = nFSv + 6, dSWv = dFSv + 5;  // screen width after rot
    if (Math.max(nSWv, dSWv) < pw - 2 && nSHv + 5 + dSHv < ph - 4)
      return { mode: 'CV', pw, ph, nm, dim, nFSv, dFSv, nSHv, dSHv, nSWv, dSWv };

    // Mode D: legend
    return { mode: 'D', pw, ph, nm, dim };
  });

  // ── Assign legend codes ─────────────────────────────────────────────────────
  let legendCounter = 0;
  const legendEntries = []; // { code, nm, dim }
  const legendCodes   = pieceModes.map(pm => {
    if (pm.mode !== 'D') return null;
    legendCounter++;
    const code = `L${legendCounter}`;
    legendEntries.push({ code, nm: pm.nm, dim: pm.dim });
    return code;
  });

  // ── Legend table SVG dimensions (fully dynamic / scalable) ─────────────────
  const SVG_W = SVG_INNER + MARGIN * 2;

  // Row height: shrinks a bit if there are many entries (min 15px)
  const LEG_ROW_H = legendEntries.length > 20 ? 15 : 18;

  // Columns: up to 5 based on available width and entry count.
  // Min column width for readability = 170px.
  const MIN_COL_W    = 170;
  const MAX_COLS_FIT = Math.floor((SVG_W - 16) / MIN_COL_W); // e.g. floor(1030/170)=6
  const LEG_COLS     = Math.min(
    MAX_COLS_FIT,          // can't exceed what fits on page
    Math.max(1,
      legendEntries.length <= 4  ? 2 :   // 1-4 → 2 cols
      legendEntries.length <= 12 ? 3 :   // 5-12 → 3 cols
      legendEntries.length <= 24 ? 4 :   // 13-24 → 4 cols
      5                                  // 25+  → 5 cols
    )
  );
  const LEG_ROWS     = legendEntries.length > 0 ? Math.ceil(legendEntries.length / LEG_COLS) : 0;
  const LEGEND_ZONE  = legendEntries.length > 0 ? LEG_ROWS * LEG_ROW_H + 44 : 0;

  const SVG_H = Math.round(SVG_INNER * aspect) + MARGIN * 2 + LEGEND_ZONE;

  // Legend table layout
  const LEG_COL_W   = Math.floor((SVG_W - 16) / Math.max(1, LEG_COLS));
  const LEG_TOTAL_W = LEG_COL_W * LEG_COLS;
  const LEG_X       = (SVG_W - LEG_TOTAL_W) / 2;
  const LEG_Y       = SVG_H - LEGEND_ZONE + 10;

  // ── Piece renderer ───────────────────────────────────────────────────────────
  const pieceElements = pieceModes.map((pm, i) => {
    const piece = pieces[i];
    const { pw, ph, nm, dim, mode } = pm;
    const px = ox + piece.x * bScale, py = oy + piece.y * bScale;
    const cx = px + pw / 2, cy = py + ph / 2;
    const PAD = 4;
    const { cotaFS } = pm;

    return (
      <g key={`p-${piece.id}-${i}`}>
        <rect x={px} y={py} width={pw} height={ph}
          fill={C.pieceFill} stroke={C.pieceStroke} strokeWidth="0.9" rx="1"/>
        <line x1={px} y1={py} x2={px+pw} y2={py+ph} stroke={C.cross} strokeWidth="0.5"/>
        <line x1={px+pw} y1={py} x2={px} y2={py+ph} stroke={C.cross} strokeWidth="0.5"/>

        {/* MODE A: both arrows + name */}
        {mode === 'A' && (() => {
          const HY   = py + PAD + (cotaFS||7)/2 + 2;
          const VX   = px + pw - PAD - (cotaFS||7)/2 - 2;
          const wLbl = `${piece.placedWidth} mm`;
          const hLbl = `${piece.placedHeight} mm`;
          const nFS  = Math.max(7, Math.min(11, pw / 9));
          const nW   = nm.length * nFS * CW + 12, nH = nFS + 6;
          const hBot = HY + (cotaFS||7)/2 + 2;
          const nameY = Math.max(cy, hBot + nH/2 + 3);
          const nameFits = nameY + nH/2 < py + ph - PAD;
          return (
            <>
              <HArrow x1={px+PAD} x2={VX-8} y={HY} label={wLbl} fs={cotaFS||7} cl={C.dimLine} bg={C.dimBg}/>
              <VArrow x={VX} y1={py+PAD} y2={py+ph-PAD} label={hLbl} fs={cotaFS||7} cl={C.dimLine} bg={C.dimBg}/>
              {nameFits && (
                <>
                  <rect x={cx-nW/2} y={nameY-nH/2} width={nW} height={nH} fill={C.labelBg} rx="3"/>
                  <text x={cx} y={nameY} textAnchor="middle" dominantBaseline="middle"
                    fill={C.labelText} fontSize={nFS} fontFamily={FONT} fontWeight="700">{nm}</text>
                </>
              )}
            </>
          );
        })()}

        {/* MODE C-H: horizontal text */}
        {mode === 'CH' && (() => {
          const { nFSh, dFSh, nWh, stkH } = pm;
          const topY  = cy - stkH / 2;
          const nameY = topY + nFSh/2 + 2;
          const dimY  = nameY + nFSh/2 + 3 + dFSh/2;
          return (
            <>
              <rect x={cx-nWh/2} y={nameY-nFSh/2-2} width={nWh} height={nFSh+4} fill={C.labelBg} rx="2"/>
              <text x={cx} y={nameY} textAnchor="middle" dominantBaseline="middle"
                fill={C.labelText} fontSize={nFSh} fontFamily={FONT} fontWeight="700">{nm}</text>
              <text x={cx} y={dimY} textAnchor="middle" dominantBaseline="middle"
                fill={C.dimLine} fontSize={dFSh} fontFamily={FONT} fontWeight="600"
                style={{fontVariantNumeric:'tabular-nums'}}>{dim}</text>
            </>
          );
        })()}

        {/* MODE C-V: vertical rotated */}
        {mode === 'CV' && (() => {
          const { nFSv, dFSv, nSHv, dSHv, nSWv, dSWv } = pm;
          const totSH   = nSHv + 5 + dSHv;
          const nameAncY = cy - totSH/2 + nSHv/2;
          const dimAncY  = nameAncY + nSHv/2 + 5 + dSHv/2;
          const sepY     = nameAncY + nSHv/2 + 2.5;
          const maxSW    = Math.max(nSWv, dSWv);
          return (
            <>
              <rect x={cx-nSHv/2} y={nameAncY-nSWv/2} width={nSHv} height={nSWv}
                fill={C.labelBg} rx="2" transform={`rotate(-90,${cx},${nameAncY})`}/>
              <text x={cx} y={nameAncY} textAnchor="middle" dominantBaseline="middle"
                fill={C.labelText} fontSize={nFSv} fontFamily={FONT} fontWeight="700"
                transform={`rotate(-90,${cx},${nameAncY})`}>{nm}</text>
              <line x1={cx-maxSW/2-1} y1={sepY} x2={cx+maxSW/2+1} y2={sepY}
                stroke={C.dimLine} strokeWidth="0.5" opacity="0.55"/>
              <text x={cx} y={dimAncY} textAnchor="middle" dominantBaseline="middle"
                fill={C.dimLine} fontSize={dFSv} fontFamily={FONT} fontWeight="700"
                transform={`rotate(-90,${cx},${dimAncY})`}
                style={{fontVariantNumeric:'tabular-nums'}}>{dim}</text>
            </>
          );
        })()}

        {/* MODE D: legend badge inside piece — always renders something */}
        {mode === 'D' && (() => {
          const code = legendCodes[i];
          // Try full badge first
          const bFS  = Math.max(4.5, Math.min(8, Math.min(pw, ph) / 4));
          const bW   = (code?.length || 2) * bFS * 0.70 + 5;
          const bH   = bFS + 4;
          if (bW <= pw - 1 && bH <= ph - 1) {
            // Full badge fits
            return (
              <g>
                <rect x={cx-bW/2} y={cy-bH/2} width={bW} height={bH}
                  fill={C.accentBg} stroke={C.accent} strokeWidth="0.7" rx="2"/>
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                  fill={C.accent} fontSize={bFS} fontFamily={FONT} fontWeight="800">{code}</text>
              </g>
            );
          }
          // Minimal: just the code number as tiny text (no bg rect)
          const tFS = Math.max(4, Math.min(bFS, Math.min(pw, ph) * 0.55));
          const tW  = (code?.length || 2) * tFS * 0.70;
          const tH  = tFS;
          if (tW <= pw && tH <= ph) {
            return (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                fill={C.accent} fontSize={tFS} fontFamily={FONT} fontWeight="800"
                opacity="0.9">{code}</text>
            );
          }
          // Truly microscopic piece: just a cyan dot at center
          const dotR = Math.max(1, Math.min(2.5, Math.min(pw, ph) * 0.3));
          return <circle cx={cx} cy={cy} r={dotR} fill={C.accent} opacity="0.85"/>;
        })()}
      </g>
    );
  });

  // ── Offcut renderer ──────────────────────────────────────────────────────────
  const offcutElements = (board.offcuts || []).map((oc, i) => {
    const sx = ox + oc.x  * bScale, sy = oy + oc.y  * bScale;
    const sw = oc.width   * bScale, sh = oc.height  * bScale;

    const oFS = Math.max(5.5, Math.min(8, Math.min(sw, sh) / 12));

    // ── Dimensioning thresholds ──────────────────────────────────────────
    // showH: H-arrow fits horizontally (needs width ≥ 30px)
    const showH = sw >= 30;
    // showV: V-arrow fits vertically inside the piece (needs height ≥ 32px)
    const showV = sh >= 32 && sw >= 44;

    // For thin pieces (sh < 32 but sw large enough), the V cota goes OUTSIDE
    // on the right edge of the board area to avoid overlapping with neighbors.
    const showVExternal = !showV && sh >= 6 && sw >= 30;

    // H-arrow Y: center of piece (not near top edge) to avoid overlap with neighbors
    const HY = sy + sh / 2;

    // V-arrow X (internal): right edge of piece, inset
    const VX = sx + sw - oFS / 2 - 6;

    // V-arrow X (external): right of the board + small offset
    const VX_EXT = ox + boardW + 22 + (i % 3) * 14; // stagger to avoid overlap

    // R# label position
    const rnFS = Math.max(6.5, Math.min(10, Math.min(sw, sh) / 9));
    // For thin: put R# below the H-arrow label; for tall: 65% down
    const rnY  = sh >= 32
      ? sy + sh * 0.65
      : sy + sh / 2; // same line but rendered via a different approach

    // Can we show R# separately?
    const showRN_tall = sh >= 32 && sw >= 24
      && rnY - rnFS / 2 > HY + oFS / 2 + 6
      && rnY + rnFS / 2 < sy + sh - 3;

    // Compact inline label (W×H mm) for pieces too small for any arrow
    const showCompact = !showH && sw > 10 && sh > 8;

    return (
      <g key={`oc-${i}`}>
        {/* Body */}
        <rect x={sx} y={sy} width={sw} height={sh}
          fill={C.offcutFill} stroke={C.offcutStr} strokeWidth="0.9" strokeDasharray="5 3" rx="1"/>
        <rect x={sx} y={sy} width={sw} height={sh}
          fill={`url(#${uid}-hatch)`} opacity="0.45" rx="1"/>

        {/* H-arrow (centered vertically — left 60% of width when thin) */}
        {showH && (
          <HArrow
            x1={sx+4}
            x2={sh < 32 ? sx + sw * 0.62 : sx + sw - 4}
            y={HY}
            label={`${oc.width} mm`} fs={oFS} cl={C.amberLine} bg={C.amberBg}/>
        )}

        {/* V-arrow INTERNAL (tall pieces) */}
        {showV && (
          <VArrow x={VX} y1={sy+4} y2={sy+sh-4}
            label={`${oc.height} mm`} fs={oFS} cl={C.amberLine} bg={C.amberBg}/>
        )}

        {/* V-arrow EXTERNAL (thin pieces: goes outside to the right) */}
        {showVExternal && !showV && (
          <g>
            <line x1={sx+sw} y1={sy} x2={VX_EXT} y2={sy}
              stroke={C.amberLine} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.45"/>
            <line x1={sx+sw} y1={sy+sh} x2={VX_EXT} y2={sy+sh}
              stroke={C.amberLine} strokeWidth="0.5" strokeDasharray="3 2" opacity="0.45"/>
            <VArrow x={VX_EXT} y1={sy} y2={sy+sh}
              label={`${oc.height} mm`} fs={Math.max(5.5, oFS)} cl={C.amberLine} bg={C.amberBg}/>
          </g>
        )}

        {/* Compact W×H text for tiny pieces (no arrows fit) */}
        {showCompact && (
          <text x={sx+sw/2} y={sy+sh/2} textAnchor="middle" dominantBaseline="middle"
            fill={C.amber} fontSize={Math.max(4.5, Math.min(7, sw/7))} fontFamily={FONT} fontWeight="600"
            style={{fontVariantNumeric:'tabular-nums'}}>{oc.width}×{oc.height}</text>
        )}

        {/* R# label —
            Tall pieces : separate line below H-arrow (showRN_tall)
            Thin pieces : badge on the right ~80% x of the piece (after H-arrow ends at 62%)
            Micro pieces: center (no H-arrow, won't conflict) */}
        {showRN_tall ? (
          <>
            <rect x={sx+sw/2-14} y={rnY-rnFS/2-2} width={28} height={rnFS+4} fill={C.amberBg} rx="2"/>
            <text x={sx+sw/2} y={rnY} textAnchor="middle" dominantBaseline="middle"
              fill={C.amber} fontSize={rnFS} fontFamily={FONT} fontWeight="800">R{i+1}</text>
          </>
        ) : sw > 10 && sh > 8 ? (
          // Thin / medium: R# at right side of piece (after H-arrow which ends at 62%)
          (() => {
            const rX = showH ? sx + sw * 0.82 : sx + sw / 2;
            const rFS = Math.max(5, Math.min(9, Math.min(sw * 0.18 / 1.6, sh * 0.65)));
            const rW = rFS * 1.6 + 4, rH = rFS + 3;
            return (
              <>
                <rect x={rX - rW/2} y={sy + sh/2 - rH/2} width={rW} height={rH} fill={C.amberBg} rx="2" opacity="0.92"/>
                <text x={rX} y={sy + sh/2} textAnchor="middle" dominantBaseline="middle"
                  fill={C.amber} fontSize={rFS} fontFamily={FONT} fontWeight="800">R{i+1}</text>
              </>
            );
          })()
        ) : null}

      </g>
    );
  });

  // ── Legend table ─────────────────────────────────────────────────────────────
  const LegendTable = () => {
    if (legendEntries.length === 0) return null;
    const totalH  = LEG_ROWS * LEG_ROW_H + 30;
    const tableY  = LEG_Y;
    const tableX  = LEG_X;
    const CODE_W  = 28, DIM_W = 80;
    return (
      <g>
        {/* Table border */}
        <rect x={tableX} y={tableY} width={LEG_TOTAL_W} height={totalH}
          fill={C.legBg} stroke={C.legBorder} strokeWidth="0.8" rx="3"/>
        {/* Header */}
        <rect x={tableX} y={tableY} width={LEG_TOTAL_W} height={16}
          fill={isDark ? 'rgba(6,182,212,0.12)' : 'rgba(3,105,161,0.08)'} rx="3"/>
        <line x1={tableX} y1={tableY+16} x2={tableX+LEG_TOTAL_W} y2={tableY+16}
          stroke={C.legBorder} strokeWidth="0.6"/>
        <text x={tableX + LEG_TOTAL_W/2} y={tableY+8} textAnchor="middle" dominantBaseline="middle"
          fill={C.accent} fontSize="7.5" fontFamily={FONT} fontWeight="800"
          letterSpacing="0.06em">DETALLE DE PIEZAS PEQUEÑAS</text>

        {/* Rows */}
        {legendEntries.map((entry, idx) => {
          const col = idx % LEG_COLS;
          const row = Math.floor(idx / LEG_COLS);
          const ex  = tableX + col * LEG_COL_W;
          const ey  = tableY + 16 + row * LEG_ROW_H;
          const nameMax = LEG_COL_W - CODE_W - DIM_W - 12;

          // Truncate name if too long
          const fs = 7;
          const maxChars = Math.floor(nameMax / (fs * 0.60));
          const dispName = entry.nm.length > maxChars
            ? entry.nm.slice(0, maxChars - 1) + '…'
            : entry.nm;

          return (
            <g key={idx}>
              {/* Row separator */}
              {row > 0 && col === 0 && (
                <line x1={tableX} y1={ey} x2={tableX+LEG_TOTAL_W} y2={ey}
                  stroke={C.legBorder} strokeWidth="0.4" opacity="0.6"/>
              )}
              {/* Col separator */}
              {col > 0 && (
                <line x1={ex} y1={ey} x2={ex} y2={ey+LEG_ROW_H}
                  stroke={C.legBorder} strokeWidth="0.4" opacity="0.5"/>
              )}
              {/* Code badge */}
              <rect x={ex+4} y={ey+LEG_ROW_H/2-6} width={CODE_W-4} height={12}
                fill={C.accentBg} stroke={C.accent} strokeWidth="0.7" rx="2"/>
              <text x={ex+4+(CODE_W-4)/2} y={ey+LEG_ROW_H/2} textAnchor="middle" dominantBaseline="middle"
                fill={C.accent} fontSize="7" fontFamily={FONT} fontWeight="800">{entry.code}</text>
              {/* Name */}
              <text x={ex+CODE_W+4} y={ey+LEG_ROW_H/2} dominantBaseline="middle"
                fill={C.labelText} fontSize="7" fontFamily={FONT} fontWeight="600">{dispName}</text>
              {/* Dims */}
              <text x={ex+LEG_COL_W-4} y={ey+LEG_ROW_H/2} textAnchor="end" dominantBaseline="middle"
                fill={C.dimLine} fontSize="7" fontFamily={FONT} fontWeight="700"
                style={{fontVariantNumeric:'tabular-nums'}}>{entry.dim} mm</text>
            </g>
          );
        })}
      </g>
    );
  };

  // ── Title cartouche ──────────────────────────────────────────────────────────
  const titleStr = board.isOffcut ? `Retazo ${boardIndex+1}` : `Tablero ${boardIndex+1}`;
  const tbW = Math.min(360, SVG_W - 16);
  const tbX = 8, tbH = 32;
  const tbY = legendEntries.length > 0 ? LEG_Y - tbH - 8 : SVG_H - tbH - 8;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height="100%"
      style={{display:'block'}} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={`${uid}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20,0 L0,0 0,20" fill="none" stroke={C.grid} strokeWidth="0.5"/>
        </pattern>
        <pattern id={`${uid}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={C.hatch} strokeWidth="1.2"/>
        </pattern>
      </defs>

      <rect width={SVG_W} height={SVG_H} fill={C.bg}/>
      <rect width={SVG_W} height={SVG_H} fill={`url(#${uid}-grid)`}/>
      <rect x={ox} y={oy} width={boardW} height={boardH}
        fill={C.paper} stroke={C.boardStroke} strokeWidth="1.5"/>

      {offcutElements}
      {pieceElements}

      <BoardDimH x1={ox} x2={ox+boardW} y={DIM_ABOVE} label={stockWidth}/>
      <BoardDimV x={DIM_LEFT} y1={oy} y2={oy+boardH} label={stockHeight}/>

      <LegendTable/>

      {/* Cartouche */}
      <rect x={tbX} y={tbY} width={tbW} height={tbH}
        fill={C.dimBg} stroke={C.legBorder} strokeWidth="0.7" rx="2"/>
      <line x1={tbX} y1={tbY+15} x2={tbX+tbW} y2={tbY+15} stroke={C.legBorder} strokeWidth="0.5"/>
      <text x={tbX+tbW/2} y={tbY+8} textAnchor="middle" dominantBaseline="middle"
        fill={C.labelText} fontSize="9" fontFamily={FONT} fontWeight="800">
        {titleStr} — Plano Técnico de Corte
      </text>
      <text x={tbX+8} y={tbY+27} dominantBaseline="middle" fill={C.dimText} fontSize="7.5" fontFamily={FONT}>
        {stockWidth} × {stockHeight} mm
      </text>
      <text x={tbX+tbW/2} y={tbY+27} textAnchor="middle" dominantBaseline="middle"
        fill={C.dimText} fontSize="7.5" fontFamily={FONT}>
        {pieces.length} piezas · {board.utilization?.toFixed(1)}% uso
      </text>
      <text x={tbX+tbW-8} y={tbY+27} textAnchor="end" dominantBaseline="middle"
        fill={C.dimText} fontSize="7.5" fontFamily={FONT}>
        Kerf: {board.cutSequence?.[0]?.kerf ?? '—'} mm
      </text>

    </svg>
  );
}
