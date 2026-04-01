import { useState, useMemo } from 'react';
import { Settings, ArrowLeftRight, ArrowUpDown, Square, ChevronDown } from 'lucide-react';

const PRESETS = [
  { name: 'Estándar 2750×1830', width: 2750, height: 1830 },
  { name: 'Estándar 2600×1830', width: 2600, height: 1830 },
  { name: 'Melamina 2440×1830', width: 2440, height: 1830 },
  { name: 'Melamina 2440×1220', width: 2440, height: 1220 },
  { name: 'Compact 1830×1830', width: 1830, height: 1830 },
];

export default function StockConfig({
  stock, options,
  onStockChange, onOptionsChange,
  saveNewOffcuts, onSaveNewOffcutsChange,
  consumeUsedOffcuts, onConsumeUsedOffcutsChange,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('tablero');

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

  // Dot indicators — "Más" if has pricing or material data
  const hasMasData = !!(stock.pricePerBoard || stock.pricePerMeterEdge || stock.brand || stock.color || stock.material);

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
        <div className="section-body stock-tabbed">

          {/* ── Tab Bar ── */}
          <div className="stock-tab-bar">
            <button
              className={`stock-tab-btn${activeTab === 'tablero' ? ' active' : ''}`}
              onClick={() => setActiveTab('tablero')}
            >Tablero</button>
            <button
              className={`stock-tab-btn${activeTab === 'corte' ? ' active' : ''}`}
              onClick={() => setActiveTab('corte')}
            >Corte</button>
            <button
              className={`stock-tab-btn${activeTab === 'retazos' ? ' active' : ''} has-dot`}
              onClick={() => setActiveTab('retazos')}
            >Retazos</button>
            <button
              className={`stock-tab-btn${activeTab === 'mas' ? ' active' : ''}${hasMasData ? ' has-dot' : ''}`}
              onClick={() => setActiveTab('mas')}
            >Más</button>
          </div>

          {/* ── Tab Content ── */}
          <div className="stock-tab-content" key={activeTab}>

            {/* TAB 1: TABLERO */}
            {activeTab === 'tablero' && (
              <>
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

                <div className="stock-grain-section">
                  <label className="stock-grain-label">Veta del tablero</label>
                  <div className="grain-toggle-group">
                    <button
                      className={`grain-toggle-btn ${(stock.grain || 'none') === 'none' ? 'active' : ''}`}
                      onClick={() => onStockChange({ ...stock, grain: 'none' })}
                      title="Sin veta — las piezas rotan libremente"
                    >
                      <Square size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Sin veta
                    </button>
                    <button
                      className={`grain-toggle-btn ${stock.grain === 'horizontal' ? 'active' : ''}`}
                      onClick={() => onStockChange({ ...stock, grain: 'horizontal' })}
                      title="Veta horizontal — fibras van de izquierda a derecha"
                    >
                      <ArrowLeftRight size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Horizontal
                    </button>
                    <button
                      className={`grain-toggle-btn ${stock.grain === 'vertical' ? 'active' : ''}`}
                      onClick={() => onStockChange({ ...stock, grain: 'vertical' })}
                      title="Veta vertical — fibras van de arriba a abajo"
                    >
                      <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Vertical
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: CORTE */}
            {activeTab === 'corte' && (
              <>
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
              </>
            )}

            {/* TAB 3: RETAZOS */}
            {activeTab === 'retazos' && (
              <div className="offcut-toggles">
                <div className="offcut-toggle-row">
                  <div className="offcut-toggle-label">
                    <span>Guardar retazos</span>
                  </div>
                  <button
                    className={`toggle-switch ${saveNewOffcuts ? 'toggle-on' : ''}`}
                    onClick={() => onSaveNewOffcutsChange(!saveNewOffcuts)}
                    title={saveNewOffcuts ? 'Los retazos generados se guardan automáticamente' : 'Los retazos NO se guardarán'}
                    role="switch"
                    aria-checked={saveNewOffcuts}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
                <div className="offcut-toggle-row">
                  <div className="offcut-toggle-label">
                    <span>Consumir retazos usados</span>
                  </div>
                  <button
                    className={`toggle-switch ${consumeUsedOffcuts ? 'toggle-on' : ''}`}
                    onClick={() => onConsumeUsedOffcutsChange(!consumeUsedOffcuts)}
                    title={consumeUsedOffcuts ? 'Los retazos seleccionados se eliminan al usarlos' : 'Los retazos NO se eliminarán al usarlos'}
                    role="switch"
                    aria-checked={consumeUsedOffcuts}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: MÁS */}
            {activeTab === 'mas' && (
              <>
                <div className="stock-grid">
                  <div className="stock-field">
                    <label>Precio/tablero</label>
                    <div className="stock-input-wrap">
                      <input type="number" min="0" step="100"
                        value={stock.pricePerBoard || ''} placeholder="0"
                        onChange={(e) => updateStock('pricePerBoard', e.target.value)} />
                      <span className="stock-unit">$</span>
                    </div>
                  </div>
                  <div className="stock-field">
                    <label>Tapacanto/m</label>
                    <div className="stock-input-wrap">
                      <input type="number" min="0" step="10"
                        value={stock.pricePerMeterEdge || ''} placeholder="0"
                        onChange={(e) => updateStock('pricePerMeterEdge', e.target.value)} />
                      <span className="stock-unit">$/m</span>
                    </div>
                  </div>
                </div>

                <div className="material-divider">
                  <span>Identificación del material</span>
                </div>

                <div className="material-grid">
                  <div className="material-field">
                    <label>Marca</label>
                    <input type="text" className="material-input"
                      placeholder="Egger, Masisa..."
                      value={stock.brand || ''}
                      onChange={(e) => updateStock('brand', e.target.value)} />
                  </div>
                  <div className="material-field">
                    <label>Color</label>
                    <input type="text" className="material-input"
                      placeholder="Blanco Ártico..."
                      value={stock.color || ''}
                      onChange={(e) => updateStock('color', e.target.value)} />
                  </div>
                  <div className="material-field">
                    <label>Material</label>
                    <input type="text" className="material-input"
                      placeholder="Melamina, MDF..."
                      value={stock.material || ''}
                      onChange={(e) => updateStock('material', e.target.value)} />
                  </div>
                </div>

                {(stock.brand || stock.color || stock.material) && (
                  <div className="material-preview">
                    {[stock.brand, stock.color, stock.material].filter(Boolean).join(' · ')}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
