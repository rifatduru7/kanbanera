import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GanttTask } from '../../hooks/useGanttData';

// --- Types ---
export type ZoomLevel = 'day' | 'week' | 'month';
export type GroupBy = 'project' | 'assignee' | 'priority' | 'status';

interface GanttChartProps {
    tasks: GanttTask[];
    zoomLevel: ZoomLevel;
    groupBy: GroupBy;
    onTaskClick?: (task: GanttTask) => void;
    onTaskDateChange?: (taskId: string, newStart: string, newEnd: string) => void;
    searchQuery?: string;
}

interface TaskGroup {
    key: string;
    label: string;
    color: string;
    tasks: GanttTask[];
    collapsed: boolean;
}

// --- Helpers ---
const DAY_MS = 86400000;

function parseDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

function daysBetween(a: Date, b: Date): number {
    return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function addDays(d: Date, n: number): Date {
    return new Date(d.getTime() + n * DAY_MS);
}

function isWeekend(d: Date): boolean {
    const day = d.getDay();
    return day === 0 || day === 6;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#22c55e',
};

function getColWidth(zoom: ZoomLevel): number {
    switch (zoom) {
        case 'day': return 40;
        case 'week': return 120;
        case 'month': return 180;
    }
}

function getBarColor(task: GanttTask): string {
    return task.columnColor || task.projectColor || '#6366f1';
}

// --- Main Component ---
export function GanttChart({ tasks, zoomLevel, groupBy, onTaskClick, onTaskDateChange, searchQuery }: GanttChartProps) {
    const { t } = useTranslation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [tooltip, setTooltip] = useState<{ task: GanttTask; x: number; y: number } | null>(null);
    const [dragState, setDragState] = useState<{
        taskId: string;
        mode: 'move' | 'resize-end';
        startX: number;
        origStart: Date;
        origEnd: Date;
    } | null>(null);
    const ROW_HEIGHT = 44;
    const HEADER_HEIGHT = 60;
    const SIDEBAR_WIDTH = 280;
    const colWidth = getColWidth(zoomLevel);

    // Compute timeline range
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
        const today = new Date();
        let earliest = new Date(today.getFullYear(), today.getMonth(), 1);
        let latest = new Date(today.getFullYear(), today.getMonth() + 3, 0);

        for (const task of tasks) {
            const s = parseDate(task.startDate);
            const e = parseDate(task.endDate);
            if (s && s < earliest) earliest = new Date(s.getFullYear(), s.getMonth(), 1);
            if (e && e > latest) latest = new Date(e.getFullYear(), e.getMonth() + 1, 0);
        }

        // Add padding
        earliest = addDays(earliest, -7);
        latest = addDays(latest, 14);

        return {
            timelineStart: earliest,
            timelineEnd: latest,
            totalDays: daysBetween(earliest, latest) + 1,
        };
    }, [tasks]);

    // Filter tasks by search
    const filteredTasks = useMemo(() => {
        if (!searchQuery) return tasks;
        const q = searchQuery.toLowerCase();
        return tasks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.projectName.toLowerCase().includes(q) ||
            (t.assigneeName && t.assigneeName.toLowerCase().includes(q))
        );
    }, [tasks, searchQuery]);

    // Group tasks
    const groups: TaskGroup[] = useMemo(() => {
        const map = new Map<string, TaskGroup>();

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
                    label = task.assigneeName || t('tasks.unassigned');
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

            if (!map.has(key)) {
                map.set(key, { key, label, color, tasks: [], collapsed: collapsedGroups.has(key) });
            }
            map.get(key)!.tasks.push(task);
        }

        // Sort groups
        const result = Array.from(map.values());
        if (groupBy === 'priority') {
            result.sort((a, b) => (PRIORITY_ORDER[a.key] ?? 99) - (PRIORITY_ORDER[b.key] ?? 99));
        } else {
            result.sort((a, b) => a.label.localeCompare(b.label));
        }

        return result;
    }, [filteredTasks, groupBy, collapsedGroups, t]);

    const toggleGroup = useCallback((key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    // Build flat row list for rendering
    type RowItem = { type: 'group'; group: TaskGroup } | { type: 'task'; task: GanttTask; groupColor: string };
    const rows: RowItem[] = useMemo(() => {
        const result: RowItem[] = [];
        for (const group of groups) {
            result.push({ type: 'group', group });
            if (!collapsedGroups.has(group.key)) {
                for (const task of group.tasks) {
                    result.push({ type: 'task', task, groupColor: group.color });
                }
            }
        }
        return result;
    }, [groups, collapsedGroups]);

    // --- Timeline columns ---
    const timelineCols = useMemo(() => {
        const cols: { date: Date; label: string; isToday: boolean; isWeekend: boolean }[] = [];
        const today = new Date();

        if (zoomLevel === 'day') {
            for (let i = 0; i < totalDays; i++) {
                const d = addDays(timelineStart, i);
                cols.push({
                    date: d,
                    label: `${d.getDate()}`,
                    isToday: isSameDay(d, today),
                    isWeekend: isWeekend(d),
                });
            }
        } else if (zoomLevel === 'week') {
            // Group by weeks
            let d = new Date(timelineStart);
            // Start at Monday
            while (d.getDay() !== 1) d = addDays(d, 1);
            while (d <= timelineEnd) {
                cols.push({
                    date: new Date(d),
                    label: `${d.getDate()}/${d.getMonth() + 1}`,
                    isToday: isSameDay(d, today),
                    isWeekend: false,
                });
                d = addDays(d, 7);
            }
        } else {
            // Monthly
            let d = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
            while (d <= timelineEnd) {
                cols.push({
                    date: new Date(d),
                    label: `${d.getMonth() + 1}/${d.getFullYear()}`,
                    isToday: d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(),
                    isWeekend: false,
                });
                d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            }
        }
        return cols;
    }, [zoomLevel, timelineStart, timelineEnd, totalDays]);

    // Month headers for day/week views
    const monthHeaders = useMemo(() => {
        if (zoomLevel === 'month') return [];
        const headers: { label: string; startIdx: number; span: number }[] = [];
        let currentMonth = -1;
        let currentYear = -1;

        for (let i = 0; i < timelineCols.length; i++) {
            const d = timelineCols[i].date;
            if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
                currentMonth = d.getMonth();
                currentYear = d.getFullYear();
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                headers.push({ label: `${monthNames[currentMonth]} ${currentYear}`, startIdx: i, span: 1 });
            } else {
                headers[headers.length - 1].span++;
            }
        }
        return headers;
    }, [timelineCols, zoomLevel]);

    // Compute bar position from task dates
    const getBarPosition = useCallback((task: GanttTask) => {
        const start = parseDate(task.startDate) || new Date();
        const end = parseDate(task.endDate) || addDays(start, 1);

        const effectiveStart = start < timelineStart ? timelineStart : start;
        const effectiveEnd = end > timelineEnd ? timelineEnd : end;

        let left: number;
        let width: number;

        if (zoomLevel === 'day') {
            left = daysBetween(timelineStart, effectiveStart) * colWidth;
            width = Math.max(daysBetween(effectiveStart, effectiveEnd) * colWidth, colWidth);
        } else if (zoomLevel === 'week') {
            const startOffset = daysBetween(timelineStart, effectiveStart);
            const duration = daysBetween(effectiveStart, effectiveEnd);
            left = (startOffset / 7) * colWidth;
            width = Math.max((duration / 7) * colWidth, colWidth * 0.3);
        } else {
            const startOffset = daysBetween(timelineStart, effectiveStart);
            const duration = daysBetween(effectiveStart, effectiveEnd);
            const totalRange = daysBetween(timelineStart, timelineEnd);
            const totalWidth = timelineCols.length * colWidth;
            left = (startOffset / totalRange) * totalWidth;
            width = Math.max((duration / totalRange) * totalWidth, 24);
        }

        return { left, width };
    }, [timelineStart, timelineEnd, zoomLevel, colWidth, timelineCols.length]);

    // Today marker position
    const todayPosition = useMemo(() => {
        const today = new Date();
        if (today < timelineStart || today > timelineEnd) return null;
        if (zoomLevel === 'day') {
            return daysBetween(timelineStart, today) * colWidth;
        } else if (zoomLevel === 'week') {
            return (daysBetween(timelineStart, today) / 7) * colWidth;
        } else {
            const totalRange = daysBetween(timelineStart, timelineEnd);
            return (daysBetween(timelineStart, today) / totalRange) * timelineCols.length * colWidth;
        }
    }, [timelineStart, timelineEnd, zoomLevel, colWidth, timelineCols.length]);

    // Scroll to today on mount
    useEffect(() => {
        if (todayPosition != null && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const targetScroll = todayPosition - container.clientWidth / 3;
            container.scrollLeft = Math.max(0, targetScroll);
        }
    }, [todayPosition]);

    // Sync sidebar scroll with main scroll
    const handleScroll = useCallback(() => {
        if (scrollContainerRef.current && sidebarRef.current) {
            sidebarRef.current.scrollTop = scrollContainerRef.current.scrollTop;
        }
    }, []);

    // --- Drag Handling ---
    const handleMouseDown = useCallback((e: React.MouseEvent, task: GanttTask, mode: 'move' | 'resize-end') => {
        e.preventDefault();
        e.stopPropagation();
        const start = parseDate(task.startDate) || new Date();
        const end = parseDate(task.endDate) || addDays(start, 1);
        setDragState({ taskId: task.id, mode, startX: e.clientX, origStart: start, origEnd: end });
    }, []);

    useEffect(() => {
        if (!dragState) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragState || !onTaskDateChange) return;
            const dx = e.clientX - dragState.startX;
            let daysDelta: number;

            if (zoomLevel === 'day') daysDelta = Math.round(dx / colWidth);
            else if (zoomLevel === 'week') daysDelta = Math.round((dx / colWidth) * 7);
            else daysDelta = Math.round((dx / colWidth) * 30);

            if (daysDelta === 0) return;

            if (dragState.mode === 'move') {
                const newStart = addDays(dragState.origStart, daysDelta);
                const newEnd = addDays(dragState.origEnd, daysDelta);
                onTaskDateChange(dragState.taskId, formatDate(newStart), formatDate(newEnd));
            } else {
                const newEnd = addDays(dragState.origEnd, daysDelta);
                if (newEnd > dragState.origStart) {
                    onTaskDateChange(dragState.taskId, formatDate(dragState.origStart), formatDate(newEnd));
                }
            }
        };

        const handleMouseUp = () => setDragState(null);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, colWidth, zoomLevel, onTaskDateChange]);

    const totalTimelineWidth = timelineCols.length * colWidth;
    const totalContentHeight = rows.length * ROW_HEIGHT;

    return (
        <div className="flex h-full bg-background border border-border rounded-xl overflow-hidden">
            {/* Sidebar - Task List */}
            <div className="flex flex-col border-r border-border bg-surface" style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}>
                {/* Sidebar header */}
                <div
                    className="flex items-center px-4 border-b border-border bg-surface-alt text-text-muted text-xs font-bold uppercase tracking-wider"
                    style={{ height: HEADER_HEIGHT, minHeight: HEADER_HEIGHT }}
                >
                    {t('gantt.tasks_label', 'Tasks')}
                    <span className="ml-auto text-text-muted/60 font-medium normal-case tracking-normal">
                        {filteredTasks.length}
                    </span>
                </div>

                {/* Sidebar rows */}
                <div
                    ref={sidebarRef}
                    className="flex-1 overflow-hidden"
                    style={{ overflowY: 'hidden' }}
                >
                    <div style={{ height: totalContentHeight }}>
                        {rows.map((row) => {
                            if (row.type === 'group') {
                                const g = row.group;
                                return (
                                    <div
                                        key={`g-${g.key}`}
                                        className="flex items-center gap-2 px-3 cursor-pointer hover:bg-surface-alt/50 transition-colors border-b border-border/50"
                                        style={{ height: ROW_HEIGHT }}
                                        onClick={() => toggleGroup(g.key)}
                                    >
                                        <div className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                                        <span className="text-sm font-semibold text-text truncate">{g.label}</span>
                                        <span className="text-xs text-text-muted ml-auto flex-shrink-0">{g.tasks.length}</span>
                                        <svg
                                            className={`size-3.5 text-text-muted transition-transform ${collapsedGroups.has(g.key) ? '-rotate-90' : ''}`}
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                );
                            }

                            const task = row.task;
                            return (
                                <div
                                    key={`t-${task.id}`}
                                    className="flex items-center gap-2 px-3 pl-6 cursor-pointer hover:bg-surface-alt/50 transition-colors border-b border-border/30 group"
                                    style={{ height: ROW_HEIGHT }}
                                    onClick={() => onTaskClick?.(task)}
                                >
                                    {/* Priority dot */}
                                    <div
                                        className="size-1.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                                    />
                                    <span className="text-sm text-text truncate flex-1 group-hover:text-primary transition-colors">
                                        {task.title}
                                    </span>
                                    {task.assigneeName && (
                                        <span className="text-[10px] text-text-muted truncate max-w-[60px]" title={task.assigneeName}>
                                            {task.assigneeName.split(' ')[0]}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Timeline area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Timeline header */}
                <div style={{ height: HEADER_HEIGHT, minHeight: HEADER_HEIGHT }} className="border-b border-border bg-surface-alt overflow-hidden">
                    <div
                        ref={headerRef}
                        className="h-full"
                        style={{ width: totalTimelineWidth, display: 'flex', flexDirection: 'column' }}
                    >
                        {/* Month row */}
                        {monthHeaders.length > 0 && (
                            <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                                {monthHeaders.map((mh, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-center text-xs font-bold text-text-muted uppercase tracking-wider border-r border-border/50"
                                        style={{ width: mh.span * colWidth }}
                                    >
                                        {mh.label}
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Day/Week/Month row */}
                        <div className="flex" style={{ height: monthHeaders.length > 0 ? HEADER_HEIGHT / 2 : HEADER_HEIGHT }}>
                            {timelineCols.map((col, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-center text-[10px] font-medium border-r border-border/30 flex-shrink-0 ${
                                        col.isToday ? 'text-primary font-bold bg-primary/10' : col.isWeekend ? 'text-text-muted/50 bg-surface-alt/50' : 'text-text-muted'
                                    }`}
                                    style={{ width: colWidth }}
                                >
                                    {col.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chart body */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-auto relative"
                    onScroll={(e) => {
                        handleScroll();
                        // Sync header horizontal scroll
                        if (headerRef.current) {
                            headerRef.current.style.transform = `translateX(-${(e.target as HTMLDivElement).scrollLeft}px)`;
                        }
                    }}
                >
                    <div
                        className="relative"
                        style={{ width: totalTimelineWidth, height: totalContentHeight }}
                    >
                        {/* Grid lines */}
                        {timelineCols.map((col, i) => (
                            <div
                                key={`grid-${i}`}
                                className={`absolute top-0 bottom-0 border-r ${
                                    col.isWeekend ? 'bg-surface-alt/30 border-border/20' : 'border-border/15'
                                }`}
                                style={{ left: i * colWidth, width: colWidth }}
                            />
                        ))}

                        {/* Row backgrounds */}
                        {rows.map((row, rIdx) => (
                            <div
                                key={`row-bg-${rIdx}`}
                                className={`absolute left-0 right-0 border-b ${
                                    row.type === 'group' ? 'bg-surface-alt/40 border-border/50' : 'border-border/20'
                                } ${rIdx % 2 === 0 ? '' : 'bg-surface-alt/10'}`}
                                style={{ top: rIdx * ROW_HEIGHT, height: ROW_HEIGHT }}
                            />
                        ))}

                        {/* Today marker */}
                        {todayPosition != null && (
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-primary/80 z-20"
                                style={{ left: todayPosition }}
                            >
                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-primary text-white text-[9px] font-bold rounded-b-md whitespace-nowrap">
                                    {t('gantt.today', 'TODAY')}
                                </div>
                            </div>
                        )}

                        {/* Task bars */}
                        {rows.map((row, rowIdx) => {
                            if (row.type !== 'task') return null;
                            const task = row.task;
                            const { left, width } = getBarPosition(task);
                            const barColor = getBarColor(task);
                            const isOverdue = task.endDate && new Date(task.endDate) < new Date() && task.columnName?.toLowerCase() !== 'done';
                            const hasProgress = task.subtaskTotal > 0;

                            return (
                                <div
                                    key={`bar-${task.id}`}
                                    className={`absolute flex items-center z-10 group/bar ${dragState?.taskId === task.id ? 'opacity-70' : ''}`}
                                    style={{
                                        top: rowIdx * ROW_HEIGHT + 8,
                                        left,
                                        width,
                                        height: ROW_HEIGHT - 16,
                                    }}
                                >
                                    {/* Main bar */}
                                    <div
                                        className={`relative h-full w-full rounded-md cursor-pointer flex items-center overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                                            isOverdue ? 'ring-1 ring-red-500/50' : ''
                                        }`}
                                        style={{ backgroundColor: `${barColor}30`, borderLeft: `3px solid ${barColor}` }}
                                        onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                                        onMouseEnter={(e) => setTooltip({ task, x: e.clientX, y: e.clientY })}
                                        onMouseLeave={() => setTooltip(null)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTaskClick?.(task);
                                        }}
                                    >
                                        {/* Progress fill */}
                                        {hasProgress && (
                                            <div
                                                className="absolute inset-0 rounded-r-md opacity-30"
                                                style={{
                                                    width: `${task.progress}%`,
                                                    backgroundColor: barColor,
                                                }}
                                            />
                                        )}

                                        {/* Bar label */}
                                        {width > 60 && (
                                            <span className="relative z-10 text-[11px] font-medium text-text truncate px-2">
                                                {task.title}
                                            </span>
                                        )}

                                        {/* Progress text */}
                                        {hasProgress && width > 120 && (
                                            <span className="relative z-10 text-[9px] text-text-muted ml-auto pr-2 flex-shrink-0">
                                                {task.subtaskCompleted}/{task.subtaskTotal}
                                            </span>
                                        )}
                                    </div>

                                    {/* Resize handle (right) */}
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 hover:bg-white/20 rounded-r-md transition-opacity z-20"
                                        onMouseDown={(e) => handleMouseDown(e, task, 'resize-end')}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {tooltip && (
                <GanttTooltip task={tooltip.task} x={tooltip.x} y={tooltip.y} t={t} />
            )}
        </div>
    );
}

// --- Tooltip ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GanttTooltip({ task, x, y, t }: { task: GanttTask; x: number; y: number; t: any }) {
    const startDate = parseDate(task.startDate);
    const endDate = parseDate(task.endDate);
    const isOverdue = endDate && endDate < new Date() && task.columnName?.toLowerCase() !== 'done';

    return (
        <div
            className="fixed z-[9999] pointer-events-none"
            style={{ left: x + 12, top: y - 10 }}
        >
            <div className="bg-surface border border-border rounded-xl shadow-2xl p-3 min-w-[220px] max-w-[300px]">
                <div className="flex items-start gap-2 mb-2">
                    <div className="size-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{task.title}</p>
                        <p className="text-[11px] text-text-muted">{task.projectName} &middot; {task.columnName}</p>
                    </div>
                </div>

                <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                        <span className="text-text-muted">{t('gantt.start', 'Start')}</span>
                        <span className="text-text font-medium">{startDate ? formatDate(startDate) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">{t('gantt.end', 'End')}</span>
                        <span className={`font-medium ${isOverdue ? 'text-red-400' : 'text-text'}`}>
                            {endDate ? formatDate(endDate) : '—'}
                            {isOverdue && ' ⚠'}
                        </span>
                    </div>
                    {task.assigneeName && (
                        <div className="flex justify-between">
                            <span className="text-text-muted">{t('tasks.assignee', 'Assignee')}</span>
                            <span className="text-text font-medium">{task.assigneeName}</span>
                        </div>
                    )}
                    {task.subtaskTotal > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-text-muted">{t('gantt.progress', 'Progress')}</span>
                            <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-primary"
                                        style={{ width: `${task.progress}%` }}
                                    />
                                </div>
                                <span className="text-text font-medium">{task.progress}%</span>
                            </div>
                        </div>
                    )}
                    {task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                            {task.labels.slice(0, 3).map(label => (
                                <span key={label} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary">
                                    {label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
