import { defineEventHandler, createError, getQuery } from 'h3'
import { db } from '~~/server/utils/db'
import { invitation as invitationTable, organization as organizationTable } from '~~/server/db/schema/auth-schema'
import { eq } from 'drizzle-orm'

/**
 * Custom endpoint to get invitation details, bypassing Better Auth's inviter membership check.
 * This is necessary because admins who create organizations and invite owners
 * are removed as members, but their invitations should still be accessible.
 *
 * This endpoint is public (no authentication required) so users can view invitation
 * details before signing up or logging in.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const invitationId = query.id as string | undefined

  if (!invitationId) {
    throw createError({ statusCode: 400, message: 'Invitation ID is required' })
  }

  try {
    // Fetch the invitation
    const [invitation] = await db
      .select()
      .from(invitationTable)
      .where(eq(invitationTable.id, invitationId))
      .limit(1)

    if (!invitation) {
      throw createError({ statusCode: 404, message: 'Invitation not found' })
    }

    // Get organization details
    const [organization] = await db
      .select()
      .from(organizationTable)
      .where(eq(organizationTable.id, invitation.organizationId))
      .limit(1)

    if (!organization) {
      throw createError({ statusCode: 404, message: 'Organization not found' })
    }

    // Return invitation data in the same format as Better Auth's getInvitation
    return {
      id: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      inviterId: invitation.inviterId,
      organizationName: organization.name,
      organizationSlug: organization.slug
    }
  } catch (err: unknown) {
    if (err instanceof Error && 'statusCode' in err) {
      throw err
    }
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invitation'
    throw createError({ statusCode: 500, message: errorMessage })
  }
})
