# Organizations Implementation Plan (Main Layer)

## Overview

Implement organization structure in the main application layer using better-auth's organization plugin. Each user will automatically get their own organization on signup, with the organization concept hidden from the UI initially to allow for future multi-user organization features.

## Phase 1: Install and Configure Better-Auth Organization Plugin

### 1.1 Update Dependencies

The better-auth organization plugin is available and provides comprehensive organization management features. No additional dependencies needed.

### 1.2 Configure Organization Plugin in Auth

Update `lib/auth.ts`:
```typescript
import { organization } from 'better-auth/plugins'

plugins: [
  organization({
    allowUserToCreateOrganization: true, // Allow all users to create organizations initially
    organizationHooks: {
      afterCreateOrganization: async ({ organization, member, user }) => {
        // Auto-create organization for new users
        console.log(`Created organization ${organization.name} for user ${user.email}`)
      }
    }
  }),
  // ... other plugins
]
```

## Phase 2: Database Migration

### 2.1 Run Better-Auth Migration

The better-auth organization plugin provides its own database schema through Drizzle. The schema is defined in `db/schema/auth-schema.ts`. Run Drizzle migrations to add all necessary tables:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

This will automatically create:
- `organization` table
- `member` table (organization members)
- `invitation` table (organization invitations)
- Updates to `session` table with `activeOrganizationId`

Note: The better-auth Drizzle adapter automatically provides the schema definitions, which are already included in `db/schema/auth-schema.ts`.

### 2.2 Verify Schema

The migration will add these tables with proper relationships and indexes. No manual schema modifications needed unless you want to add custom fields. The schema is defined in `db/schema/auth-schema.ts` using Drizzle ORM.

### 2.3 Generate Drizzle Migrations

After defining schema changes, generate Drizzle migrations:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Phase 3: Implement Auto-Creation Logic

### 3.1 Use Better-Auth Organization Hooks

The better-auth organization plugin provides hooks for auto-creation. Update `lib/auth.ts`:

```typescript
import { organization } from 'better-auth/plugins'

plugins: [
  organization({
    allowUserToCreateOrganization: true,
    organizationHooks: {
      afterCreateOrganization: async ({ organization, member, user }) => {
        // Auto-create organization for new users on signup
        console.log(`Created organization ${organization.name} for user ${user.email}`)
      }
    }
  }),
  // ... other plugins
],

// Use better-auth's built-in user creation hooks
// Note: Import db and userTable from your Drizzle setup
import { db } from './db'
import { userTable } from '~/db/schema/auth-schema'
import { eq } from 'drizzle-orm'

databaseHooks: {
  user: {
    create: {
      after: async (user: any) => {
        // Existing admin role assignment
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          await db.update(userTable)
            .set({ role: 'admin' })
            .where(eq(userTable.id, user.id))
        }
        
        // Auto-create organization using better-auth API
        const orgName = user.name || user.email.split('@')[0]
        const orgSlug = `${orgName.toLowerCase().replace(/\s+/g, '-')}-${user.id.slice(0, 8)}`
        
        await auth.api.createOrganization({
          body: {
            name: `${orgName}'s Organization`,
            slug: orgSlug,
            userId: user.id,
            keepCurrentActiveOrganization: false
          }
        })
      }
    }
  }
}
```

## Phase 4: Update Client-Side Integration

### 4.1 Add Organization Client Plugin

Update `lib/auth-client.ts`:
```typescript
import { createAuthClient } from 'better-auth/client'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: baseURL,
  plugins: [
    adminClient({ ... }),
    emailOTPClient(),
    organizationClient() // Add organization client
  ],
})
```

### 4.2 Create Organization Composable

Create `app/composables/useCurrentOrganization.ts`:
```typescript
export const useCurrentOrganization = () => {
  const { data: session } = useSession()
  
  const currentOrganization = computed(() => session.value?.user?.organization || null)
  const organizationId = computed(() => currentOrganization.value?.id)
  
  // Use better-auth client methods
  const createOrganization = async (data: { name: string; slug: string }) => {
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
  
  const inviteMember = async (email: string, organizationId: string) => {
    return await authClient.organization.inviteMember({
      email,
      organizationId
    })
  }
  
  return {
    currentOrganization,
    organizationId,
    createOrganization,
    getActiveMember,
    listMembers,
    inviteMember
  }
}
```

### 4.3 Update Custom Session

The better-auth organization plugin automatically includes organization data in the session. Update `lib/auth.ts`:

```typescript
import { db } from './db'
import { accountTable } from '~/db/schema/auth-schema'
import { eq } from 'drizzle-orm'

customSession(async (sessionData) => {
  const { user, session } = sessionData
  
  const [account] = await db
    .select()
    .from(accountTable)
    .where(eq(accountTable.userId, user.id))
    .limit(1)
  
  // Better-auth organization plugin handles organization data automatically
  // The user object will include activeOrganizationId and organization data
  
  return {
    ...session,
    user: {
      ...user,
      providerId: account?.providerId || null,
      // Organization data is automatically included by the plugin
    },
  }
})
```

## Phase 5: Leverage Built-in API Endpoints

### 5.1 Better-Auth Provides All Endpoints

The better-auth organization plugin automatically provides all necessary API endpoints:

- `POST /organization/create` - Create organization
- `GET /organization/list` - List user organizations  
- `POST /organization/switch` - Switch active organization
- `POST /organization/invite` - Invite members
- `GET /organization/members` - List organization members
- `POST /organization/remove-member` - Remove members
- `POST /organization/update-member-role` - Update member roles
- `POST /organization/leave` - Leave organization
- `GET /organization/active-member` - Get active member info
- `GET /organization/active-member-role` - Get active member role

### 5.2 No Custom API Endpoints Needed

All organization functionality is handled by better-auth's built-in endpoints. The client plugin provides methods to interact with these endpoints seamlessly.

### 5.3 Optional: Custom Endpoints for Business Logic

If you need custom business logic, create specific endpoints that use better-auth's server API:

```typescript
// server/api/organizations/custom-action.post.ts
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  // Use better-auth server API for organization operations
  const result = await auth.api.listMembers({
    query: { organizationId: session.user.activeOrganizationId }
  })
  
  // Add custom business logic here
  return result
})
```

## Phase 6: Leverage Built-in Permission System

### 6.1 Better-Auth Handles Permissions

The better-auth organization plugin includes built-in role-based permissions:

- **Owner**: Full control over organization
- **Admin**: Manage members and organization settings  
- **Member**: Basic organization access

### 6.2 Custom Roles (Optional)

If you need custom roles beyond the built-in ones, configure them in the organization plugin:

```typescript
// lib/auth.ts
plugins: [
  organization({
    // Custom roles can be created using the client API
    // authClient.organization.createRole()
  })
]
```

### 6.3 Integration with Existing Permission System

The organization plugin works alongside your existing permission system. Organization permissions are handled separately and can be checked using:

```typescript
// Check if user can perform organization actions
const { data: member } = await authClient.organization.getActiveMember()
const { data: role } = await authClient.organization.getActiveMemberRole()

