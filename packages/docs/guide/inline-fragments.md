# Inline Fragments

Inline fragments allow you to conditionally select fields based on the concrete type of a union or interface field. GQLB provides full type safety for inline fragments with intelligent autocompletion.

## Basic Inline Fragments

Use `b.__on()` to create inline fragments:

```typescript
import { b } from './generated'

// Assuming SearchResult is a union: User | Post | Comment
const SEARCH_QUERY = b.query('Search', { query: 'String!' }, (b, v) => [
  b.search({ query: v.query }, b => [
    b.__on("User", b => [
      b.id(),
      b.name(),
      b.email(),
    ]),
    b.__on("Post", b => [
      b.id(), 
      b.title(),
      b.content(),
    ]),
    b.__on("Comment", b => [
      b.id(),
      b.content(),
      b.author(b => [
        b.name(),
      ])
    ])
  ])
])
```

**Generated GraphQL:**
```graphql
query Search($query: String!) {
  search(query: $query) {
    __typename
    ... on User {
      id
      name
      email
    }
    ... on Post {
      id
      title
      content
    }
    ... on Comment {
      id
      content
      author {
        __typename
        name
      }
    }
  }
}
```

## Interface Types

Use inline fragments to access specific implementations of an interface:

```typescript
// Assuming Node is an interface implemented by User, Post, Comment
const NODE_QUERY = b.query('GetNode', { id: 'ID!' }, (b, v) => [
  b.node({ id: v.id }, b => [
    // Common interface fields
    b.id(),
    
    // Type-specific fields
    b.__on("User", b => [
      b.name(),
      b.email(),
    ]),
    b.__on("Post", b => [
      b.title(),
      b.publishedAt(),
    ]),
    b.__on("Comment", b => [
      b.content(),
      b.createdAt(),
    ])
  ])
])
```

## Type-Safe Results

GQLB generates proper union types for inline fragment results:

```typescript
import { OutputOf } from './generated'

type SearchData = OutputOf<typeof SEARCH_QUERY>
// Result:
// {
//   readonly search: readonly ({
//     readonly __typename: "User"
//     readonly id: string
//     readonly name: string  
//     readonly email: string | null
//   } | {
//     readonly __typename: "Post"
//     readonly id: string
//     readonly title: string
//     readonly content: string
//   } | {
//     readonly __typename: "Comment"
//     readonly id: string
//     readonly content: string
//     readonly author: {
//       readonly name: string
//       readonly __typename: "User"
//     }
//   })[]
// }
```

## Type Narrowing

Use TypeScript's type narrowing with `__typename`:

```typescript
function handleSearchResults(results: SearchData['search']) {
  results.forEach(result => {
    switch (result.__typename) {
      case 'User':
        // result is narrowed to User type
        console.log(`User: ${result.name}`)
        console.log(`Email: ${result.email}`)
        break
        
      case 'Post':
        // result is narrowed to Post type  
        console.log(`Post: ${result.title}`)
        console.log(`Content: ${result.content}`)
        break
        
      case 'Comment':
        // result is narrowed to Comment type
        console.log(`Comment: ${result.content}`)
        console.log(`Author: ${result.author.name}`)
        break
    }
  })
}
```

## Nested Inline Fragments

Use inline fragments at any level of nesting:

```typescript
const NESTED_FRAGMENTS = b.query('NestedFragments', (b) => [
  b.posts(b => [
    b.id(),
    b.title(),
    b.author(b => [
      // Author can be User or Organization
      b.__on("User", b => [
        b.name(),
        b.email(),
      ]),
      b.__on("Organization", b => [
        b.name(),
        b.website(),
      ])
    ]),
    b.attachments(b => [
      // Attachments can be Image or Document
      b.__on("Image", b => [
        b.url(),
        b.width(),
        b.height(),
      ]),
      b.__on("Document", b => [
        b.url(),
        b.filename(),
        b.size(),
      ])
    ])
  ])
])
```

## Combining with Defined Fragments

Mix inline fragments with defined fragments:

```typescript
// Define reusable fragments for each type
const USER_DETAILS = b.fragment('UserDetails', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
  b.avatar(),
])

const POST_DETAILS = b.fragment('PostDetails', 'Post', (b) => [
  b.id(),
  b.title(),
  b.excerpt(),
  b.publishedAt(),
])

// Use in inline fragments
const FEED_QUERY = b.query('GetFeed', (b) => [
  b.feedItems(b => [
    b.__on("User", b => [
      b.__fragment(USER_DETAILS)
    ]),
    b.__on("Post", b => [
      b.__fragment(POST_DETAILS)
    ])
  ])
])
```

