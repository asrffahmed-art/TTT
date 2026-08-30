import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { CheckCircle2, XCircle } from 'lucide-react';

const StripeCheckoutForm = ({ amount, onPaymentSuccess, onPaymentError, clientSecret }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      onPaymentError(error.message);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onPaymentSuccess(paymentIntent.id);
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <PaymentElement />
      </div>
      <button
        disabled={isProcessing || !stripe || !elements}
        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 transition-colors shadow-lg"
      >
        {isProcessing ? 'جاري المعالجة...' : 'دفع عبر Stripe'}
      </button>
    </form>
  );
};

export const StripePaymentWrapper = ({ amount, onPaymentSuccess, onPaymentError, config }: any) => {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'USD' }),
    })
      .then(async (r) => {
        const contentType = r.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return r.json().catch(() => ({ error: 'استجابة غير صالحة من السيرفر' }));
        }
        return { error: 'تعذر الاتصال بخدمة الدفع' };
      })
      .then((data) => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else onPaymentError(data.error || 'Failed to initialize Stripe');
      })
      .catch((err) => onPaymentError(err.message || 'حدث خطأ أثناء الاتصال'));
  }, [amount]);

  if (!config?.stripePublicKey) {
    return <div className="text-red-400 text-sm">مفتاح Stripe غير متوفر في الإعدادات.</div>;
  }

  if (!clientSecret) {
    return <div className="text-white/50 text-sm">جاري تهيئة الدفع...</div>;
  }

  const stripePromise = loadStripe(config.stripePublicKey);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
      <StripeCheckoutForm 
        amount={amount} 
        onPaymentSuccess={onPaymentSuccess} 
        onPaymentError={onPaymentError} 
        clientSecret={clientSecret} 
      />
    </Elements>
  );
};

export const PayPalPaymentWrapper = ({ amount, planId, userId, onPaymentSuccess, onPaymentError, config }: any) => {
  const isConfigured = Boolean(config?.paypalClientId && config?.hasPaypalSecret);

  if (!isConfigured) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold text-center leading-relaxed flex flex-col items-center gap-2">
        <span className="text-sm font-black">⚠️ بوابة PayPal غير مفعلة بالكامل</span>
        <span className="text-white/80">يرجى إضافة <b>Client ID</b> و <b>Client Secret</b> وتفعيل الوضع في <b>لوحة تحكم الأدمن</b> للبدء بقبول مدفوعات PayPal.</span>
      </div>
    );
  }

  return (
    <div className="w-full relative z-10 p-1">
      <PayPalScriptProvider options={{ clientId: config.paypalClientId, currency: "USD" }}>
        <PayPalButtons
          style={{ layout: "vertical", shape: "rect", color: "gold" }}
          createOrder={async () => {
             try {
               const res = await fetch('/api/payment/create-order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: userId || 'guest',
                    planId: planId || 'pro',
                    amount: amount || 99,
                    paymentMethod: 'paypal'
                  })
               });
               const data = await res.json().catch(() => ({ error: 'استجابة غير متوقعة من السيرفر.' }));
               if (res.ok && data.paypalOrderId) {
                 return data.paypalOrderId;
               }
               const errorMsg = data.error || 'تعذر إنشاء طلب الدفع عبر PayPal. يرجى التأكد من إعدادات PayPal في لوحة الأدمن.';
               if (onPaymentError) onPaymentError(errorMsg);
               throw new Error(errorMsg);
             } catch (err: any) {
               console.error("PayPal Order Creation Error:", err.message || err);
               throw err;
             }
          }}
          onApprove={async (data) => {
             try {
               const res = await fetch(`/api/payment/paypal/capture?token=${data.orderID}&orderId=${data.orderID}&userId=${userId}&planId=${planId}`, { headers: { 'Accept': 'application/json' } });
               const resData = await res.json().catch(() => ({}));
               if (res.ok && resData.success !== false) {
                   onPaymentSuccess(data.orderID);
               } else {
                   const msg = resData.error || 'فشل تأكيد عملية الدفع عبر PayPal.';
                   if (onPaymentError) onPaymentError(msg);
               }
             } catch(e: any) {
               if (onPaymentError) onPaymentError('خطأ أثناء تأكيد الدفع عبر PayPal.');
             }
          }}
          onCancel={() => {
             console.log('PayPal payment cancelled by user');
          }}
          onError={(err: any) => {
             console.error("PayPal SDK Error:", err);
             if (onPaymentError) {
               const message = typeof err === 'string' ? err : (err?.message || 'خطأ في بوابة PayPal.');
               onPaymentError(message);
             }
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
};
