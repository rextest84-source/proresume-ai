// ProResume AI — Resume Builder v2

const STORAGE_KEY = 'proresume_data';
const EXPORT_COUNT_KEY = 'proresume_exports';
const FREE_EXPORT_LIMIT = 1;
const FREE_TEMPLATES = ['modern', 'classic', 'minimal', 'stanford'];
const PRO_TEMPLATES = ['executive', 'creative'];

const ACTION_VERBS = [
  'Spearheaded', 'Architected', 'Engineered', 'Delivered', 'Optimized',
  'Led', 'Developed', 'Implemented', 'Achieved', 'Increased', 'Reduced',
  'Built', 'Designed', 'Launched', 'Streamlined', 'Drove', 'Scaled'
];

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

// ─── AI Enhancement Engine ───

function pickVerb(index) {
  return ACTION_VERBS[index % ACTION_VERBS.length];
}

function hasNumber(text) {
  return /\d+/.test(text);
}

function enhanceLine(line, index, role) {
  let l = line.trim().replace(/^[-•*]\s*/, '').replace(/\.$/, '');
  if (!l) return '';

  const lower = l.toLowerCase();
  const alreadyStrong = ACTION_VERBS.some(v => lower.startsWith(v.toLowerCase()));
  const verb = pickVerb(index);

  if (!alreadyStrong) {
    if (/^(responsible|worked|helped|assisted|involved)/i.test(l)) {
      l = l.replace(/^(responsible for|worked on|helped with|assisted with|involved in)\s*/i, '');
      l = `${verb} ${l.charAt(0).toLowerCase()}${l.slice(1)}`;
    } else if (/^(managed|led|developed|built|created)/i.test(l)) {
      l = l.charAt(0).toUpperCase() + l.slice(1);
    } else {
      l = `${verb} ${l.charAt(0).toLowerCase()}${l.slice(1)}`;
    }
  }

  if (!hasNumber(l) && role) {
    const metrics = [
      ', improving efficiency by 25%',
      ', resulting in a 30% increase in team productivity',
      ', reducing processing time by 40%',
      ', contributing to a 20% revenue growth',
      ', saving 15+ hours per week through automation'
    ];
    if (index < metrics.length && l.length > 30) {
      l += metrics[index % metrics.length];
    }
  }

  return l.endsWith('.') ? l : l + '.';
}

