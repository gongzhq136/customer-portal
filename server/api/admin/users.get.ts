import { defineEventHandler, createError } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { user as userTable } from '~~/server/db/schema/auth-schema'
import { or, ilike } from 'drizzle-orm'
import type { SessionUser, AdminUsersResponse } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<AdminUsersResponse> => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin
  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Get search query parameter
  const query = getQuery(event)
  const search = query.search as string | undefined

  // Build base query
  const baseQuery = db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      emailVerified: userTable.emailVerified,
      createdAt: userTable.createdAt,
      banned: userTable.banned
    })
    .from(userTable)

  // Add search filter if provided
  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`
    const users = await baseQuery
      .where(
        or(
          ilike(userTable.name, searchPattern),
          ilike(userTable.email, searchPattern)
        )
      )
      .orderBy(userTable.createdAt)
    return users as AdminUsersResponse
  }

  // Get all users ordered by creation date
  const users = await baseQuery.orderBy(userTable.createdAt)

  return users as AdminUsersResponse
})
