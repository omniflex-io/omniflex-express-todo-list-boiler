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

Similar to post-creation operations, when you need to perform additional operations after updating an entity, use the following pattern:

```typescript
tryUpdate<T extends Partial<TEntity> = Partial<TEntity>>(
  additionalBody?: T,
  { respondOne = this.respondOne }: {
    respondOne?: (entity: TEntity) => void;
  } = {},
)
```

### Why This Pattern?

1. The `tryUpdate` method internally calls `respondOne` to send the response directly
2. Any code after `super.tryUpdate()` won't execute as the response has already been sent
3. To perform additional operations after update:
   - Provide a custom `respondOne` function in the options
   - Use this function to:
     - Capture the updated entity
     - Perform additional operations
     - Call the controller's `respondOne` method when ready

### Example Implementation

```typescript
tryAcceptInvitation() {
  return super.tryUpdate(
    { status: 'accepted' },
    {
      respondOne: entity => {
        // Perform any additional operations here
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
2. Implement post-creation operations using the respondOne option
3. Maintain consistent response formatting across all endpoints
4. Leverage the base controller's error handling mechanisms
5. Keep controller methods focused and single-purpose
6. Only wrap custom logic with `tryAction`
7. Trust the base controller's protection for super methods
8. Always protect request data access with `tryAction`
9. Always protect response locals access with `tryAction` 