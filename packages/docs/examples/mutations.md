# Mutations

Mutations in GQLB allow you to create, update, and delete data with full type safety. This page shows how to build various types of mutations.

## Basic Mutations

### Creating Data

```typescript
import { b } from './generated'

const CREATE_USER_MUTATION = b.mutation('CreateUser', {
  input: 'CreateUserInput!'
}, (b, v) => [
  b.createUser({ input: v.input }, b => [
    b.user(b => [
      b.id(),
      b.name(),
      b.email(),
      b.createdAt(),
    ]),
    b.errors(b => [
      b.field(),
      b.message(),
    ])
  ])
])
```

**Generated GraphQL:**
```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    __typename
    user {
      __typename
      id
      name
      email
      createdAt
    }
    errors {
      __typename
      field
      message
    }
  }
}
```

### Updating Data

```typescript
const UPDATE_USER_MUTATION = b.mutation('UpdateUser', {
  id: 'ID!',
  input: 'UpdateUserInput!'
}, (b, v) => [
  b.updateUser({ 
    id: v.id, 
    input: v.input 
  }, b => [
    b.user(b => [
      b.id(),
      b.name(),
      b.email(),
      b.updatedAt(),
    ]),
    b.success(),
    b.errors(b => [
      b.field(),
      b.message(),
    ])
  ])
])
```

### Deleting Data

```typescript
const DELETE_USER_MUTATION = b.mutation('DeleteUser', {
  id: 'ID!'
}, (b, v) => [
  b.deleteUser({ id: v.id }, b => [
    b.success(),
    b.deletedId(),
    b.errors(b => [
      b.message(),
    ])
  ])
])
```

## Complex Input Objects

Handle nested input objects and arrays:

```typescript
const CREATE_POST_MUTATION = b.mutation('CreatePost', {
  input: 'CreatePostInput!'
}, (b, v) => [
  b.createPost({ input: v.input }, b => [
    b.post(b => [
      b.id(),
      b.title(),
      b.content(),
      b.slug(),
      b.status(),
      b.publishedAt(),
      
      // Author information
      b.author(b => [
        b.id(),
        b.name(),
      ]),
      
      // Tags (array of objects)
      b.tags(b => [
        b.id(),
        b.name(),
        b.slug(),
      ]),
      
      // Categories
      b.categories(b => [
        b.id(),
        b.name(),
      ])
    ]),
    b.errors(b => [
      b.field(),
      b.message(),
      b.code(),
    ])
  ])
])

// Usage with complex input
const postInput = {
  title: "My New Blog Post",
  content: "This is the content of my blog post...",
  status: "DRAFT",
  tags: [
    { name: "TypeScript" },
    { name: "GraphQL" }
  ],
  categoryIds: ["cat-1", "cat-2"],
  metadata: {
    excerpt: "A brief excerpt...",
    readTime: 5,
    featuredImage: "https://example.com/image.jpg"
  }
}
```

## File Upload Mutations

Handle file uploads with proper type safety:

```typescript
const UPLOAD_AVATAR_MUTATION = b.mutation('UploadAvatar', {
  file: 'Upload!',
  userId: 'ID!'
}, (b, v) => [
  b.uploadAvatar({ 
    file: v.file, 
    userId: v.userId 
  }, b => [
    b.user(b => [
      b.id(),
      b.avatar(),
      b.updatedAt(),
    ]),
    b.uploadInfo(b => [
      b.filename(),
      b.mimetype(),
      b.size(),
      b.url(),
    ]),
    b.success(),
    b.errors(b => [
      b.field(),
      b.message(),
    ])
  ])
])

const UPLOAD_MULTIPLE_FILES = b.mutation('UploadFiles', {
  files: '[Upload!]!',
  postId: 'ID!'
}, (b, v) => [
  b.uploadFiles({ 
    files: v.files, 
    postId: v.postId 
  }, b => [
    b.post(b => [
      b.id(),
      b.attachments(b => [
        b.id(),
        b.filename(),
        b.url(),
        b.mimetype(),
        b.size(),
      ])
    ]),
    b.uploadedCount(),
    b.errors(b => [
      b.filename(),
      b.message(),
    ])
  ])
])
```

## Batch Mutations

Perform multiple operations in a single mutation:

```typescript
const BATCH_UPDATE_POSTS = b.mutation('BatchUpdatePosts', {
  updates: '[PostUpdateInput!]!'
}, (b, v) => [
  b.batchUpdatePosts({ updates: v.updates }, b => [
    b.posts(b => [
      b.id(),
      b.title(),
      b.status(),
      b.updatedAt(),
    ]),
    b.successCount(),
    b.failureCount(),
    b.errors(b => [
      b.postId(),
      b.field(),
      b.message(),
    ])
  ])
])

const BULK_DELETE_POSTS = b.mutation('BulkDeletePosts', {
  ids: '[ID!]!'
}, (b, v) => [
  b.bulkDeletePosts({ ids: v.ids }, b => [
    b.deletedIds(),
    b.deletedCount(),
    b.errors(b => [
      b.postId(),
      b.message(),
    ])
  ])
])
```

