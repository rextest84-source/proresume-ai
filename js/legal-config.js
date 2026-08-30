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

/** Plain-text / inline address for footers and emails */
window.formatLegalAddressPlain = function formatLegalAddressPlain() {
  return window.formatLegalAddress({ includeName: true, inline: true });
};

/**
 * Full contact block for legal pages (address + website + email + contact form).
 * @param {{ showContactForm?: boolean, extraLines?: string[] }} [opts]
 */
window.formatLegalContactBlock = function formatLegalContactBlock(opts = {}) {
  const c = window.LEGAL_CONFIG || {};
  const address = window.formatLegalAddress({ includeName: true });
  const website = (c.websiteUrl || '').replace(/\/$/, '');
  const email = c.supportEmail || '';
  const contactUrl = c.contactUrl || '/contact.html';
  const contactLabel = c.contactLabel || 'Contact us';
  const showContactForm = opts.showContactForm !== false;

  const lines = [
    `Website: <a href="${escapeLegalHtml(website)}" class="text-emerald-400 hover:underline">${escapeLegalHtml(website)}</a>`,
    `Email: <a href="mailto:${escapeLegalHtml(email)}" class="text-emerald-400 hover:underline">${escapeLegalHtml(email)}</a>`
  ];
  if (showContactForm) {
    lines.push(`Contact form: <a href="${escapeLegalHtml(contactUrl)}" class="text-emerald-400 hover:underline">${escapeLegalHtml(contactLabel)}</a>`);
  }
  (opts.extraLines || []).forEach(line => lines.push(escapeLegalHtml(line)));

  return `${address}
<p class="legal-contact-links mt-2">${lines.join('<br>\n')}</p>`;
};
