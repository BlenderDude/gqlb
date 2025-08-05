# Getting Started

GQLB is a TypeScript-first GraphQL query builder that generates fully type-safe client code from your GraphQL schema. Unlike other query builders, GQLB provides complete type safety with zero runtime overhead.

## What is GQLB?

GQLB (GraphQL Builder) is a code generation tool that creates TypeScript interfaces and builder functions from your GraphQL schema. It enables you to write GraphQL queries using a fluent API while maintaining full type safety.

### Key Benefits

- **Full Type Safety**: Every field, argument, and variable is typed
- **Zero Runtime Cost**: Generates pure TypeScript interfaces
- **Rich IntelliSense**: Complete autocompletion and error detection
- **Schema Validation**: Compile-time validation against your GraphQL schema
- **Fragment Support**: Type-safe fragments and inline fragments
- **Variable Support**: Strongly typed GraphQL variables

## How It Works

1. **Schema Input**: Provide your GraphQL schema (SDL file, introspection, or programmatic)
2. **Code Generation**: GQLB generates TypeScript builder interfaces
3. **Type-Safe Queries**: Write queries using the generated builder API
4. **Compile-Time Safety**: TypeScript validates your queries against the schema

## Basic Example

Given a simple GraphQL schema:

```graphql
type Query {
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
  email: String
}
```

GQLB generates a builder that allows you to write:

```typescript
import { b } from './generated'

const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.id(),
    b.name(),
    b.email(),
  ])
])

// Get the GraphQL document
const document = USER_QUERY.document()

// Get type-safe output type
type UserData = OutputOf<typeof USER_QUERY>
```

This generates the GraphQL document:

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

## Next Steps

- [Install GQLB](/guide/installation) in your project
- [Configure your schema](/guide/configuration)
- [Generate your first builder](/guide/code-generation)
- [Start building queries](/guide/query-building)
