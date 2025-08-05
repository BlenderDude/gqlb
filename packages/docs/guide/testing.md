# Testing

This guide covers comprehensive testing strategies for GQLB applications, including unit tests, integration tests, and performance testing.

## Unit Testing Queries

### Testing Query Structure

Test that your queries are structured correctly:

```typescript
import { describe, it, expect } from 'vitest'
import { b } from '../generated'

describe('User Queries', () => {
  it('should build correct GetUser query', () => {
    const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
      b.user({ id: v.id }, b => [
        b.id(),
        b.name(),
        b.email(),
      ])
    ])

    // Test the generated GraphQL document
    const document = USER_QUERY.document()
    expect(document.kind).toBe('Document')
    expect(document.definitions).toHaveLength(1)
    
    const operation = document.definitions[0]
    expect(operation.kind).toBe('OperationDefinition')
    expect(operation.operation).toBe('query')
    expect(operation.name?.value).toBe('GetUser')
  })

  it('should include correct variables', () => {
    const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
      b.user({ id: v.id }, b => [b.id(), b.name()])
    ])

    const variables = USER_QUERY.variableDefinitions()
    expect(variables).toEqual({
      id: 'ID!'
    })
  })

  it('should generate correct field selection', () => {
    const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
      b.user({ id: v.id }, b => [
        b.id(),
        b.name(),
        b.email(),
      ])
    ])

    const queryString = USER_QUERY.toString()
    expect(queryString).toContain('user(id: $id)')
    expect(queryString).toContain('id')
    expect(queryString).toContain('name')
    expect(queryString).toContain('email')
  })
})
```

### Testing Type Safety

Verify that your queries provide correct TypeScript types:

```typescript
import { OutputOf, VariablesOf } from '../generated'

describe('Query Types', () => {
  it('should provide correct output types', () => {
    const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
      b.user({ id: v.id }, b => [
        b.id(),
        b.name(),
        b.email(),
      ])
    ])

    type UserData = OutputOf<typeof USER_QUERY>
    
    // Type assertions to verify structure
    const mockData: UserData = {
      __typename: 'Query',
      user: {
        __typename: 'User',
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      }
    }

    expect(mockData.user?.id).toBe('123')
    expect(mockData.user?.name).toBe('John Doe')
  })

  it('should provide correct variable types', () => {
    const USER_QUERY = b.query('GetUser', { 
      id: 'ID!',
      includeEmail: 'Boolean!'
    }, (b, v) => [
      b.user({ id: v.id }, b => [
        b.id(),
        b.name(),
      ])
    ])

    type Variables = VariablesOf<typeof USER_QUERY>
    
    const variables: Variables = {
      id: '123',
      includeEmail: true
    }

    expect(variables.id).toBe('123')
    expect(variables.includeEmail).toBe(true)
  })
})
```

## Testing Fragments

### Fragment Reusability Tests

```typescript
describe('Fragments', () => {
  const USER_INFO_FRAGMENT = b.fragment('UserInfo', 'User', (b) => [
    b.id(),
    b.name(),
    b.avatar(),
  ])

  it('should be reusable across queries', () => {
    const QUERY_1 = b.query('GetCurrentUser', (b) => [
      b.currentUser(b => [
        ...USER_INFO_FRAGMENT,
        b.email(),
      ])
    ])

    const QUERY_2 = b.query('GetUsers', (b) => [
      b.users(b => [
        ...USER_INFO_FRAGMENT,
        b.bio(),
      ])
    ])

    // Both queries should contain the same fragment fields
    const query1String = QUERY_1.toString()
    const query2String = QUERY_2.toString()

    expect(query1String).toContain('id')
    expect(query1String).toContain('name')
    expect(query1String).toContain('avatar')

    expect(query2String).toContain('id')
    expect(query2String).toContain('name')
    expect(query2String).toContain('avatar')
  })

  it('should maintain type safety in fragments', () => {
    type FragmentData = SelectionSetOutput<typeof USER_INFO_FRAGMENT>
    
    const mockFragment: FragmentData = {
      __typename: 'User',
      id: '123',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg'
    }

    expect(mockFragment.id).toBe('123')
    expect(mockFragment.name).toBe('John Doe')
  })
})
```

