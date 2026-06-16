// Utilitaire de prévisualisation (Playwright). Lancer avec :
//   PW_MODULE="$(npm root -g)/playwright/index.js" PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   BASE=http://127.0.0.1:8123 node shot.mjs
const pw = await import(process.env.PW_MODULE || "playwright");
const chromium = pw.chromium ?? pw.default?.chromium;

const BASE = process.env.BASE || "http://127.0.0.1:8123";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: "/tmp/dashboard.png" });

// Pilote le panneau Jarvis : pose une question et attend la réponse en direct.
await page.getByPlaceholder("Poser une question à Jarvis…").fill(
  "Que faire si l'imprimante affiche le code E2 ?",
);
await page.getByRole("button", { name: "ENVOYER" }).click();
await page.waitForTimeout(2500); // laisse les rag.event diffuser la réponse
await page.screenshot({ path: "/tmp/dashboard_rag.png" });

await page.goto(`${BASE}/#monitoring`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "/tmp/monitoring.png" });

await page.goto(`${BASE}/#admin`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "/tmp/admin.png" });

await browser.close();
console.log("screenshots OK");
