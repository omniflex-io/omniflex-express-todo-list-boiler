# Integration Test Patterns

## Test Execution Requirements

1. Run tests from omniflex root directory:
   ```bash
   yarn test
   ```

2. Jest Execution Flow:
   ```
   1. Execute from omniflex root
   2. Load root jest.config
   3. Locate apps/server/jest.config
   4. Initialize via jest.setup.ts
   5. Process jest.mock declarations
   6. Import modules
   7. Execute tests
   ```

3. Jest Setup Configuration:
   ```typescript
   // jest.setup.ts
   // this config is actually the jest.mock value, because jest.mock is hoisted to run first
   import config from '@/config';
   import { Containers } from '@omniflex/core';

   // no matter what, the jest.mock are hoisted to run first
   jest.mock('@/config', () => ({
     env: 'test',
     logging: {
       level: 'error',
       exposeErrorDetails: false,
     },
     // ... other config mocks
   }));

   // Register the mocked config to Containers
   Containers.asValues({
     config,  // This is the mocked config from the import above
     // ... other values
   });
   ```

4. Mocking Strategy:
   - Jest hoists all jest.mock calls to run first
   - Example from list.test.ts:
     ```typescript
     // this is the mock value, because jest.mock is hoisted to run first
     import { jwtProvider } from '@/utils/jwt';

     // this will run before the import
     jest.mock('@/utils/jwt', () => require('../helpers/jwt'));
     ```

5. Server Cleanup Requirements:
   - Must stop ALL servers after tests
   - Use closeAllConnections() before close()
   - Example:
     ```typescript
     afterAll(() => {
       for (const server of servers) {
         server.closeAllConnections();
         server.close();
       }
     });
     ```

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

1. Server Setup:
   ```typescript
   // Import route handlers - this triggers server configuration
   import './../../list.exposed.routes';

   describe('Integration Tests', () => {
     let app: Express;
     let servers: Server[];

     beforeAll(async () => {
       if (!app) {
         const _servers = await AutoServer.start();
         const exposedServer = _servers.find(({ type }) => type === 'exposed')!;

         app = exposedServer.app;
         servers = _servers.map(({ server }) => server!).filter(Boolean);
       }
     });

     afterAll(() => {
       for (const server of servers) {
         server.closeAllConnections();
         server.close();
       }
     });
   });
   ```

2. Important Points:
   - Server configuration comes from `servers.ts`
   - Route imports trigger configuration
   - Clean up ALL servers after tests

## Test Helpers

Example from todo-lists module:
```typescript
// __tests__/helpers/setup.ts
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

export const createTestList = async (ownerId: string, title: string) => {
  return lists.create({
    ownerId,
    title,
    isArchived: false,
  });
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

1. Server Cleanup:
   - Always clean up ALL servers, not just the one you're testing
   - Use `server.closeAllConnections()` before `server.close()`
   - Clean up in `afterAll`, not `afterEach`

2. Database State:
   - Use `sequelize.sync({ force: true })` in `beforeAll`
   - Clean up test data in `afterEach`
   - Close connection in `afterAll`

3. Authentication:
   - Use `createTestUser()` for test tokens
   - Set correct `__appType` for server type
   - Include token in Authorization header

4. Route Configuration:
   - Import route files before `AutoServer.start()`
   - Don't manually configure routes in tests
   - Don't mix route configurations

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