import { useState, useImperativeHandle, forwardRef } from 'react';
import { saveProject, getAllProjects, deleteProject } from '../../utils/storage';
import HistoryModal from './HistoryModal';
import { Save, FilePlus, FolderOpen } from 'lucide-react';

const ProjectManager = forwardRef(function ProjectManager({ projectName, onNameChange, pieces, stock, options, onLoadProject, onNewProject }, ref) {
  const [projects, setProjects] = useState(getAllProjects());
  const [showModal, setShowModal] = useState(false);

  // Expose openHistory so Sidebar can trigger it
  useImperativeHandle(ref, () => ({
    openHistory: () => {
      setProjects(getAllProjects());
      setShowModal(true);
    }
  }));

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

  return (
    <>
      {/* Inline project bar — no accordion */}
      <div className="project-bar">
        <input
          type="text"
          className="project-bar-input"
          placeholder="Nombre del mueble..."
          value={projectName}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <button className="project-bar-btn project-bar-save" onClick={handleSave} title="Guardar">
          <Save size={16} />
        </button>
        <button className="project-bar-btn project-bar-new" onClick={onNewProject} title="Nuevo mueble">
          <FilePlus size={16} />
        </button>
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
});

export default ProjectManager;
