# Performance Tips

This guide covers best practices for optimizing GraphQL query performance when using GQLB. Learn how to write efficient queries, reduce payload sizes, and improve application performance.

## Query Optimization

### Field Selection Best Practices

Only select the fields you actually need:

```typescript
// ❌ Bad: Selecting unnecessary fields
const INEFFICIENT_QUERY = b.query('GetPosts', (b) => [
  b.posts(b => [
    b.id(),
    b.title(),
    b.content(),        // Large field, not always needed
    b.description(),
    b.metadata(),       // Complex object, rarely used
    b.author(b => [
      b.id(),
      b.name(),
      b.email(),        // Sensitive data, not needed for display
      b.profile(b => [
        b.bio(),
        b.socialLinks(), // Complex nested data
        b.preferences(), // User-specific data
      ])
    ])
  ])
])

// ✅ Good: Minimal field selection
const EFFICIENT_QUERY = b.query('GetPosts', (b) => [
  b.posts(b => [
    b.id(),
    b.title(),
    b.description(),
    b.author(b => [
      b.id(),
      b.name(),
      b.avatar(),      // Only what's needed for UI
    ])
  ])
])
```

### Pagination Instead of Large Lists

Use pagination to limit data transfer:

```typescript
// ❌ Bad: Loading all posts at once
const ALL_POSTS_QUERY = b.query('GetAllPosts', (b) => [
  b.posts(b => [
    b.id(),
    b.title(),
    b.content(),
  ])
])

// ✅ Good: Paginated posts
const PAGINATED_POSTS_QUERY = b.query('GetPaginatedPosts', {
  first: 'Int!',
  after: 'String'
}, (b, v) => [
  b.posts({
    first: v.first,
    after: v.after
  }, b => [
    b.pageInfo(b => [
      b.hasNextPage(),
      b.endCursor(),
    ]),
    b.edges(b => [
      b.cursor(),
      b.node(b => [
        b.id(),
        b.title(),
        b.excerpt(),  // Use excerpt instead of full content
      ])
    ])
  ])
])
```

## Fragment Optimization

### Reusable Fragments

Create fragments for commonly used field sets:

```typescript
// Define reusable fragments
const USER_CARD_FRAGMENT = b.fragment('UserCard', 'User', (b) => [
  b.id(),
  b.name(),
  b.avatar(),
])

const POST_PREVIEW_FRAGMENT = b.fragment('PostPreview', 'Post', (b) => [
  b.id(),
  b.title(),
  b.excerpt(),
  b.publishedAt(),
  b.readTime(),
])

// Use fragments in multiple queries
const DASHBOARD_QUERY = b.query('GetDashboard', (b) => [
  b.currentUser(b => [
    ...USER_CARD_FRAGMENT,
    b.followersCount(),
  ]),
  
  b.recentPosts({ first: 5 }, b => [
    ...POST_PREVIEW_FRAGMENT,
    b.author(b => [
      ...USER_CARD_FRAGMENT,
    ])
  ]),
  
  b.suggestedUsers({ first: 3 }, b => [
    ...USER_CARD_FRAGMENT,
    b.mutualFollowersCount(),
  ])
])
```

### Fragment Composition

Compose larger fragments from smaller ones:

```typescript
const USER_BASIC_FRAGMENT = b.fragment('UserBasic', 'User', (b) => [
  b.id(),
  b.name(),
  b.avatar(),
])

const USER_EXTENDED_FRAGMENT = b.fragment('UserExtended', 'User', (b) => [
  ...USER_BASIC_FRAGMENT,
  b.bio(),
  b.website(),
  b.joinedAt(),
])

const USER_FULL_FRAGMENT = b.fragment('UserFull', 'User', (b) => [
  ...USER_EXTENDED_FRAGMENT,
  b.stats(b => [
    b.postsCount(),
    b.followersCount(),
    b.followingCount(),
  ]),
  b.settings(b => [
    b.theme(),
    b.notifications(),
  ])
])
```

## Conditional Field Loading

### Variable-Driven Conditionals

Use variables to conditionally load expensive fields:

