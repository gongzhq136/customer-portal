# Query Builder Documentation

This document explains how to use the generic Drizzle ORM query builder for building dynamic database queries with filters, sorting, and pagination.

## Overview

The query builder provides a standardized way to:
- Build dynamic WHERE clauses from filter arrays
- Apply sorting (orderBy) based on field names
- Handle pagination with limit and offset
- Work with any Drizzle table schema

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Filter Operators](#filter-operators)
3. [Query Input Structure](#query-input-structure)
4. [API Endpoint Example](#api-endpoint-example)
5. [Advanced Usage](#advanced-usage)
6. [Type Definitions](#type-definitions)

## Basic Usage

### Simple Example

```typescript
import { buildDrizzleQuery, BaseQuerySchema } from '~~/server/utils/query-builder'
import { db } from '~~/server/utils/db'
import { user as userTable } from '~~/server/db/schema/auth-schema'
import { getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  // Parse query parameters
  const queryParams = getQuery(event)
  const queryInput = BaseQuerySchema.parse(queryParams)

  // Build query conditions - pass table directly
  const { where, orderBy, limit, offset } = buildDrizzleQuery(queryInput, userTable)

  // Build and execute query
  const baseSelect = db.select().from(userTable)
  const queryWithWhere = where ? baseSelect.where(where) : baseSelect
  const queryWithOrder = queryWithWhere.orderBy(orderBy || userTable.createdAt)
  
  const finalQuery = (() => {
    let q = queryWithOrder
    if (limit !== undefined) q = q.limit(limit) as typeof q
    if (offset !== undefined) q = q.offset(offset) as typeof q
    return q
  })()

  const users = await finalQuery
  return users
})
```

### Using Custom Field Resolver

If you need more control over field resolution (e.g., for joins or computed fields), you can pass a custom resolver function:

```typescript
const customResolver = (fieldPath: string) => {
  // Custom logic for resolving fields
  if (fieldPath === 'fullName') {
    return sql`${userTable.firstName} || ' ' || ${userTable.lastName}`
  }
  return userTable[fieldPath as keyof typeof userTable]
}

const { where, orderBy, limit, offset } = buildDrizzleQuery(queryInput, customResolver)
```

## Filter Operators

The query builder supports the following filter operators:

| Operator | Description | Example Value Types |
|----------|-------------|---------------------|
| `eq` | Equals | `string`, `number`, `boolean`, `null` |
| `neq` | Not equals | `string`, `number`, `boolean`, `null` |
| `gt` | Greater than | `number`, `Date` |
| `lt` | Less than | `number`, `Date` |
| `gte` | Greater than or equal | `number`, `Date` |
| `lte` | Less than or equal | `number`, `Date` |
| `contains` | String contains (case-insensitive) | `string` |
| `startsWith` | String starts with (case-insensitive) | `string` |
| `endsWith` | String ends with (case-insensitive) | `string` |
| `in` | Value in array | `string[]`, `number[]` |
| `notIn` | Value not in array | `string[]`, `number[]` |

### Filter Examples

```typescript
// Single filter
const queryInput = {
  filters: [
    { field: 'email', operator: 'contains', value: '@example.com' }
  ]
}

// Multiple filters (combined with AND)
const queryInput = {
  filters: [
    { field: 'email', operator: 'contains', value: '@example.com' },
    { field: 'banned', operator: 'eq', value: false },
    { field: 'role', operator: 'in', value: ['admin', 'user'] }
  ]
}

// Comparison filters
const queryInput = {
  filters: [
    { field: 'createdAt', operator: 'gte', value: new Date('2024-01-01') },
    { field: 'age', operator: 'lt', value: 65 }
  ]
}

// Null checks
const queryInput = {
  filters: [
    { field: 'deletedAt', operator: 'eq', value: null }
  ]
}
```

## Query Input Structure

The `QueryInput` interface has the following structure:

```typescript
interface QueryInput {
  filters?: Filter[]           // Array of filter objects
  sortField?: string          // Field name to sort by
  sortDirection?: 'asc' | 'desc'  // Sort direction (defaults to 'asc')
  take?: number               // Limit (number of records)
  skip?: number               // Offset (number of records to skip)
}

interface Filter {
  field: string               // Field name (must match table column)
  operator: FilterOperator    // One of the supported operators
  value: unknown              // Filter value (type depends on operator)
}
```

### Parsing Query Parameters

When receiving query parameters from HTTP requests, use `BaseQuerySchema`:

```typescript
import { BaseQuerySchema } from '~~/server/utils/query-builder'
import { getQuery } from 'h3'

const queryParams = getQuery(event)
const queryInput = BaseQuerySchema.parse(queryParams)
```

The schema automatically handles:
- Converting string numbers to numbers for `take` and `skip`
- Parsing JSON stringified `filters` array
- Validating filter structure and operators

### Query Parameter Format

For HTTP requests, filters can be passed as a JSON string:

```
GET /api/users?filters=[{"field":"email","operator":"contains","value":"@example.com"}]&sortField=createdAt&sortDirection=desc&take=10&skip=0
```

Or as separate query parameters:

```
GET /api/users?sortField=createdAt&sortDirection=desc&take=10&skip=0
```

## API Endpoint Example

Here's a complete example of an API endpoint using the query builder:

```typescript
import { defineEventHandler, createError, getQuery } from 'h3'
import { auth } from '~~/server/utils/auth'
import { db } from '~~/server/utils/db'
import { user as userTable } from '~~/server/db/schema/auth-schema'
import { buildDrizzleQuery, BaseQuerySchema } from '~~/server/utils/query-builder'
import type { SessionUser, AdminUsersResponse, QueryInput } from '~~/shared/types'

export default defineEventHandler(async (event): Promise<AdminUsersResponse> => {
  // Authentication check
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = session.user as SessionUser
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // Parse and validate query parameters
  const queryParams = getQuery(event)
  const queryInput = BaseQuerySchema.parse(queryParams) as QueryInput

  // Build query conditions
  const { where, orderBy, limit, offset } = buildDrizzleQuery(queryInput, userTable)

  // Build the query
  const baseSelect = db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      emailVerified: userTable.emailVerified,
      createdAt: userTable.createdAt,
      banned: userTable.banned,
    })
    .from(userTable)

  // Apply conditions
  const queryWithWhere = where ? baseSelect.where(where) : baseSelect
  const queryWithOrder = queryWithWhere.orderBy(orderBy || userTable.createdAt)

  // Apply pagination
  const finalQuery = (() => {
    let q = queryWithOrder
    if (limit !== undefined) q = q.limit(limit) as typeof q
    if (offset !== undefined) q = q.offset(offset) as typeof q
    return q
  })()

  const users = await finalQuery
  return users as AdminUsersResponse
})
```

## Advanced Usage

### Combining with Base Where Conditions

You can combine dynamic filters with static base conditions:

```typescript
import { eq, and } from 'drizzle-orm'

// Base condition: only show active users
const baseWhere = eq(userTable.active, true)

// Build query with both base condition and dynamic filters
const { where, orderBy, limit, offset } = buildDrizzleQuery(
  queryInput,
  userTable,
  baseWhere  // Base condition combined with filters using AND
)
```

### Custom Field Resolver for Joins

For queries involving joins, create a custom resolver:

```typescript
import { organization as orgTable, member as memberTable } from '~~/server/db/schema/auth-schema'

const fieldResolver = (fieldPath: string) => {
  // Handle fields from joined tables
  if (fieldPath.startsWith('organization.')) {
    const orgField = fieldPath.replace('organization.', '')
    return orgTable[orgField as keyof typeof orgTable]
  }
  
  // Default to member table fields
  return memberTable[fieldPath as keyof typeof memberTable]
}

const { where } = buildDrizzleQuery(queryInput, fieldResolver)

// Then use in a join query
const result = await db
  .select()
  .from(memberTable)
  .leftJoin(orgTable, eq(memberTable.organizationId, orgTable.id))
  .where(where)
```

### Error Handling

The query builder handles invalid fields gracefully:

```typescript
// If a field doesn't exist in the table, it will:
// 1. Log a warning to console
// 2. Return undefined for that filter condition
// 3. Continue processing other valid filters

const queryInput = {
  filters: [
    { field: 'email', operator: 'contains', value: 'test' },      // Valid
    { field: 'invalidField', operator: 'eq', value: 'test' },    // Invalid - ignored
    { field: 'name', operator: 'contains', value: 'John' }       // Valid
  ]
}
// Only 'email' and 'name' filters will be applied
```

## Type Definitions

### Exported Types

```typescript
// Query builder result
interface DrizzleQueryResult {
  where: SQL | undefined      // Drizzle SQL condition for WHERE clause
  orderBy: SQL | undefined    // Drizzle SQL expression for ORDER BY
  limit: number | undefined   // Limit value
  offset: number | undefined  // Offset value
}

// Field resolver function type
type FieldResolver = (fieldPath: string) => AnyColumn | SQLWrapper | undefined
```

### Exported Functions

```typescript
// Main query builder function
function buildDrizzleQuery(
  queryInput: QueryInput,
  tableOrResolver: unknown | FieldResolver,
  baseWhere?: SQL
): DrizzleQueryResult

// Helper to create field resolver from table
function createFieldResolver(table: unknown): FieldResolver
```

### Exported Schemas

```typescript
// Zod schema for validating query parameters
const BaseQuerySchema: z.ZodObject<{
  take: z.ZodOptional<z.ZodNumber>
  skip: z.ZodOptional<z.ZodNumber>
  sortField: z.ZodOptional<z.ZodString>
  sortDirection: z.ZodOptional<z.ZodEnum<['asc', 'desc']>>
  filters: z.ZodOptional<z.ZodArray<FilterSchema>>
}>

// Filter operator schema
const FilterOperatorSchema: z.ZodEnum<[
  'eq', 'neq', 'gt', 'lt', 'gte', 'lte',
  'contains', 'startsWith', 'endsWith',
  'in', 'notIn'
]>
```

## Best Practices

1. **Always validate input**: Use `BaseQuerySchema.parse()` to validate and parse query parameters
2. **Provide defaults**: Always provide a default `orderBy` if none is specified
3. **Handle undefined values**: Check for `undefined` before applying `limit` and `offset`
4. **Use table directly**: Prefer passing the table object over creating a custom resolver when possible
5. **Combine filters wisely**: Multiple filters are combined with AND - use `in` operator for OR-like behavior
6. **Type safety**: Use TypeScript types from `#types` for `QueryInput` and filter types

## Common Patterns

### Pagination Pattern

```typescript
const queryInput = {
  take: 20,    // Page size
  skip: 0,     // Page offset (page * pageSize)
  sortField: 'createdAt',
  sortDirection: 'desc' as const
}
```

### Search Pattern

```typescript
const queryInput = {
  filters: [
    { field: 'name', operator: 'contains', value: searchTerm },
    { field: 'email', operator: 'contains', value: searchTerm }
  ]
}
// Note: This creates AND conditions. For OR, you'd need a custom resolver or multiple queries.
```

### Filter by Status Pattern

```typescript
const queryInput = {
  filters: [
    { field: 'status', operator: 'in', value: ['active', 'pending'] },
    { field: 'deletedAt', operator: 'eq', value: null }
  ]
}
```

## Troubleshooting

### Field Not Found

If a field is not being filtered, check:
1. Field name matches the table column name exactly (case-sensitive)
2. Field exists in the table schema
3. Check console for warnings about unresolved fields

### Type Errors

If you encounter TypeScript errors:
1. Ensure you're importing types from `#types`
2. Use `as QueryInput` when parsing query parameters
3. Check that your table type matches what Drizzle expects

### Filters Not Applied

If filters aren't working:
1. Verify the filter structure matches the `Filter` interface
2. Check that the operator is one of the supported values
3. Ensure the value type matches what the operator expects
4. Check console logs for warnings

## See Also

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- Example implementation: `server/api/admin/users-query.get.ts`

