# Subscriptions

Subscriptions in GQLB enable real-time data updates with full type safety. This page demonstrates how to build GraphQL subscriptions for live features.

## Basic Subscriptions

### Simple Event Subscription

```typescript
import { b } from './generated'

const NEW_MESSAGE_SUBSCRIPTION = b.subscription('NewMessage', {
  channelId: 'ID!'
}, (b, v) => [
  b.messageAdded({ channelId: v.channelId }, b => [
    b.id(),
    b.content(),
    b.createdAt(),
    b.author(b => [
      b.id(),
      b.name(),
      b.avatar(),
    ]),
    b.channel(b => [
      b.id(),
      b.name(),
    ])
  ])
])
```

**Generated GraphQL:**
```graphql
subscription NewMessage($channelId: ID!) {
  messageAdded(channelId: $channelId) {
    __typename
    id
    content
    createdAt
    author {
      __typename
      id
      name
      avatar
    }
    channel {
      __typename
      id
      name
    }
  }
}
```

### User Activity Subscription

```typescript
const USER_ACTIVITY_SUBSCRIPTION = b.subscription('UserActivity', {
  userId: 'ID!'
}, (b, v) => [
  b.userActivityUpdated({ userId: v.userId }, b => [
    b.user(b => [
      b.id(),
      b.name(),
      b.isOnline(),
      b.lastSeen(),
      b.currentStatus(),
    ]),
    b.activity(b => [
      b.type(),
      b.timestamp(),
      b.metadata(),
    ])
  ])
])
```

## Real-time Content Updates

### Live Comment Updates

```typescript
const LIVE_COMMENTS_SUBSCRIPTION = b.subscription('LiveComments', {
  postId: 'ID!'
}, (b, v) => [
  b.commentUpdated({ postId: v.postId }, b => [
    b.comment(b => [
      b.id(),
      b.content(),
      b.createdAt(),
      b.updatedAt(),
      b.author(b => [
        b.id(),
        b.name(),
        b.avatar(),
      ]),
      b.replies(b => [
        b.id(),
        b.content(),
        b.author(b => [
          b.name(),
        ])
      ])
    ]),
    b.action(), // "CREATED", "UPDATED", "DELETED"
    b.post(b => [
      b.id(),
      b.commentsCount(),
    ])
  ])
])
```

### Live Post Engagement

```typescript
const POST_ENGAGEMENT_SUBSCRIPTION = b.subscription('PostEngagement', {
  postId: 'ID!'
}, (b, v) => [
  b.postEngagementUpdated({ postId: v.postId }, b => [
    b.post(b => [
      b.id(),
      b.likesCount(),
      b.commentsCount(),
      b.sharesCount(),
      b.viewsCount(),
    ]),
    b.engagementType(), // "LIKE", "COMMENT", "SHARE", "VIEW"
    b.user(b => [
      b.id(),
      b.name(),
    ]),
    b.timestamp(),
  ])
])
```

## Multi-Channel Subscriptions

### Chat Room Updates

```typescript
const CHAT_ROOM_SUBSCRIPTION = b.subscription('ChatRoomUpdates', {
  roomIds: '[ID!]!'
}, (b, v) => [
  b.chatRoomUpdated({ roomIds: v.roomIds }, b => [
    b.room(b => [
      b.id(),
      b.name(),
      b.memberCount(),
      b.lastActivity(),
    ]),
    b.updateType(), // "MESSAGE", "USER_JOINED", "USER_LEFT", "ROOM_UPDATED"
    b.message(b => [
      b.id(),
      b.content(),
      b.author(b => [
        b.name(),
      ])
    ]),
    b.user(b => [
      b.id(),
      b.name(),
    ]),
    b.timestamp(),
  ])
])
```

### Notification Feed

```typescript
const NOTIFICATION_SUBSCRIPTION = b.subscription('NotificationFeed', {
  userId: 'ID!',
  types: '[NotificationType!]'
}, (b, v) => [
  b.notificationReceived({ 
    userId: v.userId,
    types: v.types 
  }, b => [
    b.notification(b => [
      b.id(),
      b.type(),
      b.title(),
      b.message(),
      b.createdAt(),
      b.read(),
      
      // Different notification data based on type
      b.data(b => [
        b.on('LikeNotificationData', b => [
          b.post(b => [
            b.id(),
            b.title(),
          ]),
          b.liker(b => [
            b.id(),
            b.name(),
          ])
        ]),
        
        b.on('CommentNotificationData', b => [
          b.post(b => [
            b.id(),
            b.title(),
          ]),
          b.comment(b => [
            b.id(),
            b.content(),
          ]),
          b.commenter(b => [
            b.id(),
            b.name(),
          ])
        ]),
        
        b.on('FollowNotificationData', b => [
          b.follower(b => [
            b.id(),
            b.name(),
            b.avatar(),
          ])
        ])
      ])
    ]),
    b.unreadCount(),
  ])
])
```

