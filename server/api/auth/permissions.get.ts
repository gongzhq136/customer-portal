import { defineEventHandler, createError } from 'h3'
import { statement } from '~~/shared/permissions'
import { auth } from '~~/server/utils/auth'
import { getUserPermissions } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  // Get authenticated user
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  type SessionUserWithRole = { role?: string }
  const currentUser = session.user as SessionUserWithRole
  const currentRole = currentUser.role || 'user'

  // Check organization role for both "user" and "admin" roles if activeOrganizationId exists
  // auth.api.getSession() returns { user, session } where session has activeOrganizationId
  type SessionWithOrg = { session?: { activeOrganizationId?: string }, activeOrganizationId?: string }
  const sessionWithOrg = session as SessionWithOrg
  const activeOrganizationId = sessionWithOrg?.session?.activeOrganizationId || sessionWithOrg?.activeOrganizationId

  // Get user permissions using the shared utility
  const { permissions: rolePermissions, orgRole, organization: activeOrganization } = await getUserPermissions(
    session.user.id,
    currentRole,
    activeOrganizationId || undefined
  )

  // Get all permissions for the user
  const permissions: Record<string, boolean> = {}

  // Check each subject and permission combination
  for (const [subject, actions] of Object.entries(statement)) {
    if (Array.isArray(actions)) {
      // Get permissions for this subject from the role
      const rolePermissionsForSubject = rolePermissions[subject] || []

      for (const action of actions) {
        // Check if the role has this permission
        permissions[`${subject}.${action}`] = Array.isArray(rolePermissionsForSubject) && rolePermissionsForSubject.includes(action)
      }
    }
  }

  return {
    permissions,
    role: currentRole,
    organizationRole: orgRole || null,
    activeOrganization: activeOrganization
  }
})
