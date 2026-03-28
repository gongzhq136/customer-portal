import { auth } from '~~/server/utils/auth'
import { verifyServiceRequestAccess, verifyRequestOwnership } from '../../utils/service-request-helpers'
import { db } from '~~/server/utils/db'
import { eq } from 'drizzle-orm'
import { serviceRequest } from '~~/server/db/schema/service-requests'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  // Get the request to check organization
  const [existingRequest] = await db
    .select({ organizationId: serviceRequest.organizationId })
    .from(serviceRequest)
    .where(eq(serviceRequest.id, id!))
    .limit(1)

  if (!existingRequest) {
    throw createError({ statusCode: 404, message: 'Request not found' })
  }

  // Verify ownership or admin delete permission
  const isOwner = await verifyRequestOwnership(session.user.id, id!)
  const hasDeletePermission = await verifyServiceRequestAccess(
    session,
    existingRequest.organizationId,
    'delete'
  )

  if (!isOwner && !hasDeletePermission) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  await db.delete(serviceRequest).where(eq(serviceRequest.id, id!))

  return { success: true }
})
