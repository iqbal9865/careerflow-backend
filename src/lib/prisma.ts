import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'], // optional: helpful for debugging
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;