import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const accounts = await prisma.account.findMany({
  where: { userId: 'cmj33idjh0000zvd5vcyufra2' },
  select: { id: true, provider: true, providerAccountId: true }
});
console.log('Accounts found:', accounts.length);
accounts.forEach(a => console.log(JSON.stringify(a)));

await prisma.$disconnect();
