declare global {
  export type ServiceRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  export type ServiceRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

  export interface ServiceRequestAttachment {
    id: string
    url: string
    filename: string
    size: number
    mimeType: string
    uploadedAt: Date
    uploadedById?: string
  }

  export interface ServiceRequest {
    id: string
    title: string
    description: string
    status: ServiceRequestStatus
    priority: ServiceRequestPriority
    category?: string
    organizationId: string
    createdById: string
    assignedToId?: string
    attachments?: ServiceRequestAttachment[]
    internalNotes?: string
    createdAt: Date
    updatedAt: Date
    resolvedAt?: Date
    closedAt?: Date
  }

  export interface ServiceRequestWithRelations extends ServiceRequest {
    createdBy: {
      id: string
      name?: string
      email: string
      image?: string
    }
    assignedTo?: {
      id: string
      name?: string
      email: string
      image?: string
    }
    organization?: {
      id: string
      name: string
      slug: string
      logo?: string
    }
  }

  export interface ServiceRequestFilters {
    status?: ServiceRequestStatus
    priority?: ServiceRequestPriority
    category?: string
    assignedToId?: string
    createdById?: string
    search?: string
    page?: number
    limit?: number
  }

  export interface ServiceRequestCreateInput {
    title: string
    description: string
    priority?: ServiceRequestPriority
    category?: string
  }

  export interface ServiceRequestUpdateInput {
    title?: string
    description?: string
    status?: ServiceRequestStatus
    priority?: ServiceRequestPriority
    category?: string
  }

  export interface AdminServiceRequestUpdateInput extends ServiceRequestUpdateInput {
    assignedToId?: string
    internalNotes?: string
  }
}

export {}
