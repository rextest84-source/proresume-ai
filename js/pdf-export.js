/**
 * ProResume AI — raster PDF/PNG/JPEG export (all 64 templates).
 * Inlines computed styles before html2canvas so grid, sidebar, and dark templates capture reliably.
 */
(function () {
  const EXPORT_SCALE = 2;

  const LETTER_PT = { portrait: { width: 612, height: 792 }, landscape: { width: 792, height: 612 } };

  const STYLE_PROPS = [
    'display', 'position', 'boxSizing', 'width', 'maxWidth', 'minWidth', 'height', 'minHeight',
    'flex', 'flexDirection', 'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis', 'alignItems',
    'alignSelf', 'justifyContent', 'gap', 'gridTemplateColumns', 'gridTemplateRows', 'gridColumn',
    'gridRow', 'columnGap', 'rowGap',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'borderTopWidth', 'borderTopStyle', 'borderTopColor',
    'borderRightWidth', 'borderRightStyle', 'borderRightColor',
    'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor',
    'borderLeftWidth', 'borderLeftStyle', 'borderLeftColor',
    'borderRadius',
    'color', 'backgroundColor', 'opacity',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
    'textAlign', 'textTransform', 'textDecoration', 'whiteSpace',
    'overflow', 'overflowWrap', 'wordBreak', 'verticalAlign'
  ];

  function isTransparent(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return true;
    const m = color.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/);
    return m && parseFloat(m[1]) === 0;
  }

  function firstGradientColor(bgImage) {
    if (!bgImage || bgImage === 'none') return '';
    const match = bgImage.match(/(?:rgb\([^)]+\)|#[0-9a-fA-F]{3,8}|rgba\([^)]+\)|[a-z]+)/);
    return match ? match[0] : '';
  }

  function resolveBackground(style) {
    const bg = style.backgroundColor;
    if (!isTransparent(bg)) return bg;
    const fromGradient = firstGradientColor(style.backgroundImage);
    if (fromGradient) return fromGradient;
    return '';
  }

  function inlineStyleProp(el, prop, value) {
    if (value == null || value === '') return;
    try {
      el.style.setProperty(prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`), value);
    } catch { /* ignore invalid values */ }
  }

  function inlineElementStyles(el, win) {
    const style = win.getComputedStyle(el);
    STYLE_PROPS.forEach(prop => inlineStyleProp(el, prop, style[prop]));

    const bg = resolveBackground(style);
    if (bg) el.style.backgroundColor = bg;
    if (style.backgroundImage && style.backgroundImage !== 'none') {
      el.style.backgroundImage = 'none';
    }

    if (style.webkitBackgroundClip === 'text' || style.backgroundClip === 'text') {
      el.style.webkitBackgroundClip = 'border-box';
      el.style.backgroundClip = 'border-box';
      if (style.color && !isTransparent(style.color)) el.style.color = style.color;
    }

    el.style.boxShadow = 'none';
    el.style.transform = 'none';
    el.style.filter = 'none';
    el.style.webkitFilter = 'none';
  }

  function applyExportCaptureFixes(root, doc = document) {
    if (!root) return;
    const win = doc.defaultView || window;

    root.querySelectorAll('i, .fa-solid, .fa-brands, .fa-regular').forEach(el => {
      el.style.display = 'none';
    });

    root.querySelectorAll('[class*="tm-metro-accent"]').forEach(el => {
      el.style.display = 'block';
      el.style.width = '8px';
      el.style.minWidth = '8px';
    });

    root.style.overflow = 'visible';
    root.style.transform = 'none';
    root.style.boxShadow = 'none';

    root.querySelectorAll('[class*="tm-"]').forEach(el => {
      el.style.boxSizing = 'border-box';
    });

    root.querySelectorAll(
      '[class*="-side"], .tm-sidebar, .tm-side-skills, .tm-slate-side, .tm-harbor-side, .tm-verdant-side, .tm-jade-side'
    ).forEach(el => {
      inlineElementStyles(el, win);
      el.style.alignSelf = 'stretch';
      const parent = el.parentElement;
      if (parent) {
        const parentStyle = win.getComputedStyle(parent);
        if (parentStyle.display === 'grid' || parentStyle.display === 'flex') {
          el.style.minHeight = `${Math.max(parent.offsetHeight, parent.scrollHeight, 1)}px`;
        }
      }
    });

    root.querySelectorAll(
      '.tm-modern, .tm-slate, .tm-verdant, .tm-jade, .tm-harbor, .tm-executive, .tm-stanford, .tm-metro, .tm-swiss, .tm-lattice, .tm-apex, .tm-echo'
    ).forEach(el => {
      inlineElementStyles(el, win);
    });

    root.querySelectorAll('[class*="tm-"] *').forEach(el => {
      inlineElementStyles(el, win);
    });
  }

  function measureExportHeight(clone) {
    void clone.offsetHeight;
    return Math.max(Math.ceil(clone.scrollHeight), Math.ceil(clone.offsetHeight), 1);
  }

  function getExportBackgroundColor(clone, doc = document) {
    const themed = clone.querySelector('[class*="tm-"]');
    if (!themed) return '#ffffff';
    const win = doc.defaultView || window;
    const style = win.getComputedStyle(themed);
    const bg = resolveBackground(style);
    return bg || '#ffffff';
  }

  async function waitForPaint() {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise(r => setTimeout(r, 80));
  }

  async function captureResumeCanvas(clone, options = {}) {
    if (typeof html2canvas !== 'function') {
      throw new Error('Export library not loaded. Please refresh the page.');
    }

    const {
      bgColor = '#ffffff',
      contentHeight,
      doc = document,
      pageWidth = 816,
      scale = EXPORT_SCALE
    } = options;

    applyExportCaptureFixes(clone, doc);
    await waitForPaint();

    const height = contentHeight || measureExportHeight(clone);

    return html2canvas(clone, {
      scale,
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
      imageTimeout: 15000,
      onclone: (_doc, clonedEl) => applyExportCaptureFixes(clonedEl, _doc)
    });
  }

  function saveCanvasAsPdf(canvas, options = {}) {
    if (!window.jspdf?.jsPDF) {
      throw new Error('PDF library not loaded. Please refresh the page.');
    }

    const { orientation = 'portrait' } = options;
    const { jsPDF } = window.jspdf;
    const letter = LETTER_PT[orientation] || LETTER_PT.portrait;
    const pageWidth = letter.width;
    const pageHeight = letter.height;
    const pxToPt = pageWidth / canvas.width;
    const totalHeightPt = canvas.height * pxToPt;

    const format = totalHeightPt <= pageHeight * 1.02
      ? 'letter'
      : [pageWidth, totalHeightPt];

    const pdf = new jsPDF({
      orientation,
      unit: 'pt',
      format,
      compress: true
    });

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      pageWidth,
      totalHeightPt
    );

    const blob = pdf.output('blob');
    return blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });
  }

  window.PDF_EXPORT = {
    EXPORT_SCALE,
    applyExportCaptureFixes,
    measureExportHeight,
    getExportBackgroundColor,
    captureResumeCanvas,
    saveCanvasAsPdf
  };
})();
