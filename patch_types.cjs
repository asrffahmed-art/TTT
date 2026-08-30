const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentForms.tsx', 'utf8');
code = code.replace(
  'const StripeCheckoutForm = ({ amount, onPaymentSuccess, onPaymentError, clientSecret }) => {',
  'const StripeCheckoutForm = ({ amount, onPaymentSuccess, onPaymentError, clientSecret }: any) => {'
);
code = code.replace(
  'const handleSubmit = async (e) => {',
  'const handleSubmit = async (e: any) => {'
);
code = code.replace(
  'export const StripePaymentWrapper = ({ amount, onPaymentSuccess, onPaymentError, config }) => {',
  'export const StripePaymentWrapper = ({ amount, onPaymentSuccess, onPaymentError, config }: any) => {'
);
code = code.replace(
  'export const PayPalPaymentWrapper = ({ amount, planId, userId, onPaymentSuccess, onPaymentError, config }) => {',
  'export const PayPalPaymentWrapper = ({ amount, planId, userId, onPaymentSuccess, onPaymentError, config }: any) => {'
);
fs.writeFileSync('src/components/PaymentForms.tsx', code);
