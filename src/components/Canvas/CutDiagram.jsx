import { useState, useCallback, useRef, useEffect } from 'react';
import { getPieceColor } from '../../utils/colors';

const MIN_ZOOM    = 0.15;
const MAX_ZOOM    = 6;
const ZOOM_STEP   = 1.18;
const CANVAS_FONT = 'Inter, system-ui, sans-serif';

export default function CutDiagram({ board, allPieceIds, hoveredCut, isPrintMode = false }) {
  const [tooltip, setTooltip]     = useState(null);
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const { scale, tx, ty } = transform;

  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const isPanning    = useRef(false);
  const panStart     = useRef(null);
  const lastBoardId  = useRef(null);

  if (!board) return null;
  const { stockWidth, stockHeight, pieces } = board;

  // ── SVG geometry ──────────────────────────────────────────────────────────
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

  // ── Fit ───────────────────────────────────────────────────────────────────
  const fitToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const fitScale = Math.min((width - 48) / svgW, (height - 48) / svgH);
    setTransform({
      scale: fitScale,
      tx: (width  - svgW * fitScale) / 2,
      ty: (height - svgH * fitScale) / 2,
    });
  }, [svgW, svgH]);

  useEffect(() => { requestAnimationFrame(fitToContainer); }, []); // eslint-disable-line
  useEffect(() => {
    if (board?.id !== lastBoardId.current) {
      lastBoardId.current = board?.id;
      requestAnimationFrame(fitToContainer);
    }
  }, [board?.id, fitToContainer]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const zoomToPoint = useCallback((factor, clientX, clientY) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    setTransform(prev => {
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.scale * factor));
      const ratio    = newScale / prev.scale;
      return { scale: newScale, tx: mx - ratio * (mx - prev.tx), ty: my - ratio * (my - prev.ty) };
    });
  }, []);

  const zoomCenter = useCallback((factor) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomToPoint(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [zoomToPoint]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const sf = e.deltaY < 0
      ? 1 + Math.min(0.25, Math.abs(e.deltaY) * 0.003)
      : 1 - Math.min(0.25, Math.abs(e.deltaY) * 0.003);
    zoomToPoint(sf, e.clientX, e.clientY);
  }, [zoomToPoint]);

  useEffect(() => {
    if (isPrintMode) return;
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, isPrintMode]);

  // ── Pan — FIX: capture tx/ty before async setTransform callback ───────────
  const handlePanStart = useCallback((e) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current  = { x: e.clientX, y: e.clientY, tx: transform.tx, ty: transform.ty };
    containerRef.current?.classList.add('is-panning');
  }, [transform.tx, transform.ty]);

  const handlePanMove = useCallback((e) => {
    if (!isPanning.current || !panStart.current) return;
    const dx      = e.clientX - panStart.current.x;
    const dy      = e.clientY - panStart.current.y;
    // Capture BEFORE the async updater runs — prevents null-read crash
    const startTx = panStart.current.tx;
    const startTy = panStart.current.ty;
    // Capture container size before async callback
    const el = containerRef.current;
    const cW = el ? el.clientWidth  : window.innerWidth;
    const cH = el ? el.clientHeight : window.innerHeight;
    setTransform(prev => {
      const MARGIN = 100;  // min px of SVG that must stay visible
      const rawTx  = startTx + dx;
      const rawTy  = startTy + dy;
      const minTx  = MARGIN - svgW * prev.scale;   // can't go further left
      const maxTx  = cW - MARGIN;                  // can't go further right
      const minTy  = MARGIN - svgH * prev.scale;   // can't go further up
      const maxTy  = cH - MARGIN;                  // can't go further down
      return {
        ...prev,
        tx: Math.max(minTx, Math.min(maxTx, rawTx)),
        ty: Math.max(minTy, Math.min(maxTy, rawTy)),
      };
    });
  }, [svgW, svgH]);

  const handlePanEnd = useCallback(() => {
    isPanning.current = false;
    panStart.current  = null;
    containerRef.current?.classList.remove('is-panning');
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input, textarea, select')) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomCenter(ZOOM_STEP); }
      if (e.key === '-')                  { e.preventDefault(); zoomCenter(1 / ZOOM_STEP); }
      if (e.key === '0')                  { e.preventDefault(); fitToContainer(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomCenter, fitToContainer]);

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const handleMouseEnter = (e, piece) => setTooltip({ x: e.clientX + 12, y: e.clientY - 10, piece });
  const handleMouseMove  = (e) => { if (tooltip) setTooltip(t => ({ ...t, x: e.clientX + 12, y: e.clientY - 10 })); };
  const handleMouseLeave = () => setTooltip(null);

  // ── Cut helpers ───────────────────────────────────────────────────────────
  const getAdjacent = (piece, idx) => {
    if (!hoveredCut) return false;
    const kerf = hoveredCut.kerf || 3;
    if (hoveredCut.affectedPieceIndices?.includes(idx)) return true;
    if (hoveredCut.type === 'horizontal')
      return Math.abs((piece.y + piece.placedHeight) - hoveredCut.position) <= kerf
          || Math.abs(piece.y - hoveredCut.position) <= kerf;
    return Math.abs((piece.x + piece.placedWidth) - hoveredCut.position) <= kerf
        || Math.abs(piece.x - hoveredCut.position) <= kerf;
  };

  const getCutLine = () => {
    if (!hoveredCut) return null;
    const pos = hoveredCut.position * bScale;
    const r   = hoveredCut.region;
    if (hoveredCut.type === 'horizontal') {
      return {
        x1: r ? offsetX + r.left  * bScale : offsetX,  y1: offsetY + pos,
        x2: r ? offsetX + r.right * bScale : offsetX + boardW, y2: offsetY + pos,
      };
    }
    return {
      x1: offsetX + pos, y1: r ? offsetY + r.top    * bScale : offsetY,
      x2: offsetX + pos, y2: r ? offsetY + r.bottom * bScale : offsetY + boardH,
    };
  };
  const cutLine = getCutLine();

  // ── Dim text: no shadow, no stroke, no badge — clean white/amber ──────────
  const dimText = (x, y, rotate, label, fontSize, color = 'rgba(255,255,255,0.95)') => (
    <text
      key={label + x}
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={color}
      fontSize={fontSize}
      fontFamily={CANVAS_FONT}
      fontWeight="500"
      style={{ fontVariantNumeric: 'tabular-nums' }}
      transform={rotate ? `rotate(${rotate},${x},${y})` : undefined}
    >
      {label}
    </text>
  );

  // ── Piece dimension annotations ───────────────────────────────────────────
  // Strategy for thin pieces: 3-position fallback:
  //   1. Below name  2. Above name  3. External label above piece top edge
  const renderDimLines = (px, py, pw, ph, piece, showLabel) => {
    const vpw    = pw * scale;
    const vph    = ph * scale;
    const lc     = 'rgba(255,255,255,0.78)';
    const AL     = 5;
    const tl     = 3.5;
    const p      = 10;
    const label  = `${piece.placedWidth}×${piece.placedHeight}`;
    const nameFs = showLabel ? Math.max(9, Math.min(13, pw / 8)) : 0;

    // ── FULL ARROWS (large visual) ─────────────────────────────────────────
    if (vpw >= 100 && vph >= 52) {
      const showV = vph >= 60; // show vertical arrow when piece has enough visible height
      const fs    = Math.max(6.5, Math.min(10.5, pw / 13));
      const hy    = py + p + 2;
      const hx1   = px + p;
      const hx2   = px + pw - p;
      const hmx   = (hx1 + hx2) / 2;

      // Check clearance between arrow and name
      const arrowBotY = hy + tl + 2;
      const nameTopY  = showLabel ? py + ph / 2 - nameFs / 2 - 1 : Infinity;
      const arrowFits = arrowBotY < nameTopY;

      if (arrowFits) {
        // Height arrow — starts below width arrow
        const vx    = px + pw - p - 1;
        const vy1   = hy + tl + 8;
        const vy2   = py + ph - p;
        const vmy   = (vy1 + vy2) / 2;
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
            {dimText(hmx, hy, null, wLabel, fs)}
            {showV && <>
              <line x1={vx-tl} y1={vy1} x2={vx+tl} y2={vy1} stroke={lc} strokeWidth="0.9"/>
              <line x1={vx-tl} y1={vy2} x2={vx+tl} y2={vy2} stroke={lc} strokeWidth="0.9"/>
              <line x1={vx} y1={vy1} x2={vx} y2={vmy-halfH-2} stroke={lc} strokeWidth="0.75"/>
              <line x1={vx} y1={vmy+halfH+2} x2={vx} y2={vy2} stroke={lc} strokeWidth="0.75"/>
              <polygon points={`${vx},${vy1} ${vx-2},${vy1+AL} ${vx+2},${vy1+AL}`} fill={lc}/>
              <polygon points={`${vx},${vy2} ${vx-2},${vy2-AL} ${vx+2},${vy2-AL}`} fill={lc}/>
              {dimText(vx, vmy, -90, hLabel, fs)}
            </>}
          </g>
        );
      }
      // Fall through to compact / external if arrows can't fit
    }

    // ── COMPACT "W×H" — 3-position fallback ───────────────────────────────
    if (vpw >= 38 && pw >= 28) {
      const fs       = Math.max(6, Math.min(8, pw / 13));
      const nameBotY = showLabel ? py + ph / 2 + nameFs / 2 + 1 : py + ph / 2;
      const nameTopY = showLabel ? py + ph / 2 - nameFs / 2 - 1 : py + ph / 2;

      // Position 1: below name
      const posBelow = nameBotY + fs / 2 + 2;
      if (posBelow + fs / 2 < py + ph - 1) {
        return <g pointerEvents="none">{dimText(px + pw/2, posBelow, null, label, fs)}</g>;
      }

      // Position 2: above name
      const posAbove = nameTopY - fs / 2 - 2;
      if (posAbove - fs / 2 > py + 1) {
        return <g pointerEvents="none">{dimText(px + pw/2, posAbove, null, label, fs)}</g>;
      }

      // Position 3: clamped — always INSIDE the piece, clipped to bottom edge
      // For ultra-thin pieces: dim sits just below name, clamped so it never exits the rect.
      const clampedY = Math.min(nameBotY + fs / 2 + 1, py + ph - fs / 2 - 1);
      if (clampedY + fs / 2 <= py + ph && clampedY - fs / 2 >= py) {
        return (
          <g pointerEvents="none">
            {dimText(px + pw / 2, clampedY, null, label,
              Math.max(5.5, Math.min(fs, 7)), 'rgba(255,255,255,0.70)')}
          </g>
        );
      }
    }

    // ── TIER 3: EXTERNAL CALLOUT — tiny pieces ALWAYS render ──────────────
    {
      const fs    = 7.5;
      const charW = fs * 0.58;
      const pillW = label.length * charW + 10;
      const pillH = 13;
      const pillR = 3.5;
      const pill    = 'rgba(10,15,30,0.90)';
      const pillStr = 'rgba(6,182,212,0.5)';
      const txtC    = 'rgba(6,182,212,0.95)';
      const ldC     = 'rgba(6,182,212,0.55)';
      const ancX    = px + pw / 2;

      // ABOVE first
      const labelY_above = py - 10;
      if (labelY_above - pillH / 2 > offsetY) {
        return (
          <g pointerEvents="none">
            <line x1={ancX} y1={py} x2={ancX} y2={labelY_above + pillH/2 + 1}
              stroke={ldC} strokeWidth="0.75" strokeDasharray="2 1.5"/>
            <rect x={ancX - pillW/2} y={labelY_above - pillH/2}
              width={pillW} height={pillH} rx={pillR}
              fill={pill} stroke={pillStr} strokeWidth="0.8"/>
            {dimText(ancX, labelY_above, null, label, fs, txtC)}
          </g>
        );
      }

      // BELOW fallback
      const labelY_below = py + ph + 10;
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
  };

  // ── Retazo dimension annotations — ALWAYS shows BOTH dims ─────────────────
  const renderRetazoDims = (sx, sy, sw, sh, oc, showLabel) => {
    const vpw   = sw * scale;
    const vph   = sh * scale;
    const lc    = 'rgba(251,191,36,0.82)';
    const amber = 'rgba(251,191,36,0.95)';
    const AL    = 5;
    const tl    = 3.5;
    const p     = 10;
    const wLabel = String(oc.width);
    const hLabel = String(oc.height);
    const label = `${oc.width}×${oc.height}`;

    // ── TIER 1: FULL ARROWS ──────────────────────────────────────────────────
    if (vpw >= 55 && vph >= 28) {
      const showV = vph >= 50; // ← only height needed, not width
      const fs     = Math.max(6.5, Math.min(9.5, sw / 13));
      const hy     = sy + p + 2;
      const hx1    = sx + p;
      const hx2    = sx + sw - p;
      const hmx    = (hx1 + hx2) / 2;
      const vx     = sx + sw - p - 1;
      const vy1    = hy + tl + 8;
      const vy2    = sy + sh - p;
      const vmy    = (vy1 + vy2) / 2;
      const halfW  = wLabel.length * fs * 0.3 + 4;
      const halfH  = hLabel.length * fs * 0.3 + 4;

      return (
        <g pointerEvents="none">
          {/* Horizontal arrow */}
          <line x1={hx1} y1={hy-tl} x2={hx1} y2={hy+tl} stroke={lc} strokeWidth="0.9"/>
          <line x1={hx2} y1={hy-tl} x2={hx2} y2={hy+tl} stroke={lc} strokeWidth="0.9"/>
          <line x1={hx1} y1={hy} x2={hmx-halfW-2} y2={hy} stroke={lc} strokeWidth="0.75"/>
          <line x1={hmx+halfW+2} y1={hy} x2={hx2} y2={hy} stroke={lc} strokeWidth="0.75"/>
          <polygon points={`${hx1},${hy} ${hx1+AL},${hy-2} ${hx1+AL},${hy+2}`} fill={lc}/>
          <polygon points={`${hx2},${hy} ${hx2-AL},${hy-2} ${hx2-AL},${hy+2}`} fill={lc}/>
          {dimText(hmx, hy, null, wLabel, fs, amber)}

          {/* Vertical arrow when tall enough */}
          {showV && <>
            <line x1={vx-tl} y1={vy1} x2={vx+tl} y2={vy1} stroke={lc} strokeWidth="0.9"/>
            <line x1={vx-tl} y1={vy2} x2={vx+tl} y2={vy2} stroke={lc} strokeWidth="0.9"/>
            <line x1={vx} y1={vy1} x2={vx} y2={vmy-halfH-2} stroke={lc} strokeWidth="0.75"/>
            <line x1={vx} y1={vmy+halfH+2} x2={vx} y2={vy2} stroke={lc} strokeWidth="0.75"/>
            <polygon points={`${vx},${vy1} ${vx-2},${vy1+AL} ${vx+2},${vy1+AL}`} fill={lc}/>
            <polygon points={`${vx},${vy2} ${vx-2},${vy2-AL} ${vx+2},${vy2-AL}`} fill={lc}/>
            {dimText(vx, vmy, -90, hLabel, fs, amber)}
          </>}

          {/* Fallback: if no V arrow, show ×H as second line below W */}
          {!showV && dimText(hmx, hy + fs + 3, null, `×${hLabel}`, fs * 0.9, amber)}
        </g>
      );
    }

    // ── TIER 2: COMPACT W×H text ─────────────────────────────────────────────
    if (vpw >= 20 || vph >= 20) {
      const fs       = Math.max(6, Math.min(8.5, Math.max(sw, sh) / 14));
      const labelTopY = showLabel ? sy + sh / 2 - 9 : sy + sh / 2;
      const posBelow  = labelTopY + fs / 2 + 3;
      if (posBelow + fs / 2 < sy + sh - 1) {
        return <g pointerEvents="none">{dimText(sx + sw/2, posBelow, null, label, fs, amber)}</g>;
      }
      if (!showLabel) {
        return <g pointerEvents="none">{dimText(sx + sw/2, sy + sh/2, null, label, fs, amber)}</g>;
      }
      const clampY = Math.max(sy + fs, Math.min(sy + sh - fs, posBelow));
      return <g pointerEvents="none">{dimText(sx + sw/2, clampY, null, label, Math.max(5.5, fs), amber)}</g>;
    }

    // ── TIER 3: EXTERNAL AMBER PILL — tiny retazos (ALWAYS renders) ──────────
    {
      const fs    = 7.5;
      const charW = fs * 0.58;
      const pillW = label.length * charW + 10;
      const pillH = 13;
      const pillR = 3.5;
      const pill    = 'rgba(30,20,5,0.90)';
      const pillStr = 'rgba(251,191,36,0.5)';
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


  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Zoom controls (hidden in print mode) */}
      {!isPrintMode && (
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => zoomCenter(1 / ZOOM_STEP)} title="Alejar (-)">−</button>
          <button className="zoom-label-btn" onClick={fitToContainer} title="Ajustar a pantalla (0)">
            {Math.round(scale * 100)}%
          </button>
          <button className="zoom-btn" onClick={() => zoomCenter(ZOOM_STEP)} title="Acercar (+)">+</button>
          <div className="zoom-separator" />
          <button className="zoom-btn zoom-fit-btn" onClick={fitToContainer} title="Fit to screen (0)">⊡</button>
        </div>
      )}

      {/* Pan/Zoom container */}
      <div
        className="diagram-zoom-wrapper"
        ref={containerRef}
        onMouseDown={isPrintMode ? undefined : handlePanStart}
        onMouseMove={isPrintMode ? undefined : handlePanMove}
        onMouseUp={isPrintMode ? undefined : handlePanEnd}
        onMouseLeave={isPrintMode ? undefined : handlePanEnd}
      >
        <svg
          ref={svgRef}
          className="cut-diagram-svg"
          viewBox={`0 0 ${svgW} ${svgH}`}
          width={svgW}
          height={svgH}
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: '0 0' }}
        >
          <defs>
            <filter id="cut-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="board-shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#06B6D4" floodOpacity="0.1"/>
            </filter>
            <pattern id="grain-vertical" patternUnits="userSpaceOnUse" width="6" height="6">
              <line x1="3" y1="0" x2="3" y2="6" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
            </pattern>
            <pattern id="grain-horizontal" patternUnits="userSpaceOnUse" width="6" height="6">
              <line x1="0" y1="3" x2="6" y2="3" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
            </pattern>
            <pattern id="scrap-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5"/>
            </pattern>
          </defs>

          {/* Board */}
          <rect x={offsetX} y={offsetY} width={boardW} height={boardH}
            className="board-outline" rx="3" filter="url(#board-shadow)"/>

          {/* Board labels */}
          <g>
            <rect x={offsetX+boardW/2-32} y={offsetY-20} width={64} height={18} rx="4"
              fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.15)" strokeWidth="0.5"/>
            <text x={offsetX+boardW/2} y={offsetY-9} textAnchor="middle"
              fill="var(--accent-primary,#06B6D4)" fontSize="10"
              fontFamily={CANVAS_FONT} fontWeight="600" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {stockWidth} mm
            </text>
          </g>
          <g>
            <rect x={offsetX-40} y={offsetY+boardH/2-9} width={52} height={18} rx="4"
              fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.15)" strokeWidth="0.5"
              transform={`rotate(-90,${offsetX-14},${offsetY+boardH/2})`}/>
            <text x={offsetX-14} y={offsetY+boardH/2}
              textAnchor="middle" dominantBaseline="central"
              fill="var(--accent-primary,#06B6D4)" fontSize="10"
              fontFamily={CANVAS_FONT} fontWeight="600" style={{ fontVariantNumeric: 'tabular-nums' }}
              transform={`rotate(-90,${offsetX-14},${offsetY+boardH/2})`}>
              {stockHeight} mm
            </text>
          </g>

          {/* Pieces */}
          {pieces.map((piece, i) => {
            const idx   = allPieceIds.indexOf(piece.id);
            const color = getPieceColor(idx >= 0 ? idx : i);
            const px = offsetX + piece.x * bScale;
            const py = offsetY + piece.y * bScale;
            const pw = piece.placedWidth  * bScale;
            const ph = piece.placedHeight * bScale;
            // vpw/vph = visual pixels on screen (including zoom transform)
            const vpw = pw * scale;
            const vph = ph * scale;
            const isAdjacent = hoveredCut ? getAdjacent(piece, i) : false;
            const isDimmed   = hoveredCut && !isAdjacent;

            const cx = px + pw / 2;
            const cy = py + ph / 2;
            const dimLabel = `${piece.placedWidth}×${piece.placedHeight}`;
            const pName    = piece.name || `P${i+1}`;

            // ── Mode decision (based on VISUAL px = vpw/vph) ─────────────────
            const CHAR_RATIO = 0.62;
            const useVertical   = vpw < 60 && vph > vpw + 8 && vph >= 44;
            const useHorizontal = vpw >= 44 && vph >= 24 && !useVertical;
            // Mode C: everything else → external callout

            // Mode B font sizes: after -90° rotation, textLen→screenY, fontH→screenX
            const maxFsV_byWidth  = vpw * 0.72 / scale;          // font height → fits in pw
            const maxFsV_byLength = (vph * 0.88) / (pName.length * CHAR_RATIO) / scale;
            const nameFsV  = Math.max(5.5, Math.min(10, maxFsV_byWidth, maxFsV_byLength));
            const dimGapV  = 2.5;
            const remainPW = vpw / scale - nameFsV - dimGapV;
            const maxDimFsByWidth  = Math.max(0, remainPW * 0.9);
            const maxDimFsByLength = (vph * 0.88) / (dimLabel.length * CHAR_RATIO) / scale;
            const dimFsV   = Math.max(5, Math.min(8.5, maxDimFsByWidth, maxDimFsByLength));
            const showDimsV = dimFsV >= 5 && remainPW >= 5;
            const stackH   = nameFsV + (showDimsV ? dimGapV + dimFsV : 0);
            const nameLocalY = cy - stackH / 2 + nameFsV / 2;
            const dimLocalY  = nameLocalY + nameFsV / 2 + dimGapV + dimFsV / 2;

            // Mode A font size
            const nameFsH = Math.max(7.5, Math.min(13, vpw / 8 / scale));

            return (
              <g key={`${piece.id}-${piece.copyIndex ?? ''}-${i}`}
                onMouseEnter={(e) => handleMouseEnter(e, piece)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ transition: 'opacity 200ms ease' }}
                opacity={isDimmed ? 0.15 : 1}>

                {/* Piece rect */}
                <rect x={px} y={py} width={pw} height={ph}
                  fill={color.bg} stroke={color.border} strokeWidth={1}
                  className="piece-rect" rx="2"/>

                {/* Grain */}
                {(() => {
                  const bg = board.boardGrain || 'none';
                  if (bg === 'none') return null;
                  const dir = piece.rotated ? (bg === 'horizontal' ? 'vertical' : 'horizontal') : bg;
                  return <rect x={px} y={py} width={pw} height={ph}
                    fill={`url(#grain-${dir})`} rx="2" pointerEvents="none"/>;
                })()}

                {/* ── MODE A: HORIZONTAL — wide pieces ─────────────────────── */}
                {useHorizontal && (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    className="piece-label" fontSize={nameFsH}
                    fontFamily={CANVAS_FONT} fontWeight="700"
                    pointerEvents="none">
                    {pName}
                  </text>
                )}

                {/* ── MODE B: VERTICAL — narrow portrait pieces ─────────────── */}
                {useVertical && (
                  <g pointerEvents="none" transform={`rotate(-90, ${cx}, ${cy})`}>
                    <text x={cx} y={nameLocalY}
                      textAnchor="middle" dominantBaseline="middle"
                      className="piece-label" fontSize={nameFsV}
                      fontFamily={CANVAS_FONT} fontWeight="700">
                      {pName}
                    </text>
                    {showDimsV && (
                      <text x={cx} y={dimLocalY}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="rgba(255,255,255,0.70)"
                        fontSize={dimFsV}
                        fontFamily={CANVAS_FONT} fontWeight="600"
                        style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {dimLabel}
                      </text>
                    )}
                  </g>
                )}

                {/* ── MODE C: EXTERNAL CALLOUT — tiny in both dims ─────────── */}
                {!useHorizontal && !useVertical && (() => {
                  const fs    = 7;
                  const charW = fs * 0.58;
                  const pillW = (pName.length + dimLabel.length + 1) * charW + 14;
                  const pillH = 14;
                  const ldC   = color.border;
                  const ancX  = cx;
                  const goAbove = py > pillH + 14;
                  const labelY  = goAbove ? py - 10 : py + ph + 10;
                  const tipY    = goAbove ? py : py + ph;
                  const lineY2  = goAbove ? labelY + pillH/2 + 1 : labelY - pillH/2 - 1;
                  return (
                    <g pointerEvents="none">
                      <line x1={ancX} y1={tipY} x2={ancX} y2={lineY2}
                        stroke={ldC} strokeWidth="0.8" strokeDasharray="2 1.5"/>
                      <rect x={ancX - pillW/2} y={labelY - pillH/2}
                        width={pillW} height={pillH} rx="4"
                        fill={color.bg} stroke={color.border} strokeWidth="0.9"/>
                      <text x={ancX} y={labelY}
                        textAnchor="middle" dominantBaseline="central"
                        fill="rgba(255,255,255,0.95)"
                        fontSize={fs} fontFamily={CANVAS_FONT} fontWeight="700"
                        style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {pName} {dimLabel}
                      </text>
                    </g>
                  );
                })()}

                {/* Dim arrows — ONLY for Mode A horizontal (Mode B shows dims inline) */}
                {useHorizontal && renderDimLines(px, py, pw, ph, piece, true)}

                {/* Grain badge */}
                {(() => {
                  const bg = board.boardGrain || 'none';
                  if (bg === 'none' || !useHorizontal || vpw < 50) return null;
                  const ef = piece.rotated ? (bg === 'horizontal' ? 'vertical' : 'horizontal') : bg;
                  return (
                    <g>
                      <rect x={px+pw-19} y={py+2} width={16} height={16} rx="3" fill="rgba(0,0,0,0.5)"/>
                      <text x={px+pw-11} y={py+10} textAnchor="middle" dominantBaseline="central"
                        fill="rgba(255,255,255,0.9)" fontSize="11" fontWeight="700">
                        {ef === 'vertical' ? '↕' : '↔'}
                      </text>
                    </g>
                  );
                })()}

                {piece.rotated && useHorizontal && (
                  <text x={px+6} y={py+12} fill={color.border}
                    fontSize="9" fontFamily={CANVAS_FONT} fontWeight="600">↻</text>
                )}
              </g>
            );
          })}


          {/* Offcuts / retazos */}
          {board.offcuts?.map((oc, i) => {
            const sx = offsetX + oc.x  * bScale;
            const sy = offsetY + oc.y  * bScale;
            const sw = oc.width  * bScale;
            const sh = oc.height * bScale;
            const showLbl = sw > 30 && sh > 16;
            return (
              <g key={`scrap-${i}`}>
                <rect x={sx} y={sy} width={sw} height={sh}
                  fill="rgba(30,30,50,0.55)" stroke="#94a3b8"
                  strokeWidth="1" strokeDasharray="4 3" rx="2"/>
                <rect x={sx} y={sy} width={sw} height={sh}
                  fill="url(#scrap-hatch)" rx="2" pointerEvents="none"/>
                {showLbl && (
                  <text x={sx+sw/2} y={sy+sh/2-7}
                    textAnchor="middle" dominantBaseline="central"
                    fill="rgba(148,163,184,0.9)"
                    fontSize={Math.max(8, Math.min(11, sw/8))}
                    fontFamily={CANVAS_FONT} fontWeight="600">
                    R{i+1}
                  </text>
                )}
                {renderRetazoDims(sx, sy, sw, sh, oc, showLbl)}
              </g>
            );
          })}

          {/* Cut line */}
          {cutLine && (
            <g>
              <line {...cutLine} stroke="#F43F5E" strokeWidth="10" strokeOpacity="0.15" filter="url(#cut-glow)"/>
              <line {...cutLine} stroke="#FB7185" strokeWidth="4" strokeOpacity="0.4" className="cut-line-animated"/>
              <line {...cutLine} stroke="#FF69B4" strokeWidth="2" className="cut-line-animated"/>
              <line {...cutLine} stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.7"/>
              <circle cx={cutLine.x1} cy={cutLine.y1} r="3" fill="#FF69B4" stroke="white" strokeWidth="0.5" opacity="0.9"/>
              <circle cx={cutLine.x2} cy={cutLine.y2} r="3" fill="#FF69B4" stroke="white" strokeWidth="0.5" opacity="0.9"/>

              {hoveredCut && (() => {
                const r = hoveredCut.region;
                if (hoveredCut.type === 'vertical') {
                  const ry1 = r ? offsetY + r.top    * bScale : offsetY;
                  const rh  = r ? (r.bottom - r.top) * bScale : boardH;
                  return <rect x={offsetX + hoveredCut.position * bScale} y={ry1}
                    width={(hoveredCut.kerf||3)*bScale} height={rh}
                    fill="rgba(244,63,94,0.06)" stroke="rgba(244,63,94,0.15)"
                    strokeWidth="0.5" strokeDasharray="4 2"/>;
                }
                const rx2 = r ? offsetX + r.left  * bScale : offsetX;
                const rw  = r ? (r.right - r.left) * bScale : boardW;
                return <rect x={rx2} y={offsetY + hoveredCut.position * bScale}
                  width={rw} height={(hoveredCut.kerf||3)*bScale}
                  fill="rgba(244,63,94,0.06)" stroke="rgba(244,63,94,0.15)"
                  strokeWidth="0.5" strokeDasharray="4 2"/>;
              })()}

              {hoveredCut && (() => {
                const pos   = hoveredCut.position * bScale;
                const amber = '#f59e0b';
                const ao    = 16;
                const lTxt  = `${hoveredCut.position}mm`;
                const lW    = Math.max(52, lTxt.length * 8 + 10);
                if (hoveredCut.type === 'horizontal') {
                  const ax = offsetX + boardW + ao, ay1 = offsetY, ay2 = offsetY + pos;
                  const midY = (ay1 + ay2) / 2;
                  if (pos < 8) return null;
                  return (
                    <g>
                      <line x1={ax-4} y1={ay1} x2={ax+4} y2={ay1} stroke={amber} strokeWidth="1.5"/>
                      <line x1={ax-4} y1={ay2} x2={ax+4} y2={ay2} stroke={amber} strokeWidth="1.5"/>
                      <line x1={ax} y1={ay1+5} x2={ax} y2={ay2-5} stroke={amber} strokeWidth="1.5"/>
                      <polygon points={`${ax},${ay1+1} ${ax-3},${ay1+7} ${ax+3},${ay1+7}`} fill={amber}/>
                      <polygon points={`${ax},${ay2-1} ${ax-3},${ay2-7} ${ax+3},${ay2-7}`} fill={amber}/>
                      <rect x={ax-lW/2} y={midY-10} width={lW} height={20} rx="4" fill="rgba(245,158,11,0.9)"/>
                      <text x={ax} y={midY} textAnchor="middle" dominantBaseline="central"
                        fill="white" fontSize="11" fontFamily={CANVAS_FONT} fontWeight="600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {lTxt}
                      </text>
                      <line x1={offsetX+boardW} y1={ay1} x2={ax-5} y2={ay1} stroke={amber} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5"/>
                      <line x1={offsetX+boardW} y1={ay2} x2={ax-5} y2={ay2} stroke={amber} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5"/>
                    </g>
                  );
                }
                const ay = offsetY + boardH + ao, ax1 = offsetX, ax2 = offsetX + pos;
                const midX = (ax1 + ax2) / 2;
                if (pos < 8) return null;
                return (
                  <g>
                    <line x1={ax1} y1={ay-4} x2={ax1} y2={ay+4} stroke={amber} strokeWidth="1.5"/>
                    <line x1={ax2} y1={ay-4} x2={ax2} y2={ay+4} stroke={amber} strokeWidth="1.5"/>
                    <line x1={ax1+5} y1={ay} x2={ax2-5} y2={ay} stroke={amber} strokeWidth="1.5"/>
                    <polygon points={`${ax1+1},${ay} ${ax1+7},${ay-3} ${ax1+7},${ay+3}`} fill={amber}/>
                    <polygon points={`${ax2-1},${ay} ${ax2-7},${ay-3} ${ax2-7},${ay+3}`} fill={amber}/>
                    <rect x={midX-lW/2} y={ay-10} width={lW} height={20} rx="4" fill="rgba(245,158,11,0.9)"/>
                    <text x={midX} y={ay} textAnchor="middle" dominantBaseline="central"
                      fill="white" fontSize="11" fontFamily={CANVAS_FONT} fontWeight="600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {lTxt}
                    </text>
                    <line x1={ax1} y1={offsetY+boardH} x2={ax1} y2={ay-5} stroke={amber} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5"/>
                    <line x1={ax2} y1={offsetY+boardH} x2={ax2} y2={ay-5} stroke={amber} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5"/>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="tooltip-name">{tooltip.piece.name || `Pieza ${tooltip.piece.id}`}</div>
          <div className="tooltip-dims">
            {tooltip.piece.placedWidth} × {tooltip.piece.placedHeight} mm
            {tooltip.piece.rotated && ' (rotada)'}
          </div>
        </div>
      )}
    </>
  );
}
