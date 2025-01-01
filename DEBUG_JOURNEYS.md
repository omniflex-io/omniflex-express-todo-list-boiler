# Debug Journeys

This document records notable debugging journeys, their analysis process, and resolutions. These cases serve as valuable references for similar issues in the future.

## Membership Record Test 404 Error

### Issue Description
- **Module**: `membership-subscriptions`
- **Test File**: `record.staff.test.ts`
- **Failed Tests**:
  - `[STAFF-R0030]` POST /v1/membership/records - create new membership record
  - `[STAFF-R0035]` POST /v1/membership/records - update current membership
  - `[STAFF-R0100]` PATCH /v1/membership/records/:recordId - update membership record

### Initial Analysis
1. Tests were failing with 404 "Not Found" errors
2. Initial assumption was that it might be related to the auth middleware or membership level validation
3. Team first suspected the membership level might be getting soft-deleted during test cleanup

### Investigation Process
1. Added `deletedAt: null` to the membership level query in test setup:
   ```typescript
   const level = await membershipLevels.findOne({ isDefault: true, deletedAt: null });
   ```

2. Added debug logging to track membership level state:
   ```typescript
   console.error('Test setup - Default level:', defaultLevel.id, 'deletedAt:', defaultLevel.deletedAt);
   console.error('Before create - Level state:', levelBefore?.id, 'deletedAt:', levelBefore?.deletedAt);
   console.error('After create - Level state:', levelAfter?.id, 'deletedAt:', levelAfter?.deletedAt);
   ```

3. Logs revealed:
   - Membership level was not deleted
   - Error was coming from `MembershipService.refreshCurrentMembership`
   - Error message: "No active membership records found"

### Root Cause
1. The test was using future dates for membership records:
   ```typescript
   const startAtUtc = new Date('2024-01-01T00:00:00Z');
   const endBeforeUtc = new Date('2025-01-01T00:00:00Z');
   ```

2. `MembershipService.refreshCurrentMembership` checks if a record is active by comparing current time with `startAtUtc` and `endBeforeUtc`:
   ```typescript
   const activeRecords = records.filter(record =>
     now >= record.startAtUtc && now < record.endBeforeUtc
   );
   ```

3. Since the test's `startAtUtc` was in the future, the record was not considered active, causing the 404 error

### Solution
Updated the test to use current time instead of future dates:
```typescript
const now = new Date();
const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

const recordData = createTestMembershipRecordData(
  userId,
  defaultLevel.id,
  now,
  oneYearLater,
);
```

### Learning Points
1. **Assumption Verification**: The team's initial assumption about soft-deleted records was incorrect. Adding debug logging helped identify the actual issue.

2. **Time-Sensitive Tests**: When dealing with date-based logic:
   - Consider how the current time affects the test
   - Be explicit about date ranges
   - Use relative dates (e.g., now + 1 year) instead of fixed dates when appropriate

3. **Error Source**: 404 errors can come from different layers:
   - Auth middleware (unauthorized access)
   - Data validation (entity not found)
   - Business logic (active record not found)

4. **Debug Process**:
   - Start with logging/debugging at the error point
   - Work backwards through the call stack
   - Verify assumptions with concrete evidence 