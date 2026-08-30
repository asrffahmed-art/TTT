const fetch = require('node-fetch'); // Make sure we use native fetch in node 18+ or node-fetch
async function test() {
  const paypalClientId = "ASJxjbJT5P_M2Q1TK33v_6gH9OKoOSmV9ENt3--O8mSx5ypfR95r8m6z8URQJBMJup9OuR4-ccvnPAsc";
  const paypalSecret = "EBNPoCuhLlLj17tK7Ylnh2nvMQPr95Ld57vQqYT3pqvID5FfgCPvCQtrKu-tnH1Bmc1O2-Jy4WhYP-dP";
  const baseUrl = 'https://api-m.paypal.com';

  const auth = Buffer.from(`${paypalClientId}:${paypalSecret}`).toString('base64');
  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const tokenData = await tokenRes.json();
  console.log("Token Data:", tokenData);

  if (!tokenData.access_token) return;

  const accessToken = tokenData.access_token;
  const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: "test_order",
        amount: { currency_code: 'USD', value: "5.00" },
        description: `THOTH Subscription - test`
      }],
      application_context: {
        return_url: `http://localhost/api/payment/paypal/capture`,
        cancel_url: `http://localhost/#subscription`
      }
    })
  });
  const orderResData = await orderRes.json();
  console.log("Order Data:", orderResData);
}
test();
