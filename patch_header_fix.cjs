const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  /export function Header\(\{ title, onOpenSettings, onOpenSubscription, onOpenDailyBriefing \}: HeaderProps\) \{/,
  "export function Header({ isAuthenticated, title, onOpenSettings, onOpenSubscription, onOpenDailyBriefing }: HeaderProps) {"
);

fs.writeFileSync('src/components/Header.tsx', code);
