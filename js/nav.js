/**
 * Shared responsive site navigation — one nav, no duplicate Sign In links.
 */
(function () {
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

  function renderNav(variant) {
    const links = variant === 'home' ? HOME_LINKS : variant === 'minimal' ? [] : DEFAULT_LINKS;
    const hasMenu = links.length > 0;
    const ctaLabel = variant === 'minimal' ? 'Builder' : 'Try Free';

    return `
<nav id="site-nav" class="fixed top-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-b border-white/10">
  <div class="nav-inner w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
    <a href="/" class="flex items-center gap-2 font-bold text-base sm:text-lg shrink-0 min-w-0 max-w-[55%] sm:max-w-none">
      <span class="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-xs shrink-0">PR</span>
      <span class="truncate">ProResume AI</span>
    </a>

    ${hasMenu ? `<div class="hidden lg:flex items-center gap-5 xl:gap-6 text-sm text-zinc-300 min-w-0 flex-1 justify-center">
      ${linkRow(links, 'hover:text-white transition whitespace-nowrap')}
    </div>` : '<div class="flex-1"></div>'}

    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      ${variant !== 'minimal' ? '<a id="nav-auth-link" href="/login.html" class="hidden sm:inline text-sm text-zinc-300 hover:text-white transition whitespace-nowrap">Sign In</a>' : ''}
      <a href="/builder.html" class="inline-flex px-3 sm:px-5 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold text-xs sm:text-sm transition whitespace-nowrap">${ctaLabel}</a>
      ${hasMenu ? `<button type="button" id="nav-menu-btn" class="nav-menu-btn lg:hidden p-2 -mr-1 text-zinc-300 hover:text-white rounded-lg" aria-label="Open menu" aria-expanded="false">
        <i class="fa-solid fa-bars nav-icon-menu text-lg"></i>
        <i class="fa-solid fa-xmark nav-icon-close text-lg"></i>
      </button>` : ''}
    </div>
  </div>

  ${hasMenu ? `<div id="nav-mobile-panel" class="hidden lg:hidden border-t border-white/10 bg-zinc-950/98 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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

  function bindMobileMenu() {
    const btn = document.getElementById('nav-menu-btn');
    const panel = document.getElementById('nav-mobile-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      panel.classList.toggle('hidden', !open);
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    panel.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        panel.classList.remove('open');
        panel.classList.add('hidden');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
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