// Use role data for permission checks
if (role.includes('owner') || role.includes('admin')) {
  // Allow organization management
}
```

## Phase 7: Create Helper Utilities

### 7.1 Use Better-Auth Client Methods

Instead of custom utilities, use the built-in better-auth client methods:

```typescript
// app/composables/useOrganizationHelpers.ts
export const useOrganizationHelpers = () => {
  // Get current user's organization
  const getCurrentOrganization = async () => {
    const { data: member } = await authClient.organization.getActiveMember()
    return member?.organization
  }
  
  // Check if user is organization owner
  const isOrganizationOwner = async () => {
    const { data: role } = await authClient.organization.getActiveMemberRole()
    return role?.includes('owner')
  }
  
  // Check if user is organization admin
  const isOrganizationAdmin = async () => {
    const { data: role } = await authClient.organization.getActiveMemberRole()
    return role?.includes('admin') || role?.includes('owner')
  }
  
  // List all user organizations
  const getUserOrganizations = async () => {
    const { data } = await authClient.organization.list()
    return data
  }
  
  return {
    getCurrentOrganization,
    isOrganizationOwner,
    isOrganizationAdmin,
    getUserOrganizations
  }
}
```

### 7.2 Server-Side Utilities (If Needed)

For server-side operations, use better-auth's server API:

```typescript
// lib/organization-utils.ts
import { auth } from './auth'

export async function getUserOrganization(userId: string) {
  // Use better-auth server API
  const result = await auth.api.listMembers({
    query: { userId }
  })
  return result[0]?.organization || null
}

export async function isOrganizationMember(userId: string, organizationId: string) {
  const members = await auth.api.listMembers({
    query: { organizationId }
  })
  return members.some(member => member.userId === userId)
}
```

## Phase 8: Vue UI Components

### 8.1 Create Custom Vue Components

Since better-auth-ui is React-based, we'll create custom Vue components using the better-auth client methods:

### 8.2 Organization Switcher Component

Create `app/components/OrganizationSwitcher.vue`:

```vue
<template>
  <div class="organization-switcher">
    <div v-if="loading" class="loading">Loading organizations...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="switcher">
      <label for="org-select">Organization:</label>
      <select 
        id="org-select" 
        v-model="selectedOrg" 
        @change="switchOrganization"
        class="org-select"
      >
        <option value="">Select Organization</option>
        <option v-for="org in organizations" :key="org.id" :value="org.id">
          {{ org.name }}
        </option>
      </select>
      <button @click="createNewOrg" class="create-btn">
        Create New Organization
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authClient } from '~/lib/auth-client'

