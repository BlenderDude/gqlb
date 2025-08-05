# Best Practices

This guide covers best practices for using GQLB effectively in production applications, including code organization, performance optimization, and maintainability.

## Project Structure

### Organized File Structure

```
src/
├── graphql/
│   ├── generated/          # Generated GQLB files
│   │   ├── index.ts
│   │   ├── types.d.ts
│   │   └── builder.d.ts
│   ├── fragments/          # Reusable fragments
│   │   ├── user.ts
│   │   ├── post.ts
│   │   └── index.ts
│   ├── queries/            # Query definitions
│   │   ├── user-queries.ts
│   │   ├── post-queries.ts
│   │   └── index.ts
│   ├── mutations/          # Mutation definitions
│   │   ├── user-mutations.ts
│   │   ├── post-mutations.ts
│   │   └── index.ts
│   └── subscriptions/      # Subscription definitions
│       ├── chat.ts
│       ├── notifications.ts
│       └── index.ts
├── hooks/                  # React hooks for GraphQL
│   ├── useUser.ts
│   ├── usePosts.ts
│   └── index.ts
└── utils/
    ├── graphql-client.ts
    ├── error-handling.ts
    └── cache-utils.ts
```

### Fragment Organization

```typescript
// graphql/fragments/user.ts
import { b } from '../generated'

export const USER_BASIC_FRAGMENT = b.fragment('UserBasic', 'User', (b) => [
  b.id(),
  b.name(),
  b.avatar(),
])

export const USER_PROFILE_FRAGMENT = b.fragment('UserProfile', 'User', (b) => [
  ...USER_BASIC_FRAGMENT,
  b.bio(),
  b.website(),
  b.joinedAt(),
])

export const USER_STATS_FRAGMENT = b.fragment('UserStats', 'User', (b) => [
  b.stats(b => [
    b.postsCount(),
    b.followersCount(),
    b.followingCount(),
  ])
])

// graphql/fragments/index.ts
export * from './user'
export * from './post'
export * from './comment'
```

### Query Organization

```typescript
// graphql/queries/user-queries.ts
import { b } from '../generated'
import { USER_PROFILE_FRAGMENT, USER_STATS_FRAGMENT } from '../fragments'

export const GET_USER_PROFILE = b.query('GetUserProfile', {
  id: 'ID!',
  includeStats: 'Boolean!'
}, (b, v) => [
  b.user({ id: v.id }, b => [
    ...USER_PROFILE_FRAGMENT,
    
    ...(b.if(v.includeStats, [
      ...USER_STATS_FRAGMENT,
    ]))
  ])
])

export const GET_CURRENT_USER = b.query('GetCurrentUser', (b) => [
  b.currentUser(b => [
    ...USER_PROFILE_FRAGMENT,
    b.email(),
    b.settings(b => [
      b.theme(),
      b.notifications(),
    ])
  ])
])

// graphql/queries/index.ts
export * from './user-queries'
export * from './post-queries'
export * from './search-queries'
```

## Naming Conventions

### Consistent Naming

```typescript
// ✅ Good: Consistent naming patterns

// Queries - start with GET_
export const GET_USER_BY_ID = b.query('GetUserById', ...)
export const GET_USER_POSTS = b.query('GetUserPosts', ...)
export const GET_SEARCH_RESULTS = b.query('GetSearchResults', ...)

// Mutations - start with operation type
export const CREATE_POST = b.mutation('CreatePost', ...)
export const UPDATE_POST = b.mutation('UpdatePost', ...)
export const DELETE_POST = b.mutation('DeletePost', ...)

// Subscriptions - describe the event
export const NEW_MESSAGE_SUBSCRIPTION = b.subscription('NewMessage', ...)
export const POST_UPDATED_SUBSCRIPTION = b.subscription('PostUpdated', ...)

// Fragments - describe the data set
export const USER_CARD_FRAGMENT = b.fragment('UserCard', 'User', ...)
export const POST_PREVIEW_FRAGMENT = b.fragment('PostPreview', 'Post', ...)
```

### Variable Naming

