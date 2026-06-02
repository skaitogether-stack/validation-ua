import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql", "@prisma/client", ".prisma/client"],
};

export default nextConfig;
