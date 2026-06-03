import "dotenv/config";
import { defineConfig, env } from "prisma/config";

if (!process.env.REAL_DATABASE_URL || process.env.REAL_DATABASE_URL === 'undefined') {
  process.env.REAL_DATABASE_URL = "file:./dev.db";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("REAL_DATABASE_URL"),
  },
});
