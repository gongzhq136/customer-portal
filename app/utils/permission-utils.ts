import { authClient } from './auth-client'

/**
 * Checks if a role has a specific permission for a subject
 * @param subject The subject to check permissions against
 * @param permission The specific permission to check
 * @returns boolean indicating if the role has the permission
 */
export const hasPermission = async (subject: string, permission: string): Promise<boolean> => {
  try {
    const response = await authClient.admin.hasPermission({
      permissions: {
        [subject]: [permission]
      }
    })
    return response?.data?.success || false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}