```typescript
const CONDITIONAL_USER_QUERY = b.query('GetUser', {
  userId: 'ID!',
  includeStats: 'Boolean!',
  includePosts: 'Boolean!',
  includeSettings: 'Boolean!'
}, (b, v) => [
  b.user({ id: v.userId }, b => [
    // Always load basic info
    b.id(),
    b.name(),
    b.avatar(),
    
    // Conditionally load expensive data
    ...(b.if(v.includeStats, [
      b.stats(b => [
        b.postsCount(),
        b.followersCount(),
        b.totalLikes(),
      ])
    ])),
    
    ...(b.if(v.includePosts, [
      b.recentPosts({ first: 5 }, b => [
        b.id(),
        b.title(),
        b.publishedAt(),
      ])
    ])),
    
    ...(b.if(v.includeSettings, [
      b.settings(b => [
        b.theme(),
        b.notifications(),
        b.privacy(),
      ])
    ]))
  ])
])

// Usage: Load only what's needed
const basicUser = await executeQuery(CONDITIONAL_USER_QUERY, {
  userId: "123",
  includeStats: false,
  includePosts: false,
  includeSettings: false
})

const fullUser = await executeQuery(CONDITIONAL_USER_QUERY, {
  userId: "123",
  includeStats: true,
  includePosts: true,
  includeSettings: true
})
```

## Batching and Deduplication

### DataLoader Pattern

Structure queries to leverage DataLoader batching:

```typescript
// ❌ Bad: N+1 queries in the UI
const USER_POSTS_QUERY = b.query('GetUserPosts', { userId: 'ID!' }, (b, v) => [
  b.user({ id: v.userId }, b => [
    b.id(),
    b.name(),
    b.posts(b => [
      b.id(),
      b.title(),
      b.comments(b => [  // This could cause N+1 for each post
        b.id(),
        b.author(b => [ // And N+1 for each comment author
          b.id(),
          b.name(),
        ])
      ])
    ])
  ])
])

// ✅ Good: Structured to leverage batching
const OPTIMIZED_USER_POSTS = b.query('GetOptimizedUserPosts', { 
  userId: 'ID!',
  postsFirst: 'Int!',
  commentsFirst: 'Int!'
}, (b, v) => [
  b.user({ id: v.userId }, b => [
    b.id(),
    b.name(),
    b.posts({ first: v.postsFirst }, b => [
      b.id(),
      b.title(),
      b.commentsCount(),  // Just the count, not full comments
      
      // Load comments separately when needed
      b.recentComments({ first: v.commentsFirst }, b => [
        b.id(),
        b.content(),
        b.authorId(),     // Just ID for batching
      ])
    ])
  ])
])
```

### Batch Multiple Operations

Combine related queries into a single request:

```typescript
const DASHBOARD_BATCH_QUERY = b.query('GetDashboardData', {
  userId: 'ID!'
}, (b, v) => [
  // User data
  b.user({ id: v.userId }, b => [
    b.id(),
    b.name(),
    b.avatar(),
  ]),
  
  // User's posts
  b.userPosts({ userId: v.userId, first: 10 }, b => [
    b.id(),
    b.title(),
    b.likesCount(),
  ]),
  
  // User's notifications
  b.userNotifications({ userId: v.userId, first: 5 }, b => [
    b.id(),
    b.type(),
    b.message(),
    b.read(),
  ]),
  
  // Site statistics
  b.siteStats(b => [
    b.totalUsers(),
    b.totalPosts(),
    b.activeUsers(),
  ])
])
```

## Cache Optimization

### Normalized Cache Keys

Structure queries to leverage normalized caching:

