/**
 * Shared hamburger menu for logged-in app navigation.
 */
(function () {
  const APP_LINKS = [
    { href: '/builder.html', label: 'Builder', icon: 'fa-pen-to-square' },
    { href: '/account.html', label: 'Account', icon: 'fa-user' },
    { href: '/usage.html', label: 'Usage', icon: 'fa-chart-column' },
    { href: '/billing.html', label: 'Billing', icon: 'fa-credit-card' },
    { href: '#', label: 'Support', icon: 'fa-comments', attrs: 'data-support-chat-open' }
  ];

  function linkItems(links) {
    return links.map((l) => {
      const extra = l.attrs ? ` ${l.attrs}` : '';
      const icon = l.icon
        ? `<i class="fa-solid ${l.icon} w-4 text-center text-zinc-500" aria-hidden="true"></i>`
        : '';
      return `<a href="${l.href}" class="app-menu-item" role="menuitem"${extra}>${icon}<span>${l.label}</span></a>`;
    }).join('');
  }

  function renderMenu({ idPrefix = 'app', links = APP_LINKS, signOut = true } = {}) {
    return `
      <div class="app-menu relative shrink-0" data-app-menu="${idPrefix}">
        <button type="button" id="${idPrefix}-menu-btn" class="app-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="${idPrefix}-menu-panel">
          <i class="fa-solid fa-bars app-menu-icon-open" aria-hidden="true"></i>
          <i class="fa-solid fa-xmark app-menu-icon-close" aria-hidden="true"></i>
        </button>
        <div id="${idPrefix}-menu-panel" class="app-menu-panel hidden" role="menu">
          ${linkItems(links)}
          ${signOut ? `<button type="button" id="${idPrefix}-signout-btn" class="app-menu-item app-menu-signout" role="menuitem"><i class="fa-solid fa-right-from-bracket w-4 text-center text-zinc-500" aria-hidden="true"></i><span>Sign out</span></button>` : ''}
        </div>
      </div>`;
  }

  function bindMenu(idPrefix, { onSignOut } = {}) {
    const root = document.querySelector(`[data-app-menu="${idPrefix}"]`);
    if (!root) return;

    const btn = document.getElementById(`${idPrefix}-menu-btn`);
    const panel = document.getElementById(`${idPrefix}-menu-panel`);
    if (!btn || !panel) return;

    function setOpen(open) {
      panel.classList.toggle('hidden', !open);
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    btn.onclick = (e) => {
      e.stopPropagation();
      setOpen(panel.classList.contains('hidden'));
    };

    panel.querySelectorAll('a, button').forEach((el) => {
      el.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) setOpen(false);
    });

    document.getElementById(`${idPrefix}-signout-btn`)?.addEventListener('click', () => {
      if (onSignOut) onSignOut();
      else {
        window.ProResumeAPI?.logout();
        location.href = '/';
      }
    });
  }

  window.ProResumeAppMenu = { APP_LINKS, renderMenu, bindMenu };
})();
