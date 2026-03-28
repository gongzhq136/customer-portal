export type FilterOperator
  = | 'eq' // Equals
    | 'neq' // Not equals
    | 'gt' // Greater than
    | 'lt' // Less than
    | 'gte' // Greater than or equal
    | 'lte' // Less than or equal
    | 'contains' // String contains (case-insensitive)
    | 'startsWith' // String starts with
    | 'endsWith' // String ends with
    | 'in' // Value in array
    | 'notIn' // Value not in array

export interface Filter {
  field: string // e.g., "name", "price", "createdAt"
  operator: FilterOperator
  value: unknown // string, number, boolean, array, etc.
}

export interface QueryInput {
  filters?: Filter[] // Array of filters (implicit AND)
  sortField?: string // Sorting options
  sortDirection?: 'asc' | 'desc'
  take?: number // Number of records to return
  skip?: number // Number of records to skip
}

export interface QueryResult<T> {
  items: T[]
  totalCount: number
}
