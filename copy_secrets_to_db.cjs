const fs = require('fs');

async function run() {
  const res = await fetch("http://localhost:3000/api/admin/api-keys", {
    headers: { "x-admin-email": "onq6974@gmail.com" }
  });
  const data = await res.json();
  console.log("Current DB Keys:", data);
}
run();
