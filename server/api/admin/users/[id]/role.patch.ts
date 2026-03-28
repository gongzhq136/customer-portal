import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { user as userTable } from '~~/server/db/schema/auth-schema'
import { eq } from 'drizzle-orm'
import type { SessionUser, UpdateUserRoleRequest, UpdateUserRoleResponse } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<UpdateUserRoleResponse> => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin
  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const body = await readBody<UpdateUserRoleRequest>(event)
  const { role } = body

  if (!role || !['user', 'admin'].includes(role)) {
    throw createError({ statusCode: 400, message: 'Invalid role. Must be "user" or "admin"' })
  }

  // Update user role
  await db
    .update(userTable)
    .set({ role })
    .where(eq(userTable.id, userId))

  return { success: true, message: 'User role updated successfully' }
})
