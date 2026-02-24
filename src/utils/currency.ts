/**
 * Currency utility functions
 * Formats prices with appropriate currency symbols
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  MAD: 'درهم',
  EUR: '€',
  USD: '$',
  DH: 'درهم',
  GBP: '£',
  CAD: 'CA$',
};

/** Options for product currency selector (code + label for dropdown) */
export const PRODUCT_CURRENCIES: { value: string; label: string }[] = [
  { value: 'MAD', label: 'MAD (درهم)' },
  { value: 'DH', label: 'DH (درهم)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (CA$)' },
];

/**
 * Format price with currency
 * @param price - The price value
 * @param currency - Currency code (MAD, EUR, USD, DH)
 * @returns Formatted price string
 */
export const formatPrice = (price: number, currency: string = 'MAD'): string => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formattedPrice = price.toFixed(2).replace(/\.00$/, '');
  
  // For RTL currencies (MAD, DH), put symbol after
  if (currency === 'MAD' || currency === 'DH') {
    return `${formattedPrice} ${symbol}`;
  }
  // For LTR currencies (EUR, USD, GBP, CAD, etc.), put symbol before
  return `${symbol}${formattedPrice}`;
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency: string = 'MAD'): string => {
  return CURRENCY_SYMBOLS[currency] || currency;
};
