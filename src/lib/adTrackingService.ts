/**
 * THOTH Advertising, Analytics & Data Collection Telemetry Service
 * Zero-PII, Privacy-by-Design event tracker with anti-abuse detection,
 * session heartbeats, feature affinity profiling, and ad partner data pipelines.
 */

export interface AdEventPayload {
  eventType: 'ad_impression' | 'ad_click' | 'ad_view' | 'ad_close' | 'campaign_view' | 'conversion' | 'heartbeat' | 'feature_use' | 'model_interaction';
  adId?: string;
  campaignId?: string;
  placementId?: string;
  userId?: string;
  featureName?: string;
  modelAlias?: string;
  viewabilitySeconds?: number;
  hoverTimeMs?: number;
  customData?: Record<string, any>;
}

export interface UserConsentState {
  essentialConsent: boolean;
  analyticsConsent: boolean;
  advertisingConsent: boolean;
  allowTrainingConsent: boolean;
}

export interface TelemetryEnvironmentDetails {
  deviceCategory: string;
  browserCategory: string;
  osCategory: string;
  language: string;
  coarseRegion: string;
  sessionId: string;
  viewportCategory: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  connectionType: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  touchSupported: boolean;
}

class AdTrackingService {
  private recentEvents: Map<string, number> = new Map();
  private sessionId: string;
  private heartbeatInterval: any = null;
  private sessionStartTime: number;
  private offlineQueue: AdEventPayload[] = [];
  private activeFeature: string = 'chat';

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStartTime = Date.now();
    this.initOfflineQueue();
    this.startHeartbeat();
  }

  private getOrCreateSessionId(): string {
    let sid = sessionStorage.getItem('thoth_ad_session_id');
    if (!sid) {
      sid = 'sid_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('thoth_ad_session_id', sid);
    }
    return sid;
  }

  private initOfflineQueue() {
    try {
      const stored = localStorage.getItem('thoth_telemetry_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (_) {
      this.offlineQueue = [];
    }

    window.addEventListener('online', () => this.flushOfflineQueue());
  }

  private saveOfflineQueue() {
    try {
      localStorage.setItem('thoth_telemetry_queue', JSON.stringify(this.offlineQueue.slice(-100)));
    } catch (_) {}
  }

  /**
   * Safe non-PII environment & device details collection
   */
  public getEnvironmentDetails(): TelemetryEnvironmentDetails {
    const ua = navigator.userAgent.toLowerCase();
    
    // Device Category
    let deviceCategory = 'desktop';
    if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
      deviceCategory = 'mobile';
    } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
      deviceCategory = 'tablet';
    }

    // Browser Category
    let browserCategory = 'other';
    if (ua.includes('firefox')) browserCategory = 'firefox';
    else if (ua.includes('edg/')) browserCategory = 'edge';
    else if (ua.includes('chrome')) browserCategory = 'chrome';
    else if (ua.includes('safari')) browserCategory = 'safari';

    // OS Category
    let osCategory = 'other';
    if (ua.includes('win')) osCategory = 'windows';
    else if (ua.includes('mac')) osCategory = 'mac';
    else if (ua.includes('android')) osCategory = 'android';
    else if (ua.includes('iphone') || ua.includes('ipad')) osCategory = 'ios';
    else if (ua.includes('linux')) osCategory = 'linux';

    // Language
    const language = (navigator.language || 'ar').substring(0, 5);

    // Viewport category & metrics
    const w = window.innerWidth || 1024;
    const h = window.innerHeight || 768;
    let viewportCategory = 'desktop_hd';
    if (w < 640) viewportCategory = 'mobile_compact';
    else if (w < 1024) viewportCategory = 'tablet_view';
    else if (w >= 1920) viewportCategory = 'desktop_4k';

    const dpr = window.devicePixelRatio || 1;
    const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Connection signal (Zero-PII)
    let connectionType = 'unknown';
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      connectionType = conn.effectiveType || conn.type || 'wifi';
    }

    // Hardware signals
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4;

    // Coarse Region estimation from TimeZone locale
    let coarseRegion = 'GLOBAL';
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.includes('Riyadh')) coarseRegion = 'SA';
      else if (tz.includes('Dubai')) coarseRegion = 'AE';
      else if (tz.includes('Cairo')) coarseRegion = 'EG';
      else if (tz.includes('Amman')) coarseRegion = 'JO';
      else if (tz.includes('Kuwait')) coarseRegion = 'KW';
      else if (tz.includes('Doha')) coarseRegion = 'QA';
      else if (tz.includes('Baghdad')) coarseRegion = 'IQ';
      else if (tz.includes('Casablanca')) coarseRegion = 'MA';
      else if (tz.includes('Istanbul')) coarseRegion = 'TR';
      else if (tz.includes('Europe')) coarseRegion = 'EU';
      else if (tz.includes('America')) coarseRegion = 'US';
    } catch (_) {
      coarseRegion = 'GLOBAL';
    }

    return {
      deviceCategory,
      browserCategory,
      osCategory,
      language,
      coarseRegion,
      sessionId: this.sessionId,
      viewportCategory,
      screenWidth: w,
      screenHeight: h,
      devicePixelRatio: dpr,
      connectionType,
      hardwareConcurrency,
      deviceMemory,
      touchSupported
    };
  }

  /**
   * Anti-abuse rate limit check: prevents click spam / duplicate rapid impressions
   */
  private isDuplicateOrSpam(key: string, cooldownMs: number = 2000): boolean {
    const now = Date.now();
    const lastTime = this.recentEvents.get(key);
    if (lastTime && now - lastTime < cooldownMs) {
      return true; // Spam/duplicate detected
    }
    this.recentEvents.set(key, now);
    return false;
  }

  /**
   * Read consent from local storage / cache
   */
  public getUserConsent(): UserConsentState {
    try {
      const saved = localStorage.getItem('thoth_user_consent');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          essentialConsent: true,
          analyticsConsent: true,
          advertisingConsent: true, // Mandatory for service
          allowTrainingConsent: true, // Mandatory for service
        };
      }
    } catch (_) {}
    return {
      essentialConsent: true,
      analyticsConsent: true,
      advertisingConsent: true,
      allowTrainingConsent: true,
    };
  }

  /**
   * Update consent state
   */
  public setUserConsent(consent: Partial<UserConsentState>) {
    const current = this.getUserConsent();
    const updated: UserConsentState = {
      ...current,
      ...consent,
      essentialConsent: true,
      advertisingConsent: true, // Always mandatory
      allowTrainingConsent: true, // Always mandatory
    };
    localStorage.setItem('thoth_user_consent', JSON.stringify(updated));
    return updated;
  }

  /**
   * Main tracking handler with offline fallback
   */
  public async trackEvent(payload: AdEventPayload): Promise<boolean> {
    const consent = this.getUserConsent();

    if (!consent.advertisingConsent && payload.eventType.startsWith('ad_')) {
      return false;
    }

    const dedupeKey = `${payload.eventType}_${payload.adId || payload.campaignId || payload.featureName}_${payload.placementId || 'gen'}`;
    const isSpam = this.isDuplicateOrSpam(dedupeKey, payload.eventType === 'ad_click' ? 1500 : 2500);

    const env = this.getEnvironmentDetails();
    const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    const fullPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
      deviceCategory: env.deviceCategory,
      browserCategory: env.browserCategory,
      osCategory: env.osCategory,
      language: env.language,
      coarseRegion: env.coarseRegion,
      viewportCategory: env.viewportCategory,
      screenWidth: env.screenWidth,
      screenHeight: env.screenHeight,
      devicePixelRatio: env.devicePixelRatio,
      connectionType: env.connectionType,
      hardwareConcurrency: env.hardwareConcurrency,
      deviceMemory: env.deviceMemory,
      touchSupported: env.touchSupported,
      sessionId: env.sessionId,
      sessionDuration,
      activeFeature: this.activeFeature,
      isValidTraffic: !isSpam,
    };

    if (!navigator.onLine) {
      this.offlineQueue.push(payload);
      this.saveOfflineQueue();
      return true;
    }

    try {
      const res = await fetch('/api/ads/events/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload),
      });
      return res.ok;
    } catch (err) {
      this.offlineQueue.push(payload);
      this.saveOfflineQueue();
      return false;
    }
  }

  private async flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    const items = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();

    for (const item of items) {
      await this.trackEvent(item);
    }
  }

  /**
   * Set currently active view/feature for context affinity mapping
   */
  public setActiveFeature(featureName: string) {
    this.activeFeature = featureName;
    this.trackFeatureUse(featureName, 'view');
  }

  /**
   * Automatic session heartbeat (every 60s)
   */
  public startHeartbeat() {
    if (this.heartbeatInterval) return;
    
    // Initial heartbeat after 5s
    setTimeout(() => {
      this.trackHeartbeat();
    }, 5000);

    this.heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.trackHeartbeat();
      }
    }, 60000);
  }

  public trackHeartbeat() {
    return this.trackEvent({
      eventType: 'heartbeat',
      customData: {
        activeFeature: this.activeFeature,
        sessionAgeSeconds: Math.floor((Date.now() - this.sessionStartTime) / 1000)
      }
    });
  }

  public trackFeatureUse(featureName: string, action: string = 'interact', durationSeconds?: number) {
    return this.trackEvent({
      eventType: 'feature_use',
      featureName,
      customData: {
        action,
        durationSeconds: durationSeconds || 0
      }
    });
  }

  public trackModelInteraction(modelAlias: string, interactionType: string, latencyMs?: number) {
    return this.trackEvent({
      eventType: 'model_interaction',
      modelAlias,
      customData: {
        interactionType,
        latencyMs: latencyMs || 0
      }
    });
  }

  public trackImpression(adId: string, campaignId: string, placementId: string) {
    return this.trackEvent({
      eventType: 'ad_impression',
      adId,
      campaignId,
      placementId,
    });
  }

  public trackClick(adId: string, campaignId: string, placementId: string) {
    return this.trackEvent({
      eventType: 'ad_click',
      adId,
      campaignId,
      placementId,
    });
  }

  public trackView(adId: string, campaignId: string, placementId: string, viewabilitySeconds?: number) {
    return this.trackEvent({
      eventType: 'ad_view',
      adId,
      campaignId,
      placementId,
      viewabilitySeconds
    });
  }

  public trackClose(adId: string, campaignId: string, placementId: string) {
    return this.trackEvent({
      eventType: 'ad_close',
      adId,
      campaignId,
      placementId,
    });
  }

  public trackCampaignView(campaignId: string) {
    return this.trackEvent({
      eventType: 'campaign_view',
      campaignId,
    });
  }

  public trackConversion(campaignId: string, adId: string, customData?: Record<string, any>) {
    return this.trackEvent({
      eventType: 'conversion',
      campaignId,
      adId,
      customData,
    });
  }
}

export const adTracker = new AdTrackingService();
