import type {
  QueryInput,
  FilterOperator as FilterOperatorType,
} from '#types'
import { z } from 'zod'
import type { SQL, SQLWrapper, AnyColumn } from 'drizzle-orm'
import { and, eq, ne, gt, lt, gte, lte, ilike, inArray, notInArray, asc, desc } from 'drizzle-orm'

// Schema for FilterOperator - now using z.enum with actual values
export const FilterOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'contains',
  'startsWith',
  'endsWith',
  'in',
  'notIn',
])

// Schema for a single filter object
export const FilterSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  // Basic JSON value types. For more complex scenarios (e.g. Date), this might need refinement.
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string(), z.number(), z.boolean()])),
    z.null(),
  ]),
})

// Define Zod schema for the Sort object, matching QueryInput's Sort interface
export const SortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
})

// Base schema for common query parameters, now including a generic 'filters' array
export const BaseQuerySchema = z.object({
  take: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().int().min(1).optional(),
  ),
  skip: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().int().min(0).optional(),
  ),
  sortField: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  filters: z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return undefined
      }
    }
    return val
  }, z.array(FilterSchema).optional()),
})

/**
 * Type for a function that resolves a field path to a Drizzle column reference.
 * This allows the query builder to work with any table schema.
 */
export type FieldResolver = (fieldPath: string) => AnyColumn | SQLWrapper | undefined

/**
 * Creates a default field resolver from a Drizzle table object.
 * This automatically maps field names to table columns.
 *
 * @param table - The Drizzle table object (e.g., userTable)
 * @returns A FieldResolver function that resolves field names to columns
 *
 * @example
 * ```ts
 * const fieldResolver = createFieldResolver(userTable)
 * const { where } = buildDrizzleQuery(queryInput, fieldResolver)
 * ```
 */
export function createFieldResolver(table: unknown): FieldResolver {
  return (fieldPath: string): AnyColumn | SQLWrapper | undefined => {
    // Type assertion: Drizzle tables have column properties accessible by string keys
    const tableRecord = table as Record<string, unknown>
    const column = tableRecord[fieldPath]

    // Type guard to ensure it's a valid column (has column-like properties)
    if (
      column
      && typeof column === 'object'
      && column !== null
      && ('name' in column || 'getSQL' in column || 'table' in column)
    ) {
      return column as AnyColumn | SQLWrapper
    }
    return undefined
  }
}

/**
 * Creates a Drizzle SQL condition from a filter.
 * For nested fields (e.g., "relation.field"), you'll need to handle joins separately.
 * This function supports flat fields only.
 *
 * @param fieldResolver - Function to resolve field paths to column references
 * @param fieldPath - The field path (e.g., "name", "email", "createdAt")
 * @param operator - The filter operator
 * @param value - The filter value
 * @returns A Drizzle SQL condition
 */
function createFilterCondition(
  fieldResolver: FieldResolver,
  fieldPath: string,
  operator: FilterOperatorType,
  value: unknown,
): SQL | undefined {
  const column = fieldResolver(fieldPath)
  if (!column) {
    console.warn(`Field "${fieldPath}" could not be resolved to a column`)
    return undefined
  }

  // Type guard to ensure column is valid
  if (typeof column !== 'object' || column === null) {
    return undefined
  }

  // Handle null values
  if (value === null || value === undefined) {
    if (operator === 'eq') {
      return eq(column, null)
    }
    if (operator === 'neq') {
      return ne(column, null)
    }
    return undefined
  }

  switch (operator) {
    case 'eq':
      return eq(column, value)
    case 'neq':
      return ne(column, value)
    case 'gt':
      return gt(column, value)
    case 'lt':
      return lt(column, value)
    case 'gte':
      return gte(column, value)
    case 'lte':
      return lte(column, value)
    case 'contains':
      return ilike(column as AnyColumn, `%${String(value)}%`)
    case 'startsWith':
      return ilike(column as AnyColumn, `${String(value)}%`)
    case 'endsWith':
      return ilike(column as AnyColumn, `%${String(value)}`)
    case 'in':
      if (!Array.isArray(value)) {
        return undefined
      }
      return inArray(column, value)
    case 'notIn':
      if (!Array.isArray(value)) {
        return undefined
      }
      return notInArray(column, value)
    default:
      return undefined
  }
}

