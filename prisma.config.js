import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node src/database/seed.js",

  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
