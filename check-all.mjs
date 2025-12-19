import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const accounts = await prisma.account.findMany({
  select: { id: true, userId: true, provider: true, providerAccountId: true }
});
console.log('All accounts:', accounts.length);
accounts.forEach(a => console.log(JSON.stringify(a)));

const users = await prisma.user.findMany({
  select: { id: true, email: true, organizationId: true }
});
console.log('\nAll users:', users.length);
users.forEach(u => console.log(JSON.stringify(u)));

await prisma.$disconnect();
