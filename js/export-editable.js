// ProResume AI — Editable export formats (HTML, Word, RTF)

(function () {
  let cssCache = null;

  const CSS_FILES = [
    '/css/resume-templates.css',
    '/css/templates-extended.css',
    '/css/export-fidelity.css'
  ];

  async function fetchExportCss() {
    if (cssCache) return cssCache;
    const base = window.location.origin || '';
    const parts = await Promise.all(CSS_FILES.map(async (path) => {
      try {
        const res = await fetch(base + path);
        if (!res.ok) return '';
        return await res.text();
      } catch {
        return '';
      }
    }));
    cssCache = parts.join('\n');
    return cssCache;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRtf(str) {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\n/g, '\\line ')
      .replace(/[^\x00-\x7F]/g, ch => `\\u${ch.charCodeAt(0)}?`);
  }

  async function buildEditableHtml(tpl, bodyHtml) {
    const css = await fetchExportCss();
    const title = escapeHtml((resumeData.name || 'Resume') + ' — Resume');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=816">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body style="margin:0;padding:0;background:#fff;">
  <div class="resume-document resume-preview letter-preview template-${tpl}">${bodyHtml}</div>
</body>
</html>`;
  }

  async function buildWordDocument(tpl, bodyHtml) {
    const css = await fetchExportCss();
    const title = escapeHtml(resumeData.name || 'Resume');
    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
  <style>${css}
    @page { size: 8.5in 11in; margin: 0.5in; }
    body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div class="resume-document resume-preview letter-preview template-${tpl}">${bodyHtml}</div>
</body>
</html>`;
  }

  function buildRtfDocument() {
    const lines = [];
    const add = (text, bold = false) => {
      if (!text?.trim()) return;
      lines.push(bold ? `{\\b ${escapeRtf(text)}}` : escapeRtf(text));
      lines.push('\\line ');
    };

    add(resumeData.name || 'Your Name', true);
    add(resumeData.title || '');
    const contact = [resumeData.email, resumeData.phone, resumeData.location].filter(Boolean).join(' · ');
    add(contact);
    lines.push('\\line ');

    if (resumeData.summary?.trim()) {
      lines.push('{\\b SUMMARY}\\line ');
      add(resumeData.summary);
      lines.push('\\line ');
    }

    const exp = resumeData.experience.filter(e => e.company || e.role);
    if (exp.length) {
      lines.push('{\\b EXPERIENCE}\\line ');
      exp.forEach(e => {
        add(`${e.role || 'Position'} — ${e.company || ''}`, true);
        if (e.dates) add(e.dates);
        if (e.description?.trim()) {
          e.description.split(/\n+/).forEach(b => {
            const bullet = b.trim().replace(/^[-•*]\s*/, '');
            if (bullet) lines.push(`\\bullet  ${escapeRtf(bullet)}\\line `);
          });
        }
        lines.push('\\line ');
      });
    }

    const edu = resumeData.education.filter(e => e.school || e.degree);
    if (edu.length) {
      lines.push('{\\b EDUCATION}\\line ');
      edu.forEach(e => {
        add(e.degree || 'Degree', true);
        add([e.school, e.year].filter(Boolean).join(' · '));
        lines.push('\\line ');
      });
    }

    const skills = resumeData.skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skills.length) {
      lines.push('{\\b SKILLS}\\line ');
      add(skills.join(' · '));
    }

    return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs22\n${lines.join('')}}`;
  }

  window.EXPORT_EDITABLE = {
    fetchExportCss,
    buildEditableHtml,
    buildWordDocument,
    buildRtfDocument
  };
})();
