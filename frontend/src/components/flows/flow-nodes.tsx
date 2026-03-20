import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap, GitBranch, Play, Archive, Tag, UserPlus, ArrowRightLeft } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────── */
export interface TriggerNodeData {
    label: string;
    triggerType: string;
    triggerValue: string;
    [key: string]: unknown;
}

export interface ConditionNodeData {
    label: string;
    conditionType: string;
    conditionValue: string;
    [key: string]: unknown;
}

export interface ActionNodeData {
    label: string;
    actionType: string;
    actionValue: string;
    [key: string]: unknown;
}

/* ─── Trigger Options ──────────────────────────────── */
export const TRIGGER_OPTIONS = [
    { value: 'task_created', label: 'Görev Oluşturulduğunda' },
    { value: 'task_moved', label: 'Görev Taşındığında' },
    { value: 'task_assigned', label: 'Görev Atandığında' },
    { value: 'due_date_passed', label: 'Bitiş Tarihi Geçtiğinde' },
];

export const CONDITION_OPTIONS = [
    { value: 'priority_is', label: 'Öncelik Eşitse' },
    { value: 'column_is', label: 'Sütun Eşitse' },
    { value: 'has_label', label: 'Etiket Varsa' },
    { value: 'assignee_is', label: 'Atanan Kişi Eşitse' },
];

export const ACTION_OPTIONS = [
    { value: 'set_priority', label: 'Öncelik Değiştir', icon: Zap },
    { value: 'move_to_column', label: 'Sütuna Taşı', icon: ArrowRightLeft },
    { value: 'add_label', label: 'Etiket Ekle', icon: Tag },
    { value: 'archive_task', label: 'Görevi Arşivle', icon: Archive },
    { value: 'set_assignee', label: 'Kişi Ata', icon: UserPlus },
];

export const PRIORITY_VALUES = [
    { value: 'low', label: 'Düşük', color: '#3b82f6' },
    { value: 'medium', label: 'Orta', color: '#22c55e' },
    { value: 'high', label: 'Yüksek', color: '#f97316' },
    { value: 'critical', label: 'Kritik', color: '#ef4444' },
];

/* ─── Base Node Shell ────────────────────────────────── */
function NodeShell({
    accentColor,
    icon: Icon,
    title,
    children,
}: {
    accentColor: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className="min-w-[220px] max-w-[260px] rounded-xl shadow-2xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(27, 43, 50, 0.95)', backdropFilter: 'blur(16px)' }}
        >
            <div
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ background: accentColor, color: '#000' }}
            >
                <Icon className="size-3.5" />
                {title}
            </div>
            <div className="p-3 flex flex-col gap-2">
                {children}
            </div>
        </div>
    );
}

/* ─── Shared Select ──────────────────────────────────── */
function NodeSelect({
    value,
    onChange,
    options,
    placeholder,
}: {
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary/50 cursor-pointer appearance-none"
        >
            <option value="" className="bg-surface">{placeholder}</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface">
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

function NodeInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
}) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary/50 placeholder:text-white/30"
        />
    );
}

/* ─── Trigger Node ───────────────────────────────────── */
export const TriggerNode = memo(({ data, id }: NodeProps) => {
    const nodeData = data as TriggerNodeData;

    const updateData = (field: string, value: string) => {
        if (nodeData.onChange) {
            (nodeData.onChange as (id: string, field: string, value: string) => void)(id, field, value);
        }
    };

    return (
        <>
            <NodeShell accentColor="#f59e0b" icon={Zap} title="Tetikleyici">
                <NodeSelect
                    value={nodeData.triggerType || ''}
                    onChange={(v) => updateData('triggerType', v)}
                    options={TRIGGER_OPTIONS}
                    placeholder="Tetikleyici seçin..."
                />
                {nodeData.triggerType === 'task_moved' && (
                    <NodeInput
                        value={nodeData.triggerValue || ''}
                        onChange={(v) => updateData('triggerValue', v)}
                        placeholder="Kaynak sütun adı (opsiyonel)"
                    />
                )}
            </NodeShell>
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-amber-300" />
        </>
    );
});
TriggerNode.displayName = 'TriggerNode';