```typescript
// ✅ Good: Clear variable names
const GET_PAGINATED_POSTS = b.query('GetPaginatedPosts', {
  first: 'Int!',
  after: 'String',
  orderBy: 'PostOrderBy!',
  includeAuthor: 'Boolean!'
}, (b, v) => [
  b.posts({
    first: v.first,
    after: v.after,
    orderBy: v.orderBy
  }, b => [
    b.id(),
    b.title(),
    b.publishedAt(),
    
    ...(b.if(v.includeAuthor, [
      b.author(b => [
        b.id(),
        b.name(),
      ])
    ]))
  ])
])

// ❌ Bad: Unclear variable names
const GET_POSTS = b.query('GetPosts', {
  x: 'Int!',
  y: 'String',
  z: 'PostOrderBy!',
  flag: 'Boolean!'
}, (b, v) => [
  // Hard to understand what these variables represent
])
```

## Type Safety Best Practices

### Strict Type Extraction

```typescript
import { OutputOf, VariablesOf, SelectionSetOutput } from './generated'

// Extract types at module level for reuse
export type UserProfile = OutputOf<typeof GET_USER_PROFILE>['user']
export type PostPreview = SelectionSetOutput<typeof POST_PREVIEW_FRAGMENT>
export type CreatePostVariables = VariablesOf<typeof CREATE_POST>

// Use in function signatures
export async function getUserProfile(
  userId: string,
  includeStats: boolean
): Promise<NonNullable<UserProfile>> {
  const result = await executeQuery(GET_USER_PROFILE, {
    id: userId,
    includeStats
  })
  
  if (!result.user) {
    throw new Error(`User not found: ${userId}`)
  }
  
  return result.user
}

// Use in React components
interface UserCardProps {
  user: PostPreview['author']
  showStats?: boolean
}

export function UserCard({ user, showStats }: UserCardProps) {
  return (
    <div>
      <h3>{user.name}</h3>
      {showStats && user.stats && (
        <div>
          Posts: {user.stats.postsCount}
        </div>
      )}
    </div>
  )
}
```

### Runtime Type Validation

```typescript
// Validate query results at runtime
function validateUserProfile(data: unknown): UserProfile {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user profile data')
  }

  const user = (data as any).user
  if (!user) {
    throw new Error('User not found in response')
  }

  if (!user.id || !user.name) {
    throw new Error('User profile missing required fields')
  }

  return data as UserProfile
}

export async function getUserProfileSafe(userId: string): Promise<UserProfile> {
  try {
    const result = await executeQuery(GET_USER_PROFILE, { 
      id: userId,
      includeStats: true 
    })
    
    return validateUserProfile(result)
  } catch (error) {
    console.error('Failed to get user profile:', error)
    throw new Error(`Unable to load user profile for ${userId}`)
  }
}
```

## Performance Best Practices

### Query Optimization

```typescript
// ✅ Good: Optimized query with minimal fields
export const OPTIMIZED_FEED_QUERY = b.query('GetOptimizedFeed', {
  first: 'Int!',
  after: 'String'
}, (b, v) => [
  b.posts({
    first: v.first,
    after: v.after
  }, b => [
    b.id(),
    b.title(),
    b.excerpt(),       // Use excerpt instead of full content
    b.publishedAt(),
    
    b.author(b => [
      b.id(),
      b.name(),
      b.avatar(),      // Only essential author fields
    ])
  ])
])

// ❌ Bad: Over-fetching data
export const INEFFICIENT_FEED_QUERY = b.query('GetFeed', (b) => [
  b.posts(b => [
    b.id(),
    b.title(),
    b.content(),       // Large field, not needed for feed
    b.publishedAt(),
    b.metadata(),      // Complex object, rarely used
    
    b.author(b => [
      b.id(),
      b.name(),
      b.email(),       // Sensitive data, not needed
      b.profile(b => [
        b.bio(),
        b.socialLinks(), // Heavy nested data
      ])
    ])
  ])
])
```

### Fragment Composition

```typescript
// Build complex fragments from smaller ones
const USER_MINIMAL = b.fragment('UserMinimal', 'User', (b) => [
  b.id(),
  b.name(),
  b.avatar(),
])

const USER_CONTACT = b.fragment('UserContact', 'User', (b) => [
  b.email(),
  b.website(),
  b.socialLinks(),
])

const USER_STATS = b.fragment('UserStats', 'User', (b) => [
  b.stats(b => [
    b.postsCount(),
    b.followersCount(),
  ])
])

// Compose based on needs
const USER_CARD = b.fragment('UserCard', 'User', (b) => [
  ...USER_MINIMAL,
])

const USER_PROFILE = b.fragment('UserProfile', 'User', (b) => [
  ...USER_MINIMAL,
  ...USER_CONTACT,
  ...USER_STATS,
  b.bio(),
  b.joinedAt(),
])
```

