# Controller Patterns

## Response Methods

The base controller provides several methods for sending responses:

1. `respondOne(data: any)`: Sends a single entity response
   ```typescript
   this.respondOne(entity);
   // Response: { data: entity }
   ```

2. `respondMany(data: any[], total?: number)`: Sends a collection response
   ```typescript
   this.respondMany(entities);
   // Response: { data: entities, total: entities.length }
   ```

3. `respondRequired(key: string)`: Sends an entity from res.locals.required
   ```typescript
   this.respondRequired('resource');
   // Response: { data: res.locals.required.resource }
   ```
   This is particularly useful when working with RequiredDbEntries middleware
   which stores fetched entities in res.locals.required.

## Repository Operations Pattern

When performing repository operations, always use the base controller methods instead of directly calling repository methods:

1. **Create Operations**
   ```typescript
   // INCORRECT: Direct repository call
   return repository.create(data);

   // CORRECT: Use base controller method
   return super.tryCreate(data);
   ```

2. **List Operations**
   ```typescript
   // INCORRECT: Direct repository call
   return repository.find(query);

   // CORRECT: Use base controller method
   return super.tryListPaginated(query);
   ```

3. **Update Operations**
   ```typescript
   // INCORRECT: Direct repository call
   return repository.update(id, data);

   // CORRECT: Use base controller method
   return super.tryUpdate(data);
   ```

### Why This Pattern?

1. **Consistent Response Format**
   - All responses follow the same structure
   - Error handling is standardized
   - Pagination is handled automatically

2. **Audit Trail**
   - Operations are logged consistently
   - Changes are tracked uniformly
   - User context is maintained

3. **Event Emission**
   - Events are emitted automatically
   - Subscribers are notified consistently
   - Integration points are maintained

## Post-Operation Patterns

The base controller methods internally call `respondOne` to send the response directly.
Any code after `super.tryCreate()` won't execute as the response has already been sent.
To perform additional operations after creation or update, use the following patterns:

### Post-Creation Operations

When additional operations are needed after creating an entity:

```typescript
tryCreate() {
  return super.tryCreate(
    {
      ownerId: this.user.id,
      status: 'active',
    },
    {
      respondOne: async (entity) => {
        // Perform additional operations
        await this.performAdditionalTasks(entity);

        // Send the response
        this.respondOne(entity);
      },
    },
  );
}
```

### Post-Update Operations

The post-update operations pattern should ONLY be used when you need to perform additional operations after updating an entity.
For simple updates, use the base controller's `tryUpdate` method directly:

```typescript
// Simple update - PREFERRED
tryUpdateStatus() {
  return super.tryUpdate({ status: 'active' });
}

// Complex update with additional operations - WHEN NEEDED
tryComplexUpdate() {
  return super.tryUpdate(
    { status: 'completed' },
    {
      respondOne: async entity => {
        // Perform additional operations
        await this.performAdditionalTasks(entity);

        // Send the response
        this.respondOne(entity);
      },
    },
  );
}
```

### Why These Patterns?

1. **Response Control**
   - Custom response timing
   - Additional data inclusion
   - Error handling control

2. **Maintainability**
   - Clear operation flow
   - Easy to extend
   - Simple to debug

## Error Handling Pattern

The base controller provides a `tryAction` method for consistent error handling.
This pattern ensures all errors are caught and handled uniformly across the application.

### When to Use tryAction

1. When implementing custom logic before or after calling super methods
2. When directly using response methods like `respondOne`, `respondMany`, or `respondRequired`
3. When performing database operations or other async operations
4. When accessing request data (`req.params`, `req.body`, `req.query`)
5. When accessing response locals (`res.locals`)

Examples:

1. **Custom Logic Operations**
   ```typescript
   tryCustomOperation() {
     return this.tryAction(async () => {
       const result = await this.performCustomLogic();
       return this.respondOne(result);
     });
   }
   ```

2. **Request Data Access**
   ```typescript
   tryCreate() {
     return this.tryAction(async () => {
       const { parentId } = this.req.params;
       const { name } = this.req.body;
       return super.tryCreate({ parentId, name });
     });
   }
   ```

3. **Response Locals Access**
   ```typescript
   tryCreate() {
     return this.tryAction(async () => {
       const { parent } = this.res.locals.required;
       return super.tryCreate({ parentId: parent.id });
     });
   }
   ```

