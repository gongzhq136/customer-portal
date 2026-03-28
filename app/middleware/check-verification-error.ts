export default defineNuxtRouteMiddleware((to, _from) => {
  // Check if navigating to the email verified page and if there's an error query param
  if (to.path === '/email-verified' && to.query.error) {
    console.log(
      `Middleware: Found error (${to.query.error}) on /email-verified, redirecting to /verification-error`,
    )
    // Redirect to the verification error page, preserving the error query param
    // Use replace: true to avoid adding the intermediate /email-verified page to history
    return navigateTo(
      {
        path: '/verification-error',
        query: { error: to.query.error },
      },
      { replace: true },
    )
  }
  // Otherwise, allow navigation to proceed
})
