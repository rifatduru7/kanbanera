---
description: Start development servers for ERA KANBAN
---

# Development Workflow

// turbo-all

## Start Both Servers

1. Start backend server (Terminal 1)
```bash
cd backend && npm run dev
```
Backend runs at: http://localhost:8787

2. Start frontend server (Terminal 2)
```bash
cd frontend && npm run dev
```
Frontend runs at: http://localhost:5173

## Quick Restart

3. If backend needs restart
```bash
cd backend && npx wrangler dev
```

4. If frontend needs restart
```bash
cd frontend && npx vite
```

## Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8787 |
| API Health | http://localhost:8787/api/health |

## Hot Reload

- Frontend: Automatic via Vite HMR
- Backend: Automatic via Wrangler watch mode

## Troubleshooting

- Port 5173 in use: `npx kill-port 5173`
- Port 8787 in use: `npx kill-port 8787`
- Clear Vite cache: `cd frontend && rm -rf node_modules/.vite`
