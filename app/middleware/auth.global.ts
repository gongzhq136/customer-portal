import { authClient } from '~/utils/auth-client'

// No longer needed: const publicPaths = ['/', '/sign-up', '/login']

export default defineNuxtRouteMiddleware(async (to) => {
  // Define public routes that don't require authentication
  // Check if the target route has the 'public' metadata flag set to true
  const publicRoutes = ['/login', '/signup', '/blog', '/contact']
  const isPublicRoute = publicRoutes.find(route => to.path.includes(route))

  if (isPublicRoute || to.meta?.public === true || to.path == '/' || to.path == '/en' || to.path == '/nl') {
    console.log('Public route, allowing navigation:', to.path)
    // If it's public, allow navigation without checking auth
    return
  }
  try {
    const { data: session } = await authClient.useSession(useFetch)

    if (!session.value) {
      console.log('No active session found, redirecting to login')
      // No active session, redirect the user to the login page
      // Preserve the original intended path via a redirect query parameter
      const redirectPath = `/login?redirect=${encodeURIComponent(to.fullPath)}`
      return navigateTo(redirectPath, {
        external: false,
        replace: true, // Use replace to avoid adding the original protected path to history
      })
    } else {
      console.log('Active session found, allowing access to:', to.path)
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    // If there's an error checking auth, redirect to login
    return navigateTo('/login', {
      external: false,
      replace: true,
    })
  }

  // User is authenticated, allow access to the protected route
})
