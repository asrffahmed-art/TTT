import crypto from 'crypto';
import { Firestore, doc, setDoc } from 'firebase/firestore';

export interface PaymobIntentionParams {
  amountPiasters: number;
  orderId: string;
  billingData: any;
  integrationIds: number[];
  paymobSecretKey: string;
  appUrl: string;
  userId: string;
  planId: string;
}

/**
 * Creates a payment intention using Paymob's NextGen Intention API.
 * Returns the parsed JSON response which includes client_secret and client_url.
 */
export async function createPaymobIntention(params: PaymobIntentionParams) {
  const { amountPiasters, orderId, billingData, integrationIds, paymobSecretKey, appUrl, userId, planId } = params;

  const authHeader = paymobSecretKey.startsWith('egy_sk_') 
    ? `Secret ${paymobSecretKey}`
    : `Bearer ${paymobSecretKey}`;

  const intentRes = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amountPiasters,
      currency: "EGP",
      special_reference: orderId,
      payment_methods: integrationIds.map(id => isNaN(Number(id)) ? id : Number(id)),
      billing_data: billingData,
      customer: {
        first_name: billingData.first_name || 'Guest',
        last_name: billingData.last_name || 'User',
        email: billingData.email || 'guest@example.com'
      },
      redirection_url: `${appUrl}/api/payment/verify-success?orderId=${orderId}&userId=${userId}&planId=${planId}`
    })
  });

  const contentType = intentRes.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await intentRes.json().catch(() => ({ error: 'استجابة غير صالحة من Paymob' }));
  }
  return { error: `تعذر الاتصال بـ Paymob (رمز ${intentRes.status})` };
}

/**
 * Verifies Paymob's HMAC SHA-512 signature for incoming webhooks.
 * Sorts the 20 canonical fields lexicographically and hashes them.
 */
export function verifyPaymobHmac(hmac: string, obj: any, hmacSecret: string): boolean {
  if (!hmac || !obj || !hmacSecret) return false;

  const calcObj = {
    amount_cents: obj.amount_cents,
    created_at: obj.created_at,
    currency: obj.currency,
    error_occured: obj.error_occured, // single 'r' as per Paymob specs
    has_parent_transaction: obj.has_parent_transaction,
    id: obj.id,
    integration_id: obj.integration_id,
    is_3d_secure: obj.is_3d_secure,
    is_auth: obj.is_auth,
    is_capture: obj.is_capture,
    is_refunded: obj.is_refunded,
    is_standalone_payment: obj.is_standalone_payment,
    is_voided: obj.is_voided,
    order_id: obj.order?.id,
    owner: obj.owner,
    pending: obj.pending,
    source_data_pan: obj.source_data?.pan,
    source_data_sub_type: obj.source_data?.sub_type,
    source_data_type: obj.source_data?.type,
    success: obj.success
  };

  const hmacString = Object.values(calcObj).join('');
  const hashed = crypto.createHmac('sha512', hmacSecret).update(hmacString).digest('hex');

  return hashed === hmac;
}

/**
 * Saves or updates a payment record in Firestore.
 */
export async function savePaymentRecord(db: Firestore, orderId: string, recordData: any) {
  const orderDocRef = doc(db, "paymentOrders", orderId.toString());
  await setDoc(orderDocRef, {
    ...recordData,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
