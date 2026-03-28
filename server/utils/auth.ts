import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sendEmail } from './email'
import { getInvitationEmailContent, getOTPEmailContent, getDeleteAccountEmailContent } from './email-texts'
import { admin, customSession, emailOTP, organization } from 'better-auth/plugins'
import { db } from './db'
import { and, eq, gt, or } from 'drizzle-orm'
import { user as userTable, account as accountTable, session as sessionTable, verification as verificationTable, organization as organizationTable, member as organizationMemberTable, invitation as organizationInvitationTable } from '../db/schema/auth-schema'
import { ac, user, admin as adminRole } from '../../shared/permissions'
import { nanoid } from 'nanoid'

/**
 * Generate an ID in the same format as better-auth uses (nanoid)
 * This ensures consistency across all ID generation in the application
 */
export function generateId(): string {
  return nanoid()
}

const adminEmails = process.env.ADMIN_EMAILS?.split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean) ?? []

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || process.env.PUBLIC_URL || 'http://localhost:3051',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: userTable,
      account: accountTable,
      session: sessionTable,
      member: organizationMemberTable,
      verification: verificationTable,
      organization: organizationTable,
      invitation: organizationInvitationTable,
    },
    usePlural: false,
    // Tables are singular (e.g., "user"), so no need for usePlural
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url, token: _token }, _request) => {
        // url is already a full URL from better-auth, use it directly
        const emailContent = getDeleteAccountEmailContent({
          userName: user.name || '',
          userEmail: user.email,
          deletionLink: url
        })

        await sendEmail({
          to: user.email,
          ...emailContent
        })
      },
      beforeDelete: async (user, _request) => {
        let userRole
        try {
          const [userRecord] = await db
            .select({ role: userTable.role })
            .from(userTable)
            .where(eq(userTable.id, user.id))
            .limit(1)

          userRole = userRecord?.role
        } catch (error) {
          console.error('Error checking user role in beforeDelete:', error)
          return
        }
        if (userRole === 'admin') {
          throw new APIError('BAD_REQUEST', {
            message: 'Admin accounts cannot be deleted'
          })
        }
      }
    }
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Type assertion for user object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const createdUser = user as any as { id: string, email: string, name: string }

          // Existing admin role assignment
          if (createdUser.email && adminEmails.includes(createdUser.email.toLowerCase())) {
            await db.update(userTable).set({ role: 'admin' }).where(eq(userTable.id, createdUser.id))
          }

          const [invitation] = await db
            .select({
              id: organizationInvitationTable.id,
              status: organizationInvitationTable.status,
              expiresAt: organizationInvitationTable.expiresAt
            })
            .from(organizationInvitationTable)
            .where(and(
              eq(organizationInvitationTable.email, createdUser.email),
              or(
                eq(organizationInvitationTable.status, 'accepted'),
                and(
                  eq(organizationInvitationTable.status, 'pending'),
                  gt(organizationInvitationTable.expiresAt, new Date())
                )
              )
            ))
            .limit(1)

          if (invitation) {
            return
          }

          const rawName = (createdUser.name || createdUser.email?.split('@')[0] || 'User').trim()
          const baseSlug = rawName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'user'

          const orgSlug = `${baseSlug}-${createdUser.id.slice(0, 8)}`
          const orgName = `${rawName}'s Organization`

          try {
            await auth.api.createOrganization({
              body: {
                name: orgName,
                slug: orgSlug,
                userId: createdUser.id,
                keepCurrentActiveOrganization: false,
                metadata: {
                  autoCreated: true,
                  createdForUserId: createdUser.id
                }
              }
            })
          } catch (error) {
            console.error('Error auto-creating organization for user:', error)
          }
        }
      }
    },
    session: {
      create: {
        after: async (session: { userId: string }) => {
          const [u] = await db
            .select({ email: userTable.email, role: userTable.role })
            .from(userTable)
            .where(eq(userTable.id, session.userId))
            .limit(1)
          const user = u

          if (user?.email && adminEmails.includes(user.email.toLowerCase()) && user.role !== 'admin') {
            await db.update(userTable).set({ role: 'admin' }).where(eq(userTable.id, session.userId))
          }
        }
      }
    }
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      sendInvitationEmail: async ({ invitation, organization, inviter }) => {
        const baseURL = process.env.BETTER_AUTH_URL || process.env.PUBLIC_URL || 'http://localhost:3000'
        const invitationLink = `${baseURL}/signup?invitationId=${invitation.id}`

        const emailContent = getInvitationEmailContent({
          inviterName: inviter.user.name || '',
          inviterEmail: inviter.user.email,
          organizationName: organization.name,
          role: invitation.role || 'member',
          invitationLink
        })

        await sendEmail({
          to: invitation.email,
          ...emailContent
        })
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization, member, user }) => {
          // If the creator is an admin, remove them as a member
          // Admins should not be members of organizations they create
          const isAutoCreated = organization?.metadata?.autoCreated === true
          const [userRecord] = await db
            .select({ role: userTable.role })
            .from(userTable)
            .where(eq(userTable.id, user.id))
            .limit(1)

          if (userRecord?.role === 'admin' && member && !isAutoCreated) {
            // Remove the admin member from the organization
            await db
              .delete(organizationMemberTable)
              .where(eq(organizationMemberTable.id, member.id))
            console.log(`Removed admin ${user.email} as member from organization ${organization.name}`)
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        beforeInviteMember: async ({ organization: _organization, user }: { organization: any, user: any }) => {
          // Allow admins to invite members even if they're not members themselves
          const [userRecord] = await db
            .select({ role: userTable.role })
            .from(userTable)
            .where(eq(userTable.id, user.id))
            .limit(1)

          // If user is admin, allow the invitation to proceed
          if (userRecord?.role === 'admin') {
            return { data: { allow: true } }
          }

          // For non-admins, let Better Auth check membership normally
          // Return undefined to let default behavior handle it
          return undefined
        },
        afterAcceptInvitation: async ({ invitation: _invitation, member, user, organization }) => {
          // Ensure the user gets the correct role when accepting invitation
          // Better Auth handles this automatically, but we log it for debugging
          console.log(`User ${user.email} accepted invitation to ${organization.name} with role ${member.role}`)
        }
      }
    }),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        const emailContent = getOTPEmailContent({
          otp,
          type: type as 'email-verification' | 'sign-in' | 'password-reset'
        })

        await sendEmail({
          to: email,
          ...emailContent
        })
      }
    }),
    admin({
      ac,
      roles: {
        user,
        admin: adminRole
      },
      defaultRole: 'user'
    }),
    customSession(async (sessionData) => {
      // Destructure user and session from the input object
      const { user, session } = sessionData
      // Fetch the account for the user
      const [account] = await db
        .select({ providerId: accountTable.providerId })
        .from(accountTable)
        .where(eq(accountTable.userId, user.id))
        .limit(1)

      // Return modified session data
      return {
        ...session, // Spread the original session part
        user: {
          ...user, // Spread the original user part
          providerId: account?.providerId || null // Add providerId to user object
        }
      }
    })
  ]
})