const organizations = ref([])
const selectedOrg = ref('')
const loading = ref(true)
const error = ref('')

const loadOrganizations = async () => {
  try {
    loading.value = true
    const { data, error: orgError } = await authClient.organization.list()
    if (orgError) throw orgError
    organizations.value = data || []
  } catch (err) {
    error.value = err.message || 'Failed to load organizations'
  } finally {
    loading.value = false
  }
}

const switchOrganization = async (event) => {
  const orgId = event.target.value
  if (!orgId) return
  
  try {
    await authClient.organization.switch({ organizationId: orgId })
    // Refresh the page or emit event to update parent components
    await navigateTo('/dashboard')
  } catch (err) {
    error.value = err.message || 'Failed to switch organization'
  }
}

const createNewOrg = () => {
  // Navigate to organization creation page or show modal
  navigateTo('/organizations/create')
}

onMounted(() => {
  loadOrganizations()
})
</script>

<style scoped>
.organization-switcher {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
}

.org-select {
  margin: 0 0.5rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
}

.create-btn {
  padding: 0.25rem 0.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.create-btn:hover {
  background: #2563eb;
}
</style>
```

### 8.3 Organization Settings Component

Create `app/components/OrganizationSettings.vue`:

```vue
<template>
  <div class="organization-settings">
    <h2>Organization Settings</h2>
    
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="settings-form">
      <form @submit.prevent="updateOrganization">
        <div class="form-group">
          <label for="org-name">Organization Name:</label>
          <input 
            id="org-name"
            v-model="formData.name" 
            type="text" 
            required
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label for="org-slug">Organization Slug:</label>
          <input 
            id="org-slug"
            v-model="formData.slug" 
            type="text" 
            required
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label for="org-logo">Logo URL:</label>
          <input 
            id="org-logo"
            v-model="formData.logo" 
            type="url" 
            class="form-input"
          />
        </div>
        
        <div class="form-actions">
          <button type="submit" :disabled="updating" class="btn-primary">
            {{ updating ? 'Updating...' : 'Update Organization' }}
          </button>
          <button type="button" @click="deleteOrganization" class="btn-danger">
            Delete Organization
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authClient } from '~/lib/auth-client'

const loading = ref(true)
const updating = ref(false)
const error = ref('')
const formData = ref({
  name: '',
  slug: '',
  logo: ''
})

const loadOrganization = async () => {
  try {
    loading.value = true
    const { data: member } = await authClient.organization.getActiveMember()
    if (member?.organization) {
      formData.value = {
        name: member.organization.name,
        slug: member.organization.slug,
        logo: member.organization.logo || ''
      }
    }
  } catch (err) {
    error.value = err.message || 'Failed to load organization'
  } finally {
    loading.value = false
  }
}

const updateOrganization = async () => {
  try {
    updating.value = true
    await authClient.organization.update({
      organizationId: formData.value.id,
      data: formData.value
    })
    // Show success message
  } catch (err) {
    error.value = err.message || 'Failed to update organization'
  } finally {
    updating.value = false
  }
}

const deleteOrganization = async () => {
  if (!confirm('Are you sure you want to delete this organization?')) return
  
  try {
    await authClient.organization.delete({
      organizationId: formData.value.id
    })
    // Redirect to organization list or create new
    await navigateTo('/organizations')
  } catch (err) {
    error.value = err.message || 'Failed to delete organization'
  }
}

onMounted(() => {
  loadOrganization()
})
</script>

<style scoped>
.organization-settings {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}
</style>
```

### 8.4 Member Management Component

Create `app/components/OrganizationMembers.vue`:

```vue
<template>
  <div class="organization-members">
    <div class="members-header">
      <h3>Organization Members</h3>
      <button @click="showInviteModal = true" class="btn-primary">
        Invite Member
      </button>
    </div>
    
    <div v-if="loading" class="loading">Loading members...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="members-list">
      <div v-for="member in members" :key="member.id" class="member-card">
        <div class="member-info">
          <div class="member-name">{{ member.user.name || member.user.email }}</div>
          <div class="member-email">{{ member.user.email }}</div>
          <div class="member-role">{{ member.role.join(', ') }}</div>
        </div>
        <div class="member-actions">
          <button @click="updateMemberRole(member)" class="btn-secondary">
            Update Role
          </button>
          <button @click="removeMember(member)" class="btn-danger">
            Remove
          </button>
        </div>
      </div>
    </div>
    
    <!-- Invite Modal -->
    <div v-if="showInviteModal" class="modal-overlay" @click="showInviteModal = false">
      <div class="modal" @click.stop>
        <h3>Invite Member</h3>
        <form @submit.prevent="inviteMember">
          <div class="form-group">
            <label for="invite-email">Email:</label>
            <input 
              id="invite-email"
              v-model="inviteEmail" 
              type="email" 
              required
              class="form-input"
            />
          </div>
          <div class="form-actions">
            <button type="submit" :disabled="inviting" class="btn-primary">
              {{ inviting ? 'Sending...' : 'Send Invitation' }}
            </button>
            <button type="button" @click="showInviteModal = false" class="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authClient } from '~/lib/auth-client'

