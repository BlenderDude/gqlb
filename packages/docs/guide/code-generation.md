# Code Generation

After configuring GQLB, you can generate TypeScript builders from your GraphQL schema. This process creates type-safe interfaces and builder functions that correspond to your schema.

## Running Code Generation

Use the GQLB CLI to generate your builders:

```bash
npx gqlb generate
```

Or if installed globally:

```bash
gqlb generate
```

## Generated Files

GQLB generates several files in your specified output directory:

```
src/generated/
├── builder.d.ts    # TypeScript builder interfaces
├── types.d.ts      # GraphQL type definitions  
└── index.ts        # Main export with builder instance
```

### `builder.d.ts`

Contains TypeScript interfaces for:
- Field builders for each GraphQL type
- Operation builders (query, mutation, subscription)
- Fragment builders
- Input object types
- Scalar types

### `types.d.ts`

Contains TypeScript type aliases for:
- GraphQL object types
- Union types
- Interface types
- Enum types
- Custom scalar types

### `index.ts`

The main entry point that exports:
- `b` - The main builder instance
- `OutputOf` - Type helper for extracting query result types
- `types` - All generated GraphQL types (if `emitTypes: true`)

## Using Generated Code

Import the builder and start creating queries:

```typescript
import { b, OutputOf } from './generated'

// Create a query
const USERS_QUERY = b.query('GetUsers', b => [
  b.users(b => [
    b.id(),
    b.name(),
    b.email()
  ])
])

// Get the GraphQL document
const document = USERS_QUERY.document()

// Extract the result type
type UsersData = OutputOf<typeof USERS_QUERY>
```

## Development Workflow

### 1. Schema-First Development

1. Update your GraphQL schema
2. Run `gqlb generate`
3. Update your queries to match the new schema
4. TypeScript will guide you through any breaking changes

### 2. Watch Mode

For development, you can set up a watch script in your `package.json`:

```json
{
  "scripts": {
    "codegen": "gqlb generate",
    "codegen:watch": "nodemon --watch schema.graphql --exec \"npm run codegen\""
  }
}
```

### 3. CI/CD Integration

Add code generation to your build process:

```json
{
  "scripts": {
    "build": "npm run codegen && tsc",
    "pretest": "npm run codegen"
  }
}
```

## Troubleshooting

### Common Issues

**"No config file found"**
- Ensure `gqlb.config.ts` exists at your project root
- Check that the file exports a default configuration

**"Cannot read schema"**
- Verify your schema path is correct
- For introspection, ensure the endpoint is accessible
- Check file permissions for SDL files

**"TypeScript errors in generated files"**
- Ensure your `tsconfig.json` includes the generated directory
- Check that you have the correct TypeScript version (4.7+)
- Verify `@gqlb/core` is installed

### Debugging

Add the `--verbose` flag for detailed output:

```bash
npx gqlb generate --verbose
```

## Performance Considerations

- **Large Schemas**: Generation time scales with schema size
- **Multiple Schemas**: Consider generating only schemas you actively use
- **CI/CD**: Cache generated files when schema hasn't changed

## Next Steps

Now that you have generated builders:

1. [Learn query building basics](/guide/query-building)
2. [Understand type safety features](/guide/type-safety)
3. [Explore variables and arguments](/guide/variables)
