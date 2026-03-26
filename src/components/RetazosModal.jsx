import { useState, useMemo } from 'react';
import { Package, Search, X, Pencil, Trash2, Check, Plus } from 'lucide-react';

export default function RetazosModal({ offcuts, onClose, onUpdate, onRemove, onClear, onToggleSelect, onAdd }) {
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterThickness, setFilterThickness] = useState('');
  const [filterGrain, setFilterGrain] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOffcut, setNewOffcut] = useState({
    name: '', width: '', height: '', thickness: 18, grain: 'none', brand: '', color: '', material: 'Melamina', notes: '',
  });

  // Unique values for filters
  const brands = useMemo(() => [...new Set(offcuts.map(o => o.brand).filter(Boolean))].sort(), [offcuts]);
  const colors = useMemo(() => [...new Set(offcuts.map(o => o.color).filter(Boolean))].sort(), [offcuts]);
  const thicknesses = useMemo(() => [...new Set(offcuts.map(o => o.thickness).filter(Boolean))].sort((a, b) => a - b), [offcuts]);

  // Filtered offcuts
  const filtered = useMemo(() => {
    return offcuts.filter(o => {
      if (filterBrand && o.brand !== filterBrand) return false;
      if (filterColor && o.color !== filterColor) return false;
      if (filterThickness && o.thickness !== Number(filterThickness)) return false;
      if (filterGrain && o.grain !== filterGrain) return false;
      if (search) {
        const s = search.toLowerCase();
        const searchable = `${o.name || ''} ${o.width}x${o.height} ${o.brand} ${o.color} ${o.material} ${o.notes} ${o.source} ${o.grain}`.toLowerCase();
        if (!searchable.includes(s)) return false;
      }
      return true;
    });
  }, [offcuts, search, filterBrand, filterColor, filterThickness, filterGrain]);

  const selectedCount = offcuts.filter(o => o.selected).length;
  const selectedArea = offcuts.filter(o => o.selected).reduce((s, o) => s + (o.area || 0), 0);

  const startEdit = (o) => {
    setEditingId(o.id);
    setEditData({ name: o.name || '', width: o.width, height: o.height, thickness: o.thickness, grain: o.grain || 'none', brand: o.brand, color: o.color, material: o.material, notes: o.notes });
  };

  const saveEdit = () => {
    onUpdate(editingId, {
      name: editData.name || '',
      width: parseInt(editData.width) || 0,
      height: parseInt(editData.height) || 0,
      thickness: parseInt(editData.thickness) || 18,
      grain: editData.grain || 'none',
      brand: editData.brand || '',
      color: editData.color || '',
      material: editData.material || '',
      notes: editData.notes || '',
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    const w = parseInt(newOffcut.width);
    const h = parseInt(newOffcut.height);
    if (!w || !h || w <= 0 || h <= 0) return;
    onAdd({
      name: newOffcut.name || '',
      width: w,
      height: h,
      thickness: parseInt(newOffcut.thickness) || 18,
      grain: newOffcut.grain || 'none',
      brand: newOffcut.brand,
      color: newOffcut.color,
      material: newOffcut.material,
      notes: newOffcut.notes,
    });
    setNewOffcut({ name: '', width: '', height: '', thickness: 18, grain: 'none', brand: '', color: '', material: 'Melamina', notes: '' });
    setShowAddForm(false);
  };

  const selectAll = () => {
    const allIds = filtered.map(o => o.id);
    const allSelected = filtered.every(o => o.selected);
    allIds.forEach(id => {
      const o = offcuts.find(x => x.id === id);
      if (o && o.selected === allSelected) onToggleSelect(id);
    });
  };

  return (
    <div className="retazos-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="retazos-modal">
        {/* Header */}
        <div className="retazos-modal-header">
          <div className="retazos-modal-title">
            <span><Package size={20} /></span>
            <h2>Inventario de Retazos</h2>
            <span className="retazos-count-badge">{offcuts.length}</span>
          </div>
          <button className="retazos-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Search & Filters */}
        <div className="retazos-filters">
          <div className="retazos-search-box">
            <span className="retazos-search-icon"><Search size={14} /></span>
            <input
              type="text"
              placeholder="Buscar por dimensión, marca, color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="retazos-search-input"
            />
          </div>
          <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="retazos-filter-select">
            <option value="">Todas las marcas</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)} className="retazos-filter-select">
            <option value="">Todos los colores</option>
            {colors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterThickness} onChange={(e) => setFilterThickness(e.target.value)} className="retazos-filter-select">
            <option value="">Todo espesor</option>
            {thicknesses.map(t => <option key={t} value={t}>{t}mm</option>)}
          </select>
          <select value={filterGrain} onChange={(e) => setFilterGrain(e.target.value)} className="retazos-filter-select">
            <option value="">Toda veta</option>
            <option value="none">Sin veta</option>
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </div>

        {/* Table */}
        <div className="retazos-table-container">
          {filtered.length === 0 ? (
            <div className="retazos-empty">
              {offcuts.length === 0
                ? 'Sin retazos guardados. Optimizá un mueble y los retazos útiles se guardan automáticamente.'
                : 'No se encontraron retazos con los filtros aplicados.'}
            </div>
          ) : (
            <table className="retazos-table">
              <thead>
                <tr>
                  <th className="retazos-th-check">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every(o => o.selected)}
                      onChange={selectAll}
                      title="Seleccionar/deseleccionar todos"
                    />
                  </th>
                  <th>Nombre</th>
                  <th>Dimensiones</th>
                  <th>Espesor</th>
                  <th>Veta</th>
                  <th>Marca</th>
                  <th>Color</th>
                  <th>Material</th>
                  <th>Origen / Notas</th>
                  <th>Área</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  editingId === o.id ? (
                    <tr key={o.id} className="retazos-row retazos-row-editing">
                      <td></td>
                      <td><input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="retazos-edit-input" placeholder="Nombre" /></td>
                      <td>
                        <div className="retazos-edit-dims">
                          <input type="number" value={editData.width} onChange={e => setEditData({...editData, width: e.target.value})} className="retazos-edit-input retazos-edit-sm" placeholder="Largo" />
                          <span>×</span>
                          <input type="number" value={editData.height} onChange={e => setEditData({...editData, height: e.target.value})} className="retazos-edit-input retazos-edit-sm" placeholder="Ancho" />
                        </div>
                      </td>
                      <td><input type="number" value={editData.thickness} onChange={e => setEditData({...editData, thickness: e.target.value})} className="retazos-edit-input retazos-edit-xs" /></td>
                      <td>
                        <select value={editData.grain || 'none'} onChange={e => setEditData({...editData, grain: e.target.value})} className="retazos-edit-input">
                          <option value="none">Sin veta</option>
                          <option value="horizontal">Horiz.</option>
                          <option value="vertical">Vert.</option>
                        </select>
                      </td>
                      <td><input type="text" value={editData.brand} onChange={e => setEditData({...editData, brand: e.target.value})} className="retazos-edit-input" placeholder="Marca" list="brands-list" /></td>
                      <td><input type="text" value={editData.color} onChange={e => setEditData({...editData, color: e.target.value})} className="retazos-edit-input" placeholder="Color" list="colors-list" /></td>
                      <td><input type="text" value={editData.material} onChange={e => setEditData({...editData, material: e.target.value})} className="retazos-edit-input" placeholder="Material" /></td>
                      <td><input type="text" value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} className="retazos-edit-input" placeholder="Notas" /></td>
                      <td></td>
                      <td>
                        <div className="retazos-row-actions">
                          <button className="retazos-action-btn retazos-save-btn" onClick={saveEdit} title="Guardar"><Check size={13} /></button>
                          <button className="retazos-action-btn" onClick={() => setEditingId(null)} title="Cancelar"><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={o.id} className={`retazos-row ${o.selected ? 'retazos-row-selected' : ''}`}>
                      <td className="retazos-td-check">
                        <input type="checkbox" checked={o.selected} onChange={() => onToggleSelect(o.id)} />
                      </td>
                      <td className="retazos-name-cell">{o.name || <span className="retazos-empty-field">—</span>}</td>
                      <td className="retazos-dims-cell">
                        <strong>{o.width}×{o.height}</strong> mm
                      </td>
                      <td>{o.thickness}mm</td>
                      <td className="retazos-grain-cell">{o.grain === 'horizontal' ? '↔ Horiz.' : o.grain === 'vertical' ? '↕ Vert.' : '—'}</td>
                      <td>{o.brand || <span className="retazos-empty-field">—</span>}</td>
                      <td>{o.color || <span className="retazos-empty-field">—</span>}</td>
                      <td className="retazos-material-cell">{o.material || <span className="retazos-empty-field">—</span>}</td>
                      <td className="retazos-notes-cell">{o.notes || o.source || <span className="retazos-empty-field">—</span>}</td>
                      <td className="retazos-area-cell">{o.area?.toFixed(3)} m²</td>
                      <td>
                        <div className="retazos-row-actions">
                          <button className="retazos-action-btn" onClick={() => startEdit(o)} title="Editar"><Pencil size={13} /></button>
                          <button className="retazos-action-btn retazos-delete-btn" onClick={() => onRemove(o.id)} title="Eliminar"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Datalists for autocomplete */}
        <datalist id="brands-list">{brands.map(b => <option key={b} value={b} />)}</datalist>
        <datalist id="colors-list">{colors.map(c => <option key={c} value={c} />)}</datalist>

        {/* Add form */}
        {showAddForm && (
          <div className="retazos-add-form">
            <div className="retazos-add-title">Agregar retazo manual</div>
            <div className="retazos-add-fields">
              <input type="text" placeholder="Nombre" value={newOffcut.name} onChange={e => setNewOffcut({...newOffcut, name: e.target.value})} className="retazos-edit-input" />
              <input type="number" placeholder="Largo (mm)" value={newOffcut.width} onChange={e => setNewOffcut({...newOffcut, width: e.target.value})} className="retazos-edit-input retazos-edit-sm" />
              <input type="number" placeholder="Ancho (mm)" value={newOffcut.height} onChange={e => setNewOffcut({...newOffcut, height: e.target.value})} className="retazos-edit-input retazos-edit-sm" />
              <input type="number" placeholder="Espesor" value={newOffcut.thickness} onChange={e => setNewOffcut({...newOffcut, thickness: e.target.value})} className="retazos-edit-input retazos-edit-xs" />
              <select value={newOffcut.grain} onChange={e => setNewOffcut({...newOffcut, grain: e.target.value})} className="retazos-edit-input" style={{maxWidth: '90px'}}>
                <option value="none">Sin veta</option>
                <option value="horizontal">Horiz.</option>
                <option value="vertical">Vert.</option>
              </select>
              <input type="text" placeholder="Marca" value={newOffcut.brand} onChange={e => setNewOffcut({...newOffcut, brand: e.target.value})} className="retazos-edit-input" list="brands-list" />
              <input type="text" placeholder="Color" value={newOffcut.color} onChange={e => setNewOffcut({...newOffcut, color: e.target.value})} className="retazos-edit-input" list="colors-list" />
              <input type="text" placeholder="Notas" value={newOffcut.notes} onChange={e => setNewOffcut({...newOffcut, notes: e.target.value})} className="retazos-edit-input" />
              <button className="retazos-add-confirm" onClick={handleAdd}><Check size={13} /> Agregar</button>
              <button className="retazos-add-cancel" onClick={() => setShowAddForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="retazos-modal-footer">
          <div className="retazos-footer-left">
            <button className="retazos-footer-btn retazos-add-btn" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={14} /> Agregar Manual
            </button>
            {offcuts.length > 0 && (
              <button className="retazos-footer-btn retazos-clear-btn" onClick={onClear}>
                <Trash2 size={13} /> Limpiar todos
              </button>
            )}
          </div>
          <div className="retazos-footer-right">
            {selectedCount > 0 && (
              <span className="retazos-selected-info">
                {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''} ({selectedArea.toFixed(2)} m²)
              </span>
            )}
            <button className="retazos-footer-btn" onClick={onClose}>Cerrar</button>
            <button className="retazos-footer-btn retazos-use-btn" onClick={onClose} disabled={selectedCount === 0}>
              <Package size={14} /> Usar {selectedCount} retazo{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
