import { defineEventHandler, type H3Event, createError } from 'h3'
import { auth } from '../utils/auth'

async function isAuthenticated(event: H3Event): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: event.headers,
  })
  if (!session) {
    return false
  }
  return !!session.user
}

export default defineEventHandler(async (event) => {
  const url = event.node.req.url

  if (!url || !url.startsWith('/api/')) {
    return
  }
  const unprotectedPaths = ['/api/auth/', '/api/_nuxt_icon']

  const isUnprotected = unprotectedPaths.some((path) => url.startsWith(path))

  if (isUnprotected) {
    return
  }

  // Allow specific GET requests for single questionnaires
  if (event.method === 'GET' && url.match(/^\/api\/questionnaires\/[^/]+$/)) {
    return
  }

  // Allow POST (index), PUT (specific response), and GET (specific response) to questionnaire-responses for anonymous users
  const isQuestionnaireResponseIndex = url === '/api/questionnaire-responses'
  const isSpecificQuestionnaireResponse = url.startsWith(
    '/api/questionnaire-responses/',
  )

  if (
    (isQuestionnaireResponseIndex && event.method === 'POST')
    || (isSpecificQuestionnaireResponse
      && (event.method === 'PUT' || event.method === 'GET'))
  ) {
    return
  }

  const authenticated = await isAuthenticated(event)
  if (authenticated) {
    return
  }

  console.warn(`Unauthorized access attempt to: ${url}`)
  throw createError({
    statusCode: 401,
    statusMessage: 'Unauthorized',
    message: 'Authentication required',
  })
})
