// Run this script against production:
// DATABASE_URL="your-production-db-url" node scripts/fix-user.mjs

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const EMAIL = 'zach@brightwayai.com';
const NAME = 'Zachary Wagner';
const ORG_NAME = 'Brightway AI';

async function main() {
  console.log('=== Fixing user:', EMAIL, '===\n');

  // 1. Check current state
  let user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { organization: true, accounts: true },
  });
  
  console.log('Current user state:', user ? {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    orgName: user.organization?.name,
    accounts: user.accounts.map(a => ({ provider: a.provider, id: a.providerAccountId })),
  } : 'NOT FOUND');

  // 2. Create or get organization
  let org = user?.organization;
  if (!org) {
    // Check if org exists by name
    org = await prisma.organization.findFirst({
      where: { name: ORG_NAME },
    });
    
    if (!org) {
      console.log('\nCreating new organization...');
      org = await prisma.organization.create({
        data: {
          name: ORG_NAME,
          subscriptionStatus: 'BETA',
        },
      });
      console.log('Created organization:', org.id);
    } else {
      console.log('\nFound existing organization:', org.id);
    }
  }

  // 3. Create or update user
  if (!user) {
    console.log('\nCreating new user...');
    user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: NAME,
        role: 'admin',
        organizationId: org.id,
        hasSeenWelcome: true,
        emailVerified: new Date(),
      },
    });
    console.log('Created user:', user.id);
  } else if (!user.organizationId) {
    console.log('\nLinking user to organization...');
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        organizationId: org.id,
        role: 'admin',
        hasSeenWelcome: true,
      },
    });
    console.log('Updated user with organization');
  }

  // 4. Clean up any duplicate accounts
  const allAccounts = await prisma.account.findMany({
    where: { provider: 'google' },
    include: { user: true },
  });
  
  const duplicateAccounts = allAccounts.filter(a => a.user.email === EMAIL && a.userId !== user.id);
  if (duplicateAccounts.length > 0) {
    console.log('\nFound duplicate accounts, cleaning up...');
    for (const acc of duplicateAccounts) {
      await prisma.account.delete({ where: { id: acc.id } });
      console.log('Deleted duplicate account:', acc.id);
    }
  }

  // 5. Check for duplicate users
  const allUsers = await prisma.user.findMany({
    where: { email: EMAIL },
  });
  
  if (allUsers.length > 1) {
    console.log('\nWARNING: Found multiple users with same email!');
    for (const u of allUsers) {
      console.log('  -', u.id, u.organizationId ? '(has org)' : '(no org)');
    }
    console.log('Keeping user with org, deleting others...');
    
    const userWithOrg = allUsers.find(u => u.organizationId);
    const usersToDelete = allUsers.filter(u => u.id !== userWithOrg?.id);
    
    for (const u of usersToDelete) {
      // Delete accounts first
      await prisma.account.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      console.log('Deleted duplicate user:', u.id);
    }
  }

  // Final state
  const finalUser = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { organization: true, accounts: true },
  });
  
  console.log('\n=== Final state ===');
  console.log({
    id: finalUser.id,
    email: finalUser.email,
    name: finalUser.name,
    role: finalUser.role,
    organizationId: finalUser.organizationId,
    orgName: finalUser.organization?.name,
    orgStatus: finalUser.organization?.subscriptionStatus,
    hasSeenWelcome: finalUser.hasSeenWelcome,
    accounts: finalUser.accounts.map(a => a.provider),
  });
  
  console.log('\n✅ User is ready. SSO will link Google account on first login.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
