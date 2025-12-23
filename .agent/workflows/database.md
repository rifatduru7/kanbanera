---
description: Database operations for ERA KANBAN D1
---

# Database Workflow

## Create D1 Database
```bash
wrangler d1 create era-kanban-db
```
Copy the `database_id` to `wrangler.toml`.

## Apply Schema
// turbo
```bash
wrangler d1 execute era-kanban-db --file=./backend/schema.sql
```

## Execute SQL Query (Local)
```bash
wrangler d1 execute era-kanban-db --local --command="SELECT * FROM users;"
```

## Execute SQL Query (Remote)
```bash
wrangler d1 execute era-kanban-db --remote --command="SELECT * FROM users;"
```

## Backup Database
```bash
wrangler d1 backup create era-kanban-db
```

## List Backups
```bash
wrangler d1 backup list era-kanban-db
```

## Schema Reference
See `project.md` for full D1 schema with all tables:
- `users`
- `projects`
- `columns`
- `tasks`
- `subtasks`
- `comments`
- `attachments`
