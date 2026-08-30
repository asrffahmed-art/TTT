const fs = require('fs');

let code = fs.readFileSync('src/components/Subscription.tsx', 'utf8');

const startTag = '{/* THOTH Premium Checkout Modal */}';
const endTag = '    </div>\n  );\n};';

const startIdx = code.indexOf(startTag);
const endIdx = code.indexOf(endTag, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `{/* Clean Minimal Checkout Modal */}
      {selectedPlanForPay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 rtl animate-in fade-in duration-200">
          {/* Solid Backdrop */}
          <div 
            className="absolute inset-0 bg-black/90"
            onClick={() => {
              setSelectedPlanForPay(null);
              setIsProcessingPayment(false);
            }}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-[520px] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <h2 className="text-xl font-medium text-white tracking-tight">إتمام الدفع</h2>
                <p className="text-sm text-white/50 mt-1">الاشتراك في باقة {selectedPlanForPay.name}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedPlanForPay(null);
                  setIsProcessingPayment(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              
              {/* Order Amount */}
              <div className="flex items-end justify-between mb-8">
                <span className="text-white/60 font-medium">المبلغ الإجمالي</span>
                <div className="text-right">
                  <span className="text-3xl font-semibold text-white tracking-tight">
                    {formatPriceShort(selectedPlanForPay)}
                  </span>
                  <span className="block text-sm text-white/40 mt-1">
                    يُجدد {isAnnual ? 'سنوياً' : 'شهرياً'}
                  </span>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-3">
                  {/* Card Option */}
                  <label className="cursor-pointer">
                    <input 
                      checked={paymentMethod === 'paymob' || paymentMethod === 'card'} 
                      onChange={() => setPaymentMethod('paymob')}
                      className="peer sr-only" 
                      name="payment_method" 
                      type="radio" 
                    />
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-transparent peer-checked:border-[#e63946] peer-checked:bg-[#e63946]/5 hover:bg-white/5 transition-colors h-full gap-2">
                      <span className={\`material-symbols-outlined text-[28px] \${paymentMethod === 'paymob' || paymentMethod === 'card' ? 'text-[#e63946]' : 'text-white/50'}\`}>credit_card</span>
                      <span className={\`text-sm font-medium \${paymentMethod === 'paymob' || paymentMethod === 'card' ? 'text-white' : 'text-white/60'}\`}>بطاقة بنكية</span>
                    </div>
                  </label>
                  
                  {/* PayPal Option */}
                  <label className="cursor-pointer">
                    <input 
                      checked={paymentMethod === 'paypal'} 
                      onChange={() => setPaymentMethod('paypal')}
                      className="peer sr-only" 
                      name="payment_method" 
                      type="radio" 
                    />
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-transparent peer-checked:border-[#e63946] peer-checked:bg-[#e63946]/5 hover:bg-white/5 transition-colors h-full gap-2">
                      <svg className={\`h-7 w-auto \${paymentMethod === 'paypal' ? 'text-white' : 'text-white/50'}\`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.815 1.01 1.15 1.304 2.815.871 4.715a7.316 7.316 0 0 1-.87 2.233c-.318.53-.705 1.036-1.15 1.514-.922 1.002-2.14 1.708-3.561 2.067a9.499 9.499 0 0 1-2.4.296h-1.895c-.377 0-.706.27-.775.64l-1.7 10.02c-.066.388-.4.67-.792.67zM3.864 19.988h2.09c.148 0 .274-.11.3-.255l1.62-9.566c.09-.533.551-.925 1.092-.925h2.164c.264 0 .524-.017.778-.052a7.126 7.126 0 0 0 1.956-.54c.95-.41 1.76-.99 2.37-1.684.588-.667.986-1.487 1.162-2.392.126-.643.14-1.314.044-1.956-.123-.825-.436-1.492-.907-1.93-.655-.61-1.67-.932-3.003-.932H6.07c-.147 0-.272.108-.297.252l-2.9 19.68a.333.333 0 0 0 .329.388h.662z"/>
                        <path fill="currentColor" d="M12.983 23.957h-3.48c-.288 0-.536-.212-.584-.496l-1.442-8.496c-.05-.296.178-.564.478-.564h2.247c1.782 0 3.398-.598 4.606-1.687a6.237 6.237 0 0 0 1.776-3.21l.36-1.854c.238-1.228.1-2.45-.403-3.567.89 1.106 1.154 2.59.78 4.23-.277 1.218-.813 2.302-1.572 3.19-.884 1.036-2.072 1.772-3.46 2.146-.628.169-1.286.257-1.958.257H8.502c-.225 0-.419.164-.462.386l-1.09 6.425c-.066.388-.4.67-.792.67h2.894c.377 0 .706-.27.775-.64l.87-5.116h1.233c1.728 0 3.257-.655 4.316-1.84.455-.51.83-1.076 1.116-1.688l-.515 2.65c-.328 1.686-1.4 3.033-2.923 3.676-.902.38-1.884.57-2.888.57H9.288l-.946 5.568c-.048.284.17.55.457.55h4.184z"/>
                      </svg>
                      <span className={\`text-sm font-medium \${paymentMethod === 'paypal' ? 'text-white' : 'text-white/60'}\`}>PayPal</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Dynamic Payment Integration Form */}
              <div className="min-h-[200px]">
                {(paymentMethod === 'paymob' || paymentMethod === 'card') && (
                  <div className="w-full">
                    <PaymobInlineWrapper 
                      plan={selectedPlanForPay}
                      isAnnual={isAnnual}
                      email={auth.currentUser?.email || localStorage.getItem('app-user-email') || 'user@thoth.ai'}
                      userId={auth.currentUser ? auth.currentUser.uid : 'guest'}
                      name={auth.currentUser?.displayName || 'مستخدم THOTH'}
                      onSuccess={() => {
                        setSelectedPlanForPay(null);
                        handleDirectSuccess('paymob');
                      }}
                    />
                  </div>
                )}
                {paymentMethod === 'paypal' && (
                  <div className="w-full mt-2">
                    <PayPalPaymentWrapper
                        amount={isAnnual ? selectedPlanForPay.priceEgp * 10 : selectedPlanForPay.priceEgp}
                        planId={selectedPlanForPay.id}
                        userId={auth.currentUser ? auth.currentUser.uid : 'guest'}
                        onPaymentSuccess={handleDirectSuccess}
                        onPaymentError={handleDirectError}
                        config={paymentConfig}
                    />
                  </div>
                )}
                {paymentMethod === 'stripe' && (
                  <div className="w-full mt-2">
                    <StripePaymentWrapper
                        amount={isAnnual ? selectedPlanForPay.priceEgp * 10 : selectedPlanForPay.priceEgp}
                        onPaymentSuccess={handleDirectSuccess}
                        onPaymentError={handleDirectError}
                        config={paymentConfig}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action */}
            {(!paymentMethod || paymentMethod === 'paymob' || paymentMethod === 'card') && (
              <div className="p-6 pt-2">
                <button 
                  onClick={() => {
                    window.dispatchEvent(new Event('payFromOutside'));
                  }}
                  className="w-full bg-[#e63946] hover:bg-[#d63341] text-white font-medium text-[15px] h-12 rounded-xl flex items-center justify-center gap-2 transition-colors" 
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>دفع {formatPriceShort(selectedPlanForPay)}</span>
                </button>
                <div className="flex justify-center mt-4">
                  <span className="text-xs text-white/40 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">shield</span>
                    مدفوعات آمنة ومشفرة بالكامل
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
\n    </div>\n  );\n};`;

  code = code.substring(0, startIdx) + replacement;
  fs.writeFileSync('src/components/Subscription.tsx', code);
  console.log('Successfully applied minimal flat redesign');
} else {
  console.log('Could not find start/end tags');
}
