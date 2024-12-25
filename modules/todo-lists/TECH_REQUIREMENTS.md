# Todo Lists Technical Requirements

## Data Models

### List
```typescript
interface TList {
  id: string;
  ownerId: string;
  title: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### Item
```typescript
interface TItem {
  id: string;
  listId: string;
  content: string;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### Invitation
```typescript
interface TInvitation {
  id: string;
  listId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### Discussion
```typescript
interface TDiscussion {
  id: string;
  itemId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### Message
```typescript
interface TMessage {
  id: string;
  discussionId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

## API Design

### RESTful Endpoints
- Follow standard REST conventions
- Use appropriate HTTP methods
- Include proper error responses

### Response Format
```typescript
// Success single entity
{
  data: TEntity
}

// Success collection
{
  data: TEntity[]
  total: number
}

// Error
{
  error: string
  message: string
  details?: any
}
```

## Validation Requirements

### Access Control
- Validate JWT for all endpoints
- Check invitation status for list access
- Validate list access before item access

### Data Validation
- Required fields must be present
- IDs must be valid UUIDs
- Dates must be valid ISO strings

## Performance Considerations

### Pagination
- List endpoints must support pagination
- Default page size: 10 items
- Maximum page size: 100 items

### Caching
- Cache user permissions where appropriate
- Cache frequently accessed lists
- Implement proper cache invalidation

## Error Handling

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

### Error Messages
- Clear and actionable
- Include relevant details
- Maintain security (no sensitive info)

## Testing Requirements

### Unit Tests
- Test all business logic
- Test validation rules
- Test error handling

### Integration Tests
- Test API endpoints
- Test authentication flow
- Test permission checks

## Best Practices

1. Follow TypeScript best practices
2. Use proper type annotations
3. Implement proper error handling
4. Document all public interfaces
5. Write maintainable tests 