const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const paypalErr = `        if (orderResData.id) {
           const approveLink = orderResData.links.find((l: any) => l.rel === 'approve');
           if (approveLink) {
             return res.json({ success: true, orderId, paymentUrl: approveLink.href, paypalOrderId: orderResData.id, message: "تم تحويلك إلى PayPal" });
           }
        }
        console.log("PayPal Order Response:", orderResData);
        throw new Error('PayPal Order Creation Failed');`;

const paypalErrFix = `        if (orderResData.id) {
           const approveLink = orderResData.links.find((l: any) => l.rel === 'approve');
           if (approveLink) {
             return res.json({ success: true, orderId, paymentUrl: approveLink.href, paypalOrderId: orderResData.id, message: "تم تحويلك إلى PayPal" });
           }
        }
        console.error("PayPal Order Response Error:", orderResData);
        throw new Error(\`PayPal Order Creation Failed: \${orderResData.details ? orderResData.details[0]?.issue : orderResData.message || ''}\`);`;

code = code.replace(paypalErr, paypalErrFix);
fs.writeFileSync('server.ts', code);
