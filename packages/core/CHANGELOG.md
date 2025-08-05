# @gqlb/core

## 0.2.0

### Minor Changes

- 0cdc280: ## 📚 Comprehensive Documentation Update

  This release introduces a complete documentation overhaul for GQLB, providing extensive guides, examples, and best practices to help developers build type-safe GraphQL queries effectively.

  ### 🚀 New Documentation Features

  #### **Complete User Guides**

  - **Getting Started**: Introduction to GQLB concepts and benefits
  - **Installation**: Step-by-step setup instructions for all package managers
  - **Configuration**: Comprehensive schema configuration options
  - **Code Generation**: Detailed guide for generating TypeScript builders
  - **Query Building**: Complete query construction patterns
  - **Type Safety**: In-depth type safety features and usage
  - **Variables**: Full variable handling and type validation
  - **Fragments**: Reusable query fragments with type safety
  - **Inline Fragments**: Union and interface type handling
  - **Custom Scalars**: Custom scalar type mapping and configuration
  - **Error Handling**: Robust error management strategies
  - **Performance**: Query optimization and best practices
  - **Testing**: Comprehensive testing strategies for GQLB applications
  - **Best Practices**: Production-ready patterns and conventions

  #### **Rich Examples Collection**

  - **Basic Queries**: Fundamental query patterns
  - **Complex Queries**: Advanced query structures
  - **Mutations**: Complete mutation examples
  - **Subscriptions**: Real-time subscription patterns

  #### **Developer Experience Improvements**

  - **API Documentation**: Complete builder and overview documentation
  - **Code Examples**: Over 200 TypeScript code examples
  - **Best Practices**: Production patterns and optimization strategies
  - **Error Scenarios**: Comprehensive error handling examples
  - **Performance Tips**: Query optimization guidelines

  ### 🛠️ Infrastructure Enhancements

  #### **Documentation Platform**

  - **VitePress Integration**: Modern documentation framework with excellent DX
  - **Cloudflare Pages Deployment**: Fast, global documentation hosting
  - **Single Page Application**: Seamless navigation and user experience
  - **TypeScript Examples**: All examples are fully typed and validated

  #### **Build System**

  - **Automated Builds**: Documentation builds automatically on changes
  - **Asset Optimization**: Optimized assets for fast loading
  - **Not Found Handling**: Proper SPA routing for all documentation pages

  ### 📖 Content Highlights

  #### **Type Safety Focus**

  - Complete type extraction examples with `OutputOf` and `VariablesOf`
  - Nullability handling and type narrowing patterns
  - IntelliSense and autocompletion demonstrations
  - Custom scalar type mapping examples

  #### **Real-World Patterns**

  - Production-ready query structures
  - Error handling and recovery strategies
  - Performance optimization techniques
  - Testing methodologies and examples

  #### **Framework Integration**

  - Apollo Client integration examples
  - React hooks and error boundaries
  - Subscription management patterns
  - Cache optimization strategies

  ### 🎯 Target Audiences

  This documentation update serves:

  - **New Users**: Comprehensive onboarding from installation to advanced usage
  - **Existing Users**: Advanced patterns and optimization techniques
  - **Enterprise Teams**: Best practices and production deployment strategies
  - **Contributors**: Development setup and testing guidelines

  ### 📝 Documentation Structure

  The new documentation follows a logical progression:

  1. **Introduction** → Core concepts and benefits
  2. **Setup** → Installation and configuration
  3. **Building** → Query construction and type safety
  4. **Advanced** → Fragments, performance, and error handling
  5. **Examples** → Real-world usage patterns
  6. **Best Practices** → Production-ready patterns

  This comprehensive documentation update significantly improves the developer experience for GQLB users, providing clear guidance for everything from basic usage to advanced production patterns.

## 0.1.0

## 0.0.8

### Patch Changes

- 6874041: Fixed bug with deeply nested array intersection

## 0.0.7

### Patch Changes

- 1cd50fb: Fixed intersection issue for output types

## 0.0.6

### Patch Changes

- ce41291: Remove FragmentRef<F> in favor of FragmentData<F>.
  Added enumValue() function to create static enums.
  Selections now evaluated lazily upon first `.document()` call.

## 0.0.5

### Patch Changes

- c534d6c: Optional fragment masking

## 0.0.4

## 0.0.3

### Patch Changes

- 1217c39: Accept a GraphQL schema in config
