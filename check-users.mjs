import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  where: { email: 'zach@brightwayai.com' },
  select: { id: true, email: true, name: true, organizationId: true, createdAt: true },
  orderBy: { createdAt: 'asc' }
});
console.log('Users found:', users.length);
users.forEach(u => console.log(JSON.stringify(u)));

await prisma.$disconnect();
