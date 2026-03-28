/**
 * Database entity types based on db/schema/auth-schema.ts
 * These types represent the database entities as they appear in the database
 */

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
  role?: string
  banned?: boolean
  banReason?: string
  banExpires?: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  createdAt: Date
  metadata?: string
}

export interface Member {
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: Date
}

export interface Invitation {
  id: string
  organizationId: string
  email: string
  role?: string
  status: string
  expiresAt: Date
  inviterId: string
}

export interface Session {
  id: string
  expiresAt: Date
  token: string
  createdAt: Date
  updatedAt: Date
  ipAddress?: string
  userAgent?: string
  userId: string
  activeOrganizationId?: string
  impersonatedBy?: string
}

export interface Account {
  id: string
  accountId: string
  providerId: string
  userId: string
  accessToken: string
  refreshToken: string
  idToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
  scope: string
  password: string
  createdAt: Date
  updatedAt: Date
}

export interface Verification {
  id: string
  identifier: string
  value: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}
