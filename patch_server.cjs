const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('/api/payment/config')) {
  code = code.replace('app.post("/api/payment/create-order"', `app.get("/api/payment/config", (req, res) => {
    res.json({
      stripePublicKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
      paypalClientId: process.env.PAYPAL_CLIENT_ID || ''
    });
  });

  app.post("/api/payment/create-intent", async (req, res) => {
    try {
      const { amount, currency } = req.body;
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) return res.status(400).json({ error: 'No Stripe Secret Key' });
      const Stripe = (await import('stripe')).default;
      const stripeClient = new Stripe(stripeKey);
      
      const amountUsd = Math.max(50, Math.round((Number(amount) / 50) * 100)); // Cents
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: amountUsd,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/payment/create-order"`);
  fs.writeFileSync('server.ts', code);
  console.log('Patched server.ts');
}