```typescript
// ✅ Good: Consistent field selection for caching
const USER_CACHE_FRAGMENT = b.fragment('UserCache', 'User', (b) => [
  b.id(),           // Essential for cache normalization
  b.name(),
  b.avatar(),
  b.updatedAt(),    // For cache invalidation
])

const POST_CACHE_FRAGMENT = b.fragment('PostCache', 'Post', (b) => [
  b.id(),
  b.title(),
  b.publishedAt(),
  b.updatedAt(),
])

// Use consistent fragments across queries
const FEED_QUERY = b.query('GetFeed', (b) => [
  b.posts(b => [
    ...POST_CACHE_FRAGMENT,
    b.author(b => [
      ...USER_CACHE_FRAGMENT,
    ])
  ])
])

const USER_PROFILE_QUERY = b.query('GetUserProfile', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    ...USER_CACHE_FRAGMENT,  // Same fragment = cache hit
    b.bio(),
    b.posts(b => [
      ...POST_CACHE_FRAGMENT,  // Same fragment = cache hit
    ])
  ])
])
```

### Cache-First Queries

Design queries that work well with cache-first policies:

```typescript
const CACHE_OPTIMIZED_QUERY = b.query('GetCacheOptimized', {
  userId: 'ID!'
}, (b, v) => [
  b.user({ id: v.userId }, b => [
    // Stable fields (good for caching)
    b.id(),
    b.name(),
    b.avatar(),
    b.bio(),
    
    // Separate frequently changing data
    b.stats(b => [
      b.postsCount(),      // Changes when posts are added
      b.followersCount(),  // Changes when followed/unfollowed
    ]),
    
    // Paginated data (cache by cursor)
    b.posts({ first: 10 }, b => [
      b.pageInfo(b => [
        b.endCursor(),
        b.hasNextPage(),
      ]),
      b.edges(b => [
        b.cursor(),
        b.node(b => [
          b.id(),
          b.title(),
          b.publishedAt(),  // Stable once published
        ])
      ])
    ])
  ])
])
```

## Network Optimization

### Reduce Query Depth

Limit nesting depth to reduce complexity:

```typescript
// ❌ Bad: Deep nesting
const DEEP_QUERY = b.query('DeepQuery', (b) => [
  b.user(b => [
    b.posts(b => [
      b.comments(b => [
        b.replies(b => [
          b.author(b => [
            b.followers(b => [  // 6 levels deep!
              b.posts(b => [
                b.title()
              ])
            ])
          ])
        ])
      ])
    ])
  ])
])

// ✅ Good: Shallow queries with targeted requests
const SHALLOW_USER_QUERY = b.query('GetUser', (b) => [
  b.user(b => [
    b.id(),
    b.name(),
    b.postsCount(),  // Just counts, not full data
  ])
])

const USER_POSTS_QUERY = b.query('GetUserPosts', { userId: 'ID!' }, (b, v) => [
  b.posts({ authorId: v.userId }, b => [
    b.id(),
    b.title(),
    b.commentsCount(),  // Just counts
  ])
])
```

### Optimize Variable Usage

Use variables efficiently to enable query caching:

```typescript
// ❌ Bad: Inline values prevent caching
const INLINE_QUERY = b.query('GetPostsInline', (b) => [
  b.posts({ 
    first: 10,           // Hardcoded values
    status: "PUBLISHED", // can't be cached for different values
    orderBy: "DATE_DESC"
  }, b => [
    b.id(),
    b.title(),
  ])
])

// ✅ Good: Parameterized query enables caching
const PARAMETERIZED_QUERY = b.query('GetPosts', {
  first: 'Int!',
  status: 'PostStatus!',
  orderBy: 'PostOrderBy!'
}, (b, v) => [
  b.posts({ 
    first: v.first,
    status: v.status,
    orderBy: v.orderBy
  }, b => [
    b.id(),
    b.title(),
  ])
])
```

## Error Performance

### Early Error Detection

Structure queries to fail fast:

```typescript
const ROBUST_QUERY = b.query('GetRobustData', {
  userId: 'ID!'
}, (b, v) => [
  // Check user exists first (fast operation)
  b.userExists({ id: v.userId }),
  
  // Only proceed with expensive operations if user exists
  b.user({ id: v.userId }, b => [
    b.id(),
    b.name(),
    
    // Expensive nested data only if needed
    b.analytics(b => [
      b.pageViews(),
      b.engagement(),
      b.demographics(),
    ])
  ])
])
```

### Graceful Degradation

Design queries that can partially succeed:

