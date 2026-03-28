import { z } from 'zod'

export const createServiceRequestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().max(100).optional()
})

export const updateServiceRequestSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().max(100).optional()
})

export const adminUpdateServiceRequestSchema = updateServiceRequestSchema.extend({
  assignedToId: z.string().optional(),
  internalNotes: z.string().max(5000).optional()
})

export const filterServiceRequestSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  assignedToId: z.string().optional(),
  createdById: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'status', 'priority']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  skip: z.coerce.number().int().nonnegative().optional().default(0),
  take: z.coerce.number().int().positive().max(1000).optional().default(20)
})
