# Type Safety

GQLB provides comprehensive type safety throughout your GraphQL operations. Every field, argument, variable, and result is fully typed based on your schema.

## Output Types

Extract type-safe result types from your queries using `OutputOf`:

```typescript
import { b, OutputOf } from './generated'

const USER_QUERY = b.query('GetUser', (b) => [
  b.user({ id: "123" }, b => [
    b.id(),
    b.name(),
    b.email(),
  ])
])

type UserData = OutputOf<typeof USER_QUERY>
// Result:
// {
//   readonly user: {
//     readonly id: string
//     readonly name: string
//     readonly email: string | null
//     readonly __typename: "User"
//   } | null
//   readonly __typename: "Query"
// }
```

### Nullability

GQLB respects GraphQL's nullability rules:

```typescript
const NULLABLE_FIELDS = b.query('NullableFields', (b) => [
  b.user(b => [
    b.id(),        // string (non-null)
    b.name(),      // string (non-null)
    b.email(),     // string | null (nullable)
    b.bio(),       // string | null (nullable)
  ])
])

type Data = OutputOf<typeof NULLABLE_FIELDS>
// user.id and user.name are never null
// user.email and user.bio can be null
```

### Lists and Arrays

List types are properly typed as readonly arrays:

```typescript
const POSTS_QUERY = b.query('GetPosts', (b) => [
  b.posts(b => [
    b.id(),
    b.title(),
  ])
])

type PostsData = OutputOf<typeof POSTS_QUERY>
// Result:
// {
//   readonly posts: readonly {
//     readonly id: string
//     readonly title: string
//     readonly __typename: "Post"
//   }[]
//   readonly __typename: "Query"
// }
```

## Argument Type Safety

Field arguments are validated against your schema:

```typescript
// ✅ Correct - matches schema
const VALID_QUERY = b.query('ValidQuery', (b) => [
  b.user({ id: "123" }, b => [
    b.name()
  ])
])

// ❌ TypeScript error - wrong argument type
const INVALID_QUERY = b.query('InvalidQuery', (b) => [
  b.user({ id: 123 }, b => [  // Error: expected string, got number
    b.name()
  ])
])

// ❌ TypeScript error - missing required argument
const MISSING_ARG = b.query('MissingArg', (b) => [
  b.user(b => [  // Error: missing required 'id' argument
    b.name()
  ])
])
```

## Field Availability

Only fields that exist in your schema are available:

```typescript
const QUERY = b.query('FieldSafety', (b) => [
  b.user(b => [
    b.id(),        // ✅ Field exists
    b.name(),      // ✅ Field exists
    b.invalid(),   // ❌ TypeScript error - field doesn't exist
  ])
])
```

## Nested Type Safety

Type safety extends to all levels of nesting:

```typescript
const NESTED_QUERY = b.query('NestedSafety', (b) => [
  b.user(b => [
    b.id(),
    b.posts(b => [
      b.id(),
      b.title(),
      b.author(b => [     // Nested object
        b.id(),
        b.name(),
        b.invalidField(), // ❌ TypeScript error
      ])
    ])
  ])
])
```

## IntelliSense Support

GQLB provides rich IntelliSense features:

### Field Autocompletion

Start typing a field name to see available options:

```typescript
const QUERY = b.query('AutoComplete', (b) => [
  b.user(b => [
    b.n  // IntelliSense shows: name, notifications, etc.
  ])
])
```

### Hover Documentation

Hover over fields to see their GraphQL definitions:

```typescript
const QUERY = b.query('Documentation', (b) => [
  b.user(b => [
    b.email()  // Hover shows: "email: String" with description
  ])
])
```

### Deprecation Warnings

Deprecated fields are marked with strikethrough:

```typescript
const QUERY = b.query('Deprecated', (b) => [
  b.user(b => [
    b.oldField()  // Appears with strikethrough
  ])
])
```

## Union and Interface Types

Type safety works with GraphQL unions and interfaces:

```typescript
const SEARCH_QUERY = b.query('Search', (b) => [
  b.search({ query: "test" }, b => [
    // Common fields available on all types
    b.__on("User", b => [
      b.name(),
      b.email(),
    ]),
    b.__on("Post", b => [
      b.title(),
      b.content(),
    ])
  ])
])

type SearchData = OutputOf<typeof SEARCH_QUERY>
// Union type properly typed based on inline fragments
```

## Custom Scalars

Custom scalar types are mapped to TypeScript types:

```typescript
// In gqlb.config.ts
export default {
  generate: {
    scalarTypes: {
      DateTime: 'Date',
      UUID: 'string',
      JSON: 'Record<string, unknown>'
    }
  }
}

// In queries
const EVENT_QUERY = b.query('GetEvent', (b) => [
  b.event(b => [
    b.id(),           // UUID -> string
    b.createdAt(),    // DateTime -> Date
    b.metadata(),     // JSON -> Record<string, unknown>
  ])
])

type EventData = OutputOf<typeof EVENT_QUERY>
// All custom scalars properly typed
```

## Type Narrowing

Use TypeScript's type narrowing with `__typename`:

```typescript
type SearchResult = OutputOf<typeof SEARCH_QUERY>

function handleSearchResult(result: SearchResult['search'][0]) {
  if (result.__typename === 'User') {
    // result is now narrowed to User type
    console.log(result.name)    // ✅ Available
    console.log(result.title)   // ❌ TypeScript error
  } else if (result.__typename === 'Post') {
    // result is now narrowed to Post type
    console.log(result.title)   // ✅ Available
    console.log(result.name)    // ❌ TypeScript error
  }
}
```

## Next Steps

- [Learn about variables](/guide/variables) for dynamic queries
- [Use fragments](/guide/fragments) for reusable selections
- [Explore performance optimization](/guide/performance)
