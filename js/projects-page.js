(function () {
  const listEl = document.getElementById('projects-list');
  const emptyEl = document.getElementById('projects-empty');
  const loadingEl = document.getElementById('projects-loading');
  const errorEl = document.getElementById('projects-error');
  const guestBanner = document.getElementById('projects-guest-banner');
  const storageNote = document.getElementById('projects-storage-note');

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.toggle('hidden', !msg);
  }

  function projectTitle(p) {
    return p.preview_name || p.previewName || p.title || 'Untitled resume';
  }

  function projectSubtitle(p) {
    const role = p.preview_title || p.previewTitle || '';
    return role ? `${role}` : 'No role yet';
  }

  function renderCard(project, { isCloud = false } = {}) {
    const id = project.id;
    const updated = ProResumeProjects.formatWhen(project.updated_at || project.updatedAt);
    const title = escapeHtml(projectTitle(project));
    const subtitle = escapeHtml(projectSubtitle(project));
    const href = `/builder.html?resume=${encodeURIComponent(id)}`;

    return `
      <li class="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-lg truncate">${title}</p>
          <p class="text-zinc-400 text-sm truncate">${subtitle}</p>
          <p class="text-zinc-500 text-xs mt-1">Last saved ${updated}${isCloud ? '' : ' · This device'}</p>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <a href="${href}" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-semibold">Continue</a>
          <button type="button" class="px-4 py-2 border border-white/15 hover:bg-white/5 rounded-lg text-sm text-zinc-300" data-delete-id="${escapeHtml(id)}" data-cloud="${isCloud ? '1' : '0'}">Delete</button>
        </div>
      </li>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderGuestProjects() {
    guestBanner?.classList.remove('hidden');
    storageNote?.classList.add('hidden');
    const projects = ProResumeProjects.listGuestProjects();
    renderProjectList(projects, { isCloud: false });
  }

  async function renderCloudProjects() {
    guestBanner?.classList.add('hidden');
    storageNote?.classList.remove('hidden');
    const { resumes } = await ProResumeAPI.listResumes();
    renderProjectList(resumes || [], { isCloud: true });
  }

  function renderProjectList(projects, opts) {
    loadingEl?.classList.add('hidden');
    if (!projects.length) {
      listEl?.classList.add('hidden');
      emptyEl?.classList.remove('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');
    listEl?.classList.remove('hidden');
    listEl.innerHTML = projects.map(p => renderCard(p, opts)).join('');
  }

  async function createProject() {
    showError('');
    try {
      if (ProResumeAPI.isLoggedIn()) {
        const { resume } = await ProResumeAPI.createResume('Untitled resume', ProResumeProjects.defaultData());
        ProResumeProjects.setActiveProjectId(resume.id);
        location.href = `/builder.html?resume=${encodeURIComponent(resume.id)}&new=1`;
        return;
      }
      const id = ProResumeProjects.createGuestProject('Untitled resume');
      location.href = `/builder.html?resume=${encodeURIComponent(id)}&new=1`;
    } catch (e) {
      showError(e.message || 'Could not create project');
    }
  }

  async function deleteProject(id, isCloud) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    showError('');
    try {
      if (isCloud) {
        await ProResumeAPI.deleteResume(id);
      } else {
        ProResumeProjects.deleteGuestProject(id);
      }
      await loadProjects();
    } catch (e) {
      showError(e.message || 'Could not delete project');
    }
  }

  async function loadProjects() {
    loadingEl?.classList.remove('hidden');
    listEl?.classList.add('hidden');
    emptyEl?.classList.add('hidden');
    showError('');
    try {
      if (ProResumeAPI.isLoggedIn()) {
        await renderCloudProjects();
      } else {
        renderGuestProjects();
      }
    } catch (e) {
      loadingEl?.classList.add('hidden');
      showError(e.message || 'Failed to load projects');
    }
  }

  document.getElementById('new-project-btn')?.addEventListener('click', createProject);
  document.querySelector('[data-action="new-project"]')?.addEventListener('click', createProject);

  listEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-id]');
    if (!btn) return;
    void deleteProject(btn.dataset.deleteId, btn.dataset.cloud === '1');
  });

  loadProjects();
  window.addEventListener('proresume:auth', () => loadProjects());
})();
