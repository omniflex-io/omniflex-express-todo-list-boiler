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

1. **List Access**
   - Validate list existence
   - Check user membership or ownership
   - Used in: GET /:id, GET /:listId/items

2. **Item Access**
   - Validate list existence
   - Check user membership in parent list
   - Used in: GET /:listId/items/:itemId, POST /:listId/items

3. **Discussion Access**
   - Validate discussion existence
   - Validate parent item existence
   - Check user membership in parent list
   - Used in: GET /discussions/:id/messages

4. **Invitation Access**
   - Owner: Full access to list invitations
   - Inviter/Invitee: Access to specific invitations
   - Members: No access to other members' invitations
   - Used in: GET /:listId/invitations, GET /invitations/:id

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