import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalApi } from '../../lib/api/portal';
import { Plus, Copy, Trash2, ToggleLeft, ToggleRight, ExternalLink, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface PortalSettingsProps {
    projectId: string;
}

export function PortalSettings({ projectId }: PortalSettingsProps) {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '' });

    const { data: portals = [], isLoading } = useQuery({
        queryKey: ['portals', projectId],
        queryFn: async () => {
            const res = await portalApi.list(projectId);
            return res.data?.portals || [];
        },
        enabled: !!projectId,
    });

    const createPortal = useMutation({
        mutationFn: async (name: string) => {
            const res = await portalApi.create({ project_id: projectId, name });
            if (!res.success) throw new Error(res.message || 'Portal oluşturulamadı');
            return res.data?.portal;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portals', projectId] });
            setShowCreate(false);
            setCreateForm({ name: '' });
            toast.success('Portal oluşturuldu');
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const togglePortal = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const res = await portalApi.update(id, { is_active: active });
            if (!res.success) throw new Error(res.message);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portals', projectId] }),
    });

    const deletePortal = useMutation({
        mutationFn: async (id: string) => {
            const res = await portalApi.remove(id);
            if (!res.success) throw new Error(res.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['portals', projectId] });
            toast.success('Portal silindi');
        },
    });

    const copyLink = (token: string) => {
        const url = `${window.location.origin}/portal/${token}`;
        navigator.clipboard.writeText(url);
        toast.success('Portal linki kopyalandı');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold">Müşteri Portalları</h3>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> Yeni Portal
                </button>
            </div>

            {showCreate && (
                <div className="glass-panel p-3 rounded-xl flex gap-2">
                    <input
                        type="text"
                        placeholder="Portal adı"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && createForm.name && createPortal.mutate(createForm.name)}
                        className="flex-1 bg-white/5 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50"
                        autoFocus
                    />
                    <button
                        onClick={() => createPortal.mutate(createForm.name)}
                        disabled={!createForm.name || createPortal.isPending}
                        className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
                    >
                        Oluştur
                    </button>
                    <button onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-text/50 hover:text-text">
                        İptal
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
                </div>
            ) : portals.length === 0 ? (
                <p className="text-sm text-text/40 text-center py-6">Henüz portal yok. Müşterilerinizle proje ilerlemesini paylaşmak için bir portal oluşturun.</p>
            ) : (
                <div className="space-y-2">
                    {portals.map((portal) => (
                        <div key={portal.id} className="glass-panel p-3 rounded-xl flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${portal.isActive ? 'bg-green-500' : 'bg-text/20'}`} />
                                    <span className="font-medium text-sm">{portal.name}</span>
                                </div>
                                <p className="text-xs text-text/40 mt-0.5 ml-4 truncate">{portal.token}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => copyLink(portal.token)} title="Linki kopyala" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-accent">
                                    <Copy className="w-4 h-4" />
                                </button>
                                <a href={`/portal/${portal.token}`} target="_blank" rel="noopener noreferrer" title="Portalı aç" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text/50">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => togglePortal.mutate({ id: portal.id, active: !portal.isActive })}
                                    title={portal.isActive ? 'Devre dışı bırak' : 'Etkinleştir'}
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    {portal.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-text/30" />}
                                </button>
                                <button
                                    onClick={() => deletePortal.mutate(portal.id)}
                                    title="Sil"
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-red-400/60 hover:text-red-400"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PortalSettings;
