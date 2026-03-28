import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { serviceRequest } from '~~/server/db/schema/service-requests'
import { organization as organizationTable, member as memberTable, user as userTable } from '~~/server/db/schema/auth-schema'
import { verifyServiceRequestAdminAccess } from '../../utils/service-request-helpers'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'

// Service request templates
const requestTemplates = {
  support: [
    {
      title: 'Unable to login after password reset',
      description: 'I reset my password yesterday but I\'m still unable to log in. I\'ve tried clearing my browser cache and using different browsers, but the issue persists. Can someone help me troubleshoot this?',
      category: 'Technical',
      priority: 'HIGH' as const
    },
    {
      title: 'Feature request: Dark mode toggle',
      description: 'It would be great to have a dark mode option in the settings. Many users work late hours and this would reduce eye strain. Could this be added to the roadmap?',
      category: 'Feature Request',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Bug: Dashboard not loading on mobile',
      description: 'The dashboard fails to load on mobile devices (iOS Safari and Chrome). The page shows a blank screen after the initial load. This happens consistently on iPhone 12 and newer models.',
      category: 'Bug Report',
      priority: 'HIGH' as const
    },
    {
      title: 'API rate limiting too restrictive',
      description: 'We\'re hitting the API rate limits frequently during our peak hours. Could we discuss increasing our rate limits or implementing a different pricing tier?',
      category: 'Technical',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Export functionality not working',
      description: 'When trying to export data to CSV, the download fails with an error message. This worked fine last week. I\'ve tried multiple times with different date ranges.',
      category: 'Bug Report',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Request: Webhook notifications',
      description: 'We need webhook support to receive real-time notifications when certain events occur. This is critical for our integration workflow.',
      category: 'Feature Request',
      priority: 'HIGH' as const
    }
  ],
  billing: [
    {
      title: 'Invoice discrepancy for March 2024',
      description: 'I noticed a discrepancy in our March invoice. The amount charged doesn\'t match our usage records. Could someone review this and provide clarification?',
      category: 'Billing',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Payment method update needed',
      description: 'I need to update our payment method. The current credit card on file has expired. How can I update this information?',
      category: 'Billing',
      priority: 'LOW' as const
    },
    {
      title: 'Request refund for cancelled subscription',
      description: 'We cancelled our subscription last month but were still charged. We\'d like to request a refund for the unused portion of the service.',
      category: 'Billing',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Billing cycle clarification',
      description: 'Can someone clarify how our billing cycle works? We\'re seeing charges at unexpected times and would like to understand the schedule better.',
      category: 'Billing',
      priority: 'LOW' as const
    },
    {
      title: 'Upgrade to annual plan',
      description: 'We\'d like to upgrade from monthly to annual billing to take advantage of the discount. Can someone help us with this transition?',
      category: 'Billing',
      priority: 'LOW' as const
    },
    {
      title: 'Tax exemption certificate',
      description: 'We\'re a tax-exempt organization and need to submit our tax exemption certificate. Where should we send this document?',
      category: 'Billing',
      priority: 'MEDIUM' as const
    }
  ],
  account: [
    {
      title: 'Need access to billing dashboard',
      description: 'I need access to the billing dashboard but don\'t see it in my menu. I believe I should have admin permissions. Can someone grant me access?',
      category: 'Account',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Update team member permissions',
      description: 'We have a new team member who needs read-only access to certain sections. Can someone help us configure the appropriate permissions?',
      category: 'Account',
      priority: 'LOW' as const
    },
    {
      title: 'Change organization name',
      description: 'Our company recently rebranded and we need to update our organization name in the system. What\'s the process for this?',
      category: 'Account',
      priority: 'LOW' as const
    },
    {
      title: 'Remove former employee access',
      description: 'A former employee still has access to our account. We need to remove their access immediately for security reasons.',
      category: 'Account',
      priority: 'URGENT' as const
    },
    {
      title: 'SSO integration setup',
      description: 'We\'d like to set up Single Sign-On (SSO) for our organization. Can someone guide us through the setup process?',
      category: 'Account',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Two-factor authentication not working',
      description: 'I\'m unable to set up two-factor authentication. The QR code doesn\'t scan properly and the manual code doesn\'t work either.',
      category: 'Account',
      priority: 'HIGH' as const
    }
  ],
  general: [
    {
      title: 'How do I export my data?',
      description: 'I need to export all our data for backup purposes. Can someone point me to the documentation or guide me through the process?',
      category: 'General',
      priority: 'LOW' as const
    },
    {
      title: 'API documentation clarification',
      description: 'I have questions about the API documentation, specifically regarding pagination and filtering. The examples don\'t cover our use case.',
      category: 'General',
      priority: 'LOW' as const
    },
    {
      title: 'Best practices for team collaboration',
      description: 'We\'re new to the platform and would like to learn about best practices for team collaboration. Are there any resources or guides available?',
      category: 'General',
      priority: 'LOW' as const
    },
    {
      title: 'Data retention policy',
      description: 'What is your data retention policy? We need to understand how long our data is stored and what happens when we cancel our account.',
      category: 'General',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Custom domain setup',
      description: 'We\'d like to use our custom domain. Can someone help us configure DNS settings and verify the domain?',
      category: 'General',
      priority: 'MEDIUM' as const
    },
    {
      title: 'Training session request',
      description: 'Our team would benefit from a training session on advanced features. Do you offer group training sessions?',
      category: 'General',
      priority: 'LOW' as const
    }
  ]
}

