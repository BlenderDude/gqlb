# Query Building

GQLB provides a fluent API for building GraphQL queries, mutations, and subscriptions. The builder ensures type safety while maintaining the familiar structure of GraphQL.

## Basic Query Structure

All operations follow the same pattern:

```typescript
import { b } from './generated'

const QUERY_NAME = b.query('OperationName', (b) => [
  // Field selections go here
])
```

## Field Selection

Select fields using the builder's field methods:

```typescript
const USER_QUERY = b.query('GetUser', (b) => [
  b.user(b => [
    b.id(),           // Scalar field
    b.name(),         // Scalar field  
    b.email(),        // Nullable scalar field
  ])
])
```

### Nested Objects

For fields that return objects, provide a sub-builder:

```typescript
const USER_WITH_POSTS = b.query('GetUserWithPosts', (b) => [
  b.user(b => [
    b.id(),
    b.name(),
    b.posts(b => [    // Nested object field
      b.id(),
      b.title(),
      b.content(),
    ])
  ])
])
```

### Lists and Arrays

Lists are handled automatically based on your schema:

```typescript
const ALL_USERS = b.query('GetAllUsers', (b) => [
  b.users(b => [      // Returns User[]
    b.id(),
    b.name(),
  ])
])
```

## Field Arguments

Pass arguments as the first parameter to field methods:

```typescript
const USER_BY_ID = b.query('GetUserById', (b) => [
  b.user({ id: "123" }, b => [
    b.id(),
    b.name(),
  ])
])
```

### Optional Arguments

Fields with optional arguments can be called with or without them:

```typescript
const POSTS_QUERY = b.query('GetPosts', (b) => [
  b.posts(b => [          // No arguments
    b.id(),
    b.title(),
  ]),
  
  b.posts({ limit: 10 }, b => [  // With arguments
    b.id(),
    b.title(),
  ])
])
```

## Mutations

Mutations follow the same pattern as queries:

```typescript
const CREATE_USER = b.mutation('CreateUser', (b) => [
  b.createUser({ 
    input: {
      name: "John Doe",
      email: "john@example.com"
    }
  }, b => [
    b.id(),
    b.name(),
    b.email(),
  ])
])
```

## Subscriptions

Subscriptions are built similarly:

```typescript
const USER_UPDATED = b.subscription('UserUpdated', (b) => [
  b.userUpdated({ userId: "123" }, b => [
    b.id(),
    b.name(),
    b.updatedAt(),
  ])
])
```

## Aliases

Use aliases to select the same field multiple times with different arguments:

```typescript
const ALIASED_QUERY = b.query('AliasedFields', (b) => [
  b.user({ id: "1" }, b => [
    b.name(),
  ], "user1"),           // Alias as "user1"
  
  b.user({ id: "2" }, b => [
    b.name(),
  ], "user2"),           // Alias as "user2"
])
```

This generates:

```graphql
query AliasedFields {
  user1: user(id: "1") {
    __typename
    name
  }
  user2: user(id: "2") {
    __typename
    name
  }
}
```

## Type Name Selection

GQLB automatically includes `__typename` fields for type safety. You don't need to manually select them, but they appear in your generated GraphQL documents.

## Getting the GraphQL Document

Convert your builder to a GraphQL document:

```typescript
const query = USER_QUERY.document()

// Use with your GraphQL client
const result = await client.query({
  query,
  variables: {}
})
```

## Formatting and Readability

Use consistent formatting for better readability:

```typescript
const WELL_FORMATTED_QUERY = b.query('WellFormatted', (b) => [
  //
  b.user({ id: "123" }, b => [
    //
    b.id(),
    b.name(),
    b.posts(b => [
      //
      b.id(),
      b.title(),
      b.publishedAt(),
    ]),
  ]),
])
```

The comment markers help maintain consistent formatting when using automatic formatters.

## Next Steps

- [Learn about type safety](/guide/type-safety)
- [Use variables in your queries](/guide/variables)
- [Create reusable fragments](/guide/fragments)
- [Explore inline fragments](/guide/inline-fragments)
