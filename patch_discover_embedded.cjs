const fs = require('fs');
let code = fs.readFileSync('src/components/Discover.tsx', 'utf8');

if (!code.includes("isEmbedded?: boolean")) {
  code = code.replace(
    /interface DiscoverProps \{/,
    "interface DiscoverProps {\n  isEmbedded?: boolean;"
  );
  
  code = code.replace(
    /export function Discover\(\{ onAction, onNavigate \}: DiscoverProps\) \{/,
    "export function Discover({ onAction, onNavigate, isEmbedded }: DiscoverProps) {"
  );

  code = code.replace(
    /<div className="flex flex-col w-full h-full pb-28 pt-20 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto overflow-y-auto hide-scrollbar">/,
    `<div className={\`flex flex-col w-full h-full \${isEmbedded ? 'pb-4 pt-4' : 'pb-28 pt-20'} px-3 sm:px-6 md:px-8 max-w-4xl mx-auto overflow-y-auto hide-scrollbar\`}>`
  );

  fs.writeFileSync('src/components/Discover.tsx', code);
}
