/**
 * Stripe checkout buttons on pricing page
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-checkout-plan]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const plan = btn.dataset.checkoutPlan;
      if (!window.ProResumeAPI?.isLoggedIn()) {
        location.href = `/login.html?next=${encodeURIComponent('/pricing.html')}`;
        return;
      }
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = 'Redirecting to Stripe...';
      try {
        await ProResumeAPI.checkoutSubscription(plan);
      } catch (err) {
        alert(err.message || 'Checkout failed. Stripe may not be configured yet.');
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  });

  document.querySelectorAll('[data-checkout-credits]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const pack = btn.dataset.checkoutCredits;
      if (!window.ProResumeAPI?.isLoggedIn()) {
        location.href = `/login.html?next=${encodeURIComponent('/pricing.html')}`;
        return;
      }
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = 'Redirecting to Stripe...';
      try {
        await ProResumeAPI.checkoutCredits(pack);
      } catch (err) {
        alert(err.message || 'Checkout failed.');
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  });
});