## Integration Testing

### Testing with Mock GraphQL Server

Set up a mock GraphQL server for integration tests:

```typescript
import { graphql, buildSchema } from 'graphql'
import { describe, it, expect, beforeAll } from 'vitest'

const schema = buildSchema(`
  type Query {
    user(id: ID!): User
    posts: [Post!]!
  }
  
  type User {
    id: ID!
    name: String!
    email: String
    posts: [Post!]!
  }
  
  type Post {
    id: ID!
    title: String!
    author: User!
  }
`)

const mockData = {
  users: [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
  ],
  posts: [
    { id: '1', title: 'Hello World', authorId: '1' },
    { id: '2', title: 'GraphQL Basics', authorId: '2' }
  ]
}

const rootValue = {
  user: ({ id }) => mockData.users.find(u => u.id === id),
  posts: () => mockData.posts.map(post => ({
    ...post,
    author: mockData.users.find(u => u.id === post.authorId)
  }))
}

describe('Query Integration Tests', () => {
  it('should execute user query successfully', async () => {
    const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
      b.user({ id: v.id }, b => [
        b.id(),
        b.name(),
        b.email(),
      ])
    ])

    const result = await graphql({
      schema,
      source: USER_QUERY.toString(),
      variableValues: { id: '1' },
      rootValue
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.user).toEqual({
      __typename: 'User',
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    })
  })

  it('should handle nested queries', async () => {
    const POSTS_WITH_AUTHORS = b.query('GetPostsWithAuthors', (b) => [
      b.posts(b => [
        b.id(),
        b.title(),
        b.author(b => [
          b.id(),
          b.name(),
        ])
      ])
    ])

    const result = await graphql({
      schema,
      source: POSTS_WITH_AUTHORS.toString(),
      rootValue
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.posts).toHaveLength(2)
    expect(result.data?.posts[0].author.name).toBe('John Doe')
  })
})
```

### Testing with Real GraphQL Client

Test with actual GraphQL client integration:

```typescript
import { ApolloClient, InMemoryCache } from '@apollo/client'
import { SchemaLink } from '@apollo/client/link/schema'

describe('Client Integration Tests', () => {
  let client: ApolloClient<any>

  beforeAll(() => {
    client = new ApolloClient({
      link: new SchemaLink({ schema, rootValue }),
      cache: new InMemoryCache()
    })
  })

  it('should work with Apollo Client', async () => {
    const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
      b.user({ id: v.id }, b => [
        b.id(),
        b.name(),
        b.email(),
      ])
    ])

    const result = await client.query({
      query: USER_QUERY.document(),
      variables: { id: '1' }
    })

    expect(result.data.user.name).toBe('John Doe')
    expect(result.loading).toBe(false)
    expect(result.error).toBeUndefined()
  })
})
```

## Testing Mutations

### Mutation Testing

```typescript
describe('Mutation Tests', () => {
  it('should build create user mutation correctly', () => {
    const CREATE_USER = b.mutation('CreateUser', {
      input: 'CreateUserInput!'
    }, (b, v) => [
      b.createUser({ input: v.input }, b => [
        b.user(b => [
          b.id(),
          b.name(),
          b.email(),
        ]),
        b.errors(b => [
          b.field(),
          b.message(),
        ])
      ])
    ])

    const mutationString = CREATE_USER.toString()
    expect(mutationString).toContain('mutation CreateUser')
    expect(mutationString).toContain('createUser(input: $input)')
    expect(mutationString).toContain('errors')
  })

  it('should handle mutation errors correctly', async () => {
    const mockResolver = {
      createUser: ({ input }) => ({
        user: null,
        errors: [
          { field: 'email', message: 'Email already exists' }
        ]
      })
    }

    const CREATE_USER = b.mutation('CreateUser', {
      input: 'CreateUserInput!'
    }, (b, v) => [
      b.createUser({ input: v.input }, b => [
        b.user(b => [b.id(), b.name()]),
        b.errors(b => [b.field(), b.message()])
      ])
    ])

    const result = await graphql({
      schema,
      source: CREATE_USER.toString(),
      variableValues: { 
        input: { name: 'Test', email: 'existing@example.com' }
      },
      rootValue: mockResolver
    })

    expect(result.data?.createUser.user).toBeNull()
    expect(result.data?.createUser.errors).toHaveLength(1)
    expect(result.data?.createUser.errors[0].field).toBe('email')
  })
})
```

