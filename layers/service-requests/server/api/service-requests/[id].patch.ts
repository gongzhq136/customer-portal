import { auth } from '~~/server/utils/auth'
import { updateServiceRequestSchema } from '../../utils/service-request-validation'
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
  const body = await readBody(event)
  const data = updateServiceRequestSchema.parse(body)

  // Get the request to check organization
  const [existingRequest] = await db
    .select({ organizationId: serviceRequest.organizationId })
    .from(serviceRequest)
    .where(eq(serviceRequest.id, id!))
    .limit(1)

  if (!existingRequest) {
    throw createError({ statusCode: 404, message: 'Request not found' })
  }

  // Verify user has permission to update (must be owner or have update permission)
  const isOwner = await verifyRequestOwnership(session.user.id, id!)
  const hasUpdatePermission = await verifyServiceRequestAccess(
    session,
    existingRequest.organizationId,
    'update'
  )

  if (!isOwner && !hasUpdatePermission) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Users can only update certain fields
  const allowedUpdates: Record<string, string> = {}
  if (data.title) allowedUpdates.title = data.title
  if (data.description) allowedUpdates.description = data.description
  if (data.priority) allowedUpdates.priority = data.priority
  if (data.category) allowedUpdates.category = data.category

  const [request] = await db
    .update(serviceRequest)
    .set(allowedUpdates)
    .where(eq(serviceRequest.id, id!))
    .returning()

  return request
})
