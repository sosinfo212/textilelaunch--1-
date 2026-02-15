import { useEffect, useRef, useCallback } from 'react';
import { analyticsAPI } from '../src/utils/api';

const SESSION_KEY = 'tl_visitor_id';
const DEBOUNCE_MS = 800;

/**
 * Reusable hook for product landing analytics.
 * - Tracks CTA/button clicks (debounced to prevent duplicates).
 * - Tracks active time using Page Visibility API (pauses when tab inactive).
 * - Sends time on: visibility hidden, route change, page unload, unmount.
 * Works for any product; no per-product setup required.
 */
export function useProductAnalytics(productId: string | undefined, productSlug?: string) {
  const sessionIdRef = useRef<string>('');
  const activeStartRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const lastClickRef = useRef<Record<string, number>>({});
  const sentTimeRef = useRef(false);

  const slug = productSlug ?? productId ?? '';

  useEffect(() => {
    if (!productId) return;
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    sessionIdRef.current = sid;
    activeStartRef.current = Date.now();
    accumulatedMsRef.current = 0;
    sentTimeRef.current = false;
  }, [productId]);

  const sendTime = useCallback(() => {
    if (!productId || sentTimeRef.current) return;
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    const now = Date.now();
    const activeMs = document.visibilityState === 'visible' ? now - activeStartRef.current : 0;
    const totalMs = accumulatedMsRef.current + activeMs;
    const seconds = Math.round(totalMs / 1000);
    if (seconds < 1) return;
    sentTimeRef.current = true;
    analyticsAPI.trackTime(productId, sessionId, seconds).catch(() => {});
  }, [productId]);

  useEffect(() => {
    if (!productId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        accumulatedMsRef.current += Date.now() - activeStartRef.current;
      } else {
        activeStartRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => sendTime();
    const handlePageHide = () => sendTime();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      sendTime();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [productId, sendTime]);

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
