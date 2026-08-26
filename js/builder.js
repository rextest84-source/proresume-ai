// ProResume AI | Resume Builder v2

const STORAGE_KEY = 'proresume_data';
const CREDITS_KEY = 'proresume_credits';
const EXPORT_COUNT_KEY = 'proresume_exports';
const FREE_EXPORT_LIMIT = 1;
const STARTING_CREDITS = 20;

// Set to false for production - credits enforced via Railway API when logged in.
const UNLIMITED_AI = false;

/** Temporary QA flag: all templates visible/selectable. Set false before re-enabling paid gating. */
const PREVIEW_ALL_TEMPLATES = true;

let cloudResumeId = localStorage.getItem('proresume_resume_id');
let cloudSaveTimer = null;
let cloudUser = null;
let liveGrokEnabled = false;

const TEMPLATE_TIERS = {
  modern: 'free', classic: 'free', minimal: 'free', stanford: 'free', horizon: 'free', serif: 'free',
  corporate: 'starter', elegant: 'starter', compact: 'starter', metro: 'starter', slate: 'starter', canvas: 'starter',
  executive: 'pro', creative: 'pro', tech: 'pro', harvard: 'pro', bold: 'pro', nova: 'pro', apex: 'pro', pioneer: 'pro', academic: 'pro',
  luxury: 'business', international: 'business', refined: 'business',
  fusion: 'starter', monarch: 'starter', swiss: 'starter',
  vivid: 'pro', forest: 'pro', onyx: 'pro',
  radiant: 'business', streamline: 'pro',
  ...(window.TEMPLATE_EXTENSIONS?.tiers || {})
};

const TIER_LABELS = { free: 'Free', starter: 'Starter ($8/mo)', pro: 'Pro ($15/mo)', business: 'Business ($20/mo)' };

const PLAN_TEMPLATE_RANK = { free: 0, starter: 1, pro: 2, business: 3 };

function getUserPlan() {
  if (cloudUser?.plan) return cloudUser.plan;
  const stored = window.ProResumeAPI?.getStoredUser?.();
  return stored?.plan || 'free';
}

function getTemplateTier(templateId) {
  return TEMPLATE_TIERS[templateId] || 'free';
}

function canAccessTemplate(templateId) {
  if (PREVIEW_ALL_TEMPLATES || UNLIMITED_AI) return true;
  const userRank = PLAN_TEMPLATE_RANK[getUserPlan()] ?? 0;
  const templateRank = PLAN_TEMPLATE_RANK[getTemplateTier(templateId)] ?? 0;
  return userRank >= templateRank;
}

function countAccessibleTemplates() {
  const catalog = window.TEMPLATE_EXTENSIONS?.catalog || [];
  return catalog.filter(t => canAccessTemplate(t.id)).length;
}

const CREDIT_COSTS = {
  enhance_summary: 2, enhance_exp: 2, export_pdf: 3, export_png: 2, export_jpeg: 2,
  export_doc: 3, export_html: 2, export_rtf: 2, regenerate: 1,
  build_resume: 5, suggest_skills: 1,
  job_match: 5, cover_letter: 4, ats_scan: 2, linkedin: 3
};

// ─── AI (Grok via Railway when signed in, else ai-engine.js templates) ───

function snapshotResume() {
  return {
    name: resumeData.name,
    title: resumeData.title,
    email: resumeData.email,
    summary: resumeData.summary,
    skills: resumeData.skills,
    experience: resumeData.experience,
    education: resumeData.education
  };
}

function syncCreditsFromServer(credits) {
  if (credits === undefined || credits === null) return;
  if (cloudUser) cloudUser.credits = credits;
  const stored = ProResumeAPI?.getStoredUser?.();
  if (stored) {
    stored.credits = credits;
    localStorage.setItem('proresume_user', JSON.stringify(stored));
  }
  setCredits(credits);
}

function canUseLiveGrok() {
  return liveGrokEnabled && window.ProResumeAPI?.isLoggedIn();
}

async function refreshLiveAiStatus() {
  if (!window.ProResumeAPI) return;
  try {
    const status = await ProResumeAPI.aiStatus();
    liveGrokEnabled = !!status.configured;
  } catch {
    liveGrokEnabled = false;
  }
}

function enhanceSummaryAI(text, title, skills) {
  return AIEngine.enhanceSummary(text, title, skills, resumeData.experience);
}

function enhanceDescriptionAI(text, role) {
  return AIEngine.enhanceDescription(text, role, resumeData.skills);
}

async function runAIEnhance(btn, fn, creditCost = 2, featureName = 'smart suggestions', regenerate = true, liveAction = null) {
  if (!btn || btn.classList.contains('ai-loading')) return;
  const useLive = !!(liveAction && canUseLiveGrok());
  if (!useLive && !(await useCredits(creditCost, featureName))) return;

  const original = btn.innerHTML;
  btn.classList.add('ai-loading');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Working...';
  if (!useLive) await new Promise(r => setTimeout(r, 350 + Math.random() * 450));

  try {
    if (!useLive && regenerate) AIEngine.regenerateSeed();
    await fn(useLive);
    const liveLabel = useLive ? 'Live suggestions ready!' : 'Suggestions ready!';
    showToast(UNLIMITED_AI ? '✦ Suggestions ready!' : `✦ ${liveLabel} (−${creditCost} credit${creditCost > 1 ? 's' : ''})`);
    schedulePreviewUpdate();
  } catch (e) {
    if (useLive && liveAction && e.status !== 402 && e.message !== 'empty' && e.message !== 'need_title') {
      try {
        if (regenerate) AIEngine.regenerateSeed();
        await fn(false);
        showToast('Live AI unavailable. Offline suggestions applied instead.', 'warning');
        schedulePreviewUpdate();
        return;
      } catch (fallbackErr) {
        if (fallbackErr.message === 'empty') showToast(fallbackErr.hint || 'Add some text first', 'warning');
        else if (fallbackErr.message === 'need_title') showToast(fallbackErr.hint || 'Add your job title first', 'warning');
        else showToast('Suggestions failed. Try again.', 'warning');
        return;
      }
    }
    if (useLive) {
      if (e.status === 402) {
        showUpgradeModal(`Need ${creditCost} credits for ${featureName}. You have ${e.data?.credits ?? 0}.`);
      } else if (e.message !== 'empty' && e.message !== 'need_title') {
        showToast(e.message || 'Live AI unavailable. Try again', 'warning');
      }
    } else if (!UNLIMITED_AI && e.message !== 'empty') {
      setCredits(getCredits() + creditCost);
    }
    if (e.message === 'empty') showToast(e.hint || 'Add some text first', 'warning');
    else if (e.message === 'need_title') showToast(e.hint || 'Add your job title first', 'warning');
    else if (!useLive) showToast('Generation failed' + (UNLIMITED_AI ? '' : '. Credits refunded'), 'warning');
  } finally {
    btn.classList.remove('ai-loading');
    btn.innerHTML = original;
  }
}

const defaultData = {
  name: '', title: '', email: '', phone: '', location: '',
  summary: '',
  experience: [{ company: '', role: '', dates: '', description: '' }],
  education: [{ school: '', degree: '', year: '' }],
  skills: '', template: 'modern'
};

let resumeData = loadData();

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultData);
    const parsed = JSON.parse(saved);
    return { ...structuredClone(defaultData), ...parsed };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  updateSaveIndicator();
  scheduleCloudSave();
}

async function refreshCloudUser() {
  if (!window.ProResumeAPI?.isLoggedIn()) {
    cloudUser = null;
    refreshTemplateAccess();
    return null;
  }
  try {
    cloudUser = await ProResumeAPI.me();
    localStorage.setItem(CREDITS_KEY, String(cloudUser.credits));
    updateCreditsDisplay();
    updateAuthHeader();
    refreshTemplateAccess();
    return cloudUser;
  } catch {
    cloudUser = null;
    refreshTemplateAccess();
    return null;
  }
}

async function loadFromCloud() {
  if (!window.ProResumeAPI?.isLoggedIn()) return false;
  try {
    const { resumes } = await ProResumeAPI.listResumes();
    if (!resumes?.length) return false;
    const target = resumes.find(r => r.id === cloudResumeId)
      || resumes.find(r => r.is_default)
      || resumes[0];
    cloudResumeId = target.id;
    localStorage.setItem('proresume_resume_id', cloudResumeId);
    const { resume } = await ProResumeAPI.getResume(cloudResumeId);
    resumeData = { ...structuredClone(defaultData), ...resume.data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
    return true;
  } catch (e) {
    console.warn('Cloud load failed:', e);
    return false;
  }
}

function scheduleCloudSave() {
  if (!window.ProResumeAPI?.isLoggedIn() || !cloudResumeId) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    try {
      const title = resumeData.name?.trim() || resumeData.title?.trim() || 'My Resume';
      await ProResumeAPI.saveResume(cloudResumeId, resumeData, title);
      const el = document.getElementById('save-indicator');
      if (el) {
        el.textContent = 'Saved to cloud';
        el.classList.add('text-emerald-400');
      }
    } catch (e) {
      console.warn('Cloud save failed:', e);
    }
  }, 1200);
}