## Object Type Inline Fragments

Even use inline fragments on concrete object types for conditional field selection:

```typescript
const CONDITIONAL_QUERY = b.query('ConditionalFields', (b) => [
  b.user(b => [
    b.id(),
    b.name(),
    
    // Inline fragment on the same type for organization
    b.__on("User", b => [
      b.profile(b => [
        b.bio(),
        b.website(),
      ])
    ])
  ])
])
```

## IntelliSense and Validation

GQLB provides intelligent autocompletion for inline fragments:

### Available Types

When typing `b.__on("`, IntelliSense shows only valid types for that position:

```typescript
const QUERY = b.query('TypeHelp', (b) => [
  b.searchResults(b => [
    b.__on("  // Shows: User, Post, Comment (union members)
  ])
])
```

### Field Availability

Within inline fragments, only fields valid for that type are available:

```typescript
const QUERY = b.query('FieldValidation', (b) => [
  b.searchResults(b => [
    b.__on("User", b => [
      b.name(),      // ✅ Valid for User
      b.email(),     // ✅ Valid for User  
      b.title(),     // ❌ Error: not valid for User
    ])
  ])
])
```

## Performance Considerations

### Fragment Merging

GraphQL automatically merges fragments with the same type condition:

```typescript
const MERGED_QUERY = b.query('MergedFragments', (b) => [
  b.node(b => [
    b.__on("User", b => [
      b.id(),
      b.name(),
    ]),
    b.__on("User", b => [  // Merged with above
      b.email(),
    ])
  ])
])
```

Results in:
```graphql
query MergedFragments {
  node {
    __typename
    ... on User {
      id
      name
      email
    }
  }
}
```

### Selective Loading

Use inline fragments to load only necessary data:

```typescript
// Load minimal data for list view
const LIST_QUERY = b.query('ListView', (b) => [
  b.items(b => [
    b.__on("Post", b => [
      b.id(),
      b.title(),        // Only title for posts
    ]),
    b.__on("User", b => [
      b.id(), 
      b.name(),         // Only name for users
    ])
  ])
])

// Load detailed data for detail view
const DETAIL_QUERY = b.query('DetailView', { id: 'ID!' }, (b, v) => [
  b.item({ id: v.id }, b => [
    b.__on("Post", b => [
      b.id(),
      b.title(),
      b.content(),      // Full content for detail
      b.author(b => [
        b.name(),
      ])
    ]),
    b.__on("User", b => [
      b.id(),
      b.name(),
      b.bio(),          // Full bio for detail
      b.posts(b => [
        b.title(),
      ])
    ])
  ])
])
```

## Common Patterns

### Error Handling

Handle different types of results including errors:

```typescript
// Assuming a Result union: Success | Error
const OPERATION_QUERY = b.query('PerformOperation', (b) => [
  b.performAction(b => [
    b.__on("Success", b => [
      b.message(),
      b.data(b => [
        b.id(),
        b.name(),
      ])
    ]),
    b.__on("ValidationError", b => [
      b.message(),
      b.field(),
      b.code(),
    ]),
    b.__on("SystemError", b => [
      b.message(),
      b.timestamp(),
    ])
  ])
])
```

### Content Types

Handle different content types in a CMS:

```typescript
const CONTENT_QUERY = b.query('GetContent', (b) => [
  b.content(b => [
    b.__on("Article", b => [
      b.title(),
      b.body(),
      b.publishedAt(),
    ]),
    b.__on("Video", b => [
      b.title(),
      b.url(),
      b.duration(),
    ]),
    b.__on("Gallery", b => [
      b.title(),
      b.images(b => [
        b.url(),
        b.caption(),
      ])
    ])
  ])
])
```

## Migration from Raw GraphQL

### Before: Raw GraphQL

```graphql
query Search($query: String!) {
  search(query: $query) {
    ... on User {
      id
      name
      email
    }
    ... on Post {
      id
      title
      content
    }
  }
}
```

### After: GQLB

```typescript
const SEARCH_QUERY = b.query('Search', { query: 'String!' }, (b, v) => [
  b.search({ query: v.query }, b => [
    b.__on("User", b => [
      b.id(),
      b.name(),
      b.email(),
    ]),
    b.__on("Post", b => [
      b.id(),
      b.title(),
      b.content(),
    ])
  ])
])
```

## Next Steps

- [Custom Scalars](/guide/custom-scalars) - Handle custom scalar types
- [Complex Queries](/examples/complex-queries) - Advanced query patterns
- [Performance](/guide/performance) - Optimize query performance
