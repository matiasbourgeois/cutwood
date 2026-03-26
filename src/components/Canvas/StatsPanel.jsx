import { BarChart3, AlertTriangle } from 'lucide-react';

export default function StatsPanel({ stats, currentBoard, pieces, stock }) {
  if (!stats) return null;

  const utilization = currentBoard
    ? currentBoard.utilization.toFixed(1)
    : stats.overallUtilization;

  const wasteM2 = currentBoard
    ? (currentBoard.wasteArea / 1000000).toFixed(3)
    : (stats.totalWasteArea / 1000000).toFixed(3);

  const utilizationClass =
    parseFloat(utilization) >= 80 ? 'success'
    : parseFloat(utilization) >= 60  ? ''
    : 'warning';

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
    return total + (meters * qty) / 1000; // mm to m
  }, 0);

  // Calculate costs
  const pricePerBoard = stock?.pricePerBoard || 0;
  const pricePerMeterEdge = stock?.pricePerMeterEdge || 0;
  const boardCost = stats.totalBoards * pricePerBoard;
  const edgeCost = edgeBandingMeters * pricePerMeterEdge;
  const totalCost = boardCost + edgeCost;
  const hasCosts = pricePerBoard > 0 || pricePerMeterEdge > 0;

  return (
    <div className="section-card">
      <div className="section-header" style={{ cursor: 'default' }}>
        <div className="section-header-left">
          <span className="section-icon"><BarChart3 size={16} /></span>
          <span className="section-title">Estadísticas</span>
        </div>
      </div>
      <div className="section-body">
        <div className="stats-grid">
          <div className="stat-card highlight">
            <div className={`stat-value ${utilizationClass}`}>{utilization}%</div>
            <div className="stat-label">Aprovechamiento</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{stats.totalBoards}</div>
            <div className="stat-label">Tableros</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{stats.placedPieces}</div>
            <div className="stat-label">Piezas colocadas</div>
          </div>

          <div className="stat-card">
            <div className="stat-value warning">{wasteM2} m²</div>
            <div className="stat-label">Desperdicio</div>
          </div>
        </div>

        {/* Edge banding stats */}
        {edgeBandingMeters > 0 && (
          <div className="stats-grid" style={{ marginTop: '8px' }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#a78bfa' }}>{edgeBandingMeters.toFixed(1)}m</div>
              <div className="stat-label">Tapacanto</div>
            </div>
            {hasCosts && (
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#a78bfa' }}>${edgeCost.toLocaleString('es-AR')}</div>
                <div className="stat-label">Costo tapacanto</div>
              </div>
            )}
          </div>
        )}

        {/* Cost stats */}
        {hasCosts && (
          <div className="stats-grid" style={{ marginTop: '8px' }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#34d399' }}>${boardCost.toLocaleString('es-AR')}</div>
              <div className="stat-label">Costo tableros</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-value" style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: 800 }}>
                ${totalCost.toLocaleString('es-AR')}
              </div>
              <div className="stat-label">Costo total</div>
            </div>
          </div>
        )}

        {stats.unfittedPieces > 0 && (
          <div className="unfitted-warning" style={{ marginTop: '10px' }}>
            <div className="unfitted-title">
              <AlertTriangle size={14} style={{display:'inline',verticalAlign:'text-bottom'}} /> {stats.unfittedPieces} pieza(s) no entraron
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
