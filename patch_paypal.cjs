const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  'return res.json({ success: true, orderId, paymentUrl: approveLink.href, message: "تم تحويلك إلى PayPal" });',
  'return res.json({ success: true, orderId, paymentUrl: approveLink.href, paypalOrderId: orderResData.id, message: "تم تحويلك إلى PayPal" });'
);
fs.writeFileSync('server.ts', code);
