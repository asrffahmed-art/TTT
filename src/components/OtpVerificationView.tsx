import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, ArrowRight, ArrowLeft, Loader2, RotateCcw, AlertCircle, CheckCircle2, Laptop, Smartphone } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { sendOtp, verifyOtp, getDeviceInfo } from '../lib/otpService';

interface OtpVerificationViewProps {
  email: string;
  purpose: 'register' | 'login_new_device' | 'verify_email';
  userName?: string;
  userId?: string;
  initialPreviewOtp?: string;
  onVerified: () => void;
  onBack: () => void;
}

export const OtpVerificationView: React.FC<OtpVerificationViewProps> = ({
  email,
  purpose,
  userName,
  userId,
  initialPreviewOtp,
  onVerified,
  onBack
}) => {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewOtp, setPreviewOtp] = useState<string | undefined>(initialPreviewOtp);
  
  // 60 seconds resend cooldown
  const [resendTimer, setResendTimer] = useState(60);
  // 10 minutes code validity timer (600 seconds)
  const [codeTimer, setCodeTimer] = useState(600);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const deviceInfo = getDeviceInfo();

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Code validity countdown
  useEffect(() => {
    if (codeTimer <= 0) return;
    const interval = setInterval(() => {
      setCodeTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [codeTimer]);

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);
    // Allow only numeric digits
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length > 1) {
      // User typed or pasted multiple characters in a single input
      handlePasteCode(cleaned);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    // Auto-advance to next input
    if (cleaned && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // If 6 digits are complete, trigger auto-verify
    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      triggerVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous box on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      handlePasteCode(pastedData);
    }
  };

  const handlePasteCode = (codeStr: string) => {
    const chars = codeStr.split('').slice(0, 6);
    const newDigits = ['', '', '', '', '', ''];
    chars.forEach((ch, i) => {
      newDigits[i] = ch;
    });
    setDigits(newDigits);

    // Focus on the next empty or last filled
    const nextIdx = Math.min(chars.length, 5);
    inputRefs.current[nextIdx]?.focus();

    if (chars.length === 6) {
      triggerVerification(newDigits.join(''));
    }
  };

  const triggerVerification = async (codeToVerify: string) => {
    if (isVerifying) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyOtp(email, codeToVerify, purpose, userId);
      if (res.success && res.verified) {
        setSuccessMessage(t('otpVerifiedSuccess', 'تم التحقق بنجاح! جاري تسجيل الدخول...'));
        setTimeout(() => {
          onVerified();
        }, 800);
      } else {
        setErrorMessage(res.error || t('otpInvalidCode', 'رمز التحقق غير صحيح أو منتهي'));
        setIsVerifying(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('otpVerifyError', 'حدث خطأ أثناء التحقق من الرمز'));
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await sendOtp(email, purpose, userName);
      if (res.success) {
        setResendTimer(60);
        setCodeTimer(600);
        setDigits(['', '', '', '', '', '']);
        if (res.previewOtp) {
          setPreviewOtp(res.previewOtp);
        }
        setSuccessMessage(t('otpResentSuccess', 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني'));
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      } else {
        setErrorMessage(res.error || t('otpResendFailed', 'تعذر إعادة إرسال الرمز'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('otpResendError', 'حدث خطأ أثناء إعادة إرسال الرمز'));
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isFullCodeEntered = digits.every(d => d !== '');

  return (
    <div className="w-full text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header icon */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/5">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight">
          {purpose === 'register' 
            ? t('otpTitleRegister', 'تأكيد البريد الإلكتروني') 
            : purpose === 'login_new_device'
            ? t('otpTitleNewDevice', 'التحقق من جهاز جديد')
            : t('otpTitleGeneral', 'رمز التحقق الأمني')}
        </h3>
        <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto leading-relaxed">
          {purpose === 'login_new_device'
            ? t('otpDescNewDevice', 'تم اكتشاف تسجيل دخول من جهاز/متصفح جديد. أرسلنا رمز تحقق أمني إلى بريدك:')
            : t('otpDescRegister', 'أدخل رمز التحقق المكوّن من 6 أرقام المرسل إلى:')}
        </p>

        {/* Email Badge */}
        <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-indigo-300">
          <Mail className="w-3.5 h-3.5" />
          <span>{email}</span>
        </div>

        {/* Device metadata tag */}
        {purpose === 'login_new_device' && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-amber-300/80">
            <Laptop className="w-3.5 h-3.5" />
            <span>{deviceInfo.name}</span>
          </div>
        )}
      </div>

      {/* Fallback preview OTP banner if SMTP is not configured */}
      {previewOtp && (
        <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="text-xs text-amber-200 leading-relaxed">
            <div className="font-semibold text-amber-300 mb-0.5">
              {t('smtpFallbackNotice', 'سيرفر البريد SMTP غير مفصل باللوحة بعد')}
            </div>
            <span>{t('otpFallbackCode', 'رمز التحقق المباشر:')} </span>
            <span className="font-mono font-black text-sm tracking-widest text-amber-300">{previewOtp}</span>
          </div>
          <button
            type="button"
            onClick={() => handlePasteCode(previewOtp)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shrink-0"
          >
            {t('otpAutoFill', 'تعبئة تلقائية')}
          </button>
        </div>
      )}

      {/* Messages */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 6 Digit Inputs */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 my-6" onPaste={handlePaste} dir="ltr">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleDigitChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            disabled={isVerifying}
            className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-2xl font-black font-mono rounded-xl bg-white/[0.04] border transition-all outline-none ${
              digit
                ? 'border-indigo-500 text-white bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                : 'border-white/10 text-white/90 hover:border-white/20 focus:border-indigo-500 focus:bg-indigo-500/5'
            }`}
          />
        ))}
      </div>

      {/* Expiry and Validity Timer */}
      <div className="flex items-center justify-between text-xs text-white/50 mb-6 px-1">
        <span>{t('otpCodeExpiresIn', 'صلاحية الرمز:')} <strong className="text-white/80 font-mono">{formatTime(codeTimer)}</strong></span>
        {codeTimer === 0 && (
          <span className="text-rose-400">{t('otpExpired', 'انتهت الصلاحية')}</span>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => triggerVerification(digits.join(''))}
          disabled={!isFullCodeEntered || isVerifying}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            isFullCodeEntered && !isVerifying
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer active:scale-[0.99]'
              : 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed'
          }`}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>{t('otpVerifying', 'جاري التحقق...')}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>{t('otpConfirmButton', 'تأكيد الرمز والمتابعة')}</span>
            </>
          )}
        </button>

        {/* Resend button */}
        <div className="flex items-center justify-between pt-2 text-xs">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendTimer > 0 || isResending}
            className={`flex items-center gap-1.5 transition-colors ${
              resendTimer > 0 || isResending
                ? 'text-white/40 cursor-not-allowed'
                : 'text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            <span>
              {resendTimer > 0
                ? `${t('otpResendIn', 'إعادة إرسال بعد')} (${resendTimer}s)`
                : t('otpResendNow', 'إعادة إرسال الرمز الآن')}
            </span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="text-white/50 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{t('otpBack', 'الرجوع أو تغيير البريد')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
