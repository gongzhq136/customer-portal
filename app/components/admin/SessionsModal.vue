<script setup lang="ts">
import type { AdminUserResponse, UserSession } from '#types'
import { authClient } from '~/utils/auth-client'

const props = defineProps<{
  user: AdminUserResponse | null
}>()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t, locale } = useI18n()
const toast = useToast()
const userStore = useUserStore()
const { currentUser, currentSession } = storeToRefs(userStore)

const loadingSessions = ref(false)
const sessions = ref<UserSession[]>([])
const revokingSession = ref<string | null>(null)

const loadUserSessions = async () => {
  if (!props.user) return

  try {
    loadingSessions.value = true
    const { data, error: sessionsError } = await authClient.admin.listUserSessions({
      userId: props.user.id
    })

    if (sessionsError) {
      throw sessionsError
    }

    sessions.value = (data?.sessions || data || []) as UserSession[]
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load sessions'
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
    emit('error', errorMessage)
  } finally {
    loadingSessions.value = false
  }
}

await loadUserSessions()
const isSessionExpired = (expiresAt: Date | string) => {
  return new Date(expiresAt) < new Date()
}

const isCurrentSession = (session: UserSession): boolean => {
  if (!currentSession.value) return false
  // Get session ID and token from getSession() result
  const sessionId = currentSession.value.id
  const token = currentSession.value?.token

  // Check if session ID matches (most reliable)
  if (sessionId && session.id === sessionId) {
    return true
  }

  // Check if session token matches
  if (token && session.token === token) {
    return true
  }

  return false
}

const revokeSession = async (sessionToken: string) => {
  // Find the session being revoked
  const sessionToRevoke = sessions.value.find(s => s.token === sessionToken)

  // Prevent revoking current session
  if (sessionToRevoke && isCurrentSession(sessionToRevoke)) {
    toast.add({
      title: t('common.error'),
      description: t('admin.user.sessions.cannotRevokeCurrentSession'),
      color: 'error'
    })
    return
  }

  try {
    revokingSession.value = sessionToken
    const { error: revokeError } = await authClient.admin.revokeUserSession({
      sessionToken
    })

    if (revokeError) {
      throw revokeError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.user.sessions.revokeSuccess'),
      color: 'success'
    })
    await loadUserSessions()
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.sessions.revokeError')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
    emit('error', errorMessage)
  } finally {
    revokingSession.value = null
  }
}

const revokeAllSessions = async () => {
  if (!props.user) return

  // Prevent revoking all sessions if it includes the current session
  if (currentUser.value && currentUser.value.id === props.user.id && currentSession.value?.token) {
    toast.add({
      title: t('common.error'),
      description: t('admin.user.sessions.cannotRevokeCurrentSession'),
      color: 'error'
    })
    return
  }

  try {
    revokingSession.value = 'all'
    const { error: revokeError } = await authClient.admin.revokeUserSessions({
      userId: props.user.id
    })

    if (revokeError) {
      throw revokeError
    }

    toast.add({
      title: t('common.success'),
      description: t('admin.user.sessions.revokeAllSuccess'),
      color: 'success'
    })
    await loadUserSessions()
    emit('success')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('admin.user.sessions.revokeError')
    toast.add({
      title: t('common.error'),
      description: errorMessage,
      color: 'error'
    })
    emit('error', errorMessage)
  } finally {
    revokingSession.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('admin.user.sessions.title')"
    :description="t('admin.user.sessions.description')"
    :ui="{ content: 'max-w-4xl', footer: 'justify-end' }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">{{ t('admin.user.sessions.title') }}</h3>
        <UButton
          v-if="currentUser && user && currentUser.id !== user.id"
          color="error"
          variant="outline"
          size="sm"
          :loading="revokingSession === 'all'"
          @click="revokeAllSessions"
        >
          {{ t('admin.user.sessions.revokeAll') }}
        </UButton>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="loadingSessions" class="text-center py-8">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p class="text-gray-600 dark:text-gray-400 mt-2">{{ t('common.loading') }}</p>
        </div>

        <div v-else-if="sessions.length === 0" class="text-center py-8">
          <p class="text-gray-600 dark:text-gray-400">{{ t('admin.user.sessions.noSessions') }}</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="flex items-center justify-between p-4 border rounded-lg"
          >
            <div class="flex-1 space-y-1">
              <div class="flex items-center gap-2">
                <UBadge :color="isSessionExpired(session.expiresAt) ? 'error' : 'success'" variant="soft" size="xs">
                  {{ isSessionExpired(session.expiresAt) ? t('admin.user.sessions.expired') : t('admin.user.sessions.active') }}
                </UBadge>
              </div>
              <div class="text-sm">
                <div><strong>{{ t('admin.user.sessions.ipAddress') }}:</strong> {{ session.ipAddress || t('admin.table.notAvailable') }}</div>
                <div><strong>{{ t('admin.user.sessions.userAgent') }}:</strong> {{ session.userAgent || t('admin.table.notAvailable') }}</div>
                <div><strong>{{ t('admin.user.sessions.createdAt') }}:</strong> {{ new Date(session.createdAt).toLocaleString(locale) }}</div>
                <div><strong>{{ t('admin.user.sessions.expiresAt') }}:</strong> {{ new Date(session.expiresAt).toLocaleString(locale) }}</div>
              </div>
            </div>
            <template v-if="isCurrentSession(session)">
              <UBadge color="primary" variant="soft" size="sm">
                {{ t('admin.user.sessions.currentSession') }}
              </UBadge>
            </template>
            <UButton
              v-else-if="!isSessionExpired(session.expiresAt)"
              color="error"
              variant="outline"
              size="sm"
              :loading="revokingSession === session.token"
              @click="revokeSession(session.token)"
            >
              {{ t('admin.user.sessions.revoke') }}
            </UButton>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-4 justify-end">
        <UButton variant="outline" @click="open = false">
          {{ t('common.close') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
