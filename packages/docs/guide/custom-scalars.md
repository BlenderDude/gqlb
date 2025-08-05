# Custom Scalars

GraphQL scalar types represent primitive leaf values in your schema. While GraphQL includes built-in scalars like `String`, `Int`, `Float`, `Boolean`, and `ID`, you can also define custom scalars for specialized data types.

## Built-in Scalar Mapping

GQLB automatically maps GraphQL's built-in scalars to TypeScript types:

| GraphQL Type | TypeScript Type |
|--------------|-----------------|
| `String` | `string` |
| `Int` | `number` |
| `Float` | `number` |
| `Boolean` | `boolean` |
| `ID` | `string \| number` |

## Configuring Custom Scalars

Define custom scalar mappings in your `gqlb.config.ts`:

```typescript
import { GQLBConfig } from '@gqlb/cli'

export default {
  generate: {
    schema: { sdl: 'schema.graphql' },
    output: 'src/generated',
    scalarTypes: {
      DateTime: 'Date',
      JSON: 'Record<string, unknown>',
      UUID: 'string',
      Email: 'string',
      URL: 'string',
      BigInt: 'bigint',
      Decimal: 'number',
    }
  }
} satisfies GQLBConfig
```

## Common Custom Scalar Examples

### Date and Time

```typescript
// Configuration
scalarTypes: {
  DateTime: 'Date',
  Date: 'string',  // ISO date string
  Time: 'string',  // ISO time string
}

// Usage in queries
const EVENT_QUERY = b.query('GetEvent', (b) => [
  b.event(b => [
    b.id(),
    b.title(),
    b.startTime(),    // Date type
    b.endTime(),      // Date type
    b.createdAt(),    // Date type
  ])
])

type EventData = OutputOf<typeof EVENT_QUERY>
// event.startTime is typed as Date
// event.endTime is typed as Date
// event.createdAt is typed as Date
```

### JSON Data

```typescript
// Configuration
scalarTypes: {
  JSON: 'Record<string, unknown>',
  JSONObject: '{ [key: string]: any }',
}

// Usage
const USER_QUERY = b.query('GetUser', (b) => [
  b.user(b => [
    b.id(),
    b.name(),
    b.preferences(),  // JSON type
    b.metadata(),     // JSON type
  ])
])

type UserData = OutputOf<typeof USER_QUERY>
// user.preferences is typed as Record<string, unknown>
// user.metadata is typed as Record<string, unknown>
```

### Identifiers

```typescript
// Configuration  
scalarTypes: {
  UUID: 'string',
  ObjectId: 'string',
  ShortId: 'string',
}

// Usage
const QUERY = b.query('GetPost', { id: 'UUID!' }, (b, v) => [
  b.post({ id: v.id }, b => [  // v.id is typed as string
    b.id(),        // UUID -> string
    b.authorId(),  // UUID -> string
    b.title(),
  ])
])
```

### Numeric Types

```typescript
// Configuration
scalarTypes: {
  BigInt: 'bigint',
  Decimal: 'number',
  Float64: 'number',
  Currency: 'number',
}

// Usage
const PRODUCT_QUERY = b.query('GetProduct', (b) => [
  b.product(b => [
    b.id(),
    b.price(),      // Currency -> number
    b.weight(),     // Decimal -> number
    b.views(),      // BigInt -> bigint
  ])
])
```

## Advanced Scalar Types

### Union Types for Scalars

Handle scalars that can be multiple types:

```typescript
// Configuration
scalarTypes: {
  Mixed: 'string | number | boolean',
  ID: 'string | number',  // Override default
}
```

### Generic Types

Use TypeScript generics for flexible scalar types:

```typescript
// Configuration
scalarTypes: {
  'Connection<T>': 'T[]',
  'Maybe<T>': 'T | null',
}
```

### Custom Type Definitions

For complex scalars, define custom TypeScript types:

```typescript
// In a .d.ts file
interface Money {
  amount: number
  currency: string
}

interface GeoPoint {
  latitude: number
  longitude: number
}

// Configuration
scalarTypes: {
  Money: 'Money',
  GeoPoint: 'GeoPoint',
}
```

## Using Custom Scalars in Queries

### Input Arguments

Custom scalars work in field arguments:

```typescript
const SEARCH_QUERY = b.query('SearchNearby', {
  location: 'GeoPoint!',
  radius: 'Decimal!',
  since: 'DateTime'
}, (b, v) => [
  b.searchNearby({
    location: v.location,  // GeoPoint type
    radius: v.radius,      // number type
    since: v.since         // Date type
  }, b => [
    b.id(),
    b.name(),
    b.distance(),          // Decimal -> number
  ])
])

// Variables are properly typed
type Variables = {
  location: GeoPoint
  radius: number
  since?: Date
}
```

