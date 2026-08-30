const fs = require('fs');
let code = fs.readFileSync('src/components/Subscription.tsx', 'utf8');

const handlers = `
  const handleDirectSuccess = (orderId: string) => {
    setPaymentSuccess(true);
    if (selectedPlanForPay) {
      localStorage.setItem('thoth_user_plan', selectedPlanForPay.id);
      window.dispatchEvent(new Event('thoth_plan_updated'));
      setTimeout(() => {
         window.location.href = '/?payment_status=success';
      }, 2000);
    }
  };
  const handleDirectError = (err: string) => {
    alert(err);
  };
`;

code = code.replace('const handleConfirmPayment = async () => {', handlers + '\n  const handleConfirmPayment = async () => {');

const buttonStr = `<button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={isProcessingPayment}
                      className={\`w-full py-4 rounded-xl \${theme.btnPrimary} font-black text-lg shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group\`}
                    >
                      {isProcessingPayment ? (
                        <div className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></span>
                          <span>جاري معالجة الدفع...</span>
                        </div>
                      ) : (
                        <>
                          <span>إتمام الشراء</span>
                        </>
                      )}
                    </button>`;

const newButtonStr = `
                    {paymentMethod === 'stripe' ? (
                      <StripePaymentWrapper 
                         amount={isAnnual ? selectedPlanForPay.priceEgp * 10 : selectedPlanForPay.priceEgp}
                         onPaymentSuccess={handleDirectSuccess}
                         onPaymentError={handleDirectError}
                         config={paymentConfig}
                      />
                    ) : paymentMethod === 'paypal' ? (
                      <PayPalPaymentWrapper
                         amount={isAnnual ? selectedPlanForPay.priceEgp * 10 : selectedPlanForPay.priceEgp}
                         planId={selectedPlanForPay.id}
                         userId={auth.currentUser ? auth.currentUser.uid : 'guest'}
                         onPaymentSuccess={handleDirectSuccess}
                         onPaymentError={handleDirectError}
                         config={paymentConfig}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirmPayment}
                        disabled={isProcessingPayment}
                        className={\`w-full py-4 rounded-xl \${theme.btnPrimary} font-black text-lg shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group\`}
                      >
                        {isProcessingPayment ? (
                          <div className="flex items-center gap-2">
                            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></span>
                            <span>جاري معالجة الدفع...</span>
                          </div>
                        ) : (
                          <>
                            <span>إتمام الشراء (Paymob)</span>
                          </>
                        )}
                      </button>
                    )}
`;

code = code.replace(buttonStr, newButtonStr);
fs.writeFileSync('src/components/Subscription.tsx', code);
