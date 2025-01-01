# Integration Test Patterns

## Important Jest Behaviors

Jest Execution Flow:
   ```
   1. Execute from omniflex root
   2. Load root jest.config
   3. Locate apps/server/jest.config
   4. Initialize via jest.setup.ts
   5. Process jest.mock declarations
   6. Import modules
   7. Execute tests
   ```

1. **Jest Mock Hoisting**
   ```typescript
   // ⚠️ This won't work as expected:
   const db = new Database();
   
   jest.mock('@omniflex/core', () => ({
     Containers: {
       db: db,  // ❌ db will be undefined due to hoisting
     },
   }));

   // ✅ Correct way:
   jest.mock('@omniflex/core', () => ({
     Containers: {
       db: new Database(),  // Create instance inside mock
     },
   }));
   ```

   Key Points:
   - jest.mock calls are ALWAYS hoisted to run first
   - Variables defined outside mock won't be available inside
   - Use jest.setup.ts for initialization that must run before mocks

2. **Jest Setup Flow**
   ```typescript
   // jest.setup.ts
   // this config is actually the jest.mock value, because jest.mock is hoisted to run first
   import config from '@/config';
   import { Containers } from '@omniflex/core';

   // 1. Mock declarations (hoisted)
   jest.mock('@/config', () => ({
     env: 'test',
     isTesting: true,
     logging: {
       level: 'error',
     },
   }));

   // 2. Setup code (runs after mocks)
   Containers.asValues({
     config,  // Uses mocked config
   });
   ```

3. Mocking Strategy:
   - Jest hoists all jest.mock calls to run first
   - Example from list.test.ts:
     ```typescript
     // this is the mock value, because jest.mock is hoisted to run first
     import { jwtProvider } from '@/utils/jwt';

     // this will run before the import
     jest.mock('@/utils/jwt', () => require('../helpers/jwt'));
     ```

4. Server Cleanup Requirements:
  - if @config isTesting is true, `infra-express` will create the express app only without starting the server, no need to do server.close() in afterAll

5. Common Jest Pitfalls:
   ```typescript
   // ⚠️ This won't work as expected:
   const db = new Database();
   
   jest.mock('@omniflex/core', () => ({
     Containers: {
       db: db,  // ❌ db will be undefined due to hoisting
     },
   }));
   ```

   Key Points About Jest's Behavior:
   - jest.mock is always hoisted to run first
   - Use jest.setup.ts if you need anything to run before jest.mock

## Server Configuration

1. Server Setup Pattern:
   ```typescript
   // Import route handlers - this triggers server configuration
   import './../../list.exposed.routes';
   import './../../item.exposed.routes';

   describe('Integration Tests', () => {
     let app: Express;
     let testUser: { id: string; token: string };

     beforeAll(async () => {
       if (!app) {
          app = (await AutoServer.start())
            .find(({ type }) => type === 'exposed')!
            .app;
       }
     });
   });
   ```

2. Important Points:
   - Server configuration comes from `servers.ts`
   - Route imports trigger configuration

## Test Helper Patterns

1. User Creation Helper:
   ```typescript
   export const createTestUser = async () => {
     const userId = uuid();
     const token = await jwtProvider.sign({
       id: userId,
       __appType: 'exposed',
       __type: 'access-token',
       __identifier: 'testing',
     }, 10 * 1000);

     return { id: userId, token };
   };
   ```

2. Resource Creation Helper:
   ```typescript
   export const createTestList = async (ownerId: string, name: string) => {
     return lists.create({
       ownerId,
       name,
       isArchived: false,
     });
   };

   export const createTestItem = async (listId: string, content: string) => {
     return items.create({
       listId,
       content,
       isCompleted: false,
     });
   };
   ```

3. Data Reset Helper:
   ```typescript
   export const resetTestData = async () => {
     // Use soft delete for all entities
     await messages.updateMany({}, { deletedAt: new Date() });
     await discussions.updateMany({}, { deletedAt: new Date() });
     await items.updateMany({}, { deletedAt: new Date() });
     await lists.updateMany({}, { deletedAt: new Date() });
     await invitations.updateMany({}, { deletedAt: new Date() });
   };
   ```

## Multi-Server Testing

