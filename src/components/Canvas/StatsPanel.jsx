import { BarChart3, AlertTriangle, Layers, Grid3x3, Trash2, DollarSign } from 'lucide-react';

export default function StatsPanel({ stats, currentBoard, pieces, stock }) {
  if (!stats) return null;

  const utilization = currentBoard
    ? currentBoard.utilization.toFixed(1)
    : stats.overallUtilization;

  const wasteM2 = currentBoard
    ? (currentBoard.wasteArea / 1000000).toFixed(3)
    : (stats.totalWasteArea / 1000000).toFixed(3);

  const utilizationNum = parseFloat(utilization);
  const utilizationClass =
    utilizationNum >= 80 ? 'success'
    : utilizationNum >= 60 ? ''
    : 'warning';

  // SVG radial ring params
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (utilizationNum / 100) * circumference;
  const ringColor = utilizationNum >= 80 ? '#10b981' : utilizationNum >= 60 ? '#06B6D4' : '#f59e0b';

  // Calculate edge banding total meters
  const edgeBandingMeters = (pieces || []).reduce((total, piece) => {
    const eb = piece.edgeBanding;
    if (!eb) return total;
    const qty = piece.quantity || 1;
    const w = piece.width || 0;
    const h = piece.height || 0;
    let meters = 0;
    if (eb.top) meters += w;
    if (eb.bottom) meters += w;
    if (eb.left) meters += h;
    if (eb.right) meters += h;
    return total + (meters * qty) / 1000;
  }, 0);

  // Calculate costs
  const pricePerBoard = stock?.pricePerBoard || 0;
  const pricePerMeterEdge = stock?.pricePerMeterEdge || 0;
  const boardCost = stats.totalBoards * pricePerBoard;
  const edgeCost = edgeBandingMeters * pricePerMeterEdge;
  const totalCost = boardCost + edgeCost;
  const hasCosts = pricePerBoard > 0 || pricePerMeterEdge > 0;

  return (
    <div className="stats-panel-redesign">
      {/* Radial Progress Ring */}
      <div className="utilization-ring-container">
        {/* Fixed-size wrapper so the absolute % always centers on the ring */}
        <div className="utilization-ring-wrapper">
          <svg className="utilization-ring" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="6"
            />
            {/* Progress arc */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 50 50)"
              className="utilization-ring-progress"
              style={{ filter: `drop-shadow(0 0 6px ${ringColor}60)` }}
            />
          </svg>
          <div className="utilization-ring-value">
            <span className="utilization-ring-number" style={{ color: ringColor }}>{Math.round(utilizationNum)}</span>
            <span className="utilization-ring-percent" style={{ color: ringColor }}>%</span>
          </div>
        </div>
        <div className="utilization-ring-label">Aprovechamiento</div>
        {stats.algorithmUsed && (
          <div className="algo-badge" title="Algoritmo ganador">
            {stats.algorithmUsed}
          </div>
        )}
      </div>

      {/* 3-column stat cards */}
      <div className="stats-grid-3">
        <div className="stat-card-v2">
          <div className="stat-card-icon"><Layers size={14} /></div>
          <div className="stat-card-value">{stats.totalBoards}</div>
          <div className="stat-card-label">Tableros</div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-icon"><Grid3x3 size={14} /></div>
          <div className="stat-card-value">{stats.placedPieces}</div>
          <div className="stat-card-label">Piezas</div>
        </div>
        <div className="stat-card-v2">
          <div className="stat-card-icon" style={{ color: 'var(--warning)' }}><Trash2 size={14} /></div>
          <div className="stat-card-value" style={{ color: 'var(--warning)' }}>{wasteM2}</div>
          <div className="stat-card-label">Desperdicio m²</div>
        </div>
      </div>

      {/* Edge banding row */}
      {edgeBandingMeters > 0 && (
        <div className="stats-grid-2">
          <div className="stat-card-v2 stat-card-accent">
            <div className="stat-card-value">{edgeBandingMeters.toFixed(1)}m</div>
            <div className="stat-card-label">Tapacanto</div>
          </div>
          {hasCosts && (
            <div className="stat-card-v2 stat-card-accent">
              <div className="stat-card-value">${edgeCost.toLocaleString('es-AR')}</div>
              <div className="stat-card-label">Costo tapacanto</div>
            </div>
          )}
        </div>
      )}

      {/* Cost strip */}
      {hasCosts && (
        <div className="cost-strip">
          <div className="cost-strip-row">
            <span className="cost-strip-label"><DollarSign size={12} /> Tableros</span>
            <span className="cost-strip-value">${boardCost.toLocaleString('es-AR')}</span>
          </div>
          <div className="cost-strip-total">
            <span className="cost-strip-label">Total</span>
            <span className="cost-strip-total-value">${totalCost.toLocaleString('es-AR')}</span>
          </div>
        </div>
      )}

      {/* Unfitted warning */}
      {stats.unfittedPieces > 0 && (
        <div className="unfitted-warning" style={{ marginTop: '10px' }}>
          <div className="unfitted-title">
            <AlertTriangle size={14} style={{display:'inline',verticalAlign:'text-bottom'}} /> {stats.unfittedPieces} pieza(s) no entraron
          </div>
        </div>
      )}
    </div>
  );
}