/* ─── Condition Node ─────────────────────────────────── */
export const ConditionNode = memo(({ data, id }: NodeProps) => {
    const nodeData = data as ConditionNodeData;

    const updateData = (field: string, value: string) => {
        if (nodeData.onChange) {
            (nodeData.onChange as (id: string, field: string, value: string) => void)(id, field, value);
        }
    };

    const needsValueInput = nodeData.conditionType && nodeData.conditionType !== '';

    return (
        <>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300" />
            <NodeShell accentColor="#3b82f6" icon={GitBranch} title="Koşul">
                <NodeSelect
                    value={nodeData.conditionType || ''}
                    onChange={(v) => updateData('conditionType', v)}
                    options={CONDITION_OPTIONS}
                    placeholder="Koşul seçin..."
                />
                {needsValueInput && (
                    <NodeInput
                        value={nodeData.conditionValue || ''}
                        onChange={(v) => updateData('conditionValue', v)}
                        placeholder={
                            nodeData.conditionType === 'priority_is' ? 'low / medium / high / critical' :
                            nodeData.conditionType === 'column_is' ? 'Sütun adı' :
                            nodeData.conditionType === 'has_label' ? 'Etiket adı' :
                            'Değer girin'
                        }
                    />
                )}
                <div className="flex items-center justify-between text-[10px] text-white/40 mt-1 px-1">
                    <span className="text-green-400">✓ Evet</span>
                    <span className="text-red-400">✗ Hayır</span>
                </div>
            </NodeShell>
            <Handle
                type="source"
                position={Position.Bottom}
                id="true"
                className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-300"
                style={{ left: '30%' }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="false"
                className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-300"
                style={{ left: '70%' }}
            />
        </>
    );
});
ConditionNode.displayName = 'ConditionNode';

/* ─── Action Node ────────────────────────────────────── */
export const ActionNode = memo(({ data, id }: NodeProps) => {
    const nodeData = data as ActionNodeData;

    const updateData = (field: string, value: string) => {
        if (nodeData.onChange) {
            (nodeData.onChange as (id: string, field: string, value: string) => void)(id, field, value);
        }
    };

    const needsValueInput = nodeData.actionType && nodeData.actionType !== 'archive_task';

    return (
        <>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-emerald-300" />
            <NodeShell accentColor="#10b981" icon={Play} title="Aksiyon">
                <NodeSelect
                    value={nodeData.actionType || ''}
                    onChange={(v) => updateData('actionType', v)}
                    options={ACTION_OPTIONS}
                    placeholder="Aksiyon seçin..."
                />
                {needsValueInput && (
                    <>
                        {nodeData.actionType === 'set_priority' ? (
                            <NodeSelect
                                value={nodeData.actionValue || ''}
                                onChange={(v) => updateData('actionValue', v)}
                                options={PRIORITY_VALUES}
                                placeholder="Öncelik seçin..."
                            />
                        ) : (
                            <NodeInput
                                value={nodeData.actionValue || ''}
                                onChange={(v) => updateData('actionValue', v)}
                                placeholder={
                                    nodeData.actionType === 'move_to_column' ? 'Hedef sütun adı' :
                                    nodeData.actionType === 'add_label' ? 'Etiket adı' :
                                    nodeData.actionType === 'set_assignee' ? 'Kişi e-posta / id' :
                                    'Değer girin'
                                }
                            />
                        )}
                    </>
                )}
            </NodeShell>
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-emerald-300" />
        </>
    );
});
ActionNode.displayName = 'ActionNode';

/* ─── Node Type Map ──────────────────────────────────── */
export const nodeTypes = {
    triggerNode: TriggerNode,
    conditionNode: ConditionNode,
    actionNode: ActionNode,
};
