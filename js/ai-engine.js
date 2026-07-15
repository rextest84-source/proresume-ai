// ProResume AI — Advanced Resume Intelligence Engine
// Client-side engine producing varied, role-aware, ATS-optimized resume content.

const AIEngine = (() => {
  let seed = Date.now();

  function nextSeed() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  }

  function pick(arr) {
    if (!arr?.length) return '';
    return arr[nextSeed() % arr.length];
  }

  function pickN(arr, n) {
    const copy = [...arr];
    const out = [];
    while (out.length < n && copy.length) {
      const i = nextSeed() % copy.length;
      out.push(copy.splice(i, 1)[0]);
    }
    return out;
  }

  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function detectRole(title = '', skills = '', summary = '') {
    const text = `${title} ${skills} ${summary}`.toLowerCase();
    const roles = [
      { id: 'software', keys: ['software', 'developer', 'engineer', 'programmer', 'full stack', 'frontend', 'backend', 'devops', 'react', 'node', 'python', 'java', 'typescript'] },
      { id: 'product', keys: ['product manager', 'product owner', 'pm ', 'roadmap', 'stakeholder', 'agile', 'scrum'] },
      { id: 'data', keys: ['data analyst', 'data scientist', 'machine learning', 'analytics', 'sql', 'tableau', 'power bi', 'statistics'] },
      { id: 'design', keys: ['designer', 'ux', 'ui', 'figma', 'creative', 'graphic', 'visual'] },
      { id: 'marketing', keys: ['marketing', 'seo', 'content', 'social media', 'brand', 'campaign', 'growth'] },
      { id: 'sales', keys: ['sales', 'account executive', 'business development', 'revenue', 'quota', 'crm'] },
      { id: 'finance', keys: ['finance', 'accounting', 'analyst', 'cpa', 'audit', 'bookkeeping', 'financial'] },
      { id: 'healthcare', keys: ['nurse', 'medical', 'healthcare', 'clinical', 'patient', 'pharmacy', 'therapist'] },
      { id: 'education', keys: ['teacher', 'professor', 'education', 'instructor', 'curriculum', 'tutor'] },
      { id: 'operations', keys: ['operations', 'logistics', 'supply chain', 'warehouse', 'procurement'] },
      { id: 'hr', keys: ['human resources', 'recruiter', 'talent', 'hr ', 'people operations'] },
      { id: 'legal', keys: ['legal', 'attorney', 'lawyer', 'paralegal', 'compliance'] },
      { id: 'management', keys: ['manager', 'director', 'supervisor', 'team lead', 'head of', 'vp ', 'chief'] }
    ];
    for (const role of roles) {
      if (role.keys.some(k => text.includes(k))) return role.id;
    }
    return 'general';
  }

  const ROLE_CONFIG = {
    software: {
      verbs: ['Architected', 'Engineered', 'Deployed', 'Optimized', 'Automated', 'Refactored', 'Integrated', 'Scaled', 'Migrated', 'Debugged'],
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'REST APIs', 'AWS', 'CI/CD', 'Agile', 'System Design'],
      impacts: [
        'reducing page load time by {n}%',
        'serving {n}K+ daily active users',
        'cutting deployment time from hours to minutes',
        'improving test coverage to {n}%',
        'decreasing bug reports by {n}% quarter-over-quarter',
        'processing {n}M+ API requests monthly with 99.9% uptime'
      ],
      summaryAngles: [
        'full-stack development and scalable system architecture',
        'building reliable, high-performance web applications',
        'translating business requirements into clean, maintainable code',
        'shipping production-ready features in fast-paced agile teams'
      ]
    },
    product: {
      verbs: ['Defined', 'Prioritized', 'Launched', 'Validated', 'Aligned', 'Shipped', 'Analyzed', 'Roadmapped', 'Coordinated', 'Iterated'],
      skills: ['Product Strategy', 'User Research', 'Roadmapping', 'A/B Testing', 'Jira', 'SQL', 'Stakeholder Management', 'Agile', 'KPI Tracking', 'Wireframing'],
      impacts: [
        'increasing user retention by {n}%',
        'driving {n}% growth in feature adoption',
        'reducing churn by {n} basis points',
        'accelerating time-to-market by {n} weeks',
        'improving NPS score by {n} points',
        'contributing to ${n}M in annual recurring revenue'
      ],
      summaryAngles: [
        'end-to-end product lifecycle management from discovery to launch',
        'translating customer insights into roadmap priorities',
        'cross-functional leadership between engineering, design, and go-to-market',
        'data-informed decision making and measurable product outcomes'
      ]
    },
    data: {
      verbs: ['Analyzed', 'Modeled', 'Visualized', 'Forecasted', 'Automated', 'Cleaned', 'Interpreted', 'Quantified', 'Segmented', 'Predicted'],
      skills: ['SQL', 'Python', 'R', 'Tableau', 'Power BI', 'Excel', 'Statistics', 'ETL', 'Machine Learning', 'Data Visualization'],
      impacts: [
        'uncovering insights that drove {n}% revenue lift',
        'reducing reporting time by {n} hours per week',
        'improving forecast accuracy by {n}%',
        'identifying cost savings of ${n}K annually',
        'building dashboards used by {n}+ stakeholders',
        'increasing campaign ROI by {n}% through segmentation'
      ],
      summaryAngles: [
        'transforming complex datasets into actionable business intelligence',
        'statistical modeling and predictive analytics',
        'building self-serve reporting that empowers decision-makers',
        'rigorous data quality standards and reproducible analysis'
      ]
    },
    design: {
      verbs: ['Designed', 'Prototyped', 'Redesigned', 'Crafted', 'Illustrated', 'Wireframed', 'Usability-tested', 'Branded', 'Visualized', 'Iterated'],
      skills: ['Figma', 'Adobe Creative Suite', 'UI/UX Design', 'Prototyping', 'Design Systems', 'User Research', 'Typography', 'Accessibility', 'Brand Identity'],
      impacts: [
        'improving conversion rate by {n}%',
        'reducing user task completion time by {n}%',
        'increasing design system adoption across {n} product teams',
        'boosting engagement metrics by {n}%',
        'earning {n}+ positive usability test ratings',
        'cutting design-to-dev handoff errors by {n}%'
      ],
      summaryAngles: [
        'user-centered design grounded in research and iteration',
        'creating intuitive interfaces that balance aesthetics and usability',
        'design systems and cross-platform visual consistency',
        'collaborative design process from concept through launch'
      ]
    },
    marketing: {
      verbs: ['Executed', 'Launched', 'Grew', 'Optimized', 'Managed', 'Created', 'Analyzed', 'Positioned', 'Scaled', 'Converted'],
      skills: ['SEO/SEM', 'Content Marketing', 'Google Analytics', 'HubSpot', 'Social Media', 'Email Campaigns', 'Copywriting', 'Brand Strategy', 'CRM'],
      impacts: [
        'growing organic traffic by {n}%',
        'generating {n}K qualified leads per quarter',
        'improving email open rates by {n}%',
        'reducing customer acquisition cost by {n}%',
        'increasing social engagement by {n}%',
        'driving ${n}K in attributed pipeline revenue'
      ],
      summaryAngles: [
        'multi-channel campaigns that drive measurable pipeline growth',
        'content strategy aligned with brand voice and conversion goals',
        'performance marketing with rigorous attribution and optimization',
        'audience development and full-funnel demand generation'
      ]
    },
    sales: {
      verbs: ['Closed', 'Negotiated', 'Prospected', 'Exceeded', 'Cultivated', 'Presented', 'Upsold', 'Converted', 'Retained', 'Expanded'],
      skills: ['B2B Sales', 'CRM (Salesforce)', 'Pipeline Management', 'Negotiation', 'Account Management', 'Cold Outreach', 'Solution Selling', 'Forecasting'],
      impacts: [
        'exceeding quota by {n}% for {n} consecutive quarters',
        'closing ${n}K in new business annually',
        'growing territory revenue by {n}%',
        'maintaining {n}% client retention rate',
        'shortening sales cycle by {n} days',
        'building a pipeline of ${n}M+ in opportunities'
      ],
      summaryAngles: [
        'consultative selling and long-term client relationship building',
        'consistent quota attainment in competitive markets',
        'solution-based approach to complex B2B deals',
        'pipeline discipline and accurate revenue forecasting'
      ]
    },
    finance: {
      verbs: ['Reconciled', 'Forecasted', 'Audited', 'Budgeted', 'Analyzed', 'Reported', 'Streamlined', 'Compliance-reviewed', 'Modeled', 'Allocated'],
      skills: ['Financial Modeling', 'Excel', 'GAAP', 'QuickBooks', 'Budgeting', 'Variance Analysis', 'Forecasting', 'SAP', 'Risk Assessment'],
      impacts: [
        'identifying ${n}K in annual cost savings',
        'improving forecast accuracy to within {n}%',
        'reducing close cycle by {n} days',
        'managing budgets exceeding ${n}M',
        'passing audits with zero material findings',
        'automating reports saving {n} hours monthly'
      ],
      summaryAngles: [
        'financial analysis supporting strategic executive decisions',
        'rigorous reporting, compliance, and internal controls',
        'budget planning and variance analysis across business units',
        'accurate forecasting in dynamic operating environments'
      ]
    },
    healthcare: {
      verbs: ['Administered', 'Coordinated', 'Monitored', 'Documented', 'Educated', 'Assessed', 'Collaborated', 'Implemented', 'Advocated', 'Supported'],
      skills: ['Patient Care', 'EMR/EHR', 'HIPAA Compliance', 'Clinical Documentation', 'Care Coordination', 'Vital Signs', 'Medication Administration'],
      impacts: [
        'maintaining {n}% patient satisfaction scores',
        'reducing readmission rates by {n}%',
        'supporting caseloads of {n}+ patients per shift',
        'achieving {n}% compliance on quality metrics',
        'training {n} new staff members on protocols',
        'improving care coordination across {n} departments'
      ],
      summaryAngles: [
        'compassionate, evidence-based patient care',
        'clinical excellence and interdisciplinary collaboration',
        'accurate documentation and regulatory compliance',
        'patient education and positive health outcomes'
      ]
    },
    education: {
      verbs: ['Taught', 'Developed', 'Assessed', 'Mentored', 'Facilitated', 'Designed', 'Differentiated', 'Engaged', 'Evaluated', 'Collaborated'],
      skills: ['Curriculum Development', 'Lesson Planning', 'Classroom Management', 'Student Assessment', 'Differentiated Instruction', 'EdTech', 'Parent Communication'],
      impacts: [
        'improving student proficiency scores by {n}%',
        'increasing classroom engagement by {n}%',
        'developing curriculum adopted by {n} grade levels',
        'mentoring {n} student teachers or junior faculty',
        'achieving {n}% parent satisfaction ratings',
        'integrating technology tools across {n} subject areas'
      ],
      summaryAngles: [
        'student-centered instruction and measurable learning outcomes',
        'curriculum design aligned with standards and diverse learners',
        'classroom leadership and positive learning environments',
        'data-driven assessment and continuous instructional improvement'
      ]
    },
    operations: {
      verbs: ['Streamlined', 'Coordinated', 'Optimized', 'Managed', 'Reduced', 'Implemented', 'Tracked', 'Standardized', 'Negotiated', 'Scaled'],
      skills: ['Process Improvement', 'Supply Chain', 'Inventory Management', 'Lean/Six Sigma', 'Vendor Management', 'ERP Systems', 'Logistics', 'KPI Tracking'],
      impacts: [
        'reducing operational costs by {n}%',
        'improving on-time delivery to {n}%',
        'cutting inventory waste by ${n}K annually',
        'scaling throughput by {n}% without added headcount',
        'decreasing defect rate to {n}%',
        'managing teams of {n}+ across multiple sites'
      ],
      summaryAngles: [
        'operational efficiency and continuous process improvement',
        'supply chain optimization and cost control',
        'cross-functional coordination in high-volume environments',
        'KPI-driven management and scalable systems'
      ]
    },
    hr: {
      verbs: ['Recruited', 'Onboarded', 'Developed', 'Implemented', 'Mediated', 'Analyzed', 'Streamlined', 'Coached', 'Retained', 'Aligned'],
      skills: ['Talent Acquisition', 'Employee Relations', 'HRIS', 'Onboarding', 'Performance Management', 'Benefits Administration', 'Compliance', 'DEI'],
      impacts: [
        'reducing time-to-fill by {n} days',
        'improving employee retention by {n}%',
        'filling {n}+ open roles per quarter',
        'launching programs adopted by {n}% of workforce',
        'decreasing onboarding time by {n}%',
        'achieving {n}% offer acceptance rate'
      ],
      summaryAngles: [
        'full-cycle talent acquisition and employee experience',
        'HR programs that support retention and engagement',
        'policy development and employment law compliance',
        'people operations partnering with business leaders'
      ]
    },
    legal: {
      verbs: ['Drafted', 'Reviewed', 'Researched', 'Negotiated', 'Advised', 'Litigated', 'Analyzed', 'Filed', 'Managed', 'Ensured'],
      skills: ['Legal Research', 'Contract Review', 'Compliance', 'Due Diligence', 'Westlaw', 'Regulatory Analysis', 'Case Management', 'Negotiation'],
      impacts: [
        'managing caseload of {n}+ matters simultaneously',
        'reducing contract review turnaround by {n}%',
        'identifying ${n}K in risk exposure mitigation',
        'supporting {n} successful closings or filings',
        'achieving {n}% favorable outcome rate',
        'training {n} staff on compliance protocols'
      ],
      summaryAngles: [
        'precise legal analysis and risk-aware counsel',
        'contract negotiation and regulatory compliance',
        'thorough research supporting litigation and advisory work',
        'detail-oriented practice with strong client communication'
      ]
    },
    management: {
      verbs: ['Led', 'Directed', 'Orchestrated', 'Transformed', 'Mentored', 'Established', 'Delivered', 'Aligned', 'Championed', 'Scaled'],
      skills: ['Team Leadership', 'Strategic Planning', 'Budget Management', 'Performance Management', 'Change Management', 'Stakeholder Communication', 'P&L Ownership'],
      impacts: [
        'growing team output by {n}% while maintaining quality',
        'managing budgets of ${n}M+',
        'leading cross-functional teams of {n}+ professionals',
        'improving employee engagement scores by {n} points',
        'delivering {n} major initiatives on time and on budget',
        'increasing departmental efficiency by {n}%'
      ],
      summaryAngles: [
        'building high-performing teams and operational excellence',
        'strategic leadership driving organizational outcomes',
        'change management and cross-functional alignment',
        'mentorship, talent development, and culture building'
      ]
    },
    general: {
      verbs: ['Delivered', 'Managed', 'Improved', 'Coordinated', 'Executed', 'Supported', 'Achieved', 'Streamlined', 'Collaborated', 'Resolved'],
      skills: ['Communication', 'Problem Solving', 'Microsoft Office', 'Project Coordination', 'Customer Service', 'Time Management', 'Teamwork', 'Attention to Detail'],
      impacts: [
        'improving process efficiency by {n}%',
        'consistently meeting deadlines across {n}+ concurrent projects',
        'earning recognition from leadership {n} times',
        'reducing errors by {n}% through improved workflows',
        'supporting teams of {n}+ colleagues',
        'achieving {n}% customer satisfaction ratings'
      ],
      summaryAngles: [
        'reliable execution and strong organizational skills',
        'cross-functional collaboration in dynamic environments',
        'problem-solving with a focus on quality outcomes',
        'adaptability and commitment to continuous improvement'
      ]
    }
  };

  function randMetric() {
    const presets = [12, 15, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 8, 10, 3, 5, 7];
    return pick(presets);
  }

  function fillImpact(template) {
    return template.replace(/\{n\}/g, String(randMetric()));
  }

  function yearsFromExperience(experience = []) {
    const filled = experience.filter(e => e.dates || e.role || e.company);
    if (!filled.length) return pick(['3+', '5+', '7+', '4+']);
    return pick(['3+', '5+', '7+', '10+', '4+', '6+']);
  }

  const WEAK_PHRASES = [
    [/^responsible for\s+/i, ''],
    [/^duties included\s+/i, ''],
    [/^helped with\s+/i, ''],
    [/^assisted with\s+/i, ''],
    [/^worked on\s+/i, ''],
    [/^involved in\s+/i, ''],
    [/\betc\.?\b/gi, ''],
    [/\bvarious\b/gi, 'multiple'],
    [/\bstuff\b/gi, 'initiatives'],
    [/\bthings\b/gi, 'deliverables']
  ];

  function cleanLine(line) {
    let l = line.trim().replace(/^[-•*]\s*/, '').replace(/\s+/g, ' ');
    WEAK_PHRASES.forEach(([re, rep]) => { l = l.replace(re, rep); });
    return l.replace(/\s+/g, ' ').trim();
  }

  function enhanceBullet(line, index, roleId, jobRole) {
    const cfg = ROLE_CONFIG[roleId] || ROLE_CONFIG.general;
    let l = cleanLine(line);
    if (!l) return '';

    const lower = l.toLowerCase();
    const hasStrongVerb = cfg.verbs.some(v => lower.startsWith(v.toLowerCase()));
    const verb = pick(cfg.verbs);

    if (!hasStrongVerb) {
      if (/^(managed|led|developed|built|created|handled)/i.test(l)) {
        l = capitalize(l);
      } else {
        l = `${verb} ${l.charAt(0).toLowerCase()}${l.slice(1)}`;
      }
    }

    if (!/\d/.test(l) && l.length > 25) {
      const impact = fillImpact(pick(cfg.impacts));
      if (!l.endsWith(',')) l += ', ' + impact;
      else l += ' ' + impact;
    }

    if (jobRole && !l.toLowerCase().includes(jobRole.toLowerCase().split(' ')[0])) {
      // keep natural — don't force role into every bullet
    }

    return l.endsWith('.') ? l : l + '.';
  }

  function generateBulletsFromRole(role, company, roleId, count = 4) {
    const cfg = ROLE_CONFIG[roleId] || ROLE_CONFIG.general;
    const co = company || 'the organization';
    const templates = {
      software: [
        `Developed and maintained production applications using modern frameworks, ${fillImpact(pick(cfg.impacts))}`,
        `Collaborated with product and QA teams to ship features on sprint cadence across ${co}`,
        `Wrote clean, tested code and participated in code reviews to uphold engineering standards`,
        `Resolved critical bugs and performance bottlenecks, ${fillImpact(pick(cfg.impacts))}`,
        `Built RESTful APIs and integrated third-party services supporting core business workflows`,
        `Contributed to CI/CD pipelines and infrastructure improvements for reliable deployments`
      ],
      product: [
        `Owned product roadmap priorities and user stories from discovery through release at ${co}`,
        `Conducted user interviews and synthesized insights into actionable requirements`,
        `Partnered with engineering and design to deliver features, ${fillImpact(pick(cfg.impacts))}`,
        `Defined success metrics and monitored KPIs to guide iterative improvements`,
        `Facilitated sprint planning and backlog grooming with cross-functional stakeholders`,
        `Launched go-to-market initiatives aligned with business objectives and user needs`
      ],
      general: [
        `Managed day-to-day responsibilities with strong attention to detail and accountability at ${co}`,
        `Collaborated across teams to deliver projects on schedule and within scope`,
        `Identified process improvements and implemented solutions, ${fillImpact(pick(cfg.impacts))}`,
        `Maintained accurate records and communicated progress to stakeholders`,
        `Supported organizational goals through proactive problem-solving and follow-through`,
        `Trained new team members and documented best practices for consistent execution`
      ]
    };

    const pool = templates[roleId] || templates.general;
    return pickN(pool, count).map((t, i) => enhanceBullet(t, i, roleId, role));
  }

  function dedupeSentences(text) {
    if (!text?.trim()) return '';
    const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 10);
    const seen = new Set();
    const unique = [];
    for (const s of sentences) {
      const key = s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? s : s + '.');
      }
    }
    return unique.join(' ');
  }

  function stripEnhancedBoilerplate(text) {
    if (!text?.trim()) return '';
    let cleaned = cleanLine(text);
    const patterns = [
      /(?:Results-driven|Accomplished|Strategic|Dedicated|Proven|Dynamic|Experienced|Versatile|Detail-oriented|Highly motivated)\s+[^.]{8,120}\./gi,
      /Known for combining analytical thinking[^.]+\./gi,
      /Skilled at partnering with stakeholders[^.]+\./gi,
      /Recognized for clear communication[^.]+\./gi,
      /Committed to quality, accountability[^.]+\./gi,
      /(?:Core competencies|Technical proficiencies|Key strengths|Proficient in)\s+(?:include\s+)?[^.]+\./gi,
      /\d+\+?\s*years?\s+of\s+(?:progressive\s+)?experience[^.]+\./gi
    ];
    for (const re of patterns) cleaned = cleaned.replace(re, ' ');
    return dedupeSentences(cleaned.replace(/\s+/g, ' ').trim());
  }

  function trimToWordCount(text, maxWords = 95) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ').replace(/[,;]\s*$/, '') + '.';
  }

  function enhanceSummary(text, title, skills, experience) {
    const roleId = detectRole(title, skills, text);
    const cfg = ROLE_CONFIG[roleId];
    const yrs = yearsFromExperience(experience);
    const role = title || pick(['Professional', 'Specialist', 'Consultant']);
    const angle = pick(cfg.summaryAngles);
    const stripped = stripEnhancedBoilerplate(text);
    const skillList = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    const topSkills = skillList.length ? pickN(skillList, Math.min(4, skillList.length)).join(', ') : pickN(cfg.skills, 4).join(', ');

    const openers = [
      `${pick(['Results-driven', 'Accomplished', 'Strategic', 'Dedicated', 'Proven', 'Dynamic'])} ${role} with ${yrs} years of experience in ${angle}.`,
      `${role} offering ${yrs} years of progressive experience specializing in ${angle}.`,
      `Highly motivated ${role} with a ${yrs}-year track record of success in ${angle}.`,
      `${pick(['Experienced', 'Versatile', 'Detail-oriented'])} ${role} bringing ${yrs} years of expertise in ${angle}.`
    ];

    const bridges = [
      `Known for combining analytical thinking with hands-on execution to deliver measurable results.`,
      `Skilled at partnering with stakeholders to translate goals into clear, actionable plans.`,
      `Recognized for clear communication, ownership, and a continuous improvement mindset.`,
      `Committed to quality, accountability, and building trust across teams and clients.`
    ];

    const closers = [
      `Core competencies include ${topSkills}.`,
      `Technical proficiencies: ${topSkills}.`,
      `Key strengths: ${topSkills}.`,
      `Proficient in ${topSkills}, with a focus on outcomes that align with business priorities.`
    ];

    const parts = [pick(openers)];
    if (stripped?.trim()) {
      const sentences = stripped.split(/(?<=[.!?])\s+/).filter(s => s.length > 25);
      const core = (sentences.length ? sentences.slice(0, 2) : [stripped]).join(' ');
      parts.push(core.endsWith('.') ? core : core + '.');
    }
    parts.push(pick(bridges));
    parts.push(pick(closers));

    return trimToWordCount(dedupeSentences(parts.join(' ').replace(/\s+/g, ' ').trim()));
  }

  function enhanceDescription(text, role, skills) {
    const roleId = detectRole(role, skills, text);
    const lines = text.split(/\n+/).map(cleanLine).filter(Boolean);
    if (!lines.length) return generateBulletsFromRole(role, '', roleId, 4).join('\n');
    return lines.map((line, i) => enhanceBullet(line, i, roleId, role)).join('\n');
  }

  function suggestSkills(title, existing = '') {
    const roleId = detectRole(title, existing);
    const cfg = ROLE_CONFIG[roleId];
    const current = existing.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const suggestions = cfg.skills.filter(s => !current.includes(s.toLowerCase()));
    const picked = pickN(suggestions, 6);
    const merged = [...existing.split(',').map(s => s.trim()).filter(Boolean), ...picked];
    return [...new Set(merged)].slice(0, 12).join(', ');
  }

  function buildFullResume(data) {
    const roleId = detectRole(data.title, data.skills, data.summary);
    const cfg = ROLE_CONFIG[roleId];
    const yrs = yearsFromExperience(data.experience);

    const summary = enhanceSummary(
      data.summary || `Professional with expertise in ${pick(cfg.summaryAngles)}`,
      data.title,
      data.skills || pickN(cfg.skills, 5).join(', '),
      data.experience
    );

    const skills = data.skills?.trim()
      ? suggestSkills(data.title, data.skills)
      : pickN(cfg.skills, 8).join(', ');

    const experience = data.experience.map((exp, idx) => {
      const role = exp.role || data.title || pick(['Team Member', 'Specialist', 'Associate']);
      const company = exp.company || pick(['Previous Employer', 'Current Company', 'Organization']);
      const dates = exp.dates || (idx === 0 ? `${2019 + idx} – Present` : `${2016 + idx} – ${2018 + idx}`);
      let description = exp.description?.trim();
      if (!description) {
        description = generateBulletsFromRole(role, company, roleId, pick([4, 5, 3])).join('\n');
      } else {
        description = enhanceDescription(description, role, skills);
      }
      return { ...exp, role, company, dates, description };
    });

    const education = data.education.map((edu, idx) => ({
      degree: edu.degree || pick(['Bachelor of Science', 'Bachelor of Arts', 'Master of Science', 'Associate Degree']),
      school: edu.school || pick(['State University', 'University of California', 'Regional College', 'Technical Institute']),
      year: edu.year || String(2015 + idx)
    }));

    return { summary, skills, experience, education, roleId };
  }

  function extractKeywords(jobText) {
    const stop = new Set(['the','and','for','with','you','will','our','are','this','that','have','from','your','able','work','team','role','job','using','including','required','preferred','experience','skills','years','must','can','all','any','per','new','use']);
    const words = jobText.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w);
  }

  function matchJobDescription(data, jobText) {
    if (!jobText?.trim()) throw new Error('empty');
    const keywords = extractKeywords(jobText);
    const roleId = detectRole(data.title, data.skills, jobText);
    const matchedSkills = [...new Set([
      ...getSkillsArray(data.skills),
      ...keywords.filter(k => k.length > 3).slice(0, 8)
    ])].slice(0, 14);

    const summary = enhanceSummary(
      `${data.summary || ''} Target role requirements emphasize ${keywords.slice(0, 5).join(', ')}.`,
      data.title,
      matchedSkills.join(', '),
      data.experience
    );

    const experience = data.experience.map(exp => {
      const kw = pick(keywords);
      const base = exp.description?.trim() || generateBulletsFromRole(exp.role || data.title, exp.company, roleId, 3).join('\n');
      const extra = enhanceBullet(`Applied ${kw} expertise to deliver role-specific outcomes aligned with job requirements`, 0, roleId, exp.role);
      const lines = base.split('\n').filter(Boolean);
      if (!lines.some(l => l.toLowerCase().includes(kw))) lines.push(extra);
      return { ...exp, description: lines.slice(0, 6).join('\n') };
    });

    return {
      summary,
      skills: matchedSkills.join(', '),
      experience,
      keywords,
      matchScore: Math.min(72 + keywords.length * 2, 98)
    };
  }

  function getSkillsArray(str) {
    return (str || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  function generateCoverLetter(data, jobText = '') {
    const roleId = detectRole(data.title, data.skills, data.summary);
    const company = jobText.match(/at\s+([A-Z][A-Za-z0-9&.\s-]+)/)?.[1]?.trim() || 'your organization';
    const hiring = 'Hiring Manager';
    const paragraphs = [
      `Dear ${hiring},`,
      `I am writing to express my strong interest in the ${data.title || 'open'} position at ${company}. With a background in ${pick(ROLE_CONFIG[roleId].summaryAngles)}, I am confident I can contribute immediately to your team's goals.`,
      data.summary || enhanceSummary('', data.title, data.skills, data.experience),
      `In my recent roles, I have consistently delivered measurable results. ${enhanceBullet(pick(ROLE_CONFIG[roleId].impacts.map(fillImpact)), 0, roleId, data.title)} I am eager to bring this same focus on execution and collaboration to ${company}.`,
      `Thank you for your time and consideration. I would welcome the opportunity to discuss how my experience aligns with your needs.`,
      `Sincerely,\n${data.name || 'Applicant'}`
    ];
    return paragraphs.join('\n\n');
  }

  function analyzeATS(data) {
    const tips = [];
    let score = 30;
    if (data.name) score += 8; else tips.push('Add your full name — ATS systems parse this first.');
    if (data.title) score += 7; else tips.push('Include a professional title targeting your desired role.');
    if (data.email) score += 5; else tips.push('Add a professional email address.');
    if (data.phone) score += 3;
    if (data.location) score += 2; else tips.push('Add city and state — many ATS filter by location.');
    if (data.summary?.length > 100) score += 10;
    else tips.push('Expand your summary to 3–4 sentences with role keywords and achievements.');
    if (data.summary?.length > 250) tips.push('Summary may be too long — aim for 50–80 words for ATS readability.');

    const expFilled = data.experience.filter(e => e.company && e.role && e.description);
    if (expFilled.length) score += 12;
    else tips.push('Add at least one complete work experience with bullet-point achievements.');

    const bullets = data.experience.flatMap(e => (e.description || '').split('\n').filter(Boolean));
    const withMetrics = bullets.filter(b => /\d/.test(b)).length;
    if (withMetrics >= 2) score += 8;
    else tips.push('Add quantified results (%, $, time saved) to at least 2 bullet points.');

    if (data.skills) score += 7;
    else tips.push('Add a dedicated skills section with comma-separated keywords.');

    if (data.education.some(e => e.school)) score += 6;
    else tips.push('Include your education — degree, school, and graduation year.');

    const weak = bullets.filter(b => /responsible for|duties included|helped with/i.test(b));
    if (weak.length) tips.push(`Replace weak phrases in ${weak.length} bullet(s) — start with action verbs.`);

    return { score: Math.min(score, 98), tips: tips.slice(0, 6) };
  }

  function regenerateSeed() {
    seed = Date.now() + Math.floor(Math.random() * 100000);
  }

  return {
    detectRole,
    enhanceSummary,
    enhanceDescription,
    generateBulletsFromRole,
    suggestSkills,
    buildFullResume,
    matchJobDescription,
    generateCoverLetter,
    analyzeATS,
    regenerateSeed,
    extractKeywords
  };
})();
