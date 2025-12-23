// Extended types for Task Modal

export interface Subtask {
    id: string;
    taskId: string;
    title: string;
    isCompleted: boolean;
    position: number;
    createdAt: string;
}

export interface Comment {
    id: string;
    taskId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    createdAt: string;
}

export interface Attachment {
    id: string;
    taskId: string;
    fileName: string;
    fileSize: number;
    mimeType?: string;
    thumbnailUrl?: string;
    downloadUrl?: string;
    createdAt: string;
}

export interface TaskDetail {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    columnId: string;
    projectId: string;
    projectName: string;
    assigneeId?: string;
    assigneeName?: string;
    assigneeAvatar?: string;
    dueDate?: string;
    labels?: string[];
    subtasks: Subtask[];
    comments: Comment[];
    attachments: Attachment[];
    createdAt: string;
    updatedAt: string;
}
