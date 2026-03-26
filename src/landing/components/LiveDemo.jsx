import { useState } from 'react';
import { useScrollReveal } from '../hooks';
import { optimizeCuts } from '../../engine/optimizer.js';

const demoPieces = [
  { id: 'd1', name: 'Lateral', width: 1800, height: 500, quantity: 2 },
  { id: 'd2', name: 'Estante', width: 800, height: 400, quantity: 4 },
  { id: 'd3', name: 'Fondo', width: 1800, height: 800, quantity: 1 },
];

const demoStock = { width: 2750, height: 1830, thickness: 18, quantity: 5, grain: 'none' };
const demoOptions = { kerf: 3, edgeTrim: 5, allowRotation: true };

export default function LiveDemo() {
  const ref = useScrollReveal();
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const handleOptimize = () => {
    setRunning(true);
    setTimeout(() => {
      const r = optimizeCuts(demoPieces, demoStock, demoOptions);
      setResult(r);
      setRunning(false);
    }, 500); // small delay for UX
  };

  const board = result?.boards?.[0];

  return (
    <section className="landing-section demo-section" id="demo" ref={ref}>
      <div className="landing-container">
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div className="landing-section-label">Demo en Vivo</div>
          <h2 className="landing-section-title">
            Probalo ahora mismo
          </h2>
          <p className="landing-section-subtitle" style={{ margin: '0 auto' }}>
            Esto es el motor v3 real corriendo en tu navegador. Sin registro.
          </p>
        </div>

        <div className="demo-wrapper reveal">
          <div className="demo-header">
            <div className="demo-dot red" />
            <div className="demo-dot yellow" />
            <div className="demo-dot green" />
            <span className="demo-header-title">CutWood — Demo Interactiva</span>
          </div>

          <div className="demo-body">
            <div className="demo-sidebar">
              <h4>Piezas de ejemplo</h4>
              {demoPieces.map((p) => (
                <div key={p.id}>
                  <div className="demo-piece-label">{p.name} (x{p.quantity})</div>
                  <div className="demo-piece-row">
                    <input className="demo-piece-input" value={p.width} readOnly />
                    <input className="demo-piece-input" value={p.height} readOnly />
                    <input className="demo-piece-input" value={`x${p.quantity}`} readOnly />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: '12px', color: 'var(--land-text-dim)', marginTop: '12px' }}>
                Tablero: 2750 x 1830 mm — Kerf: 3mm
              </div>
              <button className="demo-optimize-btn" onClick={handleOptimize} disabled={running}>
                {running ? '⏳ Calculando...' : '⚡ Optimizar Cortes'}
              </button>
            </div>

            <div className="demo-result">
              {!board ? (
                <div className="demo-result-placeholder">
                  <p style={{ fontSize: '36px', margin: '0 0 8px' }}>⚡</p>
                  <p>Presiona "Optimizar Cortes" para ver la magia</p>
                </div>
              ) : (
                <>
                  <svg viewBox={`0 0 ${board.stockWidth + 40} ${board.stockHeight + 40}`}
                    style={{ width: '100%', maxHeight: '320px', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))' }}>
                    <rect x="20" y="20" width={board.stockWidth} height={board.stockHeight}
                      fill="#0B1121" stroke="#1E3A5F" strokeWidth="2" rx="4" />
                    {board.pieces.map((p, i) => {
                      const colors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#EF4444'];
                      return (
                        <g key={i}>
                          <rect x={20 + p.x} y={20 + p.y}
                            width={p.placedWidth} height={p.placedHeight}
                            fill={colors[i % colors.length]} opacity="0.75" rx="2" />
                          {p.placedWidth > 80 && p.placedHeight > 40 && (
                            <text x={20 + p.x + p.placedWidth / 2} y={20 + p.y + p.placedHeight / 2}
                              fill="white" fontSize="28" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
                              {p.name}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="demo-stats">
                    <div className="demo-stat">
                      <div className="demo-stat-value">{board.utilization.toFixed(1)}%</div>
                      <div className="demo-stat-label">Aprovechamiento</div>
                    </div>
                    <div className="demo-stat">
                      <div className="demo-stat-value">{result.boards.length}</div>
                      <div className="demo-stat-label">Tablero{result.boards.length > 1 ? 's' : ''}</div>
                    </div>
                    <div className="demo-stat">
                      <div className="demo-stat-value">{result.stats.placedPieces}</div>
                      <div className="demo-stat-label">Piezas</div>
                    </div>
                    <div className="demo-stat">
                      <div className="demo-stat-value">{board.cutSequence?.length || 0}</div>
                      <div className="demo-stat-label">Cortes</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
