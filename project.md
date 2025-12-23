# ERA KANBAN - Professional Serverless Project Management App
## Master Implementation Plan (Cloudflare Free Tier Optimized)

### 1. PROJECT OVERVIEW & ROLE
**Role:** You are a Senior Full-Stack Developer and Cloudflare Ecosystem Expert.
**Goal:** Build "ERA KANBAN," a high-performance, serverless Kanban application.
**Critical Constraint:** The application must be strictly architected to run within **Cloudflare Free Tier** limits.

**Free Tier Rules (STRICT):**
1.  **NO Polling Loop:** Do NOT use `setInterval` or continuous polling. It exhausts the 100k requests/day limit. Use "Revalidate on Focus" strategy.
2.  **NO KV Rate Limiting:** Do NOT use Workers KV for request counting (limit is 1k writes/day). Rely on standard WAF protection.
3.  **Storage Efficiency:** Use Presigned URLs for R2 uploads/downloads to bypass Worker CPU time.

---

### 2. 🎨 DESIGN SYSTEM (Era Bulut Theme)
The UI must strictly follow these design tokens.

**Color Palette (Tailwind CSS Variables):**
```css
/* Add these to tailwind.config.js */
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
UI Principles:

Glassmorphism: Use backdrop-blur-md with semi-transparent white backgrounds (bg-white/80) for modals and sticky headers.

Typography: Inter font family. Headings (600/700), Body (400/500).

Interactions: Smooth transitions (transition-all duration-200). Drag & Drop items must have a "lifted" shadow effect.

3. 🛠 TECHNOLOGY STACK
Backend (Cloudflare Workers):

Framework: Hono (Lightweight, ideal for Workers).

Database: Cloudflare D1 (SQLite).

Storage: Cloudflare R2 (S3 Compatible).

Auth: jose library for JWT (Stateless).

Frontend (React 18+):

Build: Vite.

State Management: TanStack Query (React Query) (CRITICAL for sync logic) + Zustand (Global UI state).

Styling: Tailwind CSS 3.4.

Kanban Logic: @dnd-kit/core (Sortable/Draggable).

Icons: Lucide React.

Forms: React Hook Form + Zod.

4. 📊 DATABASE SCHEMA (D1)
Use this exact schema. Ensure foreign keys and constraints are applied.

SQL

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Use crypto.randomUUID() in code
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Columns
CREATE TABLE columns (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  wip_limit INTEGER
);

-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES columns(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  position INTEGER NOT NULL,
  assignee_id TEXT REFERENCES users(id),
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Subtasks
CREATE TABLE subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  position INTEGER NOT NULL
);

-- Comments
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Attachments (Metadata for R2)
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
5. 🔐 AUTHENTICATION & SECURITY
JWT Strategy:

Access Token: Short lifespan (15 mins). Sent in JSON body. Stored in memory/Zustand.

Refresh Token: Long lifespan (7 days). Stored in HttpOnly, Secure Cookie.

Endpoints:

POST /api/auth/register

POST /api/auth/login

POST /api/auth/refresh (Checks cookie, issues new Access Token)

POST /api/auth/logout

6. 📡 API STRATEGY & SYNC (Free Tier Fix)
The Problem: Polling every 5s kills Free Tier limits. The Solution:

React Query Configuration:

TypeScript

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Auto-sync when user returns to tab
      staleTime: 1000 * 60 * 1,   // Data is fresh for 1 minute
      retry: 1,
    },
  },
});
Manual Sync:

Add a "Refresh" button in the Top Bar.

Add a visual indicator: "Last synced: 2 mins ago".

Optimistic Updates (Kanban):

When moving a card:

Update UI State immediately (Zustand/Cache).

Fire PUT /api/tasks/:id/move.

If API fails -> Rollback UI + Show Toast Error.

If API success -> Do nothing (UI is already correct).

7. 📂 FILE UPLOAD STRATEGY (R2)
To save Worker CPU and RAM:

Client: Request Upload URL -> POST /api/tasks/:id/attachment/presign

Worker: Generate S3 Presigned PUT URL.

Client: Upload file directly to R2 using that URL.

Client: Confirm upload -> POST /api/tasks/:id/attachment/confirm (Saves metadata to D1).

8. 🧩 FRONTEND COMPONENT STRUCTURE
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx      # Navigation
│   │   └── Topbar.tsx       # Search, Profile, Sync Status
│   ├── kanban/
│   │   ├── Board.tsx        # Main DndContext
│   │   ├── Column.tsx       # Droppable
│   │   ├── TaskCard.tsx     # Draggable, Glassmorphism style
│   │   └── TaskModal.tsx    # Details, Subtasks, Comments
│   └── ui/                  # Reusable (Button, Input, Avatar)
├── hooks/
│   ├── useKanbanData.ts     # React Query hooks
│   └── useAuth.ts
└── pages/
    ├── Dashboard.tsx
    ├── ProjectView.tsx
    └── Login.tsx
9. 🚀 DEPLOYMENT CONFIG (wrangler.toml)
Ini, TOML

name = "era-kanban"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "era-kanban-db"
database_id = "YOUR_ID_HERE"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "era-kanban-files"

[vars]
JWT_SECRET = "development_secret"
📋 INSTRUCTIONS FOR AI
Step 1: Generate the Hono Backend structure first. Include the D1 schema and Auth logic (Register/Login).

Step 2: Generate the Frontend Scaffold (Vite + Tailwind). Setup the Era Bulut theme in tailwind.config.js.

Step 3: Create the Kanban Board components using @dnd-kit. Focus heavily on the "Optimistic Update" logic in useKanbanData.ts to ensure the UI feels fast without polling.

Step 4: Implement the Task Detail Modal with Subtasks and Comments.

Start by generating the Backend API with Hono and the D1 Schema.