import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { portalApi } from '../../lib/api/portal';
import type { PortalData, PortalTask } from '../../lib/api/portal';
import { CheckCircle, XCircle, MessageSquare, Send, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export function PortalView() {
    const { token } = useParams<{ token: string }>();
    const [data, setData] = useState<PortalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTask, setExpandedTask] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        portalApi.getPublic(token)
            .then((res) => {
                if (res.success && res.data) {
                    setData(res.data);
                } else {
                    setError(res.message || 'Portal bulunamadı');
                }
            })
            .catch(() => setError('Portal yüklenemedi'))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Portal Bulunamadı</h2>
                    <p className="text-slate-400">{error || 'Bu portal mevcut değil veya erişiminiz kısıtlı.'}</p>
                </div>
            </div>
        );
    }

    const brandColor = data.portal.branding?.primary_color || '#06b6d4';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <Toaster position="top-right" />
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-xl bg-slate-900/80 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-white">{data.portal.name}</h1>
                        <p className="text-sm text-slate-400">{data.portal.projectName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white">{data.stats.percent}%</div>
                            <div className="text-xs text-slate-400">{data.stats.completed}/{data.stats.total} tamamlandı</div>
                        </div>
                        <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center" style={{ borderColor: brandColor }}>
                            <svg className="w-10 h-10 -rotate-90">
                                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                <circle cx="20" cy="20" r="16" fill="none" stroke={brandColor} strokeWidth="3"
                                    strokeDasharray={`${data.stats.percent * 1.005} 100`}
                                    strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                </div>
            </header>

            {/* Columns */}
            <main className="max-w-5xl mx-auto px-4 py-6">
                <div className="space-y-6">
                    {data.columns.map((col) => {
                        const colTasks = data.tasks.filter((t) => t.columnId === col.id);
                        if (colTasks.length === 0) return null;

                        return (
                            <div key={col.id}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{col.name}</h2>
                                    <span className="text-xs text-slate-500 ml-1">({colTasks.length})</span>
                                </div>
                                <div className="space-y-2">
                                    {colTasks.map((task) => (
                                        <PortalTaskCard
                                            key={task.id}
                                            task={task}
                                            token={token!}
                                            expanded={expandedTask === task.id}
                                            onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}

                                            onRefresh={() => {
                                                portalApi.getPublic(token!).then((res) => {
                                                    if (res.success && res.data) setData(res.data);
                                                });
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

function PortalTaskCard({ task, token, expanded, onToggle, onRefresh }: {
    task: PortalTask;
    token: string;
    expanded: boolean;
    onToggle: () => void;
    onRefresh: () => void;
}) {
    const [commentForm, setCommentForm] = useState({ name: '', content: '' });
    const [approvalForm, setApprovalForm] = useState({ name: '', note: '' });
    const [submitting, setSubmitting] = useState(false);

    const priorityColors: Record<string, string> = {
        critical: 'text-red-400 bg-red-400/10',
        high: 'text-orange-400 bg-orange-400/10',
        medium: 'text-yellow-400 bg-yellow-400/10',
        low: 'text-green-400 bg-green-400/10',
    };

    const handleComment = async () => {
        if (!commentForm.name || !commentForm.content) return;
        setSubmitting(true);
        try {
            const res = await portalApi.addComment(token, {
                task_id: task.id,
                author_name: commentForm.name,
                content: commentForm.content,
            });
            if (res.success) {
                toast.success('Yorum eklendi');
                setCommentForm({ name: commentForm.name, content: '' });
                onRefresh();
            }
        } catch {
            toast.error('Yorum eklenemedi');
        }
        setSubmitting(false);
    };

    const handleApproval = async (status: 'approved' | 'revision') => {
        if (!approvalForm.name) {
            toast.error('Lütfen adınızı girin');
            return;
        }
        setSubmitting(true);
        try {
            const res = await portalApi.approve(token, task.id, {
                status,
                reviewer_name: approvalForm.name,
                note: approvalForm.note || undefined,
            });
            if (res.success) {
                toast.success(status === 'approved' ? 'Onaylandı' : 'Revizyon istendi');
                onRefresh();
            }
        } catch {
            toast.error('İşlem başarısız');
        }
        setSubmitting(false);
    };

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityColors[task.priority] || 'text-slate-400 bg-slate-400/10'}`}>
                        {task.priority}
                    </span>
                    <span className="text-sm text-white truncate">{task.title}</span>
                    {task.approval && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            task.approval.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                            {task.approval.status === 'approved' ? 'Onaylandı' : 'Revizyon'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    {task.dueDate && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                        </span>
                    )}
                    {task.subtaskTotal > 0 && (
                        <span>{task.subtaskCompleted}/{task.subtaskTotal}</span>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 border-t border-white/5 space-y-4 pt-3">
                    {task.description && (
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{task.description}</p>
                    )}

                    {/* Approval Section */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase">Onay / Revizyon</h4>
                        <input
                            type="text"
                            placeholder="Adınız"
                            value={approvalForm.name}
                            onChange={(e) => setApprovalForm({ ...approvalForm, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
                        />
                        <input
                            type="text"
                            placeholder="Not (opsiyonel)"
                            value={approvalForm.note}
                            onChange={(e) => setApprovalForm({ ...approvalForm, note: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleApproval('approved')}
                                disabled={submitting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" /> Onayla
                            </button>
                            <button
                                onClick={() => handleApproval('revision')}
                                disabled={submitting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" /> Revizyon
                            </button>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Yorumlar ({task.portalComments.length})
                        </h4>
                        {task.portalComments.map((c) => (
                            <div key={c.id} className="bg-white/5 rounded-lg p-2">
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span className="font-medium text-slate-300">{c.authorName}</span>
                                    <span>{new Date(c.createdAt).toLocaleDateString('tr-TR')}</span>
                                </div>
                                <p className="text-sm text-slate-300">{c.content}</p>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Adınız"
                                value={commentForm.name}
                                onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })}
                                className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
                            />
                            <input
                                type="text"
                                placeholder="Yorum yazın..."
                                value={commentForm.content}
                                onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
                            />
                            <button
                                onClick={handleComment}
                                disabled={submitting || !commentForm.content}
                                className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PortalView;
