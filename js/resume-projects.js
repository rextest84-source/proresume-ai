/**
 * Resume projects — one saved document per project (guest localStorage or cloud resume row).
 */
(function () {
  const PROJECTS_KEY = 'proresume_projects';
  const ACTIVE_KEY = 'proresume_resume_id';
  const LEGACY_DATA_KEY = 'proresume_data';

  const defaultData = () => ({
    name: '', title: '', email: '', phone: '', location: '',
    summary: '',
    experience: [{ company: '', role: '', dates: '', description: '' }],
    education: [{ school: '', degree: '', year: '' }],
    skills: '', template: 'modern'
  });

  function projectDataKey(id) {
    return `proresume_project_${id}`;
  }

  function readProjects() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeProjects(list) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  }

  function previewLabel(data, fallback = 'Untitled resume') {
    const name = (data?.name || '').trim();
    const title = (data?.title || '').trim();
    if (name && title) return `${name} — ${title}`;
    return name || title || fallback;
  }

  function migrateLegacyGuestData() {
    const projects = readProjects();
    if (projects.length) return;

    const legacy = localStorage.getItem(LEGACY_DATA_KEY);
    if (!legacy) return;

    try {
      const data = { ...defaultData(), ...JSON.parse(legacy) };
      const id = `local_${crypto.randomUUID?.() || Date.now()}`;
      localStorage.setItem(projectDataKey(id), JSON.stringify(data));
      writeProjects([{
        id,
        title: previewLabel(data, 'My Resume'),
        previewName: data.name || '',
        previewTitle: data.title || '',
        updatedAt: new Date().toISOString()
      }]);
      localStorage.setItem(ACTIVE_KEY, id);
      localStorage.removeItem(LEGACY_DATA_KEY);
    } catch {
      /* ignore corrupt legacy data */
    }
  }

  function listGuestProjects() {
    migrateLegacyGuestData();
    return readProjects().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function getGuestProjectData(id) {
    if (!id) return defaultData();
    try {
      const raw = localStorage.getItem(projectDataKey(id));
      if (!raw) return defaultData();
      return { ...defaultData(), ...JSON.parse(raw) };
    } catch {
      return defaultData();
    }
  }

  function saveGuestProjectData(id, data) {
    if (!id) return;
    localStorage.setItem(projectDataKey(id), JSON.stringify(data));
    updateGuestProjectMeta(id, data);
  }

  function updateGuestProjectMeta(id, data, titleOverride) {
    const projects = readProjects();
    const idx = projects.findIndex(p => p.id === id);
    const meta = {
      id,
      title: titleOverride || previewLabel(data),
      previewName: data?.name || '',
      previewTitle: data?.title || '',
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) projects[idx] = meta;
    else projects.unshift(meta);
    writeProjects(projects);
  }

  function createGuestProject(title = 'Untitled resume') {
    migrateLegacyGuestData();
    const id = `local_${crypto.randomUUID?.() || Date.now()}`;
    const data = defaultData();
    localStorage.setItem(projectDataKey(id), JSON.stringify(data));
    const projects = readProjects();
    projects.unshift({
      id,
      title,
      previewName: '',
      previewTitle: '',
      updatedAt: new Date().toISOString()
    });
    writeProjects(projects);
    localStorage.setItem(ACTIVE_KEY, id);
    return id;
  }

  function deleteGuestProject(id) {
    const projects = readProjects().filter(p => p.id !== id);
    writeProjects(projects);
    localStorage.removeItem(projectDataKey(id));
    if (localStorage.getItem(ACTIVE_KEY) === id) {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }

  function setActiveProjectId(id) {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
  }

  function getActiveProjectId() {
    return localStorage.getItem(ACTIVE_KEY);
  }

  function formatWhen(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  window.ProResumeProjects = {
    defaultData,
    previewLabel,
    formatWhen,
    listGuestProjects,
    getGuestProjectData,
    saveGuestProjectData,
    updateGuestProjectMeta,
    createGuestProject,
    deleteGuestProject,
    setActiveProjectId,
    getActiveProjectId,
    migrateLegacyGuestData
  };
})();
