const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Modify Paymob Flow
const paymobFlowStart = code.indexOf("// 2. PAYMOB FLOW");
const paymobFlowEnd = code.indexOf("const intentBody: any = {");

if (paymobFlowStart !== -1 && paymobFlowEnd !== -1) {
    const newPaymobFlow = `// 2. PAYMOB FLOW
      if (paymentMethod === 'paymob' || paymentMethod === 'card') {
        let paymobSecret = process.env.PAYMOB_API_KEY; // Could be secret key
        let integrationIdsStr = process.env.PAYMOB_INTEGRATION_ID || '';
        
        try {
          const apiKeysSnap = await getDoc(doc(dbWeb, "systemConfig", "apiKeys"));
          if (apiKeysSnap.exists()) {
             const data = apiKeysSnap.data();
             // Prefer secret key for Intention API
             if (data.paymobSecretKey) paymobSecret = data.paymobSecretKey;
             else if (data.paymobApiKey) paymobSecret = data.paymobApiKey;
             
             if (data.paymobIntegrationId) integrationIdsStr = data.paymobIntegrationId;
          }
        } catch(err) {
          console.error("Error fetching Paymob keys from DB:", err);
        }

        const integrationIds = integrationIdsStr.split(',').filter((id: string) => id.trim() !== '');

        if (!paymobSecret) {
           return res.status(400).json({
             success: false,
             error: "عذراً، يرجى ضبط مفاتيح Paymob (PAYMOB_API_KEY) في قاعدة البيانات أو إعدادات البيئة لكي تعمل بوابة الدفع."
           });
        }

        // NEXTGEN INTENTION API
        `;
    code = code.substring(0, paymobFlowStart) + newPaymobFlow + code.substring(paymobFlowEnd);
}

fs.writeFileSync('server.ts', code);
