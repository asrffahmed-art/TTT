const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We will replace the PAYMOB FLOW in create-order and webhook.
// First, find the create-order paymob flow.

const createOrderStart = code.indexOf("// 2. PAYMOB FLOW");
const createOrderEnd = code.indexOf("    } catch (err: any) {", createOrderStart);

if (createOrderStart !== -1 && createOrderEnd !== -1) {
    const newCreateOrder = `// 2. PAYMOB FLOW
      if (paymentMethod === 'paymob' || paymentMethod === 'card') {
        const paymobSecret = process.env.PAYMOB_API_KEY;
        const integrationIdsStr = process.env.PAYMOB_INTEGRATION_ID || '';
        const integrationIds = integrationIdsStr.split(',').filter((id: string) => id.trim() !== '');

        if (!paymobSecret) {
           return res.status(400).json({
             success: false,
             error: "عذراً، يرجى ضبط مفاتيح Paymob (PAYMOB_API_KEY) في إعدادات البيئة لكي تعمل بوابة الدفع."
           });
        }

        // NEXTGEN INTENTION API
        const intentBody: any = {
          amount: Number(amount) * 100,
          currency: "EGP",
          special_reference: orderId,
          billing_data: {
            first_name: name ? name.split(' ')[0] || 'User' : 'User',
            last_name: name ? name.split(' ').slice(1).join(' ') || 'NA' : 'NA',
            email: email || "na@na.com",
            phone_number: phone || "+201000000000",
            apartment: "NA", floor: "NA", street: "NA", building: "NA", city: "Cairo", postal_code: "NA", country: "EG", state: "NA"
          },
          customer: {
            first_name: name ? name.split(' ')[0] || 'User' : 'User',
            last_name: name ? name.split(' ').slice(1).join(' ') || 'NA' : 'NA',
            email: email || "na@na.com"
          },
          extras: { orderId, userId, planId },
          redirection_url: \`\${appUrl}/api/payment/verify-success?orderId=\${orderId}&userId=\${userId}&planId=\${planId}\`
        };

        if (integrationIds.length > 0) {
            intentBody.payment_methods = integrationIds.map((id: string) => Number(id.trim()));
        }

        const intentRes = await fetch('https://accept.paymob.com/v1/intention/', {
          method: 'POST',
          headers: {
            'Authorization': \`Token \${paymobSecret}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(intentBody)
        });

        const intentData = await intentRes.json();
        
        if (intentData.client_url) {
           // Create Subscription Record as pending
           await setDoc(doc(dbWeb, "subscriptions", orderId.toString()), {
              user_id: userId,
              plan_id: planId,
              billing_cycle: planId.includes('yearly') ? 'yearly' : 'monthly',
              status: 'pending',
              paymob_order_id: intentData.id || '',
              amount: Number(amount),
              currency: 'EGP',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
           });

           return res.json({ success: true, orderId, paymentUrl: intentData.client_url, message: "تم تحويلك إلى Paymob" });
        }
        
        console.error("Paymob Intention Failed:", intentData);
        throw new Error('Paymob Intention API Failed');
      }
`;
    code = code.substring(0, createOrderStart) + newCreateOrder + code.substring(createOrderEnd);
}

// Now replace Webhook
const webhookStart = code.indexOf("// PAYMOB WEBHOOK (HMAC VALIDATION)");
const webhookEnd = code.indexOf("app.get(\"/api/payment/stripe/success\"", webhookStart);

