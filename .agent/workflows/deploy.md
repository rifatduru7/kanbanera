---
description: Deploy ERA KANBAN to Cloudflare
---

# Deployment Workflow

## Prerequisites
- Logged in to Cloudflare: `wrangler login`
- D1 database created and schema applied
- B2 bucket configured (optional)

// turbo-all

## Step 1: Verify Build

1. TypeScript check backend
```bash
cd backend && npx tsc --noEmit
```

2. Build frontend
```bash
cd frontend && npm run build
```

## Step 2: Deploy Backend

3. Apply schema to production D1 (if needed)
```bash
cd backend && wrangler d1 execute era-kanban-db --remote --file=schema.sql
```

4. Deploy Worker
```bash
cd backend && wrangler deploy
```

Backend URL: https://era-kanban.rifatduru.workers.dev

## Step 3: Deploy Frontend

5. Deploy to Cloudflare Pages
```bash
cd frontend && wrangler pages deploy dist --project-name era-kanban
```

Frontend URL: https://era-kanban.pages.dev

## Step 4: Verify Deployment

6. Test API health
```bash
curl https://era-kanban.rifatduru.workers.dev/api/health
```

7. Open frontend and test login flow

## Environment Variables (Production)

Update in Cloudflare Dashboard > Workers > era-kanban > Settings > Variables:

| Variable | Value |
|----------|-------|
| JWT_SECRET | (generate secure random string) |
| JWT_REFRESH_SECRET | (generate secure random string) |
| CORS_ORIGIN | https://era-kanban.pages.dev |
| B2_BUCKET_NAME | your-bucket |
| B2_ENDPOINT | https://s3.us-west-004.backblazeb2.com |
| B2_KEY_ID | your-key-id |
| B2_APP_KEY | your-app-key |

## Rollback

8. View previous deployments
```bash
wrangler deployments list
```

9. Rollback to specific version
```bash
wrangler rollback <deployment-id>
```