async function mergeLocalToCloud() {
  if (!window.ProResumeAPI?.isLoggedIn() || !cloudResumeId) return;
  try {
    const { resume } = await ProResumeAPI.getResume(cloudResumeId);
    const cloud = resume.data || {};
    const cloudEmpty = !cloud.name && !cloud.summary && !(cloud.experience || []).some(e => e.company || e.description);
    const localHasContent = resumeData.name || resumeData.summary || resumeData.experience?.some(e => e.company || e.description);
    if (cloudEmpty && localHasContent) {
      await ProResumeAPI.saveResume(cloudResumeId, resumeData);
    }
  } catch (e) {
    console.warn('Merge local to cloud failed:', e);
  }
}
function updateAuthHeader() {
  const link = document.getElementById('auth-nav-link');
  const badge = document.getElementById('unlimited-badge');
  if (link) {
    if (window.ProResumeAPI?.isLoggedIn()) {
      link.href = '/account.html';
      link.textContent = 'Account';
    } else {
      link.href = '/login.html?next=/builder.html';
      link.textContent = 'Sign in to save';
    }
  }
  if (badge) badge.classList.toggle('hidden', !UNLIMITED_AI);
}

function showCloudSaveBanner() {
  if (window.ProResumeAPI?.isLoggedIn()) return;
  let bar = document.getElementById('cloud-save-banner');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'cloud-save-banner';
    bar.className = 'mx-4 sm:mx-6 mb-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 flex flex-wrap items-center justify-between gap-2';
    bar.innerHTML = '<span><i class="fa-solid fa-cloud mr-1"></i> Resume saved locally only. <a href="/signup.html" class="text-emerald-400 font-semibold hover:underline">Create free account</a> to save in the cloud.</span>';
    const editor = document.getElementById('editor-panel');
    editor?.prepend(bar);
  }
}

// ─── Credits System ───

function getCredits() {
  if (cloudUser) return cloudUser.credits;
  const stored = localStorage.getItem(CREDITS_KEY);
  if (stored === null) {
    localStorage.setItem(CREDITS_KEY, String(STARTING_CREDITS));
    return STARTING_CREDITS;
  }
  return parseInt(stored, 10);
}

function setCredits(n) {
  localStorage.setItem(CREDITS_KEY, String(Math.max(0, n)));
  if (cloudUser) cloudUser.credits = Math.max(0, n);
  updateCreditsDisplay();
}

async function useCredits(amount, featureName) {
  if (UNLIMITED_AI) return true;

  if (window.ProResumeAPI?.isLoggedIn()) {
    try {
      const result = await ProResumeAPI.useCredits(amount, featureName);
      if (result.unlimited) return true;
      if (cloudUser) cloudUser.credits = result.credits;
      else {
        const u = ProResumeAPI.getStoredUser();
        if (u) { u.credits = result.credits; localStorage.setItem('proresume_user', JSON.stringify(u)); cloudUser = u; }
      }
      setCredits(result.credits);
      return true;
    } catch (e) {
      if (e.status === 402) {
        showUpgradeModal(`Need ${amount} credits for ${featureName}. You have ${e.data?.credits ?? 0}.`);
        return false;
      }
      showToast('Could not verify credits. Check your connection', 'warning');
      return false;
    }
  }

  const current = getCredits();
  if (current < amount) {
    showUpgradeModal(`Need ${amount} credits for ${featureName}. You have ${current}.`);
    return false;
  }
  setCredits(current - amount);
  return true;
}

function updateCreditsDisplay() {
  const el = document.getElementById('credits-count');
  if (el) el.textContent = UNLIMITED_AI ? '∞' : getCredits();
}

function updateSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = 'Saved';
  el.classList.add('text-emerald-400');
  setTimeout(() => el.classList.remove('text-emerald-400'), 1500);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function parseBullets(text) {
  if (!text?.trim()) return [];
  return text.split(/\n+/).map(l => l.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
}

function bulletsToHtml(bullets) {
  if (!bullets.length) return '';
  return `<ul class="tm-bullets">${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`;
}

// ─── Completeness score (checklist-based, not live ATS) ───

function calculateAtsScore() {
  return AIEngine.analyzeATS(resumeData).score;
}

// ─── Data helpers ───

function getContactItems() {
  return [
    { icon: 'fa-envelope', value: resumeData.email },
    { icon: 'fa-phone', value: resumeData.phone },
    { icon: 'fa-location-dot', value: resumeData.location }
  ].filter(c => c.value);
}

function getSkillsArray() {
  return resumeData.skills.split(',').map(s => s.trim()).filter(Boolean);
}

function getExperienceEntries() {
  return resumeData.experience.filter(e => e.company || e.role);
}

function getEducationEntries() {
  return resumeData.education.filter(e => e.school || e.degree);
}

// ─── Template Renderers ───

function renderExperienceBlocks() {
  return getExperienceEntries().map(e => {
    const bullets = parseBullets(e.description);
    return `
      <div class="tm-entry">
        <div class="tm-entry-top">
          <div>
            <div class="tm-entry-role">${escapeHtml(e.role || 'Position')}</div>
            ${e.company ? `<div class="tm-entry-company">${escapeHtml(e.company)}</div>` : ''}
          </div>
          ${e.dates ? `<div class="tm-entry-dates">${escapeHtml(e.dates)}</div>` : ''}
        </div>
        ${bulletsToHtml(bullets)}
      </div>`;
  }).join('');
}

function renderEducationBlocks() {
  return getEducationEntries().map(e => `
    <div class="tm-entry">
      <div class="tm-entry-role">${escapeHtml(e.degree || 'Degree')}</div>
      <div class="tm-entry-meta">${[e.school, e.year].filter(Boolean).map(escapeHtml).join(' · ')}</div>
    </div>
  `).join('');
}

function renderSkillPills(className = 'tm-skill-pill') {
  return getSkillsArray().map(s => `<span class="${className}">${escapeHtml(s)}</span>`).join('');
}

function renderBodyCore() {
  return `
    ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
    ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
    ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}`;
}

const SKILL_SECTION_TITLES = {
  classic: 'Core Competencies', executive: 'Expertise', stanford: 'Skills', creative: 'Skills',
  corporate: 'Core Skills', academic: 'Technical Skills', apex: 'Core Skills', serif: 'Skills',
  metro: 'Expertise', horizon: 'Skills', minimal: 'Skills'
};

function renderSkillsContent(templateId, placement = 'main') {
  const skills = getSkillsArray();
  if (!skills.length) return '';
  const items = skills.map(escapeHtml);

  switch (templateId) {
    case 'modern':
      return `<div class="tm-skills tm-skills-modern-side">${items.map(s => `<span class="tm-skill tm-skill-modern-side">${s}</span>`).join('')}</div>`;
    case 'classic':
    case 'serif':
      return `<p class="tm-skills tm-skills-inline-dots">${items.join(' · ')}</p>`;
    case 'minimal':
      return `<div class="tm-skills tm-skills-minimal">${items.map(s => `<span class="tm-skill tm-skill-minimal">${s}</span>`).join('')}</div>`;
    case 'executive':
      return `<div class="tm-skills tm-skills-exec-side">${items.map(s => `<span class="tm-skill tm-skill-exec">${s}</span>`).join('')}</div>`;
    case 'stanford':
      return `<div class="tm-skills tm-skills-stanford-list">${items.map(s => `<div class="tm-skill tm-skill-stanford">${s}</div>`).join('')}</div>`;
    case 'creative':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-creative">${s}</span>`).join('')}</div>`;
    case 'corporate':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-corp">${s}</span>`).join('')}</div>`;
    case 'elegant':
      return `<p class="tm-skills tm-skills-elegant">${items.join(', ')}</p>`;
    case 'tech':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-tech">${s}</span>`).join('')}</div>`;
    case 'harvard':
      return `<div class="tm-skills tm-skills-harvard">${items.map(s => `<span class="tm-skill tm-skill-harvard">${s}</span>`).join('')}</div>`;
    case 'luxury':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-luxury">${s}</span>`).join('')}</div>`;
    case 'international':
      return `<div class="tm-skills tm-skills-intl">${items.map(s => `<span class="tm-skill tm-skill-intl">${s}</span>`).join('')}</div>`;
    case 'bold':
      return `<div class="tm-skills tm-skills-bold">${items.map(s => `<span class="tm-skill tm-skill-bold">${s}</span>`).join('')}</div>`;
    case 'compact':
      return `<p class="tm-skills tm-skills-compact">${items.join(' · ')}</p>`;
    case 'refined':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-refined">${s}</span>`).join('')}</div>`;
    case 'horizon':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-horizon">${s}</span>`).join('')}</div>`;
    case 'metro':
      return placement === 'sidebar'
        ? `<div class="tm-skills tm-skills-metro-side">${items.map(s => `<div class="tm-skill tm-skill-metro">${s}</div>`).join('')}</div>`
        : `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-metro-pill">${s}</span>`).join('')}</div>`;
    case 'slate':
      return placement === 'sidebar'
        ? `<div class="tm-skills tm-skills-slate-side">${items.map(s => `<span class="tm-skill tm-skill-slate">${s}</span>`).join('')}</div>`
        : `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-slate-pill">${s}</span>`).join('')}</div>`;
    case 'nova':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-nova">${s}</span>`).join('')}</div>`;
    case 'apex':
      return `<div class="tm-skills tm-skills-apex">${items.map(s => `<span class="tm-skill tm-skill-apex">${s}</span>`).join('')}</div>`;
    case 'canvas':
      return `<div class="tm-skills tm-skills-canvas">${items.map(s => `<span class="tm-skill tm-skill-canvas">${s}</span>`).join('')}</div>`;
    case 'pioneer':
      return `<div class="tm-skills tm-skills-pioneer">${items.map(s => `<span class="tm-skill tm-skill-pioneer">${s}</span>`).join('')}</div>`;
    case 'academic':
      return `<p class="tm-skills tm-skills-academic">${items.join(' · ')}</p>`;
    case 'fusion':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-fusion">${s}</span>`).join('')}</div>`;
    case 'monarch':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-monarch">${s}</span>`).join('')}</div>`;
    case 'swiss':
      return `<div class="tm-skills tm-skills-swiss">${items.map(s => `<span class="tm-skill tm-skill-swiss">${s}</span>`).join('')}</div>`;
    case 'vivid':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-vivid">${s}</span>`).join('')}</div>`;
    case 'forest':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-forest">${s}</span>`).join('')}</div>`;
    case 'onyx':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-onyx">${s}</span>`).join('')}</div>`;
    case 'radiant':
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-radiant">${s}</span>`).join('')}</div>`;
    case 'streamline':
      return `<div class="tm-skills tm-skills-streamline">${items.map(s => `<span class="tm-skill tm-skill-streamline">${s}</span>`).join('')}</div>`;
    default: {
      const extSkill = window.TEMPLATE_EXTENSIONS?.skills?.[templateId];
      if (extSkill) return extSkill();
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-default">${s}</span>`).join('')}</div>`;
    }
  }
}

