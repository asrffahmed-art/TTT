/**
 * OTP and Device Verification Service for THOTH AI
 * Handles email verification OTPs and trusted device identification in Firestore.
 */

export interface DeviceInfo {
  deviceId: string;
  name?: string;
  browser: string;
  os: string;
  userAgent: string;
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('thoth_device_id');
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('thoth_device_id', deviceId);
  }
  return deviceId;
}

export function getDeviceInfo(): DeviceInfo {
  const deviceId = getDeviceId();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  let browser = 'متصفح ويب';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome')) browser = 'Google Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  let os = 'نظام تشغيل';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    deviceId,
    name: `${browser} على ${os}`,
    browser,
    os,
    userAgent: ua.slice(0, 200)
  };
}

export interface SendOtpResult {
  success: boolean;
  message?: string;
  error?: string;
  expiresAt?: string;
  email?: string;
  previewOtp?: string;
  method?: string;
}

export async function sendOtp(
  email: string,
  purpose: 'register' | 'login_new_device' | 'verify_email',
  name?: string
): Promise<SendOtpResult> {
  try {
    const deviceInfo = getDeviceInfo();
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        purpose,
        deviceId: deviceInfo.deviceId,
        deviceInfo,
        name: name || ''
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'فشل إرسال رمز التحقق' };
    }
    return data;
  } catch (err: any) {
    console.error('Error sending OTP:', err);
    return { success: false, error: err.message || 'حدث خطأ في الاتصال بالخادم' };
  }
}

export interface VerifyOtpResult {
  success: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: 'register' | 'login_new_device' | 'verify_email',
  userId?: string
): Promise<VerifyOtpResult> {
  try {
    const deviceInfo = getDeviceInfo();
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        purpose,
        deviceId: deviceInfo.deviceId,
        deviceInfo,
        userId: userId || ''
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية' };
    }
    return data;
  } catch (err: any) {
    console.error('Error verifying OTP:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء التحقق' };
  }
}

export interface CheckDeviceResult {
  exists: boolean;
  userId?: string;
  isTrustedDevice?: boolean;
  emailVerified?: boolean;
  user?: {
    name: string;
    email: string;
    country: string;
    avatar: string;
  };
  error?: string;
}

export async function checkDevice(email: string): Promise<CheckDeviceResult> {
  try {
    const deviceId = getDeviceId();
    const res = await fetch('/api/auth/check-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        deviceId
      })
    });

    const data = await res.json();
    if (!res.ok) {
      return { exists: false, isTrustedDevice: false, error: data.error };
    }
    return data;
  } catch (err: any) {
    console.error('Error checking device status:', err);
    return { exists: false, isTrustedDevice: false, error: err.message };
  }
}
