import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/lp",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
