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
   - Security-first approach (404 instead of 403 for unauthorized access)

3. **Performance**
   - `countOnly: true` optimizes permission checks
   - No unnecessary data fetching
   - Efficient query patterns for nested resources

### Primary Validation Layer

Middleware should be the primary validation layer for incoming requests. Controllers should trust that requests reaching them are valid:

```typescript
// CORRECT: Complete validation chain in middleware
export const validateResourceOperation = [
  // 1. Schema validation
  tryValidateBody(schema),

  // 2. Resource validation
  RequiredDbEntries.byPathId(repository, 'resource'),

  // 3. Permission validation
  RequiredDbEntries.firstMatch(
    permissions,
    (req, res) => ({
      resourceId: req.params.id,
      userId: res.locals.user.id,
    }),
    true,
  ),
];

// INCORRECT: Duplicating validation in controller
tryOperation() {
  return this.tryAction(async () => {
    // Don't validate again - middleware already did this
    if (!isValid(this.req.body)) {
      throw new Error('Invalid request');
    }
    return super.tryUpdate(this.req.body);
  });
}

// CORRECT: Trust middleware validation
tryOperation() {
  return super.tryUpdate(this.req.body);
}
```

### Why Trust Middleware?

1. **Early Validation**
   - Requests are validated before reaching controllers
   - Invalid requests are rejected early
   - Better performance and resource utilization

2. **Single Source of Truth**
   - Validation logic lives in one place
   - No redundant checks
   - Easier to maintain and update

3. **Clear Responsibility**
   - Middleware handles validation
   - Controllers handle business logic
   - Services handle data operations

### Resource Existence Check Patterns

1. **Using byPathId (Simple Cases)**
   ```typescript
   // When resource ID is directly in path params
   RequiredDbEntries.byPathId(repository, 'resource')
   ```

2. **Using firstMatch (Complex Cases)**
   ```typescript
   // When need custom query conditions
   RequiredDbEntries.firstMatch(
     repository,
     req => ({
       id: req.params.id,
       type: req.query.type,
       isActive: true,
     }),
     'resource'  // Store as 'resource' in res.locals.required
   );

   // When checking related resources
   RequiredDbEntries.firstMatch(
     items,
     req => ({
       id: req.params.itemId,
       listId: req.params.listId,  // Ensure item belongs to list
     }),
     'item'
   );

   // When need to combine multiple conditions
   RequiredDbEntries.firstMatch(
     invitations,
     req => ({
       code: req.params.code,
       expiresAt: { $gt: new Date() },
       status: 'pending',
     }),
     'invitation'
   );
   ```

### Why Use firstMatch for Existence Checks?

1. **Flexible Querying**
   - Support complex query conditions
   - Combine multiple fields
   - Use database operators

2. **Data Validation**
   - Validate relationships between resources
   - Check status and temporal conditions
   - Ensure data integrity

3. **Performance**
   - Single database query
   - No need for additional validation
   - Efficient error handling

## Nested Resource Validation Pattern

When validating access to nested resources (e.g., discussion in an item in a list), use this pattern:

```typescript
export const validateNestedAccess = [
  // 1. Validate the target resource
  RequiredDbEntries.byPathId(targetResource, 'target'),

  // 2. Validate parent resource
  RequiredDbEntries.firstMatch(
    parentResource,
    async (_, res) => {
      const target = res.locals.required.target;
      return { id: target.parentId };
    },
    'parent'
  ),

  // 3. Validate root resource access
  RequiredDbEntries.firstMatch(
    rootResource,
    async (_, res) => {
      const parent = res.locals.required.parent;
      return {
        id: parent.rootId,
        userId: res.locals.user.id,
      };
    },
    true
  ),
];
```

### Why This Pattern?

1. **Clear Resource Hierarchy**
   - Each level of validation is explicit
   - Resource relationships are clearly defined
   - Easy to follow the validation chain

2. **Efficient Data Access**
   - Uses previously loaded resources
   - Minimizes database queries
   - Maintains context between middlewares