```typescript
const GRACEFUL_QUERY = b.query('GetDashboard', (b) => [
  // Essential data (must succeed)
  b.currentUser(b => [
    b.id(),
    b.name(),
  ]),
  
  // Optional data (can fail gracefully)
  b.recommendations(b => [
    b.id(),
    b.title(),
    b.score(),
  ]),
  
  // Analytics data (nice to have)
  b.analytics(b => [
    b.summary(b => [
      b.views(),
      b.engagement(),
    ])
  ])
])

// Handle partial failures
function handleDashboardData(data: DashboardData) {
  // Always have user data
  displayUser(data.currentUser)
  
  // Recommendations might be null if service is down
  if (data.recommendations) {
    displayRecommendations(data.recommendations)
  } else {
    showRecommendationsPlaceholder()
  }
  
  // Analytics might be null if not available
  if (data.analytics) {
    displayAnalytics(data.analytics)
  }
}
```

## Monitoring and Profiling

### Query Complexity Analysis

Add complexity analysis to queries:

```typescript
const ANALYZED_QUERY = b.query('GetAnalyzedData', {
  depth: 'Int!',
  breadth: 'Int!'
}, (b, v) => [
  // Document complexity in comments
  b.posts({ 
    first: v.breadth  // Complexity: O(breadth)
  }, b => [
    b.id(),
    b.title(),
    
    b.comments({ 
      first: v.depth  // Complexity: O(breadth * depth)
    }, b => [
      b.id(),
      b.content(),
      
      b.author(b => [  // Complexity: O(breadth * depth * 1)
        b.id(),
        b.name(),
      ])
    ])
  ])
])

// Calculate complexity
const complexity = breadth * depth * 1  // = breadth * depth
```

### Performance Tracking

Add query timing and metrics:

```typescript
class QueryPerformanceTracker {
  async executeWithTracking<T>(
    query: Operation<T>,
    variables: VariablesOf<typeof query>
  ) {
    const startTime = performance.now()
    const operationName = query.operationName
    
    try {
      const result = await executeQuery(query, variables)
      const duration = performance.now() - startTime
      
      // Log successful queries
      console.log(`Query ${operationName} completed in ${duration}ms`)
      
      // Track metrics
      this.trackQueryMetrics(operationName, duration, 'success')
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      // Log failed queries
      console.error(`Query ${operationName} failed after ${duration}ms`, error)
      
      // Track error metrics
      this.trackQueryMetrics(operationName, duration, 'error')
      
      throw error
    }
  }
  
  private trackQueryMetrics(name: string, duration: number, status: string) {
    // Send to analytics service
    analytics.track('graphql_query', {
      operation_name: name,
      duration_ms: duration,
      status: status,
      timestamp: Date.now()
    })
  }
}
```

## Best Practices Summary

### Query Design Checklist

- ✅ Select only needed fields
- ✅ Use pagination for lists
- ✅ Leverage fragments for reuse
- ✅ Use variables for parameterization
- ✅ Limit query depth
- ✅ Design for cache efficiency
- ✅ Handle errors gracefully
- ✅ Monitor query performance

### Performance Monitoring

```typescript
const PERFORMANCE_QUERY = b.query('GetPerformanceData', {
  includeExpensive: 'Boolean!'
}, (b, v) => [
  // Fast, always-included data
  b.user(b => [
    b.id(),
    b.name(),
  ]),
  
  // Expensive, conditionally-included data
  ...(b.if(v.includeExpensive, [
    b.expensiveAnalytics(b => [
      b.complexCalculation(),
      b.heavyAggregation(),
    ])
  ]))
])

// Use performance budgets
const PERFORMANCE_BUDGET = {
  maxQueryTime: 500,     // 500ms max
  maxFields: 50,         // 50 fields max
  maxDepth: 5,           // 5 levels max
  maxComplexity: 1000    // Complexity score max
}
```

## Next Steps

- [Error Handling](/guide/error-handling) - Robust error management
- [Testing](/guide/testing) - Performance testing strategies
- [Best Practices](/guide/best-practices) - Production optimization patterns
- [Type Safety](/guide/type-safety) - Type-safe performance patterns