## Error Handling Best Practices

### Graceful Error Recovery

```typescript
// Layered error handling approach
export async function loadDashboardData() {
  const results = await Promise.allSettled([
    // Essential data - must succeed
    executeQuery(GET_CURRENT_USER),
    
    // Important data - should succeed
    executeQuery(GET_USER_NOTIFICATIONS, { first: 5 }),
    
    // Nice-to-have data - can fail
    executeQuery(GET_RECOMMENDATIONS, { limit: 3 }),
    executeQuery(GET_ANALYTICS_SUMMARY)
  ])

  const [userResult, notificationsResult, recommendationsResult, analyticsResult] = results

  // Handle essential data
  if (userResult.status === 'rejected') {
    throw new Error('Failed to load user data')
  }

  const dashboard = {
    user: userResult.value.currentUser,
    notifications: notificationsResult.status === 'fulfilled' 
      ? notificationsResult.value.notifications 
      : [],
    recommendations: recommendationsResult.status === 'fulfilled'
      ? recommendationsResult.value.recommendations
      : null,
    analytics: analyticsResult.status === 'fulfilled'
      ? analyticsResult.value.analytics
      : null
  }

  // Log any failures for monitoring
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const queryNames = ['GetCurrentUser', 'GetUserNotifications', 'GetRecommendations', 'GetAnalyticsSummary']
      console.warn(`Query ${queryNames[index]} failed:`, result.reason)
    }
  })

  return dashboard
}
```

### Typed Error Handling

```typescript
// Create specific error types for different scenarios
export class QueryError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'QueryError'
  }
}

export class ValidationError extends QueryError {
  constructor(operation: string, public readonly violations: string[]) {
    super(
      `Validation failed for ${operation}: ${violations.join(', ')}`,
      operation
    )
    this.name = 'ValidationError'
  }
}

export class NetworkError extends QueryError {
  constructor(operation: string, originalError: Error) {
    super(
      `Network error in ${operation}: ${originalError.message}`,
      operation,
      originalError
    )
    this.name = 'NetworkError'
  }
}

// Use in query execution
export async function executeQuerySafely<T>(
  query: Operation<T>,
  variables: VariablesOf<typeof query>
): Promise<T> {
  try {
    return await executeQuery(query, variables)
  } catch (error) {
    if (error instanceof ApolloError) {
      if (error.networkError) {
        throw new NetworkError(query.operationName, error.networkError)
      }
      if (error.graphQLErrors.length > 0) {
        const validationErrors = error.graphQLErrors
          .filter(e => e.extensions?.code === 'VALIDATION_ERROR')
          .map(e => e.message)
        
        if (validationErrors.length > 0) {
          throw new ValidationError(query.operationName, validationErrors)
        }
      }
    }
    
    throw new QueryError(
      `Query ${query.operationName} failed`,
      query.operationName,
      error as Error
    )
  }
}
```

## Testing Best Practices

### Comprehensive Test Coverage

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MockedProvider } from '@apollo/client/testing'

