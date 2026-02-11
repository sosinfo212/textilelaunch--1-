# Performance best practices (applied & optional)

## Applied in this project

### 1. **Preconnect for third-party origins**
- `index.html` has `<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com` so the browser opens connections early. The font CSS is now loaded in a **non-blocking** way (see below), so these preconnects are used without holding up first paint.

### 2. **Non-blocking font loading**
- Google Fonts (Cairo) is loaded with **preload + onload**: the stylesheet is requested with `rel="preload" as="style"` and switched to `rel="stylesheet"` in `onload`, so it no longer blocks render. `font-display: swap` is already in the URL so text stays visible while the font loads.
- **Result:** Removes the font from the critical rendering path and uses preconnect effectively.

### 3. **Defer Tailwind**
- Tailwind CDN script uses `defer` so it doesn’t block HTML parsing.

### 4. **Code-splitting and smaller chunks**
- `ProductLanding` is lazy-loaded so product pages don’t load the full app bundle.
- Vite `manualChunks` split React, router, and Lucide into separate cacheable chunks so the main JS is smaller and better cached.

### 5. **Landing page images**
- Main hero image: `fetchPriority="high"` and `decoding="async"`.
- Thumbnails: `loading="lazy"` and `decoding="async"`.

### 6. **Deferred third-party scripts**
- Facebook and TikTok pixels are injected after first paint via `requestIdleCallback` (or `setTimeout` fallback) so they don’t compete with LCP.

### 7. **Caching**
- Nginx serves `/assets/*` with long-lived cache (`Cache-Control: public, immutable`, 1 year). HTML uses `no-cache` so users always get the latest entry file.

---

## Optional next steps

- **Reduce font weights:** If you only use a few weights (e.g. 400 and 600), change the Google Fonts URL to load only those (e.g. `Cairo:wght@400;600`) to reduce CSS and font file size.
- **Self-host Cairo:** Download the woff2 files and serve them from your domain to avoid the fonts.googleapis.com round-trip and better control caching.
- **Further JS reduction:** Keep heavy dependencies (e.g. xlsx, chart libs) behind dynamic imports so they load only on the routes that need them.
