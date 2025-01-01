# Membership Subscriptions Technical Requirements

## Data Models

### MembershipLevel
```typescript
interface TMembershipLevel {
  id: string;
  code: string;
  name: string;
  rank: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### MembershipRecord
```typescript
interface TMembershipRecord {
  id: string;
  userId: string;
  membershipLevelId: string;
  startAtUtc: Date;
  endBeforeUtc: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### CurrentMembership
```typescript
interface TCurrentMembership {
  id: string;
  userId: string;
  membershipLevelId: string;
  membershipRecordId: string;
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
- Staff endpoints:
  - GET /staff/membership-levels - List membership levels
  - GET /staff/membership-records - List all membership records
  - GET /staff/membership-records/:id - Get membership record details
  - POST /staff/membership-records - Create membership record
  - PATCH /staff/membership-records/:id - Update membership record
  - GET /staff/current-memberships - List current memberships
  - GET /staff/records/current-memberships - Get current memberships with user profiles for multiple users (accepts comma-separated user IDs)
- Developer endpoints:
  - POST /developer/current-memberships/scan - Scan and update current memberships
- Exposed endpoints:
  - GET /membership-records/my - List user's membership records
  - GET /membership-records/my/current - Get user's current membership

### Default Membership Handling
- System maintains one default membership level (rank 0)
- Default membership level:
  - Code: BASIC
  - Name: Basic Membership
  - Rank: 0
  - isDefault: true
  - Created automatically during system initialization
  - Cannot be deleted or modified
- Default membership records:
  - Created automatically when needed
  - Valid indefinitely (endBeforeUtc set to max date)
  - Cannot be deleted or archived
- Current membership mapping:
  - Created automatically with default membership if none exists
  - Updated after any record creation or update
  - When multiple valid records exist for a user, use the one with highest rank
  - Membership scan process follows the same logic
  - Always returns a valid membership

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

// Current memberships with user profiles response
{
  data: Array<TUserProfile & { membership: TCurrentMembership }>
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
  - Staff: Full access to all records and ability to view any user's membership status
  - Developer: Access to system operations
  - User: Access to own records only
- Staff-specific operations:
  - View all membership records
  - Create membership records
  - Update membership records
- Developer-specific operations:
  - Trigger membership scan
  - View system operation results
- Check user role and permissions
- Validate record ownership for user access

### Error Handling Patterns
- Staff-only operations return 404 for non-staff
- Developer-only operations return 404 for non-developers
- User operations return 404 for unauthorized access
- Current membership endpoints never return 404
- Never reveal resource existence to unauthorized users
- Use consistent error patterns across all endpoints

### Data Validation
- Required fields must be present
- IDs must be valid UUIDs
- Dates must be valid ISO strings in UTC
- Membership level must exist
- Date ranges must be valid
- Rank must be a non-negative integer

## Performance Considerations

### Pagination
- List endpoints must support pagination
- Default page size: 10 items
- Maximum page size: 100 items

### Current Membership Scan
- Process users in batches
- Use efficient queries for membership lookup
- Handle large datasets gracefully
- Implement proper error recovery

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
- Test date range validation
- Test membership level validation

### Integration Tests
- Test API endpoints
- Test authentication flow
- Test permission checks
- Test membership scan process
- Test current membership updates

## Best Practices

1. Follow TypeScript best practices
2. Use proper type annotations
3. Implement proper error handling
4. Document all public interfaces
5. Write maintainable tests
6. Validate data integrity
7. Maintain audit trail

## Implementation Principles

### Request Validation
- Validate request body schema early
- Fast fail for invalid request data
- Schema validation before authentication
- Example validation order:
  1. Request schema validation
  2. Authentication
  3. Access control checks
  4. Business logic validation
  5. Database operations

### Testing Philosophy
- Implementation driven by use cases
- Steps for feature development:
  1. Define and validate requirements
  2. Design implementation
  3. Adjust tests to match use case
  4. Never compromise quality
  5. Review design if tests are difficult 