3. **Consistent Error Handling**
   - Same error pattern at each level
   - Clear security boundaries
   - Predictable response format

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

5. **Code Organization**
   - Controllers stay focused on business logic
   - Validation rules are centralized
   - Easier to understand and modify

6. **Testing Benefits**
   - Validation logic can be tested independently
   - Controller tests can focus on business logic
   - Easier to mock validated data

## Middleware Composition Pattern

When building validation chains, follow these composition patterns:

1. **Internal Middleware Components**
   ```typescript
   // Single-purpose, reusable middleware functions
   const validateAccess = RequiredDbEntries.firstMatch(
     repository,
     (req, res) => ({
       id: req.params.id,
       userId: res.locals.user.id,
     }),
     true,
   );
   ```

2. **Exported Validation Chains**
   ```typescript
   // Compose internal components into complete validation chains
   export const validateResourceAccess = [
     RequiredDbEntries.byPathId(repository, 'resource'),
     validateAccess,
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

## Performance Optimization Patterns

1. **Query Optimization**
   ```typescript
   // Reuse query functions
   const getAccessQuery = (id: string, userId: string) => ({
     id,
     userId,
   });

   // Use countOnly for existence checks
   RequiredDbEntries.firstMatch(
     repository,
     (req, res) => getAccessQuery(req.params.id, res.locals.user.id),
     true,  // countOnly: true
   );
   ```

2. **Resource Caching**
   ```typescript
   // Store in res.locals.required for reuse
   RequiredDbEntries.byPathId(repository, 'resource');

   // Use in subsequent middleware
   RequiredDbEntries.firstMatch(
     otherRepo,
     (_, res) => {
       const resource = res.locals.required.resource;
       return { resourceId: resource.id };
     },
     true,
   );
   ```

3. **Parallel Validation**
   ```typescript
   // When multiple independent checks are needed
   ExpressUtils.tryAction(async (req, res) => {
     const [isOwner, isMember] = await Promise.all([
       repository.exists({ id, ownerId: userId }),
       memberships.exists({ id, userId }),
     ]);

     if (!isOwner && !isMember) {
       throw errors.notFound();
     }
   });
   ```

## Security-First Error Handling

1. **Resource Not Found vs Unauthorized**
   ```typescript
   // Always return 404 for unauthorized access
   if (!isAuthorized) {
     throw errors.notFound();  // Instead of errors.forbidden()
   }
   ```

2. **Information Disclosure**
   ```typescript
   // Don't reveal resource existence
   const validateAccess = RequiredDbEntries.firstMatch(
     repository,
     query,
     true,  // countOnly prevents data leakage
   );
   ```

3. **Error Response Consistency**
   - Use 401 for authentication failures
   - Use 404 for resource not found AND unauthorized access
   - Use 403 only when resource existence should be confirmed

## Best Practices

1. **Component Organization**
   - Keep base components internal
   - Export complete validation chains
   - Use consistent naming patterns

2. **Validation Chain Construction**
   - Start with request schema validation, followed by resource existence check
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

6. **Resource Validation**
   ```typescript
   // Validate by path ID
   RequiredDbEntries.byPathId(repository, 'resource')

   // Validate by custom field name
   RequiredDbEntries.byPathId(repository, 'resource', { fieldName: 'resourceId' })
   ```

7. **Permission Validation**
   ```typescript
   // Using a reusable query function
   const getPermissionQuery = (id: string, userId: string) => ({
     resourceId: id,
     userId,
     status: 'active',
   });

   RequiredDbEntries.firstMatch(
     permissions,
     (req, res) => getPermissionQuery(req.params.id, res.locals.user.id),
     true,
   );
   ```

8. **Combined Validation**
   ```typescript
   export const validateAccess = [
     // Check if resource exists
     RequiredDbEntries.byPathId(repository, 'resource'),
     
     // Check if user has permission
     RequiredDbEntries.firstMatch(
       permissions,
       (req, res) => ({
         resourceId: req.params.id,
         userId: res.locals.user.id,
         status: 'active',
       }),
       true,
     ),
   ];
   ``` 