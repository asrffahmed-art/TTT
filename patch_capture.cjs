const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "return res.redirect(`/api/payment/verify-success?success=true&orderId=${orderId}&userId=${userId}&planId=${planId}`);",
  `if (req.headers.accept && req.headers.accept.includes('application/json')) {
             return res.json({ success: true, orderId, userId, planId });
         }
         return res.redirect(\`/api/payment/verify-success?success=true&orderId=\${orderId}&userId=\${userId}&planId=\${planId}\`);`
);

code = code.replace(
  "return res.redirect('/api/payment/verify-success?success=false');",
  `if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(400).json({ success: false });
         }
         return res.redirect('/api/payment/verify-success?success=false');`
);

code = code.replace(
  "res.redirect('/api/payment/verify-success?success=false');",
  `if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false });
       }
       res.redirect('/api/payment/verify-success?success=false');`
);

fs.writeFileSync('server.ts', code);
