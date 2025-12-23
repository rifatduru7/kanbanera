# ERA KANBAN

A fully serverless Kanban project management application built on Cloudflare Workers with D1 database and Backblaze B2 storage.

![ERA KANBAN](https://img.shields.io/badge/Cloudflare-Workers-orange) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

## 🚀 Live Demo

- **Frontend:** https://era-kanban.pages.dev
- **Backend API:** https://era-kanban.rifatduru.workers.dev

---

## ✨ Features

### Core
- ✅ Kanban board with drag-and-drop
- ✅ Task management (create, edit, delete, move)
- ✅ Subtasks with progress tracking
- ✅ Comments thread
- ✅ File attachments (Backblaze B2)
- ✅ JWT authentication (access + refresh tokens)

### Coming Soon
- 📋 Tags & labels system
- 📅 Calendar view
- 📊 Metrics dashboard with charts
- 👥 Team member management
- 🔔 Real-time updates (polling)

---

## 🛠 Tech Stack

### Backend
- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Backblaze B2 (S3-compatible)
- **Framework:** Hono
- **Auth:** JWT (jose library)

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS 4
- **State:** Zustand + TanStack Query
- **Drag & Drop:** @dnd-kit
- **Icons:** Lucide React

---

## 📁 Project Structure

```
kanbanera/
├── backend/                 # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts        # Main entry
│   │   ├── types.ts        # TypeScript types
│   │   ├── middleware/     # Auth, rate limiting
│   │   └── routes/         # API endpoints
│   ├── schema.sql          # D1 database schema
│   └── wrangler.toml       # Cloudflare config
│
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # React Query hooks
│   │   ├── stores/         # Zustand stores
│   │   └── lib/api/        # API client
│   └── vite.config.ts
│
└── .agent/workflows/       # Development workflows
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
# Clone repository
git clone https://github.com/rifatduru7/kanbanera.git
cd kanbanera

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Development

```bash
# Terminal 1: Backend
cd backend && npm run dev
# Runs at http://localhost:8787

# Terminal 2: Frontend
cd frontend && npm run dev
# Runs at http://localhost:5173
```

### Environment Variables

**Frontend (.env.local):**
```env
VITE_API_URL=http://localhost:8787
```

**Backend (wrangler.toml):**
```toml
[vars]
JWT_SECRET = "your-secret"
JWT_REFRESH_SECRET = "your-refresh-secret"
CORS_ORIGIN = "http://localhost:5173"
B2_BUCKET_NAME = "your-bucket"
B2_ENDPOINT = "https://s3.us-west-004.backblazeb2.com"
B2_KEY_ID = "your-key-id"
B2_APP_KEY = "your-app-key"
```

---

## 📦 Deployment

### Backend (Cloudflare Workers)

```bash
cd backend

# Create D1 database
wrangler d1 create era-kanban-db

# Apply schema
wrangler d1 execute era-kanban-db --remote --file=schema.sql

# Deploy
wrangler deploy
```

### Frontend (Cloudflare Pages)

```bash
cd frontend

# Build
npm run build

# Deploy
wrangler pages deploy dist --project-name era-kanban
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project with board |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| PUT | `/api/tasks/:id/move` | Move task |
| DELETE | `/api/tasks/:id` | Delete task |

### Subtasks & Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/:id/subtasks` | Add subtask |
| PUT | `/api/tasks/:id/subtasks/:sid/toggle` | Toggle subtask |
| POST | `/api/tasks/:id/comments` | Add comment |

---

## 🎨 Design System

### Colors (Era Bulut Theme)
- Primary: `#14b8a6` (Teal)
- Background: `#0f1419`
- Surface: `#1e293b`
- Border: `#233948`

### Effects
- Glassmorphism panels with backdrop blur
- Smooth transitions (200ms)
- Hover scale effects
- Gradient backgrounds

---

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

Built with ❤️ using Cloudflare Workers, React, and TypeScript.
