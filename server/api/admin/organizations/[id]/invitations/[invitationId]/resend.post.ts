import { defineEventHandler, createError, getRouterParam } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { invitation as invitationTable, organization as organizationTable, member as memberTable } from '~~/server/db/schema/auth-schema'
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
  const invitationId = getRouterParam(event, 'invitationId')

  if (!organizationId || !invitationId) {
    throw createError({ statusCode: 400, message: 'Organization ID and Invitation ID are required' })
  }

  // Check if user is admin - admins have full access
  if (user.role !== 'admin') {
    // For non-admin users, check if they are a member and have invitation.cancel permission
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

    // Only owners and admins have invitation.cancel permission
    // Members don't have invitation permissions, so they can't resend invitations
    if (member.role !== 'owner' && member.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Access denied. Only organization owners and admins can resend invitations.' })
    }
  }

  // Get invitation details
  const [invitation] = await db
    .select()
    .from(invitationTable)
    .where(eq(invitationTable.id, invitationId))
    .limit(1)

  if (!invitation || invitation.organizationId !== organizationId) {
    throw createError({ statusCode: 404, message: 'Invitation not found' })
  }

  // Check if invitation is still pending
  if (invitation.status !== 'pending') {
    throw createError({ statusCode: 400, message: 'Can only resend pending invitations' })
  }

  // Get organization details for email
  const [organization] = await db
    .select()
    .from(organizationTable)
    .where(eq(organizationTable.id, organizationId))
    .limit(1)

  if (!organization) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  // Resend invitation email
  const baseURL = process.env.BETTER_AUTH_URL || process.env.PUBLIC_URL || 'http://localhost:3000'
  const invitationLink = `${baseURL}/signup?invitationId=${invitationId}`

  const emailContent = getInvitationEmailContent({
    inviterName: user.name || '',
    inviterEmail: user.email,
    organizationName: organization.name,
    role: invitation.role || 'member',
    invitationLink
  })

  await sendEmail({
    to: invitation.email,
    ...emailContent
  })

  return { success: true, message: 'Invitation resent successfully' }
})
