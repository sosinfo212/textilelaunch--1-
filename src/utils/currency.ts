/**
 * Currency utility functions
 * Formats prices with appropriate currency symbols
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  MAD: 'درهم',
  EUR: '€',
  USD: '$',
  DH: 'درهم',
};

export const CURRENCY_NAMES: Record<string, string> = {
  MAD: 'MAD',
  EUR: 'EUR',
  USD: 'USD',
  DH: 'DH',
};

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
  
  // For LTR currencies (EUR, USD), put symbol before
  return `${symbol}${formattedPrice}`;
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency: string = 'MAD'): string => {
  return CURRENCY_SYMBOLS[currency] || currency;
};
