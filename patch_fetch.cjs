const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentForms.tsx', 'utf8');

code = code.replace(
  "const res = await fetch(`/api/payment/paypal/capture?token=${data.orderID}&orderId=${data.orderID}&userId=${userId}&planId=${planId}`);",
  "const res = await fetch(`/api/payment/paypal/capture?token=${data.orderID}&orderId=${data.orderID}&userId=${userId}&planId=${planId}`, { headers: { 'Accept': 'application/json' } });"
);

fs.writeFileSync('src/components/PaymentForms.tsx', code);
