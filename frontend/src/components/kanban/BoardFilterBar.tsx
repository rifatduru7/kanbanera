'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MagnifyingGlass as Search,
    X,
    User,
    Tag,
    CalendarBlank as CalendarIcon,
    CaretDown as ChevronDown,
} from '@phosphor-icons/react';

interface Member {
    user_id: string;
    full_name: string;
    avatar_url?: string | null;
}

interface ColumnOption {
    id: string;
    name: string;
}

interface BoardFilterBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    priorityFilter: string;
    onPriorityChange: (value: string) => void;
    statusFilter: string;
    onStatusChange: (value: string) => void;
    assigneeFilter: string;
    onAssigneeChange: (value: string) => void;
    labelFilter: string;
    onLabelChange: (value: string) => void;
    dateFilter: string;
    onDateFilterChange: (value: string) => void;
    onClearAll: () => void;
    members: Member[];
    columns: ColumnOption[];
    availableLabels: string[];
    activeFilterCount: number;
}

function FilterDropdown({
    label,
    icon: Icon,
    value,
    onChange,
    options,
    allLabel,
}: {
    label: string;
    icon: React.ElementType;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    allLabel: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedLabel = options.find((o) => o.value === value)?.label || allLabel;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${
                    value
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface/50 border-border-muted text-text-muted hover:text-text hover:bg-surface-alt'
                }`}
            >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}:</span>
                <span className="max-w-[100px] truncate">{selectedLabel}</span>
                <ChevronDown className={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-surface border border-border-muted rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                        onClick={() => {
                            onChange('');
                            setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-alt transition-colors ${
                            !value ? 'text-primary bg-primary/10' : 'text-text-muted'
                        }`}
                    >
                        {allLabel}
                    </button>
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-alt transition-colors ${
                                value === opt.value ? 'text-primary bg-primary/10' : 'text-white'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function BoardFilterBar({
    searchQuery,
    onSearchChange,
    priorityFilter,
    onPriorityChange,
    statusFilter,
    onStatusChange,
    assigneeFilter,
    onAssigneeChange,
    labelFilter,
    onLabelChange,
    dateFilter,
    onDateFilterChange,
    onClearAll,
    members,
    columns,
    availableLabels,
    activeFilterCount,
}: BoardFilterBarProps) {
    const { t } = useTranslation();

    const priorityOptions = useMemo(
        () => [
            { value: 'critical', label: t('common.priority.critical', 'Critical') },
            { value: 'high', label: t('common.priority.high', 'High') },
            { value: 'medium', label: t('common.priority.medium', 'Medium') },
            { value: 'low', label: t('common.priority.low', 'Low') },
        ],
        [t]
    );

    const memberOptions = useMemo(
        () => members.map((m) => ({ value: m.user_id, label: m.full_name })),
        [members]
    );

    const columnOptions = useMemo(
        () => columns.map((c) => ({ value: c.id, label: c.name })),
        [columns]
    );

    const labelOptions = useMemo(
        () => availableLabels.map((l) => ({ value: l, label: l })),
        [availableLabels]
    );

    const dateOptions = useMemo(
        () => [
            { value: 'today', label: t('filters.today', 'Today') },
            { value: 'this_week', label: t('filters.this_week', 'This Week') },
            { value: 'overdue', label: t('filters.overdue', 'Overdue') },
            { value: 'no_date', label: t('filters.no_date', 'No Date') },
        ],
        [t]
    );

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl glass-panel !bg-surface/80 border border-border-muted shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Row */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <input
                    type="text"
                    placeholder={t('common.search_tasks', 'Search tasks...')}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full glass-input h-10 pl-9 pr-8 rounded-lg text-text text-sm focus:ring-2 focus:ring-primary"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </div>

            {/* Filter Chips Row */}
            <div className="flex flex-wrap items-center gap-2">
                <FilterDropdown
                    label={t('filters.status', 'Status')}
                    icon={ChevronDown}
                    value={statusFilter}
                    onChange={onStatusChange}
                    options={columnOptions}
                    allLabel={t('common.all_statuses', 'All Statuses')}
                />

                <FilterDropdown
                    label={t('filters.priority', 'Priority')}
                    icon={ChevronDown}
                    value={priorityFilter}
                    onChange={onPriorityChange}
                    options={priorityOptions}
                    allLabel={t('common.all_priorities', 'All Priorities')}
                />

                <FilterDropdown
                    label={t('filters.assignee', 'Assignee')}
                    icon={User}
                    value={assigneeFilter}
                    onChange={onAssigneeChange}
                    options={[
                        { value: '__unassigned__', label: t('tasks.unassigned', 'Unassigned') },
                        ...memberOptions,
                    ]}
                    allLabel={t('filters.all_members', 'All Members')}
                />

                {labelOptions.length > 0 && (
                    <FilterDropdown
                        label={t('filters.label', 'Label')}
                        icon={Tag}
                        value={labelFilter}
                        onChange={onLabelChange}
                        options={labelOptions}
                        allLabel={t('filters.all_labels', 'All Labels')}
                    />
                )}

                <FilterDropdown
                    label={t('filters.due_date', 'Due Date')}
                    icon={CalendarIcon}
                    value={dateFilter}
                    onChange={onDateFilterChange}
                    options={dateOptions}
                    allLabel={t('filters.all_dates', 'All Dates')}
                />

                {/* Clear All */}
                {activeFilterCount > 0 && (
                    <button
                        onClick={onClearAll}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors ml-auto"
                    >
                        <X className="size-3.5" />
                        {t('common.clear_filters', 'Clear')}
                        <span className="flex items-center justify-center size-4 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                            {activeFilterCount}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}
