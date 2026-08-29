const routePrefixes = ["/api/worker", "/api/integrations/n8n"];
const exactRoutes = new Set(["/api/t1/sync"]);

export function usesInternalBearerAuthentication(pathname: string) {
  if (exactRoutes.has(pathname)) return true;
  return routePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
