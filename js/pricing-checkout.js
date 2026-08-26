/**
 * Stripe checkout on pricing page
 */
document.addEventListener('DOMContentLoaded', async () => {
  const banner = document.getElementById('checkout-notice');
  const stripeBanner = document.getElementById('stripe-status-banner');
  const params = new URLSearchParams(location.search);

  if (window.ProResumeAPI?.isLoggedIn()) {
    banner?.classList.add('hidden');
  }

  if (params.get('checkout') === 'cancelled' && stripeBanner) {
    stripeBanner.classList.remove('hidden');
    stripeBanner.className = 'mt-3 text-sm text-zinc-400 max-w-xl mx-auto';
    stripeBanner.textContent = 'Checkout cancelled. No charge was made. You can try again anytime.';
  }

  try {
    const base = (window.PRORESUME_CONFIG?.apiUrl || '').replace(/\/$/, '');
    const res = await fetch(`${base}/api/stripe/status`);
    const status = await res.json();

    if (status.ready && stripeBanner && params.get('checkout') !== 'cancelled') {
      stripeBanner.classList.remove('hidden');
      stripeBanner.className = 'mt-3 text-sm text-emerald-400/90 max-w-xl mx-auto';
      stripeBanner.innerHTML = '<i class="fa-solid fa-lock mr-1"></i> Secure checkout via Stripe is active.';
    }

    disableUnconfiguredButtons(status);
  } catch {
    /* Checkout status check failed — no admin messaging shown to visitors */
  }

  function disableUnconfiguredButtons(s) {
    if (!s?.ready) {
      document.querySelectorAll('[data-checkout-plan], [data-checkout-credits]').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.title = 'Contact support@aeloriacareer.com for billing help';
      });
    }
  }

  async function checkout(type, plan, pack, btn) {
    if (!window.ProResumeAPI?.isLoggedIn()) {
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    if (btn.disabled) {
      alert('Checkout is temporarily unavailable. Email support@aeloriacareer.com for help.');
      return;
    }
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Redirecting to Stripe...';
    try {
      if (type === 'subscription') await ProResumeAPI.checkoutSubscription(plan);
      else await ProResumeAPI.checkoutCredits(pack);
    } catch (err) {
      alert(err.message || 'Checkout unavailable. Email support@aeloriacareer.com for help.');
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

  const autoPlan = params.get('plan');
  if (autoPlan && ['starter', 'pro', 'business'].includes(autoPlan)) {
    const btn = document.querySelector(`[data-checkout-plan="${autoPlan}"]`);
    if (btn && !btn.disabled) setTimeout(() => btn.click(), 400);
  }
});
