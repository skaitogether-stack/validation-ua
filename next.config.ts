import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql", "@prisma/client", ".prisma/client"],
  async rewrites() {
    return [
      {
        source: "/ai-calculator",
        destination: "/ai-calculator.html",
      },
    ];
  },
};

export default nextConfig;