## Filtered Subscriptions

### Conditional Updates

```typescript
const FILTERED_UPDATES_SUBSCRIPTION = b.subscription('FilteredUpdates', {
  filters: 'UpdateFiltersInput!'
}, (b, v) => [
  b.filteredUpdates({ filters: v.filters }, b => [
    b.update(b => [
      b.id(),
      b.type(),
      b.timestamp(),
      b.data(),
    ]),
    b.source(b => [
      b.id(),
      b.name(),
      b.type(),
    ]),
    b.priority(),
    b.tags(),
  ])
])

// Usage with complex filters
const subscriptionVariables = {
  filters: {
    types: ["POST_UPDATED", "COMMENT_ADDED"],
    priority: "HIGH",
    sourceIds: ["user-123", "channel-456"],
    tags: ["urgent", "important"]
  }
}
```

### Geographic Updates

```typescript
const LOCATION_UPDATES_SUBSCRIPTION = b.subscription('LocationUpdates', {
  bounds: 'GeographicBoundsInput!',
  radius: 'Float'
}, (b, v) => [
  b.locationUpdated({ 
    bounds: v.bounds,
    radius: v.radius 
  }, b => [
    b.location(b => [
      b.id(),
      b.name(),
      b.coordinates(b => [
        b.latitude(),
        b.longitude(),
      ]),
      b.type(),
      b.updatedAt(),
    ]),
    b.event(b => [
      b.type(), // "ENTERED", "MOVED", "LEFT"
      b.timestamp(),
      b.metadata(),
    ]),
    b.user(b => [
      b.id(),
      b.name(),
    ])
  ])
])
```

## Subscription with Variables

### Dynamic Subscription Parameters

```typescript
const DYNAMIC_FEED_SUBSCRIPTION = b.subscription('DynamicFeed', {
  userId: 'ID!',
  interests: '[String!]',
  maxPriority: 'Int',
  includeSystem: 'Boolean!'
}, (b, v) => [
  b.feedUpdated({ 
    userId: v.userId,
    filters: {
      interests: v.interests,
      maxPriority: v.maxPriority,
      includeSystem: v.includeSystem
    }
  }, b => [
    b.feedItem(b => [
      b.id(),
      b.type(),
      b.title(),
      b.content(),
      b.priority(),
      b.timestamp(),
      
      // Conditional fields based on variables
      ...(b.if(v.includeSystem, [
        b.systemMetadata(b => [
          b.source(),
          b.version(),
          b.checksum(),
        ])
      ])),
      
      b.author(b => [
        b.id(),
        b.name(),
      ])
    ]),
    b.feedStats(b => [
      b.totalItems(),
      b.unreadCount(),
    ])
  ])
])
```

## Subscription Error Handling

### Robust Subscription with Error Recovery

```typescript
const ROBUST_SUBSCRIPTION = b.subscription('RobustUpdates', {
  connectionId: 'ID!'
}, (b, v) => [
  b.connectionUpdated({ connectionId: v.connectionId }, b => [
    // Success data
    b.data(b => [
      b.id(),
      b.payload(),
      b.timestamp(),
    ]),
    
    // Connection status
    b.status(b => [
      b.connected(),
      b.lastPing(),
      b.quality(),
    ]),
    
    // Error information
    b.errors(b => [
      b.code(),
      b.message(),
      b.retryable(),
      b.retryAfter(),
    ]),
    
    // Recovery information
    b.recovery(b => [
      b.needed(),
      b.strategy(),
      b.backoffDelay(),
    ])
  ])
])
```

## Real-time Collaboration

### Document Collaboration

```typescript
const DOCUMENT_COLLABORATION = b.subscription('DocumentCollaboration', {
  documentId: 'ID!'
}, (b, v) => [
  b.documentUpdated({ documentId: v.documentId }, b => [
    b.document(b => [
      b.id(),
      b.version(),
      b.content(),
      b.lastModified(),
    ]),
    
    b.operation(b => [
      b.type(), // "INSERT", "DELETE", "FORMAT", "CURSOR_MOVE"
      b.position(),
      b.length(),
      b.content(),
      b.attributes(),
    ]),
    
    b.author(b => [
      b.id(),
      b.name(),
      b.color(),
      b.cursor(b => [
        b.position(),
        b.selection(),
      ])
    ]),
    
    b.timestamp(),
    b.conflictResolution(b => [
      b.required(),
      b.strategy(),
      b.mergeResult(),
    ])
  ])
])
```