## Testing Subscriptions

### Subscription Testing

```typescript
import { subscribe } from 'graphql'

describe('Subscription Tests', () => {
  it('should build subscription correctly', () => {
    const MESSAGE_SUBSCRIPTION = b.subscription('NewMessage', {
      channelId: 'ID!'
    }, (b, v) => [
      b.messageAdded({ channelId: v.channelId }, b => [
        b.id(),
        b.content(),
        b.author(b => [
          b.name(),
        ])
      ])
    ])

    const subscriptionString = MESSAGE_SUBSCRIPTION.toString()
    expect(subscriptionString).toContain('subscription NewMessage')
    expect(subscriptionString).toContain('messageAdded(channelId: $channelId)')
  })

  it('should handle subscription events', async () => {
    const MESSAGE_SUBSCRIPTION = b.subscription('NewMessage', {
      channelId: 'ID!'
    }, (b, v) => [
      b.messageAdded({ channelId: v.channelId }, b => [
        b.id(),
        b.content(),
      ])
    ])

    const mockSubscription = {
      messageAdded: async function* ({ channelId }) {
        yield { messageAdded: { id: '1', content: 'Hello' } }
        yield { messageAdded: { id: '2', content: 'World' } }
      }
    }

    const subscription = await subscribe({
      schema,
      document: MESSAGE_SUBSCRIPTION.document(),
      variableValues: { channelId: 'channel-1' },
      rootValue: mockSubscription
    })

    const messages = []
    for await (const result of subscription) {
      messages.push(result.data?.messageAdded)
      if (messages.length >= 2) break
    }

    expect(messages).toHaveLength(2)
    expect(messages[0].content).toBe('Hello')
    expect(messages[1].content).toBe('World')
  })
})
```

## Performance Testing

### Query Complexity Testing

```typescript
describe('Performance Tests', () => {
  it('should not exceed complexity limits', () => {
    const COMPLEX_QUERY = b.query('ComplexQuery', (b) => [
      b.posts(b => [
        b.id(),
        b.comments(b => [
          b.id(),
          b.author(b => [
            b.id(),
            b.posts(b => [  // This creates high complexity
              b.id(),
            ])
          ])
        ])
      ])
    ])

    // Calculate query complexity (simplified)
    const queryString = COMPLEX_QUERY.toString()
    const nestingLevel = (queryString.match(/{/g) || []).length
    
    expect(nestingLevel).toBeLessThan(6) // Complexity limit
  })

  it('should execute within time limits', async () => {
    const TIMED_QUERY = b.query('TimedQuery', (b) => [
      b.posts(b => [
        b.id(),
        b.title(),
        b.author(b => [
          b.name(),
        ])
      ])
    ])

    const startTime = performance.now()
    
    await graphql({
      schema,
      source: TIMED_QUERY.toString(),
      rootValue
    })
    
    const duration = performance.now() - startTime
    expect(duration).toBeLessThan(100) // 100ms limit
  })
})
```

### Load Testing