describe('User Queries', () => {
  // Test query structure
  it('should build correct query structure', () => {
    const document = GET_USER_PROFILE.document()
    expect(document.definitions[0].operation).toBe('query')
    expect(document.definitions[0].name?.value).toBe('GetUserProfile')
  })

  // Test with mocked data
  it('should handle successful response', async () => {
    const mocks = [{
      request: {
        query: GET_USER_PROFILE.document(),
        variables: { id: '1', includeStats: true }
      },
      result: {
        data: {
          user: {
            __typename: 'User',
            id: '1',
            name: 'John Doe',
            bio: 'Software Developer',
            stats: {
              __typename: 'UserStats',
              postsCount: 10,
              followersCount: 100
            }
          }
        }
      }
    }]

    // Test with MockedProvider for React components
    const result = await executeQuery(GET_USER_PROFILE, { 
      id: '1', 
      includeStats: true 
    })
    
    expect(result.user?.name).toBe('John Doe')
    expect(result.user?.stats?.postsCount).toBe(10)
  })

  // Test error scenarios
  it('should handle user not found', async () => {
    const mocks = [{
      request: {
        query: GET_USER_PROFILE.document(),
        variables: { id: 'nonexistent', includeStats: false }
      },
      result: {
        data: { user: null }
      }
    }]

    const result = await executeQuery(GET_USER_PROFILE, { 
      id: 'nonexistent', 
      includeStats: false 
    })
    
    expect(result.user).toBeNull()
  })
})
```

### Integration Testing

```typescript
// Test with real GraphQL server
describe('Integration Tests', () => {
  let testClient: ApolloClient<any>

  beforeEach(() => {
    testClient = new ApolloClient({
      uri: 'http://localhost:4000/graphql',
      cache: new InMemoryCache()
    })
  })

  it('should execute queries against real server', async () => {
    const result = await testClient.query({
      query: GET_USER_PROFILE.document(),
      variables: { id: 'test-user-id', includeStats: true }
    })

    expect(result.data.user).toBeDefined()
    expect(result.errors).toBeUndefined()
  })
})
```

## Documentation Best Practices

### Self-Documenting Queries

```typescript
/**
 * Retrieves comprehensive user profile data including stats and recent activity.
 * 
 * @param id - The unique identifier for the user
 * @param includeStats - Whether to include follower/post counts (expensive operation)
 * @param includeRecentPosts - Whether to include user's recent posts
 * 
 * @example
 * ```typescript
 * const profile = await executeQuery(GET_USER_PROFILE, {
 *   id: 'user-123',
 *   includeStats: true,
 *   includeRecentPosts: false
 * })
 * ```
 */
export const GET_USER_PROFILE = b.query('GetUserProfile', {
  id: 'ID!',
  includeStats: 'Boolean!',
  includeRecentPosts: 'Boolean!'
}, (b, v) => [
  b.user({ id: v.id }, b => [
    // Core profile information
    b.id(),
    b.name(),
    b.avatar(),
    b.bio(),
    b.website(),
    b.joinedAt(),
    
    // Optional: User statistics (can be expensive)
    ...(b.if(v.includeStats, [
      b.stats(b => [
        b.postsCount(),
        b.followersCount(),
        b.followingCount(),
      ])
    ])),
    
    // Optional: Recent posts (for profile preview)
    ...(b.if(v.includeRecentPosts, [
      b.posts({ first: 5, orderBy: "CREATED_AT_DESC" }, b => [
        b.id(),
        b.title(),
        b.publishedAt(),
      ])
    ]))
  ])
])
```

### Type Documentation

```typescript
import { OutputOf, VariablesOf } from './generated'

/**
 * User profile data returned by GetUserProfile query
 */
export type UserProfileData = OutputOf<typeof GET_USER_PROFILE>

/**
 * Non-null user profile (when user exists)
 */
export type UserProfile = NonNullable<UserProfileData['user']>

/**
 * Variables required for the GetUserProfile query
 */
export type UserProfileVariables = VariablesOf<typeof GET_USER_PROFILE>

/**
 * User statistics sub-object
 */
export type UserStats = NonNullable<UserProfile['stats']>

/**
 * Helper function to check if user profile has stats
 */
export function hasUserStats(user: UserProfile): user is UserProfile & { stats: UserStats } {
  return user.stats !== null && user.stats !== undefined
}

/**
 * Helper function to get safe user stats with defaults
 */
export function getUserStatsWithDefaults(user: UserProfile): UserStats {
  return user.stats || {
    __typename: 'UserStats',
    postsCount: 0,
    followersCount: 0,
    followingCount: 0
  }
}
```

## Production Best Practices

### Environment Configuration

```typescript
// config/graphql.ts
interface GraphQLConfig {
  endpoint: string
  enableIntrospection: boolean
  enablePlayground: boolean
  timeout: number
  retries: number
}

const graphqlConfig: Record<string, GraphQLConfig> = {
  development: {
    endpoint: 'http://localhost:4000/graphql',
    enableIntrospection: true,
    enablePlayground: true,
    timeout: 10000,
    retries: 1
  },
  staging: {
    endpoint: 'https://api-staging.example.com/graphql',
    enableIntrospection: true,
    enablePlayground: false,
    timeout: 5000,
    retries: 2
  },
  production: {
    endpoint: 'https://api.example.com/graphql',
    enableIntrospection: false,
    enablePlayground: false,
    timeout: 3000,
    retries: 3
  }
}

