import "dotenv/config";
import { defineConfig } from "prisma/config";

const isProduction = process.env.NODE_ENV === "production";
const isSkippingPrismaGenerate = process.env.SKIP_PRISMA_GENERATE === "1";
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://localhost:5432/postgres";
if (isProduction && !isSkippingPrismaGenerate && !process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
