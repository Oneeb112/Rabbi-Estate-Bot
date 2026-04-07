import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Prisma Client test passed');
}
main();
