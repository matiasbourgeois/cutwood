import { useState, useMemo } from 'react';
import { FolderOpen, Search, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 6;

export default function HistoryModal({ projects, onLoad, onDelete, onClose }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.pieces?.some((pc) => pc.name?.toLowerCase().includes(q))
    );
  }, [projects, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + '  ' + d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <span className="modal-icon"><FolderOpen size={20} /></span>
            <h2 className="modal-title">Historial de Muebles</h2>
            <span className="modal-badge">{projects.length}</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Search */}
        <div className="modal-search-row">
          <div className="modal-search-wrap">
            <span className="modal-search-icon"><Search size={14} /></span>
            <input
              type="text"
              className="modal-search-input"
              placeholder="Buscar mueble por nombre..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              autoFocus
            />
            {search && (
              <button className="modal-search-clear" onClick={() => setSearch('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <span className="modal-search-count">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="modal-body">
          {paginated.length > 0 ? (
            <div className="history-table">
              <div className="history-table-header">
                <span className="htc-name">Nombre</span>
                <span className="htc-pieces">Piezas</span>
                <span className="htc-board">Tablero</span>
                <span className="htc-date">Fecha</span>
                <span className="htc-actions"></span>
              </div>
              {paginated.map((p) => (
                <div
                  key={p.id}
                  className="history-table-row"
                  onClick={() => onLoad(p)}
                >
                  <span className="htc-name">{p.name || 'Sin nombre'}</span>
                  <span className="htc-pieces">
                    <span className="htc-pill">{p.pieces?.length || 0}</span>
                  </span>
                  <span className="htc-board">
                    {p.stock ? `${p.stock.width}x${p.stock.height}` : '-'}
                  </span>
                  <span className="htc-date">{formatDate(p.updatedAt || p.createdAt)}</span>
                  <span className="htc-actions">
                    <button
                      className="history-load-btn"
                      onClick={(e) => { e.stopPropagation(); onLoad(p); }}
                      title="Cargar"
                    >
                      Cargar
                    </button>
                    <button
                      className="history-delete-btn"
                      onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="history-empty">
              <div className="history-empty-icon"><FolderOpen size={36} strokeWidth={1} /></div>
              <div className="history-empty-text">
                {search ? 'No se encontraron muebles' : 'No hay muebles guardados todavia'}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="modal-pagination">
            <button
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
