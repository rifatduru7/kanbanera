# ERA KANBAN System Rules

This document defines the strict coding and design standards for the ERA KANBAN project. All future development must adhere to these rules to maintain the project's premium quality and architectural integrity.

## 1. Technology Stack & Architecture

### Backend (Cloudflare Workers)
- **Framework**: Hono (Lightweight, ideal for Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3 Compatible)
- **Auth**: `jose` library for JWT (Stateless)

### Frontend (React 18+)
- **Build**: Vite
- **State Management**: TanStack Query (React Query) + Zustand
- **Styling**: Tailwind CSS 3.4
- **Kanban Logic**: `@dnd-kit/core` (Sortable/Draggable)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod

---

## 2. Cloudflare Free Tier Constraints (CRITICAL)

> [!CAUTION]
> These rules are **non-negotiable** to stay within free tier limits.

1. **NO Polling Loops:** Do NOT use `setInterval` or continuous polling. It exhausts the 100k requests/day limit. Use "Revalidate on Focus" strategy.
2. **NO KV Rate Limiting:** Do NOT use Workers KV for request counting (limit is 1k writes/day). Rely on standard WAF protection.
3. **Storage Efficiency:** Use Presigned URLs for R2 uploads/downloads to bypass Worker CPU time.

---

## 3. Design Aesthetics & Philosophy (Era Bulut Theme)

### Color Palette
```css
colors: {
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    500: '#14b8a6',
    600: '#0d9488', /* BRAND COLOR */
    700: '#0f766e',
    900: '#134e4a',
  },
  status: {
    todo: '#6366f1',       /* Indigo */
    progress: '#0d9488',   /* Teal */
    review: '#8b5cf6',     /* Purple */
    done: '#22c55e',       /* Green */
  },
  priority: {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  }
}
```

### UI Principles
- **Glassmorphism**: Use `backdrop-blur-md` with semi-transparent white backgrounds (`bg-white/80`) for modals and sticky headers.
- **Typography**: Inter font family. Headings (600/700), Body (400/500).
- **Interactions**: Smooth transitions (`transition-all duration-200`). Drag & Drop items must have a "lifted" shadow effect.
- **Prohibited**:
    - Generic/Bootstrap-like designs
    - Plain, flat backgrounds without texture or depth
    - Default browser fonts

---

## 4. Directory Structure

```
era-kanban/
├── src/               # Backend (Hono Worker)
│   ├── index.ts       # Main entry point
│   ├── routes/        # API routes
│   ├── middleware/    # Auth middleware
│   └── db/            # D1 schema and queries
├── frontend/          # Frontend (Vite + React)
│   └── src/
│       ├── components/
│       │   ├── layout/    # Sidebar, Topbar
│       │   ├── kanban/    # Board, Column, TaskCard, TaskModal
│       │   └── ui/        # Button, Input, Avatar
│       ├── hooks/         # useKanbanData, useAuth
│       └── pages/         # Dashboard, ProjectView, Login
└── wrangler.toml      # Cloudflare config
```

---

## 5. Coding Conventions

- **File Naming**: Kebab-case for directories (e.g., `task-modal`), PascalCase for components (e.g., `TaskModal.tsx`).
- **Language**: TypeScript. Strict type checking is mandatory. **No `any` types allowed.**
- **Imports**: Use relative imports within packages, absolute with aliases (`@/`) where configured.

---

## 6. API Strategy & Sync (Free Tier Optimized)

### React Query Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Auto-sync when user returns to tab
      staleTime: 1000 * 60 * 1,   // Data is fresh for 1 minute
      retry: 1,
    },
  },
});
```

### Optimistic Updates (Kanban)
When moving a card:
1. Update UI State immediately (Zustand/Cache).
2. Fire `PUT /api/tasks/:id/move`.
3. If API fails → Rollback UI + Show Toast Error.
4. If API success → Do nothing (UI is already correct).

---

## 7. Authentication Strategy

- **Access Token**: Short lifespan (15 mins). Stored in memory/Zustand.
- **Refresh Token**: Long lifespan (7 days). Stored in `HttpOnly`, `Secure` Cookie.

### Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

---

## 8. File Upload Strategy (R2)

To save Worker CPU and RAM:
1. Client requests upload URL → `POST /api/tasks/:id/attachment/presign`
2. Worker generates S3 Presigned PUT URL.
3. Client uploads file directly to R2 using that URL.
4. Client confirms upload → `POST /api/tasks/:id/attachment/confirm` (Saves metadata to D1).

---

## 9. Verification Checklist

Before marking a task as complete, verify:
1. **Build**: Does `npm run build` pass without errors?
2. **Lint**: Are there any ESLint or TypeScript errors?
3. **Deploy**: Does `wrangler deploy` work locally?
4. **Console**: Are there any errors in the browser console?
5. **Aesthetics**: Does it look "Premium"?

---
*Generated for ERA KANBAN Project*
