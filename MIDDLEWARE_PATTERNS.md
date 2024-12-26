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

## Middleware Composition Pattern

When building validation chains, follow these composition patterns:

1. **Internal Middleware Components**
   ```typescript
   // Single-purpose, reusable middleware functions
   const validateInviteeAccess = RequiredDbEntries.firstMatch(
     invitations,
     (req, res) => ({
       id: req.params.id,
       inviteeId: res.locals.user.id,
     }),
     true,
   );

   const validateListOwnership = RequiredDbEntries.firstMatch(
     lists,
     (req, res) => ({
       id: req.params.listId,
       ownerId: res.locals.user.id,
     }),
     true,
   );
   ```

2. **Exported Validation Chains**
   ```typescript
   // Compose internal components into complete validation chains
   export const validateInvitationAcceptance = [
     RequiredDbEntries.byPathId(invitations, 'invitation'),
     validateInviteeAccess,
   ];

   export const validateListAccess = [
     RequiredDbEntries.byPathId(lists, 'list'),
     validateListOwnership,
   ];
   ```

### Why This Pattern?

1. **Component Reusability**
   - Internal middleware components are single functions
   - Can be composed into multiple validation chains
   - Easier to maintain and update

2. **Clear Intent**
   - Exported arrays clearly represent validation chains
   - Internal functions clearly represent reusable components
   - Makes the code more self-documenting

3. **Type Safety**
   - Single middleware functions are easier to type
   - Avoids nested array type issues
   - Better TypeScript integration

## Validation Middleware Pattern

When implementing validation logic, prefer middleware over controller methods:

1. **Move Validation Logic to Middleware**
   ```typescript
   // INCORRECT: Validation in controller
   tryAcceptInvitation() {
     return this.tryAction(async () => {
       const invitation = await invitations.findOne({ id });
       if (!invitation) throw errors.notFound();
       if (invitation.inviteeId !== this.user.id) throw errors.forbidden();
       return super.tryUpdate({ status: 'accepted' });
     });
   }

   // CORRECT: Validation in middleware
   const validateInvitationAcceptance = [
     RequiredDbEntries.byPathId(invitations, 'invitation'),
     validateInviteeAccess,
   ];

   // Simple controller method
   tryAcceptInvitation() {
     return super.tryUpdate({ status: 'accepted' });
   }
   ```

2. **Reusable Validation Logic**
   ```typescript
   // Shared validation logic
   const validateInviteeAccess = RequiredDbEntries.firstMatch(
     invitations,
     (req, res) => ({
       id: req.params.id,
       inviteeId: res.locals.user.id,
     }),
     true,
   );

   // Reuse in multiple validations
   export const validateInvitationAcceptance = [
     RequiredDbEntries.byPathId(invitations, 'invitation'),
     validateInviteeAccess,
   ];

   export const validateInvitationRejection = [
     RequiredDbEntries.byPathId(invitations, 'invitation'),
     validateInviteeAccess,
   ];
   ```

3. **Complex Validation Chains**
   ```typescript
   // Internal component for list ownership check
   const validateListOwnership = RequiredDbEntries.firstMatch(
     lists,
     async (req, res) => {
       const invitation = res.locals.required.invitation;
       return {
         id: invitation.listId,
         ownerId: res.locals.user.id,
       };
     },
     true,
   );

   // Exported validation chain
   export const validateInvitationApproval = [
     RequiredDbEntries.byPathId(invitations, 'invitation'),
     validateListOwnership,
   ];
   ```

### Why Use Validation Middleware?

1. **Separation of Concerns**
   - Validation logic is separate from business logic
   - Controllers remain focused on their core responsibilities
   - Easier to test and maintain

2. **Reusability**
   - Validation logic can be shared across routes
   - Common patterns can be abstracted into reusable functions
   - Reduces code duplication

3. **Early Validation**
   - Validation happens before reaching the controller
   - Failed requests are rejected early
   - Improves performance and reduces server load

4. **Consistent Error Handling**
   - Uses the infrastructure's built-in error handling
   - Standard error responses across the application
   - Better user experience

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

1. Always use array of middlewares for exported validation chains
2. Keep internal middleware components as single functions
3. Use `countOnly: true` for permission checks when you don't need the data
4. Keep permission query logic in reusable functions
5. Use consistent naming for stored entities in `res.locals.required`
6. Break down complex validations into smaller, focused middleware functions
7. Leverage the infrastructure's error handling mechanisms
8. For nested resources, validate the entire chain of parent resources
9. Store intermediate results in res.locals.required for reuse
10. Move validation logic from controllers to middleware
11. Keep controllers focused on business logic
12. Make validation middleware reusable when possible
13. Use early validation to improve performance
14. Name internal components with clear, action-based names (e.g., validateInviteeAccess)
15. Name exported chains with clear, feature-based names (e.g., validateInvitationAcceptance) 