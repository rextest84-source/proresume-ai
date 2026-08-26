/**
 * Legal / business display config - public-facing only.
 * Update address fields to match your Stripe business profile before verification.
 */
window.LEGAL_CONFIG = {
  businessName: 'Aeloria Career Services',
  productName: 'ProResume AI',
  country: 'United States',
  websiteUrl: 'https://proresume.aeloriacareer.com',
  supportEmail: 'support@aeloriacareer.com',
  contactUrl: '/contact.html',
  contactLabel: 'Contact form',
  /** Required for Stripe verification - set your registered business address */
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: ''
};

/** Formats business address for legal pages and footers. */
window.formatLegalAddress = function formatLegalAddress() {
  const c = window.LEGAL_CONFIG || {};
  const lines = [
    c.addressLine1,
    c.addressLine2,
    [c.city, c.state, c.postalCode].filter(Boolean).join(', '),
    c.country
  ].filter(Boolean);
  return lines.length > 1 ? lines.join('<br>') : `${c.businessName}<br>${c.country}`;
};
