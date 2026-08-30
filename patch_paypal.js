const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const paypalCreateOrder = `        const orderResData = await orderRes.json();
        
        if (orderResData.id) {`;
const paypalCreateOrderPatched = `        const orderResData = await orderRes.json();
        console.log("PayPal Order Response:", orderResData);
        
        if (orderResData.id) {`;

code = code.replace(paypalCreateOrder, paypalCreateOrderPatched);

const paypalToken = `        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;`;
const paypalTokenPatched = `        const tokenData = await tokenRes.json();
        console.log("PayPal Token Response:", tokenData);
        const accessToken = tokenData.access_token;`;

code = code.replace(paypalToken, paypalTokenPatched);

fs.writeFileSync('server.ts', code);
