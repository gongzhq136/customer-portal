import { authClient } from '~/utils/auth-client'
import type { AuthSessionResponse } from '~/utils/auth-client'

export default defineNuxtPlugin({
  name: 'auth',
  async setup() {
    const userStore = useUserStore()
    // const organizationStore = useOrganization()
    try {
      const sessionData = await authClient.getSession()
      await userStore.setSession(sessionData?.data as unknown as AuthSessionResponse)
    } catch (error) {
      console.log('getSession error:', error)
    }

    const { data: session } = await authClient.useSession(useFetch)

    // Also watch for session changes to handle OTP verification and logout
    watch(
      () => session.value,
      async (newSession) => {
        const sessionData = newSession as unknown as AuthSessionResponse | null
        await userStore.setSession(sessionData)
      },
      { deep: true }
    )
  },
})
