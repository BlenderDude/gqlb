# API Reference Overview

GQLB provides a comprehensive API for building type-safe GraphQL queries. The API is divided into several key areas:

## Core APIs

### Builder API
The main interface for building GraphQL operations:
- **Query Builder** - Create type-safe GraphQL queries
- **Mutation Builder** - Create type-safe GraphQL mutations  
- **Subscription Builder** - Create type-safe GraphQL subscriptions
- **Fragment Builder** - Create reusable query fragments

### Runtime API
Core runtime utilities and types:
- **Type Helpers** - Extract types from operations (`OutputOf`, `VariablesOf`)
- **Fragment Utilities** - Work with fragments and their data
- **Operation Objects** - Access GraphQL documents and metadata

### CLI API
Command-line interface for code generation:
- **Generate Command** - Generate TypeScript builders from schemas
- **Convert Command** - Convert existing GraphQL documents to GQLB format
- **Configuration** - Project configuration and customization

## Quick Reference

### Import Statements

```typescript
// Generated builder and types
import { b, OutputOf, VariablesOf } from './generated'

// Core utilities (if needed)
import { FragmentDefinition, Operation } from '@gqlb/core'

// Configuration types
import { GQLBConfig } from '@gqlb/cli'
```

### Basic Usage Pattern

```typescript
// 1. Create operation
const QUERY = b.query('OperationName', variables, (b, v) => [
  // selections
])

// 2. Extract types
type Data = OutputOf<typeof QUERY>
type Variables = VariablesOf<typeof QUERY>

// 3. Get GraphQL document
const document = QUERY.document()

// 4. Execute with client
const result = await client.query({ query: document, variables })
```

## API Sections

- **[Builder API](/api/builder)** - Complete builder interface reference
- **[Configuration Guide](/guide/configuration)** - Project configuration options
- **[Code Generation](/guide/code-generation)** - CLI and generation process

## Type Safety Guarantees

GQLB provides these type safety guarantees:

1. **Field Existence** - Only fields that exist in your schema are available
2. **Argument Validation** - Field arguments match schema requirements
3. **Variable Type Checking** - Variables match their declared types
4. **Nullability Respect** - Nullable/non-null fields are properly typed
5. **Output Type Accuracy** - Result types exactly match selected fields

## Performance Characteristics

- **Zero Runtime Overhead** - Generated code compiles to standard GraphQL
- **Build-Time Validation** - All validation happens at TypeScript compile time
- **Lazy Evaluation** - GraphQL documents are generated on first access
- **Tree-Shakable** - Unused code is eliminated by bundlers

## Compatibility

### TypeScript Versions
- **Minimum**: TypeScript 4.7+
- **Recommended**: TypeScript 5.0+

### GraphQL Features
- ✅ Queries, Mutations, Subscriptions
- ✅ Fragments (named and inline)
- ✅ Variables and Arguments
- ✅ Custom Scalars
- ✅ Enums
- ✅ Unions and Interfaces
- ✅ Lists and Non-Null types
- ✅ Deprecation warnings

### GraphQL Clients
GQLB works with any GraphQL client that accepts standard GraphQL documents:
- Apollo Client
- Relay
- urql
- graphql-request
- Custom fetch-based clients

## Migration Guide

### From Raw GraphQL

```typescript
// Before: Raw GraphQL
const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`

// After: GQLB
const GET_USER = b.query('GetUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.id(),
    b.name(),
    b.email(),
  ])
])
```

### From Code Generators

```typescript
// Before: Generated hooks/types
const { data, loading } = useGetUserQuery({
  variables: { id: "123" }
})

// After: GQLB with client
const { data, loading } = useQuery(GET_USER.document(), {
  variables: { id: "123" }
})
```

## Best Practices

1. **Consistent Formatting** - Use comment markers for readable selections
2. **Variable Types** - Always use GraphQL type syntax for variables
3. **Fragment Reuse** - Create fragments for repeated selection patterns
4. **Type Extraction** - Use `OutputOf` and `VariablesOf` for function signatures
5. **Error Handling** - Leverage TypeScript's strict mode for better safety

## Getting Help

- **[GitHub Issues](https://github.com/BlenderDude/gqlb/issues)** - Bug reports and feature requests
- **[Examples](/examples/basic-queries)** - Practical usage examples
- **[Guide](/guide/getting-started)** - Step-by-step tutorials
