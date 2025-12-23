# ERA KANBAN - Professional Project Management Application

## Project Overview
Develop a fully serverless Kanban project management application running on Cloudflare Workers, utilizing D1 database and R2 storage. The application must include multi-user support, task assignments, performance metrics, file uploads, and calendar integration.

---

## 🎨 DESIGN SYSTEM

### Color Palette (Era Bulut Theme)
```css
:root {
  /* Primary Colors */
  --primary-50: #f0fdfa;
  --primary-100: #ccfbf1;
  --primary-200: #99f6e4;
  --primary-300: #5eead4;
  --primary-400: #2dd4bf;
  --primary-500: #14b8a6;
  --primary-600: #0d9488;
  --primary-700: #0f766e;
  --primary-800: #115e59;
  --primary-900: #134e4a;
  
  /* Neutral Colors */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  /* Priority Colors */
  --priority-low: #22c55e;
  --priority-medium: #f59e0b;
  --priority-high: #f97316;
  --priority-critical: #ef4444;
  
  /* Status Colors */
  --status-todo: #6366f1;
  --status-in-progress: #0d9488;
  --status-review: #8b5cf6;
  --status-done: #22c55e;
  
  /* Tag Colors */
  --tag-bug: #ef4444;
  --tag-feature: #3b82f6;
  --tag-urgent: #f97316;
  --tag-improvement: #8b5cf6;
  --tag-documentation: #6b7280;
}
```

### Typography
- **Font Family:** Inter, system-ui, sans-serif
- **Headings:** font-weight 600-700
- **Body:** font-weight 400-500
- **Font Sizes:** 12px, 14px, 16px, 18px, 24px, 32px

### Design Principles
- Glassmorphism effects on cards (backdrop-blur, semi-transparent white backgrounds)
- Soft shadows (box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1))
- Border radius: 8px (small), 12px (medium), 16px (large)
- Smooth transitions (transition: all 0.2s ease)
- Hover effects (scale, shadow increase)
- Gradient backgrounds (primary-600 to primary-700)

---

## 🛠 TECHNOLOGY STACK

### Backend
- **Runtime:** Cloudflare Workers (ES Modules format)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 (S3-compatible)
- **Authentication:** JWT (jose library)
- **API Format:** RESTful JSON API
- **Rate Limiting:** Custom middleware

### Frontend
- **Framework:** React 18+ with TypeScript
- **State Management:** Zustand or React Context + useReducer
- **Styling:** Tailwind CSS 3.4+
- **Drag & Drop:** @dnd-kit/core or react-beautiful-dnd
- **Charts:** Recharts or Chart.js
- **Calendar:** react-big-calendar or FullCalendar
- **Icons:** Lucide React
- **Date Handling:** date-fns
- **HTTP Client:** Native fetch with custom hooks
- **Form Handling:** React Hook Form + Zod validation

### Build & Deploy
- **Build Tool:** Vite
- **Deploy:** Cloudflare Pages (frontend) + Workers (API)

---

## 📊 DATABASE SCHEMA (D1)

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#0d9488',
  owner_id TEXT NOT NULL REFERENCES users(id),
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Project Members
CREATE TABLE project_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, user_id)
);

-- Kanban Columns
CREATE TABLE columns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  position INTEGER NOT NULL,
  wip_limit INTEGER, -- Work in Progress limit
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tasks (Cards)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES columns(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  position INTEGER NOT NULL,
  assignee_id TEXT REFERENCES users(id),
  reporter_id TEXT NOT NULL REFERENCES users(id),
  due_date TEXT,
  estimated_hours REAL,
  actual_hours REAL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Subtasks
CREATE TABLE subtasks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  position INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tags
CREATE TABLE tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  UNIQUE(project_id, name)
);

