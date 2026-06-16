const pw = await import(process.env.PW_MODULE || "playwright");
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = process.env.BASE || "http://127.0.0.1:8123";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200); // laisse le WS amorcer + animations
await page.screenshot({ path: "/tmp/dashboard.png" });

await page.goto(`${BASE}/#admin`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/admin.png" });

await browser.close();
console.log("screenshots OK");