function renderSkillsSection(templateId, title, { fullWidth = false } = {}) {
  const content = renderSkillsContent(templateId, 'main');
  if (!content) return '';
  const sectionTitle = title || SKILL_SECTION_TITLES[templateId] || 'Skills';
  const spanClass = fullWidth || templateId === 'apex' ? ` tm-${templateId}-full` : '';
  return `<div class="tm-section tm-skills-section${spanClass}"><div class="tm-section-title">${sectionTitle}</div>${content}</div>`;
}

function renderSkillsSidebar(templateId, label = 'Skills') {
  const content = renderSkillsContent(templateId, 'sidebar');
  if (!content) return '';
  return `<div class="tm-side-section"><div class="tm-side-label">${label}</div>${content}</div>`;
}

function renderStandardBody(templateId = 'modern') {
  return renderBodyCore() + renderSkillsSection(templateId);
}

function renderContactHtml(inline = false) {
  const items = getContactItems();
  if (inline) {
    return items.map(c => `<span>${escapeHtml(c.value)}</span>`).join('');
  }
  return items.map(c => `
    <div class="tm-contact-item"><i class="fa-solid ${c.icon}"></i><span>${escapeHtml(c.value)}</span></div>
  `).join('');
}

const TEMPLATE_RENDERERS = {
  modern() {
    const skills = getSkillsArray();
    return `
      <div class="tm-modern">
        <aside class="tm-sidebar">
          <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
          <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
          <div class="tm-side-section">
            <div class="tm-side-label">Contact</div>
            ${renderContactHtml()}
          </div>
          ${skills.length ? renderSkillsSidebar('modern', 'Skills') : ''}
        </aside>
        <main class="tm-main">
          ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Profile</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
          ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
          ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
        </main>
      </div>`;
  },

  classic() {
    return `
      <div class="tm-classic">
        <div class="tm-header">
          <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
          <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
          <div class="tm-contact">${renderContactHtml(true)}</div>
        </div>
        ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Professional Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
        ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Professional Experience</div>${renderExperienceBlocks()}</div>` : ''}
        ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
        ${renderSkillsSection('classic')}
      </div>`;
  },

  minimal() {
    return `
      <div class="tm-minimal">
        <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
        <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
        <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join('  ·  ')}</div>
        ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">About</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
        ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
        ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
        ${renderSkillsSection('minimal')}
      </div>`;
  },

  executive() {
    return `
      <div class="tm-executive">
        <header class="tm-exec-header">
          <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
          <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
          <div class="tm-contact">${getContactItems().map(c => `<span class="tm-contact-item"><i class="fa-solid ${c.icon}"></i>${escapeHtml(c.value)}</span>`).join('')}</div>
        </header>
        <div class="tm-exec-body">
          <div>
            ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Executive Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
            ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Professional Experience</div>${renderExperienceBlocks()}</div>` : ''}
            ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
          </div>
          ${getSkillsArray().length ? `<div class="tm-side-skills"><div class="tm-section-title">Expertise</div>${renderSkillsContent('executive', 'sidebar')}</div>` : ''}
        </div>
      </div>`;
  },

  stanford() {
    return `
      <div class="tm-stanford">
        <div class="tm-header">
          <div>
            <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
            <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
          </div>
          <div class="tm-contact">${getContactItems().map(c => `<div>${escapeHtml(c.value)}</div>`).join('')}</div>
        </div>
        <div class="tm-body">
          <div>
            ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
            ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
            ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
          </div>
          ${getSkillsArray().length ? `<div class="tm-side-section"><div class="tm-side-title">Skills</div>${renderSkillsContent('stanford', 'sidebar')}</div>` : ''}
        </div>
      </div>`;
  },

  creative() {
    return `
      <div class="tm-creative">
        <div class="tm-creative-header">
          <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
          <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
          <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join('  ·  ')}</div>
        </div>
        <div class="tm-creative-body">
          ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">About Me</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
          ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
          ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
          ${renderSkillsSection('creative')}
        </div>
      </div>`;
  },

  corporate() { return renderThemed('corporate', 'corp'); },
  elegant() { return renderThemed('elegant'); },
  tech() { return renderThemed('tech', 'tech'); },
  harvard() { return renderThemed('harvard', 'harvard'); },
  luxury() { return renderThemed('luxury', 'luxury'); },
  international() { return renderThemed('international', 'intl'); },
  bold() { return renderThemed('bold'); },
  compact() { return renderThemed('compact'); },
  refined() { return renderRefined(); },

  horizon() {
    return `
      <div class="tm-horizon">
        <header class="tm-horizon-top">
          <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
          <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
          <div class="tm-contact">${getContactItems().map(c => `<span>${escapeHtml(c.value)}</span>`).join('<span class="tm-contact-sep"> · </span>')}</div>
        </header>
        <div class="tm-horizon-body">
          ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
          ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
          ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
          ${renderSkillsSection('horizon')}
        </div>
      </div>`;
  },

  serif() {
    return `
      <div class="tm-serif">
        <div class="tm-serif-header">
          <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
          <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
          <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div>
        </div>
        ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Professional Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
        ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
        ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
        ${renderSkillsSection('serif')}
      </div>`;
  },

  metro() { return renderMetro(); },
  slate() { return renderSlate(); },
  nova() { return renderNova(); },
  apex() { return renderApex(); },
  canvas() { return renderCanvas(); },
  pioneer() { return renderPioneer(); },
  academic() { return renderAcademic(); },

  fusion() { return renderFusion(); },
  monarch() { return renderMonarch(); },
  swiss() { return renderSwiss(); },
  vivid() { return renderVivid(); },
  forest() { return renderForest(); },
  onyx() { return renderOnyx(); },
  radiant() { return renderRadiant(); },
  streamline() { return renderStreamline(); },
  ...(window.TEMPLATE_EXTENSIONS?.renderers || {})
};

function renderMetro() {
  const contact = getContactItems().map(c => `<div>${escapeHtml(c.value)}</div>`).join('');
  return `
    <div class="tm-metro">
      <header class="tm-metro-header">
        <div class="tm-metro-left">
          <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
          <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
        </div>
        <div class="tm-metro-accent"></div>
        <div class="tm-metro-right">${contact}</div>
      </header>
      <div class="tm-metro-body">
        <div>${renderBodyCore()}</div>
        ${getSkillsArray().length ? `<aside class="tm-metro-skills-aside"><div class="tm-side-title">Expertise</div>${renderSkillsContent('metro', 'sidebar')}</aside>` : ''}
      </div>
    </div>`;
}

function renderSlate() {
  return `
    <div class="tm-slate">
      <main class="tm-slate-main">
        <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
        <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
        ${renderBodyCore()}
      </main>
      <aside class="tm-slate-side">
        <div class="tm-side-section">
          <div class="tm-side-label">Contact</div>
          ${renderContactHtml()}
        </div>
        ${renderSkillsSidebar('slate', 'Skills')}
      </aside>
    </div>`;
}

