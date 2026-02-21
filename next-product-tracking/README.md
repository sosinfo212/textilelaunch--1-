# Next.js Product Click & Duration Tracking

Track product page visits with IP, country, user agent, timestamp, and duration (via `navigator.sendBeacon` on unmount).

## Setup

1. **Install dependencies**
   ```bash
   cd next-product-tracking && npm install
   ```

2. **Configure database**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` for MySQL, e.g.:
     ```bash
     DATABASE_URL="mysql://user:password@127.0.0.1:3306/your_db"
     ```

3. **Run migrations**
   ```bash
   npx prisma migrate dev --name init
   ```
   Or push schema without migration history:
   ```bash
   npx prisma db push
   ```

4. **Create at least one product** (required for tracking)
   ```bash
   npx prisma db seed
   ```
   Or manually in MySQL:
   ```sql
   INSERT INTO Product (id, slug, name) VALUES ('clxxexample', 'sample-product', 'Sample Product');
   ```

5. **Run the app**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and visit http://localhost:3000/products/sample-product to test.

## Production

- **IP**: Read from `x-forwarded-for` or `x-real-ip` (set by your reverse proxy).
- **Country**: Set `x-vercel-ip-country` (Vercel) or equivalent in your host.
- **Bots**: Requests with user-agent containing `bot` are ignored (no row created).

## API

- **POST /api/track**  
  Body: `{ "slug": "product-slug" }` or `{ "productId": "cuid" }`.  
  Returns: `{ "ok": true, "clickId": "..." }`. Creates a `Click` row (ip, country, userAgent, timestamp).

- **POST /api/track-duration**  
  Body: `{ "clickId": "...", "duration": 123 }`. Updates the click’s `duration` (seconds).