### When NOT to Use tryAction

1. When only calling super methods (e.g., `super.tryCreate`, `super.tryUpdate`)
   ```typescript
   // No tryAction needed
   tryUpdateStatus() {
     return super.tryUpdate({ status: 'active' });
   }
   ```

2. When only using `this.user.id` (it's already validated by auth middleware)
   ```typescript
   // No tryAction needed - user.id is pre-validated
   tryCreate() {
     return super.tryCreate({ ownerId: this.user.id });
   }
   ```

## Controller Inheritance Pattern

When extending the base controller, follow these patterns to maintain consistency and leverage built-in functionality:

```typescript
class ResourceController extends BaseEntitiesController {
  // 1. Constructor with repository
  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, repository);
  }

  // 2. Simple operations - direct super calls
  tryUpdateStatus() {
    return super.tryUpdate({ status: 'active' }); // -- use this. when no duplicated method in this class, opt for super.
  }

  // 3. Complex operations - with tryAction
  tryComplexOperation() {
    return this.tryAction(async () => {
      // Complex logic here
    });
  }

  // 4. Custom response methods
  async respondWithExtra(entity: any) {
    const extra = await this.getExtraData(entity);
    this.respondOne({ ...entity, ...extra });
  }
}
```

### Why This Pattern?

1. **Consistent Base Functionality**
   - All controllers share core features
   - Common operations are standardized
   - Reduces code duplication

2. **Extension Points**
   - Easy to add custom methods
   - Clear override patterns
   - Flexible response handling

3. **Type Safety**
   - Repository typing is preserved
   - Request/response typing is maintained
   - Error handling is type-safe

## Best Practices

1. **Response Methods**
   - Use base controller response methods
   - Maintain consistent response format
   - Handle pagination properly

2. **Repository Operations**
   - Use base class's methods for CRUD operations
   - Avoid direct repository calls
   - Leverage built-in features

3. **Post-Operations**
   - Use respondOne option for additional tasks
   - Keep operations atomic
   - Handle errors properly

4. **Error Handling**
   - Use tryAction for custom logic
   - Trust super methods' error handling
   - Maintain security in errors

5. **Controller Structure**
   - Keep methods focused
   - Use clear naming
   - Follow inheritance patterns

6. **Type Safety**
   - Use proper type annotations
   - Leverage TypeScript features
   - Maintain type consistency

7. **Testing**
   - Test error cases
   - Verify response format
   - Check additional operations 

## Router Pattern

When creating route files, follow these patterns to maintain consistency and leverage the auto-registration functionality:

1. **Router Creation**
   ```typescript
   const router = ExposedRouter('/v1/resource');
   // OR
   const router = StaffRouter('/v1/resource');
   // OR
   const router = DeveloperRouter('/v1/resource');
   ```

2. **Route Registration**
   Routes are registered immediately when defined:
   ```typescript
   router.get('/',
     auth.requireExposed,
     Controller.create(controller => controller.tryList()));

   router.post('/',
     auth.requireExposed,
     tryValidateBody(schema),
     Controller.create(controller => controller.tryCreate()));
   ```

3. **No Export Needed**
   The router export is not necessary as routes are registered when defined:
   ```typescript
   // This is not needed
   export default router;
   ```

### Why This Pattern?

1. **Immediate Registration**
   - Routes are registered when defined using router methods
   - No dependency on exports
   - Cleaner code structure

2. **Auto-Import**
   - Files are imported based on naming pattern
   - No need for explicit router exports
   - Consistent with module-based architecture

3. **Type Safety**
   - Router types are preserved
   - Path parameters are type-checked
   - Middleware types are maintained

## Best Practices

1. **Router Creation**
   - Use appropriate router type (Exposed/Staff/Developer)
   - Follow path naming conventions
   - Maintain consistent base paths

2. **Route Definition**
   - Group related routes together
   - Use descriptive route paths
   - Include proper middleware

3. **Documentation**
   - Include swagger comments
   - Document path parameters
   - Specify response schemas

4. **Security**
   - Apply proper auth middleware
   - Validate request bodies
   - Check access permissions

5. **Testing**
   - Test route registration
   - Verify middleware order
   - Check response formats 