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
    // Query logging only in development; it is noisy and exposes the database structure
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;