const fs = require('fs');
let code = fs.readFileSync('src/components/Subscription.tsx', 'utf8');

const iframeStr = `
      {/* Paymob Iframe Modal */}
      {iframeUrl && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center animate-in fade-in">
          <div className="w-full max-w-4xl h-[90vh] bg-white rounded-3xl overflow-hidden relative">
            <button 
              onClick={() => {
                setIframeUrl(null);
                setIframeLoading(true);
                setIsProcessingPayment(false);
              }}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white hover:bg-black/80 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            {iframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-0">
                <span className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500/30 border-t-indigo-600 mb-4"></span>
                <span className="text-gray-500 font-bold">جاري تحميل صفحة الدفع الآمنة...</span>
              </div>
            )}
            <iframe 
              src={iframeUrl}
              className="w-full h-full relative z-1"
              onLoad={() => setIframeLoading(false)}
            />
          </div>
        </div>
      )}
`;

code = code.replace('{/* Real Payment Modal */}', iframeStr + '\n      {/* Real Payment Modal */}');
fs.writeFileSync('src/components/Subscription.tsx', code);
