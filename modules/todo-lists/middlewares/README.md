# Todo Lists Middleware Patterns

## Organization

The middleware is organized into two main categories:

1. **Access Control** (`access.ts`)
   - Base resource validation
   - Membership validation
   - Ownership validation
   - Nested resource access validation

2. **Invitation Management** (`invitation.ts`)
   - Invitation-specific validations
   - Invitation code validations
   - Invitation access control

## Middleware Components

### Request Pipeline Order

1. **Schema Validation**
   - Validates request body structure
   - Fast fails for invalid data
   - Lightweight operation, runs first
   - Example:
     ```typescript
     router.post('/:listId/items',
       validateRequestSchema(createItemSchema),
       auth.requireExposed,
       validateListAccess,
       controller.tryCreate()
     );
     ```

2. **Authentication** (`auth.requireExposed`)
   - Validates JWT token (resource-intensive)
   - Sets user context
   - Runs after basic request validation

3. **Access Control**
   - Validates resource access
   - Checks permissions
   - Example chains shown in sections below

### Base Components (Internal)

These are reusable, single-purpose middleware functions:

```typescript
// Resource existence check
const byListId = RequiredDbEntries.byId(lists, req => req.params.listId, true);

// Ownership validation
const validateListOwner = RequiredDbEntries.firstMatch(
  lists,
  (req, res) => ({
    id: req.params.listId,
    ownerId: res.locals.user.id,
  }),
  true,
);

// Membership validation
const getInvitationQuery = (listId: string, res: Response) => ({
  listId,
  status: 'accepted',
  inviteeId: res.locals.user.id,
});
```

### Composite Chains (Exported)

These combine base components into complete validation chains:

```typescript
// List access validation
export const validateListAccess = [
  RequiredDbEntries.byPathId(lists, 'list'),
  RequiredDbEntries.firstMatch(
    invitations,
    (req, res) => getInvitationQuery(req.params.id, res),
    true,
  ),
];

// Invitation acceptance validation
export const validateInvitationAcceptance = [
  RequiredDbEntries.byPathId(invitations, 'invitation'),
  validateInviteeAccess,
];
```

## Access Control Patterns

### Access Level Implementation

1. **Owner Access Pattern**
   - Validates list ownership using `validateListOwner`
   - Used for sensitive operations (archive, member management)
   - Returns 404 for non-owners to prevent information leakage
   - Example endpoints:
     - PATCH /:id/archive
     - POST /:listId/invitations/codes
     - GET /:listId/invitations

2. **Member Access Pattern**
   - Validates accepted invitation using `validateListAccess`
   - Used for content operations (items, discussions)
   - Returns 404 for non-members to prevent information leakage
   - Example endpoints:
     - GET /:id
     - GET /:listId/items
     - POST /:listId/items/:itemId/complete

3. **Nested Resource Access**
   - Validates parent resource access first
   - Inherits access level from parent resource
   - Maintains consistent permission model
   - Example: Discussion access requires list membership

### Error Handling Strategy

1. **Information Leakage Prevention**
   - Use 404 instead of 403 for unauthorized access
   - Consistent error messages across all endpoints
   - No distinction between non-existent and unauthorized resources
   - Example implementation:
     ```typescript
     export const validateListOwner = RequiredDbEntries.firstMatch(
       lists,
       (req, res) => ({
         id: req.params.id,
         ownerId: res.locals.user.id,
       }),
       true, // throws 404 if not found
     );
     ```

2. **Access Level Validation**
   - Clear separation between owner and member checks
   - Explicit middleware chains for each access level
   - Consistent error handling across all routes
   - Example chain:
     ```typescript
     router.patch('/:id/archive',
       auth.requireExposed,
       validateListOwner, // owner-only operation
       controller.tryArchive()
     );
     ```

## Best Practices

1. **Component Reusability**
   - Keep base components internal
   - Export complete validation chains
   - Use consistent naming patterns

2. **Validation Chain Construction**
   - Start with resource existence check
   - Add permission validations
   - Add nested resource validations if needed

3. **Query Functions**
   - Extract common query logic into functions
   - Keep queries focused and reusable
   - Use type-safe parameters

4. **Performance**
   - Use `countOnly: true` for existence checks
   - Minimize database queries
   - Chain validations efficiently

5. **Error Handling**
   - Use infrastructure error handling
   - Provide clear error messages
   - Maintain security in error responses

## Usage Examples

### Simple Resource Access

```typescript
router.get('/:id',
  auth.requireExposed,
  validateListAccess,
  controller.tryGetOne()
);
```

### Nested Resource Access

```typescript
router.get('/discussions/:id/messages',
  auth.requireExposed,
  validateDiscussionAccess,
  controller.tryGetMessages()
);
```

### Owner-Only Operations

```typescript
router.patch('/:id/archive',
  auth.requireExposed,
  validateListOwner,
  controller.tryArchive()
);
```

## Security Considerations

1. **Access Level Validation**
   - Always validate user's access level before any operation
   - Use appropriate middleware chain based on operation type
   - Ensure consistent access control across all routes

2. **Resource Ownership**
   - Validate ownership for sensitive operations
   - Use `validateListOwner` for owner-only actions
   - Prevent unauthorized modifications

3. **Nested Resources**
   - Validate access to parent resources
   - Ensure consistent permission inheritance
   - Maintain security context across resource levels 