/**
 * Shared sub-navigation for Account, Billing, and Usage pages.
 */
(function () {
  const TABS = [
    { href: '/account.html', label: 'Account', icon: 'fa-user' },
    { href: '/billing.html', label: 'Billing', icon: 'fa-credit-card' },
    { href: '/usage.html', label: 'Usage', icon: 'fa-chart-column' }
  ];

  function renderAccountNav() {
    const mount = document.querySelector('[data-account-nav]');
    if (!mount) return;
    const path = location.pathname.replace(/\/$/, '') || '/account.html';
    mount.innerHTML = `
      <nav class="account-subnav flex flex-wrap gap-2 mb-8" aria-label="Account sections">
        ${TABS.map((tab) => {
          const active = path === tab.href;
          return `<a href="${tab.href}" class="account-subnav-link${active ? ' is-active' : ''}">
            <i class="fa-solid ${tab.icon}" aria-hidden="true"></i>${tab.label}
          </a>`;
        }).join('')}
      </nav>`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAccountNav);
  } else {
    renderAccountNav();
  }
})();
