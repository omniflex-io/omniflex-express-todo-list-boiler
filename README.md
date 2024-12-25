# Omniflex Express Server Example

## Usage Notice

This project is built using the Omniflex Mono-Repo. For more information, visit [omniflex.io](https://omniflex.io).

The omniflex mono-repo is available at [here](https://github.com/Zay-Dev/omniflex).

## Prerequisites

- Node.js (v16 or higher)
- Yarn (v1.22 or higher)
- PostgreSQL database
- MongoDB database
- RSA key pair for JWT signing (provided in `files` directory)

## Dependencies

- `jest`, `jest-silent-reporter` - testing
- `tsc`, `tsc-alias` - TypeScript compilation
- `typescript` - for TypeScript compilation
- `bcrypt` - for password hashing
- `jsonwebtoken` - for JWT signing and verification
- `ms` - for time conversion
- `swagger-ui-express` - for Swagger UI
- `awilix` - for dependency injection
- `dotenv` - for loading environment variables
- `joi` - for input validation
- `joi-to-swagger` - for converting Joi schemas to Swagger definitions
- `moment` - for date and time manipulation
- `nodemon` - for development hot reloading
- `tsx` - for running TypeScript code in the development environment
- `uuid` - for generating UUIDs
- `cors` - for Cross-Origin Resource Sharing
- `express` - for the web framework
- `express-fileupload` - for file upload
- `express-useragent` - for user agent parsing
- `helmet` - for security headers
- `morgan` - for logging HTTP requests
- `response-time` - for response time
- `winston` - for logging

## Quick Start

```bash
# Create new project
npx github:Zay-Dev/omniflex-npx --alpha --express my-project

## Update .env file, install dependencies and start the server
yarn && yarn dev:server

# OR clone manually
git clone --recurse-submodules git@github.com:Zay-Dev/Omniflex.git my-project
cd my-project

## Checkout https://www.omniflex.io/get-started/express
```


## Installation

### 1. Environment Setup

Create a `.env` file in the project root (see `.env.example`):

```env
# Environment (development, production, test)
NODE_ENV=development

# Logging level (error, warn, info, debug, verbose, silly)
LOG_LEVEL=silly

# Set to 'true' to expose detailed error information in responses (not recommended for production)
EXPOSE_ERROR_DETAILS=true

# Request timeout in seconds
REQUEST_TIMEOUT_SECONDS=30

# Server Ports
PORT_EXPOSED=3500  # Port for public/exposed API
PORT_STAFF=3600    # Port for staff API
PORT_DEVELOPER=3700  # Port for developer API

# Db Driver (mongoose, postgres, sqlite)
DB_DRIVER=mongoose
DB_DRIVER=postgres
DB_DRIVER=sqlite

# MongoDb
MONGO_DB=
MONGO_URI=mongodb://localhost:27017/omniflex

# Postgres
POSTGRES_URI="postgresql://postgres:test1234@localhost:5432/omniflex?schema=public"

# Sqlite
SQLITE_URI=":memory:"

# JWT Configuration
JWT_ALGORITHM=RS256
JWT_ISSUER=omniflex-server
JWT_PUBLIC_KEY_PATH=files/public.pem
JWT_PRIVATE_KEY_PATH=files/private.pem
JWT_ACCESS_TOKEN_EXPIRATION=1d
JWT_REFRESH_TOKEN_EXPIRATION=30d
```

## Project Structure

- `/docs` - Auto-generated Swagger documentation
- `/files` - RSA key pair for JWT signing
- `/middlewares` - Express middlewares
- `/services` - Core service initialization and configuration
- `/modules` - Feature modules (e.g., identity), the main codebase
- `/utils` - Utility functions and providers

## Available Scripts

```bash
yarn && yarn dev:server # suggested at the omniflex root

# Development mode with hot reload
yarn dev

# Build the project
yarn build

# Start production server
yarn start
```

## Authentication

The example uses JWT-based authentication with RSA key pairs. Make sure the following files exist in the `files` directory:

- `private.pem` - RSA private key for token signing
- `public.pem` - RSA public key for token verification

Please replace the files with your own keys before using the server in production.
You could also mount the files to the container in production.

## Available Endpoints

### Public APIs (Port 3500)
- POST `/v1/users` - Register new user
- POST `/v1/users/access-tokens` - Login
- PUT `/v1/users/access-tokens` - Refresh access token
- DELETE `/v1/users/access-tokens` - Revoke access token (Logout)
- GET `/v1/users/my/profile` - Get current user profile

### Staff APIs (Port 3600)
- GET `/v1/ping` - Health check

### Developer APIs (Port 3700)
- GET `/v1/ping` - Health check
- GET `/v1/users` - List all users
- GET `/v1/users/:id` - Get user by ID
- GET `/swagger/exposed` - Swagger UI for public APIs
- GET `/swagger/staff` - Swagger UI for staff APIs
- GET `/swagger/developer` - Swagger UI for developer APIs

## Technical Guide

### Server Architecture

This example implements a multi-server architecture with three distinct servers:

- **Exposed Server (3500)**: Public-facing APIs
- **Staff Server (3600)**: Internal staff-only APIs
- **Developer Server (3700)**: Development and debugging APIs

> Each server provides isolation and separate security (or any other area) contexts for different types of users.

> Easier to setup/manage the cloud security policies.

### Service Setup Flow

#### 1. **Entry Point**

```typescript
// -- index.ts
import '@/services'; // -- actual entry point

// -- testing routes, could be removed, suggested to keep the ping endpoints
import * as Servers from '@/servers';
import { errors } from '@omniflex/core';

Servers.exposedRoute('/v1/ping')
  .get('/', (_, res) => {
    res.json({ message: 'Pong (staff)' });
  });

Servers.staffRoute('/v1/ping')
  .get('/', (_, res) => {
    res.json({ message: 'Pong (staff)' });
  });

Servers.developerRoute('/v1/')
  .useMiddlewares([(_, __, next) => {
    console.log('Middleware for developer');
    return next();
  }])
  .get('/ping', (_, res) => {
    res.json({ message: 'Pong (developer)' });
  })
  .get('/errors/401', (_, __, next) => {
    next(errors.unauthorized());
  })
  .get('/errors/async', async () => {
    throw errors.custom('Custom error', 500);
  })
  .get('/errors/uncatchable', () => {
    (async () => {
      throw errors.custom('Custom error', 500);
    })();
  });
```

#### 2. **Services Configuration**

```typescript:services/index.ts
// -- services/index.ts
import config from '@/config'; // -- typed configuration for the app. No more `process.env` everywhere!

/* other imports 
  ...
*/

export const resolve = appContainer.resolve;

initializeAppContainer({
  logger: createLogger({ config }),
  hashProvider: new BcryptHashProvider(),
});

(async () => {
  const { sequelize, mongoose } = await connectDb(); // -- db-driver.ts

  Containers.asValues({
    config,
    mongoose,
    sequelize,
  });
  
  await Modules.initialize();   // -- configure routes of all modules
  await Swagger.initialize();   // -- generate swagger documentation and bind developer swagger routes

  sequelize && await sequelize.sync();    // -- please follow the standard sequelize setup for your production environment
  await AutoServer.start();
})();

// -- services/modules.ts
/* other codes
  ...
*/

// -- auto import ../modules/**/(exposed|staff|developer).ts
async function routes() {
  const { join } = await import('path');

  const dirname = import.meta.dirname;
  const path = join(dirname, '../modules');

  await autoImport(path, (filename) => {
    return ['exposed', 'staff', 'developer']
      .includes(filename);
  });
}

export const initialize = async () => {
  switch (config.dbDriver) {
    case 'mongoose':
      await mongooseIdentity();
      await mongooseUserSession();
      break;

    case 'sqlite':
    case 'postgres':
      await sequelizeIdentity();
      await sequelizeUserSession();
      break;
  }

  await routes();
};
```

#### 3. **Module-Based Routing**

The example uses a module-based architecture for better organization and scalability:

**Module Structure**

```
/modules
  /identity
    exposed.ts     # Public APIs
    developer.ts   # Developer APIs
    controller.ts  # Controller logic
    ...            # Other files
```

**Creating Routes**

With the current version of `swagger-autogen`, it could only recognize routes in `router.get`, `router.post`, etc.

```typescript
import * as Servers from '@/servers';

// Public API route
const router = Servers.exposedRoute('/v1/users');

// Staff API route
const router = Servers.staffRoute('/v1/admin');

// Developer API route
const router = Servers.developerRoute('/v1/debug');
```

#### 4. **Swagger Documentation**

The server automatically generates Swagger documentation during startup. Documentation is only accessible through the Developer server.

#### Access URLs
- Exposed APIs: `http://localhost:3700/swagger/exposed`
- Staff APIs: `http://localhost:3700/swagger/staff`
- Developer APIs: `http://localhost:3700/swagger/developer`

#### Swagger Generation Comments
Add these comments above your route handlers:

```typescript
// #swagger.file.tags = ['Users']
// #swagger.file.basePath = '/v1/users'

router.post('/', 
  // #swagger.jsonBody = required|components/schemas/moduleIdentity/registerWithEmail
  validateRegisterWithEmail,
  create(controller => controller.tryRegisterWithEmail(appType))
);
```

The swagger generation process is handled automatically (see `services/swagger.ts`):

#### 5. **Server Configuration**

The server configuration is managed through the `servers.ts` file:

```typescript:servers.ts
// -- servers.ts

export const servers: Record<ServerType, TBaseServer> = {
  exposed: {
    type: 'exposed',
    port: config.ports.exposed,
    options: {
      middlewares: {
        before: [
          auth.optional,
        ],
      },
    },
  },
  staff: {
    type: 'staff',
    port: config.ports.staff,
    options: {
      middlewares: {
        before: [
          auth.optional,
        ],
      },
    },
  },
  developer: {
    type: 'developer',
    port: config.ports.developer,
    options: {
      middlewares: {
        before: [
          (req: Request, res: Response, next: NextFunction) => {
            if (req.path.startsWith('/swagger/')) {
              res.locals._noLogger = true;
            }

            next();
          },
        ],
      },
    },
  },
};
```

Each server can have its own middleware stack and security configurations while sharing the core application logic.


## License

MIT License - see [LICENSE](LICENSE) for details