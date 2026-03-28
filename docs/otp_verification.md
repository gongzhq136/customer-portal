# Email OTP Verification Implementation

This application now uses one-time password (OTP) codes for email verification instead of verification links.

## How It Works

### 1. Server Configuration (`lib/auth.ts`)

- **Email OTP Plugin**: Added `emailOTP` plugin with `overrideDefaultEmailVerification: true`
- **OTP Sending**: Custom `sendVerificationOTP` method sends codes via existing Resend email infrastructure
- **Multiple Types**: Supports "email-verification", "sign-in", and "password-reset" OTP types

### 2. Client Configuration (`lib/auth-client.ts`)

- **Email OTP Client**: Added `emailOTPClient` plugin
- **Exported Methods**: `emailOTP` object with verification methods

### 3. Verification Page (`app/pages/verify-email.vue`)

- **User Interface**: Clean, responsive OTP input form
- **Auto-submit**: Automatically submits when 6 digits are entered
- **Resend Functionality**: 60-second cooldown between resend attempts
- **Error Handling**: Comprehensive error messages and validation
- **Internationalization**: Full English and Dutch translation support

## Usage

### For New Users

1. User signs up with email/password
2. System automatically sends OTP code to email
3. User redirected to `/verify-email?email=user@example.com`
4. User enters 6-digit code
5. Email verified, user redirected to dashboard

### For Manual Verification

```typescript
// Send verification code
await authClient.emailOTP.sendVerificationOtp({
  email: 'user@example.com',
  type: 'email-verification'
})

// Verify the code
await authClient.emailOTP.verifyEmail({
  email: 'user@example.com',
  otp: '123456'
})
```

## Features

- ✅ **6-digit numeric codes** (auto-formatted input)
- ✅ **Auto-submit** when code is complete
- ✅ **Resend functionality** with cooldown timer
- ✅ **Mobile-friendly** input (numeric keypad)
- ✅ **Error handling** with user-friendly messages
- ✅ **Internationalization** (English/Dutch)
- ✅ **Security** (codes expire automatically)
- ✅ **Accessibility** (proper labels and focus management)

## Email Template

The OTP codes are sent using the existing email template system with:
- **Subject**: "Verify your Apex Pro email address"
- **Body**: "Your verification code is: 123456"
- **Footer**: Expiration notice and security information

## Benefits Over Link Verification

1. **More Secure**: Codes expire quickly and are single-use
2. **Better Mobile UX**: Easy to copy/paste from email
3. **No Email Client Issues**: Prevents prefetching problems
4. **Consistent Experience**: Same flow across all devices
5. **Future-Ready**: Foundation for passwordless authentication

## Configuration

No additional environment variables needed - uses existing:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

The OTP system integrates seamlessly with the existing email infrastructure and authentication flow.
