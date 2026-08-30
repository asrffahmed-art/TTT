const fs = require('fs');

let code = fs.readFileSync('src/components/Subscription.tsx', 'utf8');

const startTag = '{/* Payment Checkout Modal (Material You Style) */}';
const endTag = '    </div>\n  );\n};';

const startIdx = code.indexOf(startTag);
const endIdx = code.indexOf(endTag, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `{/* THOTH Premium Checkout Modal */}
      {selectedPlanForPay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 rtl animate-in fade-in duration-300">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => {
              setSelectedPlanForPay(null);
              setIsProcessingPayment(false);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            
            {/* Header */}
            <div className="shrink-0 px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e63946]/10 flex items-center justify-center border border-[#e63946]/20">
                  <span className="material-symbols-outlined text-[#e63946]">lock</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">إتمام الدفع الآمن</h2>
                  <p className="text-sm text-white/50">باقة {selectedPlanForPay.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedPlanForPay(null);
                  setIsProcessingPayment(false);
                }}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar">
              
              {/* Order Summary Card */}
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-white/60 text-sm font-medium mb-1">المبلغ المطلوب</h3>
                    <div className="text-3xl font-bold text-white">
                      {formatPriceShort(selectedPlanForPay)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-[#e63946]/10 text-[#e63946] px-2.5 py-1 rounded-full border border-[#e63946]/20">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      تجديد {isAnnual ? 'سنوي' : 'شهري'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-white/40">account_balance_wallet</span>
                  طريقة الدفع
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Credit Card Option */}
                  <label className="cursor-pointer relative group h-full block">
                    <input 
                      checked={paymentMethod === 'paymob' || paymentMethod === 'card'} 
                      onChange={() => setPaymentMethod('paymob')}
                      className="peer sr-only" 
                      name="payment_method" 
                      type="radio" 
                    />
                    <div className="h-full bg-white/5 rounded-2xl p-5 flex items-center gap-4 border border-white/5 hover:border-white/20 hover:bg-white/10 peer-checked:border-[#e63946] peer-checked:bg-gradient-to-l peer-checked:from-[#e63946]/10 peer-checked:to-transparent transition-all duration-300">
                      <div className={\`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 \${paymentMethod === 'paymob' || paymentMethod === 'card' ? 'bg-[#e63946] text-white shadow-[0_0_15px_rgba(230,57,70,0.4)]' : 'bg-white/10 text-white/50'}\`}>
                        <span className="material-symbols-outlined text-2xl">credit_card</span>
                      </div>
                      <div className="flex-1">
                        <span className={\`block font-bold transition-colors duration-300 \${paymentMethod === 'paymob' || paymentMethod === 'card' ? 'text-white' : 'text-white/60'}\`}>بطاقة بنكية</span>
                        <span className="block text-xs text-white/40 mt-0.5">فيزا، ماستركارد، ميزة</span>
                      </div>
                      <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-300 \${paymentMethod === 'paymob' || paymentMethod === 'card' ? 'border-[#e63946]' : 'border-white/20'}\`}>
                        <div className={\`w-2.5 h-2.5 rounded-full bg-[#e63946] transition-transform duration-300 \${paymentMethod === 'paymob' || paymentMethod === 'card' ? 'scale-100' : 'scale-0'}\`} />
                      </div>
                    </div>
                  </label>
                  
                  {/* PayPal Option */}
                  <label className="cursor-pointer relative group h-full block">
                    <input 
                      checked={paymentMethod === 'paypal'} 
                      onChange={() => setPaymentMethod('paypal')}
                      className="peer sr-only" 
                      name="payment_method" 
                      type="radio" 
                    />
                    <div className="h-full bg-white/5 rounded-2xl p-5 flex items-center gap-4 border border-white/5 hover:border-white/20 hover:bg-white/10 peer-checked:border-[#e63946] peer-checked:bg-gradient-to-l peer-checked:from-[#e63946]/10 peer-checked:to-transparent transition-all duration-300">
                      <div className={\`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 \${paymentMethod === 'paypal' ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-white/10'}\`}>
                        <svg className={\`h-6 w-auto transition-colors \${paymentMethod === 'paypal' ? 'text-[#003087]' : 'text-white/50'}\`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                           <path fill="currentColor" d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.815 1.01 1.15 1.304 2.815.871 4.715a7.316 7.316 0 0 1-.87 2.233c-.318.53-.705 1.036-1.15 1.514-.922 1.002-2.14 1.708-3.561 2.067a9.499 9.499 0 0 1-2.4.296h-1.895c-.377 0-.706.27-.775.64l-1.7 10.02c-.066.388-.4.67-.792.67zM3.864 19.988h2.09c.148 0 .274-.11.3-.255l1.62-9.566c.09-.533.551-.925 1.092-.925h2.164c.264 0 .524-.017.778-.052a7.126 7.126 0 0 0 1.956-.54c.95-.41 1.76-.99 2.37-1.684.588-.667.986-1.487 1.162-2.392.126-.643.14-1.314.044-1.956-.123-.825-.436-1.492-.907-1.93-.655-.61-1.67-.932-3.003-.932H6.07c-.147 0-.272.108-.297.252l-2.9 19.68a.333.333 0 0 0 .329.388h.662z"/>
                           <path fill={paymentMethod === 'paypal' ? "#0079C1" : "currentColor"} d="M12.983 23.957h-3.48c-.288 0-.536-.212-.584-.496l-1.442-8.496c-.05-.296.178-.564.478-.564h2.247c1.782 0 3.398-.598 4.606-1.687a6.237 6.237 0 0 0 1.776-3.21l.36-1.854c.238-1.228.1-2.45-.403-3.567.89 1.106 1.154 2.59.78 4.23-.277 1.218-.813 2.302-1.572 3.19-.884 1.036-2.072 1.772-3.46 2.146-.628.169-1.286.257-1.958.257H8.502c-.225 0-.419.164-.462.386l-1.09 6.425c-.066.388-.4.67-.792.67h2.894c.377 0 .706-.27.775-.64l.87-5.116h1.233c1.728 0 3.257-.655 4.316-1.84.455-.51.83-1.076 1.116-1.688l-.515 2.65c-.328 1.686-1.4 3.033-2.923 3.676-.902.38-1.884.57-2.888.57H9.288l-.946 5.568c-.048.284.17.55.457.55h4.184z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <span className={\`block font-bold transition-colors duration-300 \${paymentMethod === 'paypal' ? 'text-white' : 'text-white/60'}\`}>PayPal</span>
                        <span className="block text-xs text-white/40 mt-0.5">حسابات وبطاقات دولية</span>
                      </div>
                      <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-300 \${paymentMethod === 'paypal' ? 'border-[#e63946]' : 'border-white/20'}\`}>
                        <div className={\`w-2.5 h-2.5 rounded-full bg-[#e63946] transition-transform duration-300 \${paymentMethod === 'paypal' ? 'scale-100' : 'scale-0'}\`} />
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Dynamic Payment Details Section */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#141414] border border-white/5 rounded-2xl p-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  
                  {(paymentMethod === 'paymob' || paymentMethod === 'card') && (
                    <div className="w-full min-h-[300px]">
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
                    <div className="w-full p-4 sm:p-6">
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
                    <div className="w-full p-4 sm:p-6">
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
              
              <div className="flex items-center justify-center gap-2 text-white/40 pb-2">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span className="text-xs">بياناتك مشفرة ومحمية بالكامل</span>
              </div>
            </div>

            {/* Footer Action */}
            {(!paymentMethod || paymentMethod === 'paymob' || paymentMethod === 'card') && (
              <div className="shrink-0 p-4 sm:p-6 border-t border-white/10 bg-white/5">
                <button 
                  onClick={() => {
                    window.dispatchEvent(new Event('payFromOutside'));
                  }}
                  className="relative w-full overflow-hidden group rounded-xl text-white font-bold h-14 flex items-center justify-center gap-2 transition-all active:scale-[0.98]" 
                  style={{ background: 'linear-gradient(135deg, #e63946 0%, #ff535b 100%)', boxShadow: '0 8px 25px -5px rgba(230, 57, 70, 0.4)' }}
                >
                  <div className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative z-10 material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
                  <span className="relative z-10 text-lg">تأكيد ودفع {formatPriceShort(selectedPlanForPay)}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
\n    </div>\n  );\n};`;

  code = code.substring(0, startIdx) + replacement;
  fs.writeFileSync('src/components/Subscription.tsx', code);
  console.log('Successfully replaced checkout modal');
} else {
  console.log('Could not find start/end tags');
}
