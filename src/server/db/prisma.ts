import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isProduction = process.env.NODE_ENV === "production";
const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost:5432/postgres";
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const adapter = new PrismaPg(new Pool({ connectionString }));

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
