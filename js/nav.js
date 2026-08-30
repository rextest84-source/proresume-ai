/**
 * Shared responsive site navigation — marketing links for guests, app menu when signed in.
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

  const PUBLIC_HOME_LINKS = [
    { href: '/builder.html', label: 'Builder' },
    { href: '/projects.html', label: 'My Projects' },
    { href: '/pricing.html', label: 'Pricing' },
    { href: '/#features', label: 'Features' },
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#faq', label: 'FAQ' },
    { href: '/about.html', label: 'About' },
    { href: '/contact.html', label: 'Contact' }
  ];

  const PUBLIC_DEFAULT_LINKS = [
    { href: '/builder.html', label: 'Builder' },
    { href: '/projects.html', label: 'My Projects' },
    { href: '/pricing.html', label: 'Pricing' },
    { href: '/about.html', label: 'About' },
    { href: '/contact.html', label: 'Contact' }
  ];

  function linkRow(links, className) {
    return links.map((l) => {
      const extra = l.attrs ? ` ${l.attrs}` : '';
      return `<a href="${l.href}" class="${className}"${extra}>${l.label}</a>`;
    }).join('');
  }

  const LOGO_IMG = '<img src="/assets/logo-mark.svg" alt="" width="32" height="32" class="w-8 h-8 shrink-0 rounded-lg shadow-sm shadow-emerald-900/40" aria-hidden="true">';

  function navLinksFor(variant, loggedIn) {
    if (variant === 'minimal') return [];
    if (loggedIn) return [];
    return variant === 'home' ? PUBLIC_HOME_LINKS : PUBLIC_DEFAULT_LINKS;
  }

  function renderNav(variant, loggedIn) {
    const links = navLinksFor(variant, loggedIn);
    const hasGuestMenu = links.length > 0;
    const ctaHref = '/projects.html';
    const ctaLabel = loggedIn ? 'Open Builder' : 'Try Free';

    const authDesktop = variant !== 'minimal' && !loggedIn
      ? '<a id="nav-auth-link" href="/login.html" class="hidden sm:inline text-sm text-zinc-300 hover:text-white transition whitespace-nowrap">Sign In</a>'
      : '';

    const authMobile = variant !== 'minimal' && !loggedIn
      ? '<a id="nav-auth-link-mobile" href="/login.html" class="block py-3 px-2 text-emerald-400 font-medium border-t border-white/5 mt-1">Sign In</a>'
      : '';

    const guestDesktopLinks = hasGuestMenu
      ? `<div class="hidden md:flex items-center gap-5 xl:gap-6 text-sm text-zinc-300 min-w-0 flex-1 justify-center">
          ${linkRow(links, 'hover:text-white transition whitespace-nowrap')}
        </div>`
      : '<div class="flex-1"></div>';

    const appMenu = variant !== 'minimal' && loggedIn && window.ProResumeAppMenu
      ? window.ProResumeAppMenu.renderMenu({ idPrefix: 'nav' })
      : '';

    const guestMenuBtn = hasGuestMenu
      ? `<button type="button" id="nav-menu-btn" class="nav-menu-btn md:hidden p-2 -mr-1 text-zinc-300 hover:text-white rounded-lg" aria-label="Open menu" aria-expanded="false">
          <i class="fa-solid fa-bars nav-icon-menu text-lg"></i>
          <i class="fa-solid fa-xmark nav-icon-close text-lg"></i>
        </button>`
      : '';

    return `
<nav id="site-nav" class="fixed top-0 inset-x-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-b border-white/10">
  <div class="nav-inner w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
    <a href="${loggedIn ? '/builder.html' : '/'}" class="flex items-center gap-2 font-bold text-base sm:text-lg shrink-0 min-w-0 max-w-[55%] sm:max-w-none">
      ${LOGO_IMG}
      <span class="truncate">ProResume AI</span>
    </a>

    ${loggedIn ? '<div class="flex-1"></div>' : guestDesktopLinks}

    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      ${authDesktop}
      ${appMenu}
      <a href="${ctaHref}" class="inline-flex px-3 sm:px-5 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold text-xs sm:text-sm transition whitespace-nowrap">${ctaLabel}</a>
      ${guestMenuBtn}
    </div>
  </div>

  ${hasGuestMenu ? `<div id="nav-mobile-panel" class="nav-mobile-panel hidden md:hidden border-t border-white/10 bg-zinc-950/98 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
    <div class="flex flex-col gap-0.5 text-sm">
      ${linkRow(links, 'block py-3 px-2 text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition')}
      ${authMobile}
    </div>
  </div>` : ''}
</nav>
<div class="h-14 sm:h-16 shrink-0" aria-hidden="true"></div>`;
  }

  function bindSignOut() {
    /* Sign out handled by app menu when logged in */
  }

  function bindAppMenu() {
    window.ProResumeAppMenu?.bindMenu('nav');
  }

  function bindMobileMenu() {
    const btn = document.getElementById('nav-menu-btn');
    const panel = document.getElementById('nav-mobile-panel');
    if (!btn || !panel) return;

    btn.onclick = () => setMenuOpen(!panel.classList.contains('open'));
    panel.querySelectorAll('a, button').forEach((a) => {
      a.addEventListener('click', () => setMenuOpen(false));
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

  function remountNav() {
    const nav = document.getElementById('site-nav');
    if (!nav) return;
    const variant = nav.dataset.variant || 'default';
    const loggedIn = window.ProResumeAPI?.isLoggedIn();
    const html = renderNav(variant, loggedIn);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const newNav = wrapper.firstElementChild;
    const newSpacer = wrapper.children[1];
    const oldSpacer = nav.nextElementSibling;
    if (oldSpacer?.getAttribute('aria-hidden') === 'true') oldSpacer.remove();
    nav.replaceWith(newNav);
    newNav.dataset.variant = variant;
    newNav.after(newSpacer);
    bindMobileMenu();
    bindAppMenu();
    bindSignOut();
  }

  function mount() {
    const mountEl = document.querySelector('[data-site-nav]');
    if (!mountEl) return;
    const variant = mountEl.getAttribute('data-site-nav') || 'default';

    function init() {
      const target = document.querySelector('[data-site-nav]');
      if (!target) return;
      const loggedIn = window.ProResumeAPI?.isLoggedIn();
      target.outerHTML = renderNav(variant, loggedIn);
      document.getElementById('site-nav').dataset.variant = variant;
      bindMobileMenu();
      bindAppMenu();
      bindSignOut();
      window.addEventListener('proresume:auth', remountNav);
    }

    if (window.ProResumeAppMenu) {
      init();
      return;
    }

    const script = document.createElement('script');
    script.src = '/js/app-menu.js';
    script.onload = init;
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