function renderNova() {
  return `
    <div class="tm-nova">
      <header class="tm-nova-header">
        <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
        <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
        <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join('  ·  ')}</div>
      </header>
      <div class="tm-nova-body">${renderStandardBody('nova')}</div>
    </div>`;
}

function renderApex() {
  const exp = getExperienceEntries();
  const edu = getEducationEntries();
  return `
    <div class="tm-apex">
      <header class="tm-apex-banner">
        <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
        <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
        <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div>
      </header>
      <div class="tm-apex-body">
        ${resumeData.summary ? `<div class="tm-section tm-apex-full"><div class="tm-section-title">Executive Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
        ${exp.length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
        ${edu.length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
        ${renderSkillsSection('apex')}
      </div>
    </div>`;
}

function renderCanvas() {
  return `
    <div class="tm-canvas">
      <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
      <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
      <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' | ')}</div>
      ${renderStandardBody('canvas')}
    </div>`;
}

function renderPioneer() {
  return `
    <div class="tm-pioneer">
      <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
      <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
      <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div>
      ${renderStandardBody('pioneer')}
    </div>`;
}

function renderAcademic() {
  return `
    <div class="tm-academic">
      <div class="tm-acad-header">
        <div>
          <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
          <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
        </div>
        <div class="tm-contact">${getContactItems().map(c => `<div>${escapeHtml(c.value)}</div>`).join('')}</div>
      </div>
      ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Research Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
      ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Professional Experience</div>${renderExperienceBlocks()}</div>` : ''}
      ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
      ${renderSkillsSection('academic')}
    </div>`;
}

function renderRefined() {
  return `
    <div class="tm-refined">
      <header class="tm-refined-header">
        <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
        <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
        <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div>
      </header>
      <div class="tm-refined-body">${renderStandardBody('refined')}</div>
    </div>`;
}

function renderFusion() {
  return `<div class="tm-fusion"><header class="tm-fusion-header"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div></header><div class="tm-fusion-body">${renderStandardBody('fusion')}</div></div>`;
}

function renderMonarch() {
  return `<div class="tm-monarch"><header class="tm-monarch-header"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div></header><div class="tm-monarch-body">${renderStandardBody('monarch')}</div></div>`;
}

function renderSwiss() {
  return `<div class="tm-swiss"><div class="tm-swiss-grid"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><div class="tm-swiss-meta"><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${getContactItems().map(c => `<div>${escapeHtml(c.value)}</div>`).join('')}</div></div></div>${renderStandardBody('swiss')}</div>`;
}

function renderVivid() {
  return `<div class="tm-vivid"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div>${renderStandardBody('vivid')}</div>`;
}

function renderForest() {
  return `<div class="tm-forest"><header class="tm-forest-header"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div></header><div class="tm-forest-body">${renderStandardBody('forest')}</div></div>`;
}

function renderOnyx() {
  return `<div class="tm-onyx"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div>${renderStandardBody('onyx')}</div>`;
}

function renderRadiant() {
  return `<div class="tm-radiant"><header class="tm-radiant-header"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div></header><div class="tm-radiant-body">${renderStandardBody('radiant')}</div></div>`;
}

function renderStreamline() {
  return `<div class="tm-streamline"><header class="tm-stream-header"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div></header><div class="tm-stream-body">${renderStandardBody('streamline')}</div></div>`;
}

function syncFormFields() {
  ['name', 'title', 'email', 'phone', 'location', 'summary', 'skills'].forEach(field => {
    const el = document.getElementById(field);
    if (el) el.value = resumeData[field] || '';
  });
  renderExperienceFields();
  renderEducationFields();
  renderPreview();
}

function applyAIBuild() {
  if (!resumeData.title?.trim()) throw Object.assign(new Error('need_title'), { hint: 'Add your job title first' });
  const built = AIEngine.buildFullResume(resumeData);
  resumeData.summary = built.summary;
  resumeData.skills = built.skills;
  resumeData.experience = built.experience;
  resumeData.education = built.education;
  saveData();
  syncFormFields();
}

function showTextModal(title, content, readonly = true) {
  let modal = document.getElementById('text-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'text-modal';
    modal.className = 'hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70';
    modal.innerHTML = `
      <div class="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col">
        <h3 id="text-modal-title" class="text-lg font-bold mb-3"></h3>
        <textarea id="text-modal-content" class="flex-1 w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none min-h-[240px]"></textarea>
        <div class="flex gap-2 mt-4">
          <button data-action="copy-modal-text" class="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold">Copy to Clipboard</button>
          <button data-action="close-text-modal" class="px-6 py-2.5 border border-white/10 rounded-xl text-sm text-zinc-400 hover:text-white">Close</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('text-modal-title').textContent = title;
  const ta = document.getElementById('text-modal-content');
  ta.value = content;
  ta.readOnly = readonly;
  modal.classList.remove('hidden');
}

function hideTextModal() {
  document.getElementById('text-modal')?.classList.add('hidden');
}

function promptJobDescription() {
  return new Promise(resolve => {
    let modal = document.getElementById('job-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'job-modal';
      modal.className = 'hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70';
      modal.innerHTML = `
        <div class="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full">
          <h3 class="text-lg font-bold mb-2">Paste Job Description</h3>
          <p class="text-zinc-400 text-sm mb-3">Smart suggestions will align keywords and bullet emphasis to this role. You review and edit every change.</p>
          <textarea id="job-desc-input" rows="8" placeholder="Paste the full job posting here..." class="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none mb-4"></textarea>
          <div class="flex gap-2">
            <button type="button" id="job-match-submit" class="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold">Get suggestions</button>
            <button type="button" id="job-match-cancel" class="px-5 py-2.5 border border-white/10 rounded-xl text-sm text-zinc-400">Cancel</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#job-match-submit').onclick = () => {
        const text = document.getElementById('job-desc-input').value;
        modal.classList.add('hidden');
        resolve(text);
      };
      modal.querySelector('#job-match-cancel').onclick = () => {
        modal.classList.add('hidden');
        resolve(null);
      };
    }
    document.getElementById('job-desc-input').value = '';
    modal.classList.remove('hidden');
  });
}

function showATSReport() {
  const { score, tips } = AIEngine.analyzeATS(resumeData);
  const report = `Completeness score: ${score}%\n\nSuggestions:\n${tips.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nThis is guidance based on your content. This is not a guarantee of ATS results. Keep formatting simple, use standard section headings, and mirror keywords from the job description.`;
  showTextModal('Resume Checklist', report);
}

function showCoverLetter() {
  const letter = AIEngine.generateCoverLetter(resumeData);
  showTextModal('Cover Letter Draft', letter, false);
}

function showLinkedInTips() {
  const roleId = AIEngine.detectRole(resumeData.title, resumeData.skills, resumeData.summary);
  const tips = [
    `Headline: ${resumeData.title || 'Your Role'} | ${getSkillsArray().slice(0, 2).join(' · ') || 'Key Skills'}`,
    `About (first 2 lines): ${(resumeData.summary || '').slice(0, 220)}...`,
    `Featured skills to pin: ${getSkillsArray().slice(0, 5).join(', ') || 'Add skills in builder'}`,
    `Experience bullets: Use the same quantified achievements from your resume for consistency.`,
    `Keyword boost for ${roleId} roles: ${AIEngine.extractKeywords(resumeData.skills + ' ' + resumeData.title).slice(0, 8).join(', ')}`
  ].join('\n\n');
  showTextModal('LinkedIn Profile Tips', tips);
}

function renderThemed(id, variant = 'default') {
  const name = escapeHtml(resumeData.name || 'Your Name');
  const title = escapeHtml(resumeData.title || 'Professional Title');
  const contact = getContactItems().map(c => escapeHtml(c.value)).join(' · ');

  let header = '';
  if (variant === 'corp') {
    header = `<div class="tm-corp-bar"><h1 class="tm-themed-name">${name}</h1><p class="tm-themed-title">${title}</p><div class="tm-themed-contact">${contact}</div></div>`;
  } else if (variant === 'tech') {
    header = `<div class="tm-tech-bar"><span class="tm-tech-dot" style="background:#ef4444"></span><span class="tm-tech-dot" style="background:#eab308"></span><span class="tm-tech-dot" style="background:#22c55e"></span></div><div class="tm-tech-header"><h1 class="tm-themed-name">${name}</h1><p class="tm-themed-title">${title}</p><div class="tm-themed-contact">${contact}</div></div>`;
  } else if (variant === 'luxury') {
    header = `<div class="tm-luxury-header"><h1 class="tm-themed-name">${name}</h1><p class="tm-themed-title">${title}</p><div class="tm-themed-contact">${contact}</div></div>`;
  } else if (variant === 'intl') {
    header = `<div class="tm-intl-header"><h1 class="tm-themed-name">${name}</h1><p class="tm-themed-title">${title}</p><div class="tm-themed-contact">${contact}</div></div>`;
  } else if (variant === 'harvard') {
    header = `<div class="tm-harvard-rule"></div><div class="tm-themed-header"><h1 class="tm-themed-name">${name}</h1><p class="tm-themed-title">${title}</p><div class="tm-themed-contact">${contact}</div></div>`;
  } else {
    header = `<div class="tm-themed-header"><h1 class="tm-themed-name">${name}</h1><p class="tm-themed-title">${title}</p><div class="tm-themed-contact">${contact}</div></div>`;
  }

  const body = renderBodyCore() + renderSkillsSection(id);

  return `<div class="tm-themed tm-${id}">${header}${body}</div>`;
}

