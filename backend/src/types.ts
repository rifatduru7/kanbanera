import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

// Cloudflare Worker Bindings
export interface Env {
    DB: D1Database;
    STORAGE: R2Bucket;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    CORS_ORIGIN: string;
}

// User Types
export interface User {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    avatar_url: string | null;
    role: 'admin' | 'member';
    created_at: string;
    updated_at: string;
}

export type UserPublic = Omit<User, 'password_hash'>;

// Project Types
export interface Project {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    is_archived: number;
    created_at: string;
    updated_at: string;
}

export interface ProjectMember {
    id: string;
    project_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joined_at: string;
}

// Column Types
export interface Column {
    id: string;
    project_id: string;
    name: string;
    position: number;
    wip_limit: number | null;
    color: string;
    created_at: string;
}

// Task Types
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
    id: string;
    project_id: string;
    column_id: string;
    title: string;
    description: string | null;
    priority: Priority;
    position: number;
    assignee_id: string | null;
    due_date: string | null;
    labels: string | null; // JSON array
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface TaskWithDetails extends Task {
    subtasks: Subtask[];
    comments: Comment[];
    attachments: Attachment[];
    assignee?: UserPublic | null;
}

// Subtask Types
export interface Subtask {
    id: string;
    task_id: string;
    title: string;
    is_completed: number;
    position: number;
    created_at: string;
}

// Comment Types
export interface Comment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    user?: UserPublic;
}

// Attachment Types
export interface Attachment {
    id: string;
    task_id: string;
    user_id: string;
    file_name: string;
    r2_key: string;
    file_size: number | null;
    mime_type: string | null;
    created_at: string;
}

// Activity Log Types
export type ActivityAction =
    | 'task_created'
    | 'task_updated'
    | 'task_moved'
    | 'task_deleted'
    | 'comment_added'
    | 'attachment_added'
    | 'member_added'
    | 'member_removed';

export interface ActivityLog {
    id: string;
    project_id: string;
    task_id: string | null;
    user_id: string;
    action: ActivityAction;
    details: string | null; // JSON
    created_at: string;
}

// JWT Payload
export interface JWTPayload {
    sub: string; // user id
    email: string;
    role: string;
    iat: number;
    exp: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Request Types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    full_name: string;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
}

export interface CreateTaskRequest {
    title: string;
    description?: string;
    priority?: Priority;
    assignee_id?: string;
    due_date?: string;
    labels?: string[];
}

export interface MoveTaskRequest {
    column_id: string;
    position: number;
}

export interface CreateColumnRequest {
    name: string;
    wip_limit?: number;
    color?: string;
}
