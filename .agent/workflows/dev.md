---
description: Start development servers for ERA KANBAN
---

# Development Workflow

## Start Backend (Cloudflare Workers)
// turbo
```bash
cd backend && wrangler dev
```
Backend will be available at `http://localhost:8787`

## Start Frontend (Vite)
// turbo
```bash
cd frontend && npm run dev
```
Frontend will be available at `http://localhost:5173`

## Notes
- Backend hot-reloads on file changes
- Frontend has HMR enabled by default
- Use React Query DevTools for debugging API calls
