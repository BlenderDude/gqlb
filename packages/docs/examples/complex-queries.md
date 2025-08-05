# Complex Queries

This page demonstrates advanced query patterns and complex data structures using GQLB. These examples show how to handle more sophisticated GraphQL operations.

## Deep Nesting with Pagination

Handle deeply nested structures with pagination at multiple levels:

```typescript
import { b } from './generated'

const COMPLEX_FORUM_QUERY = b.query('GetForumData', { 
  userId: 'ID!',
  postLimit: 'Int!',
  commentLimit: 'Int!' 
}, (b, v) => [
  b.user({ id: v.userId }, b => [
    b.id(),
    b.name(),
    b.avatar(),
    
    // User's posts with pagination
    b.posts({ 
      first: v.postLimit,
      orderBy: "CREATED_AT_DESC" 
    }, b => [
      b.id(),
      b.title(),
      b.content(),
      b.publishedAt(),
      b.likesCount(),
      
      // Post comments with pagination
      b.comments({ 
        first: v.commentLimit,
        orderBy: "CREATED_AT_ASC" 
      }, b => [
        b.id(),
        b.content(),
        b.createdAt(),
        
        // Comment author
        b.author(b => [
          b.id(),
          b.name(),
          b.avatar(),
        ]),
        
        // Nested replies
        b.replies({ first: 3 }, b => [
          b.id(),
          b.content(),
          b.createdAt(),
          b.author(b => [
            b.id(),
            b.name(),
          ])
        ])
      ]),
      
      // Post tags
      b.tags(b => [
        b.id(),
        b.name(),
        b.color(),
      ])
    ]),
    
    // User's follower stats
    b.followStats(b => [
      b.followersCount(),
      b.followingCount(),
    ])
  ])
])
```

## Multiple Complex Fragments

Combine multiple fragments for modular queries:

```typescript
// Define reusable fragments
const USER_PROFILE_FRAGMENT = b.fragment('UserProfile', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
  b.avatar(),
  b.bio(),
  b.website(),
  b.joinedAt(),
])

const POST_DETAILS_FRAGMENT = b.fragment('PostDetails', 'Post', (b) => [
  b.id(),
  b.title(),
  b.content(),
  b.slug(),
  b.publishedAt(),
  b.updatedAt(),
  b.likesCount(),
  b.commentsCount(),
  b.status(),
])

const COMMENT_INFO_FRAGMENT = b.fragment('CommentInfo', 'Comment', (b) => [
  b.id(),
  b.content(),
  b.createdAt(),
  b.likesCount(),
  b.edited(),
])

// Complex query using multiple fragments
const BLOG_DASHBOARD_QUERY = b.query('GetBlogDashboard', { authorId: 'ID!' }, (b, v) => [
  // Author information using fragment
  b.user({ id: v.authorId }, b => [
    ...USER_PROFILE_FRAGMENT,
    
    // Author's recent posts
    b.posts({ first: 10, status: "PUBLISHED" }, b => [
      ...POST_DETAILS_FRAGMENT,
      
      // Recent comments on posts
      b.recentComments({ limit: 5 }, b => [
        ...COMMENT_INFO_FRAGMENT,
        
        // Comment authors
        b.author(b => [
          b.id(),
          b.name(),
          b.avatar(),
        ])
      ])
    ])
  ]),
  
  // Site-wide statistics
  b.blogStats(b => [
    b.totalPosts(),
    b.totalComments(),
    b.totalUsers(),
    b.postsThisMonth(),
    b.commentsThisMonth(),
  ])
])
```

## Conditional Fields with Variables

Use variables to conditionally include fields and modify query structure:

```typescript
const CONDITIONAL_USER_QUERY = b.query('GetUserData', {
  userId: 'ID!',
  includeStats: 'Boolean!',
  includePosts: 'Boolean!',
  includePrivateInfo: 'Boolean!',
  postsLimit: 'Int'
}, (b, v) => [
  b.user({ id: v.userId }, b => [
    // Always included fields
    b.id(),
    b.name(),
    b.avatar(),
    
    // Conditionally include user stats
    ...(b.if(v.includeStats, [
      b.stats(b => [
        b.postsCount(),
        b.followersCount(),
        b.followingCount(),
        b.likesReceivedCount(),
      ])
    ])),
    
    // Conditionally include posts
    ...(b.if(v.includePosts, [
      b.posts({ first: v.postsLimit }, b => [
        b.id(),
        b.title(),
        b.slug(),
        b.publishedAt(),
      ])
    ])),
    
    // Conditionally include private information
    ...(b.if(v.includePrivateInfo, [
      b.email(),
      b.phoneNumber(),
      b.settings(b => [
        b.notifications(),
        b.privacy(),
        b.theme(),
      ])
    ]))
  ])
])
```

