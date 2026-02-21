import { useEffect, useRef, useCallback } from 'react';
import { analyticsAPI, productsAPI } from '../src/utils/api';
import { getDeviceAndBrowser } from '../src/utils/deviceBrowser';

const SESSION_KEY = 'tl_visitor_id';
const DEBOUNCE_MS = 800;
const HEARTBEAT_INTERVAL_MS = 15000;

/**
 * Reusable hook for product landing analytics.
 * - Tracks unique visitors, device (android|iphone|computer), and browser in product_views.
 * - Tracks CTA/button clicks (debounced to prevent duplicates).
 * - Tracks active time using Page Visibility API (pauses when tab inactive).
 * - Sends time: every 15s heartbeat while visible, on tab hide, and on leave (beforeunload/pagehide/unmount).
 *   Heartbeat makes time work on mobile and when beforeunload doesn't fire.
 * Works for any product; no per-product setup required.
 */
export function useProductAnalytics(productId: string | undefined, productSlug?: string) {
  const sessionIdRef = useRef<string>('');
  const activeStartRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const lastClickRef = useRef<Record<string, number>>({});
  const sentTimeRef = useRef(false);
  const deviceBrowserRef = useRef<{ device: string; browser: string }>({ device: 'computer', browser: 'Unknown' });

  const slug = productSlug ?? productId ?? '';

  useEffect(() => {
    if (!productId) return;
    deviceBrowserRef.current = getDeviceAndBrowser();
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    sessionIdRef.current = sid;
    activeStartRef.current = Date.now();
    accumulatedMsRef.current = 0;
    sentTimeRef.current = false;
    const { device, browser } = deviceBrowserRef.current;
    productsAPI.recordView(productId, sid, device, browser).catch(() => {});
  }, [productId]);

  const flushTime = useCallback(
    (markSent = false) => {
      if (!productId) return;
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      const now = Date.now();
      const activeMs = document.visibilityState === 'visible' ? now - activeStartRef.current : 0;
      const totalMs = accumulatedMsRef.current + activeMs;
      const seconds = Math.round(totalMs / 1000);
      if (seconds < 1) return;
      if (markSent) sentTimeRef.current = true;
      accumulatedMsRef.current = 0;
      activeStartRef.current = now;
      const { device, browser } = deviceBrowserRef.current;
      analyticsAPI.trackTime(productId, sessionId, seconds).catch(() => {});
      productsAPI.recordLeave(productId, sessionId, seconds, device, browser).catch(() => {});
    },
    [productId]
  );

  useEffect(() => {
    if (!productId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        accumulatedMsRef.current += Date.now() - activeStartRef.current;
        flushTime(false);
      } else {
        activeStartRef.current = Date.now();
      }
    };

    const heartbeat = () => {
      if (document.visibilityState === 'visible') flushTime(false);
    };

    const handleBeforeUnload = () => flushTime(true);
    const handlePageHide = () => flushTime(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    const heartbeatId = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(heartbeatId);
      flushTime(true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [productId, flushTime]);

  const trackClick = useCallback(
    (eventType: string = 'cta_click') => {
      if (!productId || !sessionIdRef.current) return;
      const now = Date.now();
      const last = lastClickRef.current[eventType] ?? 0;
      if (now - last < DEBOUNCE_MS) return;
      lastClickRef.current[eventType] = now;
      analyticsAPI
        .trackEvent(productId, slug, eventType, sessionIdRef.current, now)
        .catch(() => {});
    },
    [productId, slug]
  );

  return { trackClick, sessionId: sessionIdRef.current };
}
