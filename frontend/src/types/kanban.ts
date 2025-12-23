// Task types for Kanban board

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
    id: string;
    title: string;
    description?: string;
    priority: Priority;
    columnId: string;
    position: number;
    assigneeId?: string;
    assigneeName?: string;
    assigneeAvatar?: string;
    dueDate?: string;
    labels?: string[];
    subtaskCount?: number;
    subtaskCompleted?: number;
    commentCount?: number;
    attachmentCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Column {
    id: string;
    name: string;
    position: number;
    color: string;
    wipLimit?: number;
    tasks: Task[];
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BoardData {
    project: Project;
    columns: Column[];
}

// Label color presets
export const LABEL_COLORS = {
    backend: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    frontend: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    design: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
    auth: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    bug: { bg: 'bg-red-500/20', text: 'text-red-400' },
    feature: { bg: 'bg-green-500/20', text: 'text-green-400' },
} as const;

// Priority color mapping
export const PRIORITY_COLORS = {
    low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
} as const;

// Column status colors
export const COLUMN_COLORS = {
    todo: '#6366f1',
    progress: '#1392ec',
    review: '#8b5cf6',
    done: '#22c55e',
} as const;
