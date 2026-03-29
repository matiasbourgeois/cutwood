import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Printer, Moon, Sun } from 'lucide-react';
import './ReportPage.css';
import { getPieceColor } from '../../utils/colors';
import BoardDiagram from './BoardDiagram';
import ArchitecturalPlan from './ArchitecturalPlan';

export default function ReportPageWrapper() {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('cutwood-print-payload');
      if (stored) setData(JSON.parse(stored));
    } catch (e) {
      console.error('No se pudo cargar la info del reporte', e);
    }
  }, []);

  if (!data) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#090E17', color: 'white', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Sin datos para el reporte</h2>
        <p style={{ margin: 0, color: '#94a3b8' }}>Volvé a la app y usá el botón "Exportar PDF".</p>
      </div>
    );
  }

  return <ReportPage data={data} />;
}

// ─── Número de página global ────────────────────────────────────────────────
let _pageNum = 0;
function nextPage() { return ++_pageNum; }

function ReportPage({ data }) {
  const { result, pieces = [], stock = {}, options = {}, projectName = '', theme: initialTheme = 'dark' } = data;
  const { stats, boards = [] } = result;
  _pageNum = 0; // reset en cada render

  const [localTheme, setLocalTheme] = useState(initialTheme);

  // Imprimir: forzar tema light → imprimir → restaurar tema original
  const handlePrint = useCallback(() => {
    const prev = localTheme;
    setLocalTheme('light');
    // Esperar un frame para que React aplique el tema antes de imprimir
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try { await document.fonts.ready; } catch(_) {}
        window.print();
        // Restaurar tema original después de cerrar el diálogo
        const restore = () => { setLocalTheme(prev); window.removeEventListener('afterprint', restore); };
        window.addEventListener('afterprint', restore);
      });
    });
  }, [localTheme]);

  useEffect(() => {
    document.body.style.backgroundColor = localTheme === 'dark' ? '#020617' : '#f1f5f9';
    return () => { document.body.style.backgroundColor = ''; };
  }, [localTheme]);

  const { totalArea, validPieces, edgeBandingM, costTotal, allOffcuts } = useMemo(() => {
    let totalA = 0;
    const vp = pieces.filter(p => p.width > 0 && p.height > 0);
    let ebMeters = 0;
    vp.forEach(p => {
      totalA += (p.width * p.height * (p.quantity || 1)) / 1000000;
      const eb = p.edgeBanding;
      if (eb) {
        const q = p.quantity || 1;
        if (eb.top) ebMeters += p.width * q / 1000;
        if (eb.bottom) ebMeters += p.width * q / 1000;
        if (eb.left) ebMeters += p.height * q / 1000;
        if (eb.right) ebMeters += p.height * q / 1000;
      }
    });
    const costBoards = stats.totalBoards * (stock.pricePerBoard || 0);
    const costEdge = ebMeters * (stock.pricePerMeterEdge || 0);

    const offcutsArr = [];
    boards.forEach((b, idx) => {
      b.offcuts?.forEach(oc => offcutsArr.push({
        ...oc,
        source: b.isOffcut ? `Retazo ${b.stockWidth}×${b.stockHeight}` : `Tablero ${idx + 1}`
      }));
    });
    return { totalArea: totalA, validPieces: vp, edgeBandingM: ebMeters, costTotal: costBoards + costEdge, allOffcuts: offcutsArr };
  }, [pieces, stats.totalBoards, stock, boards]);

  const allPieceIds = useMemo(() => pieces.map(p => p.id), [pieces]);
  const kerfVal = options.kerf || boards[0]?.cutSequence?.[0]?.kerf || 0;
  const dateStr = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  const grainLabel = stock.grain === 'vertical' ? 'Vertical' : stock.grain === 'horizontal' ? 'Horizontal' : 'Sin veta';

  return (
    <div className={`report-container print-theme-${localTheme}`}>

      {/* ════ PANEL FLOTANTE ════ */}
      <div className="report-floating-panel">
        <button className="theme-toggle-btn" onClick={() => setLocalTheme(t => t === 'dark' ? 'light' : 'dark')}>
          <span className="tgg-icon">{localTheme === 'dark' ? <Moon size={17}/> : <Sun size={17}/>}</span>
          {localTheme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
        </button>
        <button className="floating-print-btn" onClick={handlePrint}>
          <Printer size={18}/> Imprimir Reporte
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  HOJA 1: PORTADA GOD-LEVEL                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="print-page print-page-fixed cover-page">
        <div className="cover-accent-bar"/>

        {/* ── HERO STRIP ── */}
        <div className="cover-hero">
          <div className="cover-hero-left">
            <div className="cover-logo-row">
              <svg viewBox="0 0 32 32" fill="none" width="34" height="34" style={{flexShrink:0}}>
                <rect x="2" y="6" width="28" height="20" rx="3" fill="currentColor" opacity="0.12"/>
                <rect x="4" y="8" width="11" height="8" rx="1.5" fill="var(--print-accent)" opacity="0.9"/>
                <rect x="17" y="8" width="11" height="8" rx="1.5" fill="var(--print-accent)" opacity="0.5"/>
                <rect x="4" y="18" width="24" height="6" rx="1.5" fill="var(--print-accent)" opacity="0.35"/>
                <line x1="15" y1="8" x2="15" y2="16" stroke="var(--print-bg)" strokeWidth="1.5" strokeDasharray="2 1.5"/>
                <line x1="4" y1="16" x2="28" y2="16" stroke="var(--print-bg)" strokeWidth="1.5" strokeDasharray="2 1.5"/>
              </svg>
              <div>
                <div className="cover-brand">CutWood</div>
                <div className="cover-tagline">Optimizador Profesional de Cortes</div>
              </div>
            </div>
            <h1 className="cover-project-title">{projectName || 'Proyecto Sin Nombre'}</h1>
            <div className="cover-meta-row">
              <span className="cover-meta-chip">📅 {dateStr}</span>
              <span className={`cover-meta-chip cover-meta-chip--eff ${stats.overallUtilization >= 80 ? 'eff-green' : stats.overallUtilization >= 50 ? 'eff-amber' : 'eff-red'}`}>
                {stats.overallUtilization >= 80 ? '🟢' : stats.overallUtilization >= 50 ? '🟡' : '🔴'} {stats.overallUtilization}% aprovechamiento
              </span>
            </div>
          </div>
          <div className="cover-hero-right">
            <div className="cover-efficiency-ring" style={{
              background: `conic-gradient(${stats.overallUtilization >= 80 ? 'var(--print-success)' : stats.overallUtilization >= 50 ? 'var(--print-warning)' : 'var(--print-danger)'} ${stats.overallUtilization * 3.6}deg, var(--print-border) 0deg)`
            }}>
              <div className="cover-efficiency-inner">
                <span className="cover-eff-val">{stats.overallUtilization}%</span>
                <span className="cover-eff-lbl">USO</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY: 3 COLUMNAS ── */}
        <div className="cover-body">

          {/* COLUMNA 1: TABLERO */}
          <div className="cover-card">
            <div className="cover-card-header cover-card-header--blue">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              TABLERO DE CORTE
            </div>
            <div className="cover-card-body">
              <div className="cover-spec-row">
                <span className="cover-spec-label">Dimensiones</span>
                <span className="cover-spec-value cover-spec-value--big">{stock.width} × {stock.height} mm</span>
              </div>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Espesor</span>
                <span className="cover-spec-value">{stock.thickness || 18} mm</span>
              </div>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Cantidad plancha</span>
                <span className="cover-spec-value">{stock.quantity || '—'} uds</span>
              </div>
              {stock.material && <div className="cover-spec-row">
                <span className="cover-spec-label">Material</span>
                <span className="cover-spec-value">{stock.material}</span>
              </div>}
              {stock.brand && <div className="cover-spec-row">
                <span className="cover-spec-label">Marca</span>
                <span className="cover-spec-value">{stock.brand}</span>
              </div>}
              {stock.color && <div className="cover-spec-row">
                <span className="cover-spec-label">Color</span>
                <span className="cover-spec-value">{stock.color}</span>
              </div>}
              <div className="cover-divider"/>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Veta</span>
                <span className={`cover-badge ${stock.grain === 'none' ? 'cover-badge--muted' : 'cover-badge--amber'}`}>{grainLabel}</span>
              </div>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Kerf de sierra</span>
                <span className="cover-badge cover-badge--cyan">{kerfVal} mm</span>
              </div>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Margen de borde</span>
                <span className="cover-badge cover-badge--cyan">{options.edgeTrim || 0} mm</span>
              </div>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Rotación piezas</span>
                <span className={`cover-badge ${options.allowRotation ? 'cover-badge--green' : 'cover-badge--muted'}`}>
                  {options.allowRotation ? '✓ Permitida' : '✗ Bloqueada'}
                </span>
              </div>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Área por tablero</span>
                <span className="cover-spec-value">{((stock.width * stock.height) / 1e6).toFixed(3)} m²</span>
              </div>
              {(stock.pricePerBoard > 0) && <div className="cover-spec-row">
                <span className="cover-spec-label">Precio x plancha</span>
                <span className="cover-spec-value">${stock.pricePerBoard.toLocaleString('es-AR')}</span>
              </div>}
            </div>
          </div>

          {/* COLUMNA 2: RESULTADOS */}
          <div className="cover-card">
            <div className="cover-card-header cover-card-header--teal">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              RESULTADOS DE OPTIMIZACIÓN
            </div>
            <div className="cover-card-body">
              <div className="cover-kpi-grid">
                <div className="cover-kpi">
                  <div className="cover-kpi-val" style={{color:'var(--print-accent)'}}>{validPieces.length}</div>
                  <div className="cover-kpi-lbl">Piezas</div>
                </div>
                <div className="cover-kpi">
                  <div className="cover-kpi-val" style={{color:'var(--print-success)'}}>{stats.placedPieces}</div>
                  <div className="cover-kpi-lbl">Ubicadas</div>
                </div>
                <div className="cover-kpi">
                  <div className="cover-kpi-val" style={{color:'var(--print-accent)'}}>{stats.totalBoards}</div>
                  <div className="cover-kpi-lbl">Tableros</div>
                </div>
                {result.unfitted?.length > 0 && <div className="cover-kpi">
                  <div className="cover-kpi-val" style={{color:'var(--print-danger)'}}>{result.unfitted.length}</div>
                  <div className="cover-kpi-lbl">Sin ubicar</div>
                </div>}
              </div>
              <div className="cover-divider"/>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Área neta piezas</span>
                <span className="cover-spec-value">{totalArea.toFixed(3)} m²</span>
              </div>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Área tableros usados</span>
                <span className="cover-spec-value">{((stats.totalBoards * stock.width * stock.height) / 1e6).toFixed(3)} m²</span>
              </div>
              <div className="cover-spec-row">
                <span className="cover-spec-label">Desperdicio total</span>
                <span className="cover-spec-value" style={{color:'var(--print-danger)'}}>{(stats.totalWasteArea / 1e6).toFixed(3)} m²</span>
              </div>
              {allOffcuts.length > 0 && <div className="cover-spec-row">
                <span className="cover-spec-label">Retazos útiles</span>
                <span className="cover-badge cover-badge--amber">{allOffcuts.length} piezas — {allOffcuts.reduce((s,o) => s + (o.width*o.height)/1e6, 0).toFixed(3)} m²</span>
              </div>}
              {stats.totalOffcutBoards > 0 && <div className="cover-spec-row">
                <span className="cover-spec-label">Retazos reutilizados</span>
                <span className="cover-badge cover-badge--green">{stats.totalOffcutBoards} tableros</span>
              </div>}
              <div className="cover-divider"/>
              <div className="cover-spec-label" style={{marginBottom:5}}>Aprovechamiento global</div>
              <div className="cover-eff-bar-wrap">
                <div className="cover-eff-bar-track">
                  <div className="cover-eff-bar-fill" style={{
                    width: `${stats.overallUtilization}%`,
                    background: stats.overallUtilization >= 80 ? 'var(--print-success)' : stats.overallUtilization >= 50 ? 'var(--print-warning)' : 'var(--print-danger)'
                  }}/>
                </div>
                <span className="cover-eff-bar-val" style={{
                  color: stats.overallUtilization >= 80 ? 'var(--print-success)' : stats.overallUtilization >= 50 ? 'var(--print-warning)' : 'var(--print-danger)'
                }}>{stats.overallUtilization}%</span>
              </div>
            </div>
          </div>

          {/* COLUMNA 3: TAPACANTO & COSTOS */}
          <div className="cover-card">
            <div className="cover-card-header cover-card-header--violet">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              TAPACANTO & COSTOS
            </div>
            <div className="cover-card-body">
              {edgeBandingM > 0 ? (<>
                <div className="cover-spec-row">
                  <span className="cover-spec-label">Total tapacanto</span>
                  <span className="cover-badge cover-badge--violet">{edgeBandingM.toFixed(2)} m</span>
                </div>
                <div className="cover-spec-row">
                  <span className="cover-spec-label">Piezas con tapacanto</span>
                  <span className="cover-spec-value">{validPieces.filter(p => p.edgeBanding && Object.values(p.edgeBanding).some(Boolean)).length} / {validPieces.length}</span>
                </div>
                {stock.pricePerMeterEdge > 0 && <div className="cover-spec-row">
                  <span className="cover-spec-label">Precio x metro</span>
                  <span className="cover-spec-value">${stock.pricePerMeterEdge.toLocaleString('es-AR')}</span>
                </div>}
                <div className="cover-divider"/>
                <div className="cover-spec-label" style={{marginBottom:5}}>Desglose por cara</div>
                {['top','bottom','left','right'].map(side => {
                  const names = {top:'Superior (S)',bottom:'Inferior (I)',left:'Izquierda (L)',right:'Derecha (D)'};
                  const meters = validPieces.reduce((acc, p) => {
                    if (!p.edgeBanding?.[side]) return acc;
                    const q = p.quantity || 1;
                    const len = (side === 'top' || side === 'bottom') ? p.width : p.height;
                    return acc + (len * q) / 1000;
                  }, 0);
                  if (meters === 0) return null;
                  return (
                    <div key={side} className="cover-spec-row">
                      <span className="cover-spec-label">{names[side]}</span>
                      <span className="cover-spec-value">{meters.toFixed(2)} m</span>
                    </div>
                  );
                })}
                <div className="cover-divider"/>
              </>) : (
                <div className="cover-no-data">Sin tapacanto configurado</div>
              )}
              {costTotal > 0 ? (<>
                {stock.pricePerBoard > 0 && <div className="cover-spec-row">
                  <span className="cover-spec-label">Costo tableros</span>
                  <span className="cover-spec-value">${(stats.totalBoards * stock.pricePerBoard).toLocaleString('es-AR')}</span>
                </div>}
                {edgeBandingM > 0 && stock.pricePerMeterEdge > 0 && <div className="cover-spec-row">
                  <span className="cover-spec-label">Costo tapacanto</span>
                  <span className="cover-spec-value">${(edgeBandingM * (stock.pricePerMeterEdge||0)).toLocaleString('es-AR')}</span>
                </div>}
                <div className="cover-cost-total">
                  <span>COSTO TOTAL</span>
                  <span>${costTotal.toLocaleString('es-AR')}</span>
                </div>
              </>) : (
                <div className="cover-no-data" style={{marginTop: edgeBandingM > 0 ? 0 : 8}}>Sin precios configurados</div>
              )}
            </div>
          </div>

        </div>{/* /cover-body */}

        <Footer page={1}/>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  HOJA 2: CATÁLOGO DE PIEZAS — GOD LEVEL                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="print-page print-page-auto pieces-page">
        <div className="cover-accent-bar"/>

        {/* ── HEADER COMPACTO ── */}
        <div className="work-page-header">
          <div className="work-page-header-left">
            <span className="work-page-label">Hoja 2 — Lista de Piezas</span>
            <span className="work-page-title">{projectName || 'Proyecto'}</span>
          </div>
          <div className="work-page-header-right">
            <span className="work-info-chip">{validPieces.length} piezas</span>
            <span className="work-info-chip">{validPieces.reduce((s,p)=>s+(p.quantity||1),0)} uds</span>
            <span className="work-info-chip">{totalArea.toFixed(3)} m²</span>
            {edgeBandingM > 0 && <span className="work-info-chip work-info-chip--purple">{edgeBandingM.toFixed(1)} m tapacanto</span>}
          </div>
        </div>

        {/* ── TABLA PREMIUM ── */}
        <div className="pieces-table-wrap">
          <table className="pieces-table">
            <thead>
              <tr>
                <th className="pieces-th pieces-th--num-col">#</th>
                <th className="pieces-th pieces-th--name">Nombre de Pieza</th>
                <th className="pieces-th pieces-th--dims">Largo × Ancho</th>
                <th className="pieces-th pieces-th--qty">Cant.</th>
                <th className="pieces-th pieces-th--area">Área / ud</th>
                <th className="pieces-th pieces-th--area">Total</th>
                <th className="pieces-th pieces-th--grain">Veta</th>
                <th className="pieces-th pieces-th--edge">Tapacanto</th>
              </tr>
            </thead>
            <tbody>
              {validPieces.map((p, i) => {
                const colorIdx = allPieceIds.indexOf(p.id) >= 0 ? allPieceIds.indexOf(p.id) : i;
                const colorHex = getPieceColor(colorIdx).border;
                const eb = p.edgeBanding;
                const hasTap = eb && Object.values(eb).some(Boolean);
                const areaUnit = (p.width * p.height) / 1_000_000;
                const areaTotal = areaUnit * (p.quantity || 1);

                return (
                  <tr key={p.id} className="pieces-row">
                    {/* # + color swatch */}
                    <td className="pieces-td pieces-td--num-col">
                      <div className="piece-num-cell">
                        <div className="piece-swatch" style={{background: colorHex}}/>
                        <span className="piece-num-txt">{i + 1}</span>
                      </div>
                    </td>
                    {/* Name */}
                    <td className="pieces-td pieces-td--name">
                      <div className="piece-name">{p.name || `Pieza ${i + 1}`}</div>
                    </td>
                    {/* Dims */}
                    <td className="pieces-td pieces-td--dims">
                      <span className="piece-dim-val">{p.width}</span>
                      <span className="piece-dim-sep"> × </span>
                      <span className="piece-dim-val">{p.height}</span>
                      <span className="piece-dim-unit"> mm</span>
                    </td>
                    {/* Qty */}
                    <td className="pieces-td pieces-td--qty">
                      <span className="piece-qty">{p.quantity || 1}</span>
                    </td>
                    {/* Area/ud */}
                    <td className="pieces-td pieces-td--area">
                      <span className="piece-area">{areaUnit.toFixed(4)}</span>
                      <span className="piece-area-unit"> m²</span>
                    </td>
                    {/* Area total */}
                    <td className="pieces-td pieces-td--area">
                      <span className="piece-area piece-area--total">{areaTotal.toFixed(4)}</span>
                      <span className="piece-area-unit"> m²</span>
                    </td>
                    {/* Grain */}
                    <td className="pieces-td pieces-td--grain">
                      {p.grain === 'vertical' ? (
                        <span className="piece-grain piece-grain--v">↕ Vert.</span>
                      ) : p.grain === 'horizontal' ? (
                        <span className="piece-grain piece-grain--h">↔ Horiz.</span>
                      ) : (
                        <span className="piece-grain piece-grain--none">—</span>
                      )}
                    </td>
                    {/* Edge banding */}
                    <td className="pieces-td pieces-td--edge">
                      {hasTap ? (
                        <div className="piece-edge-grid">
                          {eb.top    && <span className="piece-edge-dot" title="Superior">S</span>}
                          {eb.bottom && <span className="piece-edge-dot" title="Inferior">I</span>}
                          {eb.left   && <span className="piece-edge-dot" title="Izquierda">L</span>}
                          {eb.right  && <span className="piece-edge-dot" title="Derecha">D</span>}
                        </div>
                      ) : (
                        <span className="piece-edge-none">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER SUMMARY BAR ── */}
        <div className="pieces-summary-bar">
          <div className="pieces-summary-item">
            <span className="pieces-summary-label">Total piezas únicas</span>
            <span className="pieces-summary-val" style={{color:'var(--print-accent)'}}>{validPieces.length}</span>
          </div>
          <div className="pieces-summary-sep"/>
          <div className="pieces-summary-item">
            <span className="pieces-summary-label">Unidades totales</span>
            <span className="pieces-summary-val">{validPieces.reduce((s,p)=>s+(p.quantity||1),0)}</span>
          </div>
          <div className="pieces-summary-sep"/>
          <div className="pieces-summary-item">
            <span className="pieces-summary-label">Área neta total</span>
            <span className="pieces-summary-val" style={{color:'var(--print-success)'}}>{totalArea.toFixed(4)} m²</span>
          </div>
          {edgeBandingM > 0 && <>
            <div className="pieces-summary-sep"/>
            <div className="pieces-summary-item">
              <span className="pieces-summary-label">Tapacanto total</span>
              <span className="pieces-summary-val" style={{color:'#a78bfa'}}>{edgeBandingM.toFixed(2)} m</span>
            </div>
          </>}
          {validPieces.filter(p=>p.grain&&p.grain!=='none').length > 0 && <>
            <div className="pieces-summary-sep"/>
            <div className="pieces-summary-item">
              <span className="pieces-summary-label">Con dirección de veta</span>
              <span className="pieces-summary-val" style={{color:'var(--print-warning)'}}>{validPieces.filter(p=>p.grain&&p.grain!=='none').length} piezas</span>
            </div>
          </>}
        </div>

        <Footer page={2}/>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  POR CADA TABLERO: HOJA A (Diagrama) + HOJA B (Secuencia) + HOJA C (Plano) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {boards.map((b, bIdx) => {
        const titleStr = b.isOffcut ? `Retazo ${bIdx + 1}` : `Tablero ${bIdx + 1}`;
        const bWaste = (b.wasteArea / 1_000_000).toFixed(3);
        const l1 = b.cutSequence?.filter(c => c.level === 1).length || 0;
        const l2 = b.cutSequence?.filter(c => c.level === 2).length || 0;
        const l3 = b.cutSequence?.filter(c => c.level === 3).length || 0;
        const pageA = 3 + bIdx * 3;
        const pageB = pageA + 1;
        const pageC = pageA + 2;

        return (
          <React.Fragment key={`board-group-${bIdx}`}>

            {/* ─── HOJA A: DIAGRAMA DEL TABLERO — GOD LEVEL ──────────── */}
            <div className="print-page print-page-fixed board-diagram-page">
            {/* ── HEADER COMPACTO HOJA A ── */}
              <div className="work-page-header">
                <div className="work-page-header-left">
                  <span className="work-page-label">Hoja A — Diagrama de Tablero</span>
                  <span className="work-page-title">{titleStr}</span>
                </div>
                <div className="work-page-header-right">
                  <span className="work-info-chip">{b.stockWidth} × {b.stockHeight} mm</span>
                  <span className="work-info-chip">{b.pieces.length} piezas</span>
                  <span className={`work-info-chip work-info-chip--use ${b.utilization >= 80 ? 'good' : b.utilization >= 50 ? 'ok' : 'low'}`}>
                    {b.utilization.toFixed(1)}% uso
                  </span>
                  <span className="work-info-chip work-info-chip--muted">Desperdicio: {bWaste} m²</span>
                  {b.offcuts?.length > 0 && (
                    <span className="work-info-chip work-info-chip--amber">♻ {b.offcuts.length} retazo{b.offcuts.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              {/* Full-page diagram */}
              <div className="board-diagram-fill">
                <BoardDiagram board={b} allPieceIds={allPieceIds} isDark={localTheme === 'dark'}/>
              </div>

              {/* Legend bar */}
              <div className="board-page-legend">
                {b.pieces.slice(0, 8).map((piece, pi) => {
                  const idx = allPieceIds.indexOf(piece.id);
                  const color = getPieceColor(idx >= 0 ? idx : pi);
                  return (
                    <div key={`leg-${pi}`} className="board-legend-item">
                      <div className="board-legend-dot" style={{background: color.bg, border: `1.5px solid ${color.border}`}}/>
                      <span className="board-legend-label">{piece.name || `P${pi+1}`}</span>
                    </div>
                  );
                })}
                {b.pieces.length > 8 && (
                  <div className="board-legend-more">+{b.pieces.length - 8} más</div>
                )}
                {b.offcuts?.length > 0 && (
                  <div className="board-legend-item board-legend-item--offcut">
                    <div className="board-legend-dot board-legend-dot--offcut"/>
                    <span className="board-legend-label">Retazos útiles</span>
                  </div>
                )}
              </div>

              <Footer page={pageA}/>
            </div>

            {/* ─── HOJA B: SECUENCIA DE CORTES — GOD LEVEL ─────────────────── */}
            <div className="print-page print-page-auto seq-page">
              <div className="cover-accent-bar"/>

            {/* ── HEADER COMPACTO HOJA B ── */}
              <div className="work-page-header">
                <div className="work-page-header-left">
                  <span className="work-page-label">Hoja B — Secuencia de Cortes</span>
                  <span className="work-page-title">{titleStr}</span>
                </div>
                <div className="work-page-header-right">
                  <span className="work-info-chip">{b.cutSequence?.length || 0} cortes</span>
                  <span className="work-info-chip work-info-chip--l1">L1: {l1}</span>
                  <span className="work-info-chip work-info-chip--l2">L2: {l2}</span>
                  {l3 > 0 && <span className="work-info-chip work-info-chip--l3">L3: {l3}</span>}
                  <span className="work-info-chip work-info-chip--muted">Kerf: {kerfVal} mm</span>
                </div>
              </div>


              {/* ── TABLA DE CORTES ── */}
              <div className="seq-table-wrap">
                <table className="seq-table">
                  <thead>
                    <tr>
                      <th className="seq-th seq-th--num">#</th>
                      <th className="seq-th seq-th--level">Nivel</th>
                      <th className="seq-th seq-th--type">Dirección</th>
                      <th className="seq-th seq-th--pos">Posición</th>
                      <th className="seq-th seq-th--bar">Progresión</th>
                      <th className="seq-th seq-th--region">Región activa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(b.cutSequence || []).map((cut, ci) => {
                      const isV     = cut.type === 'vertical';
                      const dim     = isV ? b.stockWidth : b.stockHeight;
                      const pct     = dim > 0 ? Math.min(100, (cut.position / dim) * 100) : 0;
                      const lvl     = cut.level || 1;
                      const lvlCls  = lvl === 1 ? 'l1' : lvl === 2 ? 'l2' : 'l3';
                      const lvlLbl  = lvl === 1 ? 'L1 · Primario' : lvl === 2 ? 'L2 · Secundario' : 'L3 · Recorte';
                      const region  = cut.region;
                      const regionStr = region
                        ? `${region.left ?? 0} → ${isV ? (region.right ?? b.stockWidth) : (region.bottom ?? b.stockHeight)} mm`
                        : 'Tablero completo';
                      return (
                        <tr key={ci} className={`seq-tr seq-tr--${lvlCls} ${ci % 2 === 1 ? 'seq-tr--alt' : ''}`}>
                          {/* # */}
                          <td className="seq-td seq-td--num">
                            <span className={`seq-row-num seq-row-num--${lvlCls}`}>{cut.number || ci + 1}</span>
                          </td>
                          {/* Nivel */}
                          <td className="seq-td seq-td--level">
                            <span className={`seq-level-pill seq-level-pill--${lvlCls}`}>{lvlLbl}</span>
                          </td>
                          {/* Dirección */}
                          <td className="seq-td seq-td--type">
                            <span className="seq-dir-icon">{isV ? '↕' : '↔'}</span>
                            <span className="seq-dir-label">{isV ? 'Vertical' : 'Horizontal'}</span>
                          </td>
                          {/* Posición */}
                          <td className="seq-td seq-td--pos">
                            <span className="seq-pos-num">{cut.position}</span>
                            <span className="seq-pos-unit"> mm</span>
                          </td>
                          {/* Barra de progresión */}
                          <td className="seq-td seq-td--bar">
                            <div className="seq-inline-bar">
                              <div className="seq-bar-outer">
                                <div className={`seq-inline-fill seq-inline-fill--${lvlCls}`} style={{ width: `${pct}%`}}/>
                              </div>
                              <span className="seq-inline-pct">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                          {/* Región */}
                          <td className="seq-td seq-td--region">{regionStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── NOTA TÉCNICA ── */}
              <div className="seq-note-bar">
                <span className="seq-note-icon">⚙</span>
                <span className="seq-note-text">
                  <strong>Instrucción de máquina:</strong> Posición indica la distancia desde el borde{' '}
                  <strong>izquierdo</strong> (corte vertical) o <strong>superior</strong> (corte horizontal) del tablero o región activa.
                  Kerf de sierra: <strong>{kerfVal} mm</strong>. No remover piezas hasta completar todos los cortes de nivel superior.
                </span>
              </div>

              <Footer page={pageB}/>
            </div>


            {/* ─── HOJA C: PLANO ARQUITECTÓNICO ─────────────────────────── */}
            <div className="print-page print-page-fixed">
              <div className="print-header-bar"/>
              <div className="print-board-header">
                <div>
                  <h2 className="print-board-title">
                    {titleStr}
                    <span className="print-board-subtitle">Plano Técnico de Corte</span>
                  </h2>
                  <div className="print-section-tag" style={{ marginTop: 4 }}>Hoja C — Vista arquitectónica con cotas y líneas de corte</div>
                </div>
                <div className="print-board-badge" style={{ background: 'var(--print-text-muted)' }}>
                  Plano
                </div>
              </div>

              <div className="print-full-diagram">
                <ArchitecturalPlan board={b} allPieceIds={allPieceIds} boardIndex={bIdx} theme={localTheme}/>
              </div>

              <Footer page={pageC}/>
            </div>

          </React.Fragment>
        );
      })}

      {/* ══════════════════════════════════════════════════ */}
      {/*  ÚLTIMA HOJA: INVENTARIO DE RETAZOS — NIVEL DIOS  */}
      {/* ══════════════════════════════════════════════════ */}
      {allOffcuts.length > 0 && (
        <div className="print-page print-page-auto">
          <div className="cover-accent-bar"/>

          {/* ── Header ── */}
          <div className="offcut-page-header">
            <div className="offcut-header-left">
              <div className="offcut-header-tag">Inventario de Material Recuperado</div>
              <h2 className="offcut-page-title">Retazos Útiles</h2>
              <p className="offcut-page-sub">
                {allOffcuts.length} retazo{allOffcuts.length !== 1 ? 's' : ''} &middot; dimensiones &ge; 150&times;150 mm
              </p>
            </div>
            <div className="offcut-header-stats">
              <div className="offcut-header-stat">
                <div className="offcut-header-stat-value">
                  {allOffcuts.reduce((s, oc) => s + (oc.width * oc.height) / 1_000_000, 0).toFixed(3)}
                </div>
                <div className="offcut-header-stat-label">m² Recuperados</div>
              </div>
              <div className="offcut-header-stat-div"/>
              <div className="offcut-header-stat">
                <div className="offcut-header-stat-value">{allOffcuts.length}</div>
                <div className="offcut-header-stat-label">Retazos</div>
              </div>
              <div className="offcut-header-stat-div"/>
              <div className="offcut-header-stat">
                <div className="offcut-header-stat-value">
                  {Math.round(allOffcuts.reduce((s,oc)=>s+oc.width*oc.height,0)/allOffcuts.length/100)/100}
                </div>
                <div className="offcut-header-stat-label">cm² Promedio</div>
              </div>
            </div>
          </div>

          {/* ── Tabla adaptiva (escala automáticamente) ── */}
          {(() => {
            const n = allOffcuts.length;
            // FULL  : ≤15  → thumbnail grande + todas las columnas
            // COMPACT: 16-40 → thumbnail pequeño + columnas
            // ULTRA  : >40  → sin thumbnail, grilla de 2 columnas de texto
            const mode = n <= 15 ? 'full' : n <= 40 ? 'compact' : 'ultra';

            // ── Shared thumbnail builder ─────────────────────────────────────
            const buildThumb = (oc, i, tvW, tvH) => {
              const padT = 13, padR = 13, padB = 4, padL = 4;
              const maxW = tvW - padL - padR, maxH = tvH - padT - padB;
              const asp  = oc.width / oc.height;
              let rW, rH;
              if (asp >= maxW / maxH) { rW = maxW; rH = maxW / asp; }
              else                    { rH = maxH; rW = maxH * asp; }
              const rX = padL + (maxW - rW) / 2;
              const rY = padT + (maxH - rH) / 2;
              const AMBER = '#f59e0b', ALINE = 'rgba(245,158,11,0.75)', ABG = 'rgba(254,252,232,0.92)';
              const FS = mode === 'full' ? 6.5 : 5.5;
              const wLbl = `${oc.width}`, hLbl = `${oc.height}`;
              const hArrowY = rY - 5, hX1 = rX, hX2 = rX + rW, hMX = (hX1+hX2)/2;
              const hAl = Math.min(3, rW/8), hLW = (wLbl.length+3) * FS * 0.60 + 6;
              const vArrowX = rX + rW + 5, vY1 = rY, vY2 = rY + rH, vMY = (vY1+vY2)/2;
              const vAl = Math.min(3, rH/8), vLH = (hLbl.length+3) * FS * 0.60 + 6;
              const showV = rH >= 14;
              return (
                <svg viewBox={`0 0 ${tvW} ${tvH}`} width={tvW} height={tvH} style={{ display:'block' }}>
                  <defs>
                    <pattern id={`rh-${i}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(245,158,11,0.28)" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect x={rX+1.5} y={rY+1.5} width={rW} height={rH} rx="2" fill="rgba(0,0,0,0.07)"/>
                  <rect x={rX} y={rY} width={rW} height={rH} rx="2"
                    fill="rgba(245,158,11,0.07)" stroke={AMBER} strokeWidth="0.9" strokeDasharray="4 2"/>
                  <rect x={rX} y={rY} width={rW} height={rH} rx="2" fill={`url(#rh-${i})`}/>
                  {/* H arrow */}
                  <line x1={hX1} y1={hArrowY-2} x2={hX1} y2={hArrowY+2} stroke={ALINE} strokeWidth="0.8"/>
                  <line x1={hX2} y1={hArrowY-2} x2={hX2} y2={hArrowY+2} stroke={ALINE} strokeWidth="0.8"/>
                  <line x1={hX1} y1={hArrowY} x2={hMX-hLW/2-1} y2={hArrowY} stroke={ALINE} strokeWidth="0.7"/>
                  <line x1={hMX+hLW/2+1} y1={hArrowY} x2={hX2} y2={hArrowY} stroke={ALINE} strokeWidth="0.7"/>
                  <polygon points={`${hX1},${hArrowY} ${hX1+hAl},${hArrowY-1.4} ${hX1+hAl},${hArrowY+1.4}`} fill={ALINE}/>
                  <polygon points={`${hX2},${hArrowY} ${hX2-hAl},${hArrowY-1.4} ${hX2-hAl},${hArrowY+1.4}`} fill={ALINE}/>
                  <rect x={hMX-hLW/2} y={hArrowY-(FS+2)/2} width={hLW} height={FS+2} fill={ABG} rx="1.5"/>
                  <text x={hMX} y={hArrowY} textAnchor="middle" dominantBaseline="middle"
                    fill={AMBER} fontSize={FS} fontFamily="Inter,system-ui" fontWeight="700"
                    style={{ fontVariantNumeric:'tabular-nums' }}>{wLbl}</text>
                  {/* V arrow or ×H text */}
                  {showV ? (
                    <>
                      <line x1={vArrowX-2} y1={vY1} x2={vArrowX+2} y2={vY1} stroke={ALINE} strokeWidth="0.8"/>
                      <line x1={vArrowX-2} y1={vY2} x2={vArrowX+2} y2={vY2} stroke={ALINE} strokeWidth="0.8"/>
                      <line x1={vArrowX} y1={vY1} x2={vArrowX} y2={vMY-vLH/2-1} stroke={ALINE} strokeWidth="0.7"/>
                      <line x1={vArrowX} y1={vMY+vLH/2+1} x2={vArrowX} y2={vY2} stroke={ALINE} strokeWidth="0.7"/>
                      <polygon points={`${vArrowX},${vY1} ${vArrowX-1.4},${vY1+vAl} ${vArrowX+1.4},${vY1+vAl}`} fill={ALINE}/>
                      <polygon points={`${vArrowX},${vY2} ${vArrowX-1.4},${vY2-vAl} ${vArrowX+1.4},${vY2-vAl}`} fill={ALINE}/>
                      <rect x={vArrowX-(FS+2)/2} y={vMY-vLH/2} width={FS+2} height={vLH} fill={ABG} rx="1.5"/>
                      <text x={vArrowX} y={vMY} textAnchor="middle" dominantBaseline="middle"
                        fill={AMBER} fontSize={FS} fontFamily="Inter,system-ui" fontWeight="700"
                        transform={`rotate(-90,${vArrowX},${vMY})`}
                        style={{ fontVariantNumeric:'tabular-nums' }}>{hLbl}</text>
                    </>
                  ) : (
                    <text x={hMX} y={hArrowY+FS+4} textAnchor="middle" dominantBaseline="middle"
                      fill={ALINE} fontSize={FS-0.5} fontFamily="Inter,system-ui" fontWeight="600"
                      style={{ fontVariantNumeric:'tabular-nums' }}>×{oc.height}</text>
                  )}
                </svg>
              );
            };

            // ── ULTRA mode: 2-column text grid ───────────────────────────────
            if (mode === 'ultra') {
              const pairs = [];
              for (let i = 0; i < allOffcuts.length; i += 2)
                pairs.push([allOffcuts[i], allOffcuts[i + 1]]);
              return (
                <div className="rtz-table-wrap">
                  <table className="rtz-table">
                    <thead>
                      <tr className="rtz-thead-row">
                        <th className="rtz-th rtz-th--num2">#</th>
                        <th className="rtz-th rtz-th--dims2">Dimensiones</th>
                        <th className="rtz-th rtz-th--area2">Área</th>
                        <th className="rtz-th rtz-th--src2">Origen</th>
                        <th className="rtz-th rtz-th--sep2"></th>
                        <th className="rtz-th rtz-th--num2">#</th>
                        <th className="rtz-th rtz-th--dims2">Dimensiones</th>
                        <th className="rtz-th rtz-th--area2">Área</th>
                        <th className="rtz-th rtz-th--src2">Origen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pairs.map(([a, b], pi) => {
                        const fmtDim = oc => `${oc.width} × ${oc.height} mm`;
                        const fmtArea = oc => ((oc.width * oc.height)/10000).toFixed(1) + ' cm²';
                        const isAlt = pi % 2 === 1;
                        return (
                          <tr key={pi} className={`rtz-tr rtz-tr--compact${isAlt?' rtz-tr--alt':''}`}>
                            <td className="rtz-td rtz-td--num"><span className="rtz-badge rtz-badge--sm">R{pi*2+1}</span></td>
                            <td className="rtz-td"><span className="rtz-dims-compact">{fmtDim(a)}</span></td>
                            <td className="rtz-td rtz-area-compact">{fmtArea(a)}</td>
                            <td className="rtz-td rtz-src-compact">{a.source||'—'}</td>
                            <td className="rtz-td rtz-sep-col"></td>
                            {b ? (
                              <>
                                <td className="rtz-td rtz-td--num"><span className="rtz-badge rtz-badge--sm">R{pi*2+2}</span></td>
                                <td className="rtz-td"><span className="rtz-dims-compact">{fmtDim(b)}</span></td>
                                <td className="rtz-td rtz-area-compact">{fmtArea(b)}</td>
                                <td className="rtz-td rtz-src-compact">{b.source||'—'}</td>
                              </>
                            ) : <td colSpan="4"></td>}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }

            // ── FULL / COMPACT mode: table with thumbnail ─────────────────────
            const tvW = mode === 'full' ? 150 : 100;
            const tvH = mode === 'full' ? 78  : 52;
            return (
              <div className="rtz-table-wrap">
                <table className="rtz-table">
                  <thead>
                    <tr className="rtz-thead-row">
                      <th className="rtz-th rtz-th--num">#</th>
                      <th className="rtz-th rtz-th--thumb">Vista</th>
                      <th className="rtz-th rtz-th--dims">Dimensiones</th>
                      <th className="rtz-th rtz-th--area">Área</th>
                      <th className="rtz-th rtz-th--ratio">Relación</th>
                      <th className="rtz-th rtz-th--source">Tablero origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOffcuts.map((oc, i) => {
                      const areaCm = ((oc.width * oc.height) / 10_000).toFixed(1);
                      const areaM2 = ((oc.width * oc.height) / 1_000_000).toFixed(4);
                      const ratio  = (oc.width / oc.height).toFixed(2);
                      const isAlt  = i % 2 === 1;
                      return (
                        <tr key={i} className={`rtz-tr${mode==='compact'?' rtz-tr--compact':''}${isAlt?' rtz-tr--alt':''}`}>
                          <td className="rtz-td rtz-td--num">
                            <span className={`rtz-badge${mode==='compact'?' rtz-badge--sm':''}`}>R{i+1}</span>
                          </td>
                          <td className="rtz-td rtz-td--thumb">
                            {buildThumb(oc, i, tvW, tvH)}
                          </td>
                          <td className="rtz-td rtz-td--dims">
                            <span className={mode==='full'?'rtz-dims-main':'rtz-dims-compact'}>{oc.width} × {oc.height}</span>
                            <span className="rtz-dims-unit"> mm</span>
                          </td>
                          <td className="rtz-td rtz-td--area">
                            <div className="rtz-area-val">{areaCm} cm²</div>
                            {mode === 'full' && <div className="rtz-area-m2">{areaM2} m²</div>}
                          </td>
                          <td className="rtz-td rtz-td--ratio">
                            <span className="rtz-ratio">{ratio}:1</span>
                          </td>
                          <td className="rtz-td rtz-td--source">{oc.source||'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          <Footer page="Final"/>
        </div>
      )}

    </div>
  );
}


function StatCard({ val, label }) {
  return (
    <div className="print-stat-card">
      <div className="print-stat-value">{val}</div>
      <div className="print-stat-label">{label}</div>
    </div>
  );
}

function Footer({ page }) {
  return (
    <div className="print-footer">
      <span>Optimizador de Cortes</span>
      <span style={{ fontWeight: 600 }}>Pág. {page}</span>
    </div>
  );
}
