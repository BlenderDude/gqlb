# Installation

## Prerequisites

- Node.js 16+ or 18+
- TypeScript 4.7+
- A GraphQL schema (SDL file, introspection endpoint, or programmatic schema)

## Package Installation

Install GQLB using your preferred package manager:

::: code-group

```bash [npm]
npm install @gqlb/cli @gqlb/core
```

```bash [yarn]
yarn add @gqlb/cli @gqlb/core
```

```bash [pnpm]
pnpm add @gqlb/cli @gqlb/core
```

:::

## Package Overview

### `@gqlb/cli`

The CLI package provides the code generation command and configuration utilities:

- `gqlb generate` - Generate TypeScript builders from schemas
- `gqlb convert` - Convert existing GraphQL documents to GQLB queries
- Configuration file support (`gqlb.config.ts`)

### `@gqlb/core`

The core package provides runtime utilities and type definitions:

- Runtime builder functions
- TypeScript type helpers
- Fragment and operation definitions
- Output type utilities (`OutputOf`, `SelectionSetOutput`)

## Development Setup

For development dependencies, you may also want to install:

```bash
npm install --save-dev @types/node typescript
```

## Global Installation (Optional)

You can install the CLI globally for convenience:

```bash
npm install -g @gqlb/cli
```

This allows you to run `gqlb` commands from anywhere without `npx`.

## Verification

Verify your installation by running:

```bash
npx gqlb --help
```

You should see the available commands:

```
Usage: gqlb <generate|convert>

Commands:
  generate  Generate TypeScript types from GraphQL schema
  convert   Convert existing GraphQL documents to GQLB format
```

## Next Steps

Now that GQLB is installed, you can:

1. [Set up your configuration file](/guide/configuration)
2. [Generate your first builder](/guide/code-generation)
3. [Start writing type-safe queries](/guide/query-building)
