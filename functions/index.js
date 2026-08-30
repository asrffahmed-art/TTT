const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Firebase Cloud Function: sendOtp
 * Generates a 6-digit OTP code, saves it to Firestore 'auth_verifications' with expiration (10 minutes),
 * and dispatches an email to the user via Nodemailer/SMTP.
 */
exports.sendOtp = functions.https.onCall(async (data, context) => {
  const { email, purpose = "register", name = "", deviceId = "unknown", deviceInfo = {} } = data || {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new functions.https.HttpsError("invalid-argument", "عنوان البريد الإلكتروني غير صالح.");
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanPurpose = purpose || "register";
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = new Date(now + 10 * 60 * 1000).toISOString(); // 10 minutes expiry
  const createdAt = new Date(now).toISOString();

  const db = admin.firestore();
  const verificationId = `${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanPurpose}`;

  // Store OTP in Firestore securely
  await db.collection("auth_verifications").doc(verificationId).set({
    email: cleanEmail,
    code: otpCode,
    purpose: cleanPurpose,
    deviceId,
    deviceInfo,
    expiresAt,
    attempts: 0,
    verified: false,
    createdAt,
    updatedAt: createdAt
  }, { merge: true });

  // Send Email using Nodemailer if SMTP configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpFrom = process.env.SMTP_FROM || `"THOTH AI" <noreply@thoth-ai.com>`;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; background-color: #0b0f19; padding: 40px 20px; color: #ffffff;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #141824; border: 1px solid #2e3548; border-radius: 20px; padding: 32px; text-align: center;">
            <h1 style="color: #6366f1; margin: 0; font-size: 24px;">THOTH AI</h1>
            <h2 style="font-size: 18px; color: #ffffff; margin-top: 16px;">رمز التحقق (OTP)</h2>
            <p style="font-size: 14px; color: #cbd5e1;">مرحباً ${name}، رمز التحقق الخاص بك هو:</p>
            <div style="background: rgba(99, 102, 241, 0.1); border: 2px dashed #6366f1; border-radius: 12px; padding: 18px; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #818cf8; font-family: monospace;">${otpCode}</span>
            </div>
            <p style="font-size: 12px; color: #64748b;">هذا الرمز صالح لمدة 10 دقائق فقط. لا تشارك هذا الرمز مع أي شخص.</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: smtpFrom,
        to: cleanEmail,
        subject: `رمز التحقق الخاص بك في THOTH: ${otpCode}`,
        html: htmlContent
      });
    } catch (err) {
      console.error("Error dispatching OTP email:", err);
    }
  } else {
    console.log(`[FIREBASE FUNCTION OTP GENERATED FOR ${cleanEmail}]: ${otpCode}`);
  }

  return {
    success: true,
    message: "تم إرسال رمز التحقق بنجاح إلى البريد الإلكتروني",
    email: cleanEmail,
    expiresAt
  };
});

/**
 * Firebase Cloud Function: verifyOtp
 * Verifies the 6-digit OTP code against Firestore records, enforcing expiration and max attempts limit (5).
 */
exports.verifyOtp = functions.https.onCall(async (data, context) => {
  const { email, code, purpose = "register" } = data || {};

  if (!email || !code) {
    throw new functions.https.HttpsError("invalid-argument", "يرجى تقديم البريد الإلكتروني ورمز التحقق.");
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = code.toString().trim();
  const cleanPurpose = purpose || "register";

  const db = admin.firestore();
  const verificationId = `${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanPurpose}`;
  const docRef = db.collection("auth_verifications").doc(verificationId);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "لم يتم العثور على رمز تحقق نشط لهذا البريد. يرجى طلب رمز جديد.");
  }

  const vData = snap.data();

  // Expiration check
  if (Date.now() > new Date(vData.expiresAt).getTime()) {
    throw new functions.https.HttpsError("deadline-exceeded", "انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.");
  }

  // Max attempts check (5 attempts max)
  if ((vData.attempts || 0) >= 5) {
    throw new functions.https.HttpsError("resource-exhausted", "تم تجاوز الحد الأقصى للمحاولات الخاطئة. يرجى طلب رمز جديد.");
  }

  // Verify code match
  if (vData.code !== cleanCode) {
    await docRef.update({
      attempts: admin.firestore.FieldValue.increment(1),
      lastAttemptAt: new Date().toISOString()
    });
    throw new functions.https.HttpsError("permission-denied", "رمز التحقق غير صحيح. يرجى التأكد وإعادة المحاولة.");
  }

  // Mark verified in Firestore
  await docRef.update({
    verified: true,
    verifiedAt: new Date().toISOString()
  });

  return {
    success: true,
    verified: true,
    message: "تم التحقق من الرمز بنجاح"
  };
});
