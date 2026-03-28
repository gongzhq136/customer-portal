import { authClient } from '~/utils/auth-client'
import type { MemberRole } from '#types'

export const useOrganization = () => {
  // Get current user's organization
  const getCurrentOrganization = async () => {
    const { data: member } = await authClient.organization.getActiveMember()
    return member?.organizationId
  }

  // Check if user is organization owner
  const isOrganizationOwner = async () => {
    const { data: roleData } = await authClient.organization.getActiveMemberRole()
    return roleData?.role === 'owner'
  }

  // Check if user is organization admin
  const isOrganizationAdmin = async () => {
    const { data: roleData } = await authClient.organization.getActiveMemberRole()
    return roleData?.role === 'admin' || roleData?.role === 'owner'
  }

  // List all user organizations
  const getUserOrganizations = async () => {
    const { data } = await authClient.organization.list()
    return data
  }

  const createOrganization = async (data: { name: string, slug: string }) => {
    return await authClient.organization.create(data)
  }

  const getActiveMember = async () => {
    return await authClient.organization.getActiveMember()
  }

  const listMembers = async (organizationId: string) => {
    return await authClient.organization.listMembers({
      query: { organizationId }
    })
  }

  const inviteMember = async (email: string, organizationId: string, role: MemberRole = 'member', resend = false) => {
    return await authClient.organization.inviteMember({
      email,
      organizationId,
      role,
      resend
    })
  }

  const listInvitations = async (organizationId: string) => {
    return await authClient.organization.listInvitations({
      organizationId
    })
  }

  const resendInvitation = async (invitationId: string, organizationId: string, email: string, role: MemberRole) => {
    return await authClient.organization.inviteMember({
      email,
      organizationId,
      role,
      resend: true
    })
  }

  const cancelInvitation = async (invitationId: string) => {
    return await authClient.organization.cancelInvitation({
      invitationId
    })
  }

  const acceptInvitation = async (invitationId: string) => {
    return await authClient.organization.acceptInvitation({
      invitationId
    })
  }

  return {
    getCurrentOrganization,
    isOrganizationOwner,
    isOrganizationAdmin,
    getUserOrganizations,
    createOrganization,
    getActiveMember,
    listMembers,
    inviteMember,
    listInvitations,
    resendInvitation,
    cancelInvitation,
    acceptInvitation
  }
}
