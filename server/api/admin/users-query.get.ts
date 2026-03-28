import { defineEventHandler, createError, getQuery } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { user as userTable } from '~~/server/db/schema/auth-schema'
import { buildDrizzleQuery, BaseQuerySchema } from '~~/server/utils/query-builder'
import type { SessionUser, AdminUsersResponse, QueryInput } from '~~/shared/types'

/**
 * GET /api/admin/users-query
 *
 * Demonstrates the usage of the Drizzle query builder with dynamic filters, sorting, and pagination.
 *
 * Query parameters:
 * - filters: JSON stringified array of filters, e.g., filters=[{"field":"email","operator":"contains","value":"example"}]
 * - sortField: Field to sort by (e.g., "createdAt", "email", "name")
 * - sortDirection: "asc" or "desc"
 * - take: Number of records to return (limit)
 * - skip: Number of records to skip (offset)
 *
 * Example requests:
 * - /api/admin/users-query?filters=[{"field":"email","operator":"contains","value":"@example.com"}]&sortField=createdAt&sortDirection=desc&take=10&skip=0
 * - /api/admin/users-query?filters=[{"field":"banned","operator":"eq","value":false}]&sortField=name&sortDirection=asc
 * - /api/admin/users-query?filters=[{"field":"role","operator":"in","value":["admin","user"]}]&take=20
 */
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

  // Parse and validate query parameters
  const queryParams = getQuery(event)
  const queryInput = BaseQuerySchema.parse(queryParams) as QueryInput

  // Build Drizzle query conditions using the query builder
  // Pass the table directly - buildDrizzleQuery will create the resolver automatically
  const { where, orderBy, limit, offset } = buildDrizzleQuery(queryInput, userTable)

  // Build the query with all conditions applied
  const baseSelect = db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      emailVerified: userTable.emailVerified,
      createdAt: userTable.createdAt,
      banned: userTable.banned,
    })
    .from(userTable)

  // Build final query by chaining methods conditionally
  // Note: Drizzle queries are immutable, so we build it step by step
  const queryWithWhere = where ? baseSelect.where(where) : baseSelect
  const queryWithOrder = queryWithWhere.orderBy(orderBy || userTable.createdAt)

  // Apply limit and offset only if provided
  const finalQuery = (() => {
    let q = queryWithOrder
    if (limit !== undefined) {
      q = q.limit(limit) as typeof q
    }
    if (offset !== undefined) {
      q = q.offset(offset) as typeof q
    }
    return q
  })()

  const users = await finalQuery

  return users as AdminUsersResponse
})
