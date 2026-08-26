/**
 * Stripe checkout on pricing page
 */
document.addEventListener('DOMContentLoaded', async () => {
  const banner = document.getElementById('checkout-notice');
  const stripeBanner = document.getElementById('stripe-status-banner');
  const setupPanel = document.getElementById('stripe-setup-panel');
  const params = new URLSearchParams(location.search);

  if (window.ProResumeAPI?.isLoggedIn()) {
    banner?.classList.add('hidden');
  }

  if (params.get('checkout') === 'cancelled' && stripeBanner) {
    stripeBanner.classList.remove('hidden');
    stripeBanner.className = 'mt-3 text-sm text-zinc-400 max-w-xl mx-auto';
    stripeBanner.textContent = 'Checkout cancelled. No charge was made. You can try again anytime.';
  }

  let status = null;
  try {
    const base = (window.PRORESUME_CONFIG?.apiUrl || '').replace(/\/$/, '');
    const res = await fetch(`${base}/api/stripe/status`);
    status = await res.json();

    if (status.ready && stripeBanner && params.get('checkout') !== 'cancelled') {
      stripeBanner.classList.remove('hidden');
      stripeBanner.className = 'mt-3 text-sm text-emerald-400/90 max-w-xl mx-auto';
      stripeBanner.innerHTML = '<i class="fa-solid fa-lock mr-1"></i> Secure checkout via Stripe is active.';
      setupPanel?.classList.add('hidden');
    } else if (!status.ready && stripeBanner && params.get('checkout') !== 'cancelled') {
      stripeBanner.classList.remove('hidden');
      stripeBanner.className = 'mt-3 text-sm text-amber-400/90 max-w-xl mx-auto';
      stripeBanner.textContent = 'Checkout activates after Stripe price IDs are added on the server. The free builder works now.';
      renderSetupPanel(setupPanel, status);
    }

    disableUnconfiguredButtons(status);
  } catch {
    if (stripeBanner) {
      stripeBanner.classList.remove('hidden');
      stripeBanner.className = 'mt-3 text-sm text-red-400/90 max-w-xl mx-auto';
      stripeBanner.textContent = 'Could not reach the billing API. Try again in a moment.';
    }
  }

  function renderSetupPanel(panel, s) {
    if (!panel || !s) return;
    const missing = [];
    if (!s.configured) missing.push('STRIPE_SECRET_KEY');
    if (!s.webhook) missing.push('STRIPE_WEBHOOK_SECRET');
    Object.entries(s.plans || {}).forEach(([plan, ok]) => { if (!ok) missing.push(`STRIPE_PRICE_${plan.toUpperCase()}`); });
    Object.entries(s.creditPacks || {}).forEach(([pack, ok]) => {
      if (!ok) missing.push(`STRIPE_PRICE_CREDITS_${pack.replace('pack_', '')}`);
    });
    if (!missing.length) return;
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="mt-4 max-w-xl mx-auto text-left text-xs text-zinc-400 bg-zinc-900/80 border border-white/10 rounded-xl p-4">
        <p class="font-semibold text-zinc-300 mb-2">Stripe setup checklist (server admin)</p>
        <ol class="list-decimal list-inside space-y-1">
          <li>Create a Stripe account and copy your secret key</li>
          <li>Run <code class="text-emerald-400">node scripts/create-stripe-products.js</code> in the backend folder</li>
          <li>Add all price IDs + webhook secret to Railway, then redeploy</li>
          <li>Activate Customer Portal in Stripe Dashboard → Settings → Billing</li>
        </ol>
        <p class="mt-3 text-zinc-500">Missing now: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}</p>
      </div>`;
  }

  function disableUnconfiguredButtons(s) {
    if (!s) return;
    Object.entries(s.plans || {}).forEach(([plan, configured]) => {
      if (configured) return;
      document.querySelectorAll(`[data-checkout-plan="${plan}"]`).forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.title = 'This plan is not available yet';
      });
    });
    Object.entries(s.creditPacks || {}).forEach(([pack, configured]) => {
      if (configured) return;
      document.querySelectorAll(`[data-checkout-credits="${pack}"]`).forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.title = 'This pack is not available yet';
      });
    });
  }

  async function checkout(type, plan, pack, btn) {
    if (!window.ProResumeAPI?.isLoggedIn()) {
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    if (btn.disabled) {
      alert('This plan is not available yet. Email support@aeloriacareer.com for billing help.');
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
