# Membership Subscriptions Use Cases

## Security Requirements

### Information Leakage Prevention
- All endpoints must prevent information leakage about resource existence
- Unauthorized access attempts must return 404 (not 403) to prevent resource existence confirmation
- Staff endpoints must only be accessible by staff users
- Developer endpoints must only be accessible by developer users
- No endpoint should reveal the existence of memberships to unauthorized users

### Access Control Principles
- Authentication is required for all operations
- Authorization is validated before any operation
- Access levels are clearly defined:
  1. Staff Access:
     - Can view all membership records
     - Can create new membership records
     - Can update existing membership records
     - Cannot delete membership records
  2. Developer Access:
     - Can trigger membership scan and update
     - Can view all membership records
     - Cannot modify membership records
  3. User Access:
     - Can view their own membership records
     - Cannot modify any membership records
     - Cannot view other users' membership records

## Membership Management

### View Membership Records
- User can view their own membership records
- Staff can view all membership records
- Records are paginated for better performance
- Records are sorted by startAtUtc desc by default

### Get User's Current Membership
- System returns the user's current membership from the mapping table
- If no valid membership exists:
  1. System creates a default membership record valid indefinitely
  2. System updates the current membership mapping
- If no mapping exists:
  1. System creates a new mapping with the default membership
- Always returns a membership (never returns 404)
- Default membership has the lowest rank (0)
- membership's rank increments by 10 for each level

### Create Membership Record (Staff Only)
- Staff creates a new membership record for a user
- System validates the membership level exists
- System validates the date ranges (endBeforeUtc must be after startAtUtc)
- System updates the current membership mapping if needed

### Update Membership Record (Staff Only)
- Staff can update membership record details
- System validates the membership level exists
- System validates the date ranges (endBeforeUtc must be after startAtUtc)
- System updates the current membership mapping if needed

### Scan and Update Current Membership (Developer Only)
- Developer can trigger a scan of all users' memberships
- System identifies the highest level valid membership for each user (where current time is >= startAtUtc and < endBeforeUtc)
- System updates the current membership mapping table
- Operation is idempotent and can be safely retried

## Access Control

### Staff Operations
- Staff endpoints require staff role
- Staff can manage all membership records
- Staff operations require proper authentication
- Staff operations validate appropriate access rights

### Developer Operations
- Developer endpoints require developer role
- Developer can trigger system operations
- Developer operations require proper authentication
- Developer operations validate appropriate access rights

### User Operations
- User can only view their own membership records
- User cannot modify any membership records
- User operations require proper authentication
- User operations validate appropriate access rights

## Best Practices

1. Always validate user access before operations
2. Maintain audit trail for important actions
3. Use pagination for list operations
4. Keep expired memberships separate from active ones
5. Preserve data integrity in all operations 