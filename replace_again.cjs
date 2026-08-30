const fs = require('fs');
const content = fs.readFileSync('src/components/Subscription.tsx', 'utf-8');

const startTag = '      {/* Payment Checkout Modal */}\n      {selectedPlanForPay && (';
const endTag = '      )}\n    </div>\n  );\n}';

const startIndex = content.indexOf(startTag);
const endIndex = content.lastIndexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find tags.");
    process.exit(1);
}

const replacement = `      {/* Payment Checkout Modal */}
      {selectedPlanForPay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a] overflow-y-auto p-4 sm:p-8 font-['Be_Vietnam_Pro'] text-[#e5e2e1]" dir="rtl">
          {/* Background Effects */}
          <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
          <div className="fixed -top-[10%] -right-[5%] w-[600px] h-[600px] rounded-full pointer-events-none blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(230, 57, 70, 0.12) 0%, rgba(0,0,0,0) 70%)' }}></div>
          <div className="fixed -bottom-[20%] -left-[10%] w-[700px] h-[700px] rounded-full pointer-events-none blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(230, 57, 70, 0.08) 0%, rgba(0,0,0,0) 70%)' }}></div>
          
          <main className="w-full max-w-[1200px] flex flex-col md:flex-row overflow-hidden relative z-10 animate-in fade-in zoom-in-95 my-auto shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(230,57,70,0.03)] rounded-3xl" style={{ background: 'rgba(15, 15, 15, 0.6)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            
            {/* Right Panel - Checkout Form */}
            <section className="w-full md:w-[60%] p-8 md:p-12 lg:p-16 flex flex-col relative z-10 bg-black/30 md:border-l border-white/5">
              <button 
                onClick={() => {
                  setSelectedPlanForPay(null);
                  setIsProcessingPayment(false);
                }}
                className="absolute top-6 left-6 z-50 p-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e63946] flex items-center justify-center shadow-[0_0_15px_rgba(230,57,70,0.5)]">
                    <span className="material-symbols-outlined text-white text-[24px]" style={{ fontFamily: 'Material Symbols Outlined' }}>psychiatry</span>
                  </div>
                  <span className="text-2xl font-bold text-white tracking-widest">THOTH<span className="text-[#e63946]">.</span></span>
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-white pr-4">تأكيد الاشتراك</h1>
              </div>

              {/* Form Area */}
              <div className="flex-1">
                <div className="mb-10">
                  <h3 className="text-sm font-semibold text-white/60 mb-5 uppercase tracking-wide">طريقة الدفع</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Active Card (Credit Card) */}
                    <div 
                      onClick={() => setPaymentMethod('paymob')}
                      className={\`payment-method-card flex flex-col items-center justify-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 border \${
                        paymentMethod === 'paymob' || paymentMethod === 'card' 
                          ? 'border-[#e63946] shadow-[0_0_20px_rgba(230,57,70,0.15)]' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:-translate-y-1'
                      }\`}
                      style={paymentMethod === 'paymob' || paymentMethod === 'card' ? { background: 'linear-gradient(145deg, rgba(230, 57, 70, 0.1) 0%, rgba(230, 57, 70, 0.02) 100%)' } : {}}
                    >
                      <span className="material-symbols-outlined text-[32px]" style={{ color: paymentMethod === 'paymob' || paymentMethod === 'card' ? '#e63946' : 'rgba(255,255,255,0.6)', fontFamily: 'Material Symbols Outlined' }}>credit_card</span>
                      <span className={\`font-semibold text-[11px] text-center \${paymentMethod === 'paymob' || paymentMethod === 'card' ? 'text-white' : 'text-white/60'}\`}>بطاقة ائتمان</span>
                    </div>

                    {/* PayPal */}
                    <div 
                      onClick={() => setPaymentMethod('paypal')}
                      className={\`payment-method-card flex flex-col items-center justify-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 border \${
                        paymentMethod === 'paypal' 
                          ? 'border-[#e63946] shadow-[0_0_20px_rgba(230,57,70,0.15)]' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:-translate-y-1'
                      }\`}
                      style={paymentMethod === 'paypal' ? { background: 'linear-gradient(145deg, rgba(230, 57, 70, 0.1) 0%, rgba(230, 57, 70, 0.02) 100%)' } : {}}
                    >
                      <svg className={\`w-8 h-8 \${paymentMethod === 'paypal' ? 'fill-white' : 'fill-white/60'}\`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.815 1.01 1.15 1.304 2.815.871 4.715a7.316 7.316 0 0 1-.87 2.233c-.318.53-.705 1.036-1.15 1.514-.922 1.002-2.14 1.708-3.561 2.067a9.499 9.499 0 0 1-2.4.296h-1.895c-.377 0-.706.27-.775.64l-1.7 10.02c-.066.388-.4.67-.792.67zM3.864 19.988h2.09c.148 0 .274-.11.3-.255l1.62-9.566c.09-.533.551-.925 1.092-.925h2.164c.264 0 .524-.017.778-.052a7.126 7.126 0 0 0 1.956-.54c.95-.41 1.76-.99 2.37-1.684.588-.667.986-1.487 1.162-2.392.126-.643.14-1.314.044-1.956-.123-.825-.436-1.492-.907-1.93-.655-.61-1.67-.932-3.003-.932H6.07c-.147 0-.272.108-.297.252l-2.9 19.68a.333.333 0 0 0 .329.388h.662z"></path>
                        <path d="M12.983 23.957h-3.48c-.288 0-.536-.212-.584-.496l-1.442-8.496c-.05-.296.178-.564.478-.564h2.247c1.782 0 3.398-.598 4.606-1.687a6.237 6.237 0 0 0 1.776-3.21l.36-1.854c.238-1.228.1-2.45-.403-3.567.89 1.106 1.154 2.59.78 4.23-.277 1.218-.813 2.302-1.572 3.19-.884 1.036-2.072 1.772-3.46 2.146-.628.169-1.286.257-1.958.257H8.502c-.225 0-.419.164-.462.386l-1.09 6.425c-.066.388-.4.67-.792.67h2.894c.377 0 .706-.27.775-.64l.87-5.116h1.233c1.728 0 3.257-.655 4.316-1.84.455-.51.83-1.076 1.116-1.688l-.515 2.65c-.328 1.686-1.4 3.033-2.923 3.676-.902.38-1.884.57-2.888.57H9.288l-.946 5.568c-.048.284.17.55.457.55h4.184z"></path>
                      </svg>
                      <span className={\`font-semibold text-[11px] text-center \${paymentMethod === 'paypal' ? 'text-white' : 'text-white/60'}\`}>PayPal</span>
                    </div>
                  </div>
                </div>

                {/* Card Details Form - Integrated Paymob or PayPal */}
                <div className="w-full">
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
                    <div className="w-full py-8">
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
                    <div className="w-full py-8">
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

              {/* Submit Button */}
              {(!paymentMethod || paymentMethod === 'paymob' || paymentMethod === 'card') && (
                <div className="mt-8 flex gap-4 w-full">
                  <button 
                    onClick={() => {
                      setSelectedPlanForPay(null);
                      setIsProcessingPayment(false);
                    }}
                    className="w-1/3 flex justify-center items-center py-4 px-4 border border-white/10 rounded-xl text-base font-medium text-white bg-white/5 hover:bg-white/10 transition-colors duration-200" type="button"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={() => {
                      if (paymentMethod === 'paymob' || paymentMethod === 'card') {
                        window.dispatchEvent(new Event('payFromOutside'));
                      } else {
                        handleConfirmPayment();
                      }
                    }}
                    className="w-2/3 flex justify-center items-center gap-3 py-4 px-4 rounded-xl text-base font-bold text-white transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden" 
                    type="button"
                    style={{ background: 'linear-gradient(135deg, #e63946 0%, #ff535b 100%)', boxShadow: '0 10px 25px -5px rgba(230, 57, 70, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                  >
                    <style>
                      {\`
                        @keyframes pulseGlowBtn {
                          0% { box-shadow: 0 0 0 0 rgba(230, 57, 70, 0.4); }
                          70% { box-shadow: 0 0 0 10px rgba(230, 57, 70, 0); }
                          100% { box-shadow: 0 0 0 0 rgba(230, 57, 70, 0); }
                        }
                      \`}
                    </style>
                    <div className="absolute inset-0 rounded-xl" style={{ animation: 'pulseGlowBtn 2s infinite' }}></div>
                    <span className="material-symbols-outlined text-[24px] relative z-10" style={{ fontFamily: 'Material Symbols Outlined' }}>lock</span>
                    <span className="relative z-10">تأكيد ودفع {formatPriceShort(selectedPlanForPay)}</span>
                  </button>
                </div>
              )}

              {/* Security Badges */}
              <div className="mt-8 flex justify-center items-center gap-6 opacity-60">
                <div className="flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-sm" style={{ fontFamily: 'Material Symbols Outlined' }}>verified_user</span>
                  <span className="text-xs font-sans">PCI DSS Secure</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-sm" style={{ fontFamily: 'Material Symbols Outlined' }}>enhanced_encryption</span>
                  <span className="text-xs font-sans">256-bit SSL Encryption</span>
                </div>
              </div>
            </section>

            {/* Left Panel - Summary (RTL means it's on the left visually) */}
            <section className="w-full md:w-[40%] p-8 md:p-12 lg:p-16 flex flex-col justify-between relative hidden md:flex" style={{ background: 'linear-gradient(to bottom, rgba(230,57,70,0.05), transparent)' }}>
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-50" style={{ background: 'radial-gradient(ellipse at top left, rgba(230,57,70,0.15), transparent, transparent)' }}></div>

              {/* Total Amount */}
              <div className="relative z-10 flex-1 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#e63946]/20 bg-[#e63946]/10 backdrop-blur-sm mb-8 w-fit">
                  <span className="w-2 h-2 rounded-full bg-[#e63946] animate-pulse"></span>
                  <span className="text-sm font-semibold text-[#e63946] tracking-wide">THOTH Pro</span>
                </div>
                
                <h2 className="text-white/60 text-base uppercase tracking-wider font-semibold mb-4">إجمالي المبلغ المستحق</h2>
                
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-6xl lg:text-7xl font-bold font-sans tracking-tight" style={{ background: 'linear-gradient(to right, #fff, #a58a8a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {isAnnual ? selectedPlanForPay.priceEgp * 10 : selectedPlanForPay.priceEgp}
                  </span>
                  <span className="text-2xl font-medium text-white/60">ج.م</span>
                </div>
                
                <div className="space-y-4">
                  {(selectedPlanForPay.features || ['وصول غير محدود لجميع النماذج', 'أولوية في أوقات الذروة', 'دعم فني مخصص 24/7']).slice(0, 4).map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-white/80">
                      <span className="material-symbols-outlined text-[#e63946] text-sm" style={{ fontFamily: 'Material Symbols Outlined' }}>check_circle</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Branding */}
              <div className="relative z-10 flex flex-col gap-4 mt-16 pt-8 border-t border-white/10">
                <div className="flex items-center text-white/80 text-sm font-medium gap-2">
                  <span className="material-symbols-outlined text-[#e63946] text-[24px]" style={{ fontFamily: 'Material Symbols Outlined' }}>gpp_good</span>
                  <span>مدفوعات مشفرة وآمنة 100%</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed max-w-[280px]">
                  نحن نستخدم أحدث تقنيات التشفير لضمان حماية بياناتك المالية ومعلوماتك الشخصية.
                </p>
              </div>
            </section>
          </main>
        </div>
`;

const newContent = content.substring(0, startIndex) + replacement + '\n      )}\n    </div>\n  );\n}';
fs.writeFileSync('src/components/Subscription.tsx', newContent, 'utf-8');
console.log('Successfully replaced checkout modal to match exact design');
