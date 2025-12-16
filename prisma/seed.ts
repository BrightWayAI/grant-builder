import { PrismaClient, SubscriptionStatus, DocumentType, DocumentStatus, ProposalStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Find existing user
  const existingUser = await prisma.user.findUnique({
    where: { email: 'zach@brightwayai.com' },
    include: { organization: true }
  })

  let organization = existingUser?.organization

  if (!organization) {
    // Create organization
    organization = await prisma.organization.create({
      data: {
        name: 'Community Health Initiative',
        ein: '84-3921567',
        mission: 'Community Health Initiative works to eliminate health disparities in underserved communities through accessible healthcare programs, preventive education, and community-based wellness initiatives. We believe everyone deserves quality healthcare regardless of their zip code or income level.',
        geographicFocus: {
          countries: ['United States'],
          states: ['California', 'Nevada', 'Arizona'],
          regions: ['Southwest']
        },
        budgetRange: '$1M-$5M',
        populationsServed: 'Low-income families, uninsured individuals, immigrant communities, rural populations',
        programAreas: ['Healthcare Access', 'Mental Health Services', 'Maternal Health', 'Chronic Disease Prevention', 'Community Health Workers'],
        orgType: '501c3',
        fundingMin: 25000,
        fundingMax: 500000,
        grantTypes: ['federal', 'foundation', 'state'],
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        seatsPurchased: 5,
        proposalsUsedThisMonth: 3,
        proposalResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })
    console.log('✅ Created organization:', organization.name)
  }

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: 'zach@brightwayai.com',
        name: 'Zach Wagner',
        role: 'admin',
        organizationId: organization.id,
      }
    })
    console.log('✅ Created user: zach@brightwayai.com')
  } else {
    // Update user to link to organization if not already
    if (!existingUser.organizationId) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { organizationId: organization.id }
      })
      console.log('✅ Updated user with organization')
    }
  }

  // Create documents
  const documents = [
    {
      filename: 'CHI_Annual_Report_2024.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://storage.example.com/docs/annual-report-2024.pdf',
      fileSize: 2456789,
      documentType: DocumentType.ANNUAL_REPORT,
      programArea: 'Organization Overview',
      status: DocumentStatus.INDEXED,
    },
    {
      filename: 'Mobile_Health_Clinic_Program.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://storage.example.com/docs/mobile-clinic-program.pdf',
      fileSize: 1234567,
      documentType: DocumentType.PROGRAM_DESCRIPTION,
      programArea: 'Healthcare Access',
      status: DocumentStatus.INDEXED,
    },
    {
      filename: 'Mental_Health_First_Aid_Logic_Model.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://storage.example.com/docs/mhfa-logic-model.pdf',
      fileSize: 567890,
      documentType: DocumentType.LOGIC_MODEL,
      programArea: 'Mental Health Services',
      status: DocumentStatus.INDEXED,
    },
    {
      filename: 'Impact_Report_Q3_2024.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://storage.example.com/docs/impact-q3-2024.pdf',
      fileSize: 1876543,
      documentType: DocumentType.IMPACT_REPORT,
      programArea: 'Organization Overview',
      status: DocumentStatus.INDEXED,
    },
    {
      filename: 'Leadership_Team_Bios.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileUrl: 'https://storage.example.com/docs/staff-bios.docx',
      fileSize: 345678,
      documentType: DocumentType.STAFF_BIOS,
      status: DocumentStatus.INDEXED,
    },
    {
      filename: 'Form_990_2023.pdf',
      fileType: 'application/pdf',
      fileUrl: 'https://storage.example.com/docs/form-990-2023.pdf',
      fileSize: 4567890,
      documentType: DocumentType.FORM_990,
      status: DocumentStatus.INDEXED,
    },
  ]

  for (const doc of documents) {
    const existing = await prisma.document.findFirst({
      where: { organizationId: organization.id, filename: doc.filename }
    })
    if (!existing) {
      await prisma.document.create({
        data: {
          ...doc,
          organizationId: organization.id,
        }
      })
    }
  }
  console.log('✅ Created documents')

  // Create proposals
  const proposals = [
    {
      title: 'HRSA Community Health Center Expansion',
      funderName: 'Health Resources & Services Administration',
      programTitle: 'Health Center Cluster',
      deadline: new Date('2025-02-15'),
      fundingAmountMin: 650000,
      fundingAmountMax: 650000,
      status: ProposalStatus.IN_PROGRESS,
      eligibility: ['501(c)(3)', 'FQHC or FQHC Look-Alike', 'Provide primary care services'],
      sections: [
        { sectionName: 'Project Abstract', description: 'A concise summary of the proposed project', wordLimit: 300, order: 1, content: 'Community Health Initiative proposes to expand our mobile health clinic program to serve three additional rural communities in Southern California. This $650,000 project will provide primary care services to an estimated 4,500 new patients annually, reducing emergency room visits and improving health outcomes for underserved populations.', generatedContent: 'Community Health Initiative proposes to expand our mobile health clinic program to serve three additional rural communities in Southern California. This $650,000 project will provide primary care services to an estimated 4,500 new patients annually, reducing emergency room visits and improving health outcomes for underserved populations.' },
        { sectionName: 'Statement of Need', description: 'Describe the community needs this project addresses', wordLimit: 1000, order: 2, content: '', generatedContent: 'The communities of Imperial Valley, Riverside County, and San Bernardino County face significant healthcare access challenges. According to the California Health Care Foundation, these regions have only 42 primary care physicians per 100,000 residents—well below the state average of 78. The consequences are severe: 28% of residents report delaying necessary medical care, diabetes rates are 40% higher than the state average, and preventable emergency room visits cost local hospitals an estimated $12 million annually.\n\nOur mobile health clinic has served these communities since 2019, but demand far exceeds our current capacity. Last year alone, we turned away over 2,000 patients due to scheduling constraints. Community surveys indicate that transportation remains the primary barrier to healthcare access, with 67% of respondents lacking reliable transportation to fixed clinic locations.' },
        { sectionName: 'Goals and Objectives', description: 'Outline measurable project goals', wordLimit: 800, order: 3, content: '', generatedContent: '' },
        { sectionName: 'Work Plan', description: 'Detailed implementation timeline and activities', wordLimit: 1500, order: 4, content: '', generatedContent: '' },
        { sectionName: 'Evaluation Plan', description: 'How you will measure success', wordLimit: 600, order: 5, content: '', generatedContent: '' },
        { sectionName: 'Budget Narrative', description: 'Justify all budget line items', wordLimit: 1000, order: 6, content: '', generatedContent: '' },
      ]
    },
    {
      title: 'Mental Health First Aid Training Program',
      funderName: 'California Mental Health Services Authority',
      programTitle: 'Community Mental Health Innovation Grant',
      deadline: new Date('2025-01-30'),
      fundingAmountMin: 75000,
      fundingAmountMax: 75000,
      status: ProposalStatus.DRAFT,
      eligibility: ['California-based nonprofit', 'Mental health service provider'],
      sections: [
        { sectionName: 'Executive Summary', description: 'Overview of the proposed program', wordLimit: 500, order: 1, content: '', generatedContent: '' },
        { sectionName: 'Program Design', description: 'Detailed description of activities', wordLimit: 1200, order: 2, content: '', generatedContent: '' },
        { sectionName: 'Target Population', description: 'Who will be served', wordLimit: 400, order: 3, content: '', generatedContent: '' },
        { sectionName: 'Outcomes & Metrics', description: 'Expected results and measurement', wordLimit: 600, order: 4, content: '', generatedContent: '' },
      ]
    },
    {
      title: 'Maternal Health Community Navigator Program',
      funderName: 'Robert Wood Johnson Foundation',
      programTitle: 'Culture of Health Leaders',
      deadline: new Date('2024-12-20'),
      fundingAmountMin: 150000,
      fundingAmountMax: 200000,
      status: ProposalStatus.SUBMITTED,
      eligibility: ['501(c)(3)', 'Track record in maternal health'],
      sections: [
        { sectionName: 'Project Narrative', description: 'Full description of proposed work', wordLimit: 2500, order: 1, content: 'Our Maternal Health Community Navigator Program will train and deploy 15 community health workers to provide culturally responsive prenatal and postpartum support to pregnant women in underserved communities. Navigators will help clients access prenatal care, connect with social services, and receive education on healthy pregnancy practices.\n\nThis evidence-based approach has been shown to reduce preterm births by 22% and decrease maternal mortality rates in similar populations. Our team brings extensive experience in community health worker training, having graduated over 200 CHWs in the past five years with a 94% job placement rate.', generatedContent: 'Our Maternal Health Community Navigator Program will train and deploy 15 community health workers to provide culturally responsive prenatal and postpartum support to pregnant women in underserved communities.' },
        { sectionName: 'Theory of Change', description: 'Logic model and pathway to impact', wordLimit: 800, order: 2, content: 'Input: 15 trained community health worker navigators, partnerships with 8 local clinics\nActivities: Home visits, care coordination, health education, social service referrals\nOutputs: 600 pregnant women served annually, 3,600 home visits, 1,200 clinic appointments facilitated\nOutcomes: 20% increase in first-trimester prenatal care initiation, 15% reduction in low birth weight babies, 25% improvement in postpartum follow-up rates', generatedContent: '' },
        { sectionName: 'Organizational Capacity', description: 'Why your org is qualified', wordLimit: 600, order: 3, content: '', generatedContent: '' },
        { sectionName: 'Sustainability Plan', description: 'How will work continue after grant', wordLimit: 400, order: 4, content: '', generatedContent: '' },
      ]
    },
    {
      title: 'CDC Diabetes Prevention Program',
      funderName: 'Centers for Disease Control and Prevention',
      programTitle: 'DP18-1817',
      deadline: new Date('2024-11-01'),
      fundingAmountMin: 400000,
      fundingAmountMax: 400000,
      status: ProposalStatus.WON,
      eligibility: ['Recognized DPP provider', 'Experience serving high-risk populations'],
      sections: [
        { sectionName: 'Abstract', wordLimit: 300, order: 1, content: 'Community Health Initiative will expand our CDC-recognized Diabetes Prevention Program to serve 500 additional high-risk adults across three counties over two years.', generatedContent: '' },
        { sectionName: 'Specific Aims', wordLimit: 500, order: 2, content: 'Aim 1: Enroll 500 adults with prediabetes in our lifestyle change program\nAim 2: Achieve average weight loss of 5% among 60% of participants\nAim 3: Reduce progression to Type 2 diabetes by 40% compared to control population', generatedContent: '' },
        { sectionName: 'Research Strategy', wordLimit: 2000, order: 3, content: '', generatedContent: '' },
      ]
    },
  ]

  for (const proposalData of proposals) {
    const { sections, ...proposalFields } = proposalData
    
    const existing = await prisma.proposal.findFirst({
      where: { organizationId: organization.id, title: proposalFields.title }
    })
    
    if (!existing) {
      const proposal = await prisma.proposal.create({
        data: {
          ...proposalFields,
          organizationId: organization.id,
        }
      })

      for (const section of sections) {
        await prisma.proposalSection.create({
          data: {
            ...section,
            proposalId: proposal.id,
          }
        })
      }
    }
  }
  console.log('✅ Created proposals with sections')

  // Create saved grants
  const savedGrants = [
    {
      grantId: 'HRSA-25-001',
      title: 'Primary Care Training and Enhancement Program',
      funderName: 'Health Resources & Services Administration',
      deadline: new Date('2025-03-15'),
      awardFloor: 250000,
      awardCeiling: 750000,
      description: 'Supports innovative primary care training programs that prepare primary care providers to practice in underserved communities.',
      eligibleTypes: ['Nonprofits', 'State governments', 'Public universities'],
      categories: ['Healthcare', 'Education', 'Workforce Development'],
      matchScore: 94,
    },
    {
      grantId: 'CDC-RFA-2025-007',
      title: 'Community Health Worker Training Initiative',
      funderName: 'Centers for Disease Control and Prevention',
      deadline: new Date('2025-02-28'),
      awardFloor: 100000,
      awardCeiling: 500000,
      description: 'Funding to establish or expand community health worker training programs focused on chronic disease prevention and health equity.',
      eligibleTypes: ['Nonprofits', 'Tribal organizations', 'State agencies'],
      categories: ['Healthcare', 'Community Development', 'Training'],
      matchScore: 91,
    },
    {
      grantId: 'RWJF-2025-CHE',
      title: 'Culture of Health Equity Initiative',
      funderName: 'Robert Wood Johnson Foundation',
      deadline: new Date('2025-04-01'),
      awardFloor: 150000,
      awardCeiling: 300000,
      description: 'Multi-year grants for organizations working to advance health equity through community-driven approaches and policy advocacy.',
      eligibleTypes: ['501(c)(3) organizations'],
      categories: ['Health Equity', 'Policy', 'Community Organizing'],
      matchScore: 88,
    },
    {
      grantId: 'SAMHSA-2025-MH',
      title: 'Community Mental Health Services Block Grant',
      funderName: 'SAMHSA',
      deadline: new Date('2025-05-15'),
      awardFloor: 200000,
      awardCeiling: 600000,
      description: 'Supports the development of community-based mental health services for adults with serious mental illness and children with emotional disturbances.',
      eligibleTypes: ['State agencies', 'Nonprofits with state partnership'],
      categories: ['Mental Health', 'Community Services'],
      matchScore: 85,
    },
    {
      grantId: 'KRESGE-2025-HH',
      title: 'Healthy Environments Initiative',
      funderName: 'The Kresge Foundation',
      deadline: new Date('2025-06-30'),
      awardFloor: 100000,
      awardCeiling: 400000,
      description: 'Supports organizations working at the intersection of environmental health and social determinants of health in low-income communities.',
      eligibleTypes: ['501(c)(3) organizations', 'Community-based organizations'],
      categories: ['Environmental Health', 'Social Determinants', 'Community Development'],
      matchScore: 79,
    },
  ]

  for (const grant of savedGrants) {
    const existing = await prisma.savedGrant.findUnique({
      where: {
        organizationId_grantId: {
          organizationId: organization.id,
          grantId: grant.grantId
        }
      }
    })
    if (!existing) {
      await prisma.savedGrant.create({
        data: {
          ...grant,
          organizationId: organization.id,
        }
      })
    }
  }
  console.log('✅ Created saved grants')

  // Create grant digest preference
  const existingDigest = await prisma.grantDigestPreference.findUnique({
    where: { organizationId: organization.id }
  })
  if (!existingDigest) {
    await prisma.grantDigestPreference.create({
      data: {
        organizationId: organization.id,
        enabled: true,
        lastSentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      }
    })
    console.log('✅ Created digest preference')
  }

  console.log('\n🎉 Seed completed successfully!')
  console.log(`📧 User: zach@brightwayai.com`)
  console.log(`🏢 Organization: ${organization.name}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
