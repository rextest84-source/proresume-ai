/** Business address — keep in sync with js/legal-config.js */
export const LEGAL_CONFIG = {
  businessName: 'Aeloria Career Services',
  productName: 'ProResume AI',
  country: 'United States',
  websiteUrl: 'https://proresume.aeloriacareer.com',
  supportEmail: 'support@aeloriacareer.com',
  addressLine1: '176 E Ross St',
  addressLine2: 'Apartment 5',
  city: 'Batesville',
  state: 'AR',
  postalCode: '72501'
};

function normalizeAddressUnit(line2) {
  if (!line2) return '';
  return line2
    .replace(/^Apartment\s+/i, 'Apt ')
    .replace(/^Suite\s+/i, 'Ste ')
    .replace(/^Unit\s+/i, 'Unit ')
    .trim();
}

export function formatLegalStreetLine() {
  const street = (LEGAL_CONFIG.addressLine1 || '').trim();
  const unit = normalizeAddressUnit(LEGAL_CONFIG.addressLine2);
  return [street, unit].filter(Boolean).join(', ');
}

export function formatLegalCityLine() {
  const cityState = [LEGAL_CONFIG.city, LEGAL_CONFIG.state].filter(Boolean).join(', ');
  const zip = (LEGAL_CONFIG.postalCode || '').trim();
  if (cityState && zip) return `${cityState} ${zip}`;
  return cityState || zip || '';
}

/** Plain-text address for email footers: "Name · Street · City · Country" */
export function formatLegalAddressPlain() {
  return [
    LEGAL_CONFIG.businessName,
    formatLegalStreetLine(),
    formatLegalCityLine(),
    LEGAL_CONFIG.country
  ].filter(Boolean).join(' · ');
}
