# Product landing analytics

## Data flow

1. **Visitor opens product landing**  
   `useProductAnalytics(productId, productSlug)` runs:
   - Reads or creates `sessionId` in `sessionStorage` (`tl_visitor_id`).
   - Detects **device** (android | iphone | computer) and **browser** from navigator.
   - Calls **POST /api/products/:id/view** with `{ sessionId, device, browser }` → stored in `product_views` (unique visitors + device/browser).
   - Starts active-time timer (only while tab is visible, via Page Visibility API).

2. **CTA / button clicks**  
   Each tracked button calls `trackClick('cta_click')`:
   - Debounced per event type (800 ms) to avoid duplicate events.
   - Sends `POST /api/analytics/events` with `{ productId, productSlug, eventType, timestamp, sessionId }`.

3. **Time spent (active only)**  
   - On **visibility hidden**: add current segment to `accumulatedMs`, send time via heartbeat/pixel.
   - On **visibility visible**: start new segment.
   - Every **15s heartbeat** (while visible) and on **leave** (beforeunload, pagehide, unmount): send `POST /api/analytics/time` and **POST /api/products/:id/view/leave** with `{ sessionId, timeSpentSeconds, device, browser }` so `product_views` keeps `time_spent_seconds` and device/browser.

4. **Backend**  
   - **POST /api/analytics/events** → insert into `analytics_events` (product_id, session_id, event_type, …).
   - **POST /api/analytics/time** → insert row with `event_type = 'time_spent'`, `event_value = seconds`.
   - **GET /api/analytics/summary/:productId** (auth, owner) → aggregate: `clickCount` (cta_click), `totalTimeSpentSeconds` (sum of time_spent).

5. **Analytics page**  
   Fetches `productsAPI.getAnalytics` (unique visitors, orders) and `analyticsAPI.getSummary` (click count, active time), then shows: visiteurs uniques, clics CTA, commandes, temps actif total.

## Edge cases handled

- **No duplicate events**  
  Clicks debounced (800 ms per event type). Time sent only once per visit (on leave).

- **Active time only**  
  Timer runs only when `document.visibilityState === 'visible'`; hidden segments are accumulated and included in the single send on leave.

- **Leave reliability**  
  Time is sent on `visibilitychange` (hidden), `beforeunload`, `pagehide`, and effect cleanup (unmount/route change). `sentTimeRef` ensures we send at most once per mount.

- **Anonymous visitors**  
  All analytics requests use `credentials: 'omit'` so they work without login.

- **Missing table**  
  If `analytics_events` does not exist, endpoints return 503 so the app knows migration is required.

- **Memory leaks**  
  All listeners (visibility, beforeunload, pagehide) are removed in the effect cleanup.

- **Works for all products**  
  No per-product setup; `productId`/`productSlug` come from the landing page. Any new product gets tracking automatically.

## Tracking pixel (device, browser, time)

- **GET /api/tracking/pixel?productId=…&sessionId=…&timeSpent=…**  
  Returns a 1×1 transparent GIF and records/updates `product_views` with **time_spent_seconds**, **device**, **browser** (from User-Agent or query). Use as `<img src="…">` in emails or third-party pages.
- **POST /api/tracking/pixel**  
  Same payload as JSON body (for `navigator.sendBeacon`): `{ productId, sessionId, timeSpentSeconds?, device?, browser? }`.
- **product_views** columns: `device` (android | iphone | computer), `browser` (Chrome, Safari, etc.). Run: `mysql -u ... agency < database/add-product-views-device-browser.sql` after `add-product-views-table.sql`.

## DB

- **analytics_events**: `id`, `product_id`, `product_slug`, `session_id`, `event_type` ('cta_click' | 'time_spent'), `event_value` (seconds for time_spent), `created_at`.
- **product_views**: `id`, `product_id`, `session_id`, `first_seen_at`, `time_spent_seconds`, `device`, `browser` (unique per product+session).
- Run: `mysql -u ... agency < database/add-analytics-events-table.sql`, then `add-product-views-table.sql`, then `add-product-views-device-browser.sql`.

## Aggregation per product

- **clickCount**: `SELECT COUNT(*) FROM analytics_events WHERE product_id = ? AND event_type = 'cta_click'`
- **totalTimeSpentSeconds**: `SELECT COALESCE(SUM(event_value), 0) FROM analytics_events WHERE product_id = ? AND event_type = 'time_spent'`

## Troubleshooting: Clicks and time stay at 0

1. **Run the migration on the server** (required once):
   ```bash
   mysql -u textilelaunch_db -p'...' -h 127.0.0.1 agency < database/add-analytics-events-table.sql
   ```
2. **Redeploy** so the frontend sends to `/api/analytics/events` and `/api/analytics/time`. Time is sent every 15s (heartbeat) while the tab is active, and on tab switch/leave.
3. **Optional: use a tracking library** for maximum reliability (e.g. **PostHog** or **Umami**): they handle batching, retries, and mobile quirks. You can keep our backend for ownership and add a library in parallel, or replace with their API.
