// ProResume AI — Resume Builder

const STORAGE_KEY = 'proresume_data';
const EXPORT_COUNT_KEY = 'proresume_exports';
const FREE_EXPORT_LIMIT = 1;

const defaultData = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  summary: '',
  experience: [{ company: '', role: '', dates: '', description: '' }],
  education: [{ school: '', degree: '', year: '' }],
  skills: '',
  template: 'modern',
  jobDescription: ''
};

let resumeData = loadData();

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultData, ...JSON.parse(saved) } : { ...defaultData };
  } catch {
    return { ...defaultData };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  updateSaveIndicator();
}

function updateSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (el) {
    el.textContent = 'Saved';
    el.classList.add('text-emerald-400');
    setTimeout(() => el.classList.remove('text-emerald-400'), 1500);
  }
}

function getExportCount() {
  return parseInt(localStorage.getItem(EXPORT_COUNT_KEY) || '0', 10);
}

function incrementExportCount() {
  localStorage.setItem(EXPORT_COUNT_KEY, String(getExportCount() + 1));
}

// --- AI Enhancement (basic, client-side) ---

function enhanceSummary(text) {
  if (!text.trim()) {
    return 'Motivated professional with a strong track record of delivering results. Experienced in collaborating across teams and driving measurable outcomes in fast-paced environments.';
  }
  let t = text.trim();
  if (!/^(Results-driven|Dedicated|Experienced|Motivated|Skilled)/i.test(t)) {
    t = 'Results-driven professional. ' + t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (!t.endsWith('.')) t += '.';
  return t;
}

function enhanceDescription(text) {
  if (!text.trim()) return text;
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map(line => {
    let l = line.trim().replace(/^[-•*]\s*/, '');
    if (!/^(Led|Developed|Managed|Implemented|Achieved|Increased|Reduced|Built|Created|Designed|Launched|Streamlined)/i.test(l)) {
      l = 'Achieved ' + l.charAt(0).toLowerCase() + l.slice(1);
    }
    if (!l.endsWith('.')) l += '.';
    return l;
  }).join('\n');
}

function calculateAtsScore() {
  let score = 40;
  if (resumeData.name) score += 10;
  if (resumeData.title) score += 5;
  if (resumeData.email) score += 5;
  if (resumeData.summary && resumeData.summary.length > 50) score += 10;
  if (resumeData.experience.some(e => e.company && e.role)) score += 15;
  if (resumeData.skills) score += 10;
  if (resumeData.education.some(e => e.school)) score += 5;
  return Math.min(score, 98);
}

// --- Render Preview ---

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderSkills(skills) {
  if (!skills.trim()) return '';
  const tags = skills.split(',').map(s => s.trim()).filter(Boolean);
  return tags.map(t => `<span class="skill-tag">${escapeHtml(t)}</span>`).join('');
}

function renderPreview() {
  const preview = document.getElementById('resume-preview');
  if (!preview) return;

  preview.className = `resume-preview template-${resumeData.template}`;

  const expHtml = resumeData.experience
    .filter(e => e.company || e.role)
    .map(e => `
      <div class="resume-entry">
        <div class="resume-entry-header">
          <strong>${escapeHtml(e.role || 'Role')}</strong>
          ${e.company ? `<span class="resume-company"> — ${escapeHtml(e.company)}</span>` : ''}
        </div>
        ${e.dates ? `<div class="resume-dates">${escapeHtml(e.dates)}</div>` : ''}
        ${e.description ? `<div class="resume-desc">${escapeHtml(e.description).replace(/\n/g, '<br>')}</div>` : ''}
      </div>
    `).join('');

  const eduHtml = resumeData.education
    .filter(e => e.school || e.degree)
    .map(e => `
      <div class="resume-entry">
        <strong>${escapeHtml(e.degree || 'Degree')}</strong>
        ${e.school ? ` — ${escapeHtml(e.school)}` : ''}
        ${e.year ? `<div class="resume-dates">${escapeHtml(e.year)}</div>` : ''}
      </div>
    `).join('');

  const contact = [
    resumeData.email,
    resumeData.phone,
    resumeData.location
  ].filter(Boolean).map(escapeHtml).join(' · ');

  preview.innerHTML = `
    <div class="resume-header">
      <h1 class="resume-name">${escapeHtml(resumeData.name || 'Your Name')}</h1>
      <p class="resume-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>
      ${contact ? `<p class="resume-contact">${contact}</p>` : ''}
    </div>
    ${resumeData.summary ? `
      <div class="resume-section">
        <h2 class="resume-section-title">Summary</h2>
        <p class="resume-summary">${escapeHtml(resumeData.summary)}</p>
      </div>
    ` : ''}
    ${expHtml ? `
      <div class="resume-section">
        <h2 class="resume-section-title">Experience</h2>
        ${expHtml}
      </div>
    ` : ''}
    ${eduHtml ? `
      <div class="resume-section">
        <h2 class="resume-section-title">Education</h2>
        ${eduHtml}
      </div>
    ` : ''}
    ${resumeData.skills ? `
      <div class="resume-section">
        <h2 class="resume-section-title">Skills</h2>
        <div class="resume-skills">${renderSkills(resumeData.skills)}</div>
      </div>
    ` : ''}
  `;

  const scoreEl = document.getElementById('ats-score');
  if (scoreEl) scoreEl.textContent = calculateAtsScore() + '%';
}

// --- Form Binding ---

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
    <div class="exp-block bg-zinc-800/50 p-4 rounded-xl border border-white/5 space-y-3" data-index="${i}">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-zinc-400">Position ${i + 1}</span>
        ${resumeData.experience.length > 1 ? `<button type="button" onclick="removeExperience(${i})" class="text-zinc-500 hover:text-red-400 text-sm"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
      <input type="text" placeholder="Job Title" value="${escapeHtml(exp.role)}" oninput="updateExperience(${i}, 'role', this.value)" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
      <input type="text" placeholder="Company" value="${escapeHtml(exp.company)}" oninput="updateExperience(${i}, 'company', this.value)" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
      <input type="text" placeholder="Dates (e.g. Jan 2020 – Present)" value="${escapeHtml(exp.dates)}" oninput="updateExperience(${i}, 'dates', this.value)" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
      <textarea placeholder="Describe your responsibilities and achievements..." rows="3" oninput="updateExperience(${i}, 'description', this.value)" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none">${escapeHtml(exp.description)}</textarea>
      <button type="button" onclick="enhanceExperience(${i})" class="text-xs text-emerald-400 hover:text-emerald-300 font-medium"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Enhance with AI</button>
    </div>
  `).join('');
}