## Complex Filtering and Sorting

Handle complex filtering scenarios with multiple parameters:

```typescript
const ADVANCED_SEARCH_QUERY = b.query('AdvancedSearch', {
  searchTerm: 'String!',
  categories: '[String!]',
  dateFrom: 'DateTime',
  dateTo: 'DateTime',
  sortBy: 'PostSortInput!',
  first: 'Int!',
  after: 'String'
}, (b, v) => [
  b.searchPosts({
    // Complex search parameters
    filter: {
      titleContains: v.searchTerm,
      contentContains: v.searchTerm,
      categories: v.categories,
      publishedAfter: v.dateFrom,
      publishedBefore: v.dateTo,
      status: "PUBLISHED"
    },
    sort: v.sortBy,
    first: v.first,
    after: v.after
  }, b => [
    // Pagination info
    b.pageInfo(b => [
      b.hasNextPage(),
      b.hasPreviousPage(),
      b.startCursor(),
      b.endCursor(),
    ]),
    
    // Search results
    b.edges(b => [
      b.cursor(),
      b.node(b => [
        b.id(),
        b.title(),
        b.slug(),
        b.excerpt(),
        b.publishedAt(),
        b.readTime(),
        
        // Author info
        b.author(b => [
          b.id(),
          b.name(),
          b.avatar(),
        ]),
        
        // Categories
        b.categories(b => [
          b.id(),
          b.name(),
          b.slug(),
          b.color(),
        ]),
        
        // Engagement metrics
        b.metrics(b => [
          b.viewsCount(),
          b.likesCount(),
          b.commentsCount(),
          b.sharesCount(),
        ])
      ])
    ])
  ])
])
```

## Working with Unions and Interfaces

Handle polymorphic types with union and interface selections:

```typescript
const ACTIVITY_FEED_QUERY = b.query('GetActivityFeed', { userId: 'ID!' }, (b, v) => [
  b.user({ id: v.userId }, b => [
    b.id(),
    b.name(),
    
    // Activity feed with union types
    b.activityFeed({ first: 20 }, b => [
      b.id(),
      b.timestamp(),
      b.type(),
      
      // Union type: Activity can be PostActivity, CommentActivity, or LikeActivity
      b.activity(b => [
        // Inline fragment for PostActivity
        b.on('PostActivity', b => [
          b.action(), // "CREATED", "UPDATED", "DELETED"
          b.post(b => [
            b.id(),
            b.title(),
            b.slug(),
          ])
        ]),
        
        // Inline fragment for CommentActivity
        b.on('CommentActivity', b => [
          b.action(), // "CREATED", "UPDATED", "DELETED"
          b.comment(b => [
            b.id(),
            b.content(),
          ]),
          b.post(b => [
            b.id(),
            b.title(),
          ])
        ]),
        
        // Inline fragment for LikeActivity
        b.on('LikeActivity', b => [
          b.target(b => [
            // Target can be Post or Comment
            b.on('Post', b => [
              b.id(),
              b.title(),
            ]),
            b.on('Comment', b => [
              b.id(),
              b.content(),
            ])
          ])
        ])
      ])
    ])
  ])
])
```

## Batch Operations with Aliases

Fetch multiple variations of the same data using aliases:

```typescript
const COMPARISON_DASHBOARD = b.query('ComparisonDashboard', {
  currentMonth: 'DateTime!',
  previousMonth: 'DateTime!',
  currentYear: 'DateTime!',
  previousYear: 'DateTime!'
}, (b, v) => [
  // Current month stats
  b.blogStats({
    dateFrom: v.currentMonth,
    dateTo: v.currentMonth
  }, b => [
    b.postsCount(),
    b.commentsCount(),
    b.viewsCount(),
    b.uniqueVisitors(),
  ], "currentMonthStats"),
  
  // Previous month stats
  b.blogStats({
    dateFrom: v.previousMonth,
    dateTo: v.previousMonth
  }, b => [
    b.postsCount(),
    b.commentsCount(),
    b.viewsCount(),
    b.uniqueVisitors(),
  ], "previousMonthStats"),
  
  // Current year stats
  b.blogStats({
    dateFrom: v.currentYear,
    dateTo: v.currentYear
  }, b => [
    b.postsCount(),
    b.commentsCount(),
    b.viewsCount(),
    b.uniqueVisitors(),
  ], "currentYearStats"),
  
  // Previous year stats
  b.blogStats({
    dateFrom: v.previousYear,
    dateTo: v.previousYear
  }, b => [
    b.postsCount(),
    b.commentsCount(),
    b.viewsCount(),
    b.uniqueVisitors(),
  ], "previousYearStats"),
  
  // Top performing posts this month
  b.topPosts({
    dateFrom: v.currentMonth,
    sortBy: "VIEWS_DESC",
    first: 10
  }, b => [
    b.id(),
    b.title(),
    b.slug(),
    b.viewsCount(),
    b.likesCount(),
  ], "topPostsThisMonth"),
])
```

