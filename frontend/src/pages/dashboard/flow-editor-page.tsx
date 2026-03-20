'use client';

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowsApi, type AutomationFlow } from '../../lib/api/flows';
import FlowEditor from '../../components/flows/flow-editor';
import type { Node, Edge } from '@xyflow/react';
import toast from 'react-hot-toast';

export default function FlowEditorPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const flowId = searchParams.get('flowId') || '';
    const projectId = searchParams.get('project') || '';

    // Fetch the specific flow – must use same queryFn shape as FlowsPage (unwrapped array)
    const { data: flows = [], isLoading } = useQuery({
        queryKey: ['flows', projectId],
        queryFn: async () => {
            const res = await flowsApi.list(projectId);
            return res.data?.flows || [];
        },
        enabled: !!projectId,
    });

    const flow = flows.find((f: AutomationFlow) => f.id === flowId);

    const updateFlow = useMutation({
        mutationFn: (data: { nodes: Node[]; edges: Edge[] }) =>
            flowsApi.update(flowId, { flow_data: { nodes: data.nodes, edges: data.edges } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flows', projectId] });
        },
    });

    const executeFlow = useMutation({
        mutationFn: async () => {
            const res = await flowsApi.execute(flowId);
            return res.data?.execution;
        },
        onSuccess: (execution) => {
            if (execution?.status === 'completed') {
                toast.success(`Akış başarıyla çalıştırıldı! (${(execution.resultData as Record<string, unknown>)?.nodesExecuted || 0} node)`);
            } else if (execution?.status === 'failed') {
                toast.error(`Akış hatası: ${execution?.errorMessage || 'Bilinmeyen hata'}`);
            }
        },
        onError: () => {
            toast.error('Akış çalıştırılamadı');
        },
    });

    const handleSave = async (nodes: Node[], edges: Edge[]) => {
        await updateFlow.mutateAsync({ nodes, edges });
    };

    const handleBack = () => {
        navigate(`/flows?project=${projectId}`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!flow) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-4">
                <p className="text-text-muted">Akış bulunamadı</p>
                <button onClick={handleBack} className="px-4 py-2 bg-primary text-black rounded-lg text-sm font-bold">
                    Geri Dön
                </button>
            </div>
        );
    }

    const initialNodes: Node[] = (flow.flowData?.nodes || []).map((n) => ({
        id: n.id as string,
        type: n.type as string,
        position: n.position as { x: number; y: number },
        data: n.data as Record<string, unknown>,
    }));

    const initialEdges: Edge[] = (flow.flowData?.edges || []).map((e) => ({
        id: e.id as string,
        source: e.source as string,
        target: e.target as string,
        sourceHandle: e.sourceHandle as string | undefined,
        targetHandle: e.targetHandle as string | undefined,
        type: e.type as string | undefined,
        animated: true,
        style: { stroke: '#28aae2', strokeWidth: 2 },
    }));

    return (
        <div className="fixed inset-0 z-50 bg-background">
            <FlowEditor
                initialNodes={initialNodes}
                initialEdges={initialEdges}
                onSave={handleSave}
                onExecute={flow.isActive ? () => executeFlow.mutate() : undefined}
                onBack={handleBack}
                flowName={flow.name}
                isActive={flow.isActive}
            />
        </div>
    );
}
