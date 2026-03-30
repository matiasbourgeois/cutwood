import { useRef } from 'react';
import ProjectManager from './ProjectManager';
import PiecesList from './PiecesList';
import StockConfig from './StockConfig';
import { Scissors, Loader2, Zap, Brain } from 'lucide-react';

export default function Sidebar({
  projectName,
  onProjectNameChange,
  pieces,
  onPiecesChange,
  stock,
  onStockChange,
  options,
  onOptionsChange,
  onLoadProject,
  onNewProject,
  onCalculate,
  isCalculating,
  showToast,
  saveNewOffcuts,
  onSaveNewOffcutsChange,
  consumeUsedOffcuts,
  onConsumeUsedOffcutsChange,
  // Deep mode props
  deepMode,
  onDeepModeChange,
  style,
}) {
  const projectRef = useRef(null);

  return (
    <aside className="sidebar" style={style}>
      <div className="sidebar-scroll">
        {/* 1. Project name + save/new/history — inline bar at top */}
        <ProjectManager
          ref={projectRef}
          projectName={projectName}
          onNameChange={onProjectNameChange}
          pieces={pieces}
          stock={stock}
          options={options}
          onLoadProject={onLoadProject}
          onNewProject={onNewProject}
        />

        {/* 2. Board config — FIRST (natural workflow) */}
        <StockConfig
          stock={stock}
          onStockChange={onStockChange}
          options={options}
          onOptionsChange={onOptionsChange}
          saveNewOffcuts={saveNewOffcuts}
          onSaveNewOffcutsChange={onSaveNewOffcutsChange}
          consumeUsedOffcuts={consumeUsedOffcuts}
          onConsumeUsedOffcutsChange={onConsumeUsedOffcutsChange}
        />

        {/* 3. Pieces list — SECOND, flex-grows to fill remaining space */}
        <PiecesList
          pieces={pieces}
          onChange={onPiecesChange}
          showToast={showToast}
          grow
        />
      </div>

      {/* Sticky bottom: Mode toggle + Optimize button */}
      <div className="sidebar-bottom">

        {/* Fast / Deep toggle */}
        <div className="optimizer-mode-toggle">
          <button
            className={`mode-btn ${!deepMode ? 'mode-btn--active' : ''}`}
            onClick={() => onDeepModeChange(false)}
            title="Rápido: resultado instantáneo con 126 variantes"
            disabled={isCalculating}
          >
            <Zap size={13} />
            Rápido
          </button>
          <button
            className={`mode-btn ${deepMode ? 'mode-btn--active mode-btn--deep' : ''}`}
            onClick={() => onDeepModeChange(true)}
            title="Profundo: mayor aprovechamiento, ~5-15 segundos"
            disabled={isCalculating}
          >
            <Brain size={13} />
            Profundo
          </button>
        </div>

        <button
          className={`optimize-btn ${deepMode ? 'optimize-btn--deep' : ''}`}
          onClick={onCalculate}
          disabled={isCalculating}
        >
          {isCalculating
            ? <><Loader2 size={17} className="spin-icon" /> {deepMode ? 'Optimizando...' : 'Calculando...'}</>
            : <><Scissors size={17} /> Optimizar Cortes</>
          }
        </button>
      </div>
    </aside>
  );
}
