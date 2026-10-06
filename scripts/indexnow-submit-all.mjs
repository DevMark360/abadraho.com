// One-time (or occasional) IndexNow submission of every URL in the live sitemap.
//
//   INDEXNOW_KEY=your-key node scripts/indexnow-submit-all.mjs [https://abadraho.com]
//
// The key must match the INDEXNOW_KEY set on the server, and https://<site>/indexnow-key.txt must
// already return it (deploy first). After this, admin edits ping IndexNow automatically.
const site = (process.argv[2] || process.env.APP_URL || "https://abadraho.com").replace(/\/$/, "");
const key = process.env.INDEXNOW_KEY?.trim();
if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
  console.error("Set INDEXNOW_KEY (8-128 letters, digits, or dashes).");
  process.exit(1);
}

const keyLocation = `${site}/indexnow-key.txt`;
const served = await fetch(keyLocation).then((r) => (r.ok ? r.text() : "")).catch(() => "");
if (served.trim() !== key) {
  console.error(`${keyLocation} does not return this key yet. Set INDEXNOW_KEY on the server and deploy first.`);
  process.exit(1);
}

const xml = await fetch(`${site}/sitemap.xml`).then((r) => r.text());
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urls.length) {
  console.error("No URLs found in sitemap.xml");
  process.exit(1);
}

// IndexNow accepts up to 10,000 URLs per request.
for (let i = 0; i < urls.length; i += 10_000) {
  const urlList = urls.slice(i, i + 10_000);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(site).host, key, keyLocation, urlList }),
  });
  // 200 = accepted, 202 = accepted (key validation pending); anything else is an error.
  console.log(`Submitted ${urlList.length} URLs: HTTP ${res.status}`);
}
