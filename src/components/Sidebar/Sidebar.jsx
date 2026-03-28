import { useRef } from 'react';
import ProjectManager from './ProjectManager';
import PiecesList from './PiecesList';
import StockConfig from './StockConfig';
import { Scissors, Loader2 } from 'lucide-react';

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

        {/* 3. Pieces list — SECOND */}
        <PiecesList
          pieces={pieces}
          onChange={onPiecesChange}
          showToast={showToast}
        />
      </div>

      {/* Sticky bottom: Optimize only */}
      <div className="sidebar-bottom">
        <button
          className="optimize-btn"
          onClick={onCalculate}
          disabled={isCalculating}
        >
          {isCalculating
            ? <><Loader2 size={17} className="spin-icon" /> Calculando...</>
            : <><Scissors size={17} /> Optimizar Cortes</>
          }
        </button>
      </div>
    </aside>
  );
}
