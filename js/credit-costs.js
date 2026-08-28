/**
 * Single source of truth for AI credit costs (keep in sync with backend/src/ai/costs.js).
 */
(function () {
  const costs = {
    enhance_summary: 2,
    enhance_exp: 2,
    export_pdf: 3,
    export_png: 2,
    export_jpeg: 2,
    export_doc: 3,
    export_html: 2,
    export_rtf: 2,
    regenerate: 1,
    build_resume: 5,
    suggest_skills: 1,
    job_match: 5,
    cover_letter: 4,
    ats_scan: 2,
    linkedin: 3
  };

  const catalog = [
    { label: 'Summary suggestions', credits: costs.enhance_summary },
    { label: 'Experience suggestions', credits: costs.enhance_exp },
    { label: 'PDF export', credits: costs.export_pdf },
    { label: 'PNG / JPEG export', credits: costs.export_png },
    { label: 'Keyword alignment', credits: costs.job_match },
    { label: 'Cover letter draft', credits: costs.cover_letter },
    { label: 'Resume checklist', credits: costs.ats_scan },
    { label: 'LinkedIn profile tips', credits: costs.linkedin },
    { label: 'Summary variation', credits: costs.regenerate },
    { label: 'Skill suggestions', credits: costs.suggest_skills },
    { label: 'Full resume draft', credits: costs.build_resume }
  ];

  const actionKeys = {
    'enhance-summary': 'enhance_summary',
    'enhance-exp': 'enhance_exp',
    'regenerate-summary': 'regenerate',
    'suggest-skills': 'suggest_skills',
    'build-resume': 'build_resume',
    'match-job': 'job_match',
    'cover-letter': 'cover_letter',
    'ats-scan': 'ats_scan',
    linkedin: 'linkedin'
  };

  const exportKeys = {
    pdf: 'export_pdf',
    png: 'export_png',
    jpeg: 'export_jpeg',
    doc: 'export_doc',
    html: 'export_html',
    rtf: 'export_rtf'
  };

  function formatCredits(n) {
    if (n === 1) return '1 credit';
    return `${n} credits`;
  }

  function badgeText(n) {
    return `${n} cr`;
  }

  function getCostForAction(action, format) {
    if (action === 'export-resume' && format) {
      const key = exportKeys[format];
      return key ? costs[key] : null;
    }
    const key = actionKeys[action];
    return key ? costs[key] : null;
  }

  function renderRateCardTable(tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const rows = catalog.filter((row, i, arr) =>
      arr.findIndex((r) => r.label === row.label) === i
    );
    tbody.innerHTML = rows.map((row) => `
      <tr>
        <td class="p-4">${row.label}</td>
        <td class="p-4 text-right text-amber-400 font-semibold">${row.credits}</td>
      </tr>
    `).join('');
  }

  function applyActionBadges(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-action]').forEach((el) => {
      const action = el.dataset.action;
      const cost = getCostForAction(action, el.dataset.format);
      if (cost == null) return;

      let badge = el.querySelector('.credit-cost-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'credit-cost-badge';
        badge.setAttribute('aria-label', formatCredits(cost));
        if (el.classList.contains('builder-tool-btn')) {
          const paragraphs = el.querySelectorAll('p');
          const subtitle = paragraphs[paragraphs.length - 1];
          if (subtitle) {
            subtitle.appendChild(document.createTextNode(' · '));
            subtitle.appendChild(badge);
          } else {
            el.appendChild(badge);
          }
        } else if (action === 'export-resume') {
          el.classList.add('export-menu-item');
          el.appendChild(badge);
        } else {
          el.appendChild(badge);
        }
      }
      badge.textContent = badgeText(cost);
      badge.title = formatCredits(cost);
    });
  }

  window.ProResumeCredits = {
    costs,
    catalog,
    formatCredits,
    badgeText,
    getCostForAction,
    renderRateCardTable,
    applyActionBadges
  };
})();
