const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('server.listen(PORT')) {
  code = code.replace(
    /    \} catch \(err\) \{\n      console\.error\("\[GEMINI LIVE ERROR\] Failed to setup Live API:", err\);\n      if \(ws\.readyState === 1\) \{\n        ws\.send\(JSON\.stringify\(\{ type: 'error', message: 'فشل تهيئة الاتصال المباشر: ' \+ String\(err\) \}\)\);\n      \}\n    \}\n  \}\);\n\}\nstartServer\(\);/g,
    `    } catch (err) {
      console.error("[GEMINI LIVE ERROR] Failed to setup Live API:", err);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'error', message: 'فشل تهيئة الاتصال المباشر: ' + String(err) }));
      }
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
  });
}
startServer();`
  );
  fs.writeFileSync('server.ts', code);
  console.log("Fixed listen!");
} else {
  console.log("Already has listen");
}