Example of testing across server types:
```typescript
describe('Cross-Server Tests', () => {
  let exposedApp: Express;
  let staffApp: Express;
  let servers: Server[];

  beforeAll(async () => {
    const _servers = await AutoServer.start();
    servers = _servers.map(s => s.server!);
    
    exposedApp = _servers.find(s => s.type === 'exposed')!.app;
    staffApp = _servers.find(s => s.type === 'staff')!.app;
  });

  it('should handle cross-server operations', async () => {
    // Create data in exposed server
    const response = await request(exposedApp)
      .post('/v1/todo-lists')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({ title: 'Test List' });

    // Access data from staff server
    await request(staffApp)
      .get(`/v1/todo-lists/${response.body.data.id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
  });
});
```

## Common Issues

1. Database State:
   - Use `sequelize.sync({ force: true })` in `beforeAll`
   - Clean up test data in `afterEach`
   - Close connection in `afterAll`

2. Authentication:
   - Use `createTestUser()` for test tokens
   - Set correct `__appType` for server type
   - Include token in Authorization header

3. Route Configuration:
   - Import route files before `AutoServer.start()`
   - Don't manually configure routes in tests
   - Don't mix route configurations

4. Assertion Best Practices:
   - Use `toBeTruthy()/toBeFalsy()` for boolean checks and null/undefined values
   - Use `toBeFalsy()` instead of explicit `toBeNull()` or `toBeUndefined()` checks
   - Use `toMatchObject()` for partial object matching
   - Use `toHaveProperty()` for property existence checks
   - Avoid exact equality checks unless absolutely necessary
   - Keep assertions focused on business requirements
   - Don't over-specify in assertions

## Module Name Mapper Configuration

1. Base Jest Config (`jest.config.base.mjs`):
   ```javascript
   export default {
     transform: {},
     preset: 'ts-jest',
     testEnvironment: 'node',
     setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],

     moduleNameMapper: {
       // Core module mapping
       '^@omniflex/core$': '<rootDir>/core',
       '^@omniflex/core/(.*)$': '<rootDir>/core/$1',

       // Infrastructure modules mapping
       '^@omniflex/infra-express/?(.*)$': '<rootDir>/infra/infra-express/$1',
       '^@omniflex/infra-sqlite/?(.*)$': '<rootDir>/infra/infra-sqlite/$1',

       // Feature modules mapping
       '^@omniflex/module-identity-core/?(.*)$': '<rootDir>/modules/module-identity/core/$1',
       '^@omniflex/module-identity-impl-express/?(.*)$': '<rootDir>/modules/module-identity/impl-express/$1',
       // ... other module mappings
     },

     coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
     modulePathIgnorePatterns: ['/node_modules/', '/dist/'],
   };
   ```
   - Defines base TypeScript and Jest configuration
   - Maps all @omniflex paths to monorepo structure
   - Configures test environment and coverage

2. App Jest Config (`apps/server/jest.config.mjs`):
   ```javascript
   import baseConfig from '../../jest.config.base.mjs';

   const moduleNameMapper = Object.fromEntries(Object.entries(baseConfig.moduleNameMapper));

   // Update @omniflex paths for monorepo
   for (const key in moduleNameMapper) {
     const value = moduleNameMapper[key];

     if (key.startsWith('^@omniflex/')) {
       moduleNameMapper[key] = value.replace('<rootDir>/', '<rootDir>/../../');
     }
   }

   export default {
     ...baseConfig,
     setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

     moduleNameMapper: {
       ...moduleNameMapper,
       "^@/(.*)$": "<rootDir>/$1",  // Maps @/ to the app root
     },
   };
   ```

3. Configuration Flow:
   - jest.config.base.mjs defines core mappings
   - app's jest.config.mjs:
     1. Inherits base mappings
     2. Adjusts paths for monorepo structure
     3. Adds app-specific mappings

4. Path Resolution Examples:
   ```typescript
   // In a test file:
   import { something } from '@/utils/something';     // -> apps/server/utils/something
   import { core } from '@omniflex/core';            // -> <root>/core
   import { helper } from '../helpers/something';     // -> relative to test file
   ```

5. Common Issues and Solutions:
   - Module not found:
     1. Check base config for @omniflex mappings
     2. Check app config for path adjustments
     3. Verify relative paths from test location
   - Wrong module loaded:
     1. Check path priority in moduleNameMapper
     2. Verify <rootDir> resolution in each config
     3. Check for path conflicts between mappings

## Error Response Testing

1. Security-First Error Responses:
   ```typescript
   // When testing unauthorized access, expect 404 instead of 403
   // This prevents information leakage about resource existence
   it('should not reveal list existence to non-owners', async () => {
     const otherList = await lists.create({
       ownerId: otherUser.id,
       name: 'Other User\'s List',
     });

     await request(app)
       .patch(`/v1/todo-lists/${otherList.id}/archive`)
       .set('Authorization', `Bearer ${testUser.token}`)
       .expect(404);  // Not 403
   });
   ```

2. Error Response Patterns:
   - Use 404 for resource not found AND unauthorized access
   - Use 401 for authentication failures
   - Use 403 only when you want to explicitly confirm resource existence

3. Testing Considerations:
   - Test both positive and negative cases
   - Verify error response codes match security requirements
   - Document when 404 is used instead of 403 for security

## Assertion Patterns

1. Response Structure Assertions:
   ```typescript
   describe('Response Structure Tests', () => {
     it('should return correct list structure', async () => {
       const { body } = await request(app)
         .get(`/v1/todo-lists/${list.id}`)
         .set('Authorization', `Bearer ${token}`)
         .expect(200);

       expect(body).toHaveProperty('data');
       expect(body.data).toMatchObject({
         id: expect.any(String),
         name: list.name,
         ownerId: testUser.id,
         isArchived: false,
       });
     });

     it('should handle nested response structure', async () => {
       const { body: { data: list } } = await request(app)
         .post('/v1/todo-lists')
         .set('Authorization', `Bearer ${testUser.token}`)
         .send({ name: 'Test List' })
         .expect(201);

       expect(list).toMatchObject({
         id: expect.any(String),
         name: 'Test List',
         ownerId: testUser.id,
       });
     });
   });
   ```

2. Security Assertions:
   ```typescript
   describe('Security Tests', () => {
     it('should not reveal resource existence', async () => {
       const otherList = await createTestList(otherUser.id, 'Other List');

       // Should return 404 instead of 403 for security
       await request(app)
         .get(`/v1/todo-lists/${otherList.id}`)
         .set('Authorization', `Bearer ${token}`)
         .expect(404);
     });

     it('should require authentication', async () => {
       await request(app)
         .get('/v1/todo-lists')
         .expect(401);
     });

     it('should require proper authorization', async () => {
       const list = await createTestList(testUser.id, 'Test List');

       // Should not reveal list existence to non-members
       await request(app)
         .patch(`/v1/todo-lists/${list.id}/archive`)
         .set('Authorization', `Bearer ${otherUser.token}`)
         .expect(404);  // Not 403
     });
   });
   ```

## Test Case Numbering Pattern

1. Test Case ID Format:
   ```typescript
   // Format: [MODULE-TYPE0000]
   // - MODULE: Uppercase module name (e.g., LIST, ITEM)
   // - TYPE: Single character operation type
   //   - C: Create
   //   - R: Read
   //   - U: Update
   //   - D: Delete
   //   - A: Archive
   // - 0000: Four-digit number starting at 0010, incrementing by 10

   // Examples:
   it('[LIST-C0010] should create a new list successfully', async () => {});
   it('[LIST-R0010] should list user\'s lists', async () => {});
   it('[LIST-A0010] should archive a list as owner', async () => {});
   ```

2. Numbering Rules:
   - Start at 0010 for each operation type
   - Increment by 10 for each test case
   - Reset to 0010 when changing operation type
   - Keep numbers sequential within each operation type

3. Example Test Suite Structure:
   ```typescript
   describe('POST /v1/todo-lists', () => {
     it('[LIST-C0010] should create successfully', async () => {});
     it('[LIST-C0020] should require auth', async () => {});
   });

   describe('GET /v1/todo-lists', () => {
     it('[LIST-R0010] should list items', async () => {});
     it('[LIST-R0020] should handle empty', async () => {});
   });
   ```

4. Benefits:
   - Easy to locate tests by ID
   - Clear operation categorization
   - Simple to add new tests between existing ones
   - Consistent across all test files

## Date Handling in Tests

1. Using Relative Dates:
   ```typescript
   describe('Date-based Tests', () => {
     it('should handle date ranges correctly', async () => {
       const now = new Date();
       const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

       const recordData = createTestMembershipRecordData(
         userId,
         defaultLevel.id,
         now,
         oneYearLater,
       );
     });
   });
   ```

2. Date Handling Best Practices:
   - Use relative dates (e.g., `new Date()`) instead of fixed future dates
   - Calculate future dates using milliseconds for precision
   - Consider timezone implications in date comparisons
   - Use ISO strings for API requests/responses
   - Store dates as Date objects in the database

3. Common Date-Related Issues:
   - Fixed future dates in tests may fail when time passes
   - Timezone differences can cause unexpected behavior
   - Date string format inconsistencies between API and database
   - Date validation logic may depend on current time

4. Testing Date-Dependent Logic:
   ```typescript
   describe('Date Validation Tests', () => {
     it('should validate date ranges', async () => {
       // Bad: Using fixed dates
       const startAt = new Date('2024-01-01');  // ❌ Will fail when time passes

       // Good: Using relative dates
       const now = new Date();
       const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);  // ✅ Always one day ahead
     });
   });
   ```

5. Date Format Consistency:
   - Use ISO strings for API communication
   - Use Date objects for database operations
   - Use consistent timezone handling
   - Document any date format requirements

6. Mocking Dates for Testing:
   ```typescript
   describe('Date Mocking Tests', () => {
     let realDate: DateConstructor;

     beforeAll(() => {
       realDate = global.Date;
       const mockDate = new Date('2023-01-01T00:00:00Z');
       global.Date = class extends Date {
         constructor(date?: any) {
           if (date) {
             return new realDate(date);
           }
           return mockDate;
         }
       } as DateConstructor;
     });

     afterAll(() => {
       global.Date = realDate;
     });

     it('should use mocked date for new Date()', () => {
       const now = new Date();
       expect(now.toISOString()).toBe('2023-01-01T00:00:00.000Z');
     });
   });
   ```

   Key Points:
   - Mock dates only when necessary for deterministic testing
   - Restore the original Date after tests
   - Consider timezone implications when mocking dates
   - Document when and why date mocking is used