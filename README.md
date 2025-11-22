# Base Infrastructure

Clean Next.js base with MongoDB, MinIO storage, and PWA support.

## Stack

- **Framework**: Next.js 15 (App Router) + PWA
- **Database**: MongoDB (Docker)
- **Storage**: MinIO S3-compatible (Docker)
- **Architecture**: Core + Services pattern

## Quick Start

```bash
# 1. Start services
npm run docker:up

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local

# 4. Run dev server
npm run dev
```

Visit: http://localhost:3000

## Project Structure

```
├── app/                      # Next.js App Router
│   ├── api/health/          # Health check endpoint
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   ├── core/                # Core infrastructure clients
│   │   ├── db.ts            # MongoDB client
│   │   └── minio.ts         # MinIO client
│   └── services/            # Business services
│       └── file.service.ts  # File operations
├── docker-compose.yml       # MongoDB + MinIO
└── public/
    └── manifest.json        # PWA manifest
```

## Architecture

```
┌─────────────────────────────────────┐
│      Application Layer              │
│      (Routes, Pages, Components)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Services Layer                 │
│      - file.service.ts              │
│      - (your services here)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Core Layer                     │
│      - db.ts (MongoDB client)       │
│      - minio.ts (MinIO client)      │
└─────────────────────────────────────┘
```

**Core** = Low-level infrastructure clients (singletons)
**Services** = Business logic that uses core clients

## Services (Docker)

**MongoDB**
- Port: 27017
- UI: http://localhost:8081 (Mongo Express)
- User: `admin`
- Pass: `password123`

**MinIO**
- API: http://localhost:9000
- Console: http://localhost:9001
- User: `minioadmin`
- Pass: `minioadmin123`

## Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Production server
npm run docker:up        # Start services
npm run docker:down      # Stop services
npm run docker:logs      # View logs
```

## API Endpoints

- `GET /api/health` - Service health check

## Usage Examples

### Database (Core)
```typescript
import { db } from '@/core/db';

// Connect
await db.connect();

// Check connection
const connected = db.isConnected();

// Get mongoose connection
const connection = db.getConnection();
```

### File Service
```typescript
import { fileService } from '@/services/file.service';

// Upload file
const url = await fileService.upload(
  'my-bucket',
  'file.jpg',
  buffer,
  'image/jpeg'
);

// List files
const files = await fileService.list('my-bucket');

// Get URL
const url = fileService.getUrl('my-bucket', 'file.jpg');

// Check if exists
const exists = await fileService.exists('my-bucket', 'file.jpg');

// Delete file
await fileService.delete('my-bucket', 'file.jpg');

// Get metadata
const meta = await fileService.getMetadata('my-bucket', 'file.jpg');
```

### Direct MinIO Client (Advanced)
```typescript
import { minioClient } from '@/core/minio';

const client = minioClient.getClient();
// Use raw MinIO client for advanced operations
```

## PWA

PWA enabled in production. Service worker auto-generated.

Manifest: `/manifest.json`

## Recommended Structure

```
src/
├── core/              # Infrastructure clients
│   ├── db.ts         # MongoDB
│   └── minio.ts      # MinIO
├── services/          # Business logic
│   └── file.service.ts
├── models/            # Database models (Mongoose)
├── repositories/      # Data access layer (optional)
└── components/        # React components
```

## Next Steps

1. Create models in `src/models/`
2. Add services in `src/services/`
3. Build API routes in `app/api/`
4. Add components in `src/components/`
