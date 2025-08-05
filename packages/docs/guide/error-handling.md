# Error Handling

This guide covers comprehensive error handling strategies for GQLB applications, from GraphQL errors to network failures and validation issues.

## GraphQL Error Types

### Understanding GraphQL Errors

GraphQL errors can occur at different levels:

```typescript
import { b } from './generated'

// Query that might produce different error types
const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.id(),
    b.name(),
    b.email(),
    b.posts(b => [
      b.id(),
      b.title(),
    ])
  ])
])

// Different error scenarios:
// 1. Validation errors (query structure)
// 2. Execution errors (resolver failures)
// 3. Network errors (connection issues)
// 4. Permission errors (authorization)
```

### Handling GraphQL Response Errors

```typescript
import { ExecutionResult } from 'graphql'

interface GraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: Array<string | number>
  extensions?: {
    code?: string
    exception?: any
    [key: string]: any
  }
}

async function executeWithErrorHandling<T>(
  query: Operation<T>,
  variables: VariablesOf<typeof query>
): Promise<T> {
  try {
    const result: ExecutionResult = await client.query({
      query: query.document(),
      variables
    })

    // Handle GraphQL errors
    if (result.errors && result.errors.length > 0) {
      throw new GraphQLExecutionError(result.errors, result.data)
    }

    // Handle partial data
    if (!result.data) {
      throw new Error('No data returned from GraphQL query')
    }

    return result.data as T
  } catch (error) {
    if (error instanceof ApolloError) {
      throw new GraphQLNetworkError(error)
    }
    throw error
  }
}
```

## Custom Error Classes

### Structured Error Handling

```typescript
// Base GraphQL error class
export class GraphQLError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly path?: Array<string | number>
  ) {
    super(message)
    this.name = 'GraphQLError'
  }
}

// Network-related errors
export class GraphQLNetworkError extends GraphQLError {
  constructor(public readonly originalError: Error) {
    super(
      `Network error: ${originalError.message}`,
      'NETWORK_ERROR'
    )
    this.name = 'GraphQLNetworkError'
  }
}

// Execution errors from resolvers
export class GraphQLExecutionError extends GraphQLError {
  constructor(
    public readonly errors: readonly GraphQLFormattedError[],
    public readonly partialData?: any
  ) {
    super(
      `Execution error: ${errors.map(e => e.message).join(', ')}`,
      'EXECUTION_ERROR'
    )
    this.name = 'GraphQLExecutionError'
  }

  hasPartialData(): boolean {
    return this.partialData !== undefined && this.partialData !== null
  }

  getErrorByPath(path: string[]): GraphQLFormattedError | undefined {
    return this.errors.find(error => 
      error.path && 
      JSON.stringify(error.path) === JSON.stringify(path)
    )
  }
}

// Authentication/Authorization errors
export class GraphQLAuthError extends GraphQLError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR')
    this.name = 'GraphQLAuthError'
  }
}

// Validation errors
export class GraphQLValidationError extends GraphQLError {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'GraphQLValidationError'
  }
}
```

## Error Recovery Strategies

### Retry Logic

```typescript
class QueryRetryHandler {
  private readonly maxRetries: number = 3
  private readonly baseDelay: number = 1000

  async executeWithRetry<T>(
    query: Operation<T>,
    variables: VariablesOf<typeof query>,
    options: {
      maxRetries?: number
      retryDelay?: number
      retryableErrors?: string[]
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? this.maxRetries
    const baseDelay = options.retryDelay ?? this.baseDelay
    const retryableErrors = options.retryableErrors ?? [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMITED'
    ]

    let attempt = 0
    let lastError: Error

    while (attempt <= maxRetries) {
      try {
        return await executeWithErrorHandling(query, variables)
      } catch (error) {
        lastError = error
        attempt++

        // Don't retry non-retryable errors
        if (error instanceof GraphQLError && 
            !retryableErrors.includes(error.code)) {
          throw error
        }

        // Don't retry on last attempt
        if (attempt > maxRetries) {
          break
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))

        console.log(`Retrying query ${query.operationName} (attempt ${attempt}/${maxRetries})`)
      }
    }

    throw lastError!
  }
}
```

### Fallback Queries

```typescript
// Primary query with full data
const FULL_USER_QUERY = b.query('GetFullUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.id(),
    b.name(),
    b.email(),
    b.avatar(),
    b.bio(),
    b.stats(b => [
      b.postsCount(),
      b.followersCount(),
    ]),
    b.posts({ first: 10 }, b => [
      b.id(),
      b.title(),
      b.publishedAt(),
    ])
  ])
])

// Fallback query with minimal data
const MINIMAL_USER_QUERY = b.query('GetMinimalUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.id(),
    b.name(),
    b.avatar(),
  ])
])

async function getUserWithFallback(userId: string) {
  try {
    // Try full query first
    return await executeQuery(FULL_USER_QUERY, { id: userId })
  } catch (error) {
    console.warn('Full user query failed, falling back to minimal query:', error)
    
    try {
      // Fallback to minimal query
      const minimalData = await executeQuery(MINIMAL_USER_QUERY, { id: userId })
      
      // Add default values for missing fields
      return {
        ...minimalData,
        user: minimalData.user ? {
          ...minimalData.user,
          email: null,
          bio: null,
          stats: { postsCount: 0, followersCount: 0 },
          posts: []
        } : null
      }
    } catch (fallbackError) {
      console.error('Both queries failed:', fallbackError)
      throw new Error(`Failed to load user data: ${fallbackError.message}`)
    }
  }
}
```

