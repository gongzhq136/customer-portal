import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access'

// Define our custom statements for questionnaires and responses
export const statement = {
  ...defaultStatements,
  'service-request': [
    'create',
    'read',
    'update',
    'delete',
    'list',
  ],
  // Organization-related permissions
  'organization': [
    'read',
    'create',
    'update',
    'delete',
  ],
  'member': [
    'read',
    'list',
    'create',
    'update',
    'delete',
    'update-name',
  ],
  'invitation': [
    'list',
    'create',
    'resend',
    'cancel',
    'delete',
  ],
} as const

// Create the access control instance
const ac = createAccessControl(statement)

// Define our roles with their permissions
export const user = ac.newRole({
  'service-request': ['create', 'read', 'update', 'delete', 'list',],
})

export const admin = ac.newRole({
  ...adminAc.statements,
  'service-request': ['create', 'read', 'update', 'delete', 'list',],
})

// Export the access control instance and roles
export { ac }
