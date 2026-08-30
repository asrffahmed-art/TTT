import React, { useState, useEffect } from 'react';
import { Eye, Code2, Copy, Check, Download, RefreshCw, X, FileCode, Gamepad2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAppTheme } from '../lib/themeService';

interface ArtifactViewerProps {
  content: string;
  language?: string;
  title?: string;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export function ArtifactViewer({ content, language = 'html', title = 'محتوى تفاعلي (Artifact)', isOpen: externalIsOpen, onToggle }: ArtifactViewerProps) {
  const theme = useAppTheme();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (onToggle) {
      onToggle(val);
    }
    setInternalIsOpen(val);
  };
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('artifact-fullscreen-change', { detail: isOpen }));
    return () => {
      window.dispatchEvent(new CustomEvent('artifact-fullscreen-change', { detail: false }));
    };
  }, [isOpen]);

  // Determine type
  const lang = (language || '').toLowerCase();
  const isHtml = lang === 'html' || lang === 'htm' || content.includes('<!DOCTYPE') || content.includes('<html');
  const isSvg = lang === 'svg' || content.trim().startsWith('<svg');
  const isMarkdown = lang === 'markdown' || lang === 'md';
  const isJson = lang === 'json';
  const isJs = lang === 'js' || lang === 'javascript' || lang === 'ts' || lang === 'tsx';

  const isGameArtifact = content.includes('game') || content.includes('Game') || content.includes('phaser') || content.includes('Phaser') || content.includes('Kenney') || content.includes('kenney') || content.includes('THREE') || content.includes('three') || content.includes('Scene');

  const kenneyManifestScript = `<script>
    window.KENNEY_ASSETS = {
      baseUrl: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/',
      ui: {
        buttonBlue: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/2D%20assets/UI%20Pack/Vector/blue_button00.png',
        buttonGreen: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/2D%20assets/UI%20Pack/Vector/green_button00.png',
        buttonRed: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/2D%20assets/UI%20Pack/Vector/red_button00.png',
        panel: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/2D%20assets/UI%20Pack/Vector/grey_panel.png',
        cursor: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/2D%20assets/UI%20Pack/Vector/cursor_pointer.png'
      },
      audio: {
        click: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/Audio/Digital%20Audio/click1.ogg',
        switch: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/Audio/Digital%20Audio/switch1.ogg',
        laser: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/Audio/Digital%20Audio/laser1.ogg',
        powerup: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/Audio/Digital%20Audio/powerUp1.ogg'
      },
      sprites: {
        player: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/2D%20assets/Platformer%20Art%20Deluxe/Base/Packs/p1_front.png',
        coin: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/2D%20assets/Platformer%20Art%20Deluxe/Base/Items/coinGold.png',
        star: 'https://cdn.jsdelivr.net/gh/kenney-nl/assets@master/2D%20assets/UI%20Pack/Vector/star.png'
      }
    };
  </script>`;

  // Prepare preview source doc
  const getPreviewContent = () => {
    if (isSvg) {
      return `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0d1117;">${content}</body></html>`;
    }
    if (isHtml) {
      let enhanced = content;
      if (!enhanced.includes('tailwindcss.com') && !enhanced.includes('tailwindcss')) {
        if (enhanced.includes('<head>')) {
          enhanced = enhanced.replace('<head>', `<head>\n<script src="https://cdn.tailwindcss.com"></script>\n${kenneyManifestScript}`);
        } else if (enhanced.includes('<html>')) {
          enhanced = enhanced.replace('<html>', `<html>\n<head>\n<script src="https://cdn.tailwindcss.com"></script>\n${kenneyManifestScript}\n</head>`);
        } else {
          enhanced = `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script>${kenneyManifestScript}</head><body>${enhanced}</body></html>`;
        }
      } else if (!enhanced.includes('KENNEY_ASSETS')) {
        if (enhanced.includes('<head>')) {
          enhanced = enhanced.replace('<head>', `<head>\n${kenneyManifestScript}`);
        } else {
          enhanced = `${kenneyManifestScript}\n${enhanced}`;
        }
      }
      if ((enhanced.includes('Phaser') || enhanced.includes('phaser')) && !enhanced.includes('phaser.min.js')) {
        enhanced = enhanced.replace('<head>', '<head>\n<script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>');
      }
      if ((enhanced.includes('THREE') || enhanced.includes('three')) && !enhanced.includes('three.min.js')) {
        enhanced = enhanced.replace('<head>', '<head>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
      }
      return enhanced;
    }
    if (isJs) {
      const needsPhaser = content.includes('Phaser') || content.includes('phaser') || content.includes('game') || content.includes('Scene');
      const needsThree = content.includes('THREE') || content.includes('three');
      return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${needsPhaser ? '<script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>' : ''}
  ${needsThree ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>' : ''}
  ${kenneyManifestScript}
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { background: #0b0d14; color: #f3f4f6; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <div id="game-container" style="display:flex;justify-content:center;align-items:center;"></div>
  <script>
    try {
      ${content}
    } catch(e) {
      document.getElementById('app').innerHTML = '<div style="padding:20px;background:#1f2937;border:1px solid #ef4444;border-radius:12px;color:#ef4444;margin-top:20px;"><strong>خطأ في التنفيذ:</strong> ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
    }
    if (isMarkdown) {
      return null;
    }
    return `<!DOCTYPE html><html><body style="margin:0;background:#0d1117;color:#e5e7eb;font-family:monospace;padding:16px;white-space:pre-wrap;">${content}</body></html>`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = isHtml ? 'html' : isSvg ? 'svg' : isJs ? 'js' : isJson ? 'json' : isMarkdown ? 'md' : 'txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoth_artifact_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <div className={`my-3 p-3.5 bg-black/30 backdrop-blur-md border ${theme.borderAccent} rounded-2xl flex items-center justify-between gap-3 shadow-xl hover:border-white/40 transition-all group`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl bg-white/5 border ${theme.borderAccent} flex items-center justify-center ${theme.textAccent} shrink-0 shadow-inner`}>
            <FileCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[160px] sm:max-w-xs">{title}</span>

            </div>
            <p className="text-[11px] text-white/60 mt-0.5 truncate">محتوى تفاعلي وثائقي / تطبيق مصغر جاهز للمعاينة الفورية</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${theme.btnPrimary} shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer`}
        >
          <Eye className="w-4 h-4" />
          <span>فتح المعاينة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200" dir="ltr">
      <div className={`flex flex-col bg-black/80 backdrop-blur-2xl border ${theme.borderAccent} rounded-2xl overflow-hidden shadow-2xl w-full max-w-6xl h-[94vh] sm:h-[90vh]`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/5 backdrop-blur-md border-b border-white/10 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl bg-white/5 border ${theme.borderAccent} flex items-center justify-center ${theme.textAccent} shrink-0 shadow-inner`}>
              {isGameArtifact ? <Gamepad2 className="w-4 h-4 text-emerald-400" /> : <FileCode className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white block truncate text-xs sm:text-sm">{title}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/50 uppercase font-mono">{lang || 'artifact'}</span>
                {isGameArtifact && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold">
                    <Gamepad2 className="w-2.5 h-2.5" /> Kenney Assets
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
              {(isHtml || isSvg || isJs) && (
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'preview' ? theme.activeTabClass : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">معاينة</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'code' || (!isHtml && !isSvg && !isJs) ? theme.activeTabClass : 'text-white/60 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">الكود</span>
              </button>
            </div>

            <div className="h-5 w-[1px] bg-white/15 mx-0.5" />

            {activeTab === 'preview' && (isHtml || isSvg || isJs) && (
              <button
                onClick={() => setIframeKey(prev => prev + 1)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10"
                title="إعادة تحميل المعاينة"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10 text-xs font-bold"
              title="نسخ المحتوى"
            >
              {copied ? <Check className={`w-3.5 h-3.5 ${theme.textAccent}`} /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copied ? 'تم النسخ' : 'نسخ'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10"
              title="تحميل الملف"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-all border border-red-500/30"
              title="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body Area */}
        <div className="relative w-full bg-[#0b0d14] flex-1 overflow-hidden h-[calc(86vh-56px)] sm:h-[calc(86vh-64px)]">
          {activeTab === 'preview' && (isHtml || isSvg || isJs) ? (
            <iframe
              key={iframeKey}
              srcDoc={getPreviewContent() || ''}
              title={title}
              sandbox="allow-scripts allow-modals allow-forms"
              className="w-full h-full border-0 bg-white"
            />
          ) : isMarkdown && activeTab === 'preview' ? (
            <div className="p-6 text-gray-200 overflow-y-auto h-full text-right">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <pre className="p-4 text-xs font-mono text-gray-200 overflow-auto h-full leading-relaxed text-left" dir="ltr">
              <code>{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
