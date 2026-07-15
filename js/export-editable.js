// ProResume AI — Editable export formats (HTML, Word, RTF)

(function () {
  let cssCache = null;

  const EXPORT_LAYOUT_CSS = `
.resume-document, .resume-export-clone {
  width: 816px !important;
  max-width: 816px !important;
  box-shadow: none !important;
  transform: none !important;
  margin: 0 !important;
}
.resume-export-clone > [class*="tm-"], .resume-document > [class*="tm-"] {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.resume-export-clone .tm-modern, .resume-document .tm-modern { display: grid !important; grid-template-columns: 220px 1fr !important; }
.resume-export-clone .tm-slate, .resume-document .tm-slate { display: grid !important; grid-template-columns: 1fr 200px !important; }
.resume-export-clone .tm-executive .tm-exec-body, .resume-document .tm-executive .tm-exec-body { display: grid !important; grid-template-columns: 1fr 200px !important; }
.resume-export-clone .tm-stanford .tm-body, .resume-document .tm-stanford .tm-body { display: grid !important; grid-template-columns: 1fr 180px !important; }
.resume-export-clone .tm-metro .tm-metro-body, .resume-document .tm-metro .tm-metro-body { display: grid !important; grid-template-columns: 1fr 180px !important; }
.resume-export-clone .tm-metro .tm-metro-header, .resume-document .tm-metro .tm-metro-header { display: grid !important; grid-template-columns: 1fr 12px 1fr !important; }
.resume-export-clone .tm-metro .tm-metro-accent, .resume-document .tm-metro .tm-metro-accent { display: block !important; }
.resume-export-clone .tm-apex .tm-apex-body, .resume-document .tm-apex .tm-apex-body { display: grid !important; grid-template-columns: 1fr 1fr !important; }
.resume-export-clone .tm-swiss .tm-swiss-grid, .resume-document .tm-swiss .tm-swiss-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; }
.resume-export-clone .tm-verdant, .resume-document .tm-verdant { display: grid !important; grid-template-columns: 210px 1fr !important; }
.resume-export-clone .tm-jade, .resume-document .tm-jade { display: grid !important; grid-template-columns: 200px 1fr !important; }
.resume-export-clone .tm-harbor, .resume-document .tm-harbor { display: grid !important; grid-template-columns: 1fr 190px !important; }
.resume-export-clone .tm-lattice .tm-lattice-grid, .resume-document .tm-lattice .tm-lattice-grid { display: grid !important; grid-template-columns: 1fr 190px !important; }
.resume-export-clone .tm-echo .tm-echo-cols, .resume-document .tm-echo .tm-echo-cols { display: grid !important; grid-template-columns: 1fr 1fr !important; }
.resume-export-clone .tm-skills, .resume-export-clone .tm-skills-wrap,
.resume-document .tm-skills, .resume-document .tm-skills-wrap {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: flex-start !important;
  gap: 6px !important;
}
.resume-export-clone .tm-skill, .resume-export-clone .tm-skill-pill, .resume-export-clone .tm-skill-item,
.resume-document .tm-skill, .resume-document .tm-skill-pill, .resume-document .tm-skill-item {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box !important;
  line-height: 1.3 !important;
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  overflow: hidden !important;
  text-align: center !important;
  max-width: 100% !important;
  min-height: 1.35em !important;
  padding: 4px 8px !important;
}
.resume-export-clone i, .resume-document i { display: none !important; }
body { margin: 0; padding: 0; background: #fff; }
`;

  async function fetchExportCss() {
    if (cssCache) return cssCache;
    const base = window.location.origin || '';
    const files = ['/css/resume-templates.css', '/css/templates-extended.css'];
    const parts = await Promise.all(files.map(async (path) => {
      try {
        const res = await fetch(base + path);
        if (!res.ok) return '';
        return await res.text();
      } catch {
        return '';
      }
    }));
    cssCache = parts.join('\n') + EXPORT_LAYOUT_CSS;
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="resume-document resume-preview template-${tpl}">${bodyHtml}</div>
  <!-- Editable resume — open in any browser, Word, or Google Docs -->
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
    body { font-family: Inter, Arial, sans-serif; }
  </style>
</head>
<body>
  <div class="resume-document resume-preview template-${tpl}">${bodyHtml}</div>
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
    buildRtfDocument,
    EXPORT_LAYOUT_CSS
  };
})();
