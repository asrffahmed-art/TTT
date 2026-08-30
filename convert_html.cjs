const fs = require('fs');

const html = `
<main class="glass-card w-full max-w-[1200px] flex flex-col md:flex-row overflow-hidden relative">
<!-- BEGIN: Right Panel - Checkout Form (RTL means it's on the right visually) -->
<section class="w-full md:w-[60%] p-8 md:p-12 lg:p-16 flex flex-col h-full relative z-10 bg-black/30 md:border-l border-white/5">
<div class="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(230,57,70,0.5)]">
<span class="material-symbols-outlined text-white text-[24px]">psychiatry</span>
</div>
<span class="text-2xl font-bold text-white tracking-widest">THOTH<span class="text-primary">.</span></span>
</div>
<h1 class="text-xl lg:text-2xl font-bold text-white">تأكيد الاشتراك</h1>
</div>
<!-- Form Area -->
<div class="flex-1">
<!-- Payment Method Selection -->
<div class="mb-10">
<h3 class="text-sm font-semibold text-white/60 mb-5 uppercase tracking-wide">طريقة الدفع</h3>
<!-- Cards Grid -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
<!-- Active Card (Credit Card) -->
<div class="payment-method-card active">
<span class="material-symbols-outlined text-[32px] text-primary">credit_card</span>
<span class="font-semibold text-[11px] text-center text-white">بطاقة ائتمان</span>
</div>
<!-- Inactive Card (PayPal) -->
<div class="payment-method-card">
<svg class="w-8 h-8 fill-white/60" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.815 1.01 1.15 1.304 2.815.871 4.715a7.316 7.316 0 0 1-.87 2.233c-.318.53-.705 1.036-1.15 1.514-.922 1.002-2.14 1.708-3.561 2.067a9.499 9.499 0 0 1-2.4.296h-1.895c-.377 0-.706.27-.775.64l-1.7 10.02c-.066.388-.4.67-.792.67zM3.864 19.988h2.09c.148 0 .274-.11.3-.255l1.62-9.566c.09-.533.551-.925 1.092-.925h2.164c.264 0 .524-.017.778-.052a7.126 7.126 0 0 0 1.956-.54c.95-.41 1.76-.99 2.37-1.684.588-.667.986-1.487 1.162-2.392.126-.643.14-1.314.044-1.956-.123-.825-.436-1.492-.907-1.93-.655-.61-1.67-.932-3.003-.932H6.07c-.147 0-.272.108-.297.252l-2.9 19.68a.333.333 0 0 0 .329.388h.662z"></path><path d="M12.983 23.957h-3.48c-.288 0-.536-.212-.584-.496l-1.442-8.496c-.05-.296.178-.564.478-.564h2.247c1.782 0 3.398-.598 4.606-1.687a6.237 6.237 0 0 0 1.776-3.21l.36-1.854c.238-1.228.1-2.45-.403-3.567.89 1.106 1.154 2.59.78 4.23-.277 1.218-.813 2.302-1.572 3.19-.884 1.036-2.072 1.772-3.46 2.146-.628.169-1.286.257-1.958.257H8.502c-.225 0-.419.164-.462.386l-1.09 6.425c-.066.388-.4.67-.792.67h2.894c.377 0 .706-.27.775-.64l.87-5.116h1.233c1.728 0 3.257-.655 4.316-1.84.455-.51.83-1.076 1.116-1.688l-.515 2.65c-.328 1.686-1.4 3.033-2.923 3.676-.902.38-1.884.57-2.888.57H9.288l-.946 5.568c-.048.284.17.55.457.55h4.184z"></path></svg>
<span class="font-semibold text-[11px] text-center text-white/60">PayPal</span>
</div>
</div>
</div>
<!-- Card Details Form -->
<form class="space-y-6">
<!-- Card Number -->
<div>
<label class="block text-sm font-medium text-white/80 mb-2" for="cardNumber">رقم البطاقة</label>
<div class="relative">
<input class="input-ltr w-full pl-16 pr-4 py-4 text-base placeholder-white/30 font-mono tracking-widest focus:outline-none focus:ring-0" id="cardNumber" name="cardNumber" placeholder="0000 0000 0000 0000" type="text">
<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none gap-2"><svg class="h-5 w-auto" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 32H3V16h12.5v16z" fill="#FF5F00"></path><path d="M32.5 32H20V16h12.5v16z" fill="#EB001B"></path><path d="M45 32H32.5V16H45v16z" fill="#F79E1B"></path><path d="M32.5 24a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0z" fill="#FF5F00"></path></svg><svg class="h-4 w-auto" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M18.1 31.6l4.8-15.2h3.1l-4.8 15.2h-3.1zm16.4-14.9c-.6-.3-1.6-.6-2.7-.6-3 0-5.1 1.6-5.1 3.9 0 1.7 1.5 2.6 2.7 3.2 1.2.6 1.6 1 1.6 1.5 0 .8-1 1.1-1.9 1.1-1.3 0-2-.2-3.1-.7l-.4-.2-.5 2.8c.8.4 2.2.7 3.7.7 3.2 0 5.3-1.6 5.3-4.1 0-1.4-.8-2.4-2.6-3.3-1.1-.5-1.7-.9-1.7-1.4 0-.5.5-1 1.6-1 1 0 1.6.2 2.2.4l.3.1.5-2.4zm7.5-.3h-2.4c-.7 0-1.3.4-1.6 1l-5.6 13.4h3.3l.7-1.8h4l.4 1.8h2.9l-1.7-14.4zm-3.7 9.2l1.3-3.6.7 3.6h-2zm-25.4-9.2l-3.1 10.5-.3-1.6c-.5-1.8-2.1-3.7-3.9-4.7l2.5 11h3.3l5-15.2h-3.5z" fill="#fff"></path></svg></div>
</div>
</div>
<!-- Expiry & CVV Row -->
<div class="flex gap-6">
<div class="w-1/2">
<label class="block text-sm font-medium text-white/80 mb-2" for="expiry">تاريخ الانتهاء</label>
<input class="input-ltr w-full px-4 py-4 text-base placeholder-white/30 font-mono tracking-widest focus:outline-none focus:ring-0" id="expiry" name="expiry" placeholder="MM/YY" type="text">
</div>
<div class="w-1/2 relative">
<label class="block text-sm font-medium text-white/80 mb-2" for="cvv">رمز الأمان (CVV)</label>
<div class="relative">
<input class="input-ltr w-full pl-12 pr-4 py-4 text-base placeholder-white/30 font-mono tracking-widest focus:outline-none focus:ring-0" id="cvv" name="cvv" placeholder="123" type="password">
<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
<span class="material-symbols-outlined text-white/40 text-[20px]">help</span>
</div>
</div>
</div>
</div>
<!-- Cardholder Name -->
<div>
<label class="block text-sm font-medium text-white/80 mb-2" for="cardName">الاسم على البطاقة</label>
<input class="input-ltr w-full px-4 py-4 text-base placeholder-white/30 focus:outline-none focus:ring-0" id="cardName" name="cardName" placeholder="الاسم بالكامل كما يظهر على البطاقة" type="text">
</div>
<!-- Save Card Checkbox -->
<div class="flex items-center pt-4">
<div class="relative flex items-start">
<div class="flex items-center h-5">
<input class="h-5 w-5 text-primary focus:ring-primary focus:ring-offset-background bg-black/40 border-white/20 rounded" id="saveCard" name="saveCard" type="checkbox">
</div>
<div class="mr-3 text-sm">
<label class="font-medium text-white/80 cursor-pointer" for="saveCard">حفظ تفاصيل هذه البطاقة للمرات القادمة بأمان</label>
</div>
</div>
</div>
</form>
</div>
<!-- Submit Button -->
<div class="mt-12 flex gap-4">
<button class="w-1/3 flex justify-center items-center py-4 px-4 border border-white/10 rounded-xl text-base font-medium text-white bg-white/5 hover:bg-white/10 transition-colors duration-200" type="button">
    إلغاء
  </button>
<button class="btn-premium pulse-glow w-2/3 flex justify-center items-center gap-3 py-4 px-4 rounded-xl text-base font-bold text-white" type="button">
<span class="material-symbols-outlined text-[24px]">lock</span>
    تأكيد ودفع 200.00 ج.م
  </button>
</div>
<!-- Security Badges -->
<div class="mt-8 flex justify-center items-center gap-6 opacity-60">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-sm">verified_user</span>
<span class="text-xs">PCI DSS Secure</span>
</div>
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-sm">enhanced_encryption</span>
<span class="text-xs">256-bit SSL Encryption</span>
</div>
</div>
</section>
<!-- END: Right Panel - Checkout Form -->
<!-- BEGIN: Left Panel - Summary (RTL means it's on the left visually) -->
<section class="w-full md:w-[40%] p-8 md:p-12 lg:p-16 flex flex-col justify-between relative bg-gradient-to-b from-primary/[0.05] to-transparent">
<div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none opacity-50"></div>
<!-- Total Amount -->
<div class="relative z-10 flex-1 flex flex-col justify-center">
<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-8 w-fit">
<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
<span class="text-sm font-semibold text-primary tracking-wide">THOTH Pro</span>
</div>
<h2 class="text-white/60 text-base uppercase tracking-wider font-semibold mb-4">إجمالي المبلغ المستحق</h2>
<div class="flex items-baseline gap-2 mb-8">
<span class="text-6xl lg:text-7xl font-bold hero-amount">200.00</span>
<span class="text-2xl font-medium text-white/60">ج.م</span>
</div>
<div class="space-y-4">
<div class="flex items-center gap-3 text-sm text-white/80">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
<span class="">وصول غير محدود لجميع النماذج</span>
</div>
<div class="flex items-center gap-3 text-sm text-white/80">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
<span class="">أولوية في أوقات الذروة</span>
</div>
<div class="flex items-center gap-3 text-sm text-white/80">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
<span class="">دعم فني مخصص 24/7</span>
</div>
</div>
</div>
<!-- Footer Branding -->
<div class="relative z-10 flex flex-col gap-4 mt-16 md:mt-0 pt-8 border-t border-white/10">
<div class="flex items-center text-white/80 text-sm font-medium gap-2">
<span class="material-symbols-outlined text-primary text-[24px]">gpp_good</span>
<span class="">مدفوعات مشفرة وآمنة 100%</span>
</div>
<p class="text-xs text-white/50 leading-relaxed max-w-[280px]">
      نحن نستخدم أحدث تقنيات التشفير لضمان حماية بياناتك المالية ومعلوماتك الشخصية.
    </p>
</div>
</section>
<!-- END: Left Panel - Summary -->
</main>
`;

let reactHtml = html.replace(/class=/g, 'className=')
  .replace(/for=/g, 'htmlFor=')
  .replace(/<!--.*?-->/g, '')
  .replace(/<style.*?<\/style>/s, '')
  .replace(/fill-opacity/g, 'fillOpacity')
  .replace(/viewbox/g, 'viewBox')
  .replace(/stroke-width/g, 'strokeWidth')
  .replace(/stroke-linecap/g, 'strokeLinecap')
  .replace(/stroke-linejoin/g, 'strokeLinejoin');

fs.writeFileSync('converted.jsx', reactHtml, 'utf-8');
console.log("Converted to converted.jsx");