// Internal notes templates (for admin scenarios)
const internalNotesTemplates = [
  'Customer reported similar issue last month. Escalating to engineering team.',
  'Waiting for customer to provide additional logs. Follow up in 2 days.',
  'Issue resolved in latest release. Customer needs to update.',
  'Billing team confirmed refund approved. Processing within 3-5 business days.',
  'Customer needs to verify email address before we can proceed.',
  'Escalated to senior support. High-value customer.',
  'Duplicate request - see ticket #SR-1234',
  'Customer satisfied with resolution. Closing ticket.',
  'Pending customer response. Auto-close if no response in 7 days.',
  'Root cause identified. Fix scheduled for next deployment.'
]

type ServiceRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
type ServiceRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)] as T
}

function weightedRandomChoice<T>(items: Array<{ value: T, weight: number }>): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight

  for (const item of items) {
    random -= item.weight
    if (random <= 0) {
      return item.value
    }
  }

  return items[items.length - 1]!.value as T
}

function randomDateBetween(start: Date, end: Date): Date {
  const startTime = start.getTime()
  const endTime = end.getTime()
  const randomTime = startTime + Math.random() * (endTime - startTime)
  return new Date(randomTime)
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get active organization from session
  type SessionWithOrg = { session?: { activeOrganizationId?: string }, activeOrganizationId?: string }
  const sessionWithOrg = session as SessionWithOrg
  const organizationId = sessionWithOrg?.session?.activeOrganizationId || sessionWithOrg?.activeOrganizationId

  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'No organization found' })
  }

  // Check if user has admin-level access
  const isAdmin = await verifyServiceRequestAdminAccess(session, organizationId)
  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Optional: Only allow in development/staging
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PRODUCTION) {
    throw createError({ statusCode: 403, message: 'Seed endpoint disabled in production' })
  }

  // Get query parameters
  const query = getQuery(event)
  const count = Math.min(Math.max(parseInt(query.count as string) || 50, 1), 1000) // Limit between 1 and 1000
  const targetOrganizationId = (query.organizationId as string) || null

  // Query organizations
  let organizations
  if (targetOrganizationId) {
    const [org] = await db
      .select()
      .from(organizationTable)
      .where(eq(organizationTable.id, targetOrganizationId))
      .limit(1)

    if (!org) {
      throw createError({ statusCode: 404, message: 'Organization not found' })
    }
    organizations = [org]
  } else {
    organizations = await db
      .select()
      .from(organizationTable)
  }

  if (organizations.length === 0) {
    throw createError({ statusCode: 400, message: 'No organizations found' })
  }

  // Query all users (we'll filter by organization membership when assigning)
  const allUsers = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name
    })
    .from(userTable)

  if (allUsers.length === 0) {
    throw createError({ statusCode: 400, message: 'No users found' })
  }

  // Query organization memberships
  const memberships = await db
    .select({
      organizationId: memberTable.organizationId,
      userId: memberTable.userId
    })
    .from(memberTable)

  // Build a map of organization -> users
  const orgUsersMap = new Map<string, string[]>()
  for (const membership of memberships) {
    if (!orgUsersMap.has(membership.organizationId)) {
      orgUsersMap.set(membership.organizationId, [])
    }
    orgUsersMap.get(membership.organizationId)!.push(membership.userId)
  }

  // Generate service requests
  const requestsToInsert = []
  const templateTypes = Object.keys(requestTemplates) as Array<keyof typeof requestTemplates>

  for (let i = 0; i < count; i++) {
    // Select random organization
    const org = randomChoice(organizations)
    const orgUserIds = orgUsersMap.get(org.id) || []

    // Select random user from organization (or any user if no members)
    const creatorId = orgUserIds.length > 0
      ? randomChoice(orgUserIds)
      : randomChoice(allUsers).id

    // Select random template type
    const templateType = randomChoice(templateTypes)
    const template = randomChoice(requestTemplates[templateType])

    // Generate status with realistic distribution
    // ~40% OPEN, ~30% IN_PROGRESS, ~20% RESOLVED, ~10% CLOSED
    const status = weightedRandomChoice<ServiceRequestStatus>([
      { value: 'OPEN', weight: 40 },
      { value: 'IN_PROGRESS', weight: 30 },
      { value: 'RESOLVED', weight: 20 },
      { value: 'CLOSED', weight: 10 }
    ])

    // Generate priority with realistic distribution
    // ~20% LOW, ~40% MEDIUM, ~30% HIGH, ~10% URGENT
    const priority = weightedRandomChoice<ServiceRequestPriority>([
      { value: 'LOW', weight: 20 },
      { value: 'MEDIUM', weight: 40 },
      { value: 'HIGH', weight: 30 },
      { value: 'URGENT', weight: 10 }
    ])

    // Generate created date (spread over last 90 days, more recent = more likely)
    // Use exponential distribution to favor recent dates
    const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 90) // Square to favor recent dates
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

    // Generate updated date (same as created or later)
    const updatedAt = status === 'OPEN'
      ? createdAt // If still open, updated = created
      : randomDateBetween(createdAt, new Date()) // Otherwise, updated sometime after creation

    // Generate resolved/closed dates for resolved/closed statuses
    let resolvedAt: Date | undefined
    let closedAt: Date | undefined

    if (status === 'RESOLVED') {
      const daysToResolve = Math.floor(Math.random() * 30) + 1 // 1-30 days after creation
      resolvedAt = new Date(createdAt.getTime() + daysToResolve * 24 * 60 * 60 * 1000)
    } else if (status === 'CLOSED') {
      const daysToClose = Math.floor(Math.random() * 30) + 1 // 1-30 days after creation
      closedAt = new Date(createdAt.getTime() + daysToClose * 24 * 60 * 60 * 1000)
      resolvedAt = closedAt // Usually resolved before closing
    }

    // Assign to user ~60% of the time
    const assignedToId = Math.random() < 0.6 && orgUserIds.length > 0
      ? randomChoice(orgUserIds)
      : undefined

    // Add internal notes ~30% of the time
    const internalNotes = Math.random() < 0.3
      ? randomChoice(internalNotesTemplates)
      : undefined

    requestsToInsert.push({
      id: nanoid(),
      title: template.title,
      description: template.description,
      status,
      priority: template.priority || priority,
      category: template.category,
      organizationId: org.id,
      createdById: creatorId,
      assignedToId,
      internalNotes,
      createdAt,
      updatedAt,
      resolvedAt,
      closedAt,
      attachments: null
    })
  }

  // Batch insert requests
  if (requestsToInsert.length > 0) {
    // Drizzle doesn't support batch insert directly, so we'll insert in chunks
    const chunkSize = 100
    for (let i = 0; i < requestsToInsert.length; i += chunkSize) {
      const chunk = requestsToInsert.slice(i, i + chunkSize)
      await db.insert(serviceRequest).values(chunk)
    }
  }

  return {
    success: true,
    count: requestsToInsert.length,
    message: `Successfully generated ${requestsToInsert.length} service requests`
  }
})