### Live Cursor Tracking

```typescript
const CURSOR_TRACKING_SUBSCRIPTION = b.subscription('CursorTracking', {
  documentId: 'ID!'
}, (b, v) => [
  b.cursorsUpdated({ documentId: v.documentId }, b => [
    b.cursors(b => [
      b.userId(),
      b.user(b => [
        b.id(),
        b.name(),
        b.avatar(),
        b.color(),
      ]),
      b.position(),
      b.selection(b => [
        b.start(),
        b.end(),
      ]),
      b.lastUpdate(),
    ]),
    b.document(b => [
      b.id(),
      b.activeUsers(),
    ])
  ])
])
```

## Performance-Optimized Subscriptions

### Batched Updates

```typescript
const BATCHED_UPDATES_SUBSCRIPTION = b.subscription('BatchedUpdates', {
  batchSize: 'Int!',
  intervalMs: 'Int!'
}, (b, v) => [
  b.batchedUpdates({ 
    batchSize: v.batchSize,
    interval: v.intervalMs 
  }, b => [
    b.batch(b => [
      b.id(),
      b.timestamp(),
      b.size(),
      b.updates(b => [
        b.id(),
        b.type(),
        b.data(),
        b.priority(),
      ])
    ]),
    b.stats(b => [
      b.totalUpdates(),
      b.averageLatency(),
      b.queueLength(),
    ])
  ])
])
```

### Throttled Subscription

```typescript
const THROTTLED_SUBSCRIPTION = b.subscription('ThrottledUpdates', {
  throttleMs: 'Int!',
  maxUpdatesPerSecond: 'Int!'
}, (b, v) => [
  b.throttledUpdates({ 
    throttle: v.throttleMs,
    rateLimit: v.maxUpdatesPerSecond 
  }, b => [
    b.update(b => [
      b.id(),
      b.data(),
      b.timestamp(),
    ]),
    b.throttleInfo(b => [
      b.delayed(),
      b.delayMs(),
      b.dropped(),
      b.nextAllowed(),
    ])
  ])
])
```

## Type Extraction for Subscriptions

```typescript
import { OutputOf, VariablesOf } from './generated'

// Extract subscription types
type MessageSubscriptionData = OutputOf<typeof NEW_MESSAGE_SUBSCRIPTION>
type MessageSubscriptionVariables = VariablesOf<typeof NEW_MESSAGE_SUBSCRIPTION>

// Extract nested types
type NewMessage = MessageSubscriptionData['messageAdded']
type MessageAuthor = NewMessage['author']

// Use in subscription handlers
function handleNewMessage(data: MessageSubscriptionData) {
  const message = data.messageAdded
  console.log(`New message from ${message.author.name}: ${message.content}`)
}

function subscribeToMessages(channelId: string) {
  return subscribe(NEW_MESSAGE_SUBSCRIPTION, { channelId }, handleNewMessage)
}
```

## Subscription Lifecycle Management

### Connection Management

```typescript
const CONNECTION_STATUS_SUBSCRIPTION = b.subscription('ConnectionStatus', (b) => [
  b.connectionStatusChanged(b => [
    b.status(), // "CONNECTING", "CONNECTED", "DISCONNECTED", "RECONNECTING"
    b.timestamp(),
    b.reason(),
    b.retryAttempt(),
    b.nextRetryIn(),
    b.serverInfo(b => [
      b.version(),
      b.capabilities(),
    ])
  ])
])

// Advanced subscription with lifecycle hooks
class SubscriptionManager {
  private subscriptions = new Map()
  
  async subscribe<T>(
    subscription: SubscriptionOperation<T>,
    variables: VariablesOf<typeof subscription>,
    onData: (data: T) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ) {
    const sub = await createSubscription(subscription, variables)
    
    sub.on('data', onData)
    sub.on('error', onError || this.handleError)
    sub.on('complete', onComplete || this.handleComplete)
    
    this.subscriptions.set(subscription.operationName, sub)
    return sub
  }
  
  unsubscribe(operationName: string) {
    const sub = this.subscriptions.get(operationName)
    if (sub) {
      sub.unsubscribe()
      this.subscriptions.delete(operationName)
    }
  }
  
  private handleError(error: Error) {
    console.error('Subscription error:', error)
  }
  
  private handleComplete() {
    console.log('Subscription completed')
  }
}
```

## Next Steps

- [Error Handling](/guide/error-handling) - Managing subscription errors
- [Performance](/guide/performance) - Optimizing subscription performance
- [Testing](/guide/testing) - Testing subscription implementations
- [Best Practices](/guide/best-practices) - Real-time application patterns
