const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<div className=\{\!isLiveAudioOpen && activeTab \!\=\= 'subscription' && \!\(activeTab \=\=\= 'keep' && isKeepModalOpen\) \? '' : 'hidden'\}>\s*<Navigation activeTab=\{activeTab\} setActiveTab=\{setActiveTab\} tabs=\{tabs\} \/>\s*<\/div>/,
  `{isAuthenticated && (
      <div className={!isLiveAudioOpen && activeTab !== 'subscription' && !(activeTab === 'keep' && isKeepModalOpen) ? '' : 'hidden'}>
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      </div>
    )}`
);

fs.writeFileSync('src/App.tsx', code);
