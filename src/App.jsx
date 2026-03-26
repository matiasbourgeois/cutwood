import { useState, useCallback, useRef, useEffect } from 'react';
import { Download, Upload, FileText, Package as PackageIcon, BookOpen, Sun, Moon, ChevronLeft, ChevronRight, Scissors, AlertTriangle, Layers, Rocket, Loader2 } from 'lucide-react';
import './index.css';
import Sidebar from './components/Sidebar/Sidebar';
import ConfirmModal from './components/ConfirmModal';
import RetazosModal from './components/RetazosModal';
import CutDiagram from './components/Canvas/CutDiagram';
import StatsPanel from './components/Canvas/StatsPanel';
import CutSequence from './components/Canvas/CutSequence';
import { optimizeCuts } from './engine/optimizer';
import { exportToPDF } from './utils/pdfExport';
import { exportAllProjects, importProjects, getAllProjects, saveProject, getAllOffcuts, saveOffcuts, removeOffcut, clearOffcuts, consumeOffcuts, updateOffcut, addManualOffcut, toggleOffcutSelection, getSelectedOffcuts } from './utils/storage';

const EXAMPLE_PROJECT = {
  id: 'ejemplo_modular',
  name: 'Modular Ejemplo',
  pieces: [
    { id: 'r1',  name: 'Pieza 1',  width: 1694, height: 300, quantity: 3, grain: 'none', edgeBanding: { top: false, bottom: false, left: false, right: false } },
    { id: 'r9',  name: 'Pieza 9',  width: 345,  height: 280, quantity: 2, grain: 'none', edgeBanding: { top: false, bottom: false, left: false, right: false } },
    { id: 'r20', name: 'Pieza 20', width: 2620, height: 100, quantity: 1, grain: 'none', edgeBanding: { top: false, bottom: false, left: false, right: false } },
    { id: 'r21', name: 'Pieza 21', width: 2620, height: 100, quantity: 1, grain: 'none', edgeBanding: { top: false, bottom: false, left: false, right: false } },
    { id: 'r22', name: 'Pieza 22', width: 2620, height: 100, quantity: 1, grain: 'none', edgeBanding: { top: false, bottom: false, left: false, right: false } },
    { id: 'r8',  name: 'Pieza 8',  width: 522,  height: 331, quantity: 2, grain: 'none', edgeBanding: { top: false, bottom: false, left: false, right: false } },
    { id: 'r11', name: 'Pieza 11', width: 522,  height: 331, quantity: 2, grain: 'none', edgeBanding: { top: false, bottom: false, left: false, right: false } },
    { id: 'r13', name: 'Pieza 13', width: 534,  height: 280, quantity: 1, grain: 'none', edgeBanding: { top: false, bottom: false, left: false, right: false } },
  ],
  stock: { width: 2750, height: 1830, thickness: 18, quantity: 10, grain: 'none' },
  options: { kerf: 3, edgeTrim: 5, allowRotation: true },
};

const DEFAULT_STOCK = {
  width: 2750,
  height: 1830,
  thickness: 18,
  quantity: 10,
  grain: 'none',
};

const DEFAULT_OPTIONS = {
  kerf: 3,
  edgeTrim: 5,
  allowRotation: true,
};

const EMPTY_PIECE = () => ({
  id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
  name: '', width: '', height: '', quantity: 1,
  grain: 'none',
  edgeBanding: { top: false, bottom: false, left: false, right: false },
});