function normalizeTemplate(tpl) {
  if (!tpl || !TEMPLATE_RENDERERS[tpl]) return 'modern';
  return tpl;
}

function getTemplateOrientation(tpl) {
  const id = normalizeTemplate(tpl);
  return window.TEMPLATE_EXTENSIONS?.getOrientation?.(id) || 'portrait';
}

function getTemplatePageSize(tpl) {
  const id = normalizeTemplate(tpl);
  return window.TEMPLATE_EXTENSIONS?.getPageSize?.(id)
    || (getTemplateOrientation(id) === 'landscape'
      ? { orientation: 'landscape', width: 1056, height: 816 }
      : { orientation: 'portrait', width: 816, height: 1056 });
}

function getPreviewClassName(tpl) {
  const id = normalizeTemplate(tpl);
  const orient = getTemplateOrientation(id);
  return `resume-preview page-preview orientation-${orient} template-${id}`;
}

function isPreviewPanelVisible() {
  const panel = document.getElementById('preview-panel');
  if (!panel) return true;
  if (window.innerWidth >= 768) return true;
  return !panel.classList.contains('hidden');
}

function getPreviewContainerWidth() {
  const frame = document.getElementById('preview-frame');
  if (frame?.clientWidth > 0) return frame.clientWidth;

  const panel = document.getElementById('preview-panel');
  if (panel?.clientWidth > 0) {
    const style = window.getComputedStyle(panel);
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    return Math.max(panel.clientWidth - padX, 0);
  }

  const vp = window.visualViewport?.width || window.innerWidth;
  return Math.max(vp - 48, 280);
}

function schedulePreviewScale() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => updatePreviewScale());
  });
}

function updatePreviewScale() {
  const frame = document.getElementById('preview-frame');
  const outer = document.getElementById('preview-scale-outer');
  const wrap = document.getElementById('preview-scale-wrap');
  const preview = document.getElementById('resume-preview');
  if (!frame || !outer || !wrap || !preview) return;
  if (!isPreviewPanelVisible()) return;

  const tpl = normalizeTemplate(resumeData.template);
  const pageWidth = getTemplatePageSize(tpl).width;

  wrap.style.transform = 'none';
  wrap.style.width = `${pageWidth}px`;
  wrap.style.minWidth = `${pageWidth}px`;
  wrap.style.margin = '0';

  const available = Math.max(getPreviewContainerWidth() - 4, 120);
  const scale = available < pageWidth ? available / pageWidth : 1;
  const contentHeight = Math.max(preview.offsetHeight, preview.scrollHeight, 1);

  if (scale < 1) {
    const scaledW = Math.ceil(pageWidth * scale);
    const scaledH = Math.ceil(contentHeight * scale);

    outer.style.width = `${scaledW}px`;
    outer.style.height = `${scaledH}px`;
    outer.style.margin = '0 auto';
    outer.style.overflow = 'hidden';

    wrap.style.transform = `scale(${scale})`;
    wrap.style.transformOrigin = 'top left';
    frame.style.minHeight = `${scaledH + 4}px`;
  } else {
    outer.style.width = `${pageWidth}px`;
    outer.style.height = 'auto';
    outer.style.margin = '0 auto';
    outer.style.overflow = 'visible';

    wrap.style.transform = 'none';
    frame.style.minHeight = '';
  }
}

function renderPreview(resetScroll = false) {
  const preview = document.getElementById('resume-preview');
  if (!preview) return;

  const tpl = normalizeTemplate(resumeData.template);
  const renderer = TEMPLATE_RENDERERS[tpl];
  preview.className = getPreviewClassName(tpl);

  try {
    preview.innerHTML = renderer();
  } catch (err) {
    console.error('Preview render failed:', err);
    preview.innerHTML = TEMPLATE_RENDERERS.modern();
    preview.className = getPreviewClassName('modern');
  }

  const scoreEl = document.getElementById('ats-score');
  if (scoreEl) scoreEl.textContent = calculateAtsScore() + '%';

  schedulePreviewScale();
  if (resetScroll) {
    const scrollEl = isMobileEditor()
      ? document.getElementById('preview-panel')
      : document.getElementById('preview-frame');
    if (scrollEl) scrollEl.scrollTop = 0;
  }
}

let previewUpdateTimer = null;
let previewStale = false;
let editorScrollSnapshot = null;

function isMobileEditor() {
  return window.innerWidth < 768;
}

function isEditTabActive() {
  const editor = document.getElementById('editor-panel');
  return editor && !editor.classList.contains('hidden');
}

function captureEditorScroll() {
  const editor = document.getElementById('editor-panel');
  if (!editor) return;
  editorScrollSnapshot = {
    top: editor.scrollTop,
    el: document.activeElement
  };
}

function restoreEditorScroll() {
  if (!editorScrollSnapshot) return;
  const editor = document.getElementById('editor-panel');
  const { top, el } = editorScrollSnapshot;
  if (editor) editor.scrollTop = top;
  if (el && el.focus && document.contains(el)) {
    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
  }
}

function schedulePreviewUpdate() {
  if (isMobileEditor() && isEditTabActive()) {
    previewStale = true;
    return;
  }
  captureEditorScroll();
  clearTimeout(previewUpdateTimer);
  previewUpdateTimer = setTimeout(() => {
    renderPreview(false);
    requestAnimationFrame(restoreEditorScroll);
  }, 400);
}

function setupMobileScrollGuard() {
  const editor = document.getElementById('editor-panel');
  if (!editor) return;

  editor.addEventListener('focusin', (e) => {
    if (e.target.matches('input, textarea, select')) captureEditorScroll();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (document.activeElement?.closest('#editor-panel')) {
        requestAnimationFrame(restoreEditorScroll);
      }
    });
  }
}

// ─── Form UI ───

function bindInput(id, field) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = resumeData[field] || '';
  el.addEventListener('input', () => {
    resumeData[field] = el.value;
    captureEditorScroll();
    saveData();
    schedulePreviewUpdate();
    requestAnimationFrame(restoreEditorScroll);
  });
}

