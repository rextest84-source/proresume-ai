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
  /** Required for Stripe verification - must match Stripe business profile */
  addressLine1: '176 E Ross St',
  addressLine2: 'Apartment 5',
  city: 'Batesville',
  state: 'AR',
  postalCode: '72501'
};

function escapeLegalHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function normalizeAddressUnit(line2) {
  if (!line2) return '';
  return line2
    .replace(/^Apartment\s+/i, 'Apt ')
    .replace(/^Suite\s+/i, 'Ste ')
    .replace(/^Unit\s+/i, 'Unit ')
    .trim();
}

/** Street line: "176 E Ross St, Apt 5" */
window.formatLegalStreetLine = function formatLegalStreetLine() {
  const c = window.LEGAL_CONFIG || {};
  const street = (c.addressLine1 || '').trim();
  const unit = normalizeAddressUnit(c.addressLine2);
  return [street, unit].filter(Boolean).join(', ');
};

/** City line: "Batesville, AR 72501" */
window.formatLegalCityLine = function formatLegalCityLine() {
  const c = window.LEGAL_CONFIG || {};
  const cityState = [c.city, c.state].filter(Boolean).join(', ');
  const zip = (c.postalCode || '').trim();
  if (cityState && zip) return `${cityState} ${zip}`;
  return cityState || zip || '';
};

/**
 * Formats business address for legal pages and footers.
 * @param {{ includeName?: boolean, inline?: boolean }} [opts]
 */
window.formatLegalAddress = function formatLegalAddress(opts = {}) {
  const c = window.LEGAL_CONFIG || {};
  const street = window.formatLegalStreetLine();
  const cityLine = window.formatLegalCityLine();
  const country = (c.country || '').trim();

  if (opts.inline) {
    return [
      opts.includeName ? c.businessName : null,
      street,
      cityLine,
      country
    ].filter(Boolean).join(' · ');
  }

  const parts = [];
  if (opts.includeName && c.businessName) {
    parts.push(`<strong class="legal-addr-name">${escapeLegalHtml(c.businessName)}</strong>`);
  }
  if (street) parts.push(`<span class="legal-addr-line">${escapeLegalHtml(street)}</span>`);
  if (cityLine) parts.push(`<span class="legal-addr-line">${escapeLegalHtml(cityLine)}</span>`);
  if (country) parts.push(`<span class="legal-addr-line legal-addr-country">${escapeLegalHtml(country)}</span>`);

  if (!parts.length) return escapeLegalHtml(country || 'United States');
  return `<address class="legal-address">${parts.join('')}</address>`;
};
