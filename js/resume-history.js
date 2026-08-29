/**
 * Resume project history — auto-saves snapshots per project (local + cloud when signed in).
 */
(function () {
  const LOCAL_PROJECT_KEY = 'proresume_local_project_id';
  const HISTORY_PREFIX = 'proresume_history_';
  const MAX_LOCAL_VERSIONS = 100;
  const SNAPSHOT_DEBOUNCE_MS = 2000;

  let snapshotTimer = null;
  let lastLocalHash = null;
  let getResumeData = () => ({});
  let getCloudResumeId = () => null;
  let onHistoryChange = null;

  function hashData(data) {
    return JSON.stringify(data);
  }

  function ensureLocalProjectId() {
    let id = localStorage.getItem(LOCAL_PROJECT_KEY);
    if (!id) {
      id = `local_${crypto.randomUUID?.() || Date.now()}`;
      localStorage.setItem(LOCAL_PROJECT_KEY, id);
    }
    return id;
  }

  function getProjectId() {
    return getCloudResumeId() || localStorage.getItem('proresume_resume_id') || ensureLocalProjectId();
  }

  function historyStorageKey(projectId) {
    return `${HISTORY_PREFIX}${projectId}`;
  }

  function loadLocalVersions(projectId) {
    try {
      const raw = localStorage.getItem(historyStorageKey(projectId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveLocalVersions(projectId, versions) {
    localStorage.setItem(historyStorageKey(projectId), JSON.stringify(versions.slice(0, MAX_LOCAL_VERSIONS)));
  }

  function sourceLabel(source) {
    const labels = {
      auto: 'Auto-saved',
      snapshot: 'Saved on exit',
      logout: 'Saved on sign out',
      restore: 'Restored version',
      create: 'Project created',
      unload: 'Saved on close'
    };
    return labels[source] || 'Saved';
  }

  function formatWhen(isoOrMs) {
    const d = new Date(isoOrMs);
    if (Number.isNaN(d.getTime())) return 'Unknown time';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function previewLabel(data, fallbackTitle) {
    const name = (data?.name || '').trim();
    const title = (data?.title || '').trim();
    if (name && title) return `${name} — ${title}`;
    return name || title || fallbackTitle || 'Untitled resume';
  }

  function saveLocalSnapshot(projectId, data, { source = 'auto', title } = {}) {
    const nextHash = hashData(data);
    const versions = loadLocalVersions(projectId);
    if (versions[0]?.hash === nextHash) return null;

    const entry = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
      source,
      title: title || previewLabel(data),
      preview_name: data?.name || '',
      preview_title: data?.title || '',
      hash: nextHash,
      data: structuredClone(data)
    };

    versions.unshift(entry);
    saveLocalVersions(projectId, versions);
    lastLocalHash = nextHash;
    onHistoryChange?.();
    return entry;
  }

  function migrateLocalHistory(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const fromVersions = loadLocalVersions(fromId);
    if (!fromVersions.length) return;

    const existing = loadLocalVersions(toId);
    const merged = [...fromVersions, ...existing]
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      .filter((v, i, arr) => arr.findIndex(x => x.hash === v.hash) === i)
      .slice(0, MAX_LOCAL_VERSIONS);

    saveLocalVersions(toId, merged);
    localStorage.removeItem(historyStorageKey(fromId));
  }

  async function listCloudHistory(resumeId) {
    if (!window.ProResumeAPI?.isLoggedIn() || !resumeId) return [];
    try {
      const { versions } = await ProResumeAPI.listResumeHistory(resumeId);
      return (versions || []).map(v => ({
        id: v.id,
        savedAt: v.created_at,
        source: v.source || 'auto',
        title: previewLabel({ name: v.preview_name, title: v.preview_title }, v.title),
        preview_name: v.preview_name,
        preview_title: v.preview_title,
        cloud: true
      }));
    } catch {
      return [];
    }
  }

  async function listHistory() {
    const projectId = getProjectId();
    const local = loadLocalVersions(projectId).map(v => ({
      id: v.id,
      savedAt: v.savedAt,
      source: v.source,
      title: v.title,
      preview_name: v.preview_name,
      preview_title: v.preview_title,
      cloud: false
    }));

    const cloud = await listCloudHistory(getCloudResumeId());
    const merged = [...local, ...cloud]
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    const seen = new Set();
    return merged.filter(v => {
      const key = `${v.savedAt}|${v.preview_name}|${v.preview_title}|${v.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_LOCAL_VERSIONS);
  }

  async function getVersionData(versionId) {
    const projectId = getProjectId();
    const local = loadLocalVersions(projectId).find(v => v.id === versionId);
    if (local?.data) return local.data;

    const resumeId = getCloudResumeId();
    if (window.ProResumeAPI?.isLoggedIn() && resumeId) {
      const { version } = await ProResumeAPI.getResumeHistoryVersion(resumeId, versionId);
      return version?.data || null;
    }
    return null;
  }

  function scheduleSnapshot(source = 'auto') {
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => {
      void recordSnapshot(source);
    }, SNAPSHOT_DEBOUNCE_MS);
  }

  async function recordSnapshot(source = 'auto', { force = false } = {}) {
    const data = getResumeData();
    const projectId = getProjectId();
    const title = previewLabel(data);
    const nextHash = hashData(data);

    if (!force && lastLocalHash === nextHash) return null;

    const entry = saveLocalSnapshot(projectId, data, { source, title });
    return entry;
  }

  async function flushSnapshot(source = 'unload') {
    clearTimeout(snapshotTimer);
    const data = getResumeData();
    const projectId = getProjectId();
    const title = previewLabel(data);
    saveLocalSnapshot(projectId, data, { source, title });

    const resumeId = getCloudResumeId();
    if (!window.ProResumeAPI?.isLoggedIn() || !resumeId) return;

    const base = (window.PRORESUME_CONFIG?.apiUrl || '').replace(/\/$/, '');
    const token = window.ProResumeAPI.getToken?.();
    if (!base || !token) return;

    const payload = JSON.stringify({ data, title, source });
    const url = `${base}/api/resumes/${resumeId}/history`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: payload,
        keepalive: true
      });
    } catch {
      /* local history already saved */
    }
  }
  function bind(options = {}) {
    getResumeData = options.getResumeData || getResumeData;
    getCloudResumeId = options.getCloudResumeId || getCloudResumeId;
    onHistoryChange = options.onHistoryChange || null;
  }

  function onCloudResumeLinked(localProjectId, cloudResumeId) {
    migrateLocalHistory(localProjectId, cloudResumeId);
    ensureLocalProjectId();
  }

  window.ProResumeHistory = {
    bind,
    getProjectId,
    ensureLocalProjectId,
    onCloudResumeLinked,
    scheduleSnapshot,
    recordSnapshot,
    flushSnapshot,
    listHistory,
    getVersionData,
    sourceLabel,
    formatWhen,
    previewLabel
  };
})();
