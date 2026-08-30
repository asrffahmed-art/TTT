import React, { useEffect, useState } from 'react';
import { ExternalLink, X, Megaphone, ShieldCheck } from 'lucide-react';
import { adTracker } from '../lib/adTrackingService';

interface AdPlacementProps {
  placementId: 'chat_sidebar' | 'search_results' | 'daily_briefing' | 'banner_top';
  className?: string;
}

interface AdItem {
  id: string;
  campaignId: string;
  advertiserId?: string;
  title: string;
  creativeUrl?: string;
  destinationUrl?: string;
  placementId: string;
  status: string;
}

export function AdPlacement({ placementId, className = '' }: AdPlacementProps) {
  const [ad, setAd] = useState<AdItem | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAd = async () => {
      try {
        const consent = adTracker.getUserConsent();
        // Check if user allowed advertising consent
        if (!consent.advertisingConsent) {
          if (isMounted) setLoading(false);
          return;
        }

        const res = await fetch(`/api/ads/creatives?placement=${placementId}`);
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || !contentType.includes("application/json")) return;
        const data = await res.json().catch(() => ({}));
        
        if (data.success && Array.isArray(data.ads) && data.ads.length > 0) {
          // Filter active ads
          const activeAds = data.ads.filter((a: AdItem) => a.status === 'Active');
          if (activeAds.length > 0) {
            // Pick a random or top active ad
            const selected = activeAds[Math.floor(Math.random() * activeAds.length)];
            if (isMounted) {
              setAd(selected);
              // Track Impression
              adTracker.trackImpression(selected.id, selected.campaignId, placementId);
            }
          }
        }
      } catch (err) {
        console.warn('Ad placement fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAd();
    return () => { isMounted = false; };
  }, [placementId]);

  if (loading || !isVisible || !ad) return null;

  const handleClick = () => {
    adTracker.trackClick(ad.id, ad.campaignId, placementId);
    if (ad.destinationUrl) {
      window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    adTracker.trackClose(ad.id, ad.campaignId, placementId);
    setIsVisible(false);
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black/50 border border-purple-500/20 p-3.5 backdrop-blur-md hover:border-purple-500/40 transition-all shadow-lg hover:shadow-purple-900/10 ${className}`}
     
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-300/80 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
          <Megaphone className="w-3 h-3 text-purple-400" />
          <span>إعلان مرخص</span>
          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400 mr-0.5" />
        </div>
        <button
          onClick={handleClose}
          className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          title="إغلاق الإعلان"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {ad.creativeUrl ? (
          <img 
            src={ad.creativeUrl} 
            alt={ad.title} 
            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" 
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-400/20 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-purple-300" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-200 transition-colors">
            {ad.title}
          </h4>
          <p className="text-[11px] text-white/60 truncate mt-0.5">
            انقر لمعرفة المزيد واكتشاف العرض
          </p>
        </div>

        <ExternalLink className="w-4 h-4 text-purple-400/80 group-hover:text-purple-300 transition-colors shrink-0" />
      </div>
    </div>
  );
}
