import { api } from './client';
import type { ApiResponse } from './client';

export interface ClientPortal {
    id: string;
    projectId: string;
    name: string;
    token: string;
    isActive: boolean;
    allowedColumns: string[] | null;
    branding: { logo_url?: string; primary_color?: string } | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface PortalTask {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    dueDate: string | null;
    columnId: string;
    columnName: string;
    assigneeName: string | null;
    subtaskTotal: number;
    subtaskCompleted: number;
    approval: { status: string; reviewerName: string; note: string | null; createdAt: string } | null;
    portalComments: Array<{ id: string; authorName: string; content: string; createdAt: string }>;
}

export interface PortalData {
    portal: { name: string; branding: Record<string, string> | null; projectName: string };
    columns: Array<{ id: string; name: string; color: string }>;
    tasks: PortalTask[];
    stats: { total: number; completed: number; percent: number };
}

export const portalApi = {
    // Management (requires JWT)
    create: async (data: { project_id: string; name: string; allowed_columns?: string[]; branding?: Record<string, string> }) => {
        const response = await api.post<ApiResponse<{ portal: ClientPortal }>>('/api/portal/manage', data);
        return response.data;
    },
    list: async (projectId: string) => {
        const response = await api.get<ApiResponse<{ portals: ClientPortal[] }>>(`/api/portal/manage/${projectId}`);
        return response.data;
    },
    update: async (portalId: string, data: Partial<{ name: string; allowed_columns: string[]; branding: Record<string, string>; is_active: boolean }>) => {
        const response = await api.put<ApiResponse<{ portal: ClientPortal }>>(`/api/portal/manage/${portalId}`, data);
        return response.data;
    },
    remove: async (portalId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/portal/manage/${portalId}`);
        return response.data;
    },
    // Public (no JWT - token-based)
    getPublic: async (token: string) => {
        const response = await api.get<ApiResponse<PortalData>>(`/api/portal/public/${token}`);
        return response.data;
    },
    addComment: async (token: string, data: { task_id: string; author_name: string; author_email?: string; content: string }) => {
        const response = await api.post<ApiResponse<{ comment: Record<string, unknown> }>>(`/api/portal/public/${token}/comments`, data);
        return response.data;
    },
    approve: async (token: string, taskId: string, data: { status: 'approved' | 'revision'; reviewer_name: string; note?: string }) => {
        const response = await api.post<ApiResponse<{ approval: Record<string, unknown> }>>(`/api/portal/public/${token}/approve/${taskId}`, data);
        return response.data;
    },
};
