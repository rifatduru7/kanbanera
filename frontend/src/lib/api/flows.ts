import { api } from './client';
import type { ApiResponse } from './client';

export interface AutomationFlow {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    flowData: { nodes: FlowNode[]; edges: FlowEdge[] };
    isActive: boolean;
    createdBy: string;
    createdByName: string | null;
    executionCount: number;
    lastExecutedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
}

export interface FlowExecution {
    id: string;
    flowId: string;
    triggerData: Record<string, unknown> | null;
    status: 'running' | 'completed' | 'failed';
    resultData: Record<string, unknown> | null;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
}

export const flowsApi = {
    list: async (projectId: string) => {
        const response = await api.get<ApiResponse<{ flows: AutomationFlow[] }>>(`/api/flows/${projectId}`);
        return response.data;
    },
    create: async (data: { project_id: string; name: string; description?: string; flow_data?: Record<string, unknown> }) => {
        const response = await api.post<ApiResponse<{ flow: AutomationFlow }>>('/api/flows', data);
        return response.data;
    },
    update: async (flowId: string, data: Partial<{ name: string; description: string; flow_data: Record<string, unknown>; is_active: boolean }>) => {
        const response = await api.put<ApiResponse<{ flow: AutomationFlow }>>(`/api/flows/${flowId}`, data);
        return response.data;
    },
    remove: async (flowId: string) => {
        const response = await api.delete<ApiResponse<null>>(`/api/flows/${flowId}`);
        return response.data;
    },
    getHistory: async (flowId: string) => {
        const response = await api.get<ApiResponse<{ executions: FlowExecution[] }>>(`/api/flows/${flowId}/history`);
        return response.data;
    },
    execute: async (flowId: string, triggerData?: Record<string, unknown>) => {
        const response = await api.post<ApiResponse<{ execution: FlowExecution }>>(`/api/flows/${flowId}/execute`, { trigger_data: triggerData });
        return response.data;
    },
};
