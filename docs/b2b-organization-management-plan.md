# B2B Organization Management Implementation

## Overview
Transform the customer portal from a self-service organization model to a B2B admin-controlled model where:
- Only admins can create organizations
- Admins invite organization owners
- Owners accept invitations during signup and automatically get owner role
- Owners can invite other members
- All parties can view, resend, and delete invitations

## UI/UX Requirements

### Component Library
- **All UI components must use NuxtUI** (already configured in project)
- Use NuxtUI components: `UCard`, `UButton`, `UInput`, `UFormGroup`, `UAlert`, `UModal`, `UTable`, `UBadge`, `UDropdown`, `UAvatar`, `USelect`, etc.
- Follow existing patterns from `app/components/admin/organizations.vue` and other admin components

### Responsive Design
- **Mobile-first approach**: All interfaces must work seamlessly on mobile and desktop
- Use NuxtUI's responsive utilities and grid system
- Tables should be scrollable on mobile or converted to card layouts
- Modals should be full-screen on mobile, centered on desktop
- Forms should stack vertically on mobile, use grid layouts on desktop
- Navigation and action buttons should be touch-friendly (adequate spacing)

### Design Patterns
- Follow existing admin UI patterns (see `app/components/admin/organizations.vue`)
- Use consistent spacing, typography, and color schemes
- Implement loading states with `UButton` loading prop and `UIcon` spinners
- Use `UAlert` for error and success messages
- Implement confirmation dialogs for destructive actions (delete, cancel)

## Current State Analysis
- `server/utils/auth.ts`: Currently allows all users to create organizations (`allowUserToCreateOrganization: true`) and auto-creates organizations on user signup
- `app/pages/organizations/create.vue`: Organization creation page (currently commented out)
- `app/composables/useOrganization.ts`: Has basic organization methods including `inviteMember`
- `server/api/organizations/[id]/invitations.get.ts`: Exists for listing invitations
- Better Auth organization plugin is already configured with invitation support

## Implementation Steps

### 1. Update Auth Configuration (`server/utils/auth.ts`)
- Set `allowUserToCreateOrganization: false` to restrict creation to admins only
- Remove auto-organization creation from `databaseHooks.user.create.after`
- Configure `sendInvitationEmail` hook to send invitation emails
- Add `afterAcceptInvitation` hook to ensure users get the correct role (owner) when accepting admin invitations

### 2. Create Admin Organization Management UI
- **File**: `app/pages/admin/organizations/[slug].vue` (create new)
- Use NuxtUI components: `UCard`, `UButton`, `UInput`, `UFormGroup`, `UAlert`, `UTable`, `UBadge`, `UModal`
- Responsive layout: Stack cards vertically on mobile, side-by-side on desktop
- Display organization details in `UCard`
- Show members list in responsive `UTable` (scrollable on mobile)
- Show invitations list with actions (resend, delete) in `UTable` or card layout
- Modal form to invite owner with email input using `UInput` and `UFormGroup`
- Use `authClient.organization.inviteMember()` with role 'owner'
- Loading states and error handling with `UAlert`

### 3. Update Admin Organizations List (`app/components/admin/organizations.vue`)
- Use existing NuxtUI components (already using `UCard`, `UButton`)
- Add "Create Organization" button using `UButton` with icon
- Responsive button placement: Full width on mobile, inline on desktop
- Link to organization detail pages using `UButton` with `to` prop
- Ensure card layout is responsive (stack on mobile)

### 4. Create Admin Organization Creation Page
- **File**: `app/pages/admin/organizations/create.vue` (create new)
- Use NuxtUI components: `UCard`, `UButton`, `UInput`, `UFormGroup`, `UAlert`
- Responsive form layout: Full width on mobile, centered card on desktop
- Form with name and slug fields using `UInput` and `UFormGroup`
- Auto-generate slug from name (existing pattern)
- Use `auth.api.createOrganization()` server-side (admin-only endpoint)
- Loading state on submit button
- Redirect to organization detail page after creation

### 5. Create Server API Endpoints
- **File**: `server/api/admin/organizations.post.ts` (create new)
- Admin-only endpoint to create organizations
- Use `auth.api.createOrganization()` with `userId` parameter

- **File**: `server/api/admin/organizations/[id]/invitations.get.ts` (create new)
- List all invitations for an organization (admin access)

- **File**: `server/api/admin/organizations/[id]/invitations/[invitationId]/resend.post.ts` (create new)
- Resend invitation email using `auth.api.inviteMember()` with `resend: true`

