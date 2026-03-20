import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowsApi } from '../../lib/api/flows';
import type { AutomationFlow } from '../../lib/api/flows';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Plus, Play, Trash2, ToggleLeft, ToggleRight, History, Zap, AlertCircle, CheckCircle, XCircle, Pencil } from 'lucide-react';
import { CaretDown as ChevronDown, Kanban as FolderKanban } from '@phosphor-icons/react';
import { useProjects } from '../../hooks/useKanbanData';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export function FlowsPage() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryProjectId = searchParams.get('project') || searchParams.get('projectId');
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedFlowHistory, setSelectedFlowHistory] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState({ name: '', description: '' });
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const navigate = useNavigate();

    // Fetch projects list
    const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
    const projects = useMemo(() => projectsData?.projects ?? [], [projectsData]);

    const effectiveProjectId = useMemo(() => {
        const validQuery = queryProjectId && projects.some((p: any) => p.id === queryProjectId)
            ? queryProjectId
            : null;
        if (validQuery) return validQuery;

        return projects[0]?.id || '';
    }, [projects, queryProjectId]);

    const selectedProject = useMemo(
        () => projects.find((p: any) => p.id === effectiveProjectId),
        [projects, effectiveProjectId]
    );

    useEffect(() => {
        if (!effectiveProjectId) return;
        if (searchParams.get('project') === effectiveProjectId) return;
        const next = new URLSearchParams(searchParams);
        next.set('project', effectiveProjectId);
        setSearchParams(next, { replace: true });
    }, [effectiveProjectId, searchParams, setSearchParams]);

    const projectId = effectiveProjectId;

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
        onSuccess: (newFlow) => {
            queryClient.invalidateQueries({ queryKey: ['flows', projectId] });
            setShowCreate(false);
            setCreateForm({ name: '', description: '' });
            toast.success('Akış oluşturuldu — editöre yönlendiriliyorsunuz...');
            if (newFlow?.id) {
                navigate(`/flows/editor?flowId=${newFlow.id}&project=${projectId}`);
            }
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

    if (isLoadingProjects) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <FolderKanban className="size-16 text-text-muted mb-4 opacity-20" />
                <h3 className="text-xl font-bold mb-2">Henüz Projeniz Yok</h3>
                <p className="text-text-muted mb-6">Akış oluşturmak için önce bir proje oluşturmalısınız.</p>
                <Link to="/projects" className="px-6 py-2 rounded-xl bg-primary text-black font-bold hover:scale-105 transition-transform">
                    Projelere Git
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
            {/* Page Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                        <nav aria-label="Breadcrumb" className="flex gap-2 text-sm mb-1">
                            <Link to="/dashboard" className="text-text-muted hover:text-primary transition-colors">
                                {t('common.home')}
                            </Link>
                            <span className="text-text-muted">/</span>
                            <span className="text-primary font-medium">{t('nav.flows')}</span>
                        </nav>

                        <div className="relative inline-block w-fit">
                            <button
                                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                                className="flex items-center gap-2 text-2xl lg:text-3xl font-bold text-text hover:text-primary transition-colors group"
                            >
                                {selectedProject?.name || t('projects.select_project')}
                                <ChevronDown className={`size-6 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isProjectDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
                                    {projects.map((project: any) => (
                                        <button
                                            key={project.id}
                                            onClick={() => {
                                                const next = new URLSearchParams(searchParams);
                                                next.set('project', project.id);
                                                setSearchParams(next, { replace: true });
                                                setIsProjectDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 hover:bg-surface-alt transition-colors ${project.id === effectiveProjectId ? 'bg-primary/10 text-primary' : 'text-white'
                                                }`}
                                        >
                                            <p className="font-medium">{project.name}</p>
                                            <p className="text-xs text-text-muted truncate">{project.description || 'Açıklama yok'}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-black font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(40,170,226,0.3)]"
                    >
                        <Plus className="w-5 h-5" /> {t('flows.new_flow', 'Yeni Akış')}
                    </button>
                </div>

                {/* Metrics Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                    <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><Zap className="size-5" /></div>
                            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Toplam Akış</span>
                        </div>
                        <p className="text-3xl font-black text-text">{flows.length}</p>
                    </div>
                    <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400"><Play className="size-5" /></div>
                            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Aktif Akış</span>
                        </div>
                        <p className="text-3xl font-black text-text">{flows.filter((f) => f.isActive).length}</p>
                    </div>
                    <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><History className="size-5" /></div>
                            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Çalıştırma</span>
                        </div>
                        <p className="text-3xl font-black text-text">{flows.reduce((acc, f) => acc + (f.executionCount || 0), 0)}</p>
                    </div>
                    <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><CheckCircle className="size-5" /></div>
                            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Başarı Oranı</span>
                        </div>
                        <p className="text-3xl font-black text-text">%98.4</p>
                    </div>
                </div>
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
                            onEdit={() => navigate(`/flows/editor?flowId=${flow.id}&project=${projectId}`)}
                            onHistory={() => setSelectedFlowHistory(selectedFlowHistory === flow.id ? null : flow.id)}
                            showHistory={selectedFlowHistory === flow.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function FlowCard({ flow, onToggle, onDelete, onExecute, onEdit, onHistory, showHistory }: {
    flow: AutomationFlow;
    onToggle: () => void;
    onDelete: () => void;
    onExecute: () => void;
    onEdit: () => void;
    onHistory: () => void;
    showHistory: boolean;
}) {
    const nodeCount = flow.flowData?.nodes?.length || 0;
    const triggerNode = flow.flowData?.nodes?.find(n => n.type === 'triggerNode');
    
    return (
        <div className="group relative glass-panel rounded-[2rem] border border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent hover:from-white/[0.04] hover:border-white/10 transition-all duration-500 overflow-hidden shadow-xl hover:shadow-primary/5">
            <div className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Left Side: Identity & Status */}
                <div className="flex-1 flex items-center gap-5 min-w-0">
                    <div className={`relative size-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        flow.isActive ? 'bg-primary/20 text-primary shadow-primary/10' : 'bg-white/5 text-text-muted'
                    }`}>
                        <Zap className={`size-7 ${flow.isActive ? 'animate-pulse' : ''}`} />
                        {flow.isActive && (
                            <div className="absolute -top-1 -right-1 size-3 rounded-full bg-green-500 border-2 border-[#111c21]" />
                        )}
                    </div>
                    
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-text truncate group-hover:text-primary transition-colors">
                                {flow.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                flow.isActive ? 'bg-green-500/10 text-green-400' : 'bg-white/10 text-text-muted'
                            }`}>
                                {flow.isActive ? 'Aktif' : 'Devre Dışı'}
                            </span>
                        </div>
                        {flow.description && (
                            <p className="text-sm text-text-muted mt-1 truncate max-w-[400px]">
                                {flow.description}
                            </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                <Plus className="size-3" />
                                {nodeCount} Node
                            </div>
                            {triggerNode && (
                                <div className="text-[10px] font-bold text-primary/60 uppercase tracking-wider truncate">
                                    Tetikleyici: {String((triggerNode.data as any)?.label || 'Bilinmiyor')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle: Stats */}
                <div className="hidden xl:flex items-center gap-10 px-10 border-x border-white/5">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Çalıştırma</p>
                        <p className="text-xl font-black text-text">{flow.executionCount || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Başarı</p>
                        <p className="text-xl font-black text-emerald-400">%100</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Son Çalışma</p>
                        <p className="text-xs font-bold text-text whitespace-nowrap">
                            {flow.lastExecutedAt ? new Date(flow.lastExecutedAt).toLocaleDateString('tr-TR') : 'Hiç çalışmadı'}
                        </p>
                    </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-3 shrink-0 ml-auto lg:ml-0">
                    <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl group-hover:bg-white/10 transition-colors">
                        <button 
                            onClick={onEdit} 
                            title="Düzenle" 
                            className="p-3 rounded-xl hover:bg-primary/20 text-text-muted hover:text-primary transition-all active:scale-90"
                        >
                            <Pencil className="size-5" />
                        </button>
                        <button 
                            onClick={onExecute} 
                            disabled={!flow.isActive}
                            title="Çalıştır" 
                            className="p-3 rounded-xl hover:bg-emerald-500/20 text-text-muted hover:text-emerald-400 transition-all active:scale-90 disabled:opacity-20 disabled:hover:bg-transparent"
                        >
                            <Play className="size-5" />
                        </button>
                        <button 
                            onClick={onHistory} 
                            title="Çalışma Geçmişi" 
                            className={`p-3 rounded-xl transition-all active:scale-90 ${showHistory ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-amber-500/20 text-text-muted hover:text-amber-400'}`}
                        >
                            <History className="size-5" />
                        </button>
                    </div>
                    
                    <button 
                        onClick={onToggle} 
                        className={`p-1.5 rounded-full transition-all active:scale-90 ${flow.isActive ? 'text-primary' : 'text-text-muted'}`}
                    >
                        {flow.isActive ? <ToggleRight className="size-8" /> : <ToggleLeft className="size-8" />}
                    </button>

                    <button 
                        onClick={onDelete} 
                        className="p-3 rounded-xl hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all active:scale-90"
                    >
                        <Trash2 className="size-5" />
                    </button>
                </div>
            </div>
            
            {showHistory && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                    <FlowHistory flowId={flow.id} />
                </div>
            )}
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