/**
 * Query builder result containing Drizzle-compatible query conditions
 */
export interface DrizzleQueryResult {
  /** Drizzle SQL where condition (can be used with .where()) */
  where: SQL | undefined
  /** Drizzle orderBy expression (can be used with .orderBy()) */
  orderBy: SQL | undefined
  /** Limit for pagination */
  limit: number | undefined
  /** Offset for pagination */
  offset: number | undefined
}

/**
 * Builds Drizzle ORM query conditions from a QueryInput object.
 *
 * @param queryInput - The QueryInput object containing dynamic filters, sorting, and pagination.
 * @param tableOrResolver - Either a Drizzle table object (e.g., userTable) or a FieldResolver function.
 *                         If a table is provided, a field resolver will be automatically created.
 * @param baseWhere - Optional base where condition to combine with filters (using AND).
 * @returns An object with `where`, `orderBy`, `limit`, and `offset` suitable for Drizzle queries.
 *
 * @example
 * ```ts
 * // Using a table (simpler)
 * const { where, orderBy, limit, offset } = buildDrizzleQuery(
 *   { filters: [{ field: 'email', operator: 'contains', value: 'example' }] },
 *   userTable
 * )
 *
 * // Using a custom field resolver (more control)
 * const { where, orderBy, limit, offset } = buildDrizzleQuery(
 *   { filters: [{ field: 'email', operator: 'contains', value: 'example' }] },
 *   (field) => userTable[field]
 * )
 *
 * let query = db.select().from(userTable)
 * if (where) query = query.where(where)
 * if (orderBy) query = query.orderBy(orderBy)
 * if (limit) query = query.limit(limit)
 * if (offset) query = query.offset(offset)
 * const users = await query
 * ```
 */
export function buildDrizzleQuery(
  queryInput: QueryInput,
  tableOrResolver: unknown | FieldResolver,
  baseWhere?: SQL,
): DrizzleQueryResult {
  // Determine if tableOrResolver is a function (FieldResolver) or a table object
  const fieldResolver: FieldResolver = typeof tableOrResolver === 'function'
    ? (tableOrResolver as FieldResolver)
    : createFieldResolver(tableOrResolver)
  // 1. Build where conditions from filters
  const filterConditions: SQL[] = []

  if (queryInput.filters?.length) {
    for (const filter of queryInput.filters) {
      const condition = createFilterCondition(
        fieldResolver,
        filter.field,
        filter.operator as FilterOperatorType,
        filter.value,
      )
      if (condition) {
        filterConditions.push(condition)
      }
    }
  }

  // Combine baseWhere and filter conditions with AND
  let finalWhere: SQL | undefined = undefined
  if (baseWhere && filterConditions.length > 0) {
    finalWhere = and(baseWhere, ...filterConditions)!
  } else if (baseWhere) {
    finalWhere = baseWhere
  } else if (filterConditions.length > 0) {
    finalWhere = filterConditions.length === 1
      ? filterConditions[0]
      : and(...filterConditions)!
  }

  // 2. Build orderBy
  let orderBy: SQL | undefined = undefined
  if (queryInput.sortField) {
    const column = fieldResolver(queryInput.sortField)
    if (column) {
      const direction = queryInput.sortDirection || 'asc'
      orderBy = direction === 'desc' ? desc(column) : asc(column)
    }
  }

  // 3. Extract limit and offset
  const limit = queryInput.take
  const offset = queryInput.skip

  return {
    where: finalWhere,
    orderBy,
    limit,
    offset,
  }
}
