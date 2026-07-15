// ProResume AI — Editable export formats (HTML, Word, RTF)

(function () {
  let cssCache = null;

  const CSS_FILES = [
    'css/resume-templates.css',
    'css/templates-extended.css',
    'css/export-fidelity.css',
    'css/export-editable.css'
  ];

  const GRID_LAYOUTS = [
    { container: '.tm-modern', columns: ['.tm-sidebar', '.tm-main'], widths: [220, null] },
    { container: '.tm-slate', columns: ['.tm-slate-main', '.tm-slate-side'], widths: [null, 200] },
    { container: '.tm-verdant', columns: ['.tm-verdant-side', '.tm-verdant-main'], widths: [210, null] },
    { container: '.tm-jade', columns: ['.tm-jade-side', '.tm-jade-main'], widths: [200, null] },
    { container: '.tm-harbor', columns: ['.tm-harbor-main', '.tm-harbor-side'], widths: [null, 190] },
    { container: '.tm-executive .tm-exec-body', columns: ['> div:first-child', '.tm-side-skills'], widths: [null, 200] },
    { container: '.tm-stanford .tm-body', columns: ['> div:first-child', '.tm-side-section'], widths: [null, 180] },
    { container: '.tm-stanford .tm-header', columns: ['> div:first-child', '.tm-contact'], widths: [null, 200] },
    { container: '.tm-academic .tm-acad-header', columns: ['> div:first-child', '.tm-contact'], widths: [null, 220] },
    { container: '.tm-metro .tm-metro-body', columns: ['> div:first-child', 'aside'], widths: [null, 160] },
    { container: '.tm-metro .tm-metro-header', columns: ['.tm-metro-left', '.tm-metro-right'], widths: [null, 180], skip: ['.tm-metro-accent'] },
    { container: '.tm-swiss .tm-swiss-grid', columns: ['.tm-name', '.tm-swiss-meta'], widths: [null, 200] },
    { container: '.tm-lattice .tm-lattice-grid', columns: ['.tm-name', '.tm-lattice-meta'], widths: [null, 190] }
  ];

  const DUAL_COLUMN_CONTAINERS = [
    { container: '.tm-apex .tm-apex-body', fullWidth: '.tm-apex-full' },
    { container: '.tm-echo .tm-echo-cols', fullWidth: '.tm-echo-full' }
  ];

  function resolveCssUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    const base = document.baseURI || window.location.href;
    const root = base.replace(/[^/]*$/, '');
    return new URL(path.replace(/^\//, ''), root).href;
  }

  async function fetchExportCss() {
    if (cssCache) return cssCache;

    const parts = await Promise.all(CSS_FILES.map(async (path) => {
      const url = resolveCssUrl(path);
      try {
        const res = await fetch(url);
        if (!res.ok) return '';
        return await res.text();
      } catch {
        return '';
      }
    }));

    const combined = parts.filter(Boolean).join('\n');
    if (combined.length > 500) {
      cssCache = combined;
      return cssCache;
    }

    // Fallback: read rules from already-loaded same-origin stylesheets
    let fallback = '';
    try {
      [...document.styleSheets].forEach(sheet => {
        try {
          const href = sheet.href || '';
          if (!href || !CSS_FILES.some(f => href.includes(f.replace(/^\//, '')))) return;
          [...sheet.cssRules].forEach(rule => {
            if (rule.cssText) fallback += rule.cssText + '\n';
          });
        } catch { /* cross-origin */ }
      });
    } catch { /* ignore */ }

    cssCache = (fallback.length > combined.length ? fallback : combined) || combined;
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
      .replace(/\t/g, '\\tab ')
      .replace(/\n/g, '\\line ')
      .replace(/[^\x00-\x7F]/g, ch => `\\u${ch.charCodeAt(0)}?`);
  }

  function getTemplateOrientation(tpl) {
    return window.TEMPLATE_EXTENSIONS?.getOrientation?.(tpl) || 'portrait';
  }

  function getPageDimensions(tpl) {
    const orient = getTemplateOrientation(tpl);
    return orient === 'landscape'
      ? { orientation: 'landscape', width: 1056, widthIn: '11in', heightIn: '8.5in' }
      : { orientation: 'portrait', width: 816, widthIn: '8.5in', heightIn: '11in' };
  }

  function getPreviewDocumentClass(tpl) {
    const orient = getTemplateOrientation(tpl);
    return `resume-document resume-preview page-preview orientation-${orient} template-${tpl}`;
  }

  function getPageCss(tpl) {
    const dim = getPageDimensions(tpl);
    return `@page { size: ${dim.widthIn} ${dim.heightIn}; margin: 0.5in; }`;
  }

  function parseHtmlFragment(html) {
    const doc = new DOMParser().parseFromString(`<div id="export-root">${html}</div>`, 'text/html');
    return doc.getElementById('export-root');
  }

  function sanitizeBodyHtml(bodyHtml) {
    const root = parseHtmlFragment(bodyHtml);
    root.querySelectorAll('i, .fa-solid, .fa-brands, script, style').forEach(el => el.remove());
    root.querySelectorAll('[class*="tm-metro-accent"]').forEach(el => el.remove());
    return root.innerHTML;
  }

  function createWordTable(doc, className) {
    const table = doc.createElement('table');
    table.className = `${className} tm-word-table`;
    table.setAttribute('width', '100%');
    table.setAttribute('cellpadding', '0');
    table.setAttribute('cellspacing', '0');
    table.setAttribute('border', '0');
    table.setAttribute('role', 'presentation');
    return table;
  }

  function queryLayoutColumn(el, sel) {
    if (!sel) return null;
    const childSel = sel.replace(/^:scope\s*/, '').trim();
    if (childSel.startsWith('>')) {
      const matchSel = childSel.replace(/^>\s*/, '');
      return [...el.children].find(child => child.matches(matchSel)) || null;
    }
    return el.querySelector(sel);
  }

  function moveIntoCell(doc, tr, sourceEl, width) {
    if (!sourceEl) return;
    const td = doc.createElement('td');
    td.className = sourceEl.className;
    td.setAttribute('valign', 'top');
    if (width) td.setAttribute('width', String(width));
    td.innerHTML = sourceEl.innerHTML;
    tr.appendChild(td);
  }

  function convertGridToTable(root, { container, columns, widths, skip = [] }) {
    root.querySelectorAll(container).forEach(el => {
      const doc = el.ownerDocument;
      const table = createWordTable(doc, el.className);
      const tr = doc.createElement('tr');

      columns.forEach((sel, idx) => {
        const source = queryLayoutColumn(el, sel);
        moveIntoCell(doc, tr, source, widths[idx]);
      });

      if (tr.children.length) {
        table.appendChild(tr);
        skip.forEach(sel => el.querySelector(sel)?.remove());
        el.innerHTML = '';
        el.appendChild(table);
      }
    });
  }

  function convertDualColumnToTables(root, { container, fullWidth }) {
    root.querySelectorAll(container).forEach(el => {
      const doc = el.ownerDocument;
      const table = createWordTable(doc, el.className);
      const children = [...el.children];
      let pending = [];

      const flushRow = (colSpan = 1) => {
        if (!pending.length) return;
        const tr = doc.createElement('tr');
        if (colSpan > 1) {
          const td = doc.createElement('td');
          td.colSpan = colSpan;
          td.className = 'tm-word-full-row';
          pending.forEach(node => td.appendChild(node));
          tr.appendChild(td);
        } else {
          pending.forEach(node => {
            const td = doc.createElement('td');
            td.setAttribute('valign', 'top');
            td.setAttribute('width', '50%');
            td.appendChild(node);
            tr.appendChild(td);
          });
          if (pending.length === 1) {
            const td = doc.createElement('td');
            td.setAttribute('width', '50%');
            tr.appendChild(td);
          }
        }
        table.appendChild(tr);
        pending = [];
      };

      children.forEach(child => {
        const clone = child.cloneNode(true);
        if (fullWidth && child.matches(fullWidth)) {
          flushRow(1);
          pending = [clone];
          flushRow(2);
        } else {
          pending.push(clone);
          if (pending.length === 2) flushRow(1);
        }
      });
      if (pending.length) flushRow(pending.length === 1 ? 2 : 1);

      if (table.rows.length) {
        el.innerHTML = '';
        el.appendChild(table);
      }
    });
  }

  function prepareHtmlForWord(bodyHtml) {
    const root = parseHtmlFragment(sanitizeBodyHtml(bodyHtml));
    GRID_LAYOUTS.forEach(layout => convertGridToTable(root, layout));
    DUAL_COLUMN_CONTAINERS.forEach(layout => convertDualColumnToTables(root, layout));
    return root.innerHTML;
  }

  function buildDocumentShell(tpl, bodyHtml, { wordMode = false } = {}) {
    const dim = getPageDimensions(tpl);
    const docClass = getPreviewDocumentClass(tpl);
    const content = wordMode ? prepareHtmlForWord(bodyHtml) : sanitizeBodyHtml(bodyHtml);
    return { docClass, content, dim };
  }

  async function buildEditableHtml(tpl, bodyHtml) {
    const css = await fetchExportCss();
    const { docClass, content, dim } = buildDocumentShell(tpl, bodyHtml);
    const title = escapeHtml((resumeData.name || 'Resume') + ' — Resume');
    const shellClass = 'resume-document';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${dim.width}">
  <meta name="generator" content="ProResume AI">
  <title>${title}</title>
  <style>${css}
    body { margin: 0; padding: 16px; background: #f1f5f9; font-family: Inter, 'Segoe UI', Arial, Helvetica, sans-serif; }
    .${shellClass} { margin: 0 auto; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  </style>
</head>
<body>
  <div class="${docClass}" style="width:${dim.widthIn};max-width:100%;">${content}</div>
</body>
</html>`;
  }

  async function buildWordDocument(tpl, bodyHtml) {
    const css = await fetchExportCss();
    const { docClass, content, dim } = buildDocumentShell(tpl, bodyHtml, { wordMode: true });
    const title = escapeHtml(resumeData.name || 'Resume');

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="ProResume AI">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    ${css}
    ${getPageCss(tpl)}
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
    .resume-document { width: ${dim.widthIn}; margin: 0 auto; }
    table.tm-word-table { border-collapse: collapse; }
    td { vertical-align: top; }
  </style>
</head>
<body>
  <div class="${docClass}" style="width:${dim.widthIn};">${content}</div>
</body>
</html>`;
  }

  function textOf(el) {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function firstDirectChild(el, ...selectors) {
    const selector = selectors.join(', ');
    return [...el.children].find(child => child.matches(selector)) || null;
  }

  function buildRtfDocument(tpl, bodyHtml) {
    const root = parseHtmlFragment(sanitizeBodyHtml(bodyHtml));
    const parts = [];
    const nl = '\\line ';

    const pushText = (text, opts = {}) => {
      const t = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : textOf(text);
      if (!t) return;
      let rtf = escapeRtf(t);
      if (opts.bold) rtf = `{\\b ${rtf}}`;
      if (opts.size) rtf = `{\\fs${opts.size} ${rtf}}`;
      parts.push(rtf + nl);
    };

    const pushHeading = (text) => {
      const t = text.replace(/\s+/g, ' ').trim();
      if (!t) return;
      parts.push(`{\\fs22\\b ${escapeRtf(t)}}${nl}`);
    };

    const nameEl = root.querySelector('.tm-name, .tm-themed-name');
    if (nameEl) pushText(nameEl, { bold: true, size: 32 });

    const titleEl = root.querySelector('.tm-title, .tm-themed-title');
    if (titleEl) pushText(titleEl, { size: 24 });

    const contactLines = new Set();
    root.querySelectorAll('.tm-contact, .tm-themed-contact').forEach(el => {
      const t = textOf(el);
      if (t) contactLines.add(t);
    });
    if (!contactLines.size) {
      root.querySelectorAll('.tm-contact-item span, .tm-metro-right div, .tm-sidebar .tm-contact-item').forEach(el => {
        const t = textOf(el);
        if (t) contactLines.add(t);
      });
    }
    if (contactLines.size) {
      pushText([...contactLines].join(' · '));
    } else {
      const fallback = [resumeData.email, resumeData.phone, resumeData.location].filter(Boolean).join(' · ');
      if (fallback) pushText(fallback);
    }

    parts.push(nl);

    const processEntry = (entry) => {
      const role = entry.querySelector('.tm-entry-role');
      const company = entry.querySelector('.tm-entry-company');
      const meta = entry.querySelector('.tm-entry-meta');
      const dates = entry.querySelector('.tm-entry-dates');

      if (role || company) {
        const line = [textOf(role), textOf(company)].filter(Boolean).join(' — ');
        pushText(line, { bold: true });
      }
      if (meta) pushText(meta);
      if (dates) pushText(dates);

      entry.querySelectorAll('.tm-bullets li').forEach(li => {
        parts.push(`\\bullet  ${escapeRtf(textOf(li))}${nl}`);
      });
    };

    const processSection = (section) => {
      const heading = firstDirectChild(section, '.tm-section-title', '.tm-side-label', '.tm-side-title');
      if (heading) pushHeading(textOf(heading));

      const summary = firstDirectChild(section, '.tm-summary');
      if (summary) pushText(summary);

      section.querySelectorAll('.tm-entry').forEach(processEntry);

      const skillEls = section.querySelectorAll('.tm-skills .tm-skill, .tm-skill-pill');
      if (skillEls.length) {
        const skills = [...skillEls].map(textOf).filter(Boolean);
        if (skills.length) pushText(skills.join(' · '));
      }

      const inlineSkills = section.querySelector('.tm-skills-inline-dots, .tm-skills-compact, .tm-skills-elegant, .tm-skills-academic, .tm-skills-wrap');
      if (inlineSkills) pushText(inlineSkills);
    };

    root.querySelectorAll('.tm-section, .tm-side-section, .tm-side-skills').forEach(processSection);

    if (!parts.length) {
      pushText(resumeData.name || 'Your Name', { bold: true, size: 32 });
      pushText(resumeData.title || '');
      if (resumeData.summary) {
        pushHeading('SUMMARY');
        pushText(resumeData.summary);
      }
    }

    return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fswiss Arial;}{\\f1\\froman Times New Roman;}}\\f0\\fs22\n${parts.join('')}}`;
  }

  window.EXPORT_EDITABLE = {
    fetchExportCss,
    buildEditableHtml,
    buildWordDocument,
    buildRtfDocument,
    sanitizeBodyHtml,
    prepareHtmlForWord
  };
})();
