# Configuration

GQLB uses a configuration file to define how to generate TypeScript builders from your GraphQL schemas. The configuration file should be named `gqlb.config.ts` and placed at the root of your project.

## Basic Configuration

Create a `gqlb.config.ts` file:

```typescript
import { GQLBConfig } from '@gqlb/cli'

export default {
  generate: {
    schema: {
      sdl: 'schema.graphql'
    },
    output: 'src/generated'
  }
} satisfies GQLBConfig
```

## Configuration Options

### Schema Sources

GQLB supports multiple ways to provide your GraphQL schema:

#### SDL File

```typescript
export default {
  generate: {
    schema: {
      sdl: 'path/to/schema.graphql'
    },
    output: 'src/generated'
  }
}
```

#### Introspection Endpoint

```typescript
export default {
  generate: {
    schema: {
      introspect: 'http://localhost:4000/graphql'
    },
    output: 'src/generated'
  }
}
```

#### Programmatic Schema

```typescript
import { buildSchema } from 'graphql'

const schema = buildSchema(`
  type Query {
    hello: String
  }
`)

export default {
  generate: {
    schema: schema,
    output: 'src/generated'
  }
}
```

### Multiple Schemas

You can generate builders for multiple schemas:

```typescript
export default {
  generate: [
    {
      name: 'api',
      schema: { sdl: 'schemas/api.graphql' },
      output: 'src/generated/api'
    },
    {
      name: 'admin',
      schema: { sdl: 'schemas/admin.graphql' },
      output: 'src/generated/admin'
    }
  ]
}
```

### Custom Scalar Types

Define TypeScript types for custom GraphQL scalars:

```typescript
export default {
  generate: {
    schema: { sdl: 'schema.graphql' },
    output: 'src/generated',
    scalarTypes: {
      DateTime: 'Date',
      JSON: 'Record<string, unknown>',
      UUID: 'string'
    }
  }
}
```

### Additional Options

```typescript
export default {
  generate: {
    schema: { sdl: 'schema.graphql' },
    output: 'src/generated',
    
    // Include possible types for unions/interfaces (default: false)
    possibleTypes: true,
    
    // Emit TypeScript type definitions (default: true)
    emitTypes: true,
    
    // Custom scalar type mappings
    scalarTypes: {
      DateTime: 'Date'
    }
  },
  
  // Convert command options
  convert: {
    // Format comments in converted queries (default: true)
    formatComment: true
  }
}
```

## Environment Variables

You can use environment variables in your configuration:

```typescript
export default {
  generate: {
    schema: {
      introspect: process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'
    },
    output: 'src/generated'
  }
}
```

## TypeScript Configuration

Ensure your `tsconfig.json` includes the generated files:

```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*",
    "src/generated/**/*"
  ]
}
```

## Next Steps

With your configuration ready:

1. [Generate your first builder](/guide/code-generation)
2. [Start building queries](/guide/query-building)
3. [Learn about type safety](/guide/type-safety)
