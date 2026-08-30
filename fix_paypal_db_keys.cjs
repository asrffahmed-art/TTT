const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const paypalFlowStart = code.indexOf("// 1. PAYPAL FLOW");
const paymobFlowStart = code.indexOf("// 2. PAYMOB FLOW");

if (paypalFlowStart !== -1 && paymobFlowStart !== -1) {
    const newPaypalFlow = `// 1. PAYPAL FLOW
      if (paymentMethod === 'paypal') {
        let paypalClientId = process.env.PAYPAL_CLIENT_ID;
        let paypalSecret = process.env.PAYPAL_CLIENT_SECRET;
        let isLive = process.env.PAYPAL_MODE === 'live';
        
        try {
          const apiKeysSnap = await getDoc(doc(dbWeb, "systemConfig", "apiKeys"));
          if (apiKeysSnap.exists()) {
             const data = apiKeysSnap.data();
             if (data.paypalClientId) paypalClientId = data.paypalClientId;
             if (data.paypalClientSecret) paypalSecret = data.paypalClientSecret;
             if (data.paypalMode) isLive = data.paypalMode === 'live';
          }
        } catch(err) {
          console.error("Error fetching PayPal keys from DB:", err);
        }

        const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

        if (!paypalClientId || !paypalSecret) {
           return res.status(400).json({
             success: false,
             error: "عذراً، يرجى إضافة مفاتيح PayPal في إعدادات البيئة لكي تعمل بوابة الدفع."
           });
        }

        // Get PayPal Access Token
        const auth = Buffer.from(\`\${paypalClientId}:\${paypalSecret}\`).toString('base64');
        const tokenRes = await fetch(\`\${baseUrl}/v1/oauth2/token\`, {
          method: 'POST',
          body: 'grant_type=client_credentials',
          headers: { Authorization: \`Basic \${auth}\`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const tokenData = await tokenRes.json();
        
        if (!tokenData.access_token) {
           console.error("PayPal Token Error:", tokenData);
           throw new Error('PayPal Authentication Failed');
        }
        
        const accessToken = tokenData.access_token;

        // USD Conversion (approximate 50 EGP = 1 USD)
        const amountUsd = Math.max(1, (Number(amount) / 50)).toFixed(2); // Minimum 1 USD

        // Create Order
        const orderRes = await fetch(\`\${baseUrl}/v2/checkout/orders\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: \`Bearer \${accessToken}\`
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
              reference_id: orderId,
              amount: { currency_code: 'USD', value: amountUsd },
              description: \`THOTH Subscription - \${planId}\`
            }],
            application_context: {
              return_url: \`\${appUrl}/api/payment/paypal/capture?orderId=\${orderId}&userId=\${userId}&planId=\${planId}\`,
              cancel_url: \`\${appUrl}/#subscription\`
            }
          })
        });
        const orderResData = await orderRes.json();
        
        if (orderResData.id) {
           const approveLink = orderResData.links.find((l: any) => l.rel === 'approve');
           if (approveLink) {
             return res.json({ success: true, orderId, paymentUrl: approveLink.href, paypalOrderId: orderResData.id, message: "تم تحويلك إلى PayPal" });
           }
        }
        console.error("PayPal Order Error:", orderResData);
        throw new Error(\`PayPal Order Creation Failed: \${orderResData.message || orderResData.name || ''}\`);
      }
      `;
    
    code = code.substring(0, paypalFlowStart) + newPaypalFlow + code.substring(paymobFlowStart);
    fs.writeFileSync('server.ts', code);
}
