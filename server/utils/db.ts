import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

// Declare globals to avoid multiple instances in development
declare global {
  var db: ReturnType<typeof drizzle> | undefined
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = globalThis.db || drizzle(pool)

// If in development, assign the instances to the global variables
if (process.env.NODE_ENV !== 'production') {
  globalThis.db = db
}
