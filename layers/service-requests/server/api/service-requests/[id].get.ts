import { auth } from '~~/server/utils/auth'
import { verifyServiceRequestAccess, verifyServiceRequestAdminAccess } from '../../utils/service-request-helpers'
import { db } from '~~/server/utils/db'
import { eq } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const [request] = await db
    .select()
    .from(serviceRequest)
    .where(eq(serviceRequest.id, id!))
    .limit(1)

  if (!request) {
    throw createError({ statusCode: 404, message: 'Request not found' })
  }

  // Verify user has access to this organization's requests
  const hasAccess = await verifyServiceRequestAccess(
    session,
    request.organizationId,
    'read'
  )

  if (!hasAccess) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Hide internal notes from non-admin users
  const isAdmin = await verifyServiceRequestAdminAccess(session, request.organizationId)

  if (!isAdmin) {
    delete (request as any).internalNotes
  }

  return request
})
