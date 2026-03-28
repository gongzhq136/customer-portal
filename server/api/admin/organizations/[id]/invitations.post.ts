import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { auth, generateId } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { invitation as invitationTable, member as memberTable } from '~~/server/db/schema/auth-schema'
import { eq, and } from 'drizzle-orm'
import { sendEmail } from '~~/server/utils/email'
import { getInvitationEmailContent } from '~~/server/utils/email-texts'
import type { SessionUser } from '#types'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = session.user as SessionUser
  const organizationId = getRouterParam(event, 'id')
  if (!organizationId) {
    throw createError({ statusCode: 400, message: 'Organization ID is required' })
  }

  // Check if user is admin - admins have full access
  if (user.role !== 'admin') {
    // For non-admin users, check if they are a member and have invitation.create permission
    const [member] = await db
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.userId, user.id),
          eq(memberTable.organizationId, organizationId)
        )
      )
      .limit(1)

    if (!member) {
      throw createError({ statusCode: 403, message: 'Access denied. You must be an admin or a member of this organization with invitation permissions.' })
    }

    // Only owners and admins have invitation.create permission
    // Members don't have invitation permissions, so they can't create invitations
    if (member.role !== 'owner' && member.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Access denied. Only organization owners and admins can create invitations.' })
    }
  }

  const body = await readBody(event)
  const { email, role } = body

  if (!email || !role) {
    throw createError({ statusCode: 400, message: 'Email and role are required' })
  }

  try {
    // Check if there's already a pending invitation for this email and organization
    const existingInvitation = await db
      .select()
      .from(invitationTable)
      .where(
        and(
          eq(invitationTable.email, email),
          eq(invitationTable.organizationId, organizationId),
          eq(invitationTable.status, 'pending')
        )
      )
      .limit(1)

    if (existingInvitation.length > 0) {
      throw createError({ statusCode: 400, message: 'A pending invitation already exists for this email' })
    }

    // Create invitation directly in database
    const invitationId = generateId()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 2) // 2 days expiration

    const [invitation] = await db
      .insert(invitationTable)
      .values({
        id: invitationId,
        email,
        organizationId,
        role,
        inviterId: user.id,
        status: 'pending',
        expiresAt
      })
      .returning()

    // Get organization details for email
    const { organization: organizationTable } = await import('~~/server/db/schema/auth-schema')
    const [organization] = await db
      .select()
      .from(organizationTable)
      .where(eq(organizationTable.id, organizationId))
      .limit(1)

    if (!organization) {
      throw createError({ statusCode: 404, message: 'Organization not found' })
    }

    // Send invitation email
    const baseURL = process.env.BETTER_AUTH_URL || process.env.PUBLIC_URL || 'http://localhost:3000'
    const invitationLink = `${baseURL}/signup?invitationId=${invitationId}`

    const emailContent = getInvitationEmailContent({
      inviterName: user.name || '',
      inviterEmail: user.email,
      organizationName: organization.name,
      role: role || 'member',
      invitationLink
    })

    await sendEmail({
      to: email,
      ...emailContent
    })

    return invitation
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw createError({ statusCode: 500, message: error.message })
    }
    console.error('Failed to send invitation:', error)
    throw createError({ statusCode: 500, message: 'Failed to send invitation' })
  }
})
