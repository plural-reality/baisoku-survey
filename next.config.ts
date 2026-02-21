import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Keep local/preview environments on the in-app LP for development.
    if (process.env.VERCEL_ENV !== "production") {
      return [];
    }

    return [
      {
        source: "/lp",
        destination: "https://plural-reality.com/solution/baisoku-survey",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
