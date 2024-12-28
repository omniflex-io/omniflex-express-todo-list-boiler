# Todo Lists Technical Requirements

## Data Models

### List
```typescript
interface TList {
  id: string;
  ownerId: string;
  name: string;
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
  approved: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### InvitationCode
```typescript
interface TInvitationCode {
  id: string;
  listId: string;
  inviterId: string;
  expiresAt: Date;
  autoApprove: boolean;
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
- Invitation endpoints:
  - GET /invitations/my/pending - List pending invitations
  - GET /invitations/my/accepted - List accepted invitations
  - PATCH /invitations/:id/accept - Accept an invitation
  - PATCH /invitations/:id/reject - Reject an invitation
  - PATCH /invitations/:id/approve - Approve an invitation (owner only)
  - POST /:listId/invitations/codes - Generate invitation code (owner only)
  - POST /:listId/invitations/codes/:id - Join using invitation code
  - GET /:listId/invitations/codes - List invitation codes (owner only)

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
- Access levels are strictly enforced:
  - Owner: Full control over list and its settings
  - Member: Access to list content and items
  - Non-member: No access or visibility
- Owner-specific operations:
  - Archive/unarchive lists
  - Manage invitations
  - Generate invitation codes
  - Approve manual invitations
- Member-specific operations:
  - View list and items
  - Create/update items
  - Participate in discussions
  - Complete/uncomplete items
- Check invitation status and approval for list access
- Validate list access before item access
- Validate list ownership for approval actions
- Validate invitation code expiry and usage

### Error Handling Patterns
- Owner-only operations return 404 for non-owners
- Member-only operations return 404 for non-members
- Never reveal resource existence to unauthorized users
- Use consistent error patterns across all endpoints

### Data Validation
- Required fields must be present
- IDs must be valid UUIDs
- Dates must be valid ISO strings
- Invitation codes must be unique
- Share links must have expiry dates

## Performance Considerations

### Pagination
- List endpoints must support pagination
- Default page size: 10 items
- Maximum page size: 100 items

## Error Handling

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 410: Gone (expired invitation code)
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
- Test invitation code expiry
- Test approval flows

### Integration Tests
- Test API endpoints
- Test authentication flow
- Test permission checks
- Test invitation code generation
- Test invitation approval process

## Best Practices

1. Follow TypeScript best practices
2. Use proper type annotations
3. Implement proper error handling
4. Document all public interfaces
5. Write maintainable tests
6. Validate ownership before approval actions
7. Maintain audit trail for approvals

## Implementation Principles

### Request Validation
- Validate request body schema as early as possible in the request pipeline
- Fast fail for invalid request data before any resource-intensive operations
- Schema validation should come before authentication to optimize resource usage
- Example validation order:
  1. Request schema validation (lightweight, fast rejection)
  2. Authentication (JWT, more resource-intensive)
  3. Access control checks
  4. Business logic validation
  5. Database operations
- Exception: Skip early schema validation if it could expose sensitive information

### Testing Philosophy
- Implementation should be driven by use cases, not test requirements
- Steps for feature development:
  1. Define and validate the use case requirements
  2. Design the implementation to satisfy the use case
  3. Adjust tests to match the actual use case
  4. Never compromise implementation quality for test convenience
  5. If tests are difficult to write, review the implementation design
- Test cases should reflect real-world usage patterns
- When conflicts arise between tests and implementation:
  1. Review the original use case requirements
  2. Adjust either implementation or tests to match the use case
  3. Document the reasoning for the chosen approach 