import { defineEventHandler, createError, readBody } from 'h3'
import { z } from 'zod'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { user as userTable } from '~~/server/db/schema/auth-schema'
import { eq } from 'drizzle-orm'
import type { SessionUser } from '~~/shared/types'

// Zod schema for profile update request
const updateProfileSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name must be a non-empty string')
    .max(255, 'Name must be less than 255 characters')
    .optional(),
  image: z.union([
    z.string().url('Image must be a valid URL'),
    z.literal('').transform(() => null),
    z.null()
  ]).optional()
}).refine(
  (data) => data.name !== undefined || data.image !== undefined,
  {
    message: 'At least one field (name or image) must be provided'
  }
)

interface UpdateProfileResponse {
  success: boolean
  message: string
  user?: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

export default defineEventHandler(async (event): Promise<UpdateProfileResponse> => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = session.user as SessionUser
  const body = await readBody(event)

  // Validate request body with Zod
  const validationResult = updateProfileSchema.safeParse(body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw createError({
      statusCode: 400,
      message: firstError?.message || 'Validation failed'
    })
  }

  const validatedData = validationResult.data

  // Build update object
  const updateData: { name?: string, image?: string | null } = {}
  if (validatedData.name !== undefined) {
    updateData.name = validatedData.name.trim()
  }
  if (validatedData.image !== undefined) {
    updateData.image = validatedData.image
  }

  // Update user in database
  const [updatedUser] = await db
    .update(userTable)
    .set(updateData)
    .where(eq(userTable.id, user.id))
    .returning({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image
    })

  if (!updatedUser) {
    throw createError({ statusCode: 500, message: 'Failed to update profile' })
  }

  return {
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image
    }
  }
})
