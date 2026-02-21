/**
 * Detect device (android | iphone | computer) and browser name from navigator.
 */
export function getDeviceAndBrowser(): { device: string; browser: string } {
  if (typeof navigator === 'undefined') return { device: 'computer', browser: 'Unknown' };
  const ua = navigator.userAgent.toLowerCase();

  let device: string = 'computer';
  if (/android/.test(ua)) device = 'android';
  else if (/iphone|ipad|ipod/.test(ua)) device = 'iphone';

  let browser = 'Unknown';
  if (/edg\//.test(ua)) browser = 'Edge';
  else if (/opr\//.test(ua) || /opera/.test(ua)) browser = 'Opera';
  else if (/chrome\//.test(ua) && !/edg/.test(ua)) browser = 'Chrome';
  else if (/safari/.test(ua) && !/chrome/.test(ua)) browser = 'Safari';
  else if (/firefox\//.test(ua)) browser = 'Firefox';
  else if (/msie|trident/.test(ua)) browser = 'IE';

  return { device, browser };
}