## Conditional Mutations

Use variables to conditionally execute different mutation logic:

```typescript
const FLEXIBLE_POST_MUTATION = b.mutation('FlexiblePostMutation', {
  postId: 'ID',
  createInput: 'CreatePostInput',
  updateInput: 'UpdatePostInput',
  action: 'String!'
}, (b, v) => [
  // Conditional create
  ...(b.if(v.action === 'CREATE' && v.createInput, [
    b.createPost({ input: v.createInput }, b => [
      b.post(b => [
        b.id(),
        b.title(),
        b.status(),
      ]),
      b.errors(b => [
        b.field(),
        b.message(),
      ])
    ], 'createResult')
  ])),
  
  // Conditional update
  ...(b.if(v.action === 'UPDATE' && v.postId && v.updateInput, [
    b.updatePost({ 
      id: v.postId, 
      input: v.updateInput 
    }, b => [
      b.post(b => [
        b.id(),
        b.title(),
        b.status(),
        b.updatedAt(),
      ]),
      b.errors(b => [
        b.field(),
        b.message(),
      ])
    ], 'updateResult')
  ])),
  
  // Conditional delete
  ...(b.if(v.action === 'DELETE' && v.postId, [
    b.deletePost({ id: v.postId }, b => [
      b.success(),
      b.deletedId(),
      b.errors(b => [
        b.message(),
      ])
    ], 'deleteResult')
  ]))
])
```

## Optimistic Updates

Structure mutations for optimistic UI updates:

```typescript
const LIKE_POST_MUTATION = b.mutation('LikePost', {
  postId: 'ID!'
}, (b, v) => [
  b.likePost({ postId: v.postId }, b => [
    b.post(b => [
      b.id(),
      b.likesCount(),
      b.isLikedByCurrentUser(),
    ]),
    b.success(),
    b.errors(b => [
      b.message(),
    ])
  ])
])

const FOLLOW_USER_MUTATION = b.mutation('FollowUser', {
  userId: 'ID!'
}, (b, v) => [
  b.followUser({ userId: v.userId }, b => [
    b.user(b => [
      b.id(),
      b.followersCount(),
      b.isFollowedByCurrentUser(),
    ]),
    b.currentUser(b => [
      b.id(),
      b.followingCount(),
    ]),
    b.success(),
    b.errors(b => [
      b.message(),
    ])
  ])
])
```

## Nested Object Creation

Create complex nested structures in a single mutation:

```typescript
const CREATE_BLOG_WITH_POSTS = b.mutation('CreateBlogWithPosts', {
  blogInput: 'CreateBlogInput!',
  postsInput: '[CreatePostInput!]!'
}, (b, v) => [
  b.createBlogWithPosts({ 
    blog: v.blogInput,
    posts: v.postsInput 
  }, b => [
    b.blog(b => [
      b.id(),
      b.name(),
      b.slug(),
      b.description(),
      
      // Created posts
      b.posts(b => [
        b.id(),
        b.title(),
        b.slug(),
        b.status(),
      ]),
      
      // Blog owner
      b.owner(b => [
        b.id(),
        b.name(),
      ])
    ]),
    b.createdPostsCount(),
    b.errors(b => [
      b.field(),
      b.message(),
      b.path(),
    ])
  ])
])
```

## Error Handling Patterns

Handle different types of mutation errors:

```typescript
const COMPREHENSIVE_UPDATE = b.mutation('ComprehensiveUpdate', {
  userId: 'ID!',
  profileInput: 'UpdateProfileInput!',
  settingsInput: 'UpdateSettingsInput!'
}, (b, v) => [
  b.updateUserProfile({ 
    userId: v.userId,
    profile: v.profileInput,
    settings: v.settingsInput 
  }, b => [
    // Success data
    b.user(b => [
      b.id(),
      b.name(),
      b.email(),
      b.profile(b => [
        b.bio(),
        b.website(),
        b.avatar(),
      ]),
      b.settings(b => [
        b.theme(),
        b.notifications(),
        b.privacy(),
      ])
    ]),
    
    // Operation status
    b.success(),
    b.partialSuccess(),
    
    // Different error types
    b.validationErrors(b => [
      b.field(),
      b.message(),
      b.code(),
    ]),
    
    b.businessErrors(b => [
      b.type(),
      b.message(),
      b.details(),
    ]),
    
    b.systemErrors(b => [
      b.message(),
      b.retryable(),
    ])
  ])
])

// Type extraction for error handling
type UpdateResult = OutputOf<typeof COMPREHENSIVE_UPDATE>

function handleUpdateResult(result: UpdateResult['updateUserProfile']) {
  if (result.success) {
    console.log('Update successful!')
    console.log(`Updated user: ${result.user?.name}`)
  } else if (result.partialSuccess) {
    console.log('Partial success - some updates failed')
  }
  
  if (result.validationErrors.length > 0) {
    console.log('Validation errors:')
    result.validationErrors.forEach(error => {
      console.log(`- ${error.field}: ${error.message}`)
    })
  }
  
  if (result.businessErrors.length > 0) {
    console.log('Business logic errors:')
    result.businessErrors.forEach(error => {
      console.log(`- ${error.type}: ${error.message}`)
    })
  }
}
```

