import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Update user to ensure they skip onboarding
  const user = await prisma.user.update({
    where: { email: 'zach@brightwayai.com' },
    data: {
      hasSeenWelcome: true,
      role: 'admin',
    },
    include: { organization: true, accounts: true },
  });
  
  console.log('Updated user:');
  console.log({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    orgName: user.organization?.name,
    hasSeenWelcome: user.hasSeenWelcome,
    accounts: user.accounts.length,
  });
  
  // Show total users to verify this is production
  const userCount = await prisma.user.count();
  const orgCount = await prisma.organization.count();
  console.log('\nDatabase stats: Users:', userCount, 'Orgs:', orgCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
