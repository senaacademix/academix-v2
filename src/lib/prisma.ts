process.env.TZ = 'UTC';

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Using globalThis to ensure the instance survives HMR in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL!;

function createPool() {
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
  });

  // Handle unexpected errors on idle clients to prevent app crashes
  pool.on("error", (err) => {
    console.warn("⚠️ Aviso en el pool de PostgreSQL (cliente inactivo reconectando):", err.message);
  });

  return pool;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const pool = createPool();
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    const pool = createPool();
    globalForPrisma.pgPool = pool;
    
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
    
    console.log("🐘 Prisma Client & Connection Pool initialized with error recovery (Singleton)");
  }
  prisma = globalForPrisma.prisma;
}

export default prisma;