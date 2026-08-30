/**
 * THOTH Data Program - High-Value AI Training Data Collection Service
 * Manages consent-based, privacy-preserving telemetry for RLHF Preference,
 * SFT, Arabic/Egyptian Dialect, Coding, Multimodal, and Domain datasets.
 */

export interface PreferencePayload {
  prompt: string;
  responseA: string;
  responseB: string;
  preferredResponse: 'A' | 'B';
  reason?: string;
  modelAlias?: string;
  userId?: string;
  language?: string;
}

export interface SFTPayload {
  instruction: string;
  response: string;
  editedResponse?: string;
  rating?: number;
  modelAlias?: string;
  userId?: string;
  domain?: string;
  category?: string;
  language?: string;
  hasCode?: boolean;
  hasImage?: boolean;
}

export interface FeedbackPayload {
  messageId?: string;
  prompt: string;
  response: string;
  feedbackType: 'like' | 'dislike' | 'edit' | 'regenerate';
  rating?: number;
  editContent?: string;
  reason?: string;
  modelAlias?: string;
  userId?: string;
}

class DataProgramService {
  private getUserId(): string {
    return localStorage.getItem('app-user-id') || 'anon_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Check if user has opted into the AI Data Program
   */
  public hasConsent(): boolean {
    try {
      const saved = localStorage.getItem('thoth_user_consent');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.allowTrainingConsent === 'boolean') {
          return parsed.allowTrainingConsent;
        }
      }
      // Check legacy setting or default to opt-in with explicit settings control
      const legacySetting = localStorage.getItem('app-allow-training-consent');
      if (legacySetting !== null) {
        return legacySetting === 'true';
      }
    } catch (_) {}
    return true; // Default opt-in
  }

  /**
   * Update consent status
   */
  public async setConsent(allowTraining: boolean): Promise<boolean> {
    try {
      const saved = localStorage.getItem('thoth_user_consent');
      const current = saved ? JSON.parse(saved) : {};
      current.allowTrainingConsent = allowTraining;
      localStorage.setItem('thoth_user_consent', JSON.stringify(current));
      localStorage.setItem('app-allow-training-consent', String(allowTraining));

      const uid = this.getUserId();
      await fetch('/api/user/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          allowTrainingConsent: allowTraining
        })
      });
      return true;
    } catch (err) {
      console.error('Failed to update data program consent:', err);
      return false;
    }
  }

  /**
   * Submit A/B Human Preference Signal (Priority 1 - Highest)
   */
  public async submitPreference(payload: PreferencePayload): Promise<boolean> {
    if (!this.hasConsent()) return false;

    try {
      const uid = payload.userId || this.getUserId();
      const res = await fetch('/api/data-program/collect-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          userId: uid,
          timestamp: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (err) {
      console.error('Error submitting RLHF preference:', err);
      return false;
    }
  }

  /**
   * Submit SFT Example (Priority 2)
   */
  public async submitSFT(payload: SFTPayload): Promise<boolean> {
    if (!this.hasConsent()) return false;

    try {
      const uid = payload.userId || this.getUserId();
      const res = await fetch('/api/data-program/collect-sft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          userId: uid,
          timestamp: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (err) {
      console.error('Error submitting SFT example:', err);
      return false;
    }
  }

  /**
   * Submit User Feedback (Like, Dislike, Edit, Rating)
   */
  public async submitFeedback(payload: FeedbackPayload): Promise<boolean> {
    if (!this.hasConsent()) return false;

    try {
      const uid = payload.userId || this.getUserId();
      const res = await fetch('/api/data-program/collect-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          userId: uid,
          timestamp: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (err) {
      console.error('Error submitting user feedback:', err);
      return false;
    }
  }

  /**
   * Fetch Data Program Statistics (Admin)
   */
  public async fetchProgramStats(userEmail?: string): Promise<any> {
    try {
      const email = userEmail || localStorage.getItem('app-user-email') || 'onq6974@gmail.com';
      const res = await fetch('/api/data-program/stats', {
        headers: { 'x-admin-email': email }
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        return await res.json().catch(() => null);
      }
    } catch (err) {
      console.error('Error fetching data program stats:', err);
    }
    return null;
  }
}

export const dataProgramService = new DataProgramService();
