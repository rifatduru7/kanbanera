import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowsApi } from '../../lib/api/flows';
import type { AutomationFlow } from '../../lib/api/flows';
import { useSearchParams } from 'react-router-dom';
import { Plus, Play, Trash2, ToggleLeft, ToggleRight, History, Zap, GitBranch, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function FlowsPage() {
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get('projectId') || '';
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedFlowHistory, setSelectedFlowHistory] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState({ name: '', description: '' });

    const { data: flows = [], isLoading } = useQuery({
        queryKey: ['flows', projectId],
        queryFn: async () => {
            const res = await flowsApi.list(projectId);
            return res.data?.flows || [];
        },
        enabled: !!projectId,
    });

    const createFlow = useMutation({
        mutationFn: async (data: { name: string; description?: string }) => {
            const res = await flowsApi.create({ project_id: projectId, ...data });
            if (!res.success) throw new Error(res.message || 'Oluşturulamadı');
            return res.data?.flow;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flows', projectId] });
            setShowCreate(false);
            setCreateForm({ name: '', description: '' });
            toast.success('Akış oluşturuldu');
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const toggleFlow = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const res = await flowsApi.update(id, { is_active: active });
            if (!res.success) throw new Error(res.message || 'Güncellenemedi');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flows', projectId] }),
    });

    const deleteFlow = useMutation({
        mutationFn: async (id: string) => {
            const res = await flowsApi.remove(id);
            if (!res.success) throw new Error(res.message || 'Silinemedi');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flows', projectId] });
            toast.success('Akış silindi');
        },
    });

    const executeFlow = useMutation({
        mutationFn: async (id: string) => {
            const res = await flowsApi.execute(id);
            if (!res.success) throw new Error(res.message || 'Çalıştırılamadı');
            return res.data?.execution;
        },
        onSuccess: (exec) => {
            queryClient.invalidateQueries({ queryKey: ['flows', projectId] });
            if (exec?.status === 'completed') {
                toast.success('Akış başarıyla çalıştırıldı');
            } else {
                toast.error(`Akış hatası: ${exec?.errorMessage || 'Bilinmeyen hata'}`);
            }
        },
        onError: (err: Error) => toast.error(err.message),
    });

    if (!projectId) {
        return (
            <div className="flex items-center justify-center h-full text-text/50">
                <p>Lütfen sol menüden bir proje seçin</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <GitBranch className="w-6 h-6 text-accent" />
                    <h1 className="text-xl font-bold">Otomasyon Akışları</h1>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Yeni Akış
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="glass-panel p-4 rounded-2xl space-y-3">
                    <input
                        type="text"
                        placeholder="Akış adı"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50"
                    />
                    <input
                        type="text"
                        placeholder="Açıklama (opsiyonel)"
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50"
                    />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-text/60 hover:text-text transition-colors">
                            İptal
                        </button>
                        <button
                            onClick={() => createFlow.mutate(createForm)}
                            disabled={!createForm.name || createFlow.isPending}
                            className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
                        >
                            Oluştur
                        </button>
                    </div>
                </div>
            )}

            {/* Flow List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
                </div>
            ) : flows.length === 0 ? (
                <div className="text-center py-16 text-text/40">
                    <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz otomasyon akışı yok</p>
                    <p className="text-sm mt-1">Yukarıdaki butona tıklayarak ilk akışınızı oluşturun</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {flows.map((flow) => (
                        <FlowCard
                            key={flow.id}
                            flow={flow}
                            onToggle={() => toggleFlow.mutate({ id: flow.id, active: !flow.isActive })}
                            onDelete={() => deleteFlow.mutate(flow.id)}
                            onExecute={() => executeFlow.mutate(flow.id)}
                            onHistory={() => setSelectedFlowHistory(selectedFlowHistory === flow.id ? null : flow.id)}
                            showHistory={selectedFlowHistory === flow.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function FlowCard({ flow, onToggle, onDelete, onExecute, onHistory, showHistory }: {
    flow: AutomationFlow;
    onToggle: () => void;
    onDelete: () => void;
    onExecute: () => void;
    onHistory: () => void;
    showHistory: boolean;
}) {
    return (
        <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${flow.isActive ? 'text-green-400' : 'text-text/30'}`} />
                        <h3 className="font-medium truncate">{flow.name}</h3>
                    </div>
                    {flow.description && <p className="text-sm text-text/50 mt-0.5 truncate">{flow.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-text/40">
                        <span>{flow.executionCount} çalıştırma</span>
                        {flow.lastExecutedAt && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Son: {new Date(flow.lastExecutedAt).toLocaleDateString('tr-TR')}
                            </span>
                        )}
                        {flow.createdByName && <span>Oluşturan: {flow.createdByName}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={onExecute} title="Çalıştır" className="p-2 rounded-lg hover:bg-white/10 transition-colors text-green-400">
                        <Play className="w-4 h-4" />
                    </button>
                    <button onClick={onHistory} title="Geçmiş" className="p-2 rounded-lg hover:bg-white/10 transition-colors text-text/50">
                        <History className="w-4 h-4" />
                    </button>
                    <button onClick={onToggle} title={flow.isActive ? 'Devre dışı bırak' : 'Etkinleştir'} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        {flow.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-text/30" />}
                    </button>
                    <button onClick={onDelete} title="Sil" className="p-2 rounded-lg hover:bg-white/10 transition-colors text-red-400/60 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {showHistory && <FlowHistory flowId={flow.id} />}
        </div>
    );
}

function FlowHistory({ flowId }: { flowId: string }) {
    const { data: executions = [], isLoading } = useQuery({
        queryKey: ['flow-history', flowId],
        queryFn: async () => {
            const res = await flowsApi.getHistory(flowId);
            return res.data?.executions || [];
        },
    });

    if (isLoading) {
        return <div className="px-4 pb-4"><div className="animate-pulse h-8 bg-white/5 rounded" /></div>;
    }

    if (executions.length === 0) {
        return <div className="px-4 pb-4 text-sm text-text/40">Henüz çalışma geçmişi yok</div>;
    }

    return (
        <div className="border-t border-border px-4 pb-3 pt-2 space-y-1.5">
            <h4 className="text-xs font-semibold text-text/50 uppercase">Çalışma Geçmişi</h4>
            {executions.slice(0, 10).map((exec) => (
                <div key={exec.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                        {exec.status === 'completed' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        ) : exec.status === 'failed' ? (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        )}
                        <span className="text-text/60">
                            {exec.resultData?.nodesExecuted !== undefined
                                ? `${exec.resultData.nodesExecuted} node çalıştırıldı`
                                : exec.status}
                        </span>
                        {exec.errorMessage && <span className="text-red-400 truncate max-w-[200px]">{exec.errorMessage}</span>}
                    </div>
                    <span className="text-text/40">{new Date(exec.startedAt).toLocaleString('tr-TR')}</span>
                </div>
            ))}
        </div>
    );
}

export default FlowsPage;
