import { ExternalLink, Globe, Image as ImageIcon, Sparkles, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { WebSource, WebImage } from '../types';
import { useAppTheme } from '../lib/themeService';

interface SearchResultViewProps {
  text: string;
  sources?: WebSource[];
  relatedSources?: WebSource[];
  images?: WebImage[];
  modelUsed?: string;
}

export function SearchResultView({ text, sources = [], relatedSources = [], images = [], modelUsed }: SearchResultViewProps) {
  const theme = useAppTheme();

  // Function to render text with interactive citation badges [1], [2]...
  const renderFormattedText = (content: string) => {
    // We split by citation pattern like [1], [2], [3]
    const parts = content.split(/(\[\d+\])/g);

    return parts.map((part, idx) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const sourceNum = parseInt(match[1], 10);
        const source = sources.find(s => s.id === sourceNum);

        return (
          <a
            key={idx}
            href={`#source-${sourceNum}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(`source-${sourceNum}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-white/50');
                setTimeout(() => el.classList.remove('ring-2', 'ring-white/50'), 2000);
              } else if (source?.url) {
                window.open(source.url, '_blank', 'noopener,noreferrer');
              }
            }}
            title={source ? `${source.title} (${source.domain})` : `مصدر ${sourceNum}`}
            className={`inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded-md ${theme.bgAccent} ${theme.textAccentBright} hover:bg-white hover:text-black border ${theme.borderAccent} text-[11px] font-mono font-bold transition-all transform hover:scale-105 cursor-pointer shadow-sm`}
          >
            [{sourceNum}]
          </a>
        );
      }

      return (
        <span key={idx}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <span>{children}</span>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className={`${theme.textAccent} underline hover:brightness-125`}>
                  {children}
                </a>
              )
            }}
          >
            {part}
          </ReactMarkdown>
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col gap-5 w-full text-right">
      {/* Search Header Badge */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Globe className={`w-3.5 h-3.5 ${theme.textAccent}`} />
          <span className={`text-xs font-bold ${theme.textAccentBright}`}>
            نتائج البحث المباشرة عبر THOTH
          </span>
        </div>
        {sources.length > 0 && (
          <span className="text-[11px] text-white/50 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 font-mono">
            {sources.length} مصادر معتمدة
          </span>
        )}
      </div>

      {/* Main Answer Content - styled like standard chat message */}
      <div className="markdown-body text-sm leading-relaxed text-gray-100 space-y-2">
        {renderFormattedText(text)}
      </div>

      {/* Related Images Section */}
      {images && images.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
            <ImageIcon className={`w-4 h-4 ${theme.textAccent}`} />
            صور مرتبطة بالبحث
          </h4>
          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 hide-scrollbar">
            {images.map((img, idx) => (
              <a
                key={idx}
                href={img.sourceUrl || img.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative shrink-0 w-44 sm:w-52 h-32 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-md hover:${theme.borderAccent} hover:border-white/25 transition-all shadow-lg flex flex-col`}
              >
                <img
                  src={img.url}
                  alt={img.description || 'صورة بحث'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-black/20"
                  onError={(e) => {
                    // Hide image container on load failure
                    (e.target as HTMLElement).parentElement!.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end backdrop-blur-[2px]">
                  <p className={`text-[11px] font-medium text-white line-clamp-1 group-hover:${theme.textAccentBright} transition-colors`}>
                    {img.description || 'صورة متعلقة بالموضوع'}
                  </p>
                  {img.sourceTitle && (
                    <span className="text-[10px] text-white/60 line-clamp-1 mt-0.5">
                      {img.sourceTitle}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Primary Sources UI */}
      {sources && sources.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          <h4 className="text-xs font-bold text-white/80 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            المصادر المعتمدة (Sources)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sources.map((src) => (
              <a
                key={src.id}
                id={`source-${src.id}`}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative p-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 hover:${theme.borderAccent} hover:border-white/20 hover:bg-white/[0.07] transition-all flex flex-col justify-between gap-2 shadow-lg`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md ${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent} text-[11px] font-mono font-bold flex items-center justify-center shrink-0`}>
                      {src.id}
                    </span>
                    <img
                      src={src.favicon}
                      alt={src.domain}
                      className="w-4 h-4 rounded shrink-0 object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] font-semibold text-white/60 font-mono line-clamp-1">
                      {src.domain}
                    </span>
                  </div>
                  <ExternalLink className={`w-3.5 h-3.5 text-white/40 group-hover:${theme.textAccent} shrink-0 transition-colors`} />
                </div>

                <div>
                  <h5 className={`text-xs font-bold text-white group-hover:${theme.textAccentBright} line-clamp-1 transition-colors`}>
                    {src.title}
                  </h5>
                  {src.snippet && (
                    <p className="text-[11px] text-white/60 line-clamp-2 mt-1 leading-relaxed">
                      {src.snippet}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Related Sources UI */}
      {relatedSources && relatedSources.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          <h4 className="text-xs font-bold text-white/80 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            مصادر إضافية ذات صلة (Related Sources)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {relatedSources.map((relSrc, idx) => (
              <a
                key={idx}
                href={relSrc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06] transition-all flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img
                    src={relSrc.favicon}
                    alt={relSrc.domain}
                    className="w-4 h-4 rounded shrink-0 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="overflow-hidden">
                    <h6 className="text-[12px] font-bold text-white/90 group-hover:text-purple-300 line-clamp-1 transition-colors">
                      {relSrc.title}
                    </h6>
                    <span className="text-[10px] text-white/50 font-mono block line-clamp-1">
                      {relSrc.domain}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-white/30 group-hover:text-purple-400 shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
