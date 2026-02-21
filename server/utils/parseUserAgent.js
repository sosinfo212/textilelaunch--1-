/**
 * Parse User-Agent string into device (android|iphone|computer) and browser name.
 * @param {string} ua - User-Agent header
 * @returns {{ device: string, browser: string }}
 */
export function parseUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return { device: 'computer', browser: 'Unknown' };
  const s = ua.toLowerCase();

  let device = 'computer';
  if (/android|webos|blackberry|iemobile|opera mini/i.test(s)) {
    if (/android/.test(s)) device = 'android';
    else if (/iphone|ipad|ipod/.test(s)) device = 'iphone';
    else device = 'computer';
  }
  if (/iphone|ipad|ipod/.test(s)) device = 'iphone';

  let browser = 'Unknown';
  if (/edg\//.test(s)) browser = 'Edge';
  else if (/opr\//.test(s) || /opera/.test(s)) browser = 'Opera';
  else if (/chrome\//.test(s) && !/edg/.test(s)) browser = 'Chrome';
  else if (/safari/.test(s) && !/chrome/.test(s)) browser = 'Safari';
  else if (/firefox\//.test(s)) browser = 'Firefox';
  else if (/msie|trident/.test(s)) browser = 'IE';

  return { device, browser };
}
