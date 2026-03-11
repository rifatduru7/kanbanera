CREATE TABLE mfa_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login_email', 'enable_email_2fa')),
  method TEXT NOT NULL CHECK (method IN ('email')),
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  consumed_at TEXT,
  sent_to TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mfa_challenges_user_purpose
  ON mfa_challenges(user_id, purpose, consumed_at, expires_at);

PRAGMA foreign_keys=off;

CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  column_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  position INTEGER NOT NULL,
  assignee_id TEXT,
  due_date TEXT,
  labels TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

INSERT INTO tasks_new (
  id,
  project_id,
  column_id,
  title,
  description,
  priority,
  position,
  assignee_id,
  due_date,
  labels,
  created_by,
  created_at,
  updated_at
)
SELECT
  id,
  project_id,
  column_id,
  title,
  description,
  priority,
  position,
  assignee_id,
  due_date,
  labels,
  created_by,
  created_at,
  updated_at
FROM tasks;

DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);

PRAGMA foreign_keys=on;
