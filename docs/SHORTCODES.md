# Landing page shortcodes

Use these shortcodes in **Code** templates (Modèle de landing page → mode Code) to build your own layout. Paste them in your HTML in any order.

| Shortcode | Description |
|-----------|-------------|
| `{notification_bar}` or `{notification_bar\|Your text}` | Sticky top bar. Default: Arabic. Custom text: `{notification_bar\|Free delivery}` |
| `{breadcrumb}` | Breadcrumb: Home link + product name. |
| `{product_name}` | Product name (text). |
| `{product_price}` | Selling price (formatted). |
| `{product_regular_price}` | Regular price (formatted); empty if not set. |
| `{product_price_block}` | Block with price + optional strikethrough regular price. |
| `{product_sku}` | SKU (only if product has “show SKU” enabled). |
| `{product_image_0}` | First image URL (use in `<img src="...">`). |
| `{product_image_carousel}` | Full gallery with main image/video + thumbnails. |
| `{attributes_selector}` | Variant selector (e.g. size, color) as radio buttons. |
| `{quantity_selector}` | Quantity selector with − and + buttons. |
| `{payment_selector}` | COD vs online payment (only if product allows both). |
| `{order_form}` | Order form: name, phone, city, address + submit button. |
| `{trust_badges}` | Two trust badges (fast delivery, pay on delivery). |
| `{product_description}` | Raw description (HTML or plain text). |
| `{product_description_section}` | Section with “وصف المنتج” title + description. |
| `{product_reviews}` | Avis clients (auteur, note, texte). Affiché si « Afficher la section avis » est activé et au moins un avis. |
| `{sticky_cta}` or `{sticky_cta\|Order Now}` | Fixed bottom bar: total + button. Custom: `{sticky_cta|Order Now}` |

## Example: custom layout

```html
<div class="p-6 max-w-2xl mx-auto font-cairo" dir="rtl">
  {notification_bar}
  {breadcrumb}

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
    <div>
      {product_image_carousel}
    </div>
    <div>
      <h1 class="text-3xl font-bold">{product_name}</h1>
      {product_price_block}
      {attributes_selector}
      {quantity_selector}
      {payment_selector}
      {order_form}
    </div>
  </div>

  {trust_badges}
  {product_description_section}
  {sticky_cta}
</div>
```

Form fields and buttons are wired automatically (submit, quantity, payment method, attributes). The sticky CTA scrolls to `#order-form-container` (the `{order_form}` block is wrapped in that id).

## Customizing shortcode text

Some shortcodes accept an optional parameter after a pipe `|` to override the default text:

- **`{sticky_cta|Order Now}`** — Use "Order Now" instead of "اطلب الآن" on the bottom bar button.
- **`{notification_bar|Free delivery - Pay on delivery}`** — Use your own text for the top notification bar instead of the default Arabic message.
