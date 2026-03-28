import { defineEventHandler, createError, readBody } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { invitation as invitationTable, member as memberTable, organization as organizationTable } from '~~/server/db/schema/auth-schema'
import { eq, and } from 'drizzle-orm'
import { generateId } from '~~/server/utils/auth'
import type { SessionUser } from '#types'

/**
 * Custom endpoint to accept invitations, bypassing Better Auth's inviter membership check.
 * This is necessary because admins who create organizations and invite owners
 * are removed as members, but their invitations should still be valid.
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = session.user as SessionUser
  const body = await readBody(event)
  const { invitationId } = body

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

    // Validate that the invitation is still pending
    if (invitation.status !== 'pending') {
      throw createError({ statusCode: 400, message: 'Invitation is no longer valid' })
    }

    // Validate that the invitation hasn't expired
    const now = new Date()
    const expiresAt = new Date(invitation.expiresAt)
    if (expiresAt < now) {
      throw createError({ statusCode: 400, message: 'Invitation has expired' })
    }

    // Validate that the user's email matches the invitation email
    if (user.email?.toLowerCase() !== invitation.email?.toLowerCase()) {
      throw createError({
        statusCode: 400,
        message: 'Email mismatch: This invitation was sent to a different email address'
      })
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, invitation.organizationId),
          eq(memberTable.userId, user.id)
        )
      )
      .limit(1)

    if (existingMember) {
      throw createError({ statusCode: 400, message: 'You are already a member of this organization' })
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

    // Create the member record
    const memberId = generateId()
    await db.insert(memberTable).values({
      id: memberId,
      organizationId: invitation.organizationId,
      userId: user.id,
      role: invitation.role || 'member',
      createdAt: new Date()
    })

    // Update invitation status to accepted
    await db
      .update(invitationTable)
      .set({ status: 'accepted' })
      .where(eq(invitationTable.id, invitationId))

    return {
      success: true,
      member: {
        id: memberId,
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role || 'member'
      },
      organization: {
        id: organization.id,
        name: organization.name
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && 'statusCode' in err) {
      throw err
    }
    const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation'
    throw createError({ statusCode: 500, message: errorMessage })
  }
})

