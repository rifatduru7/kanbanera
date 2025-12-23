# ERA KANBAN - Project Documentation

## Overview
Serverless Kanban project management application built on Cloudflare Workers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Pages                          │
│                   (Frontend - React)                        │
│                   era-kanban.pages.dev                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Workers                        │
│                   (Backend - Hono API)                      │
│                   era-kanban.rifatduru.workers.dev          │
├─────────────────────────┬───────────────────────────────────┤
│                         │                                   │
│    ┌────────────────────┼────────────────────┐              │
│    │                    │                    │              │
│    ▼                    ▼                    ▼              │
│ ┌──────────┐      ┌──────────┐        ┌──────────┐         │
│ │   D1     │      │   B2     │        │   JWT    │         │
│ │ Database │      │ Storage  │        │   Auth   │         │
│ └──────────┘      └──────────┘        └──────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS 4 |
| State | Zustand, TanStack Query |
| UI | Lucide React, @dnd-kit |
| Backend | Cloudflare Workers, Hono |
| Database | Cloudflare D1 (SQLite) |
| Storage | Backblaze B2 (S3-compatible) |
| Auth | JWT (jose library) |

## Folder Structure

```
kanbanera/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Main entry
│   │   ├── types.ts          # TypeScript types
│   │   ├── middleware/
│   │   │   └── auth.ts       # JWT middleware
│   │   └── routes/
│   │       ├── auth.ts       # Auth endpoints
│   │       ├── projects.ts   # Project CRUD
│   │       ├── columns.ts    # Column CRUD
│   │       ├── tasks.ts      # Task CRUD + subtasks/comments
│   │       ├── users.ts      # User search/profile
│   │       └── attachments.ts# File upload (B2)
│   ├── schema.sql            # D1 schema
│   ├── wrangler.toml         # Worker config
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar, Header
│   │   │   ├── kanban/       # Board, Column, TaskCard, TaskModal
│   │   │   └── ui/           # Loading, Error
│   │   ├── pages/
│   │   │   ├── auth/         # LoginPage
│   │   │   └── dashboard/    # DashboardLayout, BoardPage
│   │   ├── hooks/            # useAuth, useKanbanData
│   │   ├── stores/           # authStore
│   │   ├── lib/api/          # API client
│   │   └── types/            # TypeScript types
│   ├── vite.config.ts
│   └── package.json
│
├── .agent/workflows/         # Development workflows
├── README.md                 # User documentation
├── STITCH_PROMPTS.md         # Design prompts
└── ERA_KANBAN_PROMPT.md      # Original requirements
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project with board data

### Columns
- `POST /api/projects/:id/columns` - Create column
- `PUT /api/columns/:id` - Update column
- `DELETE /api/columns/:id` - Delete column
- `PUT /api/columns/reorder` - Reorder columns

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task with details
- `PUT /api/tasks/:id` - Update task
- `PUT /api/tasks/:id/move` - Move task
- `DELETE /api/tasks/:id` - Delete task

### Subtasks & Comments
- `POST /api/tasks/:id/subtasks` - Add subtask
- `PUT /api/tasks/:id/subtasks/:sid/toggle` - Toggle subtask
- `POST /api/tasks/:id/comments` - Add comment

### Attachments
- `GET /api/attachments/task/:id` - List attachments
- `POST /api/attachments/task/:id` - Upload file
- `DELETE /api/attachments/:id` - Delete file

## Database Schema

### Tables
1. `users` - User accounts
2. `projects` - Project containers
3. `project_members` - Project membership (owner, admin, member, viewer)
4. `columns` - Kanban columns with WIP limits
5. `tasks` - Task cards with priority, due date, assignee
6. `subtasks` - Checklist items
7. `comments` - Task comments
8. `attachments` - File metadata (B2 keys)
9. `tags` - Project tags
10. `task_tags` - Many-to-many relationship
11. `activity_log` - Action history
12. `sessions` - Refresh token tracking

## Development Commands

```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build

# Deploy backend
cd backend && wrangler deploy

# Deploy frontend
cd frontend && wrangler pages deploy dist --project-name era-kanban
```

## Environment Variables

### Backend (wrangler.toml)
```toml
[vars]
JWT_SECRET = "..."
JWT_REFRESH_SECRET = "..."
CORS_ORIGIN = "https://era-kanban.pages.dev"
B2_BUCKET_NAME = "..."
B2_ENDPOINT = "..."
B2_KEY_ID = "..."
B2_APP_KEY = "..."
```

### Frontend (.env.production)
```
VITE_API_URL=https://era-kanban.rifatduru.workers.dev
```

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://era-kanban.pages.dev |
| Backend API | https://era-kanban.rifatduru.workers.dev |

---

*Last updated: December 2024*