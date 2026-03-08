import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash, Plus, SlackLogo, TelegramLogo, MicrosoftTeamsLogo, Globe, Copy, Check, Info } from '@phosphor-icons/react';
import { useIntegrations, useAddIntegration, useRemoveIntegration, useUpdateIntegration } from '../../hooks/useKanbanData';
import { toast } from 'react-hot-toast';

interface ProjectIntegrationsTabProps {
    projectId: string;
    isAdmin: boolean;
}

export function ProjectIntegrationsTab({ projectId, isAdmin }: ProjectIntegrationsTabProps) {
    const { t } = useTranslation();
    const { data: integrations, isLoading } = useIntegrations(projectId);
    const addIntegration = useAddIntegration(projectId);
    const removeIntegration = useRemoveIntegration(projectId);
    const updateIntegration = useUpdateIntegration(projectId);

    const [isAdding, setIsAdding] = useState(false);
    const [provider, setProvider] = useState('webhook');
    const [name, setName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [error, setError] = useState('');
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const getErrorMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) return;

        try {
            await addIntegration.mutateAsync({
                provider,
                name: name.trim(),
                webhook_url: webhookUrl.trim() || ''
            });
            setIsAdding(false);
            setName('');
            setWebhookUrl('');
            setProvider('webhook');
            toast.success(t('integrations.added', 'Integration added successfully'));
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to add integration'));
        }
    };

    const handleToggleActive = async (id: string, currentStatus: number) => {
        try {
            await updateIntegration.mutateAsync({ id, is_active: currentStatus === 0 });
            toast.success(currentStatus === 0 ? t('integrations.enabled', 'Integration enabled') : t('integrations.disabled', 'Integration disabled'));
        } catch {
            toast.error(t('integrations.update_failed', 'Failed to update integration'));
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm(t('projects.settings.integrations.confirm_remove', 'Are you sure you want to remove this integration?'))) return;
        try {
            await removeIntegration.mutateAsync(id);
            toast.success(t('integrations.removed', 'Integration removed'));
        } catch {
            toast.error(t('integrations.remove_failed', 'Failed to remove integration'));
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        const configuredApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
        const baseUrl = (configuredApiBase || window.location.origin).replace(/\/+$/, '');
        const fullUrl = `${baseUrl}/api/webhooks/incoming/${encodeURIComponent(text)}`;

        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopiedToken(id);
            toast.success(t('common.copied', 'Webhook URL copied to clipboard'));
            setTimeout(() => setCopiedToken(null), 2000);
        } catch {
            toast.error(t('common.copy_failed', 'Failed to copy webhook URL'));
        }
    };

    const getProviderIcon = (p: string) => {
        switch (p) {
            case 'slack': return <SlackLogo className="size-5 text-[#4A154B]" />;
            case 'telegram': return <TelegramLogo className="size-5 text-[#0088cc]" weight="fill" />;
            case 'teams': return <MicrosoftTeamsLogo className="size-5 text-[#6264A7]" weight="fill" />;
            default: return <Globe className="size-5 text-primary" />;
        }
    };

    if (isLoading) {
        return (
            <div className="p-12 flex justify-center items-center">
                <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-text font-medium text-lg">{t('projects.settings.integrations.title', 'Webhooks & Integrations')}</h3>
                    <p className="text-text-muted text-sm mt-1">{t('projects.settings.integrations.desc', 'Connect your project with external services to automate your workflow.')}</p>
                </div>
                {isAdmin && !isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all group border border-primary/20 hover:border-transparent"
                    >
                        <Plus className="size-4 group-hover:scale-110 transition-transform" />
                        {t('common.add', 'Add')}
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-surface-alt/40 border border-white/5 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-text font-medium flex items-center gap-2">
                            <Plus className="size-4 text-primary" />
                            {t('projects.settings.integrations.add_new', 'Add Integration')}
                        </h4>
                        <button type="button" onClick={() => setIsAdding(false)} className="text-text-muted hover:text-text transition-colors text-sm">Cancel</button>
                    </div>

                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{error}</div>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Provider</label>
                            <div className="relative">
                                <select
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value)}
                                    className="glass-input w-full h-11 px-4 rounded-lg text-text text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-primary/50"
                                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                >
                                    <option value="webhook">Custom Webhook</option>
                                    <option value="slack">Slack</option>
                                    <option value="teams">Microsoft Teams</option>
                                    <option value="telegram">Telegram Bot</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. #general-channel"
                                className="glass-input w-full h-11 px-4 rounded-lg text-text text-sm"
                                required
                            />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider flex justify-between">
                                <span>Outgoing Webhook URL</span>
                                <span className="text-[10px] normal-case opacity-60">(Optional if only using incoming)</span>
                            </label>
                            <input
                                type="url"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://hooks.slack.com/services/..."
                                className="glass-input w-full h-11 px-4 rounded-lg text-text text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={addIntegration.isPending}
                        className="w-full h-11 mt-4 rounded-lg bg-primary hover:bg-primary-hover text-black font-bold text-sm transition-all shadow-[0_5px_15px_-5px_rgba(19,185,165,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {addIntegration.isPending ? 'Saving...' : 'Save Integration'}
                    </button>
                </form>
            )}

            <div className="space-y-4">
                {integrations?.length === 0 ? (
                    <div className="text-center py-12 border border-white/5 border-dashed rounded-2xl bg-black/20 group hover:border-primary/30 transition-colors">
                        <div className="w-16 h-16 bg-surface-alt/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 group-hover:scale-110 transition-transform">
                            <Globe className="size-8 text-text-muted opacity-30" />
                        </div>
                        <p className="text-text-muted text-sm font-medium">{t('projects.settings.integrations.empty', 'No integrations configured yet.')}</p>
                        <p className="text-text-muted/60 text-xs mt-1">Connect Slack or use custom webhooks to notify your team.</p>
                    </div>
                ) : (
                    integrations?.map(integration => (
                        <div key={integration.id} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-surface-alt/20 hover:bg-surface-alt/30 transition-all duration-300">
                            <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-surface/80 flex items-center justify-center flex-shrink-0 border border-white/10 shadow-lg group-hover:border-primary/30 transition-colors">
                                        {getProviderIcon(integration.provider)}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-text font-bold text-base">{integration.name}</h4>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-text-muted border border-white/10">
                                                {integration.provider}
                                            </span>
                                            {integration.is_active ? (
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                                                    <span className="size-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                                                    Paused
                                                </span>
                                            )}
                                        </div>

                                        {integration.webhook_url && (
                                            <div className="flex items-center gap-2 text-xs text-text-muted bg-black/20 py-1 px-2 rounded-md border border-white/5 w-fit max-w-[300px]">
                                                <Globe className="size-3 flex-shrink-0" />
                                                <span className="truncate">{integration.webhook_url}</span>
                                            </div>
                                        )}

                                        <div className="mt-4 space-y-2">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                                                        Incoming Webhook Setup
                                                        <div className="group/info relative inline-block">
                                                            <Info className="size-3 cursor-help opacity-60 hover:opacity-100" />
                                                            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-surface border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-10 text-[11px] leading-relaxed text-text">
                                                                <p className="font-bold mb-1 text-primary">How to create tasks remotely:</p>
                                                                <ol className="list-decimal list-inside space-y-1 opacity-80">
                                                                    <li>Copy the URL below.</li>
                                                                    <li>Add it as a Slash Command in Slack or to your Telegram bot.</li>
                                                                    <li>Send a POST request with "text" or "command" parameter.</li>
                                                                </ol>
                                                            </div>
                                                        </div>
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 flex items-center justify-between gap-4 min-w-[200px] hover:border-primary/20 transition-colors">
                                                            <code className="text-primary text-xs font-mono tracking-tight cursor-default">
                                                                {`.../incoming/${integration.incoming_token.substring(0, 8)}...`}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(integration.incoming_token, integration.id)}
                                                                className="text-text-muted hover:text-primary transition-colors flex-shrink-0"
                                                                title="Copy Full Webhook URL"
                                                            >
                                                                {copiedToken === integration.id ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="flex sm:flex-col items-center gap-1">
                                        <button
                                            onClick={() => handleToggleActive(integration.id, integration.is_active)}
                                            className={`p-2 rounded-lg transition-all ${integration.is_active ? 'text-primary hover:bg-primary/10' : 'text-text-muted hover:bg-white/5'}`}
                                            title={integration.is_active ? "Pause Integration" : "Resume Integration"}
                                        >
                                            {integration.is_active ? <Globe className="size-5" /> : <Globe className="size-5 opacity-40" />}
                                        </button>
                                        <button
                                            onClick={() => handleRemove(integration.id)}
                                            disabled={removeIntegration.isPending}
                                            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-50"
                                            title="Delete Integration"
                                        >
                                            <Trash className="size-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
