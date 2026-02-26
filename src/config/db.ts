import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

dotenv.config();

console.log("✅ db.ts file loaded")
console.log("DATABASE_URL:", process.env.DATABASE_URL)


const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const prisma = new PrismaClient({ adapter })