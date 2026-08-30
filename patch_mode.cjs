const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "if (data.paypalClientSecret) process.env.PAYPAL_CLIENT_SECRET = data.paypalClientSecret;",
  "if (data.paypalClientSecret) process.env.PAYPAL_CLIENT_SECRET = data.paypalClientSecret;\n        if (data.paypalMode) process.env.PAYPAL_MODE = data.paypalMode;"
);
fs.writeFileSync('server.ts', code);
