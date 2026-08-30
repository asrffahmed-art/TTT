const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetPaymob = `        if (integrationIds.length === 0) {
           return res.json({
             success: true,
             orderId,
             paymentUrl: \`/api/payment/verify-success?orderId=\${orderId}&userId=\${userId}&planId=\${planId}\`,
             message: "تم إنشاء الدفع الوهمي (تنبيه: Integration ID الخاص بك مفقود)"
           });
        }`;

const replacementPaymob = `        if (integrationIds.length === 0) {
           return res.status(400).json({
             success: false,
             error: "عذراً، يرجى إضافة PAYMOB_INTEGRATION_IDS في إعدادات البيئة لكي تعمل بوابة الدفع."
           });
        }`;

const targetPaypal = `        if (!paypalClientId || !paypalSecret) {
           return res.json({
             success: true,
             orderId,
             paymentUrl: \`/api/payment/verify-success?orderId=\${orderId}&userId=\${userId}&planId=\${planId}\`,
             message: "تم إنشاء الدفع الوهمي (تنبيه: مفاتيح PayPal غير متوفرة في .env)"
           });
        }`;

const replacementPaypal = `        if (!paypalClientId || !paypalSecret) {
           return res.status(400).json({
             success: false,
             error: "عذراً، يرجى إضافة مفاتيح PayPal في إعدادات البيئة لكي تعمل بوابة الدفع."
           });
        }`;

code = code.replace(targetPaymob, replacementPaymob);
code = code.replace(targetPaypal, replacementPaypal);

fs.writeFileSync('server.ts', code);
console.log('removed fake fallbacks');
