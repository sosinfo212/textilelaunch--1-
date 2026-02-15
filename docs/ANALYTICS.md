# Product landing analytics

## Data flow

1. **Visitor opens product landing**  
   `useProductAnalytics(productId, productSlug)` runs:
   - Reads or creates `sessionId` in `sessionStorage` (`tl_visitor_id`).
   - Starts active-time timer (only while tab is visible, via Page Visibility API).

2. **CTA / button clicks**  
   Each tracked button calls `trackClick('cta_click')`:
   - Debounced per event type (800 ms) to avoid duplicate events.
   - Sends `POST /api/analytics/events` with `{ productId, productSlug, eventType, timestamp, sessionId }`.

3. **Time spent (active only)**  
   - On **visibility hidden**: add current segment to `accumulatedMs`, do not send.
   - On **visibility visible**: start new segment.
   - On **leave** (beforeunload, pagehide, unmount): compute total active ms, send once as `POST /api/analytics/time` with `{ productId, sessionId, timeSpentSeconds }`.

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

## DB

- **analytics_events**: `id`, `product_id`, `product_slug`, `session_id`, `event_type` ('cta_click' | 'time_spent'), `event_value` (seconds for time_spent), `created_at`.
- Run: `mysql -u ... agency < database/add-analytics-events-table.sql`

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
