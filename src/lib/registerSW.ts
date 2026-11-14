/** Jediné miesto registrácie service workera (offline režim). V náhľadoch a vo vývoji sa nikdy neregistruje. */
function isRefused(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname.toLowerCase();
  const first = h.split(".")[0] ?? "";
  if (/\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h) && /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first)) return true;
  if (/^project--[^.]+-dev\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h)) return true;
  if (/(^|\.)lovableproject(-dev)?\.com$/.test(h) || /(^|\.)beta\.lovable\.dev$/.test(h)) return true;
  return new URLSearchParams(window.location.search).get("sw") === "off";
}

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefused()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
    return;
  }
  try { await navigator.serviceWorker.register("/sw.js"); } catch { /* offline režim je voliteľný */ }
}
