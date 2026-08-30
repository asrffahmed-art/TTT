<body className="bg-background text-on-background font-body-md min-h-screen pb-32">

<header className="fixed top-0 w-full z-50 bg-surface-lowest dark:bg-inverse-surface border-b border-outline-variant dark:border-outline shadow-sm flex items-center justify-between px-margin-mobile h-16 rtl">
<button aria-label="Go Back" className="text-primary dark:text-inverse-primary hover:bg-surface-container-low transition-colors active:opacity-70 rounded-full p-2">
<span className="material-symbols-outlined">arrow_forward</span>
</button>
<h1 className="font-headline-sm-mobile text-headline-sm-mobile font-bold text-on-surface dark:text-inverse-on-surface">الدفع الآمن</h1>
<div className="w-10"></div> 
</header>
<main className="pt-24 px-margin-mobile max-w-md mx-auto space-y-stack-gap">

<section className="bg-surface-container rounded-DEFAULT p-inline-gap">
<h2 className="font-headline-sm text-headline-sm mb-4">ملخص الطلب</h2>
<div className="flex justify-between items-center mb-2">
<span className="font-body-md text-body-md text-on-surface-variant">اشتراك الخطة الاحترافية</span>
<span className="font-body-md text-body-md">١٢٠ ر.س</span>
</div>
<hr className="border-outline-variant my-4"/>
<div className="flex justify-between items-center">
<span className="font-headline-sm text-headline-sm">المجموع</span>
<span className="font-headline-sm text-headline-sm text-primary">١٢٠ ر.س</span>
</div>
</section>

<section>
<h2 className="font-headline-sm text-headline-sm mb-4">طريقة الدفع</h2>
<div className="grid grid-cols-2 gap-4">
<label className="cursor-pointer relative">
<input checked className="peer sr-only" name="payment_method" type="radio"/>
<div className="bg-surface-container rounded-DEFAULT p-4 flex flex-col items-center justify-center gap-2 border border-outline-variant peer-checked:border-primary-container peer-checked:ring-2 peer-checked:ring-primary-container/50 transition-all">
<span className="material-symbols-outlined text-4xl text-primary-container">credit_card</span>
<span className="font-label-md text-label-md">بطاقة ائتمانية</span>
</div>
<div className="absolute top-2 right-2 hidden peer-checked:block text-primary-container">
<span className="material-symbols-outlined icon-fill">check_circle</span>
</div>
</label>
<label className="cursor-pointer relative">
<input className="peer sr-only" name="payment_method" type="radio"/>
<div className="bg-surface-container rounded-DEFAULT p-4 flex flex-col items-center justify-center gap-2 border border-outline-variant peer-checked:border-primary-container peer-checked:ring-2 peer-checked:ring-primary-container/50 transition-all">
<span className="material-symbols-outlined text-4xl text-on-surface-variant">account_balance_wallet</span>
<span className="font-label-md text-label-md">PayPal</span>
</div>
<div className="absolute top-2 right-2 hidden peer-checked:block text-primary-container">
<span className="material-symbols-outlined icon-fill">check_circle</span>
</div>
</label>
</div>
</section>

<section className="bg-surface-container rounded-DEFAULT p-inline-gap">
<h2 className="font-headline-sm text-headline-sm mb-4">بيانات البطاقة</h2>
<form className="space-y-4">
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-2">رقم البطاقة</label>
<div className="relative">
<input className="w-full bg-surface border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:outline-none placeholder-on-surface-variant/50 ltr text-left dir-ltr pl-12" dir="ltr" placeholder="0000 0000 0000 0000" type="text"/>
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">credit_score</span>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-2">تاريخ الانتهاء</label>
<input className="w-full bg-surface border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:outline-none placeholder-on-surface-variant/50 text-center" dir="ltr" placeholder="MM/YY" type="text"/>
</div>
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-2">رمز التحقق (CVV)</label>
<input className="w-full bg-surface border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:outline-none placeholder-on-surface-variant/50 text-center" dir="ltr" maxlength="4" placeholder="123" type="text"/>
</div>
</div>
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-2">اسم حامل البطاقة</label>
<input className="w-full bg-surface border border-outline-variant rounded-lg py-3 px-4 text-on-surface focus:outline-none placeholder-on-surface-variant/50" placeholder="الاسم كما هو على البطاقة" type="text"/>
</div>
</form>
</section>

<div className="flex items-center justify-center gap-2 text-on-surface-variant opacity-80 mt-8 mb-4">
<span className="material-symbols-outlined text-sm">verified_user</span>
<span className="font-label-sm text-label-sm">مدفوعات آمنة ومشفرة ١٠٠٪</span>
</div>
</main>

<nav className="fixed bottom-0 w-full z-50 bg-surface-lowest dark:bg-inverse-surface shadow-lg flex flex-row-reverse items-center justify-between gap-inline-gap px-margin-mobile py-4 max-w-container-max mx-auto rtl border-t border-outline-variant/20">

<button className="flex flex-row-reverse items-center justify-center bg-primary dark:bg-primary-container text-on-primary dark:text-on-primary-container rounded-lg px-6 py-3 w-full gap-2 hover:brightness-110 transition-all active:scale-95 duration-200">
<span className="material-symbols-outlined icon-fill">lock</span>
<span className="font-label-md text-label-md">إتمام الدفع - ١٢٠ ر.س</span>
</button>

<button className="flex items-center justify-center text-on-surface-variant dark:text-surface-dim px-4 py-2 hover:bg-surface-container-low rounded-lg transition-colors">
<span className="material-symbols-outlined mb-1 block md:hidden">close</span>
<span className="font-label-md text-label-md">إلغاء</span>
</button>
</nav>
</body>
