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
  style,
}) {
  return (
    <aside className="sidebar" style={style}>
      <div className="sidebar-scroll">
        <ProjectManager
          projectName={projectName}
          onNameChange={onProjectNameChange}
          pieces={pieces}
          stock={stock}
          options={options}
          onLoadProject={onLoadProject}
          onNewProject={onNewProject}
        />
        <PiecesList
          pieces={pieces}
          onChange={onPiecesChange}
          showToast={showToast}
        />
        <StockConfig
          stock={stock}
          onStockChange={onStockChange}
          options={options}
          onOptionsChange={onOptionsChange}
        />
      </div>
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
