/**
 * Stripe checkout on pricing page
 */
document.addEventListener('DOMContentLoaded', async () => {
  const banner = document.getElementById('checkout-notice');
  const stripeBanner = document.getElementById('stripe-status-banner');

  if (window.ProResumeAPI?.isLoggedIn()) {
    banner?.classList.add('hidden');
  }

  try {
    const base = (window.PRORESUME_CONFIG?.apiUrl || '').replace(/\/$/, '');
    const res = await fetch(`${base}/api/stripe/status`);
    const status = await res.json();
    if (!status.ready && stripeBanner) {
      stripeBanner.classList.remove('hidden');
      stripeBanner.textContent = 'Payments: Stripe setup in progress — free plan & builder work now. Paid plans activate once Stripe is connected.';
    }
  } catch {
    /* API unreachable — builder may still work locally */
  }

  async function checkout(type, plan, pack, btn) {
    if (!window.ProResumeAPI?.isLoggedIn()) {
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Redirecting to Stripe...';
    try {
      if (type === 'subscription') await ProResumeAPI.checkoutSubscription(plan);
      else await ProResumeAPI.checkoutCredits(pack);
    } catch (err) {
      alert(err.message || 'Checkout unavailable. Try again or email support@proresumeai.com.');
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  document.querySelectorAll('[data-checkout-plan]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      checkout('subscription', btn.dataset.checkoutPlan, null, btn);
    });
  });

  document.querySelectorAll('[data-checkout-credits]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      checkout('credits', null, btn.dataset.checkoutCredits, btn);
    });
  });

  // Auto-checkout from URL ?plan=pro
  const params = new URLSearchParams(location.search);
  const autoPlan = params.get('plan');
  if (autoPlan && ['starter', 'pro', 'business'].includes(autoPlan)) {
    const btn = document.querySelector(`[data-checkout-plan="${autoPlan}"]`);
    if (btn) setTimeout(() => btn.click(), 400);
  }
});