const members = ref([])
const loading = ref(true)
const error = ref('')
const showInviteModal = ref(false)
const inviteEmail = ref('')
const inviting = ref(false)

const loadMembers = async () => {
  try {
    loading.value = true
    const { data, error: membersError } = await authClient.organization.listMembers({
      query: { organizationId: currentOrganizationId.value }
    })
    if (membersError) throw membersError
    members.value = data || []
  } catch (err) {
    error.value = err.message || 'Failed to load members'
  } finally {
    loading.value = false
  }
}

const inviteMember = async () => {
  try {
    inviting.value = true
    await authClient.organization.inviteMember({
      email: inviteEmail.value,
      organizationId: currentOrganizationId.value
    })
    showInviteModal.value = false
    inviteEmail.value = ''
    // Show success message
  } catch (err) {
    error.value = err.message || 'Failed to send invitation'
  } finally {
    inviting.value = false
  }
}

const updateMemberRole = async (member) => {
  // Implement role update logic
}

const removeMember = async (member) => {
  if (!confirm(`Remove ${member.user.email} from organization?`)) return
  
  try {
    await authClient.organization.removeMember({
      memberIdOrEmail: member.user.email,
      organizationId: currentOrganizationId.value
    })
    await loadMembers()
  } catch (err) {
    error.value = err.message || 'Failed to remove member'
  }
}

onMounted(() => {
  loadMembers()
})
</script>

<style scoped>
.organization-members {
  padding: 1rem;
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.member-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 500;
}

.member-email {
  color: #6b7280;
  font-size: 0.875rem;
}

.member-role {
  color: #3b82f6;
  font-size: 0.875rem;
}

.member-actions {
  display: flex;
  gap: 0.5rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  min-width: 400px;
}
</style>
```

## Technical Considerations

### Leveraging Better-Auth Features
- All organization functionality provided by better-auth plugin
- Built-in database schema with proper indexes
- Automatic API endpoints for all operations
- Built-in role-based permissions system
- Session management includes organization data

### Performance
- Better-auth handles all database optimizations
- Built-in caching and query optimization
- Efficient member listing and filtering
- Automatic pagination support

### Security
- Better-auth handles all security concerns
- Built-in permission checks
- Secure invitation system
- Row-level security via organization membership

## Testing

1. Test auto-creation on new user signup using better-auth hooks
2. Verify organization is assigned correctly via better-auth API
3. Test organization data in session (automatically handled by better-auth)
4. Verify composable returns correct org using better-auth client methods
5. Test migration script with existing users using better-auth API
6. Verify permissions are enforced using better-auth built-in system
7. Test all organization operations (create, invite, switch, etc.)

## Future Enhancements (Out of Scope)

- Custom organization UI components (better-auth-ui provides these)
- Organization billing/subscription integration
- Custom organization domains
- Advanced role customization

## Updated To-dos

- [x] Research better-auth organization plugin documentation and API
- [x] Configure organization plugin in lib/auth.ts
- [x] Run better-auth migration: `npx @better-auth/cli migrate`
- [x] Add organization client plugin to lib/auth-client.ts
- [x] Create useCurrentOrganization composable using better-auth client
- [x] Create useOrganizationHelpers composable
- [x] Update user creation hook to auto-create organizations
- [x] Create migration script for existing users using better-auth API
- [x] Create Vue components: OrganizationSwitcher.vue
- [x] Create Vue components: OrganizationSettings.vue
- [x] Create Vue components: OrganizationMembers.vue
- [x] Create menu option to create an organization
- [x] Create menu option to invite a user
- [x] Create a page for organization admins/owners where they can view the members and invitations
- [x] Create a page for admin users to view all organizations
- [x] Create a page for admin users to view all users
- [x] Create a form to update a users roles
- [ ] Test organization creation and assignment flows
- [ ] Test Vue components with better-auth client methods
