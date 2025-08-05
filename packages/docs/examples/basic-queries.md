# Basic Queries

This page shows fundamental patterns for building GraphQL queries with GQLB. All examples assume you have generated your builder from a schema.

## Simple Field Selection

Start with basic scalar field selection:

```typescript
import { b } from './generated'

// Select user fields
const USER_QUERY = b.query('GetUser', (b) => [
  b.user(b => [
    b.id(),
    b.name(),
    b.email(),
  ])
])
```

**Generated GraphQL:**
```graphql
query GetUser {
  __typename
  user {
    __typename
    id
    name
    email
  }
}
```

## Queries with Arguments

Pass arguments to fields that require them:

```typescript
// User by ID
const USER_BY_ID = b.query('GetUserById', (b) => [
  b.user({ id: "user-123" }, b => [
    b.id(),
    b.name(),
    b.email(),
  ])
])

// Posts with pagination
const PAGINATED_POSTS = b.query('GetPosts', (b) => [
  b.posts({ 
    limit: 10, 
    offset: 0,
    published: true 
  }, b => [
    b.id(),
    b.title(),
    b.publishedAt(),
  ])
])
```

## Nested Object Selection

Select fields from nested objects:

```typescript
const USER_WITH_PROFILE = b.query('GetUserProfile', (b) => [
  b.user({ id: "user-123" }, b => [
    b.id(),
    b.name(),
    // Nested profile object
    b.profile(b => [
      b.bio(),
      b.website(),
      b.avatar(),
    ]),
    // Nested settings object
    b.settings(b => [
      b.theme(),
      b.notifications(),
      b.privacy(),
    ])
  ])
])
```

## Array/List Fields

Handle arrays of objects or scalars:

```typescript
const USER_WITH_POSTS = b.query('GetUserWithPosts', (b) => [
  b.user({ id: "user-123" }, b => [
    b.id(),
    b.name(),
    // Array of Post objects
    b.posts(b => [
      b.id(),
      b.title(),
      b.content(),
      b.publishedAt(),
    ]),
    // Array of strings
    b.tags(),
  ])
])
```

## Multiple Root Fields

Select multiple fields at the query root:

```typescript
const DASHBOARD_QUERY = b.query('GetDashboard', (b) => [
  // Current user
  b.currentUser(b => [
    b.id(),
    b.name(),
  ]),
  
  // Recent posts
  b.recentPosts({ limit: 5 }, b => [
    b.id(),
    b.title(),
    b.author(b => [
      b.name(),
    ])
  ]),
  
  // Statistics
  b.stats(b => [
    b.totalUsers(),
    b.totalPosts(),
    b.activeUsers(),
  ])
])
```

## Field Aliases

Use aliases when selecting the same field multiple times:

```typescript
const COMPARISON_QUERY = b.query('CompareUsers', (b) => [
  // First user aliased as 'user1'
  b.user({ id: "user-1" }, b => [
    b.id(),
    b.name(),
    b.postCount(),
  ], "user1"),
  
  // Second user aliased as 'user2'  
  b.user({ id: "user-2" }, b => [
    b.id(),
    b.name(),
    b.postCount(),
  ], "user2"),
])
```

**Generated GraphQL:**
```graphql
query CompareUsers {
  __typename
  user1: user(id: "user-1") {
    __typename
    id
    name
    postCount
  }
  user2: user(id: "user-2") {
    __typename
    id
    name
    postCount
  }
}
```

## Optional vs Required Arguments

Handle fields with different argument requirements:

```typescript
const FLEXIBLE_QUERY = b.query('FlexibleQuery', (b) => [
  // Field with required arguments
  b.user({ id: "required-id" }, b => [
    b.name()
  ]),
  
  // Field with optional arguments (can omit them)
  b.posts(b => [
    b.title()
  ]),
  
  // Field with optional arguments (can provide them)
  b.posts({ limit: 5 }, b => [
    b.title()
  ]),
])
```

## Complex Nested Structures

Build deeply nested queries:

```typescript
const COMPLEX_QUERY = b.query('ComplexStructure', (b) => [
  b.user({ id: "user-123" }, b => [
    b.id(),
    b.name(),
    b.posts({ limit: 10 }, b => [
      b.id(),
      b.title(),
      b.author(b => [
        b.id(),
        b.name(),
      ]),
      b.comments({ limit: 5 }, b => [
        b.id(),
        b.content(),
        b.author(b => [
          b.id(),
          b.name(),
        ]),
        b.replies(b => [
          b.id(),
          b.content(),
        ])
      ])
    ])
  ])
])
```

## Working with Enums

Select and use enum values:

```typescript
const POSTS_BY_STATUS = b.query('GetPostsByStatus', (b) => [
  b.posts({ 
    status: "PUBLISHED",  // Enum value
    sortBy: "CREATED_AT"  // Another enum
  }, b => [
    b.id(),
    b.title(),
    b.status(),    // Returns enum value
    b.publishedAt(),
  ])
])
```

## Type Extraction

Extract TypeScript types from your queries:

```typescript
import { OutputOf } from './generated'

const USER_QUERY = b.query('GetUser', (b) => [
  b.user({ id: "123" }, b => [
    b.id(),
    b.name(),
    b.email(),
    b.posts(b => [
      b.id(),
      b.title(),
    ])
  ])
])

// Extract the result type
type UserData = OutputOf<typeof USER_QUERY>
// Result:
// {
//   readonly user: {
//     readonly id: string
//     readonly name: string  
//     readonly email: string | null
//     readonly posts: readonly {
//       readonly id: string
//       readonly title: string
//       readonly __typename: "Post"
//     }[]
//     readonly __typename: "User"
//   } | null
//   readonly __typename: "Query"
// }

// Use in functions
function processUserData(data: UserData) {
  if (data.user) {
    console.log(`User: ${data.user.name}`)
    console.log(`Posts: ${data.user.posts.length}`)
  }
}
```

## Error Handling Patterns

Structure queries for better error handling:

```typescript
// Query that might return null
const SAFE_USER_QUERY = b.query('SafeGetUser', (b) => [
  b.user({ id: "might-not-exist" }, b => [
    b.id(),
    b.name(),
  ])
])

type SafeUserData = OutputOf<typeof SAFE_USER_QUERY>

function handleUserData(data: SafeUserData) {
  if (data.user) {
    // User exists
    console.log(`Found user: ${data.user.name}`)
  } else {
    // User not found
    console.log('User not found')
  }
}
```

## Next Steps

- [Complex Queries](/examples/complex-queries) - Advanced query patterns
- [Mutations](/examples/mutations) - Creating and updating data
- [Subscriptions](/examples/subscriptions) - Real-time data updates
- [Variables](/guide/variables) - Using variables in queries
- [Fragments](/guide/fragments) - Reusable query parts
- [Performance](/guide/performance) - Optimizing query performance
- [Error Handling](/guide/error-handling) - Robust error management
- [Testing](/guide/testing) - Testing strategies for queries