## Real-time Mutations

Mutations that trigger real-time updates:

```typescript
const SEND_MESSAGE_MUTATION = b.mutation('SendMessage', {
  channelId: 'ID!',
  content: 'String!',
  attachments: '[MessageAttachmentInput!]'
}, (b, v) => [
  b.sendMessage({ 
    channelId: v.channelId,
    content: v.content,
    attachments: v.attachments 
  }, b => [
    b.message(b => [
      b.id(),
      b.content(),
      b.createdAt(),
      b.updatedAt(),
      
      // Author
      b.author(b => [
        b.id(),
        b.name(),
        b.avatar(),
      ]),
      
      // Channel
      b.channel(b => [
        b.id(),
        b.name(),
      ]),
      
      // Attachments
      b.attachments(b => [
        b.id(),
        b.type(),
        b.url(),
        b.filename(),
      ])
    ]),
    
    // Real-time notification info
    b.notificationsSent(),
    b.recipientIds(),
    
    b.success(),
    b.errors(b => [
      b.field(),
      b.message(),
    ])
  ])
])
```

## Type Extraction for Mutations

Extract and use mutation result types:

```typescript
import { OutputOf, VariablesOf } from './generated'

// Extract variable types
type CreateUserVariables = VariablesOf<typeof CREATE_USER_MUTATION>
type UpdateUserVariables = VariablesOf<typeof UPDATE_USER_MUTATION>

// Extract result types
type CreateUserResult = OutputOf<typeof CREATE_USER_MUTATION>
type UpdateUserResult = OutputOf<typeof UPDATE_USER_MUTATION>

// Use in functions
async function createUser(
  variables: CreateUserVariables
): Promise<CreateUserResult['createUser']> {
  const result = await executeOperation(CREATE_USER_MUTATION, variables)
  return result.createUser
}

function handleUserCreation(result: CreateUserResult['createUser']) {
  if (result.user) {
    console.log(`Created user: ${result.user.name} (${result.user.id})`)
  }
  
  if (result.errors.length > 0) {
    console.log('Creation errors:')
    result.errors.forEach(error => {
      console.log(`- ${error.field}: ${error.message}`)
    })
  }
}
```

## Mutation Composition

Combine multiple mutations for complex operations:

```typescript
// Individual mutations
const CREATE_POST_MUTATION = b.mutation('CreatePost', {
  input: 'CreatePostInput!'
}, (b, v) => [
  b.createPost({ input: v.input }, b => [
    b.post(b => [b.id(), b.title()]),
    b.errors(b => [b.field(), b.message()])
  ])
])

const ADD_TAGS_MUTATION = b.mutation('AddTags', {
  postId: 'ID!',
  tagIds: '[ID!]!'
}, (b, v) => [
  b.addTagsToPost({ postId: v.postId, tagIds: v.tagIds }, b => [
    b.post(b => [
      b.id(),
      b.tags(b => [b.id(), b.name()])
    ]),
    b.success()
  ])
])

const PUBLISH_POST_MUTATION = b.mutation('PublishPost', {
  postId: 'ID!'
}, (b, v) => [
  b.publishPost({ postId: v.postId }, b => [
    b.post(b => [
      b.id(),
      b.status(),
      b.publishedAt()
    ]),
    b.success()
  ])
])

// Composite operation
async function createAndPublishPost(
  postData: CreatePostInput,
  tagIds: string[]
) {
  // 1. Create the post
  const createResult = await executeOperation(CREATE_POST_MUTATION, {
    input: postData
  })
  
  if (!createResult.createPost.post) {
    throw new Error('Failed to create post')
  }
  
  const postId = createResult.createPost.post.id
  
  // 2. Add tags
  await executeOperation(ADD_TAGS_MUTATION, {
    postId,
    tagIds
  })
  
  // 3. Publish
  const publishResult = await executeOperation(PUBLISH_POST_MUTATION, {
    postId
  })
  
  return publishResult.publishPost.post
}
```

## Next Steps

- [Subscriptions](/examples/subscriptions) - Real-time data updates
- [Error Handling](/guide/error-handling) - Comprehensive error management
- [Testing Mutations](/guide/testing) - Testing strategies for mutations
- [Performance](/guide/performance) - Optimizing mutation performance