- **File**: `server/api/admin/organizations/[id]/invitations/[invitationId]/delete.post.ts` (create new)
- Cancel invitation using `auth.api.cancelInvitation()`

### 6. Update Signup Flow (`app/pages/signup.vue`)
- Use existing NuxtUI `UAuthForm` component (already in use)
- Check for invitation ID in query parameters (`?invitationId=xxx`)
- Store invitation ID in session/localStorage
- Display invitation context with `UAlert` if invitation exists
- After email verification, automatically accept invitation if present
- Use `authClient.organization.acceptInvitation({ invitationId })`
- Mobile-responsive form (already handled by `UAuthForm`)

### 7. Update Email Verification (`app/pages/verify-email.vue`)
- After successful verification, check for pending invitation
- If invitation exists, automatically accept it
- Redirect to dashboard after acceptance
- Use `UAlert` to show invitation acceptance status

### 8. Create Owner Organization Management UI
- **File**: `app/pages/organization/members.vue` (create new or update existing)
- Use NuxtUI components: `UCard`, `UButton`, `UInput`, `UFormGroup`, `UAlert`, `UTable`, `UBadge`, `UModal`, `USelect`
- Responsive layout: Cards stack on mobile, side-by-side on desktop
- List organization members in responsive `UTable` or card layout
- List pending invitations with actions (resend, delete) in `UTable` or card layout
- Modal form to invite new members with role selection using `USelect`
- Use `authClient.organization.inviteMember()` for inviting
- Use `authClient.organization.listInvitations()` for listing
- Use `authClient.organization.cancelInvitation()` for deleting
- Use `authClient.organization.inviteMember({ resend: true })` for resending
- Confirmation dialogs for delete actions
- Loading states and error handling

### 9. Create Server API Endpoints for Owner
- **File**: `server/api/organizations/[id]/invitations/[invitationId]/resend.post.ts` (create new)
- Resend invitation (owner/admin access check)

- **File**: `server/api/organizations/[id]/invitations/[invitationId]/delete.post.ts` (create new)
- Cancel invitation (owner/admin access check)

### 10. Update Organization Composable (`app/composables/useOrganization.ts`)
- Add methods:
  - `listInvitations(organizationId)` - wrapper for `authClient.organization.listInvitations()`
  - `resendInvitation(invitationId, organizationId, email, role)` - wrapper for inviteMember with resend
  - `cancelInvitation(invitationId)` - wrapper for `authClient.organization.cancelInvitation()`
  - `acceptInvitation(invitationId)` - wrapper for `authClient.organization.acceptInvitation()`

### 11. Update Invitation Email Template
- Configure `sendInvitationEmail` in organization plugin options
- Include invitation link with invitation ID: `${baseURL}/signup?invitationId=${invitation.id}`
- Use existing email utility (`server/utils/email.ts`)

### 12. Remove/Update Public Organization Creation
- Remove or restrict `app/pages/organizations/create.vue` (redirect non-admins or remove entirely)

## Technical Details

### Better Auth Methods Used
- `auth.api.createOrganization()` - Server-side organization creation (admin only)
- `authClient.organization.inviteMember()` - Invite with role and resend option
- `authClient.organization.listInvitations()` - List organization invitations
- `authClient.organization.cancelInvitation()` - Delete/cancel invitation
- `authClient.organization.acceptInvitation()` - Accept invitation (after signup/login)
- `authClient.organization.listUserInvitations()` - List invitations for current user

### Role Assignment
- Admin creates organization → no member created initially
- Admin invites owner → invitation with role 'owner'
- Owner accepts invitation → automatically becomes member with 'owner' role (handled by Better Auth)
- Owner invites members → invitations with specified roles

### Access Control
- Organization creation: Admin only (via `allowUserToCreateOrganization: false`)
- Invitation management: Admin (for all orgs) or Owner (for their org)
- Member invitation: Admin or Owner only

## Implementation Todos

1. Update auth config to restrict org creation to admins and remove auto-creation
2. Create admin organization detail page with NuxtUI components and responsive design
3. Create admin organization creation page with NuxtUI form components
4. Update signup flow to handle invitation acceptance with NuxtUI alerts
5. Create owner organization management UI with NuxtUI components and responsive tables
6. Create API endpoints for invitation resend and delete (admin and owner)
7. Configure invitation email template with signup link
8. Update organization composable with invitation management methods


