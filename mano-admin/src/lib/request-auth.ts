const routePrefixes = ["/api/worker", "/api/integrations/n8n"];
const exactRoutes = new Set(["/api/t1/sync", "/api/t1/monitor", "/api/t1/live-monitor", "/api/integrations/blog/replies"]);

export function usesInternalBearerAuthentication(pathname: string) {
  if (exactRoutes.has(pathname)) return true;
  return routePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
