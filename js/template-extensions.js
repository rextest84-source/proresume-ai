// ProResume AI — Templates 33–64 (32 premium designs)

(function () {
  const contactSep = (sep) => (items) => items.map(c => escapeHtml(c.value)).join(sep);
  const contactBlock = (items) => items.map(c => `<div>${escapeHtml(c.value)}</div>`).join('');

  function skillsPills(id) {
    const skills = getSkillsArray();
    if (!skills.length) return '';
    return `<div class="tm-skills tm-skills-wrap">${skills.map(s => `<span class="tm-skill tm-skill-${id}">${escapeHtml(s)}</span>`).join('')}</div>`;
  }

  function skillsDots(id) {
    const skills = getSkillsArray();
    if (!skills.length) return '';
    return `<p class="tm-skills tm-skills-inline-dots tm-skills-${id}">${skills.map(escapeHtml).join(' · ')}</p>`;
  }

  function skillsList(id) {
    const skills = getSkillsArray();
    if (!skills.length) return '';
    return `<div class="tm-skills tm-skills-${id}-list">${skills.map(s => `<div class="tm-skill tm-skill-${id}">${escapeHtml(s)}</div>`).join('')}</div>`;
  }

  function skillsSidebarBlocks(id) {
    const skills = getSkillsArray();
    if (!skills.length) return '';
    return `<div class="tm-skills tm-skills-${id}-side">${skills.map(s => `<span class="tm-skill tm-skill-${id}">${escapeHtml(s)}</span>`).join('')}</div>`;
  }

  const EXTENDED_SKILLS = {
    cobalt: () => skillsPills('cobalt'),
    amber: () => skillsList('amber'),
    verdant: () => skillsSidebarBlocks('verdant'),
    crimson: () => skillsPills('crimson'),
    nordic: () => skillsDots('nordic'),
    arctic: () => skillsPills('arctic'),
    sapphire: () => skillsPills('sapphire'),
    copper: () => skillsPills('copper'),
    platinum: () => skillsDots('platinum'),
    jade: () => skillsSidebarBlocks('jade'),
    granite: () => skillsList('granite'),
    azure: () => skillsPills('azure'),
    lattice: () => skillsPills('lattice'),
    haven: () => skillsPills('haven'),
    harbor: () => skillsSidebarBlocks('harbor'),
    mahogany: () => skillsDots('mahogany'),
    obsidian: () => skillsPills('obsidian'),
    sunset: () => skillsPills('sunset'),
    velvet: () => skillsPills('velvet'),
    zenith: () => skillsPills('zenith'),
    cipher: () => skillsPills('cipher'),
    forge: () => skillsList('forge'),
    pulse: () => skillsPills('pulse'),
    ember: () => skillsPills('ember'),
    canopy: () => skillsPills('canopy'),
    stellar: () => skillsPills('stellar'),
    prism: () => skillsPills('prism'),
    echo: () => skillsPills('echo'),
    atlas: () => skillsPills('atlas'),
    regal: () => skillsPills('regal'),
    prestige: () => skillsPills('prestige'),
    sovereign: () => skillsPills('sovereign')
  };

  function renderExtSkillsSection(id, title) {
    const fn = EXTENDED_SKILLS[id];
    if (!fn) return '';
    const content = fn();
    if (!content) return '';
    return `<div class="tm-section tm-skills-section"><div class="tm-section-title">${title || 'Skills'}</div>${content}</div>`;
  }

  function headerBody(id, contactFn = contactSep(' · ')) {
    const contact = getContactItems();
    return `<div class="tm-${id}"><header class="tm-${id}-header"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${contactFn(contact)}</div></header><div class="tm-${id}-body">${renderBodyCore()}${renderExtSkillsSection(id)}</div></div>`;
  }

  function centeredLux(id) {
    const contact = getContactItems();
    return `<div class="tm-${id}"><header class="tm-${id}-header"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${contact.map(c => escapeHtml(c.value)).join(' · ')}</div></header><div class="tm-${id}-body">${renderBodyCore()}${renderExtSkillsSection(id)}</div></div>`;
  }

  function accentLeft(id) {
    const contact = getContactItems();
    return `<div class="tm-${id}"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${contact.map(c => escapeHtml(c.value)).join(' · ')}</div>${renderBodyCore()}${renderExtSkillsSection(id)}</div>`;
  }

  function minimalTop(id, contactSepStr = ' · ') {
    const contact = getContactItems();
    return `<div class="tm-${id}"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${contact.map(c => escapeHtml(c.value)).join(contactSepStr)}</div>${renderBodyCore()}${renderExtSkillsSection(id)}</div>`;
  }

  function darkFull(id) {
    return minimalTop(id, '  ·  ');
  }

  function swissGrid(id) {
    const contact = getContactItems();
    return `<div class="tm-${id}"><div class="tm-${id}-grid"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><div class="tm-${id}-meta"><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${contactBlock(contact)}</div></div></div>${renderBodyCore()}${renderExtSkillsSection(id)}</div>`;
  }

  function sidebarLeft(id, skillLabel = 'Skills') {
    const skills = getSkillsArray();
    return `<div class="tm-${id}"><aside class="tm-${id}-side"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-side-section"><div class="tm-side-label">Contact</div>${renderContactHtml()}</div>${skills.length ? `<div class="tm-side-section"><div class="tm-side-label">${skillLabel}</div>${skillsSidebarBlocks(id)}</div>` : ''}</aside><main class="tm-${id}-main">${resumeData.summary ? `<div class="tm-section"><div class="tm-section-title">Profile</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}${getExperienceEntries().length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}${getEducationEntries().length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}</main></div>`;
  }

  function sidebarRight(id) {
    const skills = getSkillsArray();
    return `<div class="tm-${id}"><main class="tm-${id}-main"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p>${renderBodyCore()}</main><aside class="tm-${id}-side"><div class="tm-side-section"><div class="tm-side-label">Contact</div>${renderContactHtml()}</div>${skills.length ? `<div class="tm-side-section"><div class="tm-side-label">Skills</div>${skillsSidebarBlocks(id)}</div>` : ''}</aside></div>`;
  }

  function dualColumn(id) {
    const exp = getExperienceEntries();
    const edu = getEducationEntries();
    const contact = getContactItems();
    const skillsSec = renderExtSkillsSection(id);
    const skillsHtml = skillsSec ? skillsSec.replace('<div class="tm-section', `<div class="tm-section tm-${id}-full`) : '';
    return `<div class="tm-${id}"><header class="tm-${id}-banner"><h1 class="tm-name">${escapeHtml(resumeData.name || 'Your Name')}</h1><p class="tm-title">${escapeHtml(resumeData.title || 'Professional Title')}</p><div class="tm-contact">${contact.map(c => escapeHtml(c.value)).join(' · ')}</div></header><div class="tm-${id}-cols">${resumeData.summary ? `<div class="tm-section tm-${id}-full"><div class="tm-section-title">Summary</div><p class="tm-summary">${escapeHtml(resumeData.summary)}</p></div>` : ''}${exp.length ? `<div class="tm-section"><div class="tm-section-title">Experience</div>${renderExperienceBlocks()}</div>` : ''}${edu.length ? `<div class="tm-section"><div class="tm-section-title">Education</div>${renderEducationBlocks()}</div>` : ''}${skillsHtml}</div></div>`;
  }

  const EXTENDED_CATALOG = [
    { id: 'cobalt', label: 'Cobalt', tier: 'free', layout: 'header' },
    { id: 'amber', label: 'Amber', tier: 'free', layout: 'accent' },
    { id: 'verdant', label: 'Verdant', tier: 'free', layout: 'sidebar-left' },
    { id: 'crimson', label: 'Crimson', tier: 'free', layout: 'header' },
    { id: 'nordic', label: 'Nordic', tier: 'free', layout: 'minimal' },
    { id: 'arctic', label: 'Arctic', tier: 'free', layout: 'minimal' },
    { id: 'sapphire', label: 'Sapphire', tier: 'starter', layout: 'luxury' },
    { id: 'copper', label: 'Copper', tier: 'starter', layout: 'header' },
    { id: 'platinum', label: 'Platinum', tier: 'starter', layout: 'minimal' },
    { id: 'jade', label: 'Jade', tier: 'starter', layout: 'sidebar-left' },
    { id: 'granite', label: 'Granite', tier: 'starter', layout: 'minimal' },
    { id: 'azure', label: 'Azure', tier: 'starter', layout: 'header' },
    { id: 'lattice', label: 'Lattice', tier: 'starter', layout: 'swiss' },
    { id: 'haven', label: 'Haven', tier: 'starter', layout: 'header' },
    { id: 'harbor', label: 'Harbor', tier: 'starter', layout: 'sidebar-right' },
    { id: 'mahogany', label: 'Mahogany', tier: 'starter', layout: 'minimal' },
    { id: 'obsidian', label: 'Obsidian', tier: 'pro', layout: 'dark' },
    { id: 'sunset', label: 'Sunset', tier: 'pro', layout: 'header' },
    { id: 'velvet', label: 'Velvet', tier: 'pro', layout: 'luxury' },
    { id: 'zenith', label: 'Zenith', tier: 'pro', layout: 'header' },
    { id: 'cipher', label: 'Cipher', tier: 'pro', layout: 'dark' },
    { id: 'forge', label: 'Forge', tier: 'pro', layout: 'accent' },
    { id: 'pulse', label: 'Pulse', tier: 'pro', layout: 'minimal' },
    { id: 'ember', label: 'Ember', tier: 'pro', layout: 'dark' },
    { id: 'canopy', label: 'Canopy', tier: 'pro', layout: 'header' },
    { id: 'stellar', label: 'Stellar', tier: 'pro', layout: 'dark' },
    { id: 'prism', label: 'Prism', tier: 'pro', layout: 'accent' },
    { id: 'echo', label: 'Echo', tier: 'pro', layout: 'dual' },
    { id: 'atlas', label: 'Atlas', tier: 'business', layout: 'luxury' },
    { id: 'regal', label: 'Regal', tier: 'business', layout: 'header' },
    { id: 'prestige', label: 'Prestige', tier: 'business', layout: 'luxury' },
    { id: 'sovereign', label: 'Sovereign', tier: 'business', layout: 'header' }
  ];

  const BASE_CATALOG = [
    { id: 'modern', label: 'Modern', tier: 'free' },
    { id: 'classic', label: 'Classic', tier: 'free' },
    { id: 'minimal', label: 'Minimal', tier: 'free' },
    { id: 'stanford', label: 'Stanford', tier: 'free' },
    { id: 'horizon', label: 'Horizon', tier: 'free' },
    { id: 'serif', label: 'Serif', tier: 'free' },
    { id: 'corporate', label: 'Corporate', tier: 'starter' },
    { id: 'elegant', label: 'Elegant', tier: 'starter' },
    { id: 'compact', label: 'Compact', tier: 'starter' },
    { id: 'metro', label: 'Metro', tier: 'starter' },
    { id: 'slate', label: 'Slate', tier: 'starter' },
    { id: 'canvas', label: 'Canvas', tier: 'starter' },
    { id: 'fusion', label: 'Fusion', tier: 'starter' },
    { id: 'monarch', label: 'Monarch', tier: 'starter' },
    { id: 'swiss', label: 'Swiss', tier: 'starter' },
    { id: 'executive', label: 'Executive', tier: 'pro' },
    { id: 'creative', label: 'Creative', tier: 'pro' },
    { id: 'tech', label: 'Tech', tier: 'pro' },
    { id: 'harvard', label: 'Harvard', tier: 'pro' },
    { id: 'bold', label: 'Bold', tier: 'pro' },
    { id: 'nova', label: 'Nova', tier: 'pro' },
    { id: 'apex', label: 'Apex', tier: 'pro' },
    { id: 'pioneer', label: 'Pioneer', tier: 'pro' },
    { id: 'academic', label: 'Academic', tier: 'pro' },
    { id: 'vivid', label: 'Vivid', tier: 'pro' },
    { id: 'forest', label: 'Forest', tier: 'pro' },
    { id: 'onyx', label: 'Onyx', tier: 'pro' },
    { id: 'streamline', label: 'Stream', tier: 'pro' },
    { id: 'luxury', label: 'Luxury', tier: 'business' },
    { id: 'international', label: 'Intl', tier: 'business' },
    { id: 'refined', label: 'Refined', tier: 'business' },
    { id: 'radiant', label: 'Radiant', tier: 'business' }
  ];

  const layoutRenderers = {
    header: headerBody,
    luxury: centeredLux,
    accent: accentLeft,
    minimal: minimalTop,
    dark: darkFull,
    swiss: swissGrid,
    'sidebar-left': sidebarLeft,
    'sidebar-right': sidebarRight,
    dual: dualColumn
  };

  const EXTENDED_TIERS = {};
  const EXTENDED_RENDERERS = {};

  EXTENDED_CATALOG.forEach(t => {
    EXTENDED_TIERS[t.id] = t.tier;
    const render = layoutRenderers[t.layout];
    EXTENDED_RENDERERS[t.id] = () => render(t.id);
  });

  window.TEMPLATE_EXTENSIONS = {
    catalog: [...BASE_CATALOG, ...EXTENDED_CATALOG],
    tiers: EXTENDED_TIERS,
    renderers: EXTENDED_RENDERERS,
    skills: EXTENDED_SKILLS,
    sidebarTemplates: ['verdant', 'jade', 'harbor'],
    gridTemplates: ['lattice', 'echo', 'harbor', 'verdant', 'jade']
  };
})();
