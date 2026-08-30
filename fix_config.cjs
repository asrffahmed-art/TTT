const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const configRoute = `  app.get("/api/payment/config", (req, res) => {
    res.json({
      stripePublicKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
      paypalClientId: process.env.PAYPAL_CLIENT_ID || ''
    });
  });`;

const configRoutePatched = `  app.get("/api/payment/config", async (req, res) => {
    let paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
    let stripePublicKey = process.env.VITE_STRIPE_PUBLIC_KEY || '';
    try {
        const snap = await getDoc(doc(dbWeb, "systemConfig", "apiKeys"));
        if (snap.exists()) {
            const data = snap.data();
            if (data.paypalClientId) paypalClientId = data.paypalClientId;
            if (data.stripePublicKey) stripePublicKey = data.stripePublicKey; // Note: stripe is usually not in DB but just in case
        }
    } catch(e) {}
    res.json({
      stripePublicKey,
      paypalClientId
    });
  });`;

code = code.replace(configRoute, configRoutePatched);
fs.writeFileSync('server.ts', code);
