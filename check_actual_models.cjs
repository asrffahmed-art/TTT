async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/admin/api-keys", {
      headers: { "x-admin-email": "onq6974@gmail.com" }
    });
    const data = await res.json();
    const apiKey = data.keys.geminiApiKey; // Note: if the API returns masked, this script won't work. Let's check how the admin API returns it.
    console.log("Key starts with:", apiKey ? apiKey.substring(0, 5) : 'null');
  } catch(e) {
    console.log(e);
  }
}
run();
