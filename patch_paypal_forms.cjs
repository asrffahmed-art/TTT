const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentForms.tsx', 'utf8');

code = code.replace(
  "onError={(err) => {",
  `onCancel={(data) => {
             onPaymentError('تم إلغاء عملية الدفع عبر PayPal');
          }}
          onError={(err) => {`
);

fs.writeFileSync('src/components/PaymentForms.tsx', code);
