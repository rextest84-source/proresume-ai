/**
 * Resume project history — cloud-only for signed-in users; localStorage for guests only.
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
  let onFlushCloud = null;

  function isLoggedIn() {
    return window.ProResumeAPI?.isLoggedIn?.() ?? false;
  }

  function useLocalHistory() {
    return !isLoggedIn();
  }

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
    if (isLoggedIn()) return getCloudResumeId() || localStorage.getItem('proresume_resume_id') || null;
    return ensureLocalProjectId();
  }

  function historyStorageKey(projectId) {
    return `${HISTORY_PREFIX}${projectId}`;
  }

  function clearLocalHistory(projectId) {
    if (!projectId) return;
    localStorage.removeItem(historyStorageKey(projectId));
  }

  function loadLocalVersions(projectId) {
    if (!useLocalHistory() || !projectId) return [];
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
    if (!useLocalHistory() || !projectId) return;
    localStorage.setItem(historyStorageKey(projectId), JSON.stringify(versions.slice(0, MAX_LOCAL_VERSIONS)));
  }

  function sourceLabel(source) {
    const labels = {
      auto: 'Auto-saved',
      snapshot: 'Saved on exit',
      logout: 'Saved on sign out',
      restore: 'Restored version',
      create: 'Project created',
      unload: 'Saved on close',
      import: 'Imported from guest session'
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
    if (!useLocalHistory() || !projectId) return null;

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

  async function uploadLocalHistoryToCloud(localProjectId, cloudResumeId) {
    if (!isLoggedIn() || !localProjectId || !cloudResumeId) return;

    const versions = loadLocalVersions(localProjectId);
    if (!versions.length) {
      clearLocalHistory(localProjectId);
      clearLocalHistory(cloudResumeId);
      return;
    }

    for (const version of [...versions].reverse()) {
      if (!version?.data) continue;
      try {
        await window.ProResumeAPI.saveResumeHistorySnapshot(
          cloudResumeId,
          version.data,
          version.title || previewLabel(version.data),
          version.source || 'import'
        );
      } catch {
        /* continue uploading remaining snapshots */
      }
    }

    clearLocalHistory(localProjectId);
    clearLocalHistory(cloudResumeId);
    onHistoryChange?.();
  }

  async function listCloudHistory(resumeId) {
    if (!isLoggedIn() || !resumeId) return [];
    try {
      const { versions } = await window.ProResumeAPI.listResumeHistory(resumeId);
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
    if (isLoggedIn()) {
      return listCloudHistory(getCloudResumeId());
    }

    const projectId = getProjectId();
    return loadLocalVersions(projectId).map(v => ({
      id: v.id,
      savedAt: v.savedAt,
      source: v.source,
      title: v.title,
      preview_name: v.preview_name,
      preview_title: v.preview_title,
      cloud: false
    }));
  }

  async function getVersionData(versionId) {
    const resumeId = getCloudResumeId();

    if (isLoggedIn()) {
      if (!resumeId) return null;
      const { version } = await window.ProResumeAPI.getResumeHistoryVersion(resumeId, versionId);
      return version?.data || null;
    }

    const projectId = getProjectId();
    const local = loadLocalVersions(projectId).find(v => v.id === versionId);
    return local?.data || null;
  }

  function scheduleSnapshot(source = 'auto') {
    if (!useLocalHistory()) return;
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => {
      void recordSnapshot(source);
    }, SNAPSHOT_DEBOUNCE_MS);
  }

  async function recordSnapshot(source = 'auto', { force = false } = {}) {
    if (!useLocalHistory()) return null;

    const data = getResumeData();
    const projectId = getProjectId();
    const title = previewLabel(data);
    const nextHash = hashData(data);

    if (!force && lastLocalHash === nextHash) return null;
    return saveLocalSnapshot(projectId, data, { source, title });
  }

  async function flushSnapshot(source = 'unload') {
    clearTimeout(snapshotTimer);

    if (isLoggedIn()) {
      try {
        await onFlushCloud?.(source);
      } catch {
        /* fall through to history POST */
      }

      const resumeId = getCloudResumeId();
      const data = getResumeData();
      const title = previewLabel(data);
      const base = (window.PRORESUME_CONFIG?.apiUrl || '').replace(/\/$/, '');
      const token = window.ProResumeAPI.getToken?.();
      if (!resumeId || !base || !token) return;

      try {
        await fetch(`${base}/api/resumes/${resumeId}/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ data, title, source }),
          keepalive: true
        });
      } catch {
        /* cloud PUT/history is best effort on exit */
      }
      return;
    }

    const data = getResumeData();
    const projectId = getProjectId();
    saveLocalSnapshot(projectId, data, { source, title: previewLabel(data) });
  }

  function bind(options = {}) {
    getResumeData = options.getResumeData || getResumeData;
    getCloudResumeId = options.getCloudResumeId || getCloudResumeId;
    onHistoryChange = options.onHistoryChange || null;
    onFlushCloud = options.onFlushCloud || null;
  }

  async function onCloudResumeLinked(localProjectId, cloudResumeId) {
    await uploadLocalHistoryToCloud(localProjectId, cloudResumeId);
    clearLocalHistory(cloudResumeId);
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
    previewLabel,
    useLocalHistory
  };
})();
