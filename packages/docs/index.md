---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "GQLB"
  text: "TypeScript-First GraphQL Query Builder"
  tagline: "Build type-safe GraphQL queries with full IntelliSense support and zero runtime overhead"
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View Examples
      link: /examples/basic-queries
    - theme: alt
      text: GitHub
      link: https://github.com/BlenderDude/gqlb

features:
  - title: 🛡️ Full Type Safety
    details: Every query, mutation, and subscription is fully typed with TypeScript, ensuring compile-time safety and excellent developer experience.
  - title: ⚡ Zero Runtime Cost
    details: GQLB generates pure TypeScript interfaces with no runtime overhead. Your queries compile to standard GraphQL documents.
  - title: 🎯 Schema-First
    details: Generate type-safe builders directly from your GraphQL schema. Supports introspection, SDL files, and programmatic schemas.
  - title: 🧩 Fragment Support
    details: Create reusable fragments with full type checking. Both inline fragments and defined fragments are supported with proper typing.
  - title: 🔄 Variables & Arguments
    details: Type-safe variable definitions and field arguments. The compiler ensures your variables match your schema requirements.
  - title: 📝 IntelliSense Ready
    details: Rich autocompletion, hover documentation, and error highlighting. See field descriptions and deprecation warnings inline.
---

## Quick Example

```typescript
import { b } from './generated'

// Fully typed query with variables
const USER_QUERY = b.query('GetUser', { id: 'ID!' }, (b, v) => [
  b.user({ id: v.id }, b => [
    b.id(),
    b.name(),
    b.email(),
    b.posts(b => [
      b.id(),
      b.title(),
      b.publishedAt(),
    ])
  ])
])

// Type-safe output
type UserData = OutputOf<typeof USER_QUERY>
// Result:
// {
//   readonly user: {
//     readonly id: string
//     readonly name: string | null
//     readonly email: string
//     readonly posts: readonly {
//       readonly id: string
//       readonly title: string
//       readonly publishedAt: string | null
//     }[]
//   } | null
// }
```

