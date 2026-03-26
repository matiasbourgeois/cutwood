import { useState, useCallback, useRef } from 'react';
import { getPieceColor } from '../../utils/colors';

export default function CutDiagram({ board, allPieceIds, hoveredCut }) {
  const [tooltip, setTooltip] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef(null);

  if (!board) return null;

  const { stockWidth, stockHeight, pieces } = board;

  // Calculate scale to fit SVG container — fixed viewBox for consistent text
  const padding = 24;
  const arrowMargin = 60; // extra space for dimension arrows on right/bottom
  const maxSvgDim = 800;
  const rawAspect = stockHeight / stockWidth;
  const clampedAspect = Math.max(0.4, Math.min(rawAspect, 1.5));
  const svgWidth = maxSvgDim + arrowMargin;
  const svgHeight = clampedAspect * maxSvgDim + arrowMargin;
  const scaleX = (maxSvgDim - padding * 2) / stockWidth;
  const scaleY = (clampedAspect * maxSvgDim - padding * 2) / stockHeight;
  const scale = Math.min(scaleX, scaleY);
  const boardW = stockWidth * scale;
  const boardH = stockHeight * scale;
  const offsetX = (maxSvgDim - boardW) / 2;
  const offsetY = (clampedAspect * maxSvgDim - boardH) / 2;

  // Determine which pieces are adjacent to the hovered cut
  const getAdjacent = (piece, pieceIndex) => {
    if (!hoveredCut) return false;
    const kerf = hoveredCut.kerf || 3;

    // Check using affectedPieceIndices from the optimizer
    if (hoveredCut.affectedPieceIndices?.includes(pieceIndex)) return true;

    // Fallback: geometric check
    if (hoveredCut.type === 'horizontal') {
      const bottom = piece.y + piece.placedHeight;
      const top = piece.y;
      return Math.abs(bottom - hoveredCut.position) <= kerf
          || Math.abs(top - hoveredCut.position) <= kerf;
    } else {
      const right = piece.x + piece.placedWidth;
      const left = piece.x;
      return Math.abs(right - hoveredCut.position) <= kerf
          || Math.abs(left - hoveredCut.position) <= kerf;
    }
  };

  const handleMouseEnter = (e, piece) => {
    setTooltip({
      x: e.clientX + 10,
      y: e.clientY - 10,
      piece,
    });
  };

  const handleMouseMove = (e) => {
    if (tooltip) {
      setTooltip((t) => ({ ...t, x: e.clientX + 10, y: e.clientY - 10 }));
    }
  };

  const handleMouseLeave = () => setTooltip(null);

  // Calculate cut line coordinates — uses region bounds if available
  const getCutLine = () => {
    if (!hoveredCut) return null;
    const pos = hoveredCut.position * scale;
    const r = hoveredCut.region;
    if (hoveredCut.type === 'horizontal') {
      // Horizontal cut: use region left/right bounds (or full board width)
      const x1 = r ? offsetX + r.left * scale : offsetX;
      const x2 = r ? offsetX + r.right * scale : offsetX + boardW;
      return { x1, y1: offsetY + pos, x2, y2: offsetY + pos };
    } else {
      // Vertical cut: use region top/bottom bounds (or full board height)
      const y1 = r ? offsetY + r.top * scale : offsetY;
      const y2 = r ? offsetY + r.bottom * scale : offsetY + boardH;
      return { x1: offsetX + pos, y1, x2: offsetX + pos, y2 };
    }
  };

  const cutLine = getCutLine();

  // Zoom wheel handler
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoomLevel(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.002)));
    }
  }, []);

  // ── Drag-to-pan (grab hand) ──
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handlePanStart = useCallback((e) => {
    // Only left click, not on interactive elements
    if (e.button !== 0) return;
    const wrapper = containerRef.current;
    if (!wrapper) return;
    isPanning.current = true;
    wrapper.classList.add('is-panning');
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: wrapper.scrollLeft,
      scrollTop: wrapper.scrollTop,
    };
  }, []);

  const handlePanMove = useCallback((e) => {
    if (!isPanning.current) return;
    const wrapper = containerRef.current;
    if (!wrapper) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    wrapper.scrollLeft = panStart.current.scrollLeft - dx;
    wrapper.scrollTop = panStart.current.scrollTop - dy;
  }, []);

  const handlePanEnd = useCallback(() => {
    isPanning.current = false;
    containerRef.current?.classList.remove('is-panning');
  }, []);

  return (
    <>
      {/* Zoom control bar */}
      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.15))}
          title="Alejar"
        >
          −
        </button>
        <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
        <button
          className="zoom-btn"
          onClick={() => setZoomLevel(z => Math.min(3, z + 0.15))}
          title="Acercar"
        >
          +
        </button>
        <button
          className="zoom-btn zoom-reset"
          onClick={() => setZoomLevel(1)}
          title="Resetear zoom"
        >
          ⟲
        </button>
      </div>

      <div
        className="diagram-zoom-wrapper"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
      <svg
        className="cut-diagram-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
      >
        {/* SVG Definitions for glow effects */}
        <defs>
          <filter id="cut-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="piece-highlight" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feFlood floodColor="#6c63ff" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Grain pattern: vertical lines */}
          <pattern id="grain-vertical" patternUnits="userSpaceOnUse" width="6" height="6">
            <line x1="3" y1="0" x2="3" y2="6" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          </pattern>
          {/* Grain pattern: horizontal lines */}
          <pattern id="grain-horizontal" patternUnits="userSpaceOnUse" width="6" height="6">
            <line x1="0" y1="3" x2="6" y2="3" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          </pattern>
          {/* Scrap/offcut diagonal hatching pattern */}
          <pattern id="scrap-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Board background */}
        <rect
          x={offsetX}
          y={offsetY}
          width={boardW}
          height={boardH}
          className="board-outline"
          rx="3"
        />

        {/* Board dimension labels */}
        <text
          x={offsetX + boardW / 2}
          y={offsetY - 6}
          textAnchor="middle"
          fill="#5a6078"
          fontSize="11"
          fontFamily="Inter, sans-serif"
          fontWeight="500"
        >
          {stockWidth} mm
        </text>
        <text
          x={offsetX - 8}
          y={offsetY + boardH / 2}
          textAnchor="middle"
          fill="#5a6078"
          fontSize="11"
          fontFamily="Inter, sans-serif"
          fontWeight="500"
          transform={`rotate(-90, ${offsetX - 8}, ${offsetY + boardH / 2})`}
        >
          {stockHeight} mm
        </text>

        {/* Pieces */}
        {pieces.map((piece, i) => {
          const idx = allPieceIds.indexOf(piece.id);
          const color = getPieceColor(idx >= 0 ? idx : i);
          const px = offsetX + piece.x * scale;
          const py = offsetY + piece.y * scale;
          const pw = piece.placedWidth * scale;
          const ph = piece.placedHeight * scale;

          const showLabel = pw > 40 && ph > 25;
          const showDims = pw > 55 && ph > 35;

          const isAdjacent = hoveredCut ? getAdjacent(piece, i) : false;
          const isDimmed = hoveredCut && !isAdjacent;
          const pieceOpacity = isDimmed ? 0.15 : 1;
          const strokeWidth = isAdjacent ? 2.5 : 1;
          const strokeColor = isAdjacent ? '#a78bfa' : color.border;

          return (
            <g
              key={`${piece.id}-${piece.copyIndex}-${i}`}
              onMouseEnter={(e) => handleMouseEnter(e, piece)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ transition: 'opacity 200ms ease' }}
              opacity={pieceOpacity}
              filter={isAdjacent ? 'url(#piece-highlight)' : undefined}
            >
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill={color.bg}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className="piece-rect"
                rx="2"
              />
              {/* Grain pattern overlay — based on BOARD grain, not per-piece */}
              {(() => {
                const bg = board.boardGrain || 'none';
                if (bg === 'none') return null;
                // Board grain direction on this piece:
                // If piece is rotated, grain appears perpendicular
                const grainDir = piece.rotated
                  ? (bg === 'horizontal' ? 'vertical' : 'horizontal')
                  : bg;
                return (
                  <rect
                    x={px}
                    y={py}
                    width={pw}
                    height={ph}
                    fill={`url(#grain-${grainDir})`}
                    rx="2"
                    pointerEvents="none"
                  />
                );
              })()}
              {showLabel && (
                <text
                  x={px + pw / 2}
                  y={py + ph / 2 - (showDims ? 5 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="piece-label"
                  fontSize={Math.max(9, Math.min(12, pw / 8))}
                >
                  {piece.name || `P${i + 1}`}
                </text>
              )}
              {showDims && (
                <text
                  x={px + pw / 2}
                  y={py + ph / 2 + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="piece-dims"
                  fontSize={Math.max(8, Math.min(10, pw / 10))}
                >
                  {piece.placedWidth}x{piece.placedHeight}
                </text>
              )}
              {/* Grain direction badge — shows effective grain ON this piece */}
              {(() => {
                const bg = board.boardGrain || 'none';
                if (bg === 'none' || !showLabel) return null;
                const effectiveGrain = piece.rotated
                  ? (bg === 'horizontal' ? 'vertical' : 'horizontal')
                  : bg;
                return (
                  <g>
                    <rect
                      x={px + pw - 19}
                      y={py + 2}
                      width="16"
                      height="16"
                      rx="3"
                      fill="rgba(0,0,0,0.55)"
                    />
                    <text
                      x={px + pw - 11}
                      y={py + 10}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgba(255,255,255,0.9)"
                      fontSize="11"
                      fontWeight="700"
                    >
                      {effectiveGrain === 'vertical' ? '↕' : '↔'}
                    </text>
                  </g>
                );
              })()}
              {piece.rotated && showLabel && (
                <text
                  x={px + 6}
                  y={py + 12}
                  fill={color.border}
                  fontSize="9"
                  fontFamily="Inter, sans-serif"
                  fontWeight="600"
                >
                  ↻
                </text>
              )}
            </g>
          );
        })}

        {/* ═══ Scrap/Offcut overlays — hatched rectangles ═══ */}
        {board.offcuts && board.offcuts.length > 0 && board.offcuts.map((oc, i) => {
          const sx = offsetX + oc.x * scale;
          const sy = offsetY + oc.y * scale;
          const sw = oc.width * scale;
          const sh = oc.height * scale;
          const labelText = `R${i + 1}: ${oc.width}×${oc.height}`;
          const showLabel = sw > 30 && sh > 16;
          const showDims = sw > 50 && sh > 28;

          return (
            <g key={`scrap-${i}`}>
              {/* Dark background */}
              <rect
                x={sx} y={sy} width={sw} height={sh}
                fill="rgba(30, 30, 50, 0.55)"
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="4 3"
                rx="2"
              />
              {/* Diagonal hatching overlay */}
              <rect
                x={sx} y={sy} width={sw} height={sh}
                fill="url(#scrap-hatch)"
                rx="2"
                pointerEvents="none"
              />
              {/* Label */}
              {showLabel && (
                <>
                  <text
                    x={sx + sw / 2}
                    y={sy + sh / 2 - (showDims ? 4 : 0)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(148, 163, 184, 0.9)"
                    fontSize={Math.max(8, Math.min(11, sw / 8))}
                    fontFamily="Inter, sans-serif"
                    fontWeight="600"
                  >
                    R{i + 1}
                  </text>
                  {showDims && (
                    <text
                      x={sx + sw / 2}
                      y={sy + sh / 2 + 8}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgba(148, 163, 184, 0.65)"
                      fontSize={Math.max(7, Math.min(9, sw / 10))}
                      fontFamily="Inter, sans-serif"
                      fontWeight="500"
                    >
                      {oc.width}×{oc.height}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* Cut line overlay — animated dashed line with glow */}
        {cutLine && (
          <g>
            {/* Glow layer */}
            <line
              x1={cutLine.x1}
              y1={cutLine.y1}
              x2={cutLine.x2}
              y2={cutLine.y2}
              stroke="#ef4444"
              strokeWidth="6"
              strokeOpacity="0.3"
              filter="url(#cut-glow)"
            />
            {/* Main line */}
            <line
              x1={cutLine.x1}
              y1={cutLine.y1}
              x2={cutLine.x2}
              y2={cutLine.y2}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="10 5"
              className="cut-line-animated"
            />
            {/* Kerf zone indicator */}
            {hoveredCut && (() => {
              const r = hoveredCut.region;
              if (hoveredCut.type === 'vertical') {
                const ry1 = r ? offsetY + r.top * scale : offsetY;
                const rh = r ? (r.bottom - r.top) * scale : boardH;
                return <rect x={offsetX + hoveredCut.position * scale} y={ry1}
                  width={(hoveredCut.kerf || 3) * scale} height={rh}
                  fill="rgba(239, 68, 68, 0.12)" stroke="none" />;
              } else {
                const rx = r ? offsetX + r.left * scale : offsetX;
                const rw = r ? (r.right - r.left) * scale : boardW;
                return <rect x={rx} y={offsetY + hoveredCut.position * scale}
                  width={rw} height={(hoveredCut.kerf || 3) * scale}
                  fill="rgba(239, 68, 68, 0.12)" stroke="none" />;
              }
            })()}

            {/* ═══ Dimension Arrow (measurement annotation) ═══ */}
            {hoveredCut && (() => {
              const pos = hoveredCut.position * scale;
              const arrowColor = '#f59e0b'; // amber for contrast vs red cut line
              const arrowOffset = 14; // px outside the board
              const labelText = `${hoveredCut.position}mm`;
              const labelW = Math.max(50, labelText.length * 8 + 10); // dynamic width

              if (hoveredCut.type === 'horizontal') {
                // Vertical arrow: top edge → cut position (measuring Y)
                const ax = offsetX + boardW + arrowOffset;
                const ay1 = offsetY; // start: top edge (0mm)
                const ay2 = offsetY + pos; // end: cut position
                const midY = (ay1 + ay2) / 2;
                const arrowLen = pos;

                if (arrowLen < 8) return null; // too small to draw

                return (
                  <g className="dimension-arrow-group" style={{ transition: 'opacity 200ms ease' }}>
                    {/* Top tick mark */}
                    <line x1={ax - 4} y1={ay1} x2={ax + 4} y2={ay1}
                      stroke={arrowColor} strokeWidth="1.5" />
                    {/* Bottom tick mark */}
                    <line x1={ax - 4} y1={ay2} x2={ax + 4} y2={ay2}
                      stroke={arrowColor} strokeWidth="1.5" />
                    {/* Arrow shaft */}
                    <line x1={ax} y1={ay1 + 5} x2={ax} y2={ay2 - 5}
                      stroke={arrowColor} strokeWidth="1.5" />
                    {/* Top arrowhead */}
                    <polygon
                      points={`${ax},${ay1 + 1} ${ax - 3},${ay1 + 7} ${ax + 3},${ay1 + 7}`}
                      fill={arrowColor} />
                    {/* Bottom arrowhead */}
                    <polygon
                      points={`${ax},${ay2 - 1} ${ax - 3},${ay2 - 7} ${ax + 3},${ay2 - 7}`}
                      fill={arrowColor} />
                    {/* Measurement label */}
                    <rect
                      x={ax - labelW / 2} y={midY - 10}
                      width={labelW} height="20" rx="4"
                      fill="rgba(245, 158, 11, 0.9)" />
                    <text x={ax} y={midY}
                      textAnchor="middle" dominantBaseline="central"
                      fill="white" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="700">
                      {labelText}
                    </text>
                    {/* Leader line from board edge to arrow */}
                    <line x1={offsetX + boardW} y1={ay1} x2={ax - 5} y2={ay1}
                      stroke={arrowColor} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5" />
                    <line x1={offsetX + boardW} y1={ay2} x2={ax - 5} y2={ay2}
                      stroke={arrowColor} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5" />
                  </g>
                );
              } else {
                // Horizontal arrow: left edge → cut position (measuring X)
                const ay = offsetY + boardH + arrowOffset;
                const ax1 = offsetX; // start: left edge (0mm)
                const ax2 = offsetX + pos; // end: cut position
                const midX = (ax1 + ax2) / 2;
                const arrowLen = pos;

                if (arrowLen < 8) return null;

                return (
                  <g className="dimension-arrow-group" style={{ transition: 'opacity 200ms ease' }}>
                    {/* Left tick mark */}
                    <line x1={ax1} y1={ay - 4} x2={ax1} y2={ay + 4}
                      stroke={arrowColor} strokeWidth="1.5" />
                    {/* Right tick mark */}
                    <line x1={ax2} y1={ay - 4} x2={ax2} y2={ay + 4}
                      stroke={arrowColor} strokeWidth="1.5" />
                    {/* Arrow shaft */}
                    <line x1={ax1 + 5} y1={ay} x2={ax2 - 5} y2={ay}
                      stroke={arrowColor} strokeWidth="1.5" />
                    {/* Left arrowhead */}
                    <polygon
                      points={`${ax1 + 1},${ay} ${ax1 + 7},${ay - 3} ${ax1 + 7},${ay + 3}`}
                      fill={arrowColor} />
                    {/* Right arrowhead */}
                    <polygon
                      points={`${ax2 - 1},${ay} ${ax2 - 7},${ay - 3} ${ax2 - 7},${ay + 3}`}
                      fill={arrowColor} />
                    {/* Measurement label */}
                    <rect
                      x={midX - labelW / 2} y={ay - 10}
                      width={labelW} height="20" rx="4"
                      fill="rgba(245, 158, 11, 0.9)" />
                    <text x={midX} y={ay}
                      textAnchor="middle" dominantBaseline="central"
                      fill="white" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="700">
                      {labelText}
                    </text>
                    {/* Leader line from board edge to arrow */}
                    <line x1={ax1} y1={offsetY + boardH} x2={ax1} y2={ay - 5}
                      stroke={arrowColor} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5" />
                    <line x1={ax2} y1={offsetY + boardH} x2={ax2} y2={ay - 5}
                      stroke={arrowColor} strokeWidth="0.5" strokeDasharray="2 2" strokeOpacity="0.5" />
                  </g>
                );
              }
            })()}
          </g>
        )}
      </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="tooltip-name">
            {tooltip.piece.name || `Pieza ${tooltip.piece.id}`}
          </div>
          <div className="tooltip-dims">
            {tooltip.piece.placedWidth} x {tooltip.piece.placedHeight} mm
            {tooltip.piece.rotated && ' (rotada)'}
          </div>
        </div>
      )}
    </>
  );
}
