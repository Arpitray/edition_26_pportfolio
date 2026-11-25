import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The artwork (public/art) is large and rarely changes: let browsers keep it for a week and
  // then refresh it in the background, so a return visit loads it from the disk cache.
  // (Not "immutable": the files keep their names when they are replaced.)
  async headers() {
    return [{
      source: "/art/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
    }];
  },
};

export default nextConfig;
