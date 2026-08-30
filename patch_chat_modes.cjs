const fs = require('fs');
let code = fs.readFileSync('src/components/Chat.tsx', 'utf8');

// Insert isAuth if it does not exist
if (!code.includes("const isAuth = localStorage.getItem('isAuth') === 'true';")) {
  code = code.replace(
    /const \[selectedMode, setSelectedMode\] = useState/g,
    "const isAuth = localStorage.getItem('isAuth') === 'true';\n  const [selectedMode, setSelectedMode] = useState"
  );
}

// Wrap the modes
code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) \=\> setSelectedMode\('thinking'\)\}[\s\S]*?<\/button>/,
  `{isAuth && (
              <button
                type="button"
                onClick={() => setSelectedMode('thinking')}
                className={\`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold transition-all shrink-0 \${
                  selectedMode === 'thinking'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                }\`}
              >
                <Brain className="w-3 h-3 text-purple-400" />
                <span>تفكير عميق</span>
              </button>
            )}`
);

code = code.replace(
  /<button\s+type="button"\s+onClick=\{\(\) \=\> setSelectedMode\('web_search'\)\}[\s\S]*?<\/button>/,
  `{isAuth && (
              <button
                type="button"
                onClick={() => setSelectedMode('web_search')}
                className={\`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-semibold transition-all shrink-0 \${
                  selectedMode === 'web_search'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent'
                }\`}
              >
                <Globe className="w-3 h-3 text-blue-400" />
                <span>بحث الويب</span>
              </button>
            )}`
);

fs.writeFileSync('src/components/Chat.tsx', code);
