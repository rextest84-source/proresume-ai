// ProResume AI — Resume Builder v2

const STORAGE_KEY = 'proresume_data';
const CREDITS_KEY = 'proresume_credits';
const EXPORT_COUNT_KEY = 'proresume_exports';
const FREE_EXPORT_LIMIT = 1;
const STARTING_CREDITS = 20;

// ─── TESTING MODE (set false before launch) ───
// Removes all subscription/credit gates so every feature can be tested freely.
// ORIGINAL SUBSCRIPTION TIERS (restore when TESTING_UNLOCK = false):
//   Free ($0):     modern, classic, minimal, stanford, horizon, serif (6 templates)
//   Starter ($3):  corporate, elegant, compact, metro, slate, canvas (+6)
//   Pro ($10):     executive, creative, tech, harvard, bold, nova, apex, pioneer, academic (+9)
//   Business ($20): luxury, international, refined (+3) = 32 total
// Credit costs: enhance 2, export 3, build 5, job match 5, cover letter 4, ats 2, linkedin 3
const TESTING_UNLOCK = true;

const TEMPLATE_TIERS = {
  modern: 'free', classic: 'free', minimal: 'free', stanford: 'free', horizon: 'free', serif: 'free',
  corporate: 'starter', elegant: 'starter', compact: 'starter', metro: 'starter', slate: 'starter', canvas: 'starter',
  executive: 'pro', creative: 'pro', tech: 'pro', harvard: 'pro', bold: 'pro', nova: 'pro', apex: 'pro', pioneer: 'pro', academic: 'pro',
  luxury: 'business', international: 'business', refined: 'business',
  fusion: 'starter', monarch: 'starter', swiss: 'starter',
  vivid: 'pro', forest: 'pro', onyx: 'pro',
  radiant: 'business', streamline: 'pro'
};

const TIER_LABELS = { free: 'Free', starter: 'Starter ($8/mo)', pro: 'Pro ($15/mo)', business: 'Business ($39/mo)' };

const CREDIT_COSTS = {
  enhance_summary: 2, enhance_exp: 2, export_pdf: 3, export_png: 2, export_jpeg: 2, regenerate: 1,
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
    showToast(TESTING_UNLOCK ? '✦ Generated!' : `✦ Generated! (−${creditCost} credit${creditCost > 1 ? 's' : ''})`);
    schedulePreviewUpdate();
  } catch (e) {
    if (!TESTING_UNLOCK && e.message !== 'empty') setCredits(getCredits() + creditCost);
    if (e.message === 'empty') showToast(e.hint || 'Add some text first', 'warning');
    else if (e.message === 'need_title') showToast('Add your job title first', 'warning');
    else showToast('Generation failed' + (TESTING_UNLOCK ? '' : ' — credits refunded'), 'warning');
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
  if (TESTING_UNLOCK) return true;
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
  if (el) el.textContent = TESTING_UNLOCK ? '∞' : getCredits();
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
    default:
      return `<div class="tm-skills tm-skills-wrap">${items.map(s => `<span class="tm-skill tm-skill-default">${s}</span>`).join('')}</div>`;
  }
}

function renderSkillsSection(templateId, title) {
  const content = renderSkillsContent(templateId, 'main');
  if (!content) return '';
  const sectionTitle = title || SKILL_SECTION_TITLES[templateId] || 'Skills';
  return `<div class="tm-section tm-skills-section"><div class="tm-section-title">${sectionTitle}</div>${content}</div>`;
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
          <div class="tm-contact">${getContactItems().map(c => `<span>${escapeHtml(c.value)}</span>`).join('')}</div>
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
  streamline() { return renderStreamline(); }
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
      <div class="tm-contact">${getContactItems().map(c => escapeHtml(c.value)).join(' — ')}</div>
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

  const body = renderBodyCore() + renderSkillsSection(id);

  return `<div class="tm-themed tm-${id}">${header}${body}</div>`;
}

function normalizeTemplate(tpl) {
  if (!tpl || !TEMPLATE_RENDERERS[tpl]) return 'modern';
  if (!TESTING_UNLOCK) {
    const tier = TEMPLATE_TIERS[tpl];
    if (tier && tier !== 'free') return 'modern';
  }
  return tpl;
}

function renderPreview(resetScroll = false) {
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

  if (resetScroll) {
    requestAnimationFrame(() => {
      const frame = document.getElementById('preview-frame');
      if (frame) frame.scrollTop = 0;
    });
  }
}

