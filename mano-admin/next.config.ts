import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path((?!_next/static|_next/image|favicon.ico).*)",
      headers: [{ key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" }],
    }];
  },
};

export default nextConfig;
