import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getCloudflareAccessConfig,
  verifyCloudflareAccessToken,
} from "@/lib/cloudflare-access";

export async function proxy(request: NextRequest) {
  const config = getCloudflareAccessConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Cloudflare Access validation is not configured" },
      { status: 503 },
    );
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    return NextResponse.json(
      { error: "Cloudflare Access token is required" },
      { status: 401 },
    );
  }

  try {
    const identity = await verifyCloudflareAccessToken(token, config);
    const headers = new Headers(request.headers);
    headers.set("x-mano-admin-user", String(identity.email));
    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json(
      { error: "Cloudflare Access token is invalid" },
      { status: 403 },
    );
  }
}

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