let previewUpdateTimer = null;

function schedulePreviewUpdate() {
  clearTimeout(previewUpdateTimer);
  previewUpdateTimer = setTimeout(() => renderPreview(false), 250);
}

// ─── Form UI ───

function bindInput(id, field) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = resumeData[field] || '';
  el.addEventListener('input', () => {
    resumeData[field] = el.value;
    saveData();
    schedulePreviewUpdate();
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
  if (!TESTING_UNLOCK) {
    const tier = TEMPLATE_TIERS[template] || 'free';
    if (tier !== 'free') {
      showUpgradeModal(`${TIER_LABELS[tier]} templates`);
      return;
    }
  }
  resumeData.template = template;
  saveData();
  document.querySelectorAll('.template-btn').forEach(btn => {
    const active = btn.dataset.template === template;
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-emerald-400', active);
  });
  renderPreview(true);
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
    renderPreview(true);
  }
}

const EXPORT_WIDTH = 816;   // 8.5in @ 96dpi
const EXPORT_PAGE_HEIGHT = 1056; // 11in @ 96dpi
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
  const printBtn = document.getElementById('export-print-btn');
  const iosSteps = document.getElementById('export-ios-steps');

  document.getElementById('export-save-filename').textContent = filename;
  if (link) {
    link.href = url;
    link.download = filename;
    link.textContent = format === 'pdf' ? 'Open PDF preview' : `Open ${format.toUpperCase()} preview`;
  }
  if (icon) {
    icon.className = format === 'pdf'
      ? 'fa-solid fa-file-pdf text-2xl text-red-400'
      : 'fa-solid fa-image text-2xl text-blue-400';
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
        showToast('Saved — check your Files app');
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

function getExportBackgroundColor(clone) {
  const themed = clone.querySelector('[class*="tm-"]');
  if (!themed) return '#ffffff';
  const bg = window.getComputedStyle(themed).backgroundColor;
  return bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff';
}

function prepareExportClone() {
  const tpl = normalizeTemplate(resumeData.template);
  const renderer = TEMPLATE_RENDERERS[tpl];
  if (!renderer) throw new Error('Template not found');

  const wrapper = document.createElement('div');
  wrapper.id = 'resume-export-wrapper';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.cssText = `position:fixed;left:0;top:0;width:${EXPORT_WIDTH}px;z-index:-1;opacity:0;pointer-events:none;overflow:hidden;`;

  const clone = document.createElement('div');
  clone.id = 'resume-export-clone';
  clone.className = `resume-preview resume-export-clone template-${tpl}`;
  clone.style.cssText = `width:${EXPORT_WIDTH}px;max-width:${EXPORT_WIDTH}px;box-shadow:none;margin:0;padding:0;transform:none;position:relative;overflow:visible;`;
  clone.innerHTML = renderer();
  clone.querySelectorAll('i').forEach(el => { el.style.display = 'none'; });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  void clone.offsetHeight;
  const contentHeight = Math.max(Math.ceil(clone.scrollHeight), Math.ceil(clone.offsetHeight), 1);
  clone.style.height = `${contentHeight}px`;
  wrapper.style.height = `${contentHeight}px`;
  return { wrapper, clone, contentHeight, bgColor: getExportBackgroundColor(clone) };
}

function applyExportCaptureFixes(root) {
  root.querySelectorAll('.tm-skill, .tm-skill-pill, .tm-skill-item').forEach(el => {
    el.style.display = 'inline-flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.lineHeight = '1.25';
    el.style.verticalAlign = 'middle';
    el.style.boxSizing = 'border-box';
    el.style.overflow = 'visible';
    el.style.whiteSpace = 'nowrap';
  });
  root.querySelectorAll('.tm-skills, .tm-skills-wrap').forEach(el => {
    el.style.display = 'flex';
    el.style.flexWrap = 'wrap';
    el.style.alignItems = 'flex-start';
    el.style.gap = '6px';
  });
  root.querySelectorAll('.tm-modern').forEach(el => {
    el.style.display = 'grid';
    el.style.gridTemplateColumns = '220px 1fr';
    el.style.width = `${EXPORT_WIDTH}px`;
  });
  root.querySelectorAll('.tm-executive .tm-exec-body, .tm-stanford .tm-body, .tm-slate, .tm-metro .tm-metro-body, .tm-apex .tm-apex-body').forEach(el => {
    if (el.classList.contains('tm-slate') || el.classList.contains('tm-metro-body')) {
      el.style.display = 'grid';
    }
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

async function captureResumeCanvas(clone, bgColor) {
  if (typeof html2canvas !== 'function') throw new Error('Export library not loaded. Please refresh the page.');
  applyExportCaptureFixes(clone);
  return html2canvas(clone, {
    scale: EXPORT_SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: bgColor === 'rgba(0, 0, 0, 0)' ? null : bgColor,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    width: EXPORT_WIDTH,
    height: clone.offsetHeight,
    windowWidth: EXPORT_WIDTH,
    windowHeight: clone.offsetHeight,
    onclone: (_doc, clonedEl) => applyExportCaptureFixes(clonedEl)
  });
}

async function saveCanvasAsPdf(canvas, filename, fillColor = '#ffffff') {
  if (!window.jspdf?.jsPDF) throw new Error('PDF library not loaded. Please refresh the page.');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;
  const scale = maxW / canvas.width;
  const sliceHeightPx = Math.floor(maxH / scale);
  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < canvas.height) {
    if (pageIndex > 0) pdf.addPage();
    const sliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY);
    const slice = sliceCanvas(canvas, offsetY, sliceHeight, fillColor);
    const displayH = sliceHeight * scale;
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, maxW, displayH);
    offsetY += sliceHeight;
    pageIndex++;
  }

  const blob = pdf.output('blob');
  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  await deliverExport(pdfBlob, filename, 'pdf');
}

const EXPORT_CREDIT_MAP = { pdf: 'export_pdf', png: 'export_png', jpeg: 'export_jpeg' };
const EXPORT_EXT_MAP = { pdf: 'pdf', png: 'png', jpeg: 'jpg' };
const EXPORT_LABEL_MAP = { pdf: 'PDF', png: 'PNG', jpeg: 'JPEG' };

async function exportResume(format = 'pdf') {
  const creditKey = EXPORT_CREDIT_MAP[format] || 'export_pdf';
  const creditCost = CREDIT_COSTS[creditKey] || 3;
  const label = EXPORT_LABEL_MAP[format] || 'File';

  if (!useCredits(creditCost, `${label} export`)) return;

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
    if (!TESTING_UNLOCK) setCredits(getCredits() + creditCost);
    showToast('Preview not found — credits refunded', 'warning');
    if (menuBtn) { menuBtn.disabled = false; menuBtn.innerHTML = originalBtn; }
    return;
  }

  const { wrapper, clone, bgColor } = prepareExportClone();
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise(r => setTimeout(r, 500));

    const canvas = await captureResumeCanvas(clone, bgColor);
    const baseName = getExportBaseName();
    const ext = EXPORT_EXT_MAP[format] || 'pdf';
    const filename = `${baseName}_resume.${ext}`;

    if (format === 'pdf') {
      await saveCanvasAsPdf(canvas, filename, bgColor);
    } else if (format === 'png') {
      const blob = await blobFromCanvas(canvas, 'image/png');
      await deliverExport(blob, filename, 'png');
    } else if (format === 'jpeg') {
      const blob = await blobFromCanvas(canvas, 'image/jpeg', 0.92);
      await deliverExport(blob, filename, 'jpeg');
    }

    const creditMsg = TESTING_UNLOCK ? '' : ` (−${creditCost} credits)`;
    if (isMobileIOS()) {
      showToast(`Tap Save to Files to download${creditMsg}`);
    } else {
      showToast(`${label} downloaded: ${filename}${creditMsg}`);
    }
  } catch (err) {
    console.error('Export failed:', err);
    if (!TESTING_UNLOCK) setCredits(getCredits() + creditCost);
    showToast(`Export failed — ${err.message || 'please try again'}`, 'warning');
  } finally {
    wrapper.remove();
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
        await runAIEnhance(btn, async () => {
          const jobText = await promptJobDescription();
          if (!jobText?.trim()) {
            if (!TESTING_UNLOCK) setCredits(getCredits() + CREDIT_COSTS.job_match);
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
      schedulePreviewUpdate();
    }
    if (edu !== undefined && field) {
      resumeData.education[+edu][field] = e.target.value;
      saveData();
      schedulePreviewUpdate();
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
window.matchJobDescription = () => showUpgradeModal('Job description matching');
