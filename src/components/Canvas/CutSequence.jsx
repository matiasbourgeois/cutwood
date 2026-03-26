import { ListOrdered, ArrowLeftRight, ArrowUpDown, Minus, GripVertical } from 'lucide-react';

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
          <span className="section-icon">🔢</span>
          <span className="section-title">Secuencia de Cortes</span>
          <span className="section-badge">{cutSequence.length}</span>
        </div>
      </div>
      <div className="cut-sequence-scroll">
        {cutSequence.map((cut) => {
          const isActive = hoveredCut?.number === cut.number;
          return (
            <div
              key={cut.number}
              className={`cut-step ${isActive ? 'cut-step-active' : ''}`}
              onMouseEnter={() => onHoverCut?.(cut)}
              onMouseLeave={() => onHoverCut?.(null)}
            >
              <div className={`cut-step-number ${isActive ? 'cut-step-number-active' : ''}`}>
                {cut.number}
              </div>
              <div className="cut-step-info">
                <div className="cut-step-type">
                  {cut.type === 'horizontal' ? <><ArrowLeftRight size={13} style={{display:'inline',verticalAlign:'text-bottom'}} /> Horizontal</> : <><ArrowUpDown size={13} style={{display:'inline',verticalAlign:'text-bottom'}} /> Vertical</>}
                </div>
                <div className="cut-step-detail">
                  A {cut.position} mm desde {cut.type === 'horizontal' ? 'arriba' : 'la izquierda'}
                  {cut.kerf > 0 && ` (kerf: ${cut.kerf}mm)`}
                </div>
              </div>
              <div className="cut-step-icon">
                {cut.type === 'horizontal' ? <Minus size={16} /> : <GripVertical size={16} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