## Complex Error Handling Patterns

Structure queries for comprehensive error handling:

```typescript
const ROBUST_DATA_QUERY = b.query('GetRobustData', { userId: 'ID!' }, (b, v) => [
  // Main user data - might be null if user doesn't exist
  b.user({ id: v.userId }, b => [
    b.id(),
    b.name(),
    
    // Profile might be null if not set up
    b.profile(b => [
      b.bio(),
      b.website(),
      b.avatar(),
    ]),
    
    // Posts array - empty if no posts
    b.posts({ first: 10 }, b => [
      b.id(),
      b.title(),
      
      // Comments might be disabled
      b.comments({ first: 5 }, b => [
        b.id(),
        b.content(),
        
        // Author might be deleted
        b.author(b => [
          b.id(),
          b.name(),
        ])
      ])
    ])
  ]),
  
  // Fallback data if user doesn't exist
  b.defaultUserData(b => [
    b.suggestedUsers({ first: 5 }, b => [
      b.id(),
      b.name(),
      b.avatar(),
    ]),
    b.featuredPosts({ first: 5 }, b => [
      b.id(),
      b.title(),
      b.author(b => [
        b.name(),
      ])
    ])
  ])
])

// Type extraction with null handling
type RobustData = OutputOf<typeof ROBUST_DATA_QUERY>

function handleRobustData(data: RobustData) {
  if (data.user) {
    console.log(`Found user: ${data.user.name}`)
    
    if (data.user.profile) {
      console.log(`Bio: ${data.user.profile.bio}`)
    } else {
      console.log('User has no profile set up')
    }
    
    console.log(`Posts: ${data.user.posts.length}`)
  } else {
    console.log('User not found, showing suggestions:')
    data.defaultUserData.suggestedUsers.forEach(user => {
      console.log(`- ${user.name}`)
    })
  }
}
```

## Performance Optimization Patterns

Structure queries for optimal performance:

```typescript
const OPTIMIZED_FEED_QUERY = b.query('OptimizedFeed', {
  first: 'Int!',
  after: 'String',
  includeMetrics: 'Boolean!',
  includeComments: 'Boolean!'
}, (b, v) => [
  b.feed({
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
        // Essential fields always loaded
        b.id(),
        b.title(),
        b.publishedAt(),
        
        // Author info - minimal for performance
        b.author(b => [
          b.id(),
          b.name(),
          b.avatar(),
        ]),
        
        // Conditionally include expensive metrics
        ...(b.if(v.includeMetrics, [
          b.metrics(b => [
            b.viewsCount(),
            b.likesCount(),
            b.sharesCount(),
          ])
        ])),
        
        // Conditionally include comments (expensive nested query)
        ...(b.if(v.includeComments, [
          b.comments({ first: 3 }, b => [
            b.id(),
            b.content(),
            b.author(b => [
              b.name(),
            ])
          ])
        ]))
      ])
    ])
  ])
])
```

## Type Extraction for Complex Queries

Extract and work with complex nested types:

```typescript
import { OutputOf, SelectionSetOutput } from './generated'

// Extract full query result type
type ComplexForumData = OutputOf<typeof COMPLEX_FORUM_QUERY>

// Extract specific nested types
type UserProfile = NonNullable<ComplexForumData['user']>
type UserPost = UserProfile['posts'][number]
type PostComment = UserPost['comments'][number]

// Use extracted types in functions
function processForumData(data: ComplexForumData) {
  if (!data.user) {
    console.log('User not found')
    return
  }
  
  const user: UserProfile = data.user
  console.log(`User: ${user.name}`)
  console.log(`Posts: ${user.posts.length}`)
  
  user.posts.forEach((post: UserPost) => {
    console.log(`- ${post.title} (${post.comments.length} comments)`)
    
    post.comments.forEach((comment: PostComment) => {
      console.log(`  Comment by ${comment.author.name}: ${comment.content}`)
    })
  })
}
```

## Next Steps

- [Mutations](/examples/mutations) - Creating and updating data
- [Subscriptions](/examples/subscriptions) - Real-time data updates
- [Performance Tips](/guide/performance) - Optimizing query performance
- [Error Handling](/guide/error-handling) - Robust error management
