import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export interface PaymentModalData {
  status: 'verifying' | 'success' | 'failed';
  orderId?: string;
  planId?: string;
  planName?: string;
  amount?: string | number;
  currency?: string;
  paymentMethod?: string;
  failureReason?: string;
  transactionId?: string;
}

interface PaymentResultModalProps {
  data: PaymentModalData;
  onClose: () => void;
  onRetry?: () => void;
  onContactSupport?: () => void;
}

export const PaymentResultModal: React.FC<PaymentResultModalProps> = ({
  data,
  onClose,
  onRetry,
}) => {
  const [currentStatus, setCurrentStatus] = useState<'verifying' | 'success' | 'failed'>(data.status);
  const [verificationError, setVerificationError] = useState<string | null>(data.failureReason || null);
  const [planName, setPlanName] = useState<string>(data.planName || 'الباقة الفائقة');

  useEffect(() => {
    setCurrentStatus(data.status);
    if (data.planName) setPlanName(data.planName);

    if (data.status === 'verifying') {
      let attempts = 0;
      const maxAttempts = 4;

      const checkServer = async () => {
        attempts++;
        try {
          const orderId = data.orderId || localStorage.getItem('thoth_last_order_id') || '';
          const res = await fetch(`/api/payment/check-status?orderId=${encodeURIComponent(orderId)}`);
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const json = await res.json().catch(() => ({}));
            if (json.status === 'completed' || json.status === 'success') {
              if (json.planId) {
                setPlanName(json.planId === 'ultra' ? 'باقة ألترا Ultra' : json.planId === 'max' ? 'باقة مكس Max' : 'باقة المحترفين Pro');
              }
              setCurrentStatus('success');
              return true;
            } else if (json.status === 'failed') {
              setVerificationError(json.error || 'تم رفض العملية من البنك.');
              setCurrentStatus('failed');
              return true;
            }
          }
        } catch (e) {
          console.warn("Verification check error:", e);
        }

        if (attempts >= maxAttempts) {
          if (data.orderId && data.orderId.includes('simulated')) {
            setCurrentStatus('success');
          } else {
            setVerificationError('لم يتم تأكيد الخصم من البنك بعد. إذا أتممت الدفع بنجاح، انتظر لحظات وافحص حسابك.');
            setCurrentStatus('failed');
          }
          return true;
        }

        return false;
      };

      const timer = setTimeout(checkServer, 1200);
      const interval = setInterval(async () => {
        const done = await checkServer();
        if (done) clearInterval(interval);
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [data]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm rtl font-sans animate-in fade-in duration-150">
      {/* Super Simple ChatGPT Style Dark Dialog */}
      <div className="relative w-full max-w-[360px] bg-[#171717] border border-zinc-800 rounded-2xl p-6 text-center shadow-2xl text-zinc-100 space-y-5">
        
        {/* Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-3.5 left-3.5 w-7 h-7 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. VERIFYING */}
        {currentStatus === 'verifying' && (
          <div className="py-4 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-emerald-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">جاري التأكيد...</h3>
              <p className="text-xs text-zinc-400">نصل بخوادم البنك لتأكيد الترقية</p>
            </div>
          </div>
        )}

        {/* 2. SUCCESS */}
        {currentStatus === 'success' && (
          <div className="py-2 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#10a37f] text-white flex items-center justify-center shadow-lg shadow-[#10a37f]/20">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">تم الاشتراك بنجاح</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                تمت ترقية حسابك فورياً إلى <span className="text-emerald-400 font-medium">{planName}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full h-10 mt-2 bg-[#10a37f] hover:bg-[#0e906f] text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>متابعة</span>
            </button>
          </div>
        )}

        {/* 3. FAILED */}
        {currentStatus === 'failed' && (
          <div className="py-2 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">تعذر إكمال الدفع</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {verificationError || 'لم يتم خصم أي مبالغ. يرجى التأكد من بيانات البطاقة والمحاولة مرة أخرى.'}
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              {onRetry && (
                <button
                  onClick={() => {
                    onClose();
                    onRetry();
                  }}
                  className="flex-1 h-9 bg-white hover:bg-zinc-200 text-zinc-900 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


