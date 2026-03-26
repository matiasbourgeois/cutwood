/**
 * LocalStorage persistence for CutWood projects (furniture templates).
 */

const STORAGE_KEY = 'cutwood_projects';

export function saveProject(project) {
  const projects = getAllProjects();
  const existing = projects.findIndex((p) => p.id === project.id);
  if (existing >= 0) {
    projects[existing] = { ...project, updatedAt: Date.now() };
  } else {
    projects.push({
      ...project,
      id: project.id || generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects;
}

export function getAllProjects() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getProject(id) {
  return getAllProjects().find((p) => p.id === id) || null;
}

export function deleteProject(id) {
  const projects = getAllProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Export all projects as a downloadable JSON file.
 */
export function exportAllProjects() {
  const projects = getAllProjects();
  const offcuts = getAllOffcuts();

  // Collect ALL user data from localStorage
  const stockRaw = localStorage.getItem('cutwood-stock');
  const optionsRaw = localStorage.getItem('cutwood-options');
  const theme = localStorage.getItem('cutwood-theme');
  const sidebarWidth = localStorage.getItem('cutwood-sidebar-width');

  const data = {
    app: 'CutWood',
    version: 3,
    exportedAt: new Date().toISOString(),
    projects,
    offcuts,
    settings: {
      stock: stockRaw ? JSON.parse(stockRaw) : null,
      options: optionsRaw ? JSON.parse(optionsRaw) : null,
      theme: theme || null,
      sidebarWidth: sidebarWidth ? Number(sidebarWidth) : null,
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `cutwood-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import projects from a JSON file. Returns { imported, total } count.
 */
export function importProjects(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        let incoming = [];

        // Support both formats: { projects: [...] } or raw array
        if (data.projects && Array.isArray(data.projects)) {
          incoming = data.projects;
        } else if (Array.isArray(data)) {
          incoming = data;
        } else {
          reject(new Error('Formato de archivo no válido'));
          return;
        }

        const existing = getAllProjects();
        const existingIds = new Set(existing.map((p) => p.id));
        let importedCount = 0;

        incoming.forEach((project) => {
          if (!existingIds.has(project.id)) {
            existing.push(project);
            importedCount++;
          }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

        // Import offcuts if present
        let offcutImported = 0;
        if (data.offcuts && Array.isArray(data.offcuts) && data.offcuts.length > 0) {
          const existingOffcuts = getAllOffcuts();
          const existingOffcutIds = new Set(existingOffcuts.map(o => o.id));
          data.offcuts.forEach(oc => {
            if (!existingOffcutIds.has(oc.id)) {
              existingOffcuts.push(oc);
              offcutImported++;
            }
          });
          localStorage.setItem(OFFCUTS_KEY, JSON.stringify(existingOffcuts));
        }

        // Import settings (stock, options, theme, sidebarWidth) if present
        let settingsRestored = false;
        if (data.settings) {
          if (data.settings.stock) {
            localStorage.setItem('cutwood-stock', JSON.stringify(data.settings.stock));
            settingsRestored = true;
          }
          if (data.settings.options) {
            localStorage.setItem('cutwood-options', JSON.stringify(data.settings.options));
            settingsRestored = true;
          }
          if (data.settings.theme) {
            localStorage.setItem('cutwood-theme', data.settings.theme);
            settingsRestored = true;
          }
          if (data.settings.sidebarWidth) {
            localStorage.setItem('cutwood-sidebar-width', String(data.settings.sidebarWidth));
            settingsRestored = true;
          }
        }

        resolve({ imported: importedCount, total: incoming.length, offcutImported, settingsRestored });
      } catch {
        reject(new Error('Error al leer el archivo'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}

/* ══════════════════════════════════════════════════════════ */
/*  OFFCUTS (RETAZOS) — Extended inventory                    */
/* ══════════════════════════════════════════════════════════ */

const OFFCUTS_KEY = 'cutwood_offcuts';

/** Migrate old offcuts to new schema (add missing fields) */
function migrateOffcut(o) {
  return {
    id: o.id || generateId(),
    name: o.name || '',
    width: o.width || 0,
    height: o.height || 0,
    thickness: o.thickness || 18,
    grain: o.grain || 'none',
    brand: o.brand || '',
    color: o.color || '',
    material: o.material || 'Melamina',
    notes: o.notes || '',
    source: o.source || '',
    area: o.area || (o.width * o.height) / 1000000,
    createdAt: o.createdAt || Date.now(),
    selected: o.selected || false,
  };
}

export function saveOffcuts(offcuts) {
  const existing = getAllOffcuts();
  offcuts.forEach(o => {
    existing.push(migrateOffcut({
      ...o,
      id: generateId(),
      createdAt: Date.now(),
      area: (o.width * o.height) / 1000000,
    }));
  });
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify(existing));
  return existing;
}

export function getAllOffcuts() {
  try {
    const data = localStorage.getItem(OFFCUTS_KEY);
    if (!data) return [];
    return JSON.parse(data).map(migrateOffcut);
  } catch {
    return [];
  }
}

export function updateOffcut(id, updates) {
  const offcuts = getAllOffcuts().map(o => {
    if (o.id === id) {
      const updated = { ...o, ...updates };
      updated.area = (updated.width * updated.height) / 1000000;
      return updated;
    }
    return o;
  });
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify(offcuts));
  return offcuts;
}

export function addManualOffcut(data) {
  const offcuts = getAllOffcuts();
  offcuts.push(migrateOffcut({
    ...data,
    id: generateId(),
    createdAt: Date.now(),
    source: data.source || 'Manual',
    area: (data.width * data.height) / 1000000,
  }));
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify(offcuts));
  return offcuts;
}

export function removeOffcut(id) {
  const offcuts = getAllOffcuts().filter(o => o.id !== id);
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify(offcuts));
  return offcuts;
}

export function clearOffcuts() {
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify([]));
  return [];
}

export function consumeOffcuts(ids) {
  const offcuts = getAllOffcuts().filter(o => !ids.includes(o.id));
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify(offcuts));
  return offcuts;
}

export function toggleOffcutSelection(id) {
  const offcuts = getAllOffcuts().map(o =>
    o.id === id ? { ...o, selected: !o.selected } : o
  );
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify(offcuts));
  return offcuts;
}

export function setOffcutSelections(ids, selected) {
  const idSet = new Set(ids);
  const offcuts = getAllOffcuts().map(o =>
    idSet.has(o.id) ? { ...o, selected } : o
  );
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify(offcuts));
  return offcuts;
}

export function clearOffcutSelections() {
  const offcuts = getAllOffcuts().map(o => ({ ...o, selected: false }));
  localStorage.setItem(OFFCUTS_KEY, JSON.stringify(offcuts));
  return offcuts;
}

export function getSelectedOffcuts() {
  return getAllOffcuts().filter(o => o.selected);
}

