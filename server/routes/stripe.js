import express from 'express';
import Stripe from 'stripe';
import { db } from '../index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create PaymentIntent and order (public - used by landing page)
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { productId, productName, productPrice, productSupplier, customer, selectedAttributes } = req.body;
    if (!productId || !customer || !selectedAttributes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [products] = await db.execute(
      'SELECT id, owner_id, name, price, currency, supplier FROM products WHERE id = ?',
      [productId]
    );
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = products[0];

    const [settings] = await db.execute(
      'SELECT stripe_secret_key FROM app_settings WHERE user_id = ?',
      [product.owner_id]
    );
    if (!settings.length || !settings[0].stripe_secret_key) {
      return res.status(400).json({ error: 'Stripe is not configured for this product. Use COD or contact the seller.' });
    }

    const stripe = new Stripe(settings[0].stripe_secret_key.trim(), { apiVersion: '2024-11-20.acacia' });
    const amount = parseFloat(product.price);
    const quantity = parseInt(selectedAttributes['Quantité'] || selectedAttributes['Quantity'] || '1', 10) || 1;
    const total = amount * quantity;

    // Stripe amounts in smallest unit: MAD = centimes (1 MAD = 100 centimes)
    const amountInCentimes = Math.round(total * 100);
    if (amountInCentimes < 1) {
      return res.status(400).json({ error: 'Amount too small' });
    }

    const orderId = `order_${uuidv4()}`;
    const customerJson = JSON.stringify(customer);
    const attributesJson = JSON.stringify(selectedAttributes);

    await db.execute(
      `INSERT INTO orders (
        id, seller_id, product_id, product_name, product_price,
        product_supplier, customer_info, selected_attributes, status, viewed, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', FALSE, 'stripe')`,
      [
        orderId, product.owner_id, productId, productName || product.name, product.price,
        productSupplier || product.supplier || null, customerJson, attributesJson
      ]
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCentimes,
      currency: 'mad',
      metadata: { orderId, productId },
      automatic_payment_methods: { enabled: true }
    });

    await db.execute(
      'UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ?',
      [paymentIntent.id, orderId]
    );

    res.json({ clientSecret: paymentIntent.client_secret, orderId });
  } catch (err) {
    console.error('Stripe create-payment-intent error:', err);
    res.status(500).json({ error: err.message || 'Payment setup failed' });
  }
});

// Webhook handler (must receive raw body - mount in index.js with express.raw())
export async function stripeWebhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
    return res.sendStatus(200);
  }
  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (e) {
    console.error('Stripe webhook signature verification failed:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const orderId = pi.metadata?.orderId;
    if (orderId) {
      try {
        await db.execute(
          "UPDATE orders SET status = 'pending' WHERE id = ? AND stripe_payment_intent_id = ?",
          [orderId, pi.id]
        );
      } catch (err) {
        console.error('Webhook update order error:', err);
      }
    }
  }
  res.sendStatus(200);
}

export default router;
