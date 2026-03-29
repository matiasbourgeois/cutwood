import { useState, useEffect, useRef, useCallback } from 'react';
import { Ruler, Clipboard, Copy, Trash2, GripVertical, Columns, Rows, ChevronDown } from 'lucide-react';

export default function PiecesList({ pieces, onChange, showToast, grow }) {
  const [isOpen, setIsOpen] = useState(true);
  const [edgeBandingPiece, setEdgeBandingPiece] = useState(null);

  // ── Refs for scroll + focus management ──
  const listRef      = useRef(null);
  const justAddedRef = useRef(false);

  // Auto-scroll to bottom + focus CANT of newly added row
  useEffect(() => {
    if (!justAddedRef.current) return;
    justAddedRef.current = false;
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    const rows = list.querySelectorAll('[data-piece-index]');
    const last = rows[rows.length - 1];
    if (last) {
      const inputs = last.querySelectorAll('input');
      if (inputs[0]) { inputs[0].focus(); inputs[0].select(); }
    }
  }, [pieces.length]);

  // ── Arrow-key navigation between cells ──
  // Columns: 0=qty, 1=largo, 2=ancho, 3=name
  const handleKeyDown = useCallback((e, rowIndex, colIndex) => {
    const TOTAL_COLS = 4;
    let targetRow = rowIndex;
    let targetCol = colIndex;
    let shouldNavigate = false;

    switch (e.key) {
      case 'ArrowDown':
      case 'Enter':
        if (rowIndex < pieces.length - 1) {
          targetRow = rowIndex + 1;
          shouldNavigate = true;
        }
        break;
      case 'ArrowUp':
        if (rowIndex > 0) {
          targetRow = rowIndex - 1;
          shouldNavigate = true;
        }
        break;
      case 'ArrowRight':
        // Number inputs: always navigate. Text input: only at end of string
        if (colIndex < 3 || e.target.selectionStart === e.target.value.length) {
          if (colIndex < TOTAL_COLS - 1) {
            targetCol = colIndex + 1;
            shouldNavigate = true;
          }
        }
        break;
      case 'ArrowLeft':
        // Number inputs: always navigate. Text input: only at start of string
        if (colIndex < 3 || e.target.selectionStart === 0) {
          if (colIndex > 0) {
            targetCol = colIndex - 1;
            shouldNavigate = true;
          }
        }
        break;
      default:
        return;
    }

    if (!shouldNavigate) return;
    e.preventDefault();

    const list = listRef.current;
    if (!list) return;
    const allRows = list.querySelectorAll('[data-piece-index]');
    const targetRowEl = allRows[targetRow];
    if (!targetRowEl) return;
    const inputs = targetRowEl.querySelectorAll('input');
    if (inputs[targetCol]) {
      inputs[targetCol].focus();
      inputs[targetCol].select();
    }
  }, [pieces.length]);

  // ── Clipboard Paste Handler (Ctrl+V from Excel/Sheets) ──
  useEffect(() => {
    const handlePaste = (e) => {
      const text = e.clipboardData?.getData('text/plain');
      if (!text || !text.includes('\t')) return;

      e.preventDefault();
      e.stopPropagation();

      const rows = text.trim().split('\n').map(r =>
        r.split('\t').map(c => c.trim()).filter(c => c !== '')
      );
      if (rows.length === 0) return;

      let startIdx = 0;
      const headerKeywords = ['nombre', 'largo', 'ancho', 'cant', 'width', 'height', 'name', 'qty', 'obs'];
      if (rows[0].some(c => headerKeywords.includes(c.toLowerCase()))) {
        startIdx = 1;
      }

      const newPieces = [];
      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length < 3) continue;

        const quantity = parseInt(cols[0]) || 1;
        const width    = parseInt(cols[1]);
        const height   = parseInt(cols[2]);
        const name     = cols[3] || `Pieza ${newPieces.length + 1}`;

        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) continue;

        newPieces.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          name, width, height, quantity,
          grain: 'none',
          edgeBanding: { top: false, bottom: false, left: false, right: false },
        });
      }

      if (newPieces.length > 0) {
        const active = document.activeElement;
        const rowEl = active?.closest?.('[data-piece-index]');
        const focusedIndex = rowEl ? parseInt(rowEl.dataset.pieceIndex) : 0;

        const updated = focusedIndex === 0
          ? newPieces
          : [...pieces.slice(0, focusedIndex), ...newPieces];

        onChange(updated);
        if (document.activeElement) document.activeElement.blur();
        if (showToast) showToast(`✅ ${newPieces.length} pieza(s) pegadas ${focusedIndex > 0 ? `desde fila ${focusedIndex + 1}` : '(reemplazando todo)'}`);
      } else if (showToast) {
        showToast('⚠️ No se encontraron piezas válidas en el portapapeles', 'error');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pieces, onChange, showToast]);

  const updatePiece = (index, field, value) => {
    const updated = [...pieces];
    if (field === 'width' || field === 'height' || field === 'quantity') {
      value = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    }
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const toggleGrain = (index) => {
    const updated = [...pieces];
    const current = updated[index].grain || 'none';
    const next = current === 'none' ? 'vertical' : current === 'vertical' ? 'horizontal' : 'none';
    updated[index] = { ...updated[index], grain: next };
    onChange(updated);
  };

  const toggleEdge = (index, edge) => {
    const updated = [...pieces];
    const edges = updated[index].edgeBanding || { top: false, bottom: false, left: false, right: false };
    updated[index] = {
      ...updated[index],
      edgeBanding: { ...edges, [edge]: !edges[edge] },
    };
    onChange(updated);
  };

  const addPiece = () => {
    justAddedRef.current = true;
    onChange([
      ...pieces,
      {
        id: Date.now().toString(36),
        name: '',
        width: '',
        height: '',
        quantity: 1,
        grain: 'none',
        edgeBanding: { top: false, bottom: false, left: false, right: false },
      },
    ]);
  };

  const removePiece = (index) => {
    onChange(pieces.filter((_, i) => i !== index));
  };

  const duplicatePiece = (index) => {
    const piece = { ...pieces[index], id: Date.now().toString(36) };
    if (piece.edgeBanding) piece.edgeBanding = { ...piece.edgeBanding };
    const updated = [...pieces];
    updated.splice(index + 1, 0, piece);
    onChange(updated);
  };

  const getGrainIcon = (grain) => {
    if (grain === 'vertical')   return <Columns size={16} />;
    if (grain === 'horizontal') return <Rows size={16} />;
    return <GripVertical size={16} />;
  };

  const getGrainTitle = (grain) => {
    if (grain === 'vertical')   return 'Veta vertical ↕ — fibras de arriba a abajo';
    if (grain === 'horizontal') return 'Veta horizontal ↔ — fibras de lado a lado';
    return 'Sin veta — puede rotar libremente';
  };

  const getEdgeCount = (piece) => {
    const eb = piece.edgeBanding;
    if (!eb) return 0;
    return [eb.top, eb.bottom, eb.left, eb.right].filter(Boolean).length;
  };

  return (
    <div className={`section-card fade-in${grow ? ' section-card-grow' : ''}`}>
      <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="section-header-left">
          <span className="section-icon"><Ruler size={16} /></span>
          <span className="section-title">Piezas de Corte</span>
          <span className="section-badge">{pieces.length}</span>
          <span
            className="paste-hint"
            title="Copiá celdas de Excel/Sheets y pegá con Ctrl+V"
          >
            <Clipboard size={10} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Ctrl+V
          </span>
        </div>
        <span className={`section-toggle ${isOpen ? 'open' : ''}`}><ChevronDown size={16} /></span>
      </div>

      {isOpen && (
        <div className="section-body">
          {/* Column headers */}
          <div className="piece-header">
            <span className="piece-col-qty">Cant.</span>
            <span className="piece-col-num">Largo</span>
            <span className="piece-col-num">Ancho</span>
            <span className="piece-col-name">Nombre/Obs.</span>
            <span className="piece-col-actions"></span>
          </div>

          {/* Scrollable piece rows */}
          <div className="piece-list" ref={listRef}>
            {pieces.map((piece, i) => {
              const isInvalid = !piece.width || !piece.height || !piece.quantity || piece.quantity <= 0;
              return (
                <div key={piece.id || i} className="piece-row-wrapper" data-piece-index={i}>
                  <div className={`piece-row-inline ${isInvalid ? 'piece-row-invalid' : ''}`}>
                    <input
                      className="piece-col-qty"
                      type="number"
                      min="1"
                      value={piece.quantity}
                      onChange={(e) => updatePiece(i, 'quantity', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i, 0)}
                    />
                    <input
                      className="piece-col-num"
                      type="number"
                      placeholder="0"
                      min="1"
                      value={piece.width}
                      onChange={(e) => updatePiece(i, 'width', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i, 1)}
                    />
                    <input
                      className="piece-col-num"
                      type="number"
                      placeholder="0"
                      min="1"
                      value={piece.height}
                      onChange={(e) => updatePiece(i, 'height', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i, 2)}
                    />
                    <input
                      className="piece-col-name"
                      type="text"
                      placeholder="Nombre/Obs..."
                      value={piece.name}
                      onChange={(e) => updatePiece(i, 'name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i, 3)}
                    />
                    <div className="piece-col-actions">
                      <button
                        className={`piece-action-btn piece-grain-btn ${(piece.grain && piece.grain !== 'none') ? 'active' : ''}`}
                        onClick={() => toggleGrain(i)}
                        title={getGrainTitle(piece.grain || 'none')}
                      >
                        {getGrainIcon(piece.grain || 'none')}
                      </button>
                      <button
                        className={`piece-action-btn piece-edge-btn ${getEdgeCount(piece) > 0 ? 'active' : ''}`}
                        onClick={() => setEdgeBandingPiece(edgeBandingPiece === i ? null : i)}
                        title="Tapacanto"
                      >
                        {getEdgeCount(piece) > 0 ? getEdgeCount(piece) : '▬'}
                      </button>
                      <button
                        className="piece-action-btn"
                        onClick={() => duplicatePiece(i)}
                        title="Duplicar"
                      ><Copy size={16} /></button>
                      <button
                        className="piece-action-btn piece-action-delete"
                        onClick={() => removePiece(i)}
                        title="Eliminar"
                      ><Trash2 size={16} /></button>
                    </div>
                  </div>

                  {edgeBandingPiece === i && (
                    <div className="edge-banding-popup">
                      <div className="edge-banding-label">Tapacanto</div>
                      <div className="edge-banding-grid">
                        <button
                          className={`edge-btn edge-top ${piece.edgeBanding?.top ? 'active' : ''}`}
                          onClick={() => toggleEdge(i, 'top')}
                          title="Borde superior"
                        >↑ Sup</button>
                        <button
                          className={`edge-btn edge-bottom ${piece.edgeBanding?.bottom ? 'active' : ''}`}
                          onClick={() => toggleEdge(i, 'bottom')}
                          title="Borde inferior"
                        >↓ Inf</button>
                        <button
                          className={`edge-btn edge-left ${piece.edgeBanding?.left ? 'active' : ''}`}
                          onClick={() => toggleEdge(i, 'left')}
                          title="Borde izquierdo"
                        >← Izq</button>
                        <button
                          className={`edge-btn edge-right ${piece.edgeBanding?.right ? 'active' : ''}`}
                          onClick={() => toggleEdge(i, 'right')}
                          title="Borde derecho"
                        >→ Der</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="btn btn-sm add-piece-btn" onClick={addPiece}>
            + Agregar pieza
          </button>
        </div>
      )}
    </div>
  );
}
