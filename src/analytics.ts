const DEFAULT_CLOUDFLARE_ANALYTICS_TOKEN = "b8cbb0db664d4ccd9714f9baee710e5e";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function installPublicAnalytics() {
  const token = (import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN as string | undefined)?.trim()
    || DEFAULT_CLOUDFLARE_ANALYTICS_TOKEN;
  if (!import.meta.env.PROD || !token || location.protocol !== "https:" || LOCAL_HOSTS.has(location.hostname)) return false;
  if (document.querySelector('script[data-brain-practical-analytics="cloudflare"]')) return true;
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.dataset.brainPracticalAnalytics = "cloudflare";
  script.dataset.cfBeacon = JSON.stringify({ token });
  document.body.append(script);
  return true;
}
