'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    X, 
    Plus, 
    Trash, 
    Lightning, 
    Gear, 
    Info,
    CheckCircle,
    ArrowCircleRight,
    User,
    Tag,
    Archive,
    ToggleLeft,
    ToggleRight
} from '@phosphor-icons/react';
import { automationsApi, type ApiAutomation } from '../../lib/api/client';
import type { Column } from '../../types/kanban';

interface AutomationRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    columns: Column[];
    members: { user_id: string; full_name: string }[];
}

export function AutomationRulesModal({ isOpen, onClose, projectId, columns, members }: AutomationRulesModalProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [newTriggerType, setNewTriggerType] = useState<ApiAutomation['trigger_type']>('task_moved_to');
    const [newTriggerValue, setNewTriggerValue] = useState<any>({});
    const [newActionType, setNewActionType] = useState<ApiAutomation['action_type']>('set_priority');
    const [newActionValue, setNewActionValue] = useState<any>({});

    const { data: automations, isLoading } = useQuery({
        queryKey: ['automations', projectId],
        queryFn: () => automationsApi.getAutomations(projectId).then(res => res.data?.automations || []),
        enabled: isOpen && !!projectId,
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<ApiAutomation>) => automationsApi.createAutomation(projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations', projectId] });
            setIsCreating(false);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => automationsApi.deleteAutomation(projectId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations', projectId] });
        },
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: string; is_active: number }) => 
            automationsApi.updateAutomation(projectId, id, { is_active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automations', projectId] });
        },
    });

    const resetForm = () => {
        setNewName('');
        setNewTriggerType('task_moved_to');
        setNewTriggerValue({});
        setNewActionType('set_priority');
        setNewActionValue({});
    };

    const handleCreate = () => {
        if (!newName.trim()) return;

        createMutation.mutate({
            name: newName,
            trigger_type: newTriggerType,
            trigger_value: newTriggerValue,
            action_type: newActionType,
            action_value: newActionValue,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col glass-panel shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-muted">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/20 text-primary">
                            <Lightning className="size-5" weight="fill" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text">{t('automation.title', 'Automation Rules')}</h2>
                            <p className="text-sm text-text-muted">{t('automation.subtitle', 'Automatic actions for your workflow')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-text-muted transition-colors">
                        <X className="size-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {isCreating ? (
                        <div className="space-y-4 p-5 rounded-xl border border-primary/30 bg-primary/5 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-text">{t('automation.create_new', 'Create New Rule')}</h3>
                                <button onClick={() => setIsCreating(false)} className="text-sm text-text-muted hover:text-text">{t('common.cancel')}</button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">{t('automation.rule_name', 'Rule Name')}</label>
                                    <input 
                                        type="text" 
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        placeholder={t('automation.rule_name_placeholder', 'e.g., Auto-low priority for Done')}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Info className="size-4" />
                                            <span className="text-sm font-semibold uppercase">{t('automation.when', 'When...')}</span>
                                        </div>
                                        <select 
                                            value={newTriggerType}
                                            onChange={(e) => {
                                                setNewTriggerType(e.target.value as any);
                                                setNewTriggerValue({});
                                            }}
                                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text outline-none"
                                        >
                                            <option value="task_moved_to">{t('automation.trigger.task_moved_to', 'Task moved to column')}</option>
                                            <option value="task_created">{t('automation.trigger.task_created', 'Task is created')}</option>
                                            <option value="task_assigned">{t('automation.trigger.task_assigned', 'Task is assigned')}</option>
                                        </select>

                                        {newTriggerType === 'task_moved_to' && (
                                            <select 
                                                value={newTriggerValue.column_id || ''}
                                                onChange={(e) => setNewTriggerValue({ column_id: e.target.value })}
                                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text outline-none"
                                            >
                                                <option value="">{t('automation.select_column', 'Select column...')}</option>
                                                {columns.map(col => (
                                                    <option key={col.id} value={col.id}>{col.name}</option>
                                                ))}
                                            </select>
                                        )}

                                        {newTriggerType === 'task_assigned' && (
                                            <select 
                                                value={newTriggerValue.user_id || ''}
                                                onChange={(e) => setNewTriggerValue({ user_id: e.target.value })}
                                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text outline-none"
                                            >
                                                <option value="">{t('automation.any_user', 'Any user')}</option>
                                                {members.map(m => (
                                                    <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <CheckCircle className="size-4" />
                                            <span className="text-sm font-semibold uppercase">{t('automation.then', 'Then...')}</span>
                                        </div>
                                        <select 
                                            value={newActionType}
                                            onChange={(e) => {
                                                setNewActionType(e.target.value as any);
                                                setNewActionValue({});
                                            }}
                                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text outline-none"
                                        >
                                            <option value="set_priority">{t('automation.action.set_priority', 'Set priority to...')}</option>
                                            <option value="set_assignee">{t('automation.action.set_assignee', 'Set assignee to...')}</option>
                                            <option value="add_label">{t('automation.action.add_label', 'Add label...')}</option>
                                            <option value="move_to_column">{t('automation.action.move_to_column', 'Move to column...')}</option>
                                            <option value="archive_task">{t('automation.action.archive_task', 'Archive task')}</option>
                                        </select>

                                        {newActionType === 'set_priority' && (
                                            <select 
                                                value={newActionValue.priority || ''}
                                                onChange={(e) => setNewActionValue({ priority: e.target.value })}
                                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text outline-none"
                                            >
                                                <option value="">{t('automation.select_priority', 'Select priority...')}</option>
                                                <option value="low">{t('tasks.low', 'Low')}</option>
                                                <option value="medium">{t('tasks.medium', 'Medium')}</option>
                                                <option value="high">{t('tasks.high', 'High')}</option>
                                                <option value="critical">{t('tasks.critical', 'Critical')}</option>
                                            </select>
                                        )}

                                        {newActionType === 'set_assignee' && (
                                            <select 
                                                value={newActionValue.user_id || ''}
                                                onChange={(e) => setNewActionValue({ user_id: e.target.value })}
                                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text outline-none"
                                            >
                                                <option value="">{t('automation.select_user', 'Select user...')}</option>
                                                {members.map(m => (
                                                    <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                                                ))}
                                            </select>
                                        )}

                                        {newActionType === 'move_to_column' && (
                                            <select 
                                                value={newActionValue.column_id || ''}
                                                onChange={(e) => setNewActionValue({ column_id: e.target.value })}
                                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text outline-none"
                                            >
                                                <option value="">{t('automation.select_column', 'Select column...')}</option>
                                                {columns.map(col => (
                                                    <option key={col.id} value={col.id}>{col.name}</option>
                                                ))}
                                            </select>
                                        )}
                                        
                                        {newActionType === 'add_label' && (
                                            <input 
                                                type="text" 
                                                value={newActionValue.label || ''}
                                                onChange={(e) => setNewActionValue({ label: e.target.value })}
                                                className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-text focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                placeholder={t('automation.type_label', 'Type label name...')}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button 
                                    onClick={handleCreate}
                                    disabled={!newName || createMutation.isPending}
                                    className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    {createMutation.isPending ? t('common.saving', 'Saving...') : t('automation.save_rule', 'Create Rule')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-text-muted hover:text-primary transition-all group"
                        >
                            <Plus className="size-5 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold">{t('automation.add_rule', 'Add New Automation Rule')}</span>
                        </button>
                    )}

                    <div className="space-y-4 pt-2">
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">{t('automation.active_rules', 'Active Rules')}</h3>
                        
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            </div>
                        ) : !automations || automations.length === 0 ? (
                            <div className="text-center py-12 px-10 rounded-2xl bg-surface-alt/30 border border-border-muted border-dashed">
                                <Gear className="size-12 mx-auto mb-4 opacity-20" />
                                <p className="text-text-muted">{t('automation.no_rules', 'No automation rules yet. Create one to streamline your workflow.')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {automations.map((rule) => (
                                    <AutomationItem 
                                        key={rule.id} 
                                        rule={rule} 
                                        onDelete={() => deleteMutation.mutate(rule.id)}
                                        onToggle={(val) => toggleMutation.mutate({ id: rule.id, is_active: val ? 1 : 0 })}
                                        columns={columns}
                                        members={members}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-muted flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-surface-alt hover:bg-surface-alt/80 text-text font-medium transition-colors"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AutomationItem({ rule, onDelete, onToggle, columns, members }: { 
    rule: ApiAutomation; 
    onDelete: () => void;
    onToggle: (val: boolean) => void;
    columns: Column[];
    members: { user_id: string; full_name: string }[];
}) {
    const { t } = useTranslation();
    const triggerVal = rule.trigger_value ? JSON.parse(rule.trigger_value) : {};
    const actionVal = rule.action_value ? JSON.parse(rule.action_value) : {};

    const getColumnName = (id: string) => columns.find(c => c.id === id)?.name || id;
    const getUserName = (id: string) => members.find(m => m.user_id === id)?.full_name || id;

    return (
        <div className={`p-4 rounded-xl border transition-all ${rule.is_active ? 'bg-surface border-border hover:border-primary/50' : 'bg-surface-alt/50 border-transparent opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-text truncate">{rule.name}</h4>
                        {!rule.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-alt text-text-muted uppercase font-bold">{t('common.inactive', 'Inactive')}</span>}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                            <Lightning className="size-3 text-primary" weight="fill" />
                            {rule.trigger_type === 'task_moved_to' ? (
                                <>Moved to <span className="font-semibold text-text">{getColumnName(triggerVal.column_id)}</span></>
                            ) : rule.trigger_type === 'task_created' ? (
                                <>Task Created</>
                            ) : (
                                <>Assigned to <span className="font-semibold text-text">{triggerVal.user_id ? getUserName(triggerVal.user_id) : 'Anyone'}</span></>
                            )}
                        </span>
                        
                        <ArrowCircleRight className="size-3 opacity-50" />

                        <span className="flex items-center gap-1">
                            {rule.action_type === 'set_priority' ? (
                                <><span className="flex items-center gap-1"><Info className="size-3 text-amber-400" /> Set Priority:</span> <span className="font-semibold text-text uppercase">{actionVal.priority}</span></>
                            ) : rule.action_type === 'move_to_column' ? (
                                <><span className="flex items-center gap-1"><ArrowCircleRight className="size-3 text-emerald-400" /> Move to:</span> <span className="font-semibold text-text">{getColumnName(actionVal.column_id)}</span></>
                            ) : rule.action_type === 'set_assignee' ? (
                                <><span className="flex items-center gap-1"><User className="size-3 text-blue-400" /> Assign to:</span> <span className="font-semibold text-text">{getUserName(actionVal.user_id)}</span></>
                            ) : rule.action_type === 'add_label' ? (
                                <><span className="flex items-center gap-1"><Tag className="size-3 text-pink-400" /> Add Label:</span> <span className="font-semibold text-text">{actionVal.label}</span></>
                            ) : (
                                <><span className="flex items-center gap-1"><Archive className="size-3 text-amber-600" /> Archive Task</span></>
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button 
                        onClick={() => onToggle(!rule.is_active)}
                        className={`p-2 rounded-lg transition-colors ${rule.is_active ? 'text-primary hover:bg-primary/10' : 'text-text-muted hover:bg-surface-alt'}`}
                    >
                        {rule.is_active ? <ToggleRight className="size-6" weight="fill" /> : <ToggleLeft className="size-6" />}
                    </button>
                    <button 
                        onClick={onDelete}
                        className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                        <Trash className="size-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
