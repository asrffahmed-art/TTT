const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPaymobBlock = code.substring(
    code.indexOf("// 2. PAYMOB FLOW"),
    code.indexOf("// PAYPAL CAPTURE RETURN")
);

const newPaymobBlock = `// 2. PAYMOB FLOW
      if (paymentMethod === 'paymob' || paymentMethod === 'card') {
        let paymobSecret = process.env.PAYMOB_API_KEY; 
        let integrationIdsStr = process.env.PAYMOB_INTEGRATION_ID || '';
        
        try {
          const apiKeysSnap = await getDoc(doc(dbWeb, "systemConfig", "apiKeys"));
          if (apiKeysSnap.exists()) {
             const data = apiKeysSnap.data();
             if (data.paymobSecretKey) paymobSecret = data.paymobSecretKey;
             else if (data.paymobApiKey) paymobSecret = data.paymobApiKey;
             
             if (data.paymobIntegrationId) integrationIdsStr = data.paymobIntegrationId;
          }
        } catch(err) {
          console.error("Error fetching Paymob keys from DB:", err);
        }

        const integrationIds = integrationIdsStr.split(',').map((id: string) => id.trim()).filter(Boolean);

        if (!paymobSecret) {
           return res.status(400).json({
             success: false,
             error: "عذراً، يرجى ضبط مفتاح Paymob السري (PAYMOB_API_KEY أو Secret Key) في قاعدة البيانات لكي تعمل بوابة الدفع."
           });
        }

        if (integrationIds.length === 0) {
           return res.status(400).json({
             success: false,
             error: "عذراً، يجب تزويد معرف طريقة الدفع (Integration ID) الخاص بحسابك في Paymob داخل قاعدة البيانات أو إعدادات البيئة (PAYMOB_INTEGRATION_ID)."
           });
        }

        // NEXTGEN INTENTION API
        const intentBody: any = {
          amount: Number(amount) * 100, // In cents/piasters
          currency: "EGP",
          special_reference: orderId,
          payment_methods: integrationIds.map((id: string) => isNaN(Number(id)) ? id : Number(id)),
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

        const authHeader = paymobSecret.startsWith('egy_sk_') ? \`Secret \${paymobSecret}\` : \`Token \${paymobSecret}\`;

        const intentRes = await fetch('https://accept.paymob.com/v1/intention/', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
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
        
        console.error("Paymob Intention Failed Details:", intentData);
        let errorDetails = intentData.detail || (intentData.payment_methods ? "معرف طريقة الدفع (Integration ID) غير صحيح في Paymob." : intentData.message) || "فشل الاتصال بـ Paymob";
        return res.status(400).json({ success: false, error: \`فشل الدفع عبر Paymob: \${errorDetails}\` });
      }
    } catch (err: any) {
      console.error("Error creating payment order:", err);
      res.status(500).json({ error: err.message || "فشل إنشاء طلب الدفع." });
    }
  });

  `;

code = code.replace(oldPaymobBlock, newPaymobBlock);
fs.writeFileSync('server.ts', code);
