import { useState } from 'react';
import { Package, ChevronDown } from 'lucide-react';

export default function OffcutsPanel({ offcuts, useOffcuts, onToggleUse, onRemove, onClear }) {
  const [isOpen, setIsOpen] = useState(false);

  const totalArea = offcuts.reduce((sum, o) => sum + (o.area || (o.width * o.height) / 1000000), 0);

  return (
    <div className="section-card fade-in">
      <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="section-header-left">
          <span className="section-icon"><Package size={16} /></span>
          <span className="section-title">Retazos</span>
          {offcuts.length > 0 && (
            <span className="section-badge">{offcuts.length}</span>
          )}
        </div>
        <span className={`section-toggle ${isOpen ? 'open' : ''}`}><ChevronDown size={14} /></span>
      </div>

      {isOpen && (
        <div className="section-body">
          {/* Toggle */}
          <div className="offcut-toggle-row">
            <label className="offcut-toggle-label">
              <input
                type="checkbox"
                checked={useOffcuts}
                onChange={onToggleUse}
              />
              <span>Usar retazos al optimizar</span>
            </label>
            {offcuts.length > 0 && (
              <span className="offcut-area-badge">
                {totalArea.toFixed(2)} m²
              </span>
            )}
          </div>

          {offcuts.length === 0 ? (
            <div className="offcut-empty">
              Sin retazos guardados. Optimizá un mueble y los retazos útiles se guardan automáticamente.
            </div>
          ) : (
            <>
              <div className="offcut-list">
                {offcuts.map((o) => (
                  <div key={o.id} className="offcut-item">
                    <div className="offcut-dims">
                      <strong>{o.width}×{o.height}</strong>
                      <span className="offcut-thickness">{o.thickness || 18}mm</span>
                    </div>
                    <div className="offcut-source">{o.source || 'Manual'}</div>
                    <button
                      className="offcut-remove-btn"
                      onClick={() => onRemove(o.id)}
                      title="Descartar retazo"
                    >✕</button>
                  </div>
                ))}
              </div>
              <button className="offcut-clear-btn" onClick={onClear}>
                🗑️ Limpiar todos
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
