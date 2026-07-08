import '../config/env.js'; 
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

if (!process.env.DATABASE_URL) {
  throw new Error("Erreur critique : La variable DATABASE_URL est absente du fichier .env");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;