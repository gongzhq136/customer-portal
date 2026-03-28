/* eslint-disable @stylistic/semi */
/* eslint-disable semi */
/* eslint-disable @stylistic/quotes */
import { pgEnum, pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

// Enums
export const serviceRequestStatus = pgEnum('ServiceRequestStatus', [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
])

export const serviceRequestPriority = pgEnum('ServiceRequestPriority', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
])

// Table
export const serviceRequest = pgTable('service_request', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: serviceRequestStatus('status').default('OPEN').notNull(),
  priority: serviceRequestPriority('priority').default('MEDIUM').notNull(),
  category: text('category'),

  // Relations (FKs by convention; define explicit FKs in migrations if desired)
  organizationId: text('organizationId').notNull(),
  createdById: text('createdById').notNull(),
  assignedToId: text('assignedToId'),

  // Metadata
  attachments: jsonb('attachments'),
  internalNotes: text('internalNotes'),

  // Timestamps
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  resolvedAt: timestamp('resolvedAt', { mode: 'date' }),
  closedAt: timestamp('closedAt', { mode: 'date' }),
}, (table) => [
  index("service_request_organization_id_idx").on(table.organizationId),
  index("service_request_created_by_id_idx").on(table.createdById),
  index("service_request_assigned_to_id_idx").on(table.assignedToId),
  index("service_request_status_idx").on(table.status),
  index("service_request_created_at_idx").on(table.createdAt)
]);
