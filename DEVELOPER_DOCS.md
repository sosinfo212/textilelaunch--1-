# TextileLaunch Developer Documentation

## API documentation (Swagger)

The REST API is documented with **OpenAPI 3.0** and served by **Swagger UI**.

- **URL:** When the server is running, open **`/api-docs`** (e.g. `http://localhost:5001/api-docs`).
- **Auth:** Endpoints support session cookie (after login) or API key: `Authorization: Bearer <key>` or `X-API-Key: <key>`.

---

## 1. Overview
TextileLaunch is a SaaS platform designed for textile sellers to generate high-converting landing pages. 
Currently, the application runs as a **Client-Side React Application (SPA)** using `localStorage` for data persistence.

**Target Architecture:**
- **Frontend:** React (Next.js App Router recommended)
- **Backend:** Next.js API Routes (Serverless functions)
- **Database:** MySQL
- **ORM:** Prisma (Recommended)

---

## 2. Project Structure (Migration Target)

When migrating to Next.js, the folder structure should be reorganized as follows:

```
/
├── app/
│   ├── api/                  # Backend API Routes
│   │   ├── auth/             # Login/Register endpoints
│   │   ├── products/         # Product CRUD
│   │   ├── orders/           # Order CRUD
│   │   └── settings/         # User Settings
│   ├── (dashboard)/          # Protected Admin Routes
│   │   ├── page.tsx          # Dashboard Home
│   │   └── ...
│   ├── product/[id]/         # Public Landing Pages
│   └── login/                # Login Page
├── components/               # Shared UI Components (Migrated from src/components)
├── lib/                      # Utilities
│   ├── prisma.ts             # DB Connection
│   └── auth.ts               # JWT Handling
├── prisma/
│   └── schema.prisma         # Prisma Schema (matches MySQL)
└── public/                   # Static assets
```

---

## 3. Database Integration

We use **MySQL** as the database.

### SQL Schema Definition

Use the following SQL to set up the database:

```sql
CREATE TABLE users (
  id VARCHAR(191) PRIMARY KEY,
  email VARCHAR(191) UNIQUE NOT NULL,
  password VARCHAR(191),
  name VARCHAR(191),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id VARCHAR(191) PRIMARY KEY,
  owner_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  regular_price DECIMAL(10, 2),
  images JSON, -- Stored as ["url1", "url2"]
  attributes JSON, -- Stored as [{name: "Taille", options: ["S", "M"]}]
  category VARCHAR(100),
  supplier VARCHAR(100),
  landing_page_template_id VARCHAR(191),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE orders (
  id VARCHAR(191) PRIMARY KEY,
  seller_id VARCHAR(191) NOT NULL,
  product_id VARCHAR(191) NOT NULL,
  product_name VARCHAR(191),
  product_price DECIMAL(10, 2),
  product_supplier VARCHAR(100),
  customer_info JSON, -- {fullName, address, city, phone}
  selected_attributes JSON, -- {Taille: "M", Couleur: "Rouge"}
  status VARCHAR(50) DEFAULT 'pending', -- pending, shipped, completed
  viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE landing_page_templates (
  id VARCHAR(191) PRIMARY KEY,
  owner_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  mode VARCHAR(20) DEFAULT 'visual', -- 'visual' or 'code'
  elements JSON, -- The JSON tree for visual builder
  html_code TEXT, -- Raw HTML for code mode
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_products_owner ON products(owner_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
```

### Recommended Stack for DB Access:
1.  **Prisma ORM**: Best type safety with TypeScript.
2.  **PlanetScale** or **RDS**: Recommended hosting for MySQL.

### Data Mapping (JSON Fields)
MySQL `JSON` columns are used for flexible data structures.
- **Product Images**: Stored as `string[]` in the `images` column.
- **Attributes**: Stored as `[{ name: string, options: string[] }]` in the `attributes` column.
- **Page Elements**: The Visual Builder stores the layout tree in `templates.elements`.

---

## 4. API Specification (Next.js Backend)

You need to implement the following API routes to replace `StoreContext.tsx` logic.

### A. Authentication
- `POST /api/auth/login`: Validates credentials, returns JWT (HttpOnly Cookie).
- `POST /api/auth/logout`: Clears cookie.
- `GET /api/auth/me`: Returns current user session.

### B. Products
- `GET /api/products`: Fetch products for the logged-in user (`WHERE owner_id = session.user.id`).
- `GET /api/products/[id]`: Fetch specific product (Public access allowed for landing pages).
- `POST /api/products`: Create new product.
- `POST /api/products/import`: **Bulk import** products. Body: `{ products: [...], skipInvalid?: boolean }`. See [docs/API_PRODUCTS_IMPORT.md](docs/API_PRODUCTS_IMPORT.md) for parameters and examples.
- `PUT /api/products/[id]`: Update product.

### C. Orders
- `GET /api/orders`: Fetch orders (`WHERE seller_id = session.user.id`).
- `POST /api/orders`: Public endpoint. Receives order form data from Landing Page.
    - **Crucial**: Must handle CORS to allow requests from the landing page.
    - **Logic**: Validate input -> Insert into DB -> (Optional) Send Email Notification.

### D. Settings & Templates
- `GET /api/settings`: Fetch user logo, shop name, API keys.
- `POST /api/gemini`: Proxy endpoint for Google Gemini API (Server-side) to hide the API Key from the client.

---

## 5. Migration Strategy

### Step 1: Initialize Next.js
1. Run `npx create-next-app@latest text-launch-v2 --typescript --tailwind --eslint`.
2. Copy `src/components` to the new project.
3. Install dependencies: `npm install lucide-react @google/genai prisma @prisma/client`.

### Step 2: Database Setup
1. Set up a MySQL database.
2. Run the SQL script provided in Section 3.
3. Configure `DATABASE_URL` in `.env`.
4. Run `npx prisma db pull` to generate the Prisma client.

### Step 3: Refactor Context
The current `StoreContext` uses `localStorage`. This must be refactored to:
1. **Server Components**: Fetch data directly in `page.tsx` (e.g., `const products = await db.product.findMany(...)`).
2. **Client Components**: Use `swr` or `react-query` for client-side fetching/caching.

### Step 4: Authentication
Replace the mock `AuthContext` with **NextAuth.js** (Auth.js) or a custom JWT implementation.
- If using NextAuth, use the `CredentialsProvider` to validate against the MySQL `users` table.

---

## 6. Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL="mysql://user:password@host:3306/textile_launch"
JWT_SECRET="super_secret_random_string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# Move Gemini Key here for server-side usage
GEMINI_API_KEY="AIzaSy..."
```

## 7. Development Tips

- **Landing Page Performance**: Use `generateStaticParams` in Next.js for product pages if they don't change often, or `ISR` (Incremental Static Regeneration) for fast loading speeds.
- **Security**: Never expose `GEMINI_API_KEY` to the client in the new architecture. Create a server action or API route to handle the description generation.
