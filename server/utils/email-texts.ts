/**
 * Centralized invitation email content
 * Used across all invitation email sending functions
 */

export interface InvitationEmailParams {
  inviterName: string
  inviterEmail: string
  organizationName: string
  role: string
  invitationLink: string
}

export function getInvitationEmailContent(params: InvitationEmailParams) {
  const { inviterName, inviterEmail, organizationName, role, invitationLink } = params
  const inviterDisplay = inviterName || inviterEmail

  return {
    subject: `You've been invited to join ${organizationName}`,
    params: {
      greeting: 'Hello,',
      body_text: `${inviterDisplay} has invited you to join <strong>${organizationName}</strong> as a ${role || 'member'}. Click the button below to accept the invitation and create your account.
             <p style="text-align: center;">
                <a href="${invitationLink}" class="button">Accept Invitation</a>
            </p>
        `,
      action_url: invitationLink,
      action_text: 'Accept Invitation',
      footer_text: 'This invitation will expire soon. If you did not expect this invitation, please ignore this email.'
    }
  }
}

/**
 * Centralized OTP email content
 * Used for email verification, sign-in, and password reset OTP codes
 */

export type OTPEmailType = 'email-verification' | 'sign-in' | 'password-reset'

export interface OTPEmailParams {
  otp: string
  type: OTPEmailType
}

export function getOTPEmailContent(params: OTPEmailParams) {
  const { otp, type } = params

  const subjects = {
    'email-verification': 'Verify your Apex Pro email address',
    'sign-in': 'Your Apex Pro sign-in code',
    'password-reset': 'Reset your Apex Pro password'
  }

  return {
    subject: subjects[type],
    params: {
      greeting: 'Hello,',
      body_text: `Your verification code is: <code>${otp}</code>`,
      action_url: '#', // Not used for OTP
      action_text: 'Verification Code',
      footer_text: 'This code will expire soon. If you did not request this, please ignore this email.'
    }
  }
}

/**
 * Centralized account deletion email content
 * Used for account deletion verification
 */

export interface DeleteAccountEmailParams {
  userName: string
  userEmail: string
  deletionLink: string
}

export function getDeleteAccountEmailContent(params: DeleteAccountEmailParams) {
  const { userName, userEmail, deletionLink } = params
  const userDisplay = userName || userEmail

  return {
    subject: 'Confirm Account Deletion',
    params: {
      greeting: `Hello ${userDisplay},`,
      body_text: `You have requested to delete your account. This action cannot be undone. All your data will be permanently deleted.
             <p style="text-align: center;">
                <a href="${deletionLink}" class="button">Delete Account</a>
            </p>
        `,
      action_url: deletionLink,
      action_text: 'Delete Account',
      footer_text: 'If you did not request to delete your account, please ignore this email and your account will remain active.'
    }
  }
}