```typescript
describe('Load Tests', () => {
  it('should handle concurrent requests', async () => {
    const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
      b.user({ id: v.id }, b => [
        b.id(),
        b.name(),
      ])
    ])

    const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
      graphql({
        schema,
        source: USER_QUERY.toString(),
        variableValues: { id: String(i % 2 + 1) },
        rootValue
      })
    )

    const results = await Promise.all(concurrentRequests)
    
    results.forEach(result => {
      expect(result.errors).toBeUndefined()
      expect(result.data?.user).toBeDefined()
    })
  })

  it('should handle large datasets', async () => {
    // Create large mock dataset
    const largeMockData = {
      posts: Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        title: `Post ${i}`,
        authorId: String(i % 10)
      }))
    }

    const LARGE_QUERY = b.query('GetManyPosts', (b) => [
      b.posts({ first: 100 }, b => [
        b.id(),
        b.title(),
      ])
    ])

    const startTime = performance.now()
    
    const result = await graphql({
      schema,
      source: LARGE_QUERY.toString(),
      rootValue: {
        posts: () => largeMockData.posts.slice(0, 100)
      }
    })
    
    const duration = performance.now() - startTime
    
    expect(result.data?.posts).toHaveLength(100)
    expect(duration).toBeLessThan(500) // Should handle large data efficiently
  })
})
```

## Test Utilities

### Custom Test Helpers

```typescript
// test-utils.ts
export class QueryTester {
  static validateQuery(query: any) {
    const document = query.document()
    expect(document.kind).toBe('Document')
    expect(document.definitions).toHaveLength(1)
    return document
  }

  static async executeQuery(query: any, variables = {}) {
    return await graphql({
      schema,
      source: query.toString(),
      variableValues: variables,
      rootValue
    })
  }

  static expectValidResult(result: any) {
    expect(result.errors).toBeUndefined()
    expect(result.data).toBeDefined()
    return result.data
  }

  static expectErrorResult(result: any, expectedErrorCount = 1) {
    expect(result.errors).toHaveLength(expectedErrorCount)
    return result.errors
  }
}

// Usage in tests
describe('Query Tests with Utilities', () => {
  it('should validate and execute query', async () => {
    const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
      b.user({ id: v.id }, b => [b.id(), b.name()])
    ])

    QueryTester.validateQuery(USER_QUERY)
    
    const result = await QueryTester.executeQuery(USER_QUERY, { id: '1' })
    const data = QueryTester.expectValidResult(result)
    
    expect(data.user.name).toBe('John Doe')
  })
})
```

### Mock Data Factories

```typescript
// mock-factories.ts
export class MockDataFactory {
  static createUser(overrides = {}) {
    return {
      __typename: 'User',
      id: Math.random().toString(),
      name: 'Test User',
      email: 'test@example.com',
      ...overrides
    }
  }

  static createPost(authorId?: string, overrides = {}) {
    return {
      __typename: 'Post',
      id: Math.random().toString(),
      title: 'Test Post',
      content: 'Test content',
      authorId: authorId || '1',
      ...overrides
    }
  }

  static createQueryResponse<T>(data: T, errors?: any[]) {
    return {
      data,
      errors,
      loading: false,
      networkStatus: 7
    }
  }
}

// Usage
const mockUser = MockDataFactory.createUser({ name: 'John Doe' })
const mockResponse = MockDataFactory.createQueryResponse({ user: mockUser })
```

## Test Configuration

### Jest/Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/generated/**'
      ]
    }
  }
})

// test-setup.ts
import { expect } from 'vitest'

// Custom matchers
expect.extend({
  toBeValidGraphQLQuery(received) {
    const isValid = received && 
                   received.document && 
                   typeof received.toString === 'function'
    
    return {
      pass: isValid,
      message: () => `Expected ${received} to be a valid GraphQL query`
    }
  }
})
```

## Continuous Testing

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      
      - run: pnpm run generate  # Generate GQLB types
      
      - run: pnpm run test      # Run tests
      
      - run: pnpm run test:coverage
      
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

## Next Steps

- [Error Handling](/guide/error-handling) - Testing error scenarios
- [Performance](/guide/performance) - Performance testing strategies  
- [Best Practices](/guide/best-practices) - Testing best practices
- [Type Safety](/guide/type-safety) - Type-safe testing patterns
