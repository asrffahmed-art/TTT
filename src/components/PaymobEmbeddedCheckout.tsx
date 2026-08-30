import React, { useEffect, useRef } from 'react';

interface PaymobEmbeddedCheckoutProps {
  clientSecret: string;
  publicKey: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PaymobEmbeddedCheckout: React.FC<PaymobEmbeddedCheckoutProps> = ({ clientSecret, publicKey, onClose, onSuccess }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixelInstanceRef = useRef<any>(null);

  useEffect(() => {
    const handlePayFromOutside = async (e: any) => {
      if (pixelInstanceRef.current && typeof pixelInstanceRef.current.pay === 'function') {
        try {
          const res = await pixelInstanceRef.current.pay();
          console.log("Paymob pixel.pay() output:", res);
          if (res && (res.success || res.is_success === true || res.pending === true)) {
            if (onSuccess) onSuccess();
          }
        } catch (err: any) {
          console.error("Paymob pixel.pay error:", err);
          alert("⚠️ يرجى التأكد من ملء كافة بيانات البطاقة (رقم البطاقة، تاريخ الانتهاء، ورقم CVC) أعلاه بشكل صحيح.");
        }
      } else {
        console.warn("Paymob Pixel instance missing or pay() not ready.");
        if (e && e.detail && typeof e.detail.fallback === 'function') {
          e.detail.fallback();
        } else if (onSuccess) {
          onSuccess();
        }
      }
    };

    window.addEventListener('payFromOutside', handlePayFromOutside);
    return () => {
      window.removeEventListener('payFromOutside', handlePayFromOutside);
    };
  }, [onSuccess]);
  
  useEffect(() => {
    let scriptLoaded = false;
    
    const loadScript = () => {
      const existingScript = document.getElementById('paymob-pixel-script');
      if (existingScript) {
        setTimeout(initPaymob, 100);
        return;
      }
      
      const script = document.createElement('script');
      script.id = 'paymob-pixel-script';
      script.src = 'https://cdn.jsdelivr.net/npm/paymob-pixel@latest/main.js';
      script.type = 'module';
      script.onload = () => {
        scriptLoaded = true;
        setTimeout(initPaymob, 100);
      };
      document.body.appendChild(script);
    };

    const initPaymob = () => {
      if ((window as any).Pixel && containerRef.current) {
         try {
           containerRef.current.innerHTML = '';
           pixelInstanceRef.current = new (window as any).Pixel({
              publicKey: publicKey,
              clientSecret: clientSecret,
              elementId: containerRef.current.id,
              disablePay: true,
              customStyle: {
                  Color_Container: 'transparent',
                  Color_Border_Input_Fields: 'rgba(255, 255, 255, 0.09)',
                  Color_Input_Fields: '#18151c',
                  Text_Color_For_Label: '#8f889c',
                  Text_Color_For_Input_Fields: '#f2eef8',
                  Color_For_Text_Placeholder: '#5f5871',
                  Color_Primary: '#7c5cff',
                  Color_Error: '#ffb4ab',
                  Color_Disabled: '#312c3c',
                  Color_Border_Payment_Button: 'transparent',
                  Text_Color_For_Payment_Button: '#ffffff',
                  Direction: 'rtl',
                  Font_Family: "'Tajawal', sans-serif",
                  Button_Text: {
                    payBtn: 'تأكيد الدفع'
                  }
              },
              afterPaymentComplete: (data: any) => {
                  console.log("Paymob SDK Payment Complete:", data);
                  if (data && (data.success || data.is_success === true || data.is_success === "true" || data.pending === "true")) {
                     if (onSuccess) onSuccess();
                  }
              }
           });
         } catch(e) {
           console.error("Paymob Pixel SDK init error", e);
         }
      } else {
         setTimeout(() => {
             if ((window as any).Pixel && containerRef.current) {
                 try {
                   containerRef.current.innerHTML = '';
                   pixelInstanceRef.current = new (window as any).Pixel({
                      publicKey: publicKey,
                      clientSecret: clientSecret,
                      elementId: containerRef.current.id,
                      disablePay: true,
                      customStyle: {
                          Color_Container: 'transparent',
                          Color_Border_Input_Fields: 'rgba(255, 255, 255, 0.09)',
                          Color_Input_Fields: '#18151c',
                          Text_Color_For_Label: '#8f889c',
                          Text_Color_For_Input_Fields: '#f2eef8',
                          Color_For_Text_Placeholder: '#5f5871',
                          Color_Primary: '#7c5cff',
                          Color_Error: '#ffb4ab',
                          Color_Disabled: '#312c3c',
                          Color_Border_Payment_Button: 'transparent',
                          Text_Color_For_Payment_Button: '#ffffff',
                          Direction: 'rtl',
                          Font_Family: "'Tajawal', sans-serif",
                          Button_Text: {
                            payBtn: 'تأكيد الدفع'
                          }
                      },
                      afterPaymentComplete: (data: any) => {
                          console.log("Paymob SDK Payment Complete:", data);
                          if (data && (data.success || data.is_success === true || data.is_success === "true" || data.pending === "true")) {
                             if (onSuccess) onSuccess();
                          }
                      }
                   });
                 } catch(e) {
                   console.error("Paymob Pixel SDK init error", e);
                 }
             }
         }, 500);
      }
    };

    loadScript();
    
    return () => {
       if (containerRef.current) {
          containerRef.current.innerHTML = '';
       }
    };
  }, [clientSecret, publicKey]);

  return (
    <div className="w-full relative animate-in fade-in zoom-in-95" dir="rtl">
        <div id="paymob-pixel-checkout" ref={containerRef} className="w-full flex flex-col justify-center min-h-[220px]">
           <div className="flex flex-col items-center justify-center gap-3 py-6">
             <span className="animate-spin rounded-full h-8 w-8 border-4 border-[#7c5cff]/30 border-t-[#7c5cff]"></span>
             <p className="text-[#8f889c] font-medium animate-pulse text-xs font-['Tajawal',sans-serif]">جاري تحميل حقول الدفع الآمنة...</p>
           </div>
        </div>
    </div>
  );
};
