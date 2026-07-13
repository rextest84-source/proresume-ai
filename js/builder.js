// ProResume AI — Resume Builder v2

const STORAGE_KEY = 'proresume_data';
const CREDITS_KEY = 'proresume_credits';
const EXPORT_COUNT_KEY = 'proresume_exports';
const FREE_EXPORT_LIMIT = 1;
const STARTING_CREDITS = 20;

const TEMPLATE_TIERS = {
  modern: 'free', classic: 'free', minimal: 'free', stanford: 'free', horizon: 'free', serif: 'free',
  corporate: 'starter', elegant: 'starter', compact: 'starter', metro: 'starter', slate: 'starter', canvas: 'starter',
  executive: 'pro', creative: 'pro', tech: 'pro', harvard: 'pro', bold: 'pro', nova: 'pro', apex: 'pro', pioneer: 'pro', academic: 'pro',
  luxury: 'business', international: 'business', refined: 'business'
};

const TIER_LABELS = { free: 'Free', starter: 'Starter ($8/mo)', pro: 'Pro ($15/mo)', business: 'Business ($39/mo)' };

const CREDIT_COSTS = {
  enhance_summary: 2, enhance_exp: 2, export_pdf: 3, regenerate: 1,
  build_resume: 5, suggest_skills: 1,
  job_match: 5, cover_letter: 4, ats_scan: 2, linkedin: 3
};

// ─── AI (powered by ai-engine.js) ───

function enhanceSummaryAI(text, title, skills) {
  return AIEngine.enhanceSummary(text, title, skills, resumeData.experience);
}

function enhanceDescriptionAI(text, role) {
  return AIEngine.enhanceDescription(text, role, resumeData.skills);
}

async function runAIEnhance(btn, fn, creditCost = 2, featureName = 'AI enhancement', regenerate = true) {
  if (!btn || btn.classList.contains('ai-loading')) return;
  if (!useCredits(creditCost, featureName)) return;
  if (regenerate) AIEngine.regenerateSeed();
  const original = btn.innerHTML;
  btn.classList.add('ai-loading');
  btn.innerHTML = '<i class="fa-solid fa-spinner"></i> Generating...';
  await new Promise(r => setTimeout(r, 900 + Math.random() * 1100));
  try {
    await fn();
    showToast(`✦ Generated! (−${creditCost} credit${creditCost > 1 ? 's' : ''})`);
    if (window.innerWidth < 768) switchTab('preview');
  } catch (e) {
    if (e.message !== 'empty') setCredits(getCredits() + creditCost);
    if (e.message === 'empty') showToast(e.hint || 'Add some text first', 'warning');
    else if (e.message === 'need_title') showToast('Add your job title first', 'warning');
    else showToast('Generation failed — credits refunded', 'warning');
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
}

// ─── Credits System ───

function getCredits() {
  const stored = localStorage.getItem(CREDITS_KEY);
  if (stored === null) {
    localStorage.setItem(CREDITS_KEY, String(STARTING_CREDITS));
    return STARTING_CREDITS;
  }
  return parseInt(stored, 10);
}

function setCredits(n) {
  localStorage.setItem(CREDITS_KEY, String(Math.max(0, n)));
  updateCreditsDisplay();
}

function useCredits(amount, featureName) {
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
  if (el) el.textContent = getCredits();
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

// ─── ATS Score ───

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
          ${skills.length ? `<div class="tm-side-section"><div class="tm-side-label">Skills</div>${renderSkillPills()}</div>` : ''}
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
        ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Core Competencies</div><p class="tm-skills">${getSkillsArray().map(escapeHtml).join(' · ')}</p></div>` : ''}
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
        ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Skills</div><div class="tm-skills">${getSkillsArray().map(s => `<span class="tm-skill-pill">${escapeHtml(s)}</span>`).join('')}</div></div>` : ''}
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
          ${getSkillsArray().length ? `<div class="tm-side-skills"><div class="tm-section-title">Expertise</div>${getSkillsArray().map(s => `<span class="tm-skill-pill">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
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
          ${getSkillsArray().length ? `<div class="tm-side-section"><div class="tm-side-title">Skills</div>${getSkillsArray().map(s => `<div class="tm-skill-item">${escapeHtml(s)}</div>`).join('')}</div>` : ''}
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
          ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Skills</div><div class="tm-skills">${renderSkillPills()}</div></div>` : ''}
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
          <div class="tm-contact">${getContactItems().map(c => `<span>${escapeHtml(c.value)}</span>`).join('')}</div>
        </header>
        <div class="tm-horizon-body">
          ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
          ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
          ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
          ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Skills</div><div class="tm-skills">${renderSkillPills()}</div></div>` : ''}
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
        ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Skills</div><p>${getSkillsArray().map(escapeHtml).join(' · ')}</p></div>` : ''}
      </div>`;
  },

  metro() { return renderMetro(); },
  slate() { return renderSlate(); },
  nova() { return renderNova(); },
  apex() { return renderApex(); },
  canvas() { return renderCanvas(); },
  pioneer() { return renderPioneer(); },
  academic() { return renderAcademic(); }
};

