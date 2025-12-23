---
description: Build and verify ERA KANBAN project
---

# Build & Verification Workflow

## TypeScript Type Check (Frontend)
// turbo
```bash
cd frontend && npx tsc --noEmit
```

## Lint Check
// turbo
```bash
cd frontend && npm run lint
```

## Build Frontend
// turbo
```bash
cd frontend && npm run build
```

## Build Backend (Dry Run)
// turbo
```bash
cd backend && wrangler deploy --dry-run
```

## Full Verification
1. Run all above commands
2. Check for console errors
3. Verify premium design standards are met
4. Test Kanban drag-and-drop
5. Test authentication flow