### Field Returns

Custom scalars are typed in query results:

```typescript
const USER_PROFILE = b.query('GetUserProfile', (b) => [
  b.currentUser(b => [
    b.id(),              // UUID -> string
    b.email(),           // Email -> string  
    b.lastLoginAt(),     // DateTime -> Date
    b.settings(),        // JSON -> Record<string, unknown>
    b.location(),        // GeoPoint -> GeoPoint
  ])
])

type ProfileData = OutputOf<typeof USER_PROFILE>
// All custom scalars are properly typed
```

## Runtime Considerations

### Serialization

Remember that GraphQL scalars are serialized as JSON values:

```typescript
// DateTime scalars are typically ISO strings over the wire
const event = await client.query(EVENT_QUERY.document())

// You may need to parse them in your application
const parsedEvent = {
  ...event.data.event,
  startTime: new Date(event.data.event.startTime),
  endTime: new Date(event.data.event.endTime),
}
```

### Client-Side Transformation

Some GraphQL clients support automatic scalar transformation:

```typescript
// Apollo Client with custom scalar resolvers
const client = new ApolloClient({
  typeDefs,
  resolvers: {
    DateTime: {
      serialize: (date: Date) => date.toISOString(),
      parseValue: (value: string) => new Date(value),
    }
  }
})
```

## Validation and Type Safety

### Schema Validation

GQLB validates scalar usage against your schema:

```typescript
// ✅ Valid - scalar type matches schema
const VALID_QUERY = b.query('Valid', { date: 'DateTime!' }, (b, v) => [
  b.events({ after: v.date }, b => [
    b.title()
  ])
])

// ❌ TypeScript error - wrong scalar type
const INVALID_QUERY = b.query('Invalid', { date: 'WrongType!' }, (b, v) => [
  b.events({ after: v.date }, b => [
    b.title()
  ])
])
```

### Type Checking

Custom scalar types are enforced at compile time:

```typescript
type EventVariables = VariablesOf<typeof EVENT_QUERY>
// { location: GeoPoint, radius: number, since?: Date }

// TypeScript enforces correct types
const variables: EventVariables = {
  location: { latitude: 40.7128, longitude: -74.0060 },
  radius: 5.0,
  since: new Date('2023-01-01')
}
```

## Default Scalar Behavior

When no custom mapping is provided, GQLB defaults to `unknown`:

```typescript
// Without configuration
const QUERY = b.query('UnknownScalar', (b) => [
  b.field(b => [
    b.customField()  // unknown type
  ])
])

type Data = OutputOf<typeof QUERY>
// field.customField is typed as unknown
```

## Migration Strategy

### Gradual Migration

Add scalar types incrementally:

```typescript
// Start with basic types
scalarTypes: {
  DateTime: 'Date',
}

// Add more as needed
scalarTypes: {
  DateTime: 'Date',
  JSON: 'Record<string, unknown>',
  UUID: 'string',
}
```

### Schema Evolution

Update scalar mappings as your schema evolves:

```typescript
// Version 1
scalarTypes: {
  ID: 'string',
}

// Version 2 - support both string and number IDs
scalarTypes: {
  ID: 'string | number',
}
```

## Best Practices

### 1. Consistent Naming

Use consistent naming between GraphQL and TypeScript:

```typescript
scalarTypes: {
  DateTime: 'Date',          // Clear mapping
  UUID: 'string',            // Standard UUID as string
  EmailAddress: 'string',    // Descriptive name
}
```

### 2. Documentation

Document your scalar mappings:

```typescript
scalarTypes: {
  // ISO 8601 date-time string -> Date object
  DateTime: 'Date',
  
  // Arbitrary JSON data structure
  JSON: 'Record<string, unknown>',
  
  // RFC 4122 UUID string
  UUID: 'string',
}
```

### 3. Type Safety

Prefer specific types over generic ones:

```typescript
// ✅ Good - specific types
scalarTypes: {
  Currency: 'number',
  Percentage: 'number',
}

// ❌ Less ideal - too generic  
scalarTypes: {
  Currency: 'any',
  Percentage: 'any',
}
```

## Next Steps

- [Configuration](/guide/configuration) - Schema configuration options
- [Performance](/guide/performance) - Optimize scalar handling
- [Examples](/examples/complex-queries) - See scalars in real queries