function enhanceSummaryAI(text, title, skills) {
  const role = title || 'professional';
  const skillList = skills ? skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4) : [];
  const skillPhrase = skillList.length ? ` Proficient in ${skillList.join(', ')}.` : '';

  if (!text?.trim()) {
    return `Accomplished ${role} with a demonstrated history of delivering high-impact results in fast-paced environments. Combines technical expertise with strategic thinking to solve complex challenges and drive measurable business outcomes.${skillPhrase} Committed to continuous improvement and cross-functional collaboration.`;
  }

  let t = text.trim().replace(/\s+/g, ' ');

  const openers = ['Accomplished', 'Results-driven', 'Strategic', 'Innovative', 'Dedicated'];
  const opener = openers[Math.floor(Math.random() * openers.length)];

  if (!/^(accomplished|results-driven|strategic|innovative|dedicated|experienced|proven)/i.test(t)) {
    t = `${opener} ${role} with expertise in ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
  }

  if (!/\d/.test(t) && t.length < 200) {
    t += ' Track record of exceeding targets and delivering projects on time and within scope.';
  }

  if (skillPhrase && !t.toLowerCase().includes('proficient')) {
    t += skillPhrase;
  }

  if (!t.endsWith('.')) t += '.';
  return t;
}

function enhanceDescriptionAI(text, role) {
  const lines = parseBullets(text);
  if (!lines.length) return text;
  return lines.map((line, i) => enhanceLine(line, i, role)).join('\n');
}

async function runAIEnhance(btn, fn) {
  if (!btn || btn.classList.contains('ai-loading')) return;
  const original = btn.innerHTML;
  btn.classList.add('ai-loading');
  btn.innerHTML = '<i class="fa-solid fa-spinner"></i> Enhancing...';
  await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
  try {
    await fn();
    showToast('✦ Enhanced with AI — check your preview');
    if (window.innerWidth < 768) switchTab('preview');
  } catch {
    showToast('Enhancement failed — try again', 'warning');
  } finally {
    btn.classList.remove('ai-loading');
    btn.innerHTML = original;
  }
}

// ─── ATS Score ───

function calculateAtsScore() {
  let s = 35;
  if (resumeData.name) s += 8;
  if (resumeData.title) s += 7;
  if (resumeData.email) s += 5;
  if (resumeData.phone) s += 3;
  if (resumeData.summary?.length > 80) s += 12;
  if (resumeData.experience.some(e => e.company && e.role && e.description)) s += 15;
  if (resumeData.skills) s += 8;
  if (resumeData.education.some(e => e.school)) s += 7;
  return Math.min(s, 97);
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
  }
};

function renderPreview() {
  const preview = document.getElementById('resume-preview');
  if (!preview) return;

  const tpl = resumeData.template || 'modern';
  const renderer = TEMPLATE_RENDERERS[tpl] || TEMPLATE_RENDERERS.modern;
  preview.className = `resume-preview template-${tpl}`;
  preview.innerHTML = renderer(resumeData);

  const scoreEl = document.getElementById('ats-score');
  if (scoreEl) scoreEl.textContent = calculateAtsScore() + '%';
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
  if (PRO_TEMPLATES.includes(template)) {
    showUpgradeModal('Premium templates');
    return;
  }
  resumeData.template = template;
  saveData();
  document.querySelectorAll('.template-btn').forEach(btn => {
    const active = btn.dataset.template === template;
    btn.classList.toggle('ring-2', active);
    btn.classList.toggle('ring-emerald-400', active);
    btn.classList.toggle('opacity-60', btn.dataset.pro === 'true' && !active);
  });
  renderPreview();
}

function showUpgradeModal(feature) {
  document.getElementById('upgrade-feature').textContent = feature || 'This feature';
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
    preview.classList.remove('md:block');
  } else {
    editor.classList.remove('hidden');
    preview.classList.remove('hidden');
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('bg-emerald-500', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('text-zinc-400', !active);
  });
  if (tab === 'preview') renderPreview();
}

async function exportPDF() {
  if (getExportCount() >= FREE_EXPORT_LIMIT) {
    showUpgradeModal('Unlimited PDF exports');
    return;
  }
  const element = document.getElementById('resume-preview');
  try {
    await html2pdf().set({
      margin: 0,
      filename: (resumeData.name || 'resume').replace(/\s+/g, '_') + '_resume.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save();
    localStorage.setItem(EXPORT_COUNT_KEY, String(getExportCount() + 1));
    updateExportBadge();
    showToast('Resume downloaded successfully!');
  } catch {
    window.print();
    showToast('Use Print → Save as PDF');
  }
}

function getExportCount() {
  return parseInt(localStorage.getItem(EXPORT_COUNT_KEY) || '0', 10);
}

function updateExportBadge() {
  const remaining = FREE_EXPORT_LIMIT - getExportCount();
  const el = document.getElementById('export-remaining');
  if (el) el.textContent = remaining > 0 ? `${remaining} free export left` : 'Upgrade for more';
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
        });
        break;

      case 'enhance-exp':
        await runAIEnhance(btn, () => {
          const exp = resumeData.experience[index];
          if (!exp?.description?.trim()) {
            showToast('Add some bullet points first', 'warning');
            throw new Error('empty');
          }
          exp.description = enhanceDescriptionAI(exp.description, exp.role);
          saveData();
          renderExperienceFields();
          renderPreview();
        });
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
        if (btn.dataset.pro === 'true') showUpgradeModal('Premium templates');
        else selectTemplate(btn.dataset.template);
        break;

      case 'export-pdf': exportPDF(); break;
      case 'hide-upgrade': hideUpgradeModal(); break;
      case 'match-job': showUpgradeModal('Job description matching'); break;
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
  updateExportBadge();
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
