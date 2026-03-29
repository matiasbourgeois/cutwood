import React, { useMemo } from 'react';
import './PrintReport.css';
import { getPieceColor } from '../../utils/colors';

// Mismo componente de la UI, re-usado 100% nativo para la impresión vectorial
import CutDiagram from '../Canvas/CutDiagram';

export default function PrintReport({
  result,
  pieces = [],
  stock = {},
  options = {},
  projectName = '',
  theme = 'dark'
}) {
  if (!result) return null;

  const { stats, boards = [], unfitted = [] } = result;

  // ── Cálculos Globales (Area, Tapacanto, Costos) ──
  const { totalArea, validPieces, edgeBandingM, costTotal, allOffcuts } = useMemo(() => {
    let totalA = 0;
    const vp = pieces.filter(p => p.width > 0 && p.height > 0);
    let ebMeters = 0;

    vp.forEach(p => {
      totalA += (p.width * p.height * (p.quantity || 1)) / 1000000;
      const eb = p.edgeBanding;
      if (eb) {
        const q = p.quantity || 1;
        let pM = 0;
        if (eb.top) pM += p.width;
        if (eb.bottom) pM += p.width;
        if (eb.left) pM += p.height;
        if (eb.right) pM += p.height;
        ebMeters += (pM * q) / 1000;
      }
    });

    const costBoards = stats.totalBoards * (stock.pricePerBoard || 0);
    const costEdge = ebMeters * (stock.pricePerMeterEdge || 0);
    const costTot = costBoards + costEdge;

    // Recolectar Retazos
    const offcutsArr = [];
    boards.forEach((b, idx) => {
      if (b.offcuts?.length > 0) {
        b.offcuts.forEach(oc => {
          offcutsArr.push({
            ...oc,
            source: b.isOffcut ? `Retazo ${b.stockWidth}x${b.stockHeight}` : `Tablero ${idx + 1}`
          });
        });
      }
    });

    return { 
      totalArea: totalA, 
      validPieces: vp, 
      edgeBandingM: ebMeters,
      costTotal: costTot,
      allOffcuts: offcutsArr
    };
  }, [pieces, stats.totalBoards, stock, boards]);

  const allPieceIds = useMemo(() => pieces.map(p => p.id), [pieces]);
  const kerfVal = options.kerf || boards[0]?.cutSequence?.[0]?.kerf || 0;
  const dateStr = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  const grainLabel = stock.grain === 'vertical' ? 'Vertical' : stock.grain === 'horizontal' ? 'Horizontal' : 'Sin veta';

  return (
    <div className={`print-root print-theme-${theme}`} id="god-level-print-report">
      
      {/* ════ PÁGINA 1: PORTADA HERO ════ */}
      <div className="print-page print-page-fixed">
        <div className="print-header-bar" />
        
        <div className="print-hero">
          <div>
            <h1>CutWood</h1>
            <h2>{projectName || 'Proyecto Optimizador'}</h2>
            <div className="print-hero-specs">
              <span><strong>Tablero:</strong> {stock.width}×{stock.height} mm</span>
              <span><strong>Espesor:</strong> {stock.thickness || 18} mm</span>
              <span><strong>Kerf:</strong> {kerfVal} mm</span>
              <span><strong>Veta:</strong> {grainLabel}</span>
            </div>
            <div className="print-hero-specs" style={{ marginTop: 8 }}>
              <span>Generado el: {dateStr}</span>
            </div>
          </div>

          <div className="print-badge-giant" style={{ 
            background: stats.overallUtilization >= 80 ? 'var(--print-success)' : stats.overallUtilization >= 50 ? 'var(--print-warning)' : 'var(--print-danger)' 
          }}>
            <span className="value">{stats.overallUtilization}%</span>
            <span className="label">APROVECHAMIENTO</span>
          </div>
        </div>

        <div className="print-stats-grid">
          <StatCard val={stats.totalBoards} label="Tableros" />
          <StatCard val={stats.placedPieces} label="Piezas Ubicadas" />
          <StatCard val={`${(stats.totalWasteArea / 1000000).toFixed(2)}m²`} label="Desperdicio" />
          {stats.totalOffcutBoards > 0 && <StatCard val={stats.totalOffcutBoards} label="Retazos Usados" />}
          {edgeBandingM > 0 && <StatCard val={`${edgeBandingM.toFixed(1)}m`} label="Tapacanto" />}
          {costTotal > 0 && <StatCard val={`$${costTotal.toLocaleString('es-AR')}`} label="Costo Total" />}
        </div>

        {/* Pequeña visual de muestra del tablero principal en la portada */}
        {boards[0] && (
          <div style={{ margin: '30px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 14, color: 'var(--print-text)', marginBottom: 12 }}>Vista Previa de Planta</h3>
            <div style={{ flex: 1, border: '1px solid var(--print-border)', borderRadius: 8, overflow: 'hidden', padding: 12, background: 'var(--print-bg)' }}>
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <CutDiagram board={boards[0]} allPieceIds={allPieceIds} hoveredCut={null} />
              </div>
            </div>
          </div>
        )}
        <Footer page={1} />
      </div>

      {/* ════ PÁGINA 2: LISTADO DE PIEZAS ════ */}
      <div className="print-page print-page-auto">
        <div className="print-header-bar" />
        <div style={{ padding: 16 }}>
          <h2 style={{ fontSize: 20, color: 'var(--print-text)', margin: 0 }}>Listado de Piezas</h2>
          <p style={{ fontSize: 12, color: 'var(--print-text-muted)', margin: '4px 0 16px 0' }}>
            {validPieces.length} piezas • Area neta total: {totalArea.toFixed(3)} m²
          </p>
        </div>

        <div className="print-table-container" style={{ flex: 1, overflow: 'auto' }}>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Pieza</th>
                <th>Dimensiones</th>
                <th>Cant.</th>
                <th>Área Un.</th>
                <th>Veta</th>
                <th>Bordes</th>
              </tr>
            </thead>
            <tbody>
              {validPieces.map((p, i) => {
                const colorHex = getPieceColor(allPieceIds.indexOf(p.id) >= 0 ? allPieceIds.indexOf(p.id) : i).border;
                const eb = p.edgeBanding;
                let tap = '-';
                if (eb) {
                  const s = [];
                  if (eb.top) s.push('S'); if (eb.bottom) s.push('I'); if (eb.left) s.push('L'); if (eb.right) s.push('D');
                  if (s.length > 0) tap = s.join('+');
                }
                const area = ((p.width * p.height) / 1000000).toFixed(4);

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: colorHex }} />
                    </td>
                    <td className="print-row-highlight">{p.name || `Pieza ${i + 1}`}</td>
                    <td>{p.width} × {p.height} mm</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--print-accent)' }}>{p.quantity || 1}</td>
                    <td>{area} m²</td>
                    <td>{p.grain === 'vertical' ? 'Vertical' : p.grain === 'horizontal' ? 'Horizontal' : '-'}</td>
                    <td style={{ color: tap !== '-' ? 'var(--print-accent)' : 'inherit' }}>{tap}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Footer page={2} />
      </div>

      {/* ════ PÁGINAS 3+: PLANOS Y SECUENCIA POR TABLERO ════ */}
      {boards.map((b, bIdx) => {
        const titleStr = b.isOffcut ? 'Retazo' : `Tablero ${bIdx + 1}`;
        const bWaste = ((b.wasteArea) / 1000000).toFixed(3);
        const l1 = b.cutSequence?.filter(c => c.level === 1).length || 0;
        const l2 = b.cutSequence?.filter(c => c.level === 2).length || 0;
        const l3 = b.cutSequence?.filter(c => c.level === 3).length || 0;

        return (
          <div className="print-page print-page-fixed" key={`board-${bIdx}`}>
            <div className="print-header-bar" />
            
            <div style={{ padding: '16px 16px 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 20, color: 'var(--print-text)', margin: 0, textTransform: 'uppercase' }}>
                  {titleStr} <span style={{ fontSize: 12, color: 'var(--print-text-muted)', fontWeight: 'normal', textTransform: 'none' }}>
                    • {b.stockWidth}×{b.stockHeight} mm • {b.pieces.length} piezas • Desper: {bWaste}m²
                  </span>
                </h2>
              </div>
              <div style={{ 
                background: b.utilization >= 80 ? 'var(--print-success)' : b.utilization >= 50 ? 'var(--print-warning)' : 'var(--print-danger)', 
                color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 'bold' 
              }}>
                {b.utilization.toFixed(1)}% Usado
              </div>
            </div>

            <div className="print-diagram-layout">
              {/* IZQUIERDA: DIAGRAMA SVG */}
              <div className="print-diagram-left">
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  {/* Aquí está la magia: el componente nativo escalado infinitamente */}
                  <CutDiagram board={b} allPieceIds={allPieceIds} hoveredCut={null} />
                </div>
              </div>

              {/* DERECHA: SECUENCIA DE CORTES MODULAR */}
              <div className="print-diagram-right">
                <div style={{ background: 'var(--print-surface-alt)', border: '1px solid var(--print-border)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ padding: 10, borderBottom: '1px solid var(--print-border)' }}>
                    <h3 style={{ margin: 0, fontSize: 13, color: 'var(--print-text)' }}>Secuencia de Cortes</h3>
                    <p style={{ margin: 0, fontSize: 9, color: 'var(--print-text-muted)' }}>
                      {b.cutSequence?.length || 0} cortes • {l1} Prim • {l2} Sec • {l3} Recortes
                    </p>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <table className="print-seq-table">
                      <thead>
                        <tr>
                          <th style={{width: 20}}>#</th>
                          <th style={{width: 35}}>Nivel</th>
                          <th>Corte</th>
                          <th>Medida</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(b.cutSequence || []).map((cut, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 'bold' }}>{cut.number || idx + 1}</td>
                            <td>
                              <span className="seq-badge" style={{
                                background: cut.level === 1 ? 'var(--print-success)' : cut.level === 2 ? 'var(--print-accent)' : 'var(--print-text-muted)'
                              }}>
                                {cut.level === 1 ? 'E1' : cut.level === 2 ? 'E2' : 'REC'}
                              </span>
                            </td>
                            <td>{cut.type === 'horizontal' ? 'Horiz ↔' : 'Vert ↕'}</td>
                            <td>{cut.position} mm</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <Footer page={2 + bIdx + 1} />
          </div>
        );
      })}

      {/* ════ LISTADO RETAZOS ════ */}
      {allOffcuts.length > 0 && (
        <div className="print-page print-page-auto">
          <div className="print-header-bar" />
          <div style={{ padding: 16 }}>
            <h2 style={{ fontSize: 20, color: 'var(--print-text)', margin: 0 }}>Inventario de Retazos (Utiles)</h2>
            <p style={{ fontSize: 12, color: 'var(--print-text-muted)', margin: '4px 0 0 0' }}>
              Se generaron {allOffcuts.length} recortes con medidas mayores a 150x150 mm. Total recuperado: {allOffcuts.reduce((sum, oc) => sum + (oc.width * oc.height) / 1000000, 0).toFixed(3)} m².
            </p>
          </div>

          <div className="print-retazos-grid">
            {allOffcuts.map((oc, i) => (
              <div className="print-retazo-card" key={i}>
                <div className="print-retazo-visual">
                  <span className="print-retazo-label">R {i + 1}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--print-warning)' }}>{oc.width} × {oc.height}</div>
                  <div style={{ fontSize: 9, color: 'var(--print-text-muted)', marginTop: 2 }}>{oc.source}</div>
                </div>
              </div>
            ))}
          </div>
          <Footer page={"Final"} />
        </div>
      )}
    </div>
  );
}

// Subcomponente de tarjeta de estadística
function StatCard({ val, label }) {
  return (
    <div className="print-stat-card">
      <div className="print-stat-value">{val}</div>
      <div className="print-stat-label">{label}</div>
    </div>
  );
}

// Subcomponente de Footer A4
function Footer({ page }) {
  return (
    <div className="print-footer">
      <span>Optimizador de Cortes Nivel Dios - cutwood.vercel.app</span>
      <span>Pág. {page}</span>
    </div>
  );
}
