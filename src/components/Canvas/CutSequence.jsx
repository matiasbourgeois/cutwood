import { ListOrdered, ArrowLeftRight, ArrowUpDown, Minus, GripVertical } from 'lucide-react';

const LEVEL_CONFIG = {
  1: { label: 'E1', className: 'level-e1', title: 'Corte primario' },
  2: { label: 'E2', className: 'level-e2', title: 'Corte secundario' },
  3: { label: 'REC', className: 'level-rec', title: 'Recorte / Trim' },
  4: { label: 'RET', className: 'level-ret', title: 'Separar retazo' },
};

export default function CutSequence({ cutSequence, hoveredCut, onHoverCut }) {
  if (!cutSequence || cutSequence.length === 0) {
    return (
      <div className="cut-sequence-container">
        <div className="cut-sequence-header">
          <div className="section-header-left">
            <span className="section-icon"><ListOrdered size={16} /></span>
            <span className="section-title">Secuencia de Cortes</span>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
          Sin cortes para mostrar
        </div>
      </div>
    );
  }

  return (
    <div className="cut-sequence-container">
      <div className="cut-sequence-header">
        <div className="section-header-left">
          <span className="section-icon"><ListOrdered size={16} /></span>
          <span className="section-title">Secuencia de Cortes</span>
          <span className="section-badge">{cutSequence.length}</span>
        </div>
      </div>
      <div className="cut-sequence-scroll">
        <div className="cut-timeline">
          {cutSequence.map((cut, idx) => {
            const isActive = hoveredCut?.number === cut.number;
            const isLast = idx === cutSequence.length - 1;
            const levelConfig = LEVEL_CONFIG[cut.level] || null;

            return (
              <div
                key={cut.number}
                className={`cut-step-v2 ${isActive ? 'cut-step-v2-active' : ''}`}
                onMouseEnter={() => onHoverCut?.(cut)}
                onMouseLeave={() => onHoverCut?.(null)}
              >
                {/* Timeline connector */}
                <div className="cut-step-timeline">
                  <div className={`cut-step-dot ${isActive ? 'cut-step-dot-active' : ''}`}>
                    {cut.number}
                  </div>
                  {!isLast && <div className="cut-step-line" />}
                </div>

                {/* Content */}
                <div className="cut-step-content">
                  <div className="cut-step-top">
                    <span className="cut-step-type-v2">
                      {cut.type === 'horizontal'
                        ? <><ArrowLeftRight size={12} /> Horizontal</>
                        : <><ArrowUpDown size={12} /> Vertical</>
                      }
                    </span>
                    {cut.description?.includes('surplus') && (
                      <span className="cut-level-badge level-ret" title="Separa un retazo reutilizable">
                        RET
                      </span>
                    )}
                  </div>
                  <div className="cut-step-detail-v2">
                    A {cut.position}mm desde {cut.type === 'horizontal' ? 'arriba' : 'izquierda'}
                    {cut.kerf > 0 && <span className="cut-step-kerf"> · kerf {cut.kerf}mm</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
