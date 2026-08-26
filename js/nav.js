/**
 * Shared responsive site navigation - one nav, no duplicate Sign In links.
 */
(function () {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function scrollPageToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  scrollPageToTop();
  window.addEventListener('pageshow', scrollPageToTop);
  window.addEventListener('load', () => requestAnimationFrame(scrollPageToTop));

  const HOME_LINKS = [
    { href: '/builder.html', label: 'Resume Builder' },
    { href: '/pricing.html', label: 'Pricing' },
    { href: '/#features', label: 'Features' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#faq', label: 'FAQ' },
    { href: '/about.html', label: 'About' },
    { href: '/contact.html', label: 'Contact' }
  ];

  const DEFAULT_LINKS = [
    { href: '/builder.html', label: 'Resume Builder' },
    { href: '/pricing.html', label: 'Pricing' },
    { href: '/about.html', label: 'About' },
    { href: '/contact.html', label: 'Contact' }
  ];

  function linkRow(links, className) {
    return links.map(l =>
      `<a href="${l.href}" class="${className}">${l.label}</a>`
    ).join('');
  }

  const LOGO_IMG = '<img src="/assets/logo-mark.svg" alt="" width="32" height="32" class="w-8 h-8 shrink-0 rounded-lg shadow-sm shadow-emerald-900/40" aria-hidden="true">';

  function renderNav(variant) {
    const links = variant === 'home' ? HOME_LINKS : variant === 'minimal' ? [] : DEFAULT_LINKS;
    const hasMenu = links.length > 0;
    const ctaLabel = variant === 'minimal' ? 'Builder' : 'Try Free';

    return `
<nav id="site-nav" class="fixed top-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-b border-white/10">
  <div class="nav-inner w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
    <a href="/" class="flex items-center gap-2 font-bold text-base sm:text-lg shrink-0 min-w-0 max-w-[55%] sm:max-w-none">
      ${LOGO_IMG}
      <span class="truncate">ProResume AI</span>
    </a>

    ${hasMenu ? `<div class="hidden md:flex items-center gap-5 xl:gap-6 text-sm text-zinc-300 min-w-0 flex-1 justify-center">
      ${linkRow(links, 'hover:text-white transition whitespace-nowrap')}
    </div>` : '<div class="flex-1"></div>'}

    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      ${variant !== 'minimal' ? '<a id="nav-auth-link" href="/login.html" class="hidden sm:inline text-sm text-zinc-300 hover:text-white transition whitespace-nowrap">Sign In</a>' : ''}
      <a href="/builder.html" class="inline-flex px-3 sm:px-5 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold text-xs sm:text-sm transition whitespace-nowrap">${ctaLabel}</a>
      ${hasMenu ? `<button type="button" id="nav-menu-btn" class="nav-menu-btn md:hidden p-2 -mr-1 text-zinc-300 hover:text-white rounded-lg" aria-label="Open menu" aria-expanded="false">
        <i class="fa-solid fa-bars nav-icon-menu text-lg"></i>
        <i class="fa-solid fa-xmark nav-icon-close text-lg"></i>
      </button>` : ''}
    </div>
  </div>

  ${hasMenu ? `<div id="nav-mobile-panel" class="nav-mobile-panel hidden md:hidden border-t border-white/10 bg-zinc-950/98 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
    <div class="flex flex-col gap-0.5 text-sm">
      ${linkRow(links, 'block py-3 px-2 text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition')}
      <a id="nav-auth-link-mobile" href="/login.html" class="block py-3 px-2 text-emerald-400 font-medium border-t border-white/5 mt-1">Sign In</a>
    </div>
  </div>` : ''}
</nav>
<div class="h-14 sm:h-16 shrink-0" aria-hidden="true"></div>`;
  }

  function updateAuthLinks() {
    const loggedIn = window.ProResumeAPI?.isLoggedIn();
    const href = loggedIn ? '/account.html' : '/login.html';
    const text = loggedIn ? 'My Account' : 'Sign In';
    ['nav-auth-link', 'nav-auth-link-mobile'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.href = href;
        el.textContent = text;
      }
    });
  }

  function setMenuOpen(open) {
    const btn = document.getElementById('nav-menu-btn');
    const panel = document.getElementById('nav-mobile-panel');
    if (!btn || !panel) return;

    panel.classList.toggle('open', open);
    panel.classList.toggle('hidden', !open);
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('nav-menu-open', open);
  }

  function bindMobileMenu() {
    const btn = document.getElementById('nav-menu-btn');
    const panel = document.getElementById('nav-mobile-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      setMenuOpen(!panel.classList.contains('open'));
    });

    panel.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setMenuOpen(false));
    });

    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 768px)').matches) {
        setMenuOpen(false);
      }
    });
  }

  function mount() {
    const mountEl = document.querySelector('[data-site-nav]');
    if (!mountEl) return;
    const variant = mountEl.getAttribute('data-site-nav') || 'default';
    mountEl.outerHTML = renderNav(variant);
    updateAuthLinks();
    bindMobileMenu();
    window.addEventListener('proresume:auth', updateAuthLinks);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