function renderStandardBody() {
  return `
    ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
    ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
    ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
    ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Skills</div><div class="tm-skills">${renderSkillPills()}</div></div>` : ''}
  `;
}

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
        <div>${renderStandardBody()}</div>
        ${getSkillsArray().length ? `<aside><div class="tm-side-title">Expertise</div>${getSkillsArray().map(s => `<div class="tm-skill-item">${escapeHtml(s)}</div>`).join('')}</aside>` : '<aside></aside>'}
      </div>
    </div>`;
}

function renderSlate() {
  const skills = getSkillsArray();
  return `
    <div class="tm-slate">
      <main class="tm-slate-main">
        <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
        <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
        ${renderStandardBody()}
      </main>
      <aside class="tm-slate-side">
        <div class="tm-side-section">
          <div class="tm-side-label">Contact</div>
          ${renderContactHtml()}
        </div>
        ${skills.length ? `<div class="tm-side-section"><div class="tm-side-label">Skills</div>${renderSkillPills('tm-skill-pill')}</div>` : ''}
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
      <div class="tm-nova-body">${renderStandardBody()}</div>
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
        ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Core Skills</div><div class="tm-skills">${renderSkillPills()}</div></div>` : ''}
      </div>
    </div>`;
}

function renderCanvas() {
  return `
    <div class="tm-canvas">
      <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
      <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
      <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' — ')}</div>
      ${renderStandardBody()}
    </div>`;
}

function renderPioneer() {
  return `
    <div class="tm-pioneer">
      <h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
      <p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
      <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' · ')}</div>
      ${renderStandardBody()}
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
      ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Technical Skills</div><p>${getSkillsArray().map(escapeHtml).join(' · ')}</p></div>` : ''}
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
      <div class="tm-refined-body">${renderStandardBody()}</div>
    </div>`;
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
          <p class="text-zinc-400 text-sm mb-3">AI will tailor your resume keywords and bullets to match this role.</p>
          <textarea id="job-desc-input" rows="8" placeholder="Paste the full job posting here..." class="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none mb-4"></textarea>
          <div class="flex gap-2">
            <button type="button" id="job-match-submit" class="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold">Match Resume</button>
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
  const report = `ATS Compatibility Score: ${score}%\n\nRecommendations:\n${tips.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nKeep formatting simple, use standard section headings, and mirror keywords from the job description.`;
  showTextModal('ATS Deep Scan Report', report);
}

function showCoverLetter() {
  const letter = AIEngine.generateCoverLetter(resumeData);
  showTextModal('Generated Cover Letter', letter, false);
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
  showTextModal('LinkedIn Profile Optimization', tips);
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

  const body = `
    ${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}
    ${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}
    ${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}
    ${getSkillsArray().length ? `<div class="tm-section"><div class="tm-section-title">Skills</div><div class="tm-skills">${renderSkillPills()}</div></div>` : ''}
  `;

  return `<div class="tm-themed tm-${id}">${header}${body}</div>`;
}

