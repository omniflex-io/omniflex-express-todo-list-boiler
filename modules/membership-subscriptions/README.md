# Membership Subscriptions Module

## Overview

This module handles user membership subscriptions with support for:
- Multiple membership levels with ranks
- Time-based membership validity
- Current membership tracking
- Staff management endpoints
- Developer system operations

## Module Structure

```
membership-subscriptions/
├── __tests__/                    # Test files
│   ├── integration/             # Integration tests
│   └── helpers/                 # Test helpers
├── middlewares/                 # Access control middlewares
├── models.ts                    # Data models
├── membership.repo.ts           # Repository definitions
├── membership.exposed.routes.ts # User endpoints
├── membership.staff.routes.ts   # Staff endpoints
├── membership.dev.routes.ts     # Developer endpoints
├── http.schemas.ts             # Request/response schemas
├── TECH_REQUIREMENTS.md        # Technical requirements
├── USE_CASES.md               # Use cases documentation
└── README.md                  # This file
```

## Implementation Details

### Access Control

1. Staff Endpoints
   - Require staff role
   - Full access to all records
   - Management operations

2. Developer Endpoints
   - Require developer role
   - System operations
   - Maintenance tasks

3. User Endpoints
   - Require authentication
   - Access to own records only
   - Read-only operations

### Data Flow

1. Membership Record Creation
   ```
   Staff Request -> Validate Level -> Create Record -> Update Current -> Response
   ```

2. Current Membership Scan
   ```
   Dev Request -> Batch Process -> Update Mappings -> Response
   ```

3. User Record Access
   ```
   User Request -> Validate Access -> Filter Records -> Response
   ```

## Usage Examples

### Staff Operations

```typescript
// Create membership record
POST /staff/membership-records
{
  "userId": "user-uuid",
  "membershipLevelId": "level-uuid",
  "startAtUtc": "2024-01-01T00:00:00Z",
  "endBeforeUtc": "2025-01-01T00:00:00Z"
}

// List membership records
GET /staff/membership-records?page=1&pageSize=10
```

### Developer Operations

```typescript
// Trigger membership scan
POST /developer/current-memberships/scan
```

### User Operations

```typescript
// View own membership records
GET /membership-records/my

// View current membership
GET /membership-records/my/current
```

## Best Practices

1. Date Handling
   - Always use UTC for dates
   - Validate date ranges
   - Handle timezone conversions

2. Error Handling
   - Follow security-first approach
   - Use 404 for unauthorized access
   - Maintain consistent patterns

3. Performance
   - Use pagination
   - Implement efficient queries
   - Handle large datasets

## Related Documentation

- [Technical Requirements](./TECH_REQUIREMENTS.md)
- [Use Cases](./USE_CASES.md)
- [Controller Patterns](../CONTROLLER_PATTERNS.md)
- [Middleware Patterns](../MIDDLEWARE_PATTERNS.md)
- [Integration Test Patterns](../INTEGRATION_TEST_PATTERNS.md) 