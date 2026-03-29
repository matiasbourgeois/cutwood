import React from 'react';
import { getPieceColor } from '../../utils/colors';

/**
 * BoardDiagram — SVG idéntico al CutDiagram de la app principal.
 * Sin pan/zoom. Para impresión. Respeta dark/light mode via CSS.
 */
export default function BoardDiagram({ board, allPieceIds, isDark = false }) {
  if (!board) return null;
  const { stockWidth, stockHeight, pieces } = board;

  // ── Geometry ───────────────────────────────────────────────────────────────
  const padding     = 28;
  const arrowMargin = 65;
  const maxSvgDim   = 900;
  const rawAspect   = stockHeight / stockWidth;
  const aspect      = Math.max(0.4, Math.min(rawAspect, 1.5));
  const svgW        = maxSvgDim + arrowMargin;
  const svgH        = aspect * maxSvgDim + arrowMargin;
  const scaleX      = (maxSvgDim - padding * 2) / stockWidth;
  const scaleY      = (aspect * maxSvgDim - padding * 2) / stockHeight;
  const bScale      = Math.min(scaleX, scaleY);
  const boardW      = stockWidth  * bScale;
  const boardH      = stockHeight * bScale;
  const offsetX     = (maxSvgDim - boardW) / 2;
  const offsetY     = (aspect * maxSvgDim - boardH) / 2;

  const FONT = 'Inter, system-ui, sans-serif';

  // Colores adaptativos al tema
  const boardBg     = isDark ? '#0f172a' : '#dde4ef';
  const boardStroke = isDark ? '#334155' : '#94a3b8';
  const accentColor = '#06B6D4';
  const labelBg     = isDark ? 'rgba(6,182,212,0.10)' : 'rgba(6,182,212,0.12)';
  const labelBorder = isDark ? 'rgba(6,182,212,0.20)' : 'rgba(6,182,212,0.30)';
  const pieceTextFill = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.90)';
  const dimLineFill   = isDark ? 'rgba(255,255,255,0.80)' : 'rgba(15,23,42,0.75)';
  const grainStroke   = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  const hatchStroke   = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
  const offcutFill    = isDark ? 'rgba(30,30,50,0.60)'    : 'rgba(148,163,184,0.15)';
  const offcutStroke  = isDark ? '#94a3b8'                : '#64748b';
  const offcutText    = isDark ? 'rgba(148,163,184,0.9)'  : 'rgba(71,85,105,0.9)';
  const offcutDimC    = isDark ? 'rgba(251,191,36,0.82)'  : 'rgba(180,120,10,0.85)';
  const offcutDimT    = isDark ? 'rgba(251,191,36,0.95)'  : 'rgba(160,100,5,0.95)';
  const shadowColor   = isDark ? '#06B6D4'                : '#0ea5e9';
  const gradFrom      = isDark ? '#06B6D4'                : '#0ea5e9';

  const uid = board.id || 'bd';

  // ── Dim text helper ────────────────────────────────────────────────────────
  const dimText = (x, y, rotate, label, fontSize, color) => (
    <text
      key={`dt-${label}-${x}-${y}`}
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={color}
      fontSize={fontSize}
      fontFamily={FONT}
      fontWeight="600"
      style={{ fontVariantNumeric: 'tabular-nums' }}
      transform={rotate ? `rotate(${rotate},${x},${y})` : undefined}
    >
      {label}
    </text>
  );

  // ── Full dimension arrows — ALWAYS renders something ──────────────────────
  const renderDimLines = (px, py, pw, ph, piece, showLabel) => {
    const nameFs = showLabel ? Math.max(9, Math.min(13, pw / 8)) : 0;
    const lc     = dimLineFill;
    const AL = 5, tl = 3.5, p = 10;
    const label   = `${piece.placedWidth}×${piece.placedHeight}`;
    const textClr = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.90)';
    const textClrDim = isDark ? 'rgba(255,255,255,0.78)' : 'rgba(15,23,42,0.65)';

    // ── TIER 1: FULL ARROWS — large pieces ─────────────────────────────────
    if (pw >= 100 && ph >= 52) {
      const showV = ph >= 60; // show vertical arrow when piece has enough height
      const fs    = Math.max(6.5, Math.min(10.5, pw / 13));
      const hy    = py + p + 2;
      const hx1   = px + p;
      const hx2   = px + pw - p;
      const hmx   = (hx1 + hx2) / 2;
      const arrowBotY = hy + tl + 2;
      const nameTopY  = showLabel ? py + ph / 2 - nameFs / 2 - 1 : Infinity;

      if (arrowBotY < nameTopY) {
        const vx     = px + pw - p - 1;
        const vy1    = hy + tl + 8;
        const vy2    = py + ph - p;
        const vmy    = (vy1 + vy2) / 2;
        const wLabel = String(piece.placedWidth);
        const hLabel = String(piece.placedHeight);
        const halfW  = wLabel.length * fs * 0.3 + 4;
        const halfH  = hLabel.length * fs * 0.3 + 4;
        return (
          <g pointerEvents="none">
            <line x1={hx1} y1={hy-tl} x2={hx1} y2={hy+tl} stroke={lc} strokeWidth="0.9"/>
            <line x1={hx2} y1={hy-tl} x2={hx2} y2={hy+tl} stroke={lc} strokeWidth="0.9"/>
            <line x1={hx1} y1={hy} x2={hmx-halfW-2} y2={hy} stroke={lc} strokeWidth="0.75"/>
            <line x1={hmx+halfW+2} y1={hy} x2={hx2} y2={hy} stroke={lc} strokeWidth="0.75"/>
            <polygon points={`${hx1},${hy} ${hx1+AL},${hy-2} ${hx1+AL},${hy+2}`} fill={lc}/>
            <polygon points={`${hx2},${hy} ${hx2-AL},${hy-2} ${hx2-AL},${hy+2}`} fill={lc}/>
            {dimText(hmx, hy, null, wLabel, fs, textClr)}
            {showV && <>
              <line x1={vx-tl} y1={vy1} x2={vx+tl} y2={vy1} stroke={lc} strokeWidth="0.9"/>
              <line x1={vx-tl} y1={vy2} x2={vx+tl} y2={vy2} stroke={lc} strokeWidth="0.9"/>
              <line x1={vx} y1={vy1} x2={vx} y2={vmy-halfH-2} stroke={lc} strokeWidth="0.75"/>
              <line x1={vx} y1={vmy+halfH+2} x2={vx} y2={vy2} stroke={lc} strokeWidth="0.75"/>
              <polygon points={`${vx},${vy1} ${vx-2},${vy1+AL} ${vx+2},${vy1+AL}`} fill={lc}/>
              <polygon points={`${vx},${vy2} ${vx-2},${vy2-AL} ${vx+2},${vy2-AL}`} fill={lc}/>
              {dimText(vx, vmy, -90, hLabel, fs, textClr)}
            </>}
          </g>
        );
      }
      // Fall through if arrow clashes with name
    }

    // ── TIER 2: COMPACT inline — medium pieces ──────────────────────────────
    if (pw >= 38 && ph >= 20) {
      const fs       = Math.max(6, Math.min(8, pw / 13));
      const nameBotY = showLabel ? py + ph / 2 + nameFs / 2 + 1 : py + ph / 2;
      const nameTopY = showLabel ? py + ph / 2 - nameFs / 2 - 1 : py + ph / 2;

      const posBelow = nameBotY + fs / 2 + 2;
      if (posBelow + fs / 2 < py + ph - 1) {
        return <g pointerEvents="none">{dimText(px + pw/2, posBelow, null, label, fs, textClrDim)}</g>;
      }
      const posAbove = nameTopY - fs / 2 - 2;
      if (posAbove - fs / 2 > py + 1) {
        return <g pointerEvents="none">{dimText(px + pw/2, posAbove, null, label, fs, textClrDim)}</g>;
      }
      // Clamped inside
      const clampedY = Math.min(nameBotY + fs / 2 + 1, py + ph - fs / 2 - 1);
      if (clampedY + fs / 2 <= py + ph && clampedY - fs / 2 >= py) {
        return <g pointerEvents="none">{dimText(px + pw/2, clampedY, null, label, Math.max(5.5, Math.min(fs, 7)), isDark ? 'rgba(255,255,255,0.60)' : 'rgba(15,23,42,0.50)')}</g>;
      }
    }

    // ── TIER 3: EXTERNAL CALLOUT — small/tiny pieces (ALWAYS renders) ───────
    // Pill label with leader line, placed outside the piece.
    // Strategy: try above first, then below, then to the right.
    {
      const fs      = 7.5;
      const charW   = fs * 0.58;
      const pillW   = label.length * charW + 10;
      const pillH   = 13;
      const pillR   = 3.5;
      const pill    = isDark ? 'rgba(15,20,35,0.92)'   : 'rgba(255,255,255,0.95)';
      const pillStr = isDark ? 'rgba(6,182,212,0.5)'   : 'rgba(6,182,212,0.6)';
      const txtC    = isDark ? 'rgba(6,182,212,0.95)'  : '#0369a1';
      const ldC     = isDark ? 'rgba(6,182,212,0.55)'  : 'rgba(6,182,212,0.65)';

      // Anchor: center of piece
      const ancX = px + pw / 2;
      const ancY = py + ph / 2;

      // ABOVE
      const labelY_above = py - 10;
      if (labelY_above - pillH / 2 > 0) {
        return (
          <g pointerEvents="none">
            {/* leader line from top edge to pill */}
            <line x1={ancX} y1={py} x2={ancX} y2={labelY_above + pillH/2 + 1}
              stroke={ldC} strokeWidth="0.75" strokeDasharray="2 1.5"/>
            {/* pill */}
            <rect x={ancX - pillW/2} y={labelY_above - pillH/2}
              width={pillW} height={pillH} rx={pillR}
              fill={pill} stroke={pillStr} strokeWidth="0.8"/>
            {dimText(ancX, labelY_above, null, label, fs, txtC)}
          </g>
        );
      }

      // BELOW
      const labelY_below = py + ph + 10;
      {
        return (
          <g pointerEvents="none">
            <line x1={ancX} y1={py + ph} x2={ancX} y2={labelY_below - pillH/2 - 1}
              stroke={ldC} strokeWidth="0.75" strokeDasharray="2 1.5"/>
            <rect x={ancX - pillW/2} y={labelY_below - pillH/2}
              width={pillW} height={pillH} rx={pillR}
              fill={pill} stroke={pillStr} strokeWidth="0.8"/>
            {dimText(ancX, labelY_below, null, label, fs, txtC)}
          </g>
        );
      }
    }
  };


  // ── Offcut dimension arrows — ALWAYS shows BOTH dimensions ─────────────────
  const renderRetazoDims = (sx, sy, sw, sh, oc, showLabel) => {
    const lc    = offcutDimC;
    const amber = offcutDimT;
    const AL = 5, tl = 3.5, p = 10;
    const wLabel = String(oc.width);
    const hLabel = String(oc.height);
    const label  = `${oc.width}×${oc.height}`;

    // ── TIER 1: FULL ARROWS — show H arrow whenever sh is big enough ────────
    if (sw >= 55 && sh >= 28) {
      const showV = sh >= 50; // ← only needs height, NOT width
      const fs    = Math.max(6.5, Math.min(9.5, sw / 13));
      const hy    = sy + p + 2;
      const hx1   = sx + p, hx2 = sx + sw - p, hmx = (hx1 + hx2) / 2;
      const halfW = wLabel.length * fs * 0.3 + 4;

      // Vertical arrow on right side
      const vx    = sx + sw - p - 1;
      const vy1   = hy + tl + 8;
      const vy2   = sy + sh - p;
      const vmy   = (vy1 + vy2) / 2;
      const halfH = hLabel.length * fs * 0.3 + 4;

      return (
        <g pointerEvents="none">
          {/* Horizontal arrow (always shown) */}
          <line x1={hx1} y1={hy-tl} x2={hx1} y2={hy+tl} stroke={lc} strokeWidth="0.9"/>
          <line x1={hx2} y1={hy-tl} x2={hx2} y2={hy+tl} stroke={lc} strokeWidth="0.9"/>
          <line x1={hx1} y1={hy} x2={hmx-halfW-2} y2={hy} stroke={lc} strokeWidth="0.75"/>
          <line x1={hmx+halfW+2} y1={hy} x2={hx2} y2={hy} stroke={lc} strokeWidth="0.75"/>
          <polygon points={`${hx1},${hy} ${hx1+AL},${hy-2} ${hx1+AL},${hy+2}`} fill={lc}/>
          <polygon points={`${hx2},${hy} ${hx2-AL},${hy-2} ${hx2-AL},${hy+2}`} fill={lc}/>
          {dimText(hmx, hy, null, wLabel, fs, amber)}

          {/* Vertical arrow — show when sh >= 50 */}
          {showV && <>
            <line x1={vx-tl} y1={vy1} x2={vx+tl} y2={vy1} stroke={lc} strokeWidth="0.9"/>
            <line x1={vx-tl} y1={vy2} x2={vx+tl} y2={vy2} stroke={lc} strokeWidth="0.9"/>
            <line x1={vx} y1={vy1} x2={vx} y2={vmy-halfH-2} stroke={lc} strokeWidth="0.75"/>
            <line x1={vx} y1={vmy+halfH+2} x2={vx} y2={vy2} stroke={lc} strokeWidth="0.75"/>
            <polygon points={`${vx},${vy1} ${vx-2},${vy1+AL} ${vx+2},${vy1+AL}`} fill={lc}/>
            <polygon points={`${vx},${vy2} ${vx-2},${vy2-AL} ${vx+2},${vy2-AL}`} fill={lc}/>
            {dimText(vx, vmy, -90, hLabel, fs, amber)}
          </>}

          {/* If not showing V arrow, append ×H to the horizontal label */}
          {!showV && dimText(hmx, hy + fs + 3, null, `×${hLabel}`, fs * 0.9, amber)}
        </g>
      );
    }

    // ── TIER 2: COMPACT W×H — medium/small retazos ──────────────────────────
    if (sw >= 20 || sh >= 20) {
      const fs       = Math.max(6, Math.min(8.5, Math.max(sw, sh) / 14));
      const labelTopY = showLabel ? sy + sh / 2 - 9 : sy + sh / 2;
      const posBelow  = labelTopY + fs / 2 + 3;
      // Try below the "R#" label
      if (posBelow + fs / 2 < sy + sh - 1) {
        return <g pointerEvents="none">{dimText(sx + sw/2, posBelow, null, label, fs, amber)}</g>;
      }
      // Try at center (no R# label or it's hidden)
      if (!showLabel) {
        return <g pointerEvents="none">{dimText(sx + sw/2, sy + sh/2, null, label, fs, amber)}</g>;
      }
      // Clamped
      const clampY = Math.max(sy + fs, Math.min(sy + sh - fs, posBelow));
      return <g pointerEvents="none">{dimText(sx + sw/2, clampY, null, label, Math.max(5.5, fs), amber)}</g>;
    }

    // ── TIER 3: EXTERNAL AMBER PILL — tiny retazos (ALWAYS renders) ─────────
    {
      const fs    = 7.5;
      const charW = fs * 0.58;
      const pillW = label.length * charW + 10;
      const pillH = 13;
      const pillR = 3.5;
      const pill    = isDark ? 'rgba(30,20,5,0.92)'  : 'rgba(255,250,235,0.95)';
      const pillStr = isDark ? 'rgba(251,191,36,0.5)' : 'rgba(180,120,10,0.5)';
      const ancX  = sx + sw / 2;
      const goAbove = sy > pillH + 12;
      const labelY  = goAbove ? sy - 10 : sy + sh + 10;
      const tipY    = goAbove ? sy : sy + sh;
      const lineY2  = goAbove ? labelY + pillH/2 + 1 : labelY - pillH/2 - 1;
      return (
        <g pointerEvents="none">
          <line x1={ancX} y1={tipY} x2={ancX} y2={lineY2}
            stroke={amber} strokeWidth="0.75" strokeDasharray="2 1.5"/>
          <rect x={ancX - pillW/2} y={labelY - pillH/2}
            width={pillW} height={pillH} rx={pillR}
            fill={pill} stroke={pillStr} strokeWidth="0.8"/>
          {dimText(ancX, labelY, null, label, fs, amber)}
        </g>
      );
    }
  };


  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Shadow */}
        <filter id={`bd-shadow-${uid}`} x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor={shadowColor} floodOpacity={isDark ? 0.18 : 0.10}/>
        </filter>
        {/* Glow on board outline */}
        <filter id={`bd-glow-${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Grain patterns */}
        <pattern id={`bd-grain-v-${uid}`} patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="3" y1="0" x2="3" y2="6" stroke={grainStroke} strokeWidth="1"/>
        </pattern>
        <pattern id={`bd-grain-h-${uid}`} patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="3" x2="6" y2="3" stroke={grainStroke} strokeWidth="1"/>
        </pattern>
        {/* Offcut hatch */}
        <pattern id={`bd-hatch-${uid}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={hatchStroke} strokeWidth="1.5"/>
        </pattern>
        {/* Board body gradient */}
        <linearGradient id={`bd-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={isDark ? '#0f172a' : '#e2e8f0'}/>
          <stop offset="100%" stopColor={isDark ? '#1e293b' : '#cbd5e1'}/>
        </linearGradient>
        {/* Corner accent gradient */}
        <linearGradient id={`bd-edge-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={gradFrom} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={gradFrom} stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* ── BOARD BG ── */}
      <rect
        x={offsetX} y={offsetY} width={boardW} height={boardH}
        fill={`url(#bd-grad-${uid})`}
        stroke={boardStroke} strokeWidth="1.5" rx="3"
        filter={`url(#bd-shadow-${uid})`}
      />
      {/* Top accent edge */}
      <rect x={offsetX} y={offsetY} width={boardW} height="3" rx="1.5"
        fill={`url(#bd-edge-${uid})`} opacity="0.8"/>
      {/* Left accent edge */}
      <rect x={offsetX} y={offsetY} width="3" height={boardH} rx="1.5"
        fill={`url(#bd-edge-${uid})`} opacity="0.5"/>

      {/* ── DIMENSION LABELS (tablero completo) ── */}
      {/* Top — ancho */}
      <g>
        <rect
          x={offsetX + boardW/2 - 34} y={offsetY - 22}
          width={68} height={18} rx="5"
          fill={labelBg} stroke={labelBorder} strokeWidth="0.8"
        />
        <text
          x={offsetX + boardW/2} y={offsetY - 12}
          textAnchor="middle" dominantBaseline="central"
          fill={accentColor} fontSize="10.5"
          fontFamily={FONT} fontWeight="700"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {stockWidth} mm
        </text>
        {/* Arrow tick marks */}
        <line x1={offsetX} y1={offsetY - 20} x2={offsetX} y2={offsetY - 9} stroke={accentColor} strokeWidth="0.8" strokeOpacity="0.5"/>
        <line x1={offsetX + boardW} y1={offsetY - 20} x2={offsetX + boardW} y2={offsetY - 9} stroke={accentColor} strokeWidth="0.8" strokeOpacity="0.5"/>
      </g>
      {/* Left — alto */}
      <g transform={`rotate(-90,${offsetX - 16},${offsetY + boardH/2})`}>
        <rect
          x={offsetX - 16 - 34} y={offsetY + boardH/2 - 9}
          width={68} height={18} rx="5"
          fill={labelBg} stroke={labelBorder} strokeWidth="0.8"
        />
        <text
          x={offsetX - 16} y={offsetY + boardH/2}
          textAnchor="middle" dominantBaseline="central"
          fill={accentColor} fontSize="10.5"
          fontFamily={FONT} fontWeight="700"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {stockHeight} mm
        </text>
      </g>

      {/* ── PIECES ── */}
      {pieces.map((piece, i) => {
        const idx   = allPieceIds.indexOf(piece.id);
        const color = getPieceColor(idx >= 0 ? idx : i);
        const px = offsetX + piece.x * bScale;
        const py = offsetY + piece.y * bScale;
        const pw = piece.placedWidth  * bScale;
        const ph = piece.placedHeight * bScale;
        const bg       = board.boardGrain || 'none';
        const grainDir = piece.rotated ? (bg === 'horizontal' ? 'vertical' : 'horizontal') : bg;
        const cx = px + pw / 2;
        const cy = py + ph / 2;
        const dimLabel = `${piece.placedWidth}×${piece.placedHeight}`;
        const pName    = piece.name || `P${i + 1}`;

        // ── Rendering mode decision ──────────────────────────────────────────
        // In SVG, when we rotate -90° around (cx,cy):
        //   - Local X (text width)  → maps to Screen Y (constrained by ph)
        //   - Local Y (font height) → maps to Screen X (constrained by pw)
        // So for Mode B: fontHeight ≤ pw, textWidth ≤ ph
        const CHAR_RATIO = 0.62; // average char width / fontSize

        const isWide         = pw >= 42;
        const isTall         = ph >= 22;
        const isNarrow       = pw < 42;
        const isTallerThanWide = ph > pw + 4;
        const canDoVertical  = ph >= 38;

        const useVertical   = isNarrow && isTallerThanWide && canDoVertical;
        const useHorizontal = isWide && isTall && !useVertical;

        // ── Mode A — Horizontal font sizes ───────────────────────────────────
        const nameFsH = Math.max(7.5, Math.min(13, pw / 7));

        // ── Mode B — Vertical font sizes (keys: fontHeight≤pw, textLen≤ph) ──
        // nameFsV: capped so (a) font height fits in pw, (b) text span ≤ 90% of ph
        const maxFsV_byWidth   = pw * 0.72;                              // font height → screen X ≤ pw
        const maxFsV_byLength  = (ph * 0.88) / (pName.length * CHAR_RATIO); // text width → screen Y ≤ ph
        const nameFsV = Math.max(5.5, Math.min(10, maxFsV_byWidth, maxFsV_byLength));

        // dimFsV: remaining "screen X space" = pw - nameFsV (local Y space)
        const dimGap          = 2.5;
        const remainPW        = pw - nameFsV - dimGap;  // px left for dim font height
        const maxDimFsByWidth  = Math.max(0, remainPW * 0.9);
        const maxDimFsByLength = (ph * 0.88) / (dimLabel.length * CHAR_RATIO);
        const dimFsV  = Math.max(5, Math.min(8.5, maxDimFsByWidth, maxDimFsByLength));
        const showDimsV = dimFsV >= 5 && remainPW >= 5;

        // Center the name+dims stack in the SCREEN X direction (= local Y after rotation)
        // Total local-Y stack height: nameFsV + gap + (dimFsV or 0)
        const stackH   = nameFsV + (showDimsV ? dimGap + dimFsV : 0);
        const nameLocalY = cy - stackH / 2 + nameFsV / 2; // local y of name center
        const dimLocalY  = nameLocalY + nameFsV / 2 + dimGap + dimFsV / 2; // local y of dim center

        return (
          <g key={`${piece.id}-${i}`}>
            {/* Piece fill */}
            <rect x={px} y={py} width={pw} height={ph}
              fill={color.bg} stroke={color.border} strokeWidth={1} rx="2"/>

            {/* Grain overlay */}
            {bg !== 'none' && (
              <rect x={px} y={py} width={pw} height={ph}
                fill={`url(#bd-grain-${grainDir === 'vertical' ? 'v' : 'h'}-${uid})`}
                rx="2" pointerEvents="none"/>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MODE A — HORIZONTAL (wide pieces)
                → Name only here; renderDimLines handles dimensions below
               ═══════════════════════════════════════════════════════════════ */}
            {useHorizontal && (
              <text x={cx} y={cy}
                textAnchor="middle" dominantBaseline="middle"
                fill={pieceTextFill}
                fontSize={nameFsH}
                fontFamily={FONT} fontWeight="700"
                pointerEvents="none"
              >
                {pName}
              </text>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MODE B — VERTICAL (narrow portrait pieces)
                NO clipPath: font is scaled to fit naturally.
                rotate(-90) so text reads bottom-to-top.
                Local X (text length) → Screen Y → constrained by ph ✓
                Local Y (font height) → Screen X → constrained by pw ✓
               ═══════════════════════════════════════════════════════════════ */}
            {useVertical && (
              <g pointerEvents="none" transform={`rotate(-90, ${cx}, ${cy})`}>
                {/* Name — positioned at nameLocalY (local y = screen x after rotation) */}
                <text
                  x={cx} y={nameLocalY}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={pieceTextFill}
                  fontSize={nameFsV}
                  fontFamily={FONT} fontWeight="700"
                >
                  {pName}
                </text>
                {/* Dimensions below name */}
                {showDimsV && (
                  <text
                    x={cx} y={dimLocalY}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={isDark ? 'rgba(255,255,255,0.68)' : 'rgba(15,23,42,0.60)'}
                    fontSize={dimFsV}
                    fontFamily={FONT} fontWeight="600"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {dimLabel}
                  </text>
                )}
              </g>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MODE C — EXTERNAL CALLOUT (tiny in both dimensions)
                Styled in the PIECE'S own color (not cyan)
               ═══════════════════════════════════════════════════════════════ */}
            {!useHorizontal && !useVertical && (() => {
              const fs    = 7;
              const charW = fs * 0.58;
              const pillW = (pName.length + dimLabel.length + 1) * charW + 14;
              const pillH = 14;
              const ldC   = color.border;
              const ancX  = cx;
              // Prefer above piece, fallback to below
              const goAbove = py > pillH + 14;
              const labelY  = goAbove ? py - 10 : py + ph + 10;
              const tipY    = goAbove ? py : py + ph;
              const lineY2  = goAbove ? labelY + pillH / 2 + 1 : labelY - pillH / 2 - 1;
              return (
                <g pointerEvents="none">
                  <line x1={ancX} y1={tipY} x2={ancX} y2={lineY2}
                    stroke={ldC} strokeWidth="0.8" strokeDasharray="2 1.5"/>
                  <rect x={ancX - pillW / 2} y={labelY - pillH / 2}
                    width={pillW} height={pillH} rx="4"
                    fill={color.bg} stroke={color.border} strokeWidth="0.9"/>
                  <text x={ancX} y={labelY}
                    textAnchor="middle" dominantBaseline="central"
                    fill={pieceTextFill}
                    fontSize={fs}
                    fontFamily={FONT} fontWeight="700"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {pName} {dimLabel}
                  </text>
                </g>
              );
            })()}

            {/* ── DIMENSION ARROWS — ONLY for Mode A horizontal pieces ── */}
            {useHorizontal && renderDimLines(px, py, pw, ph, piece, true)}

            {/* Grain badge (Mode A only, wide enough) */}
            {bg !== 'none' && useHorizontal && pw > 48 && (() => {
              const ef = piece.rotated ? (bg === 'horizontal' ? 'vertical' : 'horizontal') : bg;
              return (
                <g>
                  <rect x={px + pw - 19} y={py + 2} width={16} height={16} rx="3"
                    fill={isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'}
                    stroke={color.border} strokeWidth="0.5"/>
                  <text x={px + pw - 11} y={py + 10}
                    textAnchor="middle" dominantBaseline="central"
                    fill={isDark ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.85)'}
                    fontSize="11" fontWeight="700">
                    {ef === 'vertical' ? '↕' : '↔'}
                  </text>
                </g>
              );
            })()}

            {/* Rotation badge (Mode A only) */}
            {piece.rotated && useHorizontal && (
              <text x={px + 6} y={py + 12}
                fill={color.border} fontSize="9"
                fontFamily={FONT} fontWeight="700">↻</text>
            )}
          </g>
        );
      })}
      {/* ── OFFCUTS / RETAZOS ── */}
      {board.offcuts?.map((oc, i) => {
        const sx = offsetX + oc.x     * bScale;
        const sy = offsetY + oc.y     * bScale;
        const sw = oc.width  * bScale;
        const sh = oc.height * bScale;
        const showLbl = sw > 30 && sh > 16;
        return (
          <g key={`oc-${i}`}>
            <rect x={sx} y={sy} width={sw} height={sh}
              fill={offcutFill} stroke={offcutStroke}
              strokeWidth="1" strokeDasharray="5 3" rx="2"/>
            <rect x={sx} y={sy} width={sw} height={sh}
              fill={`url(#bd-hatch-${uid})`} rx="2" pointerEvents="none"/>
            {showLbl && (
              <>
                <text x={sx + sw/2} y={sy + sh/2 - 7}
                  textAnchor="middle" dominantBaseline="central"
                  fill={offcutText}
                  fontSize={Math.max(8, Math.min(11, sw / 8))}
                  fontFamily={FONT} fontWeight="700">
                  R{i + 1}
                </text>
              </>
            )}
            {renderRetazoDims(sx, sy, sw, sh, oc, showLbl)}
          </g>
        );
      })}
    </svg>
  );
}