if (webhookStart !== -1 && webhookEnd !== -1) {
    const newWebhook = `// PAYMOB WEBHOOK (HMAC VALIDATION)
  app.post("/api/payment/paymob/webhook", async (req, res) => {
    try {
      const crypto = require('crypto');
      const hmacKey = process.env.PAYMOB_HMAC_SECRET;
      
      if (!hmacKey) {
         return res.status(500).send('HMAC key not configured');
      }
      
      const { hmac } = req.query;
      const { obj } = req.body;
      
      if (!obj || !hmac) return res.status(400).send('Missing payload');

      // Paymob HMAC calculation string order:
      // amount_cents, created_at, currency, error_occured, has_parent_transaction, id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded, is_standalone_payment, is_voided, order.id, owner, pending, source_data.pan, source_data.sub_type, source_data.type, success
      
      const calcObj = {
        amount_cents: obj.amount_cents,
        created_at: obj.created_at,
        currency: obj.currency,
        error_occured: obj.error_occured,
        has_parent_transaction: obj.has_parent_transaction,
        id: obj.id,
        integration_id: obj.integration_id,
        is_3d_secure: obj.is_3d_secure,
        is_auth: obj.is_auth,
        is_capture: obj.is_capture,
        is_refunded: obj.is_refunded,
        is_standalone_payment: obj.is_standalone_payment,
        is_voided: obj.is_voided,
        order_id: obj.order.id,
        owner: obj.owner,
        pending: obj.pending,
        source_data_pan: obj.source_data.pan,
        source_data_sub_type: obj.source_data.sub_type,
        source_data_type: obj.source_data.type,
        success: obj.success
      };

      const hmacString = Object.values(calcObj).join('');
      const hashed = crypto.createHmac('sha512', hmacKey).update(hmacString).digest('hex');

      if (hashed === hmac) {
        if (obj.success === true) {
           const orderId = obj.order.merchant_order_id || (obj.order.data && obj.order.data.orderId) || obj.order.id;
           console.log("Valid Paymob Transaction Webhook received for order:", orderId);

           // Fetch the order from our paymentOrders
           let actualOrderId = orderId.toString();
           
           // If paymob doesn't return our custom order ID in merchant_order_id, we need to find it
           // But with Intention API, we put it in special_reference so it maps to merchant_order_id.
           
           const orderDocRef = doc(dbWeb, "paymentOrders", actualOrderId);
           const orderSnap = await getDoc(orderDocRef);
           
           if (orderSnap.exists()) {
              const orderData = orderSnap.data();
              if (orderData.status !== 'completed') {
                  // Mark as completed
                  await setDoc(orderDocRef, {
                    status: 'completed',
                    paymob_transaction_id: obj.id,
                    completedAt: new Date().toISOString()
                  }, { merge: true });

                  // Update the subscriptions table
                  const subRef = doc(dbWeb, "subscriptions", actualOrderId);
                  const startedAt = new Date();
                  const expiresAt = new Date();
                  const isYearly = orderData.planId.includes('yearly');
                  if (isYearly) {
                      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                  } else {
                      expiresAt.setMonth(expiresAt.getMonth() + 1);
                  }

                  await setDoc(subRef, {
                      status: 'active',
                      paymob_transaction_id: obj.id,
                      started_at: startedAt.toISOString(),
                      expires_at: expiresAt.toISOString(),
                      updated_at: startedAt.toISOString()
                  }, { merge: true });

                  // Grant benefits to user
                  await setDoc(doc(dbWeb, "users", orderData.userId.toString()), {
                      plan: orderData.planId.toString(),
                      planUpdatedAt: new Date().toISOString(),
                      subscriptionId: actualOrderId
                  }, { merge: true });
              }
           }
        }
        res.status(200).send('Webhook processed');
      } else {
        res.status(403).send('Invalid HMAC');
      }
    } catch(e) {
      console.error("Webhook processing error:", e);
      res.status(500).send('Error');
    }
  });

  `;
    code = code.substring(0, webhookStart) + newWebhook + "  " + code.substring(webhookEnd);
}

// Modify the verify-success logic to NOT trust the frontend for plan updates
const verifySuccessStart = code.indexOf("// PAYMOB & FALLBACK SUCCESS RETURN");
const verifySuccessEnd = code.indexOf("app.all(\"/api/*\",", verifySuccessStart);

if (verifySuccessStart !== -1 && verifySuccessEnd !== -1) {
    const newVerifySuccess = `// PAYMOB & FALLBACK SUCCESS RETURN
  app.get("/api/payment/verify-success", async (req, res) => {
    try {
      const { success, orderId, userId, planId } = req.query;
      
      // Note: We DO NOT activate the plan here. The Webhook is the source of truth!
      // This is purely for frontend redirection.

      if (success === 'false') {
         return res.redirect('/?payment_status=failed');
      }

      return res.redirect('/?payment_status=success');
    } catch (err: any) {
      console.error("Error verifying payment:", err);
      res.status(500).send("فشل تأكيد عملية الدفع.");
    }
  });

`;
    code = code.substring(0, verifySuccessStart) + newVerifySuccess + code.substring(verifySuccessEnd);
}

fs.writeFileSync('server.ts', code);
