/**
 * Mount formatted legal address / contact blocks from data attributes.
 * Requires legal-config.js loaded first.
 */
(function () {
  function mountLegalBlocks() {
    document.querySelectorAll('[data-legal-address]').forEach(el => {
      const mode = el.getAttribute('data-legal-address') || '';
      const includeName = mode === 'name' || el.dataset.includeName === 'true';
      const inline = mode === 'inline';
      el.innerHTML = window.formatLegalAddress?.({ includeName, inline }) || 'United States';
    });

    document.querySelectorAll('[data-legal-contact]').forEach(el => {
      const variant = el.getAttribute('data-legal-contact') || 'default';
      const opts = variant === 'billing'
        ? { showContactForm: false, extraLines: ['Response time: usually within a business day'] }
        : {};
      el.innerHTML = window.formatLegalContactBlock?.(opts) || '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountLegalBlocks);
  } else {
    mountLegalBlocks();
  }
})();
