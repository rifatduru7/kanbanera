-- Migration: New Features (Time Tracking, Presence, Client Portal, Visual Automation)

-- Time Entries (Smart Time Tracking)
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  duration_seconds INTEGER,
  note TEXT,
  is_manual INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_active ON time_entries(user_id, ended_at);

-- User Presence (Real-time Polling)
CREATE TABLE IF NOT EXISTS user_presence (
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  current_view TEXT,
  current_task_id TEXT,
  PRIMARY KEY (user_id, project_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_presence_project ON user_presence(project_id, last_seen_at);

-- Board Events (Delta-based updates)
CREATE TABLE IF NOT EXISTS board_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_board_events_project ON board_events(project_id, created_at);

-- Client Portals
CREATE TABLE IF NOT EXISTS client_portals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  is_active INTEGER DEFAULT 1,
  allowed_columns TEXT,
  branding TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_client_portals_token ON client_portals(token);
CREATE INDEX IF NOT EXISTS idx_client_portals_project ON client_portals(project_id);

-- Portal Comments
CREATE TABLE IF NOT EXISTS portal_comments (
  id TEXT PRIMARY KEY,
  portal_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_portal_comments_task ON portal_comments(task_id);

-- Task Approvals
CREATE TABLE IF NOT EXISTS portal_approvals (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  portal_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'revision', 'pending')),
  reviewer_name TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (portal_id) REFERENCES client_portals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_portal_approvals_task ON portal_approvals(task_id);

-- Automation Flows (Visual Workflow Builder)
CREATE TABLE IF NOT EXISTS automation_flows (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  flow_data TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_automation_flows_project ON automation_flows(project_id);

-- Flow Executions (Workflow run history)
CREATE TABLE IF NOT EXISTS flow_executions (
  id TEXT PRIMARY KEY,
  flow_id TEXT NOT NULL,
  trigger_data TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  result_data TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  error_message TEXT,
  FOREIGN KEY (flow_id) REFERENCES automation_flows(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow ON flow_executions(flow_id, started_at);
