---
description: Initial project setup for ERA KANBAN
---

# Setup Workflow

## Prerequisites
- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare account logged in: `wrangler login`

## Backend Setup

// turbo
1. Install backend dependencies
```bash
cd backend && npm install
```

// turbo
2. Create D1 database (if not exists)
```bash
wrangler d1 create era-kanban-db
```

3. Update `wrangler.toml` with database_id from step 2

// turbo
4. Apply database schema
```bash
wrangler d1 execute era-kanban-db --local --file=schema.sql
```

## Frontend Setup

// turbo
5. Install frontend dependencies
```bash
cd frontend && npm install
```

// turbo
6. Create .env.local file
```bash
echo "VITE_API_URL=http://localhost:8787" > .env.local
```

## Backblaze B2 Setup (Optional)

7. Create B2 bucket at backblaze.com
8. Create application key with read/write access
9. Update `wrangler.toml` with B2 credentials:
   - B2_BUCKET_NAME
   - B2_ENDPOINT
   - B2_KEY_ID
   - B2_APP_KEY

## Verification

// turbo
10. Run backend
```bash
cd backend && npm run dev
```

// turbo
11. Run frontend (new terminal)
```bash
cd frontend && npm run dev
```

12. Open http://localhost:5173 and verify login page loads
