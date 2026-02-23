# Product Import API

Bulk import products via the REST API. Use this to create many products in one request (e.g. from a CSV, spreadsheet, or another system).

---

## Endpoint

| Method | URL | Auth |
|--------|-----|------|
| `POST` | `/api/products/import` | Required (session cookie) |

---

## Authentication

You can authenticate in either way:

1. **Session cookie** — Log in via the dashboard; the same cookie is sent with requests (e.g. from the browser).
2. **API key** — Generate a key in **Settings → Clé API TextileLaunch → Générer une clé**. Use it in the request header:
   - `Authorization: Bearer <your_api_key>`, or
   - `X-API-Key: <your_api_key>`

The imported products are created for the **authenticated user** (`owner_id`).

- **401 Unauthorized** — Not logged in, invalid session, or invalid/missing API key.

---

## Request body

Send a JSON body with a `products` array and an optional `skipInvalid` flag.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `products` | `array` | **Yes** | — | Array of product objects. Each object can contain the fields below. |
| `skipInvalid` | `boolean` | No | `true` | If `true`, invalid rows are skipped and listed in `skipped`. If `false`, invalid rows are reported in `errors` and no product is created for them. |

### Product object (each item in `products`)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | **Yes** | — | Product name. Trimmed. |
| `price` | `number` or `string` | **Yes** | — | Selling price. Must be > 0. |
| `description` | `string` | No | `""` | Full description (plain text or HTML). |
| `regularPrice` | `number` or `string` | No | `null` | Original/compare-at price (optional). |
| `currency` | `string` | No | `"MAD"` | Currency code (e.g. `MAD`, `EUR`, `USD`). |
| `sku` | `string` | No | `null` | Stock Keeping Unit. |
| `showSku` | `boolean` | No | `false` | Whether to show SKU on the landing page. |
| `images` | `string[]` or `string` | No | `[]` | Image URLs. Single URL is accepted and converted to an array. |
| `videos` | `string[]` or `string` | No | `[]` | Video URLs (e.g. YouTube). Single URL accepted. |
| `attributes` | `array` | No | `[]` | Variants. Each item: `{ name: string, options: string[] }` (e.g. `{ name: "Color", options: ["Red", "Blue"] }`). |
| `category` | `string` | No | `null` | Category name. |
| `supplier` | `string` | No | `null` | Supplier name. |
| `landingPageTemplateId` | `string` | No | `null` | ID of a landing page template to use for this product. |
| `paymentOptions` | `string` | No | `"cod_only"` | One of: `cod_only`, `stripe_only`, `both`. |

---

## Response

### Success (201 Created)

```json
{
  "message": "Import complete: 3 created, 1 skipped, 0 errors.",
  "created": [
    {
      "id": "Prod_abc-123",
      "ownerId": "user-id",
      "name": "Product A",
      "description": "",
      "price": 99.99,
      "currency": "MAD",
      "images": [],
      "attributes": [],
      "paymentOptions": "cod_only",
      "createdAt": 1234567890123
    }
  ],
  "skipped": [
    {
      "index": 2,
      "reason": "Missing or invalid name/price",
      "item": { "name": null, "price": "invalid" }
    }
  ],
  "errors": []
}
```

| Field | Description |
|-------|-------------|
| `message` | Summary of the import. |
| `created` | Array of created products (same shape as single product in GET/POST). |
| `skipped` | Rows skipped when `skipInvalid` is true (invalid or insert failure). |
| `errors` | Rows that caused errors when `skipInvalid` is false. |

### Error (4xx / 5xx)

| Status | Body | Meaning |
|--------|------|--------|
| `400` | `{ "error": "Request body must include a \"products\" array with at least one item.", "example": { ... } }` | Missing or empty `products` array. |
| `401` | `{ "error": "Authentication required" }` | Not logged in. |
| `500` | `{ "error": "Internal server error", "details": "..." }` | Server/database error. |

---

## Examples

### Minimal (name + price only)

```json
{
  "products": [
    { "name": "Green Abaya", "price": 299 },
    { "name": "Velvet Dress", "price": 350.50 }
  ]
}
```

### Full product (all optional fields)

```json
{
  "products": [
    {
      "name": "Premium Abaya",
      "price": 399,
      "regularPrice": 499,
      "currency": "MAD",
      "description": "<p>Elegant abaya with premium fabric.</p>",
      "sku": "ABY-001",
      "showSku": true,
      "images": [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg"
      ],
      "videos": ["https://www.youtube.com/watch?v=xxxx"],
      "attributes": [
        { "name": "Color", "options": ["Black", "Navy", "Burgundy"] },
        { "name": "Size", "options": ["S", "M", "L", "XL"] }
      ],
      "category": "Abayas",
      "supplier": "Supplier A",
      "landingPageTemplateId": "tpl_xxx",
      "paymentOptions": "both"
    }
  ],
  "skipInvalid": true
}
```

### cURL (with session cookie)

```bash
curl -X POST 'https://your-domain.com/api/products/import' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: sessionId=YOUR_SESSION_COOKIE' \
  -d '{
    "products": [
      { "name": "Product 1", "price": 100 },
      { "name": "Product 2", "price": 200 }
    ],
    "skipInvalid": true
  }'
```

### JavaScript (fetch with credentials)

```javascript
const response = await fetch('/api/products/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    products: [
      { name: 'Product 1', price: 100 },
      { name: 'Product 2', price: 200 }
    ],
    skipInvalid: true
  })
});
const data = await response.json();
console.log(data.created.length, 'products created');
```

---

## Validation rules

- **name**: Required, non-empty after trim.
- **price**: Required, must be a positive number (integer or decimal).
- **paymentOptions**: Must be one of `cod_only`, `stripe_only`, `both`; otherwise defaults to `cod_only`.
- **attributes**: Must be an array of `{ name: string, options: string[] }`. Invalid entries are stored as given; the UI may ignore malformed items.

Invalid rows (e.g. missing name or price ≤ 0) are either **skipped** (when `skipInvalid: true`) or reported in **errors** (when `skipInvalid: false`). No product is created for invalid rows.

---

## Rate and size

- No hard limit is documented; very large imports (e.g. thousands of rows) may hit timeouts or body size limits. Prefer batches of a few hundred products per request if you have many.
