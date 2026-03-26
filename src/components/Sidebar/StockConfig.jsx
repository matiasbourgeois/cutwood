import { useState, useMemo } from 'react';
import { Settings, TreePine, DollarSign, ArrowLeftRight, ArrowUpDown, Square, ChevronDown } from 'lucide-react';

const PRESETS = [
  { name: 'Estándar 2750×1830', width: 2750, height: 1830 },
  { name: 'Estándar 2600×1830', width: 2600, height: 1830 },
  { name: 'Melamina 2440×1830', width: 2440, height: 1830 },
  { name: 'Melamina 2440×1220', width: 2440, height: 1220 },
  { name: 'Compact 1830×1830', width: 1830, height: 1830 },
];

export default function StockConfig({ stock, options, onStockChange, onOptionsChange }) {
  const [isOpen, setIsOpen] = useState(true);

  // Derive the select value from actual stock dimensions
  const selectedPreset = useMemo(() => {
    const idx = PRESETS.findIndex(p => p.width === stock.width && p.height === stock.height);
    return idx >= 0 ? String(idx) : 'custom';
  }, [stock.width, stock.height]);

  const updateStock = (field, value) => {
    if (['width', 'height', 'thickness', 'quantity'].includes(field)) {
      value = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    }
    if (field === 'pricePerBoard' || field === 'pricePerMeterEdge') {
      value = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    }
    onStockChange({ ...stock, [field]: value });
  };

  const updateOption = (field, value) => {
    if (field === 'kerf' || field === 'edgeTrim') {
      value = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    }
    onOptionsChange({ ...options, [field]: value });
  };

  const applyPreset = (preset) => {
    onStockChange({ ...stock, width: preset.width, height: preset.height });
  };

  return (
    <div className="section-card fade-in">
      <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="section-header-left">
          <span className="section-icon"><Settings size={16} /></span>
          <span className="section-title">Tablero & Opciones</span>
        </div>
        <span className={`section-toggle ${isOpen ? 'open' : ''}`}><ChevronDown size={14} /></span>
      </div>

      {isOpen && (
        <div className="section-body">
          {/* Preset selector */}
          <div className="stock-preset">
            <select
              className="stock-select"
              value={selectedPreset}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') return;
                const preset = PRESETS[Number(val)];
                if (preset) applyPreset(preset);
              }}
            >
              {PRESETS.map((p, i) => (
                <option key={i} value={String(i)}>{p.name}</option>
              ))}
              <option value="custom">✏️ Personalizado</option>
            </select>
          </div>

          {/* Board dimensions */}
          <div className="stock-grid">
            <div className="stock-field">
              <label>Largo</label>
              <div className="stock-input-wrap">
                <input type="number" min="1" value={stock.width}
                  onChange={(e) => updateStock('width', e.target.value)} />
                <span className="stock-unit">mm</span>
              </div>
            </div>
            <div className="stock-field">
              <label>Ancho</label>
              <div className="stock-input-wrap">
                <input type="number" min="1" value={stock.height}
                  onChange={(e) => updateStock('height', e.target.value)} />
                <span className="stock-unit">mm</span>
              </div>
            </div>
            <div className="stock-field">
              <label>Espesor</label>
              <div className="stock-input-wrap">
                <input type="number" min="1" value={stock.thickness}
                  onChange={(e) => updateStock('thickness', e.target.value)} />
                <span className="stock-unit">mm</span>
              </div>
            </div>
            <div className="stock-field">
              <label>Cantidad</label>
              <div className="stock-input-wrap">
                <input type="number" min="1" value={stock.quantity}
                  onChange={(e) => updateStock('quantity', e.target.value)} />
                <span className="stock-unit">uds</span>
              </div>
            </div>
          </div>

          {/* Board grain direction */}
          <div className="stock-grain-section">
            <label className="stock-grain-label"><TreePine size={14} style={{display:'inline',verticalAlign:'text-bottom'}} /> Veta del tablero</label>
            <div className="grain-toggle-group">
              <button
                className={`grain-toggle-btn ${(stock.grain || 'none') === 'none' ? 'active' : ''}`}
                onClick={() => onStockChange({ ...stock, grain: 'none' })}
                title="Sin veta — las piezas rotan libremente"
              >
                <Square size={12} style={{display:'inline',verticalAlign:'text-bottom'}} /> Sin veta
              </button>
              <button
                className={`grain-toggle-btn ${stock.grain === 'horizontal' ? 'active' : ''}`}
                onClick={() => onStockChange({ ...stock, grain: 'horizontal' })}
                title="Veta horizontal — fibras van de izquierda a derecha"
              >
                <ArrowLeftRight size={12} style={{display:'inline',verticalAlign:'text-bottom'}} /> Horizontal
              </button>
              <button
                className={`grain-toggle-btn ${stock.grain === 'vertical' ? 'active' : ''}`}
                onClick={() => onStockChange({ ...stock, grain: 'vertical' })}
                title="Veta vertical — fibras van de arriba a abajo"
              >
                <ArrowUpDown size={12} style={{display:'inline',verticalAlign:'text-bottom'}} /> Vertical
              </button>
            </div>
          </div>

          <div className="stock-divider"></div>

          {/* Cut options */}
          <div className="stock-grid">
            <div className="stock-field">
              <label>Kerf (sierra)</label>
              <div className="stock-input-wrap">
                <input type="number" min="0" step="0.5" value={options.kerf}
                  onChange={(e) => updateOption('kerf', e.target.value)} />
                <span className="stock-unit">mm</span>
              </div>
            </div>
            <div className="stock-field">
              <label>Margen borde</label>
              <div className="stock-input-wrap">
                <input type="number" min="0" value={options.edgeTrim}
                  onChange={(e) => updateOption('edgeTrim', e.target.value)} />
                <span className="stock-unit">mm</span>
              </div>
            </div>
          </div>

          <div className="stock-divider"></div>

          {/* Pricing */}
          <div className="stock-grid">
            <div className="stock-field">
              <label><DollarSign size={12} style={{display:'inline',verticalAlign:'text-bottom'}} /> Precio/tablero</label>
              <div className="stock-input-wrap">
                <input type="number" min="0" step="100" value={stock.pricePerBoard || ''}
                  placeholder="0"
                  onChange={(e) => updateStock('pricePerBoard', e.target.value)} />
                <span className="stock-unit">$</span>
              </div>
            </div>
            <div className="stock-field">
              <label><DollarSign size={12} style={{display:'inline',verticalAlign:'text-bottom'}} /> Tapacanto/m</label>
              <div className="stock-input-wrap">
                <input type="number" min="0" step="10" value={stock.pricePerMeterEdge || ''}
                  placeholder="0"
                  onChange={(e) => updateStock('pricePerMeterEdge', e.target.value)} />
                <span className="stock-unit">$/m</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
