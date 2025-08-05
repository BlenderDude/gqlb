# Fragments

Fragments in GQLB allow you to create reusable query parts that can be shared across multiple operations. GQLB supports both defined fragments and inline fragments with full type safety.

## Defined Fragments

Create reusable fragments using `b.fragment()`:

### Basic Fragment

```typescript
import { b } from './generated'

// Define a fragment for user information
const USER_INFO_FRAGMENT = b.fragment('UserInfo', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
  b.avatar(),
])
```

### Using Fragments in Queries

Include fragments using `b.__fragment()`:

```typescript
const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.__fragment(USER_INFO_FRAGMENT)
  ])
])

const USERS_LIST = b.query('GetUsers', (b) => [
  b.users(b => [
    b.__fragment(USER_INFO_FRAGMENT)
  ])
])
```

**Generated GraphQL:**
```graphql
fragment UserInfo on User {
  id
  name
  email
  avatar
}

query GetUser($id: ID!) {
  user(id: $id) {
    __typename
    ...UserInfo
  }
}

query GetUsers {
  users {
    __typename
    ...UserInfo
  }
}
```

## Complex Fragments

Build fragments with nested objects and arguments:

```typescript
const POST_DETAILS_FRAGMENT = b.fragment('PostDetails', 'Post', (b) => [
  b.id(),
  b.title(),
  b.content(),
  b.publishedAt(),
  b.author(b => [
    b.id(),
    b.name(),
    b.avatar(),
  ]),
  b.comments({ limit: 5 }, b => [
    b.id(),
    b.content(),
    b.author(b => [
      b.name(),
    ])
  ])
])
```

## Fragment Composition

Combine fragments within other fragments:

```typescript
// Base user fragment
const USER_BASE = b.fragment('UserBase', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
])

// Extended user fragment that includes the base
const USER_EXTENDED = b.fragment('UserExtended', 'User', (b) => [
  b.__fragment(USER_BASE),
  b.bio(),
  b.website(),
  b.joinedAt(),
])

// Use in query
const USER_PROFILE_QUERY = b.query('GetUserProfile', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.__fragment(USER_EXTENDED),
    b.posts({ limit: 3 }, b => [
      b.id(),
      b.title(),
    ])
  ])
])
```

## Fragment with Variables

Create fragments that accept variables:

```typescript
const PAGINATED_POSTS_FRAGMENT = b.fragment('PaginatedPosts', 'User', (b) => [
  b.posts({ limit: 10, offset: 0 }, b => [
    b.id(),
    b.title(),
    b.publishedAt(),
  ])
])

// Note: Currently GQLB doesn't support variables in fragments directly.
// You would handle this by creating the fragment in the context where variables are available.
```

## Type-Safe Fragment Output

Extract types from fragments:

```typescript
import { OutputOf } from './generated'

const USER_FRAGMENT = b.fragment('UserFragment', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
])

type UserFragmentData = OutputOf<typeof USER_FRAGMENT>
// Result:
// {
//   readonly id: string
//   readonly name: string
//   readonly email: string | null
//   readonly __typename: "User"
// }

// Use in component props
interface UserCardProps {
  user: UserFragmentData
}

function UserCard({ user }: UserCardProps) {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  )
}
```

## Fragments for Different Types

Create fragments for different GraphQL types:

```typescript
// Fragment for Post type
const POST_FRAGMENT = b.fragment('PostInfo', 'Post', (b) => [
  b.id(),
  b.title(),
  b.excerpt(),
])

// Fragment for Comment type  
const COMMENT_FRAGMENT = b.fragment('CommentInfo', 'Comment', (b) => [
  b.id(),
  b.content(),
  b.createdAt(),
])

// Use both in a query
const FEED_QUERY = b.query('GetFeed', (b) => [
  b.posts(b => [
    b.__fragment(POST_FRAGMENT),
    b.comments({ limit: 3 }, b => [
      b.__fragment(COMMENT_FRAGMENT)
    ])
  ])
])
```

## Conditional Fragment Usage

Use fragments conditionally based on your application logic:

```typescript
const BASIC_USER = b.fragment('BasicUser', 'User', (b) => [
  b.id(),
  b.name(),
])

const DETAILED_USER = b.fragment('DetailedUser', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
  b.bio(),
  b.website(),
])

// Function to build query with different detail levels
function createUserQuery(includeDetails: boolean) {
  return b.query('GetUser', { id: 'ID!' }, (b, v) => [
    b.user({ id: v.id }, b => [
      b.__fragment(includeDetails ? DETAILED_USER : BASIC_USER)
    ])
  ])
}
```

## Fragment Best Practices

### 1. Naming Conventions

Use descriptive names that indicate the type and purpose:

```typescript
const USER_CARD_FRAGMENT = b.fragment('UserCard', 'User', (b) => [
  // Fields for user card component
])

const USER_PROFILE_FRAGMENT = b.fragment('UserProfile', 'User', (b) => [
  // Fields for user profile page
])
```

### 2. Fragment Organization

Group related fragments in separate files:

```typescript
// fragments/user.ts
export const USER_BASIC = b.fragment('UserBasic', 'User', (b) => [
  b.id(),
  b.name(),
])

export const USER_PROFILE = b.fragment('UserProfile', 'User', (b) => [
  b.__fragment(USER_BASIC),
  b.email(),
  b.bio(),
])

// fragments/post.ts
export const POST_SUMMARY = b.fragment('PostSummary', 'Post', (b) => [
  b.id(),
  b.title(),
  b.excerpt(),
])
```

### 3. Component Co-location

Define fragments near the components that use them:

```typescript
// components/UserCard.tsx
const USER_CARD_FRAGMENT = b.fragment('UserCard', 'User', (b) => [
  b.id(),
  b.name(),
  b.avatar(),
])

type UserCardProps = {
  user: OutputOf<typeof USER_CARD_FRAGMENT>
}

export function UserCard({ user }: UserCardProps) {
  // Component implementation
}

export { USER_CARD_FRAGMENT }
```

## Fragment Performance

Fragments provide several performance benefits:

### 1. Code Reuse
Fragments eliminate duplicate field selections across queries.

### 2. Bundle Size
Shared fragments reduce the overall size of generated GraphQL documents.

### 3. Maintainability
Changes to fragments automatically propagate to all queries that use them.

## Working with GraphQL Clients

### Apollo Client

```typescript
import { useQuery } from '@apollo/client'

const { data } = useQuery(USER_QUERY.document(), {
  variables: { id: "user-123" }
})

// data is fully typed including fragment fields
```

### Relay

```typescript
// Fragments work seamlessly with Relay's fragment system
export const UserCard = createFragmentContainer(UserCardComponent, {
  user: USER_CARD_FRAGMENT.document()
})
```

## Migration from Raw GraphQL

### Before: Raw GraphQL Fragments

```graphql
fragment UserInfo on User {
  id
  name
  email
}

query GetUser($id: ID!) {
  user(id: $id) {
    ...UserInfo
  }
}
```

### After: GQLB Fragments

```typescript
const USER_INFO = b.fragment('UserInfo', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
])

const GET_USER = b.query('GetUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.__fragment(USER_INFO)
  ])
])
```

## Next Steps

- [Inline Fragments](/guide/inline-fragments) - Learn about inline fragments for unions/interfaces
- [Complex Queries](/examples/complex-queries) - See fragments in advanced query patterns  
- [Performance](/guide/performance) - Optimize fragment usage for better performance
