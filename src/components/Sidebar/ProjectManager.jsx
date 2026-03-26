import { useState } from 'react';
import { saveProject, getAllProjects, deleteProject } from '../../utils/storage';
import HistoryModal from './HistoryModal';
import { FolderOpen, Save, FilePlus } from 'lucide-react';

export default function ProjectManager({ projectName, onNameChange, pieces, stock, options, onLoadProject, onNewProject }) {
  const [projects, setProjects] = useState(getAllProjects());
  const [showModal, setShowModal] = useState(false);

  const handleSave = () => {
    if (!projectName.trim()) return;
    const project = {
      id: projectName.trim().toLowerCase().replace(/\s+/g, '_'),
      name: projectName.trim(),
      pieces,
      stock,
      options,
    };
    const updated = saveProject(project);
    setProjects(updated);
  };

  const handleLoad = (project) => {
    onLoadProject(project);
    setShowModal(false);
  };

  const handleDelete = (id) => {
    const updated = deleteProject(id);
    setProjects(updated);
  };

  const handleOpenHistory = () => {
    setProjects(getAllProjects());
    setShowModal(true);
  };

  return (
    <>
      <div className="section-card fade-in">
        <div className="section-header" style={{ cursor: 'default' }}>
          <div className="section-header-left">
            <span className="section-icon"><FolderOpen size={16} /></span>
            <span className="section-title">Proyecto / Mueble</span>
          </div>
        </div>
        <div className="section-body">
          <div className="project-input-row">
            <input
              type="text"
              className="project-name-input"
              placeholder="Nombre del mueble (ej: Modular Chico)"
              value={projectName}
              onChange={(e) => onNameChange(e.target.value)}
            />
            <button className="btn btn-sm btn-save" onClick={handleSave} title="Guardar proyecto">
              <Save size={18} style={{display:'block'}} />
            </button>
            <button className="btn btn-sm btn-new-project" onClick={onNewProject} title="Nuevo mueble">
              <FilePlus size={18} style={{display:'block'}} />
            </button>
          </div>
          <button className="history-open-btn" onClick={handleOpenHistory}>
            <FolderOpen size={14} style={{display:'inline',verticalAlign:'text-bottom'}} /> Historial de Muebles
            {projects.length > 0 && (
              <span className="history-open-count">{projects.length}</span>
            )}
          </button>
        </div>
      </div>

      {showModal && (
        <HistoryModal
          projects={projects}
          onLoad={handleLoad}
          onDelete={handleDelete}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
