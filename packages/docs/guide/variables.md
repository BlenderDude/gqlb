# Variables

GraphQL variables allow you to parameterize your queries, making them reusable with different input values. GQLB provides full type safety for variable definitions and usage.

## Basic Variable Usage

Define variables as the second argument to your operation:

```typescript
import { b } from './generated'

const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.id(),
    b.name(),
    b.email(),
  ])
])
```

This generates:

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    __typename
    id
    name
    email
  }
}
```

## Variable Type Syntax

Variables use GraphQL type syntax as strings:

```typescript
const VARIABLES_EXAMPLE = b.query('Example', {
  id: 'ID!',                    // Required ID
  name: 'String',               // Optional String
  limit: 'Int!',                // Required Int
  filters: 'PostFilters',       // Custom input type
  tags: '[String!]!',           // Required array of required strings
}, (b, v) => [
  // Use variables with v.fieldName
])
```

### Common Variable Types

| GraphQL Type | TypeScript Type | Description |
|--------------|-----------------|-------------|
| `String` | `string \| null` | Optional string |
| `String!` | `string` | Required string |
| `Int` | `number \| null` | Optional integer |
| `Int!` | `number` | Required integer |
| `Boolean!` | `boolean` | Required boolean |
| `ID!` | `string \| number` | Required ID |
| `[String!]!` | `string[]` | Required array of strings |
| `CustomInput` | `CustomInputType` | Custom input type |

## Using Variables

Access variables through the second parameter of your builder function:

```typescript
const FILTERED_POSTS = b.query('FilteredPosts', {
  authorId: 'ID!',
  limit: 'Int',
  published: 'Boolean'
}, (b, v) => [
  b.posts({ 
    authorId: v.authorId,     // Required variable
    limit: v.limit,           // Optional variable
    published: v.published    // Optional variable
  }, b => [
    b.id(),
    b.title(),
    b.publishedAt(),
  ])
])
```

## Variable Type Validation

GQLB validates that variables match your schema:

```typescript
// ✅ Valid - variable type matches field argument
const VALID = b.query('Valid', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [  // Field expects ID!, variable provides ID!
    b.name()
  ])
])

// ❌ TypeScript error - type mismatch
const INVALID = b.query('Invalid', { id: 'String!' }, (b, v) => [
  b.user({ id: v.id }, b => [  // Field expects ID!, variable provides String!
    b.name()
  ])
])
```

## Nullable Variables

GQLB handles nullable variables correctly:

```typescript
const OPTIONAL_FILTER = b.query('OptionalFilter', {
  search: 'String',    // Optional - can be null
  limit: 'Int!'        // Required - cannot be null
}, (b, v) => [
  b.posts({
    search: v.search,  // string | null
    limit: v.limit     // number
  }, b => [
    b.id(),
    b.title(),
  ])
])
```

## Custom Input Types

Use custom input types defined in your schema:

```typescript
// Given this schema:
// input PostFilters {
//   tags: [String!]
//   minDate: DateTime
//   maxDate: DateTime
// }

const FILTERED_POSTS = b.query('FilteredPosts', {
  filters: 'PostFilters!'
}, (b, v) => [
  b.posts({ filters: v.filters }, b => [
    b.id(),
    b.title(),
    b.tags(),
  ])
])

// TypeScript knows the shape of filters:
type Variables = {
  filters: {
    tags?: string[]
    minDate?: Date
    maxDate?: Date
  }
}
```

## Multiple Variables

Define multiple variables with different types:

```typescript
const COMPLEX_QUERY = b.query('ComplexQuery', {
  userId: 'ID!',
  postLimit: 'Int',
  includeComments: 'Boolean!',
  sort: 'PostSort'
}, (b, v) => [
  b.user({ id: v.userId }, b => [
    b.id(),
    b.name(),
    b.posts({ 
      limit: v.postLimit,
      sort: v.sort 
    }, b => [
      b.id(),
      b.title(),
      ...(v.includeComments ? [
        b.comments(b => [
          b.id(),
          b.content(),
        ])
      ] : [])
    ])
  ])
])
```

## Variable Usage in Mutations

Variables work the same way in mutations:

```typescript
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

## Default Values

GraphQL default values are handled by the server, but you can specify them:

```typescript
// With default values in your schema:
// type Query {
//   posts(limit: Int = 10): [Post!]!
// }

const POSTS_WITH_DEFAULT = b.query('PostsWithDefault', (b) => [
  b.posts(b => [        // No limit argument - uses default
    b.id(),
    b.title(),
  ])
])

const POSTS_WITH_LIMIT = b.query('PostsWithLimit', {
  limit: 'Int'
}, (b, v) => [
  b.posts({ limit: v.limit }, b => [  // Override default
    b.id(),
    b.title(),
  ])
])
```

## Runtime Usage

When executing queries, provide variables as a separate object:

```typescript
import { USER_QUERY } from './queries'

// With Apollo Client
const { data } = await client.query({
  query: USER_QUERY.document(),
  variables: {
    id: "user-123"
  }
})

// With other GraphQL clients
const response = await graphqlClient.request(
  USER_QUERY.document(),
  { id: "user-123" }
)
```

## Type Extraction

Extract variable types for function parameters:

```typescript
import { VariablesOf } from '@gqlb/core'

type UserQueryVariables = VariablesOf<typeof USER_QUERY>
// Result: { id: string }

async function fetchUser(variables: UserQueryVariables) {
  return client.query({
    query: USER_QUERY.document(),
    variables
  })
}
```

## Next Steps

- [Learn about fragments](/guide/fragments) for reusable query parts
- [Explore inline fragments](/guide/inline-fragments) for union/interface types
- [See practical examples](/examples/basic-queries) using variables