## Partial Data Handling

### Working with Partial Results

```typescript
interface PartialDataResult<T> {
  data: Partial<T> | null
  errors: GraphQLFormattedError[]
  hasData: boolean
  hasErrors: boolean
}

function handlePartialData<T>(
  result: ExecutionResult<T>
): PartialDataResult<T> {
  return {
    data: result.data || null,
    errors: result.errors || [],
    hasData: !!result.data,
    hasErrors: !!(result.errors && result.errors.length > 0)
  }
}

// Example usage with dashboard query
const DASHBOARD_QUERY = b.query('GetDashboard', (b) => [
  b.currentUser(b => [
    b.id(),
    b.name(),
  ]),
  b.recentPosts(b => [
    b.id(),
    b.title(),
  ]),
  b.notifications(b => [
    b.id(),
    b.message(),
  ])
])

async function loadDashboard() {
  try {
    const result = await client.query({
      query: DASHBOARD_QUERY.document(),
      errorPolicy: 'all' // Return partial data even with errors
    })

    const partialResult = handlePartialData(result)

    if (partialResult.hasErrors) {
      console.warn('Dashboard loaded with errors:', partialResult.errors)
    }

    // Handle each section independently
    if (partialResult.data?.currentUser) {
      displayUser(partialResult.data.currentUser)
    } else {
      showUserPlaceholder()
    }

    if (partialResult.data?.recentPosts) {
      displayPosts(partialResult.data.recentPosts)
    } else {
      showPostsPlaceholder()
    }

    if (partialResult.data?.notifications) {
      displayNotifications(partialResult.data.notifications)
    } else {
      showNotificationsPlaceholder()
    }

  } catch (error) {
    showDashboardError(error)
  }
}
```

## Error-Aware UI Components

