/**
 * Test script for export gate functionality
 * Run with: npx tsx scripts/test-export-gate.ts
 */

import prisma from '../src/lib/db';
import { exportGatekeeper } from '../src/lib/enforcement/export-gate';
import { placeholderDetector } from '../src/lib/enforcement/placeholder-detector';

async function main() {
  console.log('=== Export Gate Test ===\n');

  // 1. Create test organization
  console.log('1. Creating test organization...');
  const org = await prisma.organization.upsert({
    where: { id: 'test-org-1' },
    update: {},
    create: {
      id: 'test-org-1',
      name: 'Test Nonprofit',
    }
  });
  console.log(`   Created org: ${org.id}\n`);

  // 2. Create test user
  console.log('2. Creating test user...');
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: { organizationId: org.id },
    create: {
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      organizationId: org.id,
    }
  });
  console.log(`   Created user: ${user.id}\n`);

  // 3. Create test proposal with sections
  console.log('3. Creating test proposal...');
  const proposal = await prisma.proposal.upsert({
    where: { id: 'test-proposal-1' },
    update: {},
    create: {
      id: 'test-proposal-1',
      title: 'Test Grant Proposal',
      organizationId: org.id,
      status: 'DRAFT',
    }
  });
  console.log(`   Created proposal: ${proposal.id}\n`);

  // 4. Create required sections
  console.log('4. Creating proposal sections...');
  
  // Executive Summary - complete
  await prisma.proposalSection.upsert({
    where: { id: 'test-section-exec' },
    update: { content: '<p>This is a complete executive summary with enough content to pass the minimum threshold. Our organization seeks funding to expand youth mentorship programs in underserved communities.</p>' },
    create: {
      id: 'test-section-exec',
      proposalId: proposal.id,
      sectionName: 'Executive Summary',
      content: '<p>This is a complete executive summary with enough content to pass the minimum threshold. Our organization seeks funding to expand youth mentorship programs in underserved communities.</p>',
      order: 1,
      isRequired: true,
    }
  });

  // Statement of Need - complete
  await prisma.proposalSection.upsert({
    where: { id: 'test-section-need' },
    update: { content: '<p>There is a significant need for youth mentorship in our community. Studies show that 65% of at-risk youth lack access to positive role models. Our program has served over 500 youth since 2019.</p>' },
    create: {
      id: 'test-section-need',
      proposalId: proposal.id,
      sectionName: 'Statement of Need',
      content: '<p>There is a significant need for youth mentorship in our community. Studies show that 65% of at-risk youth lack access to positive role models. Our program has served over 500 youth since 2019.</p>',
      order: 2,
      isRequired: true,
    }
  });

  // Budget - with placeholder
  await prisma.proposalSection.upsert({
    where: { id: 'test-section-budget' },
    update: { content: '<p>Our total budget request is [[PLACEHOLDER:MISSING_DATA:Total budget amount:ph_budget_001]]. Personnel costs represent 60% of the budget.</p>' },
    create: {
      id: 'test-section-budget',
      proposalId: proposal.id,
      sectionName: 'Budget',
      content: '<p>Our total budget request is [[PLACEHOLDER:MISSING_DATA:Total budget amount:ph_budget_001]]. Personnel costs represent 60% of the budget.</p>',
      order: 3,
      isRequired: true,
    }
  });

  console.log('   Created 3 sections\n');

  // 4b. Scan and persist placeholders (simulating generation flow)
  console.log('4b. Scanning for placeholders...');
  const placeholderSummary = await placeholderDetector.scanAndPersistPlaceholders(proposal.id);
  console.log(`   Found ${placeholderSummary.total} placeholders (${placeholderSummary.unresolved} unresolved)\n`);

  // 5. Test export gate - should BLOCK due to placeholder
  console.log('5. Testing export gate (should BLOCK due to placeholder)...');
  try {
    const { gateResult, enforcementData } = await exportGatekeeper.evaluate(
      proposal.id,
      user.id,
      'DOCX'
    );

    console.log(`   Decision: ${gateResult.decision}`);
    console.log(`   Allowed: ${gateResult.allowed}`);
    
    if (gateResult.blocks.length > 0) {
      console.log(`   Blocks (${gateResult.blocks.length}):`);
      for (const block of gateResult.blocks) {
        console.log(`     - [${block.ruleId}] ${block.reason}`);
      }
    }
    
    if (gateResult.warnings.length > 0) {
      console.log(`   Warnings (${gateResult.warnings.length}):`);
      for (const warn of gateResult.warnings) {
        console.log(`     - [${warn.ruleId}] ${warn.message}`);
      }
    }
  } catch (error) {
    console.error('   Error:', error);
  }

  // 6. Fix the placeholder and test again
  console.log('\n6. Fixing placeholder and testing again...');
  await prisma.proposalSection.update({
    where: { id: 'test-section-budget' },
    data: {
      content: '<p>Our total budget request is $150,000. Personnel costs represent 60% of the budget.</p>'
    }
  });
  
  // Re-scan after content change
  await placeholderDetector.scanAndPersistPlaceholders(proposal.id);

  try {
    const { gateResult } = await exportGatekeeper.evaluate(
      proposal.id,
      user.id,
      'DOCX'
    );

    console.log(`   Decision: ${gateResult.decision}`);
    console.log(`   Allowed: ${gateResult.allowed}`);
    
    if (gateResult.blocks.length > 0) {
      console.log(`   Blocks (${gateResult.blocks.length}):`);
      for (const block of gateResult.blocks) {
        console.log(`     - [${block.ruleId}] ${block.reason}`);
      }
    } else {
      console.log('   No blocks!');
    }
    
    if (gateResult.warnings.length > 0) {
      console.log(`   Warnings (${gateResult.warnings.length}):`);
      for (const warn of gateResult.warnings) {
        console.log(`     - [${warn.ruleId}] ${warn.message}`);
      }
    } else {
      console.log('   No warnings!');
    }
  } catch (error) {
    console.error('   Error:', error);
  }

  // 7. Check audit log
  console.log('\n7. Checking audit log...');
  const auditLogs = await prisma.exportAuditLog.findMany({
    where: { proposalId: proposal.id },
    orderBy: { timestamp: 'desc' },
    take: 5
  });
  console.log(`   Found ${auditLogs.length} audit records`);
  for (const log of auditLogs) {
    console.log(`     - ${log.timestamp.toISOString()}: ${log.decision}`);
  }

  console.log('\n=== Test Complete ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
