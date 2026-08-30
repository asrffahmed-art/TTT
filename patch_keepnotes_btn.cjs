const fs = require('fs');
let code = fs.readFileSync('src/components/KeepNotes.tsx', 'utf8');

code = code.replace(/className="px-3\.5 py-1\.5 rounded-2xl bg-amber-500\/10 hover:bg-amber-500\/20 text-white\/80 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1\.5 border border-amber-500\/20"\s*title="مساعد الذكاء الاصطناعي لتحسين النص"\s*>\s*<Sparkles className="w-4 h-4 text-amber-300 animate-pulse" \/>\s*<span className="text-xs font-bold text-amber-300 hidden sm:block">المساعد الذكي<\/span>\s*<\/button>/g, 
'className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center"\n                  title="مساعد الذكاء الاصطناعي لتحسين النص"\n                >\n                  <Sparkles className="w-5 h-5" />\n                </button>');

fs.writeFileSync('src/components/KeepNotes.tsx', code);
console.log("KeepNotes AI buttons updated!");