export function getGraphQLConfig(): GraphQLConfig {
  const env = process.env.NODE_ENV || 'development'
  return graphqlConfig[env]
}
```

### Performance Monitoring

```typescript
// Monitor query performance in production
class QueryPerformanceMonitor {
  private metrics = new Map<string, {
    totalExecutions: number
    totalDuration: number
    errors: number
    lastExecuted: Date
  }>()

  async executeWithMonitoring<T>(
    query: Operation<T>,
    variables: VariablesOf<typeof query>
  ): Promise<T> {
    const startTime = performance.now()
    const operationName = query.operationName
    
    try {
      const result = await executeQuery(query, variables)
      this.recordSuccess(operationName, performance.now() - startTime)
      return result
    } catch (error) {
      this.recordError(operationName, performance.now() - startTime)
      throw error
    }
  }

  private recordSuccess(operation: string, duration: number) {
    const current = this.metrics.get(operation) || {
      totalExecutions: 0,
      totalDuration: 0,
      errors: 0,
      lastExecuted: new Date()
    }

    this.metrics.set(operation, {
      totalExecutions: current.totalExecutions + 1,
      totalDuration: current.totalDuration + duration,
      errors: current.errors,
      lastExecuted: new Date()
    })
  }

  private recordError(operation: string, duration: number) {
    const current = this.metrics.get(operation) || {
      totalExecutions: 0,
      totalDuration: 0,
      errors: 0,
      lastExecuted: new Date()
    }

    this.metrics.set(operation, {
      totalExecutions: current.totalExecutions + 1,
      totalDuration: current.totalDuration + duration,
      errors: current.errors + 1,
      lastExecuted: new Date()
    })
  }

  getMetrics() {
    const results = Array.from(this.metrics.entries()).map(([operation, metrics]) => ({
      operation,
      averageDuration: metrics.totalDuration / metrics.totalExecutions,
      errorRate: metrics.errors / metrics.totalExecutions,
      totalExecutions: metrics.totalExecutions,
      lastExecuted: metrics.lastExecuted
    }))

    return results.sort((a, b) => b.totalExecutions - a.totalExecutions)
  }
}
```

## Code Quality Checklist

### Pre-commit Checklist

- ✅ All queries have meaningful names
- ✅ Variables are properly typed
- ✅ Fragments are reused where appropriate
- ✅ Error handling is implemented
- ✅ Performance considerations are addressed
- ✅ Tests cover happy path and error cases
- ✅ Documentation is up to date
- ✅ TypeScript types are properly extracted
- ✅ No over-fetching or under-fetching
- ✅ Queries are properly organized

### Code Review Guidelines

```typescript
// ✅ Good: Well-structured, documented query
/**
 * Fetches paginated blog posts with author information.
 * Optimized for feed display with minimal data transfer.
 */
export const GET_BLOG_FEED = b.query('GetBlogFeed', {
  first: 'Int!',
  after: 'String',
  category: 'String'
}, (b, v) => [
  b.posts({
    first: v.first,
    after: v.after,
    category: v.category
  }, b => [
    b.pageInfo(b => [
      b.hasNextPage(),
      b.endCursor(),
    ]),
    b.edges(b => [
      b.cursor(),
      b.node(b => [
        ...POST_PREVIEW_FRAGMENT,
        b.author(b => [
          ...USER_CARD_FRAGMENT,
        ])
      ])
    ])
  ])
])

// ❌ Bad: Unclear purpose, no documentation, poor structure
export const QUERY_1 = b.query('Q1', { x: 'Int' }, (b, v) => [
  b.posts({ first: v.x }, b => [
    b.id(),
    b.title(),
    b.content(),
    b.author(b => [
      b.id(),
      b.name(),
      b.email(),
      b.posts(b => [
        b.id(),
        b.title(),
      ])
    ])
  ])
])
```

## Next Steps

- [Performance](/guide/performance) - Advanced performance optimization
- [Testing](/guide/testing) - Comprehensive testing strategies
- [Error Handling](/guide/error-handling) - Robust error management
- [Type Safety](/guide/type-safety) - Advanced type safety patterns