function normalizeTemplate(tpl) {
  if (!tpl || !TEMPLATE_RENDERERS[tpl]) return 'modern';
  const tier = TEMPLATE_TIERS[tpl];
  if (tier && tier !== 'free') return 'modern';
  return tpl;
}

function renderPreview() {
  const preview = document.getElementById('resume-preview');
  if (!preview) return;

  const tpl = normalizeTemplate(resumeData.template);
  if (tpl !== resumeData.template) {
    resumeData.template = tpl;
    saveData();
  }

  const renderer = TEMPLATE_RENDERERS[tpl];
  preview.className = `resume-preview template-${tpl}`;

  try {
    preview.innerHTML = renderer();
  } catch (err) {
    console.error('Preview render failed:', err);
    preview.innerHTML = TEMPLATE_RENDERERS.modern();
    preview.className = 'resume-preview template-modern';
  }

  const scoreEl = document.getElementById('ats-score');
  if (scoreEl) scoreEl.textContent = calculateAtsScore() + '%';

  requestAnimationFrame(() => {
    const frame = document.getElementById('preview-frame');
    if (frame) frame.scrollTop = 0;
    if (window.innerWidth < 768) window.scrollTo(0, 0);
  });
}

// ─── Form UI ───

function bindInput(id, field) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = resumeData[field] || '';
  el.addEventListener('input', () => {
    resumeData[field] = el.value;
    saveData();
    renderPreview();
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
      <input type="text" data-exp="${i}" data-field="dates" placeholder="Dates (e.g. Jan 2020 – Present)" value="${escapeHtml(exp.dates)}" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white">
      <textarea data-exp="${i}" data-field="description" placeholder="Key achievements (one per line)..." rows="4" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white resize-none">${escapeHtml(exp.description)}</textarea>
      <button type="button" data-action="enhance-exp" data-index="${i}" class="ai-btn flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold transition">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Enhance with AI
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
  const tier = TEMPLATE_TIERS[template] || 'free';
  if (tier !== 'free') {
    showUpgradeModal(`${TIER_LABELS[tier]} templates`);
    return;
  }
  resumeData.template = template;
  saveData();
  document.querySelectorAll('.template-btn').forEach(btn => {
    const active = btn.dataset.template === template;
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-emerald-400', active);
  });
  renderPreview();
}

function showUpgradeModal(feature) {
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
    renderPreview();
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }
}

