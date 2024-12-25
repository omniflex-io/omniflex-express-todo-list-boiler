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

## Best Practices

1. Use `respondRequired` when working with RequiredDbEntries middleware
2. Implement post-creation operations using the respondOne option
3. Maintain consistent response formatting across all endpoints
4. Leverage the base controller's error handling mechanisms
5. Keep controller methods focused and single-purpose 