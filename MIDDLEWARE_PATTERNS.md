# Middleware Patterns

## Access Validation Pattern

When validating access to resources that require checking both the resource existence and user permissions, use the following pattern:

```typescript
import { RequiredDbEntries } from '@omniflex/infra-express';

// 1. First middleware: Fetch the resource
RequiredDbEntries.byPathId(repository, 'resourceName')

// 2. Second middleware: Validate permissions
RequiredDbEntries.firstMatch(
  permissionsRepository,
  (req, res) => ({ /* permission query */ }),
  true  // countOnly: true means we only check existence
)
```

### Why This Pattern?

1. **Separation of Concerns**
   - Resource existence check is separate from permission check
   - Each middleware has a single responsibility
   - Easier to maintain and test

2. **Standardized Error Handling**
   - Uses the infrastructure's built-in error handling
   - Consistent error responses across the application

3. **Performance**
   - `countOnly: true` optimizes permission checks
   - No unnecessary data fetching

## Implementation Patterns

### Resource Validation

```typescript
// Validate by path ID
RequiredDbEntries.byPathId(lists, 'list')

// Validate by custom field name
RequiredDbEntries.byPathId(lists, 'list', { fieldName: 'listId' })

// Validate by body ID
RequiredDbEntries.byBodyId(users, 'user')
```

### Permission Validation

```typescript
// Using a reusable query function
const getInvitationQuery = (listId: string, res: Response) => ({
  listId,
  inviteeId: res.locals.user.id,
  status: 'accepted',
});

RequiredDbEntries.firstMatch(
  invitations,
  (req, res) => getInvitationQuery(req.params.id, res),
  true,
)
```

### Combined Validation

```typescript
export const validateListAccess = [
  // Check if list exists
  RequiredDbEntries.byPathId(lists, 'list'),
  
  // Check if user has permission
  RequiredDbEntries.firstMatch(
    invitations,
    (req, res) => ({
      listId: req.params.id,
      inviteeId: res.locals.user.id,
      status: 'accepted',
    }),
    true,
  ),
];
```

### Nested Resource Validation

```typescript
// For resources that require validating a chain of parent resources
export const validateDiscussionAccess = [
  // 1. Get the discussion
  RequiredDbEntries.byPathId(discussions, 'discussion'),

  // 2. Get the parent item
  RequiredDbEntries.firstMatch(
    items,
    async (req, res) => {
      const discussion = res.locals.required.discussion;
      return { id: discussion.itemId };
    },
    'item'
  ),

  // 3. Validate list access
  RequiredDbEntries.firstMatch(
    invitations,
    async (req, res) => {
      const item = res.locals.required.item;
      return getInvitationQuery(item.listId, res);
    },
    true
  ),
];
```

## Best Practices

1. Always use array of middlewares for complex validations
2. Use `countOnly: true` for permission checks when you don't need the data
3. Keep permission query logic in reusable functions
4. Use consistent naming for stored entities in `res.locals.required`
5. Break down complex validations into smaller, focused middleware functions
6. Leverage the infrastructure's error handling mechanisms
7. For nested resources, validate the entire chain of parent resources
8. Store intermediate results in res.locals.required for reuse 