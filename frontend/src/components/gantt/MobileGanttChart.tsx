import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GanttTask } from '../../hooks/useGanttData';
import type { GroupBy, ZoomLevel } from './GanttChart';

interface MobileGanttChartProps {
    tasks: GanttTask[];
    zoomLevel: ZoomLevel;
    groupBy: GroupBy;
    onTaskClick?: (task: GanttTask) => void;
    searchQuery?: string;
}

interface TaskGroup {
    key: string;
    label: string;
    color: string;
    tasks: GanttTask[];
}

type RowItem =
    | { type: 'group'; group: TaskGroup }
    | { type: 'task'; task: GanttTask };

const DAY_MS = 86400000;
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 56;
const LABEL_WIDTH = 156;
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#22c55e',
};

function parseDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function addDays(date: Date, count: number): Date {
    return new Date(date.getTime() + count * DAY_MS);
}

function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function isSameDay(left: Date, right: Date): boolean {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

function getMobileColWidth(zoomLevel: ZoomLevel): number {
    switch (zoomLevel) {
        case 'day':
            return 32;
        case 'week':
            return 72;
        case 'month':
            return 108;
    }
}

function getBarColor(task: GanttTask): string {
    return task.columnColor || task.projectColor || '#6366f1';
}

export function MobileGanttChart({
    tasks,
    zoomLevel,
    groupBy,
    onTaskClick,
    searchQuery,
}: MobileGanttChartProps) {
    const { t, i18n } = useTranslation();
    const bodyScrollRef = useRef<HTMLDivElement>(null);
    const labelsRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const colWidth = getMobileColWidth(zoomLevel);
    const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';

    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
        const today = new Date();
        let earliest = new Date(today.getFullYear(), today.getMonth(), 1);
        let latest = new Date(today.getFullYear(), today.getMonth() + 3, 0);

        for (const task of tasks) {
            const start = parseDate(task.startDate);
            const end = parseDate(task.endDate);
            if (start && start < earliest) earliest = new Date(start.getFullYear(), start.getMonth(), 1);
            if (end && end > latest) latest = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        }

        return {
            timelineStart: addDays(earliest, -7),
            timelineEnd: addDays(latest, 14),
            totalDays: daysBetween(addDays(earliest, -7), addDays(latest, 14)) + 1,
        };
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        if (!searchQuery) return tasks;
        const query = searchQuery.toLowerCase();
        return tasks.filter((task) =>
            task.title.toLowerCase().includes(query) ||
            task.projectName.toLowerCase().includes(query) ||
            (task.assigneeName && task.assigneeName.toLowerCase().includes(query))
        );
    }, [tasks, searchQuery]);

    const groups = useMemo(() => {
        const groupsMap = new Map<string, TaskGroup>();

        for (const task of filteredTasks) {
            let key: string;
            let label: string;
            let color: string;

            switch (groupBy) {
                case 'project':
                    key = task.projectId;
                    label = task.projectName;
                    color = task.projectColor || '#6366f1';
                    break;
                case 'assignee':
                    key = task.assigneeId || '__unassigned';
                    label = task.assigneeName || t('tasks.unassigned', 'Unassigned');
                    color = '#6366f1';
                    break;
                case 'priority':
                    key = task.priority;
                    label = t(`common.priority.${task.priority}`);
                    color = PRIORITY_COLORS[task.priority] || '#6366f1';
                    break;
                case 'status':
                    key = task.columnId;
                    label = task.columnName;
                    color = task.columnColor || '#6366f1';
                    break;
            }

            if (!groupsMap.has(key)) {
                groupsMap.set(key, { key, label, color, tasks: [] });
            }

            groupsMap.get(key)?.tasks.push(task);
        }

        const result = Array.from(groupsMap.values());
        if (groupBy === 'priority') {
            result.sort((left, right) => (PRIORITY_ORDER[left.key] ?? 99) - (PRIORITY_ORDER[right.key] ?? 99));
        } else {
            result.sort((left, right) => left.label.localeCompare(right.label));
        }

        return result;
    }, [filteredTasks, groupBy, t]);

    const rows = useMemo(() => {
        const result: RowItem[] = [];
        for (const group of groups) {
            result.push({ type: 'group', group });
            if (!collapsedGroups.has(group.key)) {
                for (const task of group.tasks) {
                    result.push({ type: 'task', task });
                }
            }
        }
        return result;
    }, [collapsedGroups, groups]);

    const timelineCols = useMemo(() => {
        const today = new Date();
        const cols: { date: Date; label: string; isToday: boolean; isWeekend: boolean }[] = [];

        if (zoomLevel === 'day') {
            for (let index = 0; index < totalDays; index += 1) {
                const date = addDays(timelineStart, index);
                cols.push({
                    date,
                    label: date.toLocaleDateString(locale, { day: 'numeric' }),
                    isToday: isSameDay(date, today),
                    isWeekend: isWeekend(date),
                });
            }
        } else if (zoomLevel === 'week') {
            let date = new Date(timelineStart);
            while (date.getDay() !== 1) {
                date = addDays(date, 1);
            }

            while (date <= timelineEnd) {
                cols.push({
                    date: new Date(date),
                    label: date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
                    isToday: isSameDay(date, today),
                    isWeekend: false,
                });
                date = addDays(date, 7);
            }
        } else {
            let date = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
            while (date <= timelineEnd) {
                cols.push({
                    date: new Date(date),
                    label: date.toLocaleDateString(locale, { month: 'short' }),
                    isToday: date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(),
                    isWeekend: false,
                });
                date = new Date(date.getFullYear(), date.getMonth() + 1, 1);
            }
        }

        return cols;
    }, [locale, timelineEnd, timelineStart, totalDays, zoomLevel]);

    const monthHeaders = useMemo(() => {
        if (zoomLevel === 'month') return [];

        const headers: { label: string; span: number }[] = [];
        let currentMonth = -1;
        let currentYear = -1;

        for (const col of timelineCols) {
            const date = col.date;
            if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
                currentMonth = date.getMonth();
                currentYear = date.getFullYear();
                headers.push({
                    label: date.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
                    span: 1,
                });
            } else {
                headers[headers.length - 1].span += 1;
            }
        }

        return headers;
    }, [locale, timelineCols, zoomLevel]);

    const getBarPosition = useCallback((task: GanttTask) => {
        const start = parseDate(task.startDate) || new Date();
        const end = parseDate(task.endDate) || addDays(start, 1);
        const effectiveStart = start < timelineStart ? timelineStart : start;
        const effectiveEnd = end > timelineEnd ? timelineEnd : end;

        if (zoomLevel === 'day') {
            const left = daysBetween(timelineStart, effectiveStart) * colWidth;
            const width = Math.max(daysBetween(effectiveStart, effectiveEnd) * colWidth, colWidth);
            return { left, width };
        }

        if (zoomLevel === 'week') {
            const startOffset = daysBetween(timelineStart, effectiveStart);
            const duration = daysBetween(effectiveStart, effectiveEnd);
            return {
                left: (startOffset / 7) * colWidth,
                width: Math.max((duration / 7) * colWidth, Math.max(24, colWidth * 0.45)),
            };
        }

        const startOffset = daysBetween(timelineStart, effectiveStart);
        const duration = daysBetween(effectiveStart, effectiveEnd);
        const totalRange = daysBetween(timelineStart, timelineEnd);
        const totalWidth = timelineCols.length * colWidth;
        return {
            left: (startOffset / totalRange) * totalWidth,
            width: Math.max((duration / totalRange) * totalWidth, 28),
        };
    }, [colWidth, timelineCols.length, timelineEnd, timelineStart, zoomLevel]);

    const todayPosition = useMemo(() => {
        const today = new Date();
        if (today < timelineStart || today > timelineEnd) return null;

        if (zoomLevel === 'day') {
            return daysBetween(timelineStart, today) * colWidth;
        }

        if (zoomLevel === 'week') {
            return (daysBetween(timelineStart, today) / 7) * colWidth;
        }

        const totalRange = daysBetween(timelineStart, timelineEnd);
        return (daysBetween(timelineStart, today) / totalRange) * timelineCols.length * colWidth;
    }, [colWidth, timelineCols.length, timelineEnd, timelineStart, zoomLevel]);

    useEffect(() => {
        if (todayPosition == null || !bodyScrollRef.current) return;
        const targetScroll = todayPosition - bodyScrollRef.current.clientWidth / 3;
        bodyScrollRef.current.scrollLeft = Math.max(0, targetScroll);
    }, [todayPosition]);

    const handleBodyScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        const container = event.currentTarget;
        if (labelsRef.current) {
            labelsRef.current.scrollTop = container.scrollTop;
        }
        if (headerRef.current) {
            headerRef.current.style.transform = `translateX(-${container.scrollLeft}px)`;
        }
    }, []);

    const toggleGroup = useCallback((key: string) => {
        setCollapsedGroups((previous) => {
            const next = new Set(previous);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const totalTimelineWidth = timelineCols.length * colWidth;
    const totalContentHeight = rows.length * ROW_HEIGHT;

    return (
        <div className="flex h-[70dvh] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
            <div className="flex border-b border-border bg-surface-alt/80">
                <div
                    className="shrink-0 border-r border-border px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted flex flex-col justify-center"
                    style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, height: HEADER_HEIGHT }}
                >
                    <span>{t('gantt.tasks_label', 'Tasks')}</span>
                    <span className="mt-1 text-[11px] font-medium normal-case tracking-normal text-text-muted/70">
                        {filteredTasks.length}
                    </span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <div
                        ref={headerRef}
                        className="h-full"
                        style={{ width: totalTimelineWidth, display: 'flex', flexDirection: 'column' }}
                    >
                        {monthHeaders.length > 0 && (
                            <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                                {monthHeaders.map((header) => (
                                    <div
                                        key={`${header.label}-${header.span}`}
                                        className="flex items-center justify-center border-r border-border/40 px-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted"
                                        style={{ width: header.span * colWidth }}
                                    >
                                        {header.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex" style={{ height: monthHeaders.length > 0 ? HEADER_HEIGHT / 2 : HEADER_HEIGHT }}>
                            {timelineCols.map((col) => (
                                <div
                                    key={col.date.toISOString()}
                                    className={`flex shrink-0 items-center justify-center border-r border-border/25 text-[10px] font-medium ${
                                        col.isToday
                                            ? 'bg-primary/10 text-primary'
                                            : col.isWeekend
                                                ? 'bg-surface-alt/40 text-text-muted/60'
                                                : 'text-text-muted'
                                    }`}
                                    style={{ width: colWidth }}
                                >
                                    {col.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <div
                    className="shrink-0 border-r border-border bg-surface/70"
                    style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                >
                    <div ref={labelsRef} className="h-full overflow-hidden">
                        <div style={{ height: totalContentHeight }}>
                            {rows.map((row) => {
                                if (row.type === 'group') {
                                    const group = row.group;
                                    const isCollapsed = collapsedGroups.has(group.key);

                                    return (
                                        <button
                                            key={`group-${group.key}`}
                                            type="button"
                                            className="flex w-full items-center gap-2 border-b border-border/50 px-3 text-left transition-colors active:bg-surface-alt/60"
                                            style={{ height: ROW_HEIGHT }}
                                            onClick={() => toggleGroup(group.key)}
                                            aria-label={group.label}
                                        >
                                            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{group.label}</span>
                                            <span className="text-[10px] text-text-muted">{group.tasks.length}</span>
                                            <svg
                                                className={`size-3.5 shrink-0 text-text-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    );
                                }

                                const task = row.task;
                                const assigneeLabel = task.assigneeName ? task.assigneeName.split(' ')[0] : null;

                                return (
                                    <button
                                        key={`task-${task.id}`}
                                        type="button"
                                        className="flex w-full items-center gap-2 border-b border-border/25 px-3 pl-4 text-left transition-colors active:bg-surface-alt/60"
                                        style={{ height: ROW_HEIGHT }}
                                        onClick={() => onTaskClick?.(task)}
                                    >
                                        <span
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#6366f1' }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium text-text">{task.title}</p>
                                            <p className="truncate text-[10px] text-text-muted">
                                                {assigneeLabel || task.projectName}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div
                    ref={bodyScrollRef}
                    className="mobile-scroll flex-1 overflow-auto"
                    onScroll={handleBodyScroll}
                    role="region"
                    aria-label={t('gantt.title', 'Gantt Chart')}
                >
                    <div className="relative" style={{ width: totalTimelineWidth, height: totalContentHeight }}>
                        {timelineCols.map((col, index) => (
                            <div
                                key={`grid-${col.date.toISOString()}`}
                                className={`absolute top-0 bottom-0 border-r ${
                                    col.isWeekend ? 'border-border/15 bg-surface-alt/25' : 'border-border/10'
                                }`}
                                style={{ left: index * colWidth, width: colWidth }}
                            />
                        ))}

                        {rows.map((row, rowIndex) => (
                            <div
                                key={`row-${rowIndex}`}
                                className={`absolute left-0 right-0 border-b ${
                                    row.type === 'group'
                                        ? 'border-border/40 bg-surface-alt/35'
                                        : rowIndex % 2 === 0
                                            ? 'border-border/20'
                                            : 'border-border/20 bg-surface-alt/10'
                                }`}
                                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                            />
                        ))}

                        {todayPosition != null && (
                            <div
                                className="absolute top-0 bottom-0 z-20 w-px bg-primary/80"
                                style={{ left: todayPosition }}
                            >
                                <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-md bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
                                    {t('gantt.today', 'TODAY')}
                                </div>
                            </div>
                        )}

                        {rows.map((row, rowIndex) => {
                            if (row.type !== 'task') return null;

                            const task = row.task;
                            const { left, width } = getBarPosition(task);
                            const barColor = getBarColor(task);
                            const isOverdue = task.endDate && new Date(task.endDate) < new Date() && task.columnName?.toLowerCase() !== 'done';
                            const hasProgress = task.subtaskTotal > 0;

                            return (
                                <button
                                    key={`bar-${task.id}`}
                                    type="button"
                                    className="absolute z-10 flex items-center"
                                    style={{
                                        top: rowIndex * ROW_HEIGHT + 14,
                                        left,
                                        width,
                                        height: 24,
                                    }}
                                    onClick={() => onTaskClick?.(task)}
                                    aria-label={task.title}
                                >
                                    <span
                                        className={`relative h-full w-full overflow-hidden rounded-md border border-white/5 shadow-sm ${
                                            isOverdue ? 'ring-1 ring-red-500/60' : ''
                                        }`}
                                        style={{
                                            backgroundColor: `${barColor}2f`,
                                            borderLeft: `3px solid ${barColor}`,
                                        }}
                                    >
                                        {hasProgress && (
                                            <span
                                                className="absolute inset-y-0 left-0 opacity-35"
                                                style={{ width: `${task.progress}%`, backgroundColor: barColor }}
                                            />
                                        )}
                                        {hasProgress && width > 54 && (
                                            <span className="absolute inset-0 flex items-center justify-center px-2 text-[9px] font-semibold text-text">
                                                {task.progress}%
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
