/**
 * Word export themes and layout metadata for all resume templates.
 * Microsoft Word ignores most CSS — inline colors and table layouts come from here.
 */
(function () {
  const DEFAULT = {
    accent: '#047857',
    accentBorder: '#34d399',
    headerBg: null,
    headerText: '#ffffff',
    sidebarBg: '#047857',
    sidebarText: '#ffffff',
    sidebarLabel: '#a7f3d0',
    bodyBg: '#ffffff',
    bodyText: '#334155',
    bodyHeading: '#0f172a',
    skillSidebarBg: '#059669',
    skillSidebarText: '#ffffff',
    skillBodyBg: '#ecfdf5',
    skillBodyText: '#065f46'
  };

  /** @type {Record<string, Partial<typeof DEFAULT>>} */
  const OVERRIDES = {
    modern: { sidebarBg: '#0f766e', accent: '#0f766e' },
    verdant: { sidebarBg: '#047857', accent: '#047857' },
    jade: { sidebarBg: '#065f46', accent: '#065f46' },
    harbor: { sidebarBg: '#1e3a5f', accent: '#1e3a5f' },
    slate: { sidebarBg: '#334155', accent: '#334155' },
    executive: { accent: '#0f172a', accentBorder: '#0f172a', headerBg: '#0f172a' },
    stanford: { accent: '#8b0000', accentBorder: '#8b0000' },
    creative: { headerBg: '#6d28d9', accent: '#6d28d9' },
    corporate: { headerBg: '#1e3a5f', accent: '#1e3a5f' },
    tech: { headerBg: '#0f172a', accent: '#06b6d4' },
    harvard: { accent: '#8b0000', accentBorder: '#8b0000' },
    luxury: { headerBg: '#1a1a2e', accent: '#d4af37' },
    international: { headerBg: '#1e40af', accent: '#1e40af' },
    bold: { headerBg: '#dc2626', accent: '#dc2626' },
    elegant: { accent: '#7c3aed' },
    compact: { accent: '#2563eb' },
    metro: { accent: '#ea580c', headerBg: '#18181b' },
    nova: { accent: '#7c3aed' },
    apex: { accent: '#0891b2' },
    canvas: { accent: '#059669' },
    pioneer: { accent: '#b45309' },
    academic: { accent: '#8b0000' },
    fusion: { headerBg: '#4f46e5', accent: '#4f46e5' },
    monarch: { headerBg: '#713f12', accent: '#d97706' },
    swiss: { accent: '#dc2626' },
    vivid: { accent: '#db2777' },
    forest: { headerBg: '#14532d', accent: '#166534' },
    onyx: { bodyBg: '#27272a', bodyText: '#e4e4e7', bodyHeading: '#ffffff', accent: '#d4d4d8', headerBg: '#18181b', headerText: '#ffffff' },
    radiant: { headerBg: '#ea580c', accent: '#ea580c' },
    streamline: { accent: '#1e40af' },
    refined: { accent: '#475569' },
    horizon: { headerBg: '#0f766e', accent: '#0f766e' },
    serif: { accent: '#44403c' },
    cobalt: { headerBg: '#1e3a8a', accent: '#1e40af' },
    amber: { accent: '#b45309' },
    crimson: { headerBg: '#991b1b', accent: '#b91c1c' },
    nordic: { accent: '#475569' },
    arctic: { accent: '#0284c7' },
    sapphire: { headerBg: '#0f172a', accent: '#3b82f6' },
    copper: { headerBg: '#9a3412', accent: '#c2410c' },
    platinum: { accent: '#52525b' },
    granite: { accent: '#57534e' },
    azure: { headerBg: '#0284c7', accent: '#0284c7' },
    lattice: { accent: '#6366f1' },
    haven: { headerBg: '#166534', accent: '#166534' },
    mahogany: { accent: '#78350f' },
    obsidian: { bodyBg: '#171717', bodyText: '#e5e5e5', bodyHeading: '#ffffff', headerBg: '#0a0a0a', headerText: '#ffffff', accent: '#d4af37', skillSidebarBg: '#404040', skillSidebarText: '#ffffff' },
    sunset: { headerBg: '#be185d', accent: '#ea580c' },
    velvet: { headerBg: '#4c1d95', accent: '#a78bfa' },
    zenith: { headerBg: '#1c1917', accent: '#d4af37' },
    cipher: { bodyBg: '#0f172a', bodyText: '#e2e8f0', bodyHeading: '#ffffff', accent: '#22d3ee', headerBg: '#020617', headerText: '#22d3ee' },
    forge: { accent: '#78716c' },
    pulse: { accent: '#0891b2' },
    ember: { bodyBg: '#292524', bodyText: '#fafaf9', bodyHeading: '#ffffff', accent: '#fb923c', headerBg: '#1c1917', headerText: '#ffffff' },
    canopy: { headerBg: '#14532d', accent: '#22c55e' },
    stellar: { bodyBg: '#0f172a', bodyText: '#e2e8f0', bodyHeading: '#ffffff', accent: '#818cf8', headerBg: '#020617', headerText: '#ffffff' },
    prism: { accent: '#a855f7' },
    echo: { accent: '#0891b2' },
    atlas: { headerBg: '#0c4a6e', accent: '#0369a1' },
    regal: { headerBg: '#1a1a2e', accent: '#d4af37' },
    prestige: { headerBg: '#000000', accent: '#d4af37' },
    sovereign: { headerBg: '#581c87', accent: '#9333ea' }
  };

  /** Layout hints used by Word HTML conversion */
  const LAYOUT = {
    modern: 'sidebar-left', verdant: 'sidebar-left', jade: 'sidebar-left',
    harbor: 'sidebar-right', slate: 'sidebar-right',
    executive: 'exec-grid', stanford: 'stanford-grid', academic: 'academic-grid',
    metro: 'metro', swiss: 'swiss', lattice: 'swiss',
    apex: 'dual', echo: 'dual',
    onyx: 'dark', obsidian: 'dark', cipher: 'dark', ember: 'dark', stellar: 'dark',
    radiant: 'header-body', streamline: 'header-body', horizon: 'header-body',
    creative: 'header-body', fusion: 'header-body', monarch: 'header-body',
    forest: 'header-body', cobalt: 'header-body', crimson: 'header-body',
    copper: 'header-body', azure: 'header-body', haven: 'header-body',
    sunset: 'header-body', zenith: 'header-body', canopy: 'header-body',
    regal: 'header-body', sovereign: 'header-body', sapphire: 'header-body',
    velvet: 'header-body', atlas: 'header-body', prestige: 'header-body'
  };

  function getTheme(templateId) {
    return { ...DEFAULT, ...(OVERRIDES[templateId] || {}) };
  }

  function getLayout(templateId) {
    if (LAYOUT[templateId]) return LAYOUT[templateId];
    const ext = window.TEMPLATE_EXTENSIONS?.catalog?.find(t => t.id === templateId);
    if (!ext?.layout) return 'single';
    const map = {
      'sidebar-left': 'sidebar-left',
      'sidebar-right': 'sidebar-right',
      header: 'header-body',
      luxury: 'header-body',
      dark: 'dark',
      accent: 'single',
      minimal: 'single',
      swiss: 'swiss',
      dual: 'dual'
    };
    return map[ext.layout] || 'single';
  }

  window.WORD_EXPORT_THEMES = { getTheme, getLayout, DEFAULT };
})();
