/** Plan limits - keep in sync with marketing/pricing pages */
export const PLANS = {
  free: {
    credits: 20,
    maxResumes: 1,
    monthlyCredits: 0,
    templates: 'free'
  },
  starter: {
    credits: 50,
    maxResumes: 3,
    monthlyCredits: 50,
    templates: 'starter'
  },
  pro: {
    credits: 200,
    maxResumes: 10,
    monthlyCredits: 200,
    templates: 'pro'
  },
  business: {
    credits: 999999,
    maxResumes: 50,
    monthlyCredits: 999999,
    templates: 'business'
  }
};

export const CREDIT_PACKS = {
  pack_25: { credits: 25, priceEnv: 'STRIPE_PRICE_CREDITS_25' },
  pack_100: { credits: 100, priceEnv: 'STRIPE_PRICE_CREDITS_100' },
  pack_500: { credits: 500, priceEnv: 'STRIPE_PRICE_CREDITS_500' }
};

export const SUBSCRIPTION_PLANS = {
  starter: { priceEnv: 'STRIPE_PRICE_STARTER', plan: 'starter' },
  pro: { priceEnv: 'STRIPE_PRICE_PRO', plan: 'pro' },
  business: { priceEnv: 'STRIPE_PRICE_BUSINESS', plan: 'business' }
};

export function getPlanLimits(plan) {
  return PLANS[plan] || PLANS.free;
}
