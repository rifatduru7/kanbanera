---
description: Initial project setup for ERA KANBAN
---

# ERA KANBAN Project Setup

This workflow sets up the complete project structure.

## Prerequisites
- Node.js 18+ installed
- Cloudflare account with Wrangler CLI configured

## Steps

### 1. Create Backend (Hono Worker)
// turbo
```bash
npm create hono@latest backend -- --template cloudflare-workers
```

### 2. Install Backend Dependencies
```bash
cd backend && npm install jose @cloudflare/d1 && npm install -D wrangler
```

### 3. Create Frontend (Vite + React)
// turbo
```bash
npm create vite@latest frontend -- --template react-ts
```

### 4. Install Frontend Dependencies
```bash
cd frontend && npm install @tanstack/react-query zustand @dnd-kit/core @dnd-kit/sortable lucide-react react-hook-form zod @hookform/resolvers
```

### 5. Install Tailwind CSS
```bash
cd frontend && npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
```

### 6. Configure Tailwind
Add the Era Bulut theme colors to `tailwind.config.js`

### 7. Create D1 Database
```bash
wrangler d1 create era-kanban-db
```

### 8. Create R2 Bucket
```bash
wrangler r2 bucket create era-kanban-files
```

### 9. Apply Database Schema
```bash
wrangler d1 execute era-kanban-db --file=./schema.sql
```
