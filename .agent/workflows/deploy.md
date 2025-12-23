---
description: Deploy ERA KANBAN to Cloudflare
---

# Deployment Workflow

## Prerequisites
- Logged in to Cloudflare: `wrangler login`
- D1 Database created
- R2 Bucket created
- Environment variables set in `wrangler.toml`

## Deploy Backend
// turbo
```bash
cd backend && wrangler deploy
```

## Build Frontend for Production
// turbo
```bash
cd frontend && npm run build
```

## Deploy Frontend (Cloudflare Pages)
// turbo
```bash
cd frontend && wrangler pages deploy dist --project-name era-kanban
```

## Post-Deployment Checklist
1. Verify API endpoints are accessible
2. Check authentication flow works
3. Test file uploads via R2
4. Verify Kanban drag-and-drop functionality
