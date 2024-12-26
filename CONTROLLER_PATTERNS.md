# Controller Patterns

## BaseEntitiesController Response Methods

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
   this.respondRequired('list');
   // Response: { data: res.locals.required.list }
   ```
   This is particularly useful when working with RequiredDbEntries middleware
   which stores fetched entities in res.locals.required.

## Repository Operations Pattern

When performing repository operations, always use the base controller methods instead of directly calling repository methods:

1. For creating entities:
   ```typescript
   // INCORRECT: Direct repository call
   return repository.create({
     field: value,
   });

   // CORRECT: Use base controller method
   return super.tryCreate({
     field: value,
   });
   ```

2. For listing entities:
   ```typescript
   // INCORRECT: Direct repository call
   return repository.find({ field: value });

   // CORRECT: Use base controller method
   return super.tryListPaginated({ field: value });
   ```

3. For updating entities:
   ```typescript
   // INCORRECT: Unnecessary respondOne option
   return super.tryUpdate(
     { status: 'accepted' },
     {
       respondOne: entity => this.respondOne(entity),
     },
   );

   // CORRECT: Simple update
   return super.tryUpdate({ status: 'accepted' });
   ```

The base controller methods ensure:
- Consistent response formatting
- Proper error handling
- Pagination support where applicable
- Audit logging (if configured)
- Event emission (if configured)

## Post-Creation Operations Pattern

When you need to perform additional operations after creating an entity, use the following pattern:

```typescript
tryCreate<T extends Partial<TEntity> = Partial<TEntity>>(
  additionalBody?: T,
  { respondOne = this.respondOne }: {
    respondOne?: (entity: TEntity) => void;
  } = {},
)
```

### Why This Pattern?

1. The `tryCreate` method internally calls `respondOne` to send the response directly
2. Any code after `super.tryCreate()` won't execute as the response has already been sent
3. To perform additional operations after creation:
   - Provide a custom `respondOne` function in the options
   - Use this function to:
     - Capture the created entity
     - Perform additional operations
     - Call the controller's `respondOne` method when ready

### Example Implementation

```typescript
async tryCreate() {
  return super.tryCreate(
    {
      ownerId: this.user.id,
      isArchived: false,
    },
    {
      respondOne: async (list) => {
        await invitations.create({
          listId: list.id,
          inviterId: this.user.id,
          inviteeId: this.user.id,
          status: 'accepted',
        });

        this.respondOne(list);
      },
    }
  );
}
```

## Post-Update Operations Pattern

The post-update operations pattern should ONLY be used when you need to perform additional operations after updating an entity. For simple updates, use the base controller's `tryUpdate` method directly:

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
        await this.performAdditionalOperations(entity);
        this.respondOne(entity);
      },
    },
  );
}
```

## Error Handling with tryAction

The base controller provides a `tryAction` method for consistent error handling:

1. When to use `tryAction`:
   - When implementing custom logic before or after calling super methods
   - When directly using response methods like `respondOne`, `respondMany`, or `respondRequired`
   - When performing database operations or other async operations
   - When accessing request data (`req.params`, `req.body`, `req.query`)
   - When accessing response locals (`res.locals`)

2. When NOT to use `tryAction`:
   - When only calling super methods (e.g., `super.tryCreate`, `super.tryUpdate`)
   - These methods are already protected by the base controller
   - When only using `this.user.id` (it's already validated by auth middleware)

### Example: Request Data Access Needs Protection

```typescript
tryCreate() {
  return this.tryAction(async () => {
    const { listId } = this.req.params;
    const { inviteeId } = this.req.body;
    return super.tryCreate({
      listId,
      inviterId: this.user.id,
      inviteeId,
      status: 'pending',
    });
  });
}
```

### Example: Response Locals Access Needs Protection

```typescript
tryCreate() {
  return this.tryAction(async () => {
    const { list } = this.res.locals.required;
    return super.tryCreate({
      listId: list.id,
      isCompleted: false,
    });
  });
}
```

### Example: Super Method Only (No Protection Needed)

```typescript
tryUpdateStatus() {
  return super.tryUpdate();
}
```

## Best Practices

1. Use `respondRequired` when working with RequiredDbEntries middleware
2. Always use base controller methods instead of direct repository calls
3. Only use post-operation patterns when additional operations are needed
4. Keep update operations simple when no additional logic is required
5. Maintain consistent response formatting across all endpoints
6. Leverage the base controller's error handling mechanisms
7. Keep controller methods focused and single-purpose
8. Only wrap custom logic with `tryAction`
9. Trust the base controller's protection for super methods
10. Always protect request data access with `tryAction`
11. Always protect response locals access with `tryAction` 