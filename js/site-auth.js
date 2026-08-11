/**
 * Shared auth nav + session badge on marketing pages
 */
(function () {
  function injectNavLink() {
    const navs = document.querySelectorAll('nav .flex.items-center');
    navs.forEach(nav => {
      if (nav.querySelector('[data-auth-nav]')) return;
      const link = document.createElement('a');
      link.setAttribute('data-auth-nav', '');
      link.className = 'text-zinc-300 hover:text-white transition text-sm';
      if (window.ProResumeAPI?.isLoggedIn()) {
        link.href = '/account.html';
        link.textContent = 'My Account';
      } else {
        link.href = '/login.html';
        link.textContent = 'Sign In';
      }
      nav.appendChild(link);
    });
  }

  function init() {
    if (!window.ProResumeAPI) return;
    injectNavLink();
    window.addEventListener('proresume:auth', injectNavLink);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
