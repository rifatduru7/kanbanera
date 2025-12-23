---
description: Database operations for ERA KANBAN D1
---

# Database Workflow

## Prerequisites
- Wrangler CLI installed
- Logged in: `wrangler login`

// turbo-all

## Local Development

1. Apply schema locally
```bash
cd backend && wrangler d1 execute era-kanban-db --local --file=schema.sql
```

2. Query local database
```bash
cd backend && wrangler d1 execute era-kanban-db --local --command="SELECT * FROM users"
```

3. Reset local database
```bash
cd backend && rm -rf .wrangler/state && wrangler d1 execute era-kanban-db --local --file=schema.sql
```

## Production Database

4. Apply schema to production (caution!)
```bash
cd backend && wrangler d1 execute era-kanban-db --remote --file=schema.sql
```

5. Query production database
```bash
cd backend && wrangler d1 execute era-kanban-db --remote --command="SELECT COUNT(*) FROM tasks"
```

## Migrations

6. Create new migration file
```bash
touch backend/migrations/$(date +%Y%m%d)_description.sql
```

7. Apply migration
```bash
cd backend && wrangler d1 execute era-kanban-db --remote --file=migrations/YYYYMMDD_description.sql
```

## Backup

8. Export production data
```bash
cd backend && wrangler d1 export era-kanban-db --remote --output=backup.sql
```

## Common Queries

```sql
-- Count tasks by status
SELECT c.name, COUNT(t.id) 
FROM columns c 
LEFT JOIN tasks t ON c.id = t.column_id 
GROUP BY c.id;

-- Recent activity
SELECT * FROM activity_log 
ORDER BY created_at DESC 
LIMIT 20;

-- User stats
SELECT u.full_name, COUNT(t.id) as tasks
FROM users u
LEFT JOIN tasks t ON u.id = t.assignee_id
GROUP BY u.id;
```

## Database Schema

Tables:
- `users` - User accounts
- `projects` - Project containers
- `project_members` - Project membership
- `columns` - Kanban columns
- `tasks` - Task cards
- `subtasks` - Task subtasks
- `comments` - Task comments
- `attachments` - File attachments
- `tags` - Project tags
- `task_tags` - Task-tag relationships
- `activity_log` - Activity history
- `sessions` - Refresh token sessions
