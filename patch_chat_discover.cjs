const fs = require('fs');
let code = fs.readFileSync('src/components/Chat.tsx', 'utf8');

// Ensure Discover is imported
if (!code.includes("import { Discover }")) {
  code = `import { Discover } from './Discover';\n` + code;
}

const emptyStateRegex = /\{messages\.length === 0 && \([\s\S]*?<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

const newEmptyState = `{messages.length === 0 && (
          isAuth ? (
            <div className="flex flex-col items-center justify-center w-full h-full my-auto animate-fade-in -mt-20">
              <Discover onAction={handleSend} onNavigate={onNavigate} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto py-10 text-center">
              <div className={\`w-16 h-16 rounded-3xl bg-gradient-to-tr \${theme.previewGradient} flex items-center justify-center text-white shadow-2xl border border-white/20 mb-4 animate-bounce\`}>
                <Bot className="w-8 h-8" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mb-6">مرحباً بك! كيف يمكنني مساعدتك اليوم؟</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {[
                  { title: '🎙️ المحادثة الصوتية', prompt: 'حدثني بصوت THOTH Live عن أهمية الذكاء الاصطناعي' },
                  { title: '🌐 الترجمة الفورية', prompt: 'قم بترجمة هذا النص فورياً باستخدام قدرات THOTH' },
                  { title: '💻 مساعد الكود', prompt: 'اكتب كود بايثون مع شرح تفصيلي بأسلوب THOTH' },
                  { title: '🧠 التفكير العميق', prompt: 'اشرح لي المفاهيم المعقدة خطوة بخطوة' },
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(card.prompt)}
                    className={\`p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:\${theme.borderAccent} text-right transition-all group shadow-lg active:scale-95\`}
                  >
                    <h4 className={\`text-xs font-bold text-white group-hover:\${theme.textAccentBright} flex items-center gap-1.5\`}>
                      <span>{card.title}</span>
                    </h4>
                    <p className="text-[11px] text-white/50 mt-1 line-clamp-2 leading-relaxed">{card.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )
        )}`;

code = code.replace(emptyStateRegex, newEmptyState);
fs.writeFileSync('src/components/Chat.tsx', code);