export default function App() {
  const [projectName, setProjectName] = useState('');
  const [pieces, setPieces] = useState(Array.from({ length: 5 }, () => EMPTY_PIECE()));
  const [stock, setStock] = useState(() => {
    try {
      const saved = localStorage.getItem('cutwood-stock');
      return saved ? { ...DEFAULT_STOCK, ...JSON.parse(saved) } : DEFAULT_STOCK;
    } catch { return DEFAULT_STOCK; }
  });
  const [options, setOptions] = useState(() => {
    try {
      const saved = localStorage.getItem('cutwood-options');
      return saved ? { ...DEFAULT_OPTIONS, ...JSON.parse(saved) } : DEFAULT_OPTIONS;
    } catch { return DEFAULT_OPTIONS; }
  });

  // Persist stock & options to localStorage
  useEffect(() => {
    try { localStorage.setItem('cutwood-stock', JSON.stringify(stock)); } catch {}
  }, [stock]);
  useEffect(() => {
    try { localStorage.setItem('cutwood-options', JSON.stringify(options)); } catch {}
  }, [options]);
  const [result, setResult] = useState(null);
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [toast, setToast] = useState(null);
  const [offcuts, setOffcuts] = useState(getAllOffcuts());
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState(null); // 'reoptimize' | 'offcuts'
  const [pendingOptimize, setPendingOptimize] = useState(null);
  const [showRetazosModal, setShowRetazosModal] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('cutwood-theme') || 'dark');

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cutwood-theme', theme);
  }, [theme]);

  // Ensure example project always exists in history
  useEffect(() => {
    const projects = getAllProjects();
    if (!projects.find(p => p.id === 'ejemplo_modular')) {
      saveProject(EXAMPLE_PROJECT);
    }
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const [hoveredCut, setHoveredCut] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('cutwood-sidebar-width');
    return saved ? Math.max(20, Math.min(60, Number(saved))) : 50;
  });
  const isResizing = useRef(false);
  const fileInputRef = useRef(null);

  // Persist sidebar width
  useEffect(() => {
    localStorage.setItem('cutwood-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  // Drag-to-resize sidebar
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => {
      if (!isResizing.current) return;
      const pct = (ev.clientX / window.innerWidth) * 100;
      setSidebarWidth(Math.max(20, Math.min(60, pct)));
    };
    const onUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleExportDB = useCallback(() => {
    const projects = getAllProjects();
    if (projects.length === 0) {
      showToast('No hay muebles guardados para exportar', 'warning');
      return;
    }
    exportAllProjects();
    showToast(`✅ ${projects.length} mueble(s) exportado(s)`);
  }, []);

  const handleImportDB = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importProjects(file);
      const parts = [`✅ ${result.imported} mueble(s) importado(s) de ${result.total}`];
      if (result.offcutImported > 0) parts.push(`+ ${result.offcutImported} retazo(s)`);
      if (result.settingsRestored) parts.push('+ configuración restaurada');
      showToast(parts.join(' '));
      setOffcuts(getAllOffcuts());
      // If settings were restored, reload to apply them
      if (result.settingsRestored) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    }
    e.target.value = '';
  }, []);

  const handleCalculate = useCallback(() => {
    // ── Validation ──
    if (pieces.length === 0) {
      showToast('Agregá al menos una pieza para optimizar', 'warning');
      return;
    }

    if (!stock.width || !stock.height) {
      showToast('Configurá las medidas del tablero (largo y ancho)', 'warning');
      return;
    }

    const validPieces = pieces.filter(
      (p) => p.width > 0 && p.height > 0 && p.quantity > 0
    );

    const invalidCount = pieces.length - validPieces.length;
    if (validPieces.length === 0) {
      showToast('Ninguna pieza tiene medidas válidas (largo, ancho y cantidad > 0)', 'warning');
      return;
    }

    // Warn about oversized pieces
    const oversized = validPieces.filter(p => {
      const fits = (p.width <= stock.width && p.height <= stock.height) ||
                   (p.height <= stock.width && p.width <= stock.height);
      return !fits;
    });
    if (oversized.length > 0) {
      const names = oversized.map(p => p.name || 'Sin nombre').join(', ');
      showToast(`⚠️ ${oversized.length} pieza(s) no entran en el tablero: ${names}`, 'warning');
    }

    // Warn about high kerf
    const kerf = options.kerf || 0;
    if (kerf > 10) {
      showToast(`⚠️ Kerf de ${kerf}mm es muy alto — verificá el ancho de sierra`, 'warning');
    }

    // Warn about incomplete pieces (but still continue)
    if (invalidCount > 0) {
      showToast(`ℹ️ ${invalidCount} pieza(s) sin medidas completas fueron ignoradas`, 'warning');
    }

    // Check if we need confirmation for re-optimization
    const selectedOffcuts = offcuts.filter(o => o.selected);
    if (result) {
      setPendingOptimize(validPieces);
      setConfirmType(selectedOffcuts.length > 0 ? 'offcuts' : 'reoptimize');
      setShowConfirm(true);
      return;
    }

    // Check if we need confirmation for selected offcuts (first-time optimize)
    if (selectedOffcuts.length > 0) {
      setPendingOptimize(validPieces);
      setConfirmType('offcuts');
      setShowConfirm(true);
      return;
    }

    doOptimize(validPieces);
  }, [pieces, stock, options, offcuts, projectName]);

  const doOptimize = useCallback((validPieces) => {
    setIsCalculating(true);

    setTimeout(() => {
      try {
        const selectedOff = offcuts.filter(o => o.selected);
        const optimResult = optimizeCuts(validPieces, stock, options, selectedOff);
        setResult(optimResult);
        setCurrentBoardIndex(0);

        // Save new offcuts from results
        const newOffcuts = [];
        optimResult.boards.forEach((board, idx) => {
          if (board.offcuts && board.offcuts.length > 0) {
            // If this board was an offcut, inherit brand/color/material from the parent
            const parentOffcut = board.isOffcut && board.offcutId
              ? selectedOff.find(o => o.id === board.offcutId)
              : null;
            board.offcuts.forEach((oc, ocIdx) => {
              const boardLabel = board.isOffcut ? `R${idx + 1}` : `T${idx + 1}`;
              const letterSuffix = String.fromCharCode(65 + ocIdx); // A, B, C...
              newOffcuts.push({
                name: `Retazo ${boardLabel}-${letterSuffix}`,
                width: oc.width,
                height: oc.height,
                thickness: parentOffcut?.thickness || stock.thickness || 18,
                grain: parentOffcut?.grain || stock.grain || 'none',
                brand: parentOffcut?.brand || '',
                color: parentOffcut?.color || '',
                material: parentOffcut?.material || '',
                source: `${projectName || 'Proyecto'} - ${board.isOffcut ? 'Retazo' : 'Tablero'} ${idx + 1}`,
              });
            });
          }
        });

        // Consume used offcuts
        if (optimResult.consumedOffcutIds && optimResult.consumedOffcutIds.length > 0) {
          consumeOffcuts(optimResult.consumedOffcutIds);
        }

        // Save new offcuts
        if (newOffcuts.length > 0) {
          const updated = saveOffcuts(newOffcuts);
          setOffcuts(updated);
        } else {
          setOffcuts(getAllOffcuts());
        }

        // Build toast message
        const parts = [];
        parts.push(`✅ ${optimResult.stats.placedPieces} piezas en ${optimResult.stats.totalBoards} tablero(s)`);
        if (optimResult.stats.totalOffcutBoards > 0) {
          parts.push(`+ ${optimResult.stats.totalOffcutBoards} retazo(s) usados`);
        }
        parts.push(`${optimResult.stats.overallUtilization}% aprov.`);
        if (newOffcuts.length > 0) {
          parts.push(`📦 ${newOffcuts.length} retazo(s) guardados`);
        }

        if (optimResult.unfitted.length > 0) {
          showToast(`⚠️ ${optimResult.unfitted.length} pieza(s) no entraron`, 'warning');
        } else {
          showToast(parts.join(' — '));
        }
      } catch (err) {
        console.error('Optimization error:', err);
        showToast('Error al optimizar — revisá los datos', 'error');
      }
      setIsCalculating(false);
    }, 50);
  }, [pieces, stock, options, offcuts, projectName]);

  const handleLoadProject = useCallback((project) => {
    setProjectName(project.name || '');
    setPieces(project.pieces || []);
    if (project.stock) setStock(project.stock);
    if (project.options) setOptions(project.options);
    setResult(null);
  }, []);

  const handleNewProject = useCallback(() => {
    // Auto-save current project if it has a name and pieces
    const hasPieces = pieces.some(p => p.width > 0 && p.height > 0);
    if (projectName.trim() && hasPieces) {
      const project = {
        id: projectName.trim().toLowerCase().replace(/\s+/g, '_'),
        name: projectName.trim(),
        pieces,
        stock,
        options,
      };
      // Use the saveProject utility directly
      saveProject(project);
      showToast(`💾 "${projectName}" guardado. ¡Empezá un nuevo mueble!`);
    } else {
      showToast('🆕 Nuevo mueble — empezá de cero');
    }

    // Clear everything except stock/options (user usually keeps same board)
    setProjectName('');
    setPieces([{
      id: Date.now().toString(36),
      name: '', width: '', height: '', quantity: 1,
      grain: 'none',
      edgeBanding: { top: false, bottom: false, left: false, right: false },
    }]);
    setResult(null);
    setCurrentBoardIndex(0);
  }, [projectName, pieces, stock, options]);

  const handleExportPDF = useCallback(() => {
    if (!result) return;
    exportToPDF(result, projectName, pieces, stock, options);
  }, [result, projectName, pieces, stock, options]);

  const currentBoard = result?.boards?.[currentBoardIndex] || null;
  const allPieceIds = [...new Set(pieces.map((p) => p.id))];

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <svg className="header-logo-icon" viewBox="0 0 32 32" fill="none" width="28" height="28">
            <rect x="2" y="6" width="28" height="20" rx="3" fill="var(--accent-primary)" opacity="0.15"/>
            <rect x="4" y="8" width="11" height="8" rx="1.5" fill="var(--accent-primary)" opacity="0.7"/>
            <rect x="17" y="8" width="11" height="8" rx="1.5" fill="var(--accent-secondary)" opacity="0.5"/>
            <rect x="4" y="18" width="24" height="6" rx="1.5" fill="var(--accent-primary)" opacity="0.4"/>
            <line x1="15" y1="8" x2="15" y2="16" stroke="var(--bg-primary)" strokeWidth="1.5" strokeDasharray="2 1.5"/>
            <line x1="4" y1="16" x2="28" y2="16" stroke="var(--bg-primary)" strokeWidth="1.5" strokeDasharray="2 1.5"/>
          </svg>
          <span className="header-logo-text">CutWood</span>
          {projectName && <span className="header-project-badge">{projectName}</span>}
        </div>
        <div className="header-actions">
          {/* Group: Import / Export / PDF */}
          <div className="header-btn-group">
            <button className="header-group-item" onClick={() => fileInputRef.current?.click()} title="Importar muebles">
              <Upload size={15} />
            </button>
            <button className="header-group-item" onClick={handleExportDB} title="Exportar muebles">
              <Download size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportDB}
            />
            {result && (
              <button className="header-group-item" onClick={handleExportPDF} title="Exportar PDF">
                <FileText size={15} />
              </button>
            )}
          </div>

          {/* Retazos chip */}
          <button className="header-chip" onClick={() => setShowRetazosModal(true)} title="Inventario de retazos">
            <PackageIcon size={14} />
            <span>Retazos</span>
            {offcuts.length > 0 && <span className="header-chip-badge">{offcuts.length}</span>}
          </button>

          {/* Circle buttons */}
          <a href="/CutWood_Guia_Completa.pdf" target="_blank" rel="noopener noreferrer" className="header-btn-circle" title="Guía de usuario">
            <BookOpen size={15} />
          </a>
          <button className="header-btn-circle theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        {toast && (
          <div className={`toast toast-${toast.type || 'success'}`}>
            {toast.message}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Sidebar */}
        <Sidebar
          projectName={projectName}
          onProjectNameChange={setProjectName}
          pieces={pieces}
          onPiecesChange={setPieces}
          stock={stock}
          onStockChange={setStock}
          options={options}
          onOptionsChange={setOptions}
          onLoadProject={handleLoadProject}
          onNewProject={handleNewProject}
          onCalculate={handleCalculate}
          isCalculating={isCalculating}
          showToast={showToast}
          style={{ width: `${sidebarWidth}%`, minWidth: `${sidebarWidth}%` }}
        />

        {/* Resize handle */}
        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          title="Arrastrar para redimensionar"
        />

        {/* Main canvas */}
        <main className="canvas-area">
          {result && result.boards.length > 0 ? (
            <>
              {/* Toolbar with sheet navigation */}
              <div className="canvas-toolbar">
                <div className="sheet-nav">
                  <button
                    className="sheet-nav-btn"
                    disabled={currentBoardIndex === 0}
                    onClick={() => setCurrentBoardIndex((i) => i - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="sheet-nav-label">
                    {currentBoard?.isOffcut
                      ? <><PackageIcon size={14} style={{display:'inline',verticalAlign:'text-bottom'}} /> {`Retazo — ${currentBoard.stockWidth}×${currentBoard.stockHeight}mm`}</>
                      : `Tablero ${currentBoardIndex + 1} de ${result.boards.length}`
                    }
                  </span>
                  <button
                    className="sheet-nav-btn"
                    disabled={currentBoardIndex === result.boards.length - 1}
                    onClick={() => setCurrentBoardIndex((i) => i + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {currentBoard?.pieces.length || 0} piezas
                    {currentBoard?.isOffcut
                      ? ` — Origen: ${currentBoard.offcutSource || 'Retazo'}`
                      : ` en este tablero`
                    }
                  </span>
                </div>
              </div>

              <div className="canvas-content">
                {/* Diagram */}
                <div className="diagram-container">
                  <CutDiagram
                    board={currentBoard}
                    allPieceIds={allPieceIds}
                    hoveredCut={hoveredCut}
                  />
                </div>

                {/* Right panel: stats fixed + sequence scrolls */}
                <div className="right-panel">
                  <div className="right-panel-fixed">
                    <StatsPanel
                      stats={result.stats}
                      currentBoard={currentBoard}
                      pieces={pieces}
                      stock={stock}
                    />
                  </div>
                  <div className="right-panel-scroll">
                    <CutSequence
                      cutSequence={currentBoard?.cutSequence || []}
                      hoveredCut={hoveredCut}
                      onHoverCut={setHoveredCut}
                    />

                    {/* Unfitted pieces */}
                    {result.unfitted.length > 0 && (
                      <div className="unfitted-warning">
                        <div className="unfitted-title">
                          <AlertTriangle size={15} style={{display:'inline',verticalAlign:'text-bottom'}} /> Piezas que no entraron
                        </div>
                        <ul className="unfitted-list">
                          {result.unfitted.map((p, i) => (
                            <li key={i} className="unfitted-item">
                              {p.name || `Pieza ${p.id}`} — {p.width}×{p.height} mm
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-grid"></div>
              <div className="empty-state-icon"><Layers size={64} strokeWidth={1} /></div>
              <div className="empty-state-title">
                Optimizá tus cortes de melamina
              </div>
              <div className="empty-state-text">
                Cargá las piezas de tu mueble en el panel izquierdo, configurá el tablero y
                hacé clic en <strong>Optimizar Cortes</strong> para ver el resultado.
              </div>
              <div className="empty-state-arrow">
                ← Empezá por el panel izquierdo
              </div>
            </div>
          )}
        </main>
      </div>

      {showConfirm && (
        <ConfirmModal
          variant={confirmType === 'reoptimize' ? 'warning' : undefined}
          icon={confirmType === 'reoptimize' ? <AlertTriangle size={28} /> : <PackageIcon size={28} />}
          title={confirmType === 'reoptimize' ? '¿Re-optimizar?' : 'Optimizar con retazos'}
          message={confirmType === 'reoptimize'
            ? 'Ya tenés una optimización activa. Si re-optimizás se reemplazará el resultado actual y se generarán nuevos retazos.'
            : `Vas a optimizar usando ${offcuts.filter(o => o.selected).length} retazo(s) seleccionado(s). Los retazos usados se eliminarán y se guardarán los nuevos sobrantes.`
          }
          detail={confirmType === 'reoptimize'
            ? `${pendingOptimize?.length || 0} pieza(s) · Tablero ${stock.width}×${stock.height}mm · Kerf ${options.kerf || 0}mm`
            : null
          }
          confirmText={confirmType === 'reoptimize' ? 'Re-optimizar' : 'Optimizar'}
          confirmIcon={<Rocket size={15} />}
          cancelText="Cancelar"
          onConfirm={() => {
            setShowConfirm(false);
            setConfirmType(null);
            if (pendingOptimize) doOptimize(pendingOptimize);
            setPendingOptimize(null);
          }}
          onCancel={() => {
            setShowConfirm(false);
            setConfirmType(null);
            setPendingOptimize(null);
          }}
        />
      )}

      {showRetazosModal && (
        <RetazosModal
          offcuts={offcuts}
          onClose={() => setShowRetazosModal(false)}
          onUpdate={(id, data) => setOffcuts(updateOffcut(id, data))}
          onRemove={(id) => setOffcuts(removeOffcut(id))}
          onClear={() => setOffcuts(clearOffcuts())}
          onToggleSelect={(id) => setOffcuts(toggleOffcutSelection(id))}
          onAdd={(data) => setOffcuts(addManualOffcut(data))}
        />
      )}
    </div>
  );
}
