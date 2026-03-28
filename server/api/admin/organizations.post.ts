import { defineEventHandler, createError, readBody } from 'h3'
import { auth } from '~~/server/utils/auth'
import type { SessionUser } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Check if user is admin
  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { name, slug } = body

  if (!name || !slug) {
    throw createError({ statusCode: 400, message: 'Name and slug are required' })
  }

  // Create organization using Better Auth API
  // Note: We don't pass userId here - Better Auth will use the current session user
  // But since we're on the server, we need to create it without a user initially
  // Actually, Better Auth requires a user to create an organization, so we'll use the admin's ID
  const result = await auth.api.createOrganization({
    body: {
      name,
      slug,
      userId: user.id,
      keepCurrentActiveOrganization: false
    }
  })

  if (!result) {
    throw createError({ statusCode: 500, message: 'Failed to create organization' })
  }

  return result
})