### React Error Boundaries

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class GraphQLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GraphQL Error Boundary caught an error:', error, errorInfo)
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report to error tracking service
    reportError(error, {
      component: 'GraphQLErrorBoundary',
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Error-Aware Query Hook

```typescript
import { useState, useEffect } from 'react'

interface QueryState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useQueryWithErrorHandling<T>(
  query: Operation<T>,
  variables: VariablesOf<typeof query>,
  options: {
    retry?: boolean
    fallbackQuery?: Operation<any>
    onError?: (error: Error) => void
  } = {}
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {}
  })

  const executeQuery = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const data = await executeWithErrorHandling(query, variables)
      setState(prev => ({ 
        ...prev, 
        data, 
        loading: false 
      }))
    } catch (error) {
      console.error(`Query ${query.operationName} failed:`, error)

      if (options.onError) {
        options.onError(error as Error)
      }

      // Try fallback query if available
      if (options.fallbackQuery) {
        try {
          const fallbackData = await executeWithErrorHandling(
            options.fallbackQuery, 
            variables
          )
          setState(prev => ({ 
            ...prev, 
            data: fallbackData, 
            loading: false,
            error: null
          }))
          return
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
        }
      }

      setState(prev => ({ 
        ...prev, 
        error: error as Error, 
        loading: false 
      }))
    }
  }

  useEffect(() => {
    executeQuery()
  }, [JSON.stringify(variables)])

  return {
    ...state,
    refetch: executeQuery
  }
}
```

## Mutation Error Handling

### Structured Mutation Responses

```typescript
// Mutation with comprehensive error handling
const CREATE_POST_MUTATION = b.mutation('CreatePost', {
  input: 'CreatePostInput!'
}, (b, v) => [
  b.createPost({ input: v.input }, b => [
    // Success data
    b.post(b => [
      b.id(),
      b.title(),
      b.slug(),
      b.status(),
    ]),
    
    // Operation status
    b.success(),
    
    // Field-level validation errors
    b.validationErrors(b => [
      b.field(),
      b.message(),
      b.code(),
    ]),
    
    // Business logic errors
    b.businessErrors(b => [
      b.type(),
      b.message(),
      b.retryable(),
    ]),
    
    // System errors
    b.systemErrors(b => [
      b.message(),
      b.code(),
      b.details(),
    ])
  ])
])

type CreatePostResult = OutputOf<typeof CREATE_POST_MUTATION>

async function createPostWithErrorHandling(
  input: CreatePostInput
): Promise<CreatePostResult['createPost']> {
  try {
    const result = await executeQuery(CREATE_POST_MUTATION, { input })
    const mutation = result.createPost

    // Handle different error types
    if (!mutation.success) {
      if (mutation.validationErrors.length > 0) {
        throw new ValidationError(mutation.validationErrors)
      }
      
      if (mutation.businessErrors.length > 0) {
        throw new BusinessLogicError(mutation.businessErrors)
      }
      
      if (mutation.systemErrors.length > 0) {
        throw new SystemError(mutation.systemErrors)
      }
    }

    return mutation
  } catch (error) {
    console.error('Create post mutation failed:', error)
    throw error
  }
}

class ValidationError extends Error {
  constructor(public readonly errors: Array<{
    field: string
    message: string
    code: string
  }>) {
    super(`Validation failed: ${errors.map(e => e.message).join(', ')}`)
    this.name = 'ValidationError'
  }

  getFieldError(field: string) {
    return this.errors.find(error => error.field === field)
  }
}

class BusinessLogicError extends Error {
  constructor(public readonly errors: Array<{
    type: string
    message: string
    retryable: boolean
  }>) {
    super(`Business logic error: ${errors.map(e => e.message).join(', ')}`)
    this.name = 'BusinessLogicError'
  }

  isRetryable(): boolean {
    return this.errors.some(error => error.retryable)
  }
}
```

## Error Monitoring and Reporting

### Error Tracking Integration

```typescript
interface ErrorReport {
  operation: string
  variables: any
  error: Error
  timestamp: Date
  userId?: string
  sessionId?: string
  userAgent?: string
}

class ErrorReporter {
  private reports: ErrorReport[] = []

  reportError(
    operation: string,
    variables: any,
    error: Error,
    context: {
      userId?: string
      sessionId?: string
    } = {}
  ) {
    const report: ErrorReport = {
      operation,
      variables,
      error,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      ...context
    }

    this.reports.push(report)
    
    // Send to error tracking service (e.g., Sentry, Bugsnag)
    this.sendToErrorService(report)
    
    // Log locally for debugging
    console.error('GraphQL Error Report:', report)
  }

  private async sendToErrorService(report: ErrorReport) {
    try {
      // Example with Sentry
      Sentry.captureException(report.error, {
        tags: {
          operation: report.operation,
          errorType: report.error.constructor.name
        },
        extra: {
          variables: report.variables,
          timestamp: report.timestamp
        },
        user: {
          id: report.userId
        }
      })
    } catch (err) {
      console.error('Failed to report error to tracking service:', err)
    }
  }

  getErrorStats() {
    const errorsByOperation = this.reports.reduce((acc, report) => {
      acc[report.operation] = (acc[report.operation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const errorsByType = this.reports.reduce((acc, report) => {
      const type = report.error.constructor.name
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: this.reports.length,
      byOperation: errorsByOperation,
      byType: errorsByType,
      recent: this.reports.slice(-10)
    }
  }
}

const errorReporter = new ErrorReporter()

// Use in query execution
async function executeWithReporting<T>(
  query: Operation<T>,
  variables: VariablesOf<typeof query>
): Promise<T> {
  try {
    return await executeWithErrorHandling(query, variables)
  } catch (error) {
    errorReporter.reportError(
      query.operationName,
      variables,
      error as Error,
      {
        userId: getCurrentUserId(),
        sessionId: getSessionId()
      }
    )
    throw error
  }
}
```

## Best Practices Summary

### Error Handling Checklist

- ✅ Use structured error types
- ✅ Implement retry logic for transient errors
- ✅ Provide fallback queries
- ✅ Handle partial data gracefully
- ✅ Use error boundaries in React
- ✅ Report errors to monitoring services
- ✅ Show user-friendly error messages
- ✅ Test error scenarios thoroughly

### Error Prevention

```typescript
// Validate inputs before sending queries
function validateCreatePostInput(input: CreatePostInput): string[] {
  const errors: string[] = []

  if (!input.title || input.title.trim().length === 0) {
    errors.push('Title is required')
  }

  if (input.title && input.title.length > 200) {
    errors.push('Title must be less than 200 characters')
  }

  if (!input.content || input.content.trim().length === 0) {
    errors.push('Content is required')
  }

  return errors
}

// Use in mutation
async function createPost(input: CreatePostInput) {
  const validationErrors = validateCreatePostInput(input)
  
  if (validationErrors.length > 0) {
    throw new ValidationError(
      validationErrors.map(message => ({
        field: 'input',
        message,
        code: 'VALIDATION_ERROR'
      }))
    )
  }

  return await createPostWithErrorHandling(input)
}
```

## Next Steps

- [Testing](/guide/testing) - Testing error scenarios
- [Performance](/guide/performance) - Error impact on performance
- [Best Practices](/guide/best-practices) - Error handling best practices
- [Type Safety](/guide/type-safety) - Type-safe error handling