-- Task-Tag Relationship
CREATE TABLE task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Comments
CREATE TABLE comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- File Attachments
CREATE TABLE attachments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Activity Log
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT, -- JSON string
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sessions (JWT refresh tokens)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_subtasks_task ON subtasks(task_id);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_activity_project ON activity_logs(project_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);
```

---

## 🔐 AUTHENTICATION SYSTEM

### JWT Configuration
```typescript
interface JWTPayload {
  sub: string; // user_id
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Access Token: 15 minutes
// Refresh Token: 7 days
```

### API Endpoints - Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | New user registration |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user info |
| PUT | `/api/auth/password` | Change password |

### Password Security
- Minimum 8 characters
- bcrypt or Argon2 hash (Workers compatible: @node-rs/bcrypt)
- Rate limiting: 5 attempts/minute

---

## 📡 API ENDPOINTS

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/members` | Project members |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:uid` | Remove member |

### Columns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/columns` | List columns |
| POST | `/api/projects/:id/columns` | Create column |
| PUT | `/api/columns/:id` | Update column |
| DELETE | `/api/columns/:id` | Delete column |
| PUT | `/api/columns/reorder` | Reorder columns |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | List tasks |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/tasks/:id` | Task details |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PUT | `/api/tasks/:id/move` | Move task (column/position) |
| PUT | `/api/tasks/reorder` | Bulk reorder |
| GET | `/api/projects/:id/tasks/archived` | Archived tasks |

### Subtasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/:id/subtasks` | List subtasks |
| POST | `/api/tasks/:id/subtasks` | Add subtask |
| PUT | `/api/subtasks/:id` | Update subtask |
| DELETE | `/api/subtasks/:id` | Delete subtask |
| PUT | `/api/subtasks/:id/toggle` | Toggle completion |

### Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tags` | List tags |
| POST | `/api/projects/:id/tags` | Create tag |
| PUT | `/api/tags/:id` | Update tag |
| DELETE | `/api/tags/:id` | Delete tag |
| POST | `/api/tasks/:id/tags/:tagId` | Add tag to task |
| DELETE | `/api/tasks/:id/tags/:tagId` | Remove tag from task |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/:id/comments` | List comments |
| POST | `/api/tasks/:id/comments` | Add comment |
| PUT | `/api/comments/:id` | Edit comment |
| DELETE | `/api/comments/:id` | Delete comment |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/:id/attachments` | List attachments |
| POST | `/api/tasks/:id/attachments` | Upload file |
| DELETE | `/api/attachments/:id` | Delete file |
| GET | `/api/attachments/:id/download` | Download file |

### Calendar
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/calendar?start=2024-01-01&end=2024-01-31&view=month\|week` | Calendar data |

### Metrics & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/metrics` | Project metrics |
| GET | `/api/projects/:id/metrics/burndown` | Burndown chart |
| GET | `/api/projects/:id/metrics/velocity` | Velocity chart |
| GET | `/api/users/:id/metrics` | User metrics |
| GET | `/api/projects/:id/activity` | Activity log |

### Polling Endpoint
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/sync?since=2024-01-15T10:30:00Z` | Latest changes |

**Response:**
```json
{
  "tasks": [],
  "columns": [],
  "timestamp": ""
}
```

---

## 🖥 FRONTEND PAGE STRUCTURE

### Page Routes
| Route | Description |
|-------|-------------|
| `/` | Landing/Login page |
| `/login` | Login |
| `/register` | Registration |
| `/dashboard` | Main dashboard |
| `/projects` | Project list |
| `/projects/:id` | Kanban board |
| `/projects/:id/calendar` | Calendar view |
| `/projects/:id/metrics` | Metrics & Reports |
| `/projects/:id/settings` | Project settings |
| `/projects/:id/archived` | Archived tasks |
| `/profile` | User profile |
| `/settings` | Application settings |

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  Header (Logo, Search, Notifications, Profile)              │
├─────────┬───────────────────────────────────────────────────┤
│         │                                                   │
│ Sidebar │              Main Content Area                    │
│         │                                                   │
│ - Home  │  ┌─────────────────────────────────────────────┐  │
│ - Proj  │  │  Kanban Board / Calendar / Metrics          │  │
│ - Cal   │  │                                             │  │
│ - Report│  │                                             │  │
│         │  │                                             │  │
│         │  └─────────────────────────────────────────────┘  │
│         │                                                   │
└─────────┴───────────────────────────────────────────────────┘
```

---

## 🎴 KANBAN BOARD DETAILS

### Column Structure
```typescript
interface Column {
  id: string;
  name: string;
  color: string;
  position: number;
  wipLimit?: number;
  tasks: Task[];
  taskCount: number;
}

// Default columns
const defaultColumns = [
  { name: "Backlog", color: "#6366f1" },
  { name: "To Do", color: "#0d9488" },
  { name: "In Progress", color: "#f59e0b" },
  { name: "Review", color: "#8b5cf6" },
  { name: "Done", color: "#22c55e" }
];
```

### Card (Task) Structure
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: User;
  reporter: User;
  tags: Tag[];
  subtasks: Subtask[];
  subtaskProgress: number; // 0-100
  attachmentCount: number;
  commentCount: number;
  dueDate?: Date;
  isOverdue: boolean;
  estimatedHours?: number;
  actualHours: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Card Layout
```
┌────────────────────────────────────┐
│ [Bug] [Urgent]           ⋮ Menu   │  <- Tags
├────────────────────────────────────┤
│ Database optimization              │  <- Title
│                                    │
│ 📎 3  💬 5  ✓ 4/6                 │  <- Attachments, Comments, Subtasks
├────────────────────────────────────┤
│ [████████░░] 67%                   │  <- Subtask progress
├────────────────────────────────────┤
│ 🔴 Critical  📅 Dec 23            │  <- Priority, Due Date
│ 👤 Rifat K.  ⏱ 4/8 hrs           │  <- Assignee, Time
└────────────────────────────────────┘
```

### Drag & Drop Behaviors
- Reorder within same column
- Move between columns
- WIP limit warning on exceed
- Optimistic UI update
- Backend sync verification

---

## 📅 CALENDAR MODULE

### Views
1. **Monthly View** - Classic calendar grid
2. **Weekly View** - 7-day detailed view

### Calendar Features
```typescript
interface CalendarEvent {
  id: string;
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  priority: string;
  color: string; // Based on priority
  assignee?: User;
  isCompleted: boolean;
}
```

### Interactions
- Click on date → Show tasks for that day in modal
- Click on task → Open task detail modal
- Drag & Drop → Update task date (optional)
- Color coding → Based on priority

---

## 📈 METRICS AND REPORTS

### Dashboard Metrics
```typescript
interface ProjectMetrics {
  // General Statistics
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  
  // Time Metrics
  averageCompletionTime: number; // hours
  averageLeadTime: number; // days
  
  // Productivity
  completionRate: number; // %
  onTimeDeliveryRate: number; // %
  
  // User-Based
  tasksByUser: {
    userId: string;
    userName: string;
    completed: number;
    inProgress: number;
    overdue: number;
  }[];
}
```

### Chart Types

#### 1. Sprint Burndown Chart
```
Task Count
     │
  30 │╲
     │ ╲___  Ideal
  20 │    ╲____
     │  ●───●   ╲___
  10 │      ●───●   ╲
     │          ●───●
   0 │________________╲____
     Day 1  3   5   7   10
```

#### 2. Weekly/Monthly Productivity
```
Completed
     │
  25 │      ████
  20 │ ████ ████
  15 │ ████ ████ ████
  10 │ ████ ████ ████ ████
   5 │ ████ ████ ████ ████
   0 │______________________
     Wk 1   2    3    4
```

#### 3. Priority Distribution (Pie Chart)
```
    ╭─────────╮
   ╱ Critical  ╲
  │   15%      │
  │  High      │
  │   25%      │
   ╲ Medium 40%╱
    ╰─────────╯
     Low 20%
```

#### 4. Delay Rate Trend
```
%
20 │
15 │    ●
10 │  ●   ●
 5 │●       ●───●
 0 │______________
   Jan Feb Mar Apr May
```

---

## 🔔 POLLING MECHANISM

### Client-Side Implementation
```typescript
const POLL_INTERVAL = 5000; // 5 seconds

function useSyncPolling(projectId: string) {
  const [lastSync, setLastSync] = useState(new Date().toISOString());
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch(
        `/api/projects/${projectId}/sync?since=${lastSync}`
      );
      const changes = await response.json();
      
      if (changes.tasks.length > 0 || changes.columns.length > 0) {
        // Update state
        applyChanges(changes);
        setLastSync(changes.timestamp);
      }
    }, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [projectId, lastSync]);
}
```

### Optimistic Updates
- UI updates immediately
- API call in background
- Rollback on error
- Server wins on conflict

---

## 🛡 RATE LIMITING

### Limits
```typescript
const rateLimits = {
  // General API
  api: { requests: 100, window: 60 }, // 100 req/minute
  
  // Auth endpoints
  login: { requests: 5, window: 60 }, // 5 attempts/minute
  register: { requests: 3, window: 60 },
  
  // File upload
  upload: { requests: 10, window: 60 }, // 10 files/minute
  
  // Polling
  sync: { requests: 30, window: 60 } // 30 req/minute
};
```

### Middleware
```typescript
async function rateLimit(request: Request, env: Env, config: RateLimitConfig) {
  const ip = request.headers.get('CF-Connecting-IP');
  const key = `rate:${config.name}:${ip}`;
  
  // Check with D1 or KV
  const current = await env.KV.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count >= config.requests) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  await env.KV.put(key, String(count + 1), { expirationTtl: config.window });
}
```

---

## 📁 FILE UPLOAD (R2)

### Supported Formats
```typescript
const allowedTypes = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf']
};

const maxFileSize = 10 * 1024 * 1024; // 10MB
```

### Upload Flow
1. Client → POST `/api/tasks/:id/attachments` (multipart/form-data)
2. Server → File validation (type, size)
3. Server → Upload to R2 (with unique key)
4. Server → Save metadata to D1
5. Server → Response (attachment object)

### R2 Key Structure
```
attachments/{project_id}/{task_id}/{uuid}_{original_filename}
```

---

## 🧩 COMPONENT STRUCTURE

### Core Components
```
src/
├── components/
│   ├── ui/                    # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Tooltip.tsx
│   │   └── Skeleton.tsx
│   │
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MainLayout.tsx
│   │   └── AuthLayout.tsx
│   │
│   ├── kanban/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskDetailModal.tsx
│   │   ├── CreateTaskModal.tsx
│   │   ├── SubtaskList.tsx
│   │   ├── CommentSection.tsx
│   │   ├── AttachmentList.tsx
│   │   └── TagSelector.tsx
│   │
│   ├── calendar/
│   │   ├── CalendarView.tsx
│   │   ├── MonthView.tsx
│   │   ├── WeekView.tsx
│   │   ├── DayTasksModal.tsx
│   │   └── CalendarToolbar.tsx
│   │
│   ├── metrics/
│   │   ├── MetricsDashboard.tsx
│   │   ├── BurndownChart.tsx
│   │   ├── VelocityChart.tsx
│   │   ├── PriorityDistribution.tsx
│   │   ├── UserPerformance.tsx
│   │   └── StatCard.tsx
│   │
│   └── project/
│       ├── ProjectList.tsx
│       ├── ProjectCard.tsx
│       ├── ProjectSettings.tsx
│       ├── MemberManager.tsx
│       └── ArchivedTasks.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useTasks.ts
│   ├── useProjects.ts
│   ├── usePolling.ts
│   └── useDebounce.ts
│
├── stores/
│   ├── authStore.ts
│   ├── projectStore.ts
│   ├── taskStore.ts
│   └── uiStore.ts
│
├── services/
│   ├── api.ts
│   ├── auth.ts
│   ├── tasks.ts
│   ├── projects.ts
│   └── upload.ts
│
├── types/
│   ├── auth.ts
│   ├── task.ts
│   ├── project.ts
│   └── api.ts
│
└── utils/
    ├── date.ts
    ├── validation.ts
    ├── formatters.ts
    └── constants.ts
```

---

## ✅ FEATURE CHECKLIST

### Authentication
- [ ] User registration (email, password, name)
- [ ] Login
- [ ] JWT token management
- [ ] Password reset
- [ ] Profile update
- [ ] Logout

### Project Management
- [ ] Create project
- [ ] Edit project
- [ ] Delete/archive project
- [ ] Invite members
- [ ] Member role management
- [ ] Project settings

### Kanban Board
- [ ] Column CRUD operations
- [ ] Create task
- [ ] Edit task
- [ ] Delete/archive task
- [ ] Drag & drop movement
- [ ] Column reordering
- [ ] WIP limit warnings

### Task Details
- [ ] Title and description
- [ ] Priority selection
- [ ] User assignment
- [ ] Due date
- [ ] Estimated time
- [ ] Subtasks
- [ ] Tags
- [ ] Comments
- [ ] File attachments

### Calendar
- [ ] Monthly view
- [ ] Weekly view
- [ ] Day detail modal
- [ ] Task color coding
- [ ] Date-task linking

### Metrics
- [ ] Average completion time
- [ ] User-based performance
- [ ] Burndown chart
- [ ] Productivity graph
- [ ] Delay rates
- [ ] Priority distribution

### Archive & History
- [ ] View closed tasks
- [ ] Restore tasks
- [ ] Activity log
- [ ] Filtering

### Technical
- [ ] Polling mechanism
- [ ] Optimistic updates
- [ ] Rate limiting
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design

---

## 🚀 DEPLOYMENT

### Cloudflare Configuration
```toml
# wrangler.toml
name = "era-kanban-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "era-kanban"
database_id = "<DATABASE_ID>"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "era-kanban-files"

[vars]
ENVIRONMENT = "production"
JWT_ISSUER = "era-kanban"

# Secrets (add via wrangler secret)
# JWT_SECRET
# BCRYPT_SALT_ROUNDS
```

### Frontend Deploy (Cloudflare Pages)
```bash
# Build command
npm run build

# Build output directory
dist

# Environment variables
VITE_API_URL=https://api.era-kanban.workers.dev
```

---

## 📝 ADDITIONAL NOTES

1. **Accessibility:** ARIA labels, keyboard navigation, focus management
2. **i18n Ready:** Turkish default, language support infrastructure
3. **Error Boundaries:** React error boundaries for graceful error handling
4. **PWA:** Service worker for basic offline support (optional)
5. **SEO:** Meta tags, Open Graph (for login page)

---

Use this prompt to develop a fully functional Kanban application. Stay true to the Era Bulut theme, apply modern UI/UX principles, and create a performant, secure application.