async function exportPDF() {
  if (!useCredits(CREDIT_COSTS.export_pdf, 'PDF export')) return;

  const btn = document.querySelector('[data-action="export-pdf"]');
  const originalBtn = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Generating PDF...';
  }

  if (window.innerWidth < 768) switchTab('preview');
  renderPreview();

  const source = document.getElementById('resume-preview');
  if (!source) {
    setCredits(getCredits() + CREDIT_COSTS.export_pdf);
    showToast('Preview not found — credits refunded', 'warning');
    if (btn) { btn.disabled = false; btn.innerHTML = originalBtn; }
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = 'position:fixed;left:-10000px;top:0;width:816px;background:#fff;overflow:visible;';
  const clone = source.cloneNode(true);
  clone.style.width = '816px';
  clone.style.maxWidth = '816px';
  clone.style.minHeight = '1056px';
  clone.style.background = '#ffffff';
  clone.style.boxShadow = 'none';
  clone.querySelectorAll('i').forEach(icon => { icon.style.display = 'none'; });
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 300));

    const filename = (resumeData.name || 'resume').replace(/[^\w\-]+/g, '_').replace(/_+/g, '_') + '_resume.pdf';

    await html2pdf().set({
      margin: [0.35, 0.4, 0.35, 0.4],
      filename,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        width: 816,
        windowWidth: 816,
        scrollX: 0,
        scrollY: -window.scrollY,
        logging: false
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait', compress: true },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(clone).save();

    showToast(`PDF downloaded: ${filename} (−${CREDIT_COSTS.export_pdf} credits)`);
  } catch (err) {
    console.error('PDF export failed:', err);
    setCredits(getCredits() + CREDIT_COSTS.export_pdf);
    showToast('PDF export failed — credits refunded. Please try again.', 'warning');
  } finally {
    wrapper.remove();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtn;
    }
  }
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
        await runAIEnhance(btn, () => {
          resumeData.summary = enhanceSummaryAI(resumeData.summary, resumeData.title, resumeData.skills);
          document.getElementById('summary').value = resumeData.summary;
          saveData();
          renderPreview();
        }, CREDIT_COSTS.enhance_summary, 'AI summary enhancement');
        break;

      case 'enhance-exp':
        await runAIEnhance(btn, () => {
          const exp = resumeData.experience[index];
          if (!exp) throw new Error('empty');
          exp.description = enhanceDescriptionAI(exp.description || '', exp.role || resumeData.title);
          saveData();
          renderExperienceFields();
          renderPreview();
        }, CREDIT_COSTS.enhance_exp, 'AI experience enhancement');
        break;

      case 'regenerate-summary':
        await runAIEnhance(btn, () => {
          resumeData.summary = enhanceSummaryAI(resumeData.summary, resumeData.title, resumeData.skills);
          document.getElementById('summary').value = resumeData.summary;
          saveData();
          renderPreview();
        }, CREDIT_COSTS.regenerate, 'summary variation');
        break;

      case 'build-resume':
        await runAIEnhance(btn, () => applyAIBuild(), CREDIT_COSTS.build_resume, 'full resume builder');
        break;

      case 'suggest-skills':
        await runAIEnhance(btn, () => {
          if (!resumeData.title?.trim()) throw Object.assign(new Error('need_title'));
          resumeData.skills = AIEngine.suggestSkills(resumeData.title, resumeData.skills);
          document.getElementById('skills').value = resumeData.skills;
          saveData();
          renderPreview();
        }, CREDIT_COSTS.suggest_skills, 'skill suggestions', true);
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
        const tier = TEMPLATE_TIERS[btn.dataset.template];
        if (tier && tier !== 'free') showUpgradeModal(`${TIER_LABELS[tier]} templates`);
        else selectTemplate(btn.dataset.template);
        break;

      case 'export-pdf': exportPDF(); break;
      case 'hide-upgrade': hideUpgradeModal(); break;
      case 'show-pricing': window.location.href = '/pricing.html'; break;
      case 'match-job':
        await runAIEnhance(btn, async () => {
          const jobText = await promptJobDescription();
          if (!jobText?.trim()) {
            setCredits(getCredits() + CREDIT_COSTS.job_match);
            throw Object.assign(new Error('empty'), { hint: 'Cancelled' });
          }
          const matched = AIEngine.matchJobDescription(resumeData, jobText);
          resumeData.summary = matched.summary;
          resumeData.skills = matched.skills;
          resumeData.experience = matched.experience;
          saveData();
          syncFormFields();
        }, CREDIT_COSTS.job_match, 'job description matching');
        break;

      case 'cover-letter':
        await runAIEnhance(btn, () => {
          if (!resumeData.name?.trim() || !resumeData.title?.trim()) {
            throw Object.assign(new Error('need_title'), { hint: 'Add your name and title first' });
          }
          showCoverLetter();
        }, CREDIT_COSTS.cover_letter, 'cover letter generator', true);
        break;

      case 'ats-scan':
        await runAIEnhance(btn, () => showATSReport(), CREDIT_COSTS.ats_scan, 'ATS deep scan', false);
        break;

      case 'linkedin':
        await runAIEnhance(btn, () => showLinkedInTips(), CREDIT_COSTS.linkedin, 'LinkedIn optimizer', true);
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
      saveData();
      renderPreview();
    }
    if (edu !== undefined && field) {
      resumeData.education[+edu][field] = e.target.value;
      saveData();
      renderPreview();
    }
  });
}

function init() {
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
window.matchJobDescription = () => showUpgradeModal('Job description matching');