function renderExperienceFields() {
  const container = document.getElementById('experience-list');
  if (!container) return;
  container.innerHTML = resumeData.experience.map((exp, i) => `
    <div class="exp-block bg-zinc-800/50 p-4 rounded-xl border border-white/5 space-y-3">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-zinc-400">Position ${i + 1}</span>
        ${resumeData.experience.length > 1 ? `<button type="button" data-action="remove-exp" data-index="${i}" class="text-zinc-500 hover:text-red-400 text-sm"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
      <input type="text" data-exp="${i}" data-field="role" placeholder="Job Title" value="${escapeHtml(exp.role)}" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
      <input type="text" data-exp="${i}" data-field="company" placeholder="Company" value="${escapeHtml(exp.company)}" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
      <input type="text" data-exp="${i}" data-field="dates" placeholder="Dates (e.g. Jan 2020 - Present)" value="${escapeHtml(exp.dates)}" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
      <textarea data-exp="${i}" data-field="description" placeholder="Key achievements (one per line)..." rows="4" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white resize-none">${escapeHtml(exp.description)}</textarea>
      <button type="button" data-action="enhance-exp" data-index="${i}" class="ai-btn flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold transition">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Suggest improvements
      </button>
    </div>
  `).join('');
}

function renderEducationFields() {
  const container = document.getElementById('education-list');
  if (!container) return;
  container.innerHTML = resumeData.education.map((edu, i) => `
    <div class="edu-block bg-zinc-800/50 p-4 rounded-xl border border-white/5 space-y-3">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-zinc-400">Education ${i + 1}</span>
        ${resumeData.education.length > 1 ? `<button type="button" data-action="remove-edu" data-index="${i}" class="text-zinc-500 hover:text-red-400 text-sm"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
      <input type="text" data-edu="${i}" data-field="degree" placeholder="Degree" value="${escapeHtml(edu.degree)}" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
      <input type="text" data-edu="${i}" data-field="school" placeholder="School / University" value="${escapeHtml(edu.school)}" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
      <input type="text" data-edu="${i}" data-field="year" placeholder="Year" value="${escapeHtml(edu.year)}" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
    </div>
  `).join('');
}

function selectTemplate(template) {
  if (!TEMPLATE_RENDERERS[template]) return;
  resumeData.template = template;
  saveData();
  document.querySelectorAll('.template-btn').forEach(btn => {
    const active = btn.dataset.template === template;
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-emerald-400', active);
    btn.classList.toggle('opacity-60', !canAccessTemplate(btn.dataset.template));
  });
  renderPreview(true);
  if (!PREVIEW_ALL_TEMPLATES && !canAccessTemplate(template)) {
    showUpgradeModal(`${TIER_LABELS[getTemplateTier(template)]} templates`);
  }
}

function showUpgradeModal(feature) {
  if (UNLIMITED_AI) return;
  document.getElementById('upgrade-feature').textContent = feature || 'This feature';
  const modalCredits = document.getElementById('modal-credits');
  if (modalCredits) modalCredits.textContent = getCredits();
  document.getElementById('upgrade-modal').classList.remove('hidden');
}

function hideUpgradeModal() {
  document.getElementById('upgrade-modal').classList.add('hidden');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-medium z-50 shadow-xl ${type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'} text-white`;
  toast.classList.remove('hidden', 'opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function switchTab(tab) {
  const editor = document.getElementById('editor-panel');
  const preview = document.getElementById('preview-panel');
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    editor.classList.toggle('hidden', tab !== 'edit');
    preview.classList.toggle('hidden', tab !== 'preview');
    if (tab === 'preview') {
      preview.classList.remove('hidden');
      preview.classList.add('block');
    } else {
      preview.classList.add('hidden');
      preview.classList.remove('block');
    }
  } else {
    editor.classList.remove('hidden');
    preview.classList.remove('hidden');
    preview.classList.add('md:block');
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('bg-emerald-500', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('text-zinc-400', !active);
  });
  if (tab === 'preview') {
    previewStale = false;
    renderPreview(true);
    schedulePreviewScale();
    setTimeout(schedulePreviewScale, 50);
  }
}

const EXPORT_SCALE = 2;

let pendingExport = null;

function getExportBaseName() {
  const base = (resumeData.name || 'resume').replace(/[^\w\-]+/g, '_').replace(/_+/g, '_');
  return base || 'resume';
}

function isMobileIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function clearPendingExport() {
  if (pendingExport?.url) URL.revokeObjectURL(pendingExport.url);
  pendingExport = null;
}

function showExportSaveModal(blob, filename, format) {
  clearPendingExport();
  const url = URL.createObjectURL(blob);
  pendingExport = { blob, filename, url, format, mime: blob.type || 'application/octet-stream' };

  const modal = document.getElementById('export-save-modal');
  const link = document.getElementById('export-save-link');
  const icon = document.getElementById('export-save-icon');
  const iconWrap = document.getElementById('export-save-icon-wrap');
  const printBtn = document.getElementById('export-print-btn');
  const iosSteps = document.getElementById('export-ios-steps');

  document.getElementById('export-save-filename').textContent = filename;
  if (link) {
    link.href = url;
    link.download = filename;
    link.textContent = format === 'pdf' ? 'Open PDF preview'
      : ['doc', 'html', 'rtf'].includes(format) ? `Open ${format === 'doc' ? 'Word' : format.toUpperCase()} file`
      : `Open ${(format || '').toUpperCase()} preview`;
  }
  if (icon) {
    const icons = {
      pdf: 'fa-solid fa-file-pdf',
      png: 'fa-solid fa-image',
      jpeg: 'fa-solid fa-file-image',
      doc: 'fa-solid fa-file-word',
      html: 'fa-solid fa-code',
      rtf: 'fa-solid fa-file-lines'
    };
    icon.className = icons[format] || 'fa-solid fa-file';
  }
  if (iconWrap) {
    const variants = {
      pdf: 'icon-red',
      png: 'icon-blue',
      jpeg: 'icon-amber',
      doc: 'icon-blue',
      html: '',
      rtf: ''
    };
    iconWrap.className = `icon-wrap icon-wrap-export mx-auto ${variants[format] || ''}`.trim();
  }
  if (printBtn) printBtn.classList.toggle('hidden', format !== 'pdf');
  if (iosSteps) iosSteps.classList.toggle('hidden', !isMobileIOS());

  modal?.classList.remove('hidden');
}

function hideExportSaveModal() {
  document.getElementById('export-save-modal')?.classList.add('hidden');
}

async function sharePendingExport() {
  if (!pendingExport) return;
  const file = new File(
    [pendingExport.blob],
    pendingExport.filename,
    { type: pendingExport.mime }
  );

  if (navigator.share) {
    try {
      const payload = { files: [file], title: pendingExport.filename };
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload);
        hideExportSaveModal();
        showToast('Saved. Check your Files app');
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.warn('Share failed:', err);
    }
  }

  window.open(pendingExport.url, '_blank');
  showToast('Tap Share (↑) then Save to Files', 'warning');
}

function openPendingExport() {
  if (!pendingExport?.url) return;
  window.open(pendingExport.url, '_blank');
  if (isMobileIOS()) showToast('Tap Share (↑) → Save to Files → pick folder', 'warning');
}

function printResumePdf() {
  hideExportSaveModal();
  switchTab('preview');
  renderPreview();
  setTimeout(() => window.print(), 400);
}

async function deliverExport(blob, filename, format) {
  if (isMobileIOS()) {
    showExportSaveModal(blob, filename, format);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function getExportBackgroundColor(clone, doc = document) {
  const themed = clone.querySelector('[class*="tm-"]');
  if (!themed) return '#ffffff';
  const win = doc.defaultView || window;
  const bg = win.getComputedStyle(themed).backgroundColor;
  return bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff';
}

async function prepareExportFrame() {
  const tpl = normalizeTemplate(resumeData.template);
  const renderer = TEMPLATE_RENDERERS[tpl];
  if (!renderer) throw new Error('Template not found');

  const pageSize = getTemplatePageSize(tpl);
  const orient = pageSize.orientation;
  const previewClass = `resume-preview page-preview orientation-${orient} resume-export-clone template-${tpl}`;

  document.documentElement.classList.add('export-capture');

  const cssText = window.EXPORT_EDITABLE
    ? await window.EXPORT_EDITABLE.fetchExportCss()
    : '';

  let iframe = document.getElementById('resume-export-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'resume-export-iframe';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
  }

  iframe.style.cssText = [
    'position:fixed', 'left:0', 'top:0', `width:${pageSize.width}px`, 'border:0',
    'opacity:0', 'pointer-events:none', 'z-index:-1', 'overflow:hidden'
  ].join(';');

  const bodyHtml = renderer();
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!DOCTYPE html><html class="export-iframe"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=${pageSize.width}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
    <style>${cssText}</style>
  </head><body style="margin:0;padding:0;width:${pageSize.width}px;background:#fff;">
    <div id="resume-export-clone" class="${previewClass}">${bodyHtml}</div>
  </body></html>`);
  doc.close();

  if (doc.fonts?.ready) await doc.fonts.ready;
  await new Promise(r => setTimeout(r, 450));

  const clone = doc.getElementById('resume-export-clone');
  applyExportCaptureFixes(clone);

  void clone.offsetHeight;
  const contentHeight = Math.max(Math.ceil(clone.scrollHeight), Math.ceil(clone.offsetHeight), 1);
  iframe.style.height = `${contentHeight}px`;

  const bgColor = getExportBackgroundColor(clone, doc);
  return { iframe, clone, contentHeight, bgColor, tpl, bodyHtml, doc, pageSize };
}

function cleanupExportFrame(iframe) {
  document.documentElement.classList.remove('export-capture');
  if (iframe) {
    iframe.style.height = '0';
    iframe.style.width = '0';
  }
}

function applyExportCaptureFixes(root) {
  root.querySelectorAll('i').forEach(el => { el.style.display = 'none'; });
  root.querySelectorAll('[class*="tm-"]').forEach(el => {
    el.style.boxSizing = 'border-box';
  });
}

function blobFromCanvas(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed to create image')), type, quality);
  });
}

function sliceCanvas(canvas, offsetY, sliceHeight, fillColor = '#ffffff') {
  const slice = document.createElement('canvas');
  slice.width = canvas.width;
  slice.height = sliceHeight;
  const ctx = slice.getContext('2d');
  ctx.fillStyle = fillColor;
  ctx.fillRect(0, 0, slice.width, slice.height);
  ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
  return slice;
}

async function captureResumeCanvas(clone, bgColor, contentHeight, doc = document, pageWidth = 816) {
  if (typeof html2canvas !== 'function') throw new Error('Export library not loaded. Please refresh the page.');
  applyExportCaptureFixes(clone);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const height = contentHeight || Math.max(clone.scrollHeight, clone.offsetHeight, 1);
  return html2canvas(clone, {
    scale: EXPORT_SCALE,
    width: pageWidth,
    height,
    windowWidth: pageWidth,
    windowHeight: height,
    useCORS: true,
    allowTaint: true,
    backgroundColor: bgColor === 'rgba(0, 0, 0, 0)' ? null : bgColor,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    foreignObjectRendering: false,
    onclone: (_doc, clonedEl) => applyExportCaptureFixes(clonedEl)
  });
}

async function saveCanvasAsPdf(canvas, filename, fillColor = '#ffffff', orientation = 'portrait') {
  if (!window.jspdf?.jsPDF) throw new Error('PDF library not loaded. Please refresh the page.');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'letter', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pxToPt = pageWidth / canvas.width;
  const pageSlicePx = Math.floor(pageHeight / pxToPt);
  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < canvas.height) {
    if (pageIndex > 0) pdf.addPage();
    const sliceHeight = Math.min(pageSlicePx, canvas.height - offsetY);
    const slice = sliceCanvas(canvas, offsetY, sliceHeight, fillColor);
    const displayH = sliceHeight * pxToPt;
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, displayH);
    offsetY += sliceHeight;
    pageIndex++;
  }

  const blob = pdf.output('blob');
  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  await deliverExport(pdfBlob, filename, 'pdf');
}

const EXPORT_CREDIT_MAP = {
  pdf: 'export_pdf', png: 'export_png', jpeg: 'export_jpeg',
  doc: 'export_doc', html: 'export_html', rtf: 'export_rtf'
};
const EXPORT_EXT_MAP = { pdf: 'pdf', png: 'png', jpeg: 'jpg', doc: 'doc', html: 'html', rtf: 'rtf' };
const EXPORT_LABEL_MAP = { pdf: 'PDF', png: 'PNG', jpeg: 'JPEG', doc: 'Word', html: 'HTML', rtf: 'RTF' };
const EDITABLE_FORMATS = new Set(['doc', 'html', 'rtf']);

async function exportEditableResume(format, tpl, bodyHtml, baseName) {
  if (!window.EXPORT_EDITABLE) throw new Error('Editable export module not loaded.');
  const ext = EXPORT_EXT_MAP[format];
  const filename = `${baseName}_resume.${ext}`;

  if (format === 'html') {
    const html = await window.EXPORT_EDITABLE.buildEditableHtml(tpl, bodyHtml);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    await deliverExport(blob, filename, 'html');
  } else if (format === 'doc') {
    const html = await window.EXPORT_EDITABLE.buildWordDocument(tpl, bodyHtml);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    await deliverExport(blob, filename, 'doc');
  } else if (format === 'rtf') {
    const rtf = window.EXPORT_EDITABLE.buildRtfDocument(tpl, bodyHtml);
    const blob = new Blob([rtf], { type: 'application/rtf' });
    await deliverExport(blob, filename, 'rtf');
  }
}

async function exportResume(format = 'pdf') {
  const creditKey = EXPORT_CREDIT_MAP[format] || 'export_pdf';
  const creditCost = CREDIT_COSTS[creditKey] || 3;
  const label = EXPORT_LABEL_MAP[format] || 'File';

  const tpl = normalizeTemplate(resumeData.template);
  if (!PREVIEW_ALL_TEMPLATES && !canAccessTemplate(tpl)) {
    showUpgradeModal(`${TIER_LABELS[getTemplateTier(tpl)]} templates`);
    return;
  }

  if (!(await useCredits(creditCost, `${label} export`))) return;

  const menuBtn = document.querySelector('[data-action="toggle-export-menu"]');
  const originalBtn = menuBtn?.innerHTML;
  if (menuBtn) {
    menuBtn.disabled = true;
    menuBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
  }
  hideExportMenu();

  if (window.innerWidth < 768) switchTab('preview');
  renderPreview();

  const source = document.getElementById('resume-preview');
  if (!source) {
    if (!UNLIMITED_AI) setCredits(getCredits() + creditCost);
    showToast('Preview not found. Credits refunded', 'warning');
    if (menuBtn) { menuBtn.disabled = false; menuBtn.innerHTML = originalBtn; }
    return;
  }

  let iframe = null;
  try {
    const baseName = getExportBaseName();
    const ext = EXPORT_EXT_MAP[format] || 'pdf';
    const filename = `${baseName}_resume.${ext}`;
    const tpl = normalizeTemplate(resumeData.template);
    const renderer = TEMPLATE_RENDERERS[tpl];

    if (EDITABLE_FORMATS.has(format)) {
      const bodyHtml = renderer();
      await exportEditableResume(format, tpl, bodyHtml, baseName);
    } else {
      const frame = await prepareExportFrame();
      iframe = frame.iframe;
      const { clone, contentHeight, bgColor, doc, pageSize } = frame;
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas = await captureResumeCanvas(clone, bgColor, contentHeight, doc, pageSize.width);

      if (format === 'pdf') {
        await saveCanvasAsPdf(canvas, filename, bgColor, pageSize.orientation);
      } else if (format === 'png') {
        const blob = await blobFromCanvas(canvas, 'image/png');
        await deliverExport(blob, filename, 'png');
      } else if (format === 'jpeg') {
        const blob = await blobFromCanvas(canvas, 'image/jpeg', 0.92);
        await deliverExport(blob, filename, 'jpeg');
      }
    }

    const creditMsg = UNLIMITED_AI ? '' : ` (−${creditCost} credits)`;
    if (isMobileIOS()) {
      showToast(`Tap Save to Files to download${creditMsg}`);
    } else {
      showToast(`${label} downloaded: ${filename}${creditMsg}`);
    }
  } catch (err) {
    console.error('Export failed:', err);
    if (!UNLIMITED_AI) setCredits(getCredits() + creditCost);
    showToast(`Export failed: ${err.message || 'please try again'}`, 'warning');
  } finally {
    cleanupExportFrame(iframe);
    if (menuBtn) {
      menuBtn.disabled = false;
      menuBtn.innerHTML = originalBtn;
    }
  }
}

function toggleExportMenu() {
  document.getElementById('export-menu')?.classList.toggle('hidden');
}

function hideExportMenu() {
  document.getElementById('export-menu')?.classList.add('hidden');
}

async function exportPDF() {
  return exportResume('pdf');
}

// ─── Event Delegation ───

function setupEvents() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const index = parseInt(btn.dataset.index, 10);

    switch (action) {
      case 'enhance-summary':
        await runAIEnhance(btn, async (live) => {
          if (live) {
            const data = await ProResumeAPI.aiGenerate('enhance_summary', { resume: snapshotResume() });
            resumeData.summary = data.result.summary;
            syncCreditsFromServer(data.credits);
          } else {
            resumeData.summary = enhanceSummaryAI(resumeData.summary, resumeData.title, resumeData.skills);
          }
          document.getElementById('summary').value = resumeData.summary;
          saveData();
          renderPreview();
        }, CREDIT_COSTS.enhance_summary, 'summary suggestions', true, 'enhance_summary');
        break;

      case 'enhance-exp':
        await runAIEnhance(btn, async (live) => {
          const exp = resumeData.experience[index];
          if (!exp) throw new Error('empty');
          if (live) {
            const data = await ProResumeAPI.aiGenerate('enhance_exp', {
              resume: snapshotResume(),
              experienceIndex: index
            });
            exp.description = data.result.description;
            syncCreditsFromServer(data.credits);
          } else {
            exp.description = enhanceDescriptionAI(exp.description || '', exp.role || resumeData.title);
          }
          saveData();
          renderExperienceFields();
          renderPreview();
        }, CREDIT_COSTS.enhance_exp, 'experience suggestions', true, 'enhance_exp');
        break;

      case 'regenerate-summary':
        await runAIEnhance(btn, async (live) => {
          if (live) {
            const data = await ProResumeAPI.aiGenerate('regenerate_summary', {
              resume: snapshotResume(),
              regenerate: true
            });
            resumeData.summary = data.result.summary;
            syncCreditsFromServer(data.credits);
          } else {
            resumeData.summary = enhanceSummaryAI(resumeData.summary, resumeData.title, resumeData.skills);
          }
          document.getElementById('summary').value = resumeData.summary;
          saveData();
          renderPreview();
        }, CREDIT_COSTS.regenerate, 'summary variation', true, 'regenerate_summary');
        break;

      case 'build-resume':
        await runAIEnhance(btn, async (live) => {
          if (!resumeData.title?.trim()) throw Object.assign(new Error('need_title'), { hint: 'Add your job title first' });
          if (live) {
            const data = await ProResumeAPI.aiGenerate('build_resume', { resume: snapshotResume() });
            resumeData.summary = data.result.summary;
            resumeData.skills = data.result.skills;
            if (Array.isArray(data.result.experience) && data.result.experience.length) {
              resumeData.experience = data.result.experience;
            }
            if (Array.isArray(data.result.education) && data.result.education.length) {
              resumeData.education = data.result.education;
            }
            syncCreditsFromServer(data.credits);
            saveData();
            syncFormFields();
          } else {
            applyAIBuild();
          }
        }, CREDIT_COSTS.build_resume, 'resume draft', true, 'build_resume');
        break;

      case 'suggest-skills':
        await runAIEnhance(btn, async (live) => {
          if (!resumeData.title?.trim()) throw Object.assign(new Error('need_title'));
          if (live) {
            const data = await ProResumeAPI.aiGenerate('suggest_skills', { resume: snapshotResume() });
            resumeData.skills = data.result.skills;
            syncCreditsFromServer(data.credits);
          } else {
            resumeData.skills = AIEngine.suggestSkills(resumeData.title, resumeData.skills);
          }
          document.getElementById('skills').value = resumeData.skills;
          saveData();
          renderPreview();
        }, CREDIT_COSTS.suggest_skills, 'skill suggestions', true, 'suggest_skills');
        break;

      case 'remove-exp':
        resumeData.experience.splice(index, 1);
        saveData();
        renderExperienceFields();
        renderPreview();
        break;

      case 'add-exp':
        resumeData.experience.push({ company: '', role: '', dates: '', description: '' });
        renderExperienceFields();
        break;

      case 'remove-edu':
        resumeData.education.splice(index, 1);
        saveData();
        renderEducationFields();
        renderPreview();
        break;

      case 'add-edu':
        resumeData.education.push({ school: '', degree: '', year: '' });
        renderEducationFields();
        break;

      case 'select-template':
        selectTemplate(btn.dataset.template);
        break;

      case 'toggle-export-menu':
        toggleExportMenu();
        break;

      case 'export-resume':
        await exportResume(btn.dataset.format || 'pdf');
        break;

      case 'export-save-share':
        await sharePendingExport();
        break;

      case 'export-save-print':
        printResumePdf();
        break;

      case 'export-save-close':
        hideExportSaveModal();
        break;

      case 'export-pdf':
        await exportResume('pdf');
        break;
      case 'hide-upgrade': hideUpgradeModal(); break;
      case 'show-pricing': window.location.href = '/pricing.html'; break;
      case 'match-job':
        await runAIEnhance(btn, async (live) => {
          const jobText = await promptJobDescription();
          if (!jobText?.trim()) {
            if (!live && !UNLIMITED_AI) setCredits(getCredits() + CREDIT_COSTS.job_match);
            throw Object.assign(new Error('empty'), { hint: 'Cancelled' });
          }
          if (live) {
            const data = await ProResumeAPI.aiGenerate('job_match', {
              resume: snapshotResume(),
              jobText
            });
            resumeData.summary = data.result.summary;
            resumeData.skills = data.result.skills;
            resumeData.experience = data.result.experience;
            syncCreditsFromServer(data.credits);
            saveData();
            syncFormFields();
            showToast(`Suggestions applied (${data.result.keywordOverlap}% keyword overlap)`, 'success');
          } else {
            const matched = AIEngine.matchJobDescription(resumeData, jobText);
            resumeData.summary = matched.summary;
            resumeData.skills = matched.skills;
            resumeData.experience = matched.experience;
            saveData();
            syncFormFields();
            showToast(`Suggestions applied (${matched.matchScore}% keyword overlap)`, 'success');
          }
        }, CREDIT_COSTS.job_match, 'keyword alignment', false, 'job_match');
        break;

      case 'cover-letter':
        await runAIEnhance(btn, async (live) => {
          if (!resumeData.name?.trim() || !resumeData.title?.trim()) {
            throw Object.assign(new Error('need_title'), { hint: 'Add your name and title first' });
          }
          if (live) {
            const data = await ProResumeAPI.aiGenerate('cover_letter', { resume: snapshotResume() });
            syncCreditsFromServer(data.credits);
            showTextModal('Cover Letter Draft', data.result.text, false);
          } else {
            showCoverLetter();
          }
        }, CREDIT_COSTS.cover_letter, 'cover letter draft', true, 'cover_letter');
        break;

      case 'ats-scan':
        await runAIEnhance(btn, () => showATSReport(), CREDIT_COSTS.ats_scan, 'resume checklist', false);
        break;

      case 'linkedin':
        await runAIEnhance(btn, async (live) => {
          if (live) {
            const data = await ProResumeAPI.aiGenerate('linkedin_tips', { resume: snapshotResume() });
            syncCreditsFromServer(data.credits);
            showTextModal('LinkedIn Profile Tips', data.result.text);
          } else {
            showLinkedInTips();
          }
        }, CREDIT_COSTS.linkedin, 'LinkedIn profile tips', true, 'linkedin_tips');
        break;

      case 'copy-modal-text':
        navigator.clipboard?.writeText(document.getElementById('text-modal-content')?.value || '');
        showToast('Copied to clipboard');
        break;

      case 'close-text-modal': hideTextModal(); break;
      case 'switch-tab': switchTab(btn.dataset.tab); break;
    }
  });

  document.addEventListener('input', (e) => {
    const exp = e.target.dataset.exp;
    const edu = e.target.dataset.edu;
    const field = e.target.dataset.field;
    if (exp !== undefined && field) {
      resumeData.experience[+exp][field] = e.target.value;
      captureEditorScroll();
      saveData();
      schedulePreviewUpdate();
      requestAnimationFrame(restoreEditorScroll);
    }
    if (edu !== undefined && field) {
      resumeData.education[+edu][field] = e.target.value;
      captureEditorScroll();
      saveData();
      schedulePreviewUpdate();
      requestAnimationFrame(restoreEditorScroll);
    }
  });
}

function renderTemplatePicker() {
  const grid = document.getElementById('template-grid');
  const label = document.getElementById('template-count-label');
  const catalog = window.TEMPLATE_EXTENSIONS?.catalog;
  if (!grid || !catalog?.length) return;

  const accessible = countAccessibleTemplates();
  if (label) {
    label.textContent = PREVIEW_ALL_TEMPLATES
      ? `${catalog.length} professional designs (all unlocked for preview)`
      : accessible >= catalog.length
        ? `${catalog.length} professional designs`
        : `${catalog.length} designs, ${accessible} on your plan`;
  }

  grid.innerHTML = catalog.map(t => {
    const orient = window.TEMPLATE_EXTENSIONS?.getOrientation?.(t.id) || 'portrait';
    const thumbClass = orient === 'landscape' ? 'tpl-thumb-landscape' : 'tpl-thumb-portrait';
    const locked = !PREVIEW_ALL_TEMPLATES && !canAccessTemplate(t.id);
    return `
    <button data-action="select-template" data-template="${t.id}" class="template-btn p-2 bg-zinc-800 rounded-lg border border-white/10 text-center relative${locked ? ' opacity-60' : ''}" title="${t.label}${locked ? ' (upgrade to unlock)' : ''}">
      ${locked ? '<span class="absolute top-1 right-1 text-[8px] text-zinc-400" aria-hidden="true"><i class="fa-solid fa-lock"></i></span>' : ''}
      <div class="tpl-thumb ${thumbClass} tpl-thumb-${t.id}"></div>
      <span class="text-[9px] font-medium leading-tight">${t.label}</span>
    </button>`;
  }).join('');
}

function refreshTemplateAccess() {
  renderTemplatePicker();
  document.querySelectorAll('.template-btn').forEach(btn => {
    const active = btn.dataset.template === resumeData.template;
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-emerald-400', active);
    btn.classList.toggle('opacity-60', !canAccessTemplate(btn.dataset.template));
  });
}

async function init() {
  updateAuthHeader();
  showCloudSaveBanner();
  await refreshLiveAiStatus();
  if (window.ProResumeAPI?.isLoggedIn()) {
    await refreshCloudUser();
    const loaded = await loadFromCloud();
    if (loaded) syncFormFields();
    await mergeLocalToCloud();
  }

  renderTemplatePicker();
  resumeData.template = normalizeTemplate(resumeData.template);

  bindInput('name', 'name');
  bindInput('title', 'title');
  bindInput('email', 'email');
  bindInput('phone', 'phone');
  bindInput('location', 'location');
  bindInput('summary', 'summary');
  bindInput('skills', 'skills');

  renderExperienceFields();
  renderEducationFields();
  selectTemplate(resumeData.template);
  renderPreview();
  updateCreditsDisplay();
  setupEvents();
  setupMobileScrollGuard();
  window.addEventListener('proresume:auth', () => {
    refreshCloudUser();
  });

  let resizeTimer;
  const onViewportChange = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(schedulePreviewScale, 100);
  };
  window.addEventListener('resize', onViewportChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
    window.visualViewport.addEventListener('scroll', onViewportChange);
  }

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('export-menu-wrap');
    if (wrap && !wrap.contains(e.target)) hideExportMenu();
  });
}

document.addEventListener('DOMContentLoaded', init);

// Legacy global handlers for any remaining inline calls
window.enhanceSummary = () => document.querySelector('[data-action="enhance-summary"]')?.click();
window.enhanceExperience = (i) => document.querySelector(`[data-action="enhance-exp"][data-index="${i}"]`)?.click();
window.selectTemplate = selectTemplate;
window.exportPDF = exportPDF;
window.switchTab = switchTab;
window.showUpgradeModal = showUpgradeModal;
window.hideUpgradeModal = hideUpgradeModal;
window.addExperience = () => document.querySelector('[data-action="add-exp"]')?.click();
window.addEducation = () => document.querySelector('[data-action="add-edu"]')?.click();
window.matchJobDescription = () => document.querySelector('[data-action="match-job"]')?.click();
