# Builder API

The Builder API is the main interface for creating type-safe GraphQL operations in GQLB. It provides fluent methods for building queries, mutations, subscriptions, and fragments.

## Root Builder (`b`)

The root builder is imported from your generated code and provides access to all operation types:

```typescript
import { b } from './generated'

// Available operations
b.query()        // Create queries
b.mutation()     // Create mutations  
b.subscription() // Create subscriptions
b.fragment()     // Create fragments
```

## Query Builder

### Basic Syntax

```typescript
b.query(name: string, builder: BuilderFunction)
b.query(name: string, variables: Variables, builder: BuilderFunction)
```

### Examples

```typescript
// Simple query without variables
const USERS_QUERY = b.query('GetUsers', (b) => [
  b.users(b => [
    b.id(),
    b.name(),
  ])
])

// Query with variables
const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.id(),
    b.name(),
    b.email(),
  ])
])
```

## Mutation Builder

### Basic Syntax

```typescript
b.mutation(name: string, builder: BuilderFunction)
b.mutation(name: string, variables: Variables, builder: BuilderFunction)
```

### Examples

```typescript
// Simple mutation
const DELETE_USER = b.mutation('DeleteUser', { id: 'ID!' }, (b, v) => [
  b.deleteUser({ id: v.id }, b => [
    b.success(),
    b.message(),
  ])
])

// Complex mutation with input types
const CREATE_POST = b.mutation('CreatePost', { 
  input: 'CreatePostInput!' 
}, (b, v) => [
  b.createPost({ input: v.input }, b => [
    b.id(),
    b.title(),
    b.author(b => [
      b.id(),
      b.name(),
    ])
  ])
])
```

## Subscription Builder

### Basic Syntax

```typescript
b.subscription(name: string, builder: BuilderFunction)
b.subscription(name: string, variables: Variables, builder: BuilderFunction)
```

### Examples

```typescript
// Real-time notifications
const NOTIFICATIONS_SUB = b.subscription('NotificationUpdates', {
  userId: 'ID!'
}, (b, v) => [
  b.notificationAdded({ userId: v.userId }, b => [
    b.id(),
    b.message(),
    b.createdAt(),
  ])
])
```

## Fragment Builder

### Basic Syntax

```typescript
b.fragment(name: string, typeCondition: string, builder: BuilderFunction)
```

### Examples

```typescript
// Reusable user fragment
const USER_FRAGMENT = b.fragment('UserInfo', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
  b.avatar(),
])

// Use in queries
const QUERY_WITH_FRAGMENT = b.query('GetUser', (b) => [
  b.user(b => [
    b.__fragment(USER_FRAGMENT)
  ])
])
```

## Field Selection

### Scalar Fields

Select scalar fields directly:

```typescript
const QUERY = b.query('ScalarFields', (b) => [
  b.user(b => [
    b.id(),          // String!
    b.name(),        // String!
    b.email(),       // String (nullable)
    b.age(),         // Int (nullable)
    b.isActive(),    // Boolean!
  ])
])
```

### Object Fields

Object fields require a sub-builder:

```typescript
const QUERY = b.query('ObjectFields', (b) => [
  b.user(b => [
    b.profile(b => [      // User.profile: Profile
      b.bio(),
      b.website(),
    ]),
    b.settings(b => [     // User.settings: Settings
      b.theme(),
      b.notifications(),
    ])
  ])
])
```

### List Fields

Lists are handled automatically:

```typescript
const QUERY = b.query('ListFields', (b) => [
  b.user(b => [
    b.posts(b => [        // User.posts: [Post!]!
      b.id(),
      b.title(),
    ]),
    b.tags(),             // User.tags: [String!] (scalar list)
  ])
])
```

## Field Arguments

### Required Arguments

Fields with required arguments must receive them:

```typescript
const QUERY = b.query('RequiredArgs', (b) => [
  b.user({ id: "123" }, b => [    // id is required
    b.name()
  ])
])
```

### Optional Arguments

Optional arguments can be omitted:

```typescript
const QUERY = b.query('OptionalArgs', (b) => [
  // Without optional arguments
  b.posts(b => [
    b.title()
  ]),
  
  // With optional arguments
  b.posts({ limit: 10, offset: 0 }, b => [
    b.title()
  ])
])
```

### Argument Types

Arguments are typed based on your schema:

```typescript
const QUERY = b.query('TypedArgs', (b) => [
  b.posts({
    limit: 10,              // Int
    published: true,        // Boolean
    authorId: "123",        // ID
    tags: ["tech", "js"],   // [String!]
    filters: {              // Custom input type
      minDate: "2023-01-01",
      maxDate: "2023-12-31"
    }
  }, b => [
    b.title()
  ])
])
```

## Field Aliases

Use aliases to select the same field multiple times:

```typescript
const QUERY = b.query('Aliases', (b) => [
  // Third parameter is the alias
  b.user({ id: "1" }, b => [
    b.name()
  ], "firstUser"),
  
  b.user({ id: "2" }, b => [
    b.name()
  ], "secondUser")
])
```

## Inline Fragments

Use `__on` for inline fragments on unions/interfaces:

```typescript
const QUERY = b.query('InlineFragments', (b) => [
  b.search({ query: "test" }, b => [
    // SearchResult is a union of User | Post
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
```

## Fragment Spreads

Include fragments using `__fragment`:

```typescript
const USER_FIELDS = b.fragment('UserFields', 'User', (b) => [
  b.id(),
  b.name(),
  b.email(),
])

const QUERY = b.query('WithFragment', (b) => [
  b.user(b => [
    b.__fragment(USER_FIELDS)
  ])
])
```

## Builder Function Parameters

### Without Variables

```typescript
(b: Builder) => Selection[]
```

### With Variables

```typescript
(b: Builder, v: Variables) => Selection[]
```

### Builder Object Methods

The builder object `b` provides methods for:

- **Field selection**: `b.fieldName()`
- **Inline fragments**: `b.__on(type, builder)`
- **Fragment spreads**: `b.__fragment(fragment)`

## Operation Methods

### `.document()`

Get the GraphQL document:

```typescript
const query = USERS_QUERY.document()
// Returns: DocumentNode suitable for GraphQL clients
```

### Type Information

Operations carry type information for extracting result and variable types:

```typescript
type Data = OutputOf<typeof USERS_QUERY>
type Variables = VariablesOf<typeof USER_QUERY>
```

## Builder Validation

GQLB validates your builder usage at compile time:

```typescript
// ✅ Valid
const VALID = b.query('Valid', (b) => [
  b.existingField(b => [
    b.nestedField()
  ])
])

// ❌ TypeScript errors
const INVALID = b.query('Invalid', (b) => [
  b.nonExistentField(),        // Error: field doesn't exist
  b.requiredArgField(b => [    // Error: missing required arguments
    b.field()
  ])
])
```

## Performance Notes

- Builders use lazy evaluation - documents are generated on first `.document()` call
- Generated code has zero runtime overhead
- Complex builders are efficiently tree-shaken by bundlers
- Fragment reuse reduces code duplication

## Next Steps

- [API Overview](/api/overview) - Complete API reference
- [Examples](/examples/basic-queries) - Practical usage patterns
- [Configuration](/guide/configuration) - Project setup and configuration
