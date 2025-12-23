---
description: Build and verify ERA KANBAN project
---

# Build Workflow

// turbo-all

## Quick Verify

1. Backend TypeScript check
```bash
cd backend && npx tsc --noEmit
```

2. Frontend TypeScript check
```bash
cd frontend && npx tsc --noEmit
```

3. Frontend production build
```bash
cd frontend && npm run build
```

## Full Build

4. Install all dependencies
```bash
cd backend && npm install && cd ../frontend && npm install
```

5. Lint check (if configured)
```bash
cd frontend && npm run lint
```

6. Backend dry-run deploy
```bash
cd backend && wrangler deploy --dry-run
```

## Build Output

Frontend build creates:
- `frontend/dist/index.html`
- `frontend/dist/assets/*.js`
- `frontend/dist/assets/*.css`

Expected bundle size: ~350KB (gzip: ~110KB)

## Common Build Errors

| Error | Solution |
|-------|----------|
| Unused variable | Remove or prefix with `_` |
| Missing import | Add import statement |
| Type mismatch | Fix type annotation |
| Module not found | `npm install` |

## Clean Build

7. Remove all caches
```bash
cd frontend && rm -rf node_modules/.vite dist
cd backend && rm -rf .wrangler
```

8. Fresh install and build
```bash
npm install && npm run build
```