function renderEducationFields() {
  const container = document.getElementById('education-list');
  if (!container) return;
  container.innerHTML = resumeData.education.map((edu, i) => `
    <div class="edu-block bg-zinc-800/50 p-4 rounded-xl border border-white/5 space-y-3" data-index="${i}">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-zinc-400">Education ${i + 1}</span>
        ${resumeData.education.length > 1 ? `<button type="button" onclick="removeEducation(${i})" class="text-zinc-500 hover:text-red-400 text-sm"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
      <input type="text" placeholder="Degree" value="${escapeHtml(edu.degree)}" oninput="updateEducation(${i}, 'degree', this.value)" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
      <input type="text" placeholder="School / University" value="${escapeHtml(edu.school)}" oninput="updateEducation(${i}, 'school', this.value)" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
      <input type="text" placeholder="Year" value="${escapeHtml(edu.year)}" oninput="updateEducation(${i}, 'year', this.value)" class="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
    </div>
  `).join('');
}

window.updateExperience = function(i, field, value) {
  resumeData.experience[i][field] = value;
  saveData();
  renderPreview();
};

window.removeExperience = function(i) {
  resumeData.experience.splice(i, 1);
  saveData();
  renderExperienceFields();
  renderPreview();
};

window.addExperience = function() {
  resumeData.experience.push({ company: '', role: '', dates: '', description: '' });
  renderExperienceFields();
};

window.updateEducation = function(i, field, value) {
  resumeData.education[i][field] = value;
  saveData();
  renderPreview();
};

window.removeEducation = function(i) {
  resumeData.education.splice(i, 1);
  saveData();
  renderEducationFields();
  renderPreview();
};

window.addEducation = function() {
  resumeData.education.push({ school: '', degree: '', year: '' });
  renderEducationFields();
};

window.enhanceExperience = function(i) {
  const exp = resumeData.experience[i];
  if (exp.description) {
    exp.description = enhanceDescription(exp.description);
    saveData();
    renderExperienceFields();
    renderPreview();
    showToast('Experience enhanced with AI suggestions');
  } else {
    showToast('Add some description text first', 'warning');
  }
};

window.enhanceSummary = function() {
  resumeData.summary = enhanceSummary(resumeData.summary);
  document.getElementById('summary').value = resumeData.summary;
  saveData();
  renderPreview();
  showToast('Summary enhanced with AI');
};

window.selectTemplate = function(template) {
  resumeData.template = template;
  saveData();
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.classList.toggle('ring-2', btn.dataset.template === template);
    btn.classList.toggle('ring-emerald-400', btn.dataset.template === template);
  });
  renderPreview();
};

window.showUpgradeModal = function(feature) {
  document.getElementById('upgrade-feature').textContent = feature || 'This feature';
  document.getElementById('upgrade-modal').classList.remove('hidden');
};

window.hideUpgradeModal = function() {
  document.getElementById('upgrade-modal').classList.add('hidden');
};

window.exportPDF = async function() {
  if (getExportCount() >= FREE_EXPORT_LIMIT) {
    showUpgradeModal('Unlimited PDF exports');
    return;
  }

  const element = document.getElementById('resume-preview');
  const opt = {
    margin: 0.5,
    filename: (resumeData.name || 'resume').replace(/\s+/g, '_') + '_resume.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(opt).from(element).save();
    incrementExportCount();
    updateExportBadge();
    showToast('Resume downloaded!');
  } catch {
    window.print();
    showToast('Use Print → Save as PDF in the dialog');
  }
};

window.matchJobDescription = function() {
  showUpgradeModal('Job description matching');
};

function updateExportBadge() {
  const remaining = FREE_EXPORT_LIMIT - getExportCount();
  const el = document.getElementById('export-remaining');
  if (el) el.textContent = remaining > 0 ? `${remaining} free export left` : 'Upgrade for more exports';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-medium z-50 transition-opacity ${type === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'} text-white`;
  toast.classList.remove('hidden', 'opacity-0');
  setTimeout(() => toast.classList.add('opacity-0'), 3000);
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

function switchTab(tab) {
  document.getElementById('editor-panel').classList.toggle('hidden', tab !== 'edit');
  document.getElementById('preview-panel').classList.toggle('hidden', tab !== 'preview');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('bg-emerald-500', btn.dataset.tab === tab);
    btn.classList.toggle('text-white', btn.dataset.tab === tab);
    btn.classList.toggle('text-zinc-400', btn.dataset.tab !== tab);
  });
}

window.switchTab = switchTab;

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
}

document.addEventListener('DOMContentLoaded', init);
