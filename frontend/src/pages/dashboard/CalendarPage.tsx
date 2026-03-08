import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretLeft as ChevronLeft, CaretRight as ChevronRight, CalendarBlank as Calendar, CircleNotch as Loader2, Funnel, Target, CheckCircle, Clock, WarningCircle, Plus, X } from '@phosphor-icons/react';
import { useTasksByDateRange, type CalendarTask, type CalendarFilters } from '../../hooks/useCalendarData';
import { useProjects, useCreateTask, useProjectColumns } from '../../hooks/useKanbanData';
import { toast } from 'react-hot-toast';

// Date utilities keys
const DAYS_OF_WEEK_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS_KEYS = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
];

// Priority to color mapping
const priorityColors: Record<string, string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
};

interface CalendarProjectOption {
    id: string;
    name: string;
}

interface CalendarColumnOption {
    id: string;
    name: string;
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

export function CalendarPage() {
    const { t } = useTranslation();
    const today = useMemo(() => new Date(), []);
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

    // Filters State
    const [filters, setFilters] = useState<CalendarFilters>({
        assigneeId: '',
    });

    // Quick Add State
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [quickTaskTitle, setQuickTaskTitle] = useState('');
    const [quickProjectId, setQuickProjectId] = useState('');
    const [quickColumnId, setQuickColumnId] = useState('');

    const { data: projectsData } = useProjects();
    const projects = (projectsData?.projects || []) as CalendarProjectOption[];

    const { data: columnsData } = useProjectColumns(quickProjectId);
    const projectColumns = (columnsData?.columns || []) as CalendarColumnOption[];

    const createTaskMutation = useCreateTask();

    const DAYS_OF_WEEK = useMemo(() => DAYS_OF_WEEK_KEYS.map(key => t(`common.days.${key}`)), [t]);
    const MONTHS = useMemo(() => MONTHS_KEYS.map(key => t(`common.months.${key}`)), [t]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    // Get date range for API call based on view mode
    const { from, to } = useMemo(() => {
        if (viewMode === 'month') {
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            return {
                from: start.toISOString().split('T')[0],
                to: end.toISOString().split('T')[0],
            };
        } else {
            // Week range (Start from Sunday)
            const start = new Date(currentDate);
            start.setDate(currentDate.getDate() - currentDate.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return {
                from: start.toISOString().split('T')[0],
                to: end.toISOString().split('T')[0],
            };
        }
    }, [year, month, currentDate, viewMode]);

    // Fetch tasks from API
    const { data: tasks = [], isLoading } = useTasksByDateRange(from, to, {
        projectId: filters.projectId || undefined,
        priority: filters.priority || undefined,
        assigneeId: filters.assigneeId || undefined,
    });

    // Stats Calculation
    const stats = useMemo(() => {
        const total = tasks.length;
        const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.columnName.toLowerCase() !== 'done').length;
        const highPriority = tasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;
        const completed = tasks.filter(t => t.columnName.toLowerCase() === 'done').length;

        return { total, overdue, highPriority, completed };
    }, [tasks, today]);

    // Get tasks for current month/week
    const tasksByDate = useMemo(() => {
        const map: Record<string, CalendarTask[]> = {};
        tasks.forEach((task) => {
            const date = task.dueDate?.split('T')[0];
            if (date) {
                if (!map[date]) map[date] = [];
                map[date].push(task);
            }
        });
        return map;
    }, [tasks]);

    // Navigation
    const goToPrev = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(year, month - 1, 1));
        } else {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 7);
            setCurrentDate(newDate);
        }
    };

    const goToNext = () => {
        if (viewMode === 'month') {
            setCurrentDate(new Date(year, month + 1, 1));
        } else {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 7);
            setCurrentDate(newDate);
        }
    };

    const goToToday = () => {
        const todayAtStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        setCurrentDate(todayAtStart);
    };

    const handleCellClick = (date: string) => {
        setSelectedDate(date);
        setIsQuickAddOpen(true);
    };

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickTaskTitle || !quickProjectId || !quickColumnId || !selectedDate) {
            toast.error(t('calendar.quick_add.fill_all_fields'));
            return;
        }

        try {
            await createTaskMutation.mutateAsync({
                project_id: quickProjectId,
                column_id: quickColumnId,
                title: quickTaskTitle,
                due_date: `${selectedDate}T12:00:00Z`,
                priority: 'medium'
            });
            toast.success(t('calendar.quick_add.create_success'));
            setIsQuickAddOpen(false);
            setQuickTaskTitle('');
            setQuickProjectId('');
            setQuickColumnId('');
        } catch {
            toast.error(t('calendar.quick_add.create_failed'));
        }
    };

    // Generate calendar cells
    const calendarDays = useMemo(() => {
        const days: { day: number; isCurrentMonth: boolean; isToday: boolean; date: string; monthName: string }[] = [];

        if (viewMode === 'month') {
            const prevMonthDays = getDaysInMonth(year, month - 1);
            for (let i = firstDayOfMonth - 1; i >= 0; i--) {
                const day = prevMonthDays - i;
                const prevMonth = month === 0 ? 11 : month - 1;
                const prevYear = month === 0 ? year - 1 : year;
                days.push({
                    day,
                    isCurrentMonth: false,
                    isToday: false,
                    date: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    monthName: MONTHS[prevMonth],
                });
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                days.push({
                    day,
                    isCurrentMonth: true,
                    isToday,
                    date: dateStr,
                    monthName: MONTHS[month],
                });
            }

            const remainingDays = 42 - days.length;
            for (let day = 1; day <= remainingDays; day++) {
                const nextMonth = month === 11 ? 0 : month + 1;
                const nextYear = month === 11 ? year + 1 : year;
                days.push({
                    day,
                    isCurrentMonth: false,
                    isToday: false,
                    date: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    monthName: MONTHS[nextMonth],
                });
            }
        } else {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(startOfWeek);
                dayDate.setDate(startOfWeek.getDate() + i);
                const dayYear = dayDate.getFullYear();
                const dayMonth = dayDate.getMonth();
                const dayNum = dayDate.getDate();
                const dateStr = `${dayYear}-${String(dayMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                days.push({
                    day: dayNum,
                    isCurrentMonth: dayMonth === month,
                    isToday: dayNum === today.getDate() && dayMonth === today.getMonth() && dayYear === today.getFullYear(),
                    date: dateStr,
                    monthName: MONTHS[dayMonth],
                });
            }
        }
        return days;
    }, [year, month, daysInMonth, firstDayOfMonth, today, viewMode, currentDate, MONTHS]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">
            {/* Quick Stats Bar */}
            <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="glass-card p-3 rounded-xl border-l-4 border-l-primary flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Target className="size-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none mb-1">{t('calendar.stats.total')}</p>
                        <p className="text-lg font-bold text-text leading-none">{stats.total}</p>
                    </div>
                </div>
                <div className="glass-card p-3 rounded-xl border-l-4 border-l-red-500 flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <Clock className="size-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none mb-1">{t('calendar.stats.overdue')}</p>
                        <p className="text-lg font-bold text-red-500 leading-none">{stats.overdue}</p>
                    </div>
                </div>
                <div className="glass-card p-3 rounded-xl border-l-4 border-l-orange-500 flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                        <WarningCircle className="size-5 text-orange-500" />
                    </div>
                    <div>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none mb-1">{t('calendar.stats.high_priority')}</p>
                        <p className="text-lg font-bold text-orange-500 leading-none">{stats.highPriority}</p>
                    </div>
                </div>
                <div className="glass-card p-3 rounded-xl border-l-4 border-l-green-500 flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle className="size-5 text-green-500" />
                    </div>
                    <div>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider leading-none mb-1">{t('calendar.stats.completed')}</p>
                        <p className="text-lg font-bold text-green-500 leading-none">{stats.completed}</p>
                    </div>
                </div>
            </div>

            {/* Calendar Toolbar */}
            <header className="flex-shrink-0 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 px-6 py-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 mr-2">
                        <Calendar className="size-8 text-primary" />
                        <h2 className="text-2xl font-bold text-text tracking-tight whitespace-nowrap">
                            {viewMode === 'month'
                                ? `${MONTHS[month]} ${year}`
                                : `${calendarDays[0].monthName} ${calendarDays[0].day} - ${calendarDays[6].monthName} ${calendarDays[6].day}, ${year}`
                            }
                        </h2>
                        {isLoading && <Loader2 className="size-5 text-primary animate-spin" />}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border">
                            <button
                                onClick={goToPrev}
                                className="p-1.5 hover:bg-surface-alt rounded text-text-muted hover:text-text transition-colors"
                            >
                                <ChevronLeft className="size-5" />
                            </button>
                            <button
                                onClick={goToNext}
                                className="p-1.5 hover:bg-surface-alt rounded text-text-muted hover:text-text transition-colors"
                            >
                                <ChevronRight className="size-5" />
                            </button>
                        </div>

                        <button
                            onClick={goToToday}
                            className="bg-surface border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface-alt transition-colors"
                        >
                            {t('calendar.today')}
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 ml-4">
                        <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
                            <Funnel className="size-4 text-text-muted" />
                            <select
                                value={filters.projectId}
                                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                                className="bg-transparent text-sm text-text border-none focus:ring-0 outline-none"
                            >
                                <option value="">{t('calendar.filters.all_projects')}</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5">
                            <Target className="size-4 text-text-muted" />
                            <select
                                value={filters.priority}
                                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                className="bg-transparent text-sm text-text border-none focus:ring-0 outline-none"
                            >
                                <option value="">{t('calendar.filters.all_priorities')}</option>
                                <option value="low">{t('common.priority.low')}</option>
                                <option value="medium">{t('common.priority.medium')}</option>
                                <option value="high">{t('common.priority.high')}</option>
                                <option value="critical">{t('common.priority.critical')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-3">
                    <div className="bg-surface p-1 rounded-xl flex border border-border">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'month'
                                ? 'bg-background text-text shadow-sm'
                                : 'text-text-muted hover:text-text'
                                }`}
                        >
                            {t('calendar.month')}
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'week'
                                ? 'bg-background text-text shadow-sm'
                                : 'text-text-muted hover:text-text'
                                }`}
                        >
                            {t('calendar.week')}
                        </button>
                    </div>
                </div>
            </header>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
                <div className="flex flex-col bg-surface/50 border border-border rounded-2xl backdrop-blur-sm overflow-hidden shadow-2xl h-full min-h-[600px]">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-border bg-surface/80">
                        {DAYS_OF_WEEK.map((day) => (
                            <div key={day} className="py-4 text-center text-xs font-bold text-text-muted uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className={`flex-1 grid grid-cols-7 divide-x divide-y divide-border ${viewMode === 'month' ? 'grid-rows-6' : 'grid-rows-1'
                        }`}>
                        {calendarDays.map((item, index) => {
                            const dayTasks = tasksByDate[item.date] || [];
                            const displayTasks = viewMode === 'month' ? dayTasks.slice(0, 3) : dayTasks;
                            const remainingCount = viewMode === 'month' ? Math.max(0, dayTasks.length - 3) : 0;

                            // Workload Heatmap - subtle background based on task count
                            let heatmapClass = '';
                            if (item.isCurrentMonth) {
                                if (dayTasks.length >= 7) heatmapClass = 'bg-red-500/10';
                                else if (dayTasks.length >= 4) heatmapClass = 'bg-orange-400/10';
                                else if (dayTasks.length >= 1) heatmapClass = 'bg-primary/5';
                            }

                            return (
                                <div
                                    key={`${item.date}-${index}`}
                                    onClick={() => handleCellClick(item.date)}
                                    className={`group p-3 flex flex-col gap-2 transition-all duration-300 relative ${item.isCurrentMonth ? `hover:bg-white/[0.04] ${heatmapClass}` : 'bg-background/20 opacity-50'
                                        } ${item.isToday ? 'bg-primary/10' : 'cursor-pointer'}`}
                                >
                                    {/* Today indicator */}
                                    {item.isToday && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-cyan-400 z-10" />
                                    )}

                                    {/* Cell Header */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-bold ${item.isToday ? 'text-primary' : item.isCurrentMonth ? 'text-text' : 'text-text-muted'
                                            }`}>
                                            {item.day}
                                        </span>
                                        {item.isToday && (
                                            <span className="text-[9px] bg-primary text-black font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                                                {t('calendar.today_badge')}
                                            </span>
                                        )}
                                        {dayTasks.length > 0 && (
                                            <span className="text-[10px] text-text-muted font-medium bg-surface-alt px-1.5 rounded-full border border-border">
                                                {dayTasks.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Tasks */}
                                    <div className="flex flex-col gap-1.5 overflow-hidden">
                                        {displayTasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className={`flex flex-col gap-1 rounded-xl p-2 border border-white/5 transition-all hover:scale-[1.02] hover:shadow-lg group/task ${task.columnName.toLowerCase() === 'done' ? 'opacity-60 bg-surface/40' : 'bg-surface/80 shadow-sm'
                                                    }`}
                                                title={`${task.title} - ${task.projectName}`}
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className={`size-2 rounded-full ${priorityColors[task.priority] || 'bg-gray-500'} shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.2)]`} />
                                                    <span className={`text-[11px] font-semibold text-text truncate group-hover/task:text-primary transition-colors ${task.columnName.toLowerCase() === 'done' ? 'line-through' : ''
                                                        }`}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between opacity-0 group-hover/task:opacity-100 transition-opacity duration-200">
                                                    <span className="text-[9px] text-text-muted font-bold truncate">
                                                        {task.projectName}
                                                    </span>
                                                    <span className="text-[9px] text-primary/80 font-bold uppercase tracking-tighter">
                                                        {task.columnName}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* More indicator */}
                                    {remainingCount > 0 && (
                                        <div className="mt-auto px-1">
                                            <span className="text-[10px] font-bold text-primary/80 hover:text-primary transition-colors">
                                                {t('calendar.more_tasks', { count: remainingCount })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Quick Add Modal */}
            {isQuickAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Plus className="size-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-text">{t('calendar.quick_add.title')}</h3>
                            </div>
                            <button onClick={() => setIsQuickAddOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-colors">
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleQuickAdd} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">{t('calendar.quick_add.task_title')}</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={quickTaskTitle}
                                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                                    placeholder={t('calendar.quick_add.task_title_placeholder')}
                                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-text-muted/50"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">{t('calendar.quick_add.project')}</label>
                                    <select
                                        value={quickProjectId}
                                        onChange={(e) => setQuickProjectId(e.target.value)}
                                        className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        required
                                    >
                                        <option value="">{t('calendar.quick_add.select_project')}</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">{t('calendar.quick_add.column')}</label>
                                    <select
                                        value={quickColumnId}
                                        onChange={(e) => setQuickColumnId(e.target.value)}
                                        className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        required
                                        disabled={!quickProjectId}
                                    >
                                        <option value="">{t('calendar.quick_add.select_column')}</option>
                                        {projectColumns.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">{t('calendar.quick_add.due_date')}</label>
                                <div className="bg-background/30 rounded-xl px-4 py-3 border border-white/5 text-sm text-text-muted flex items-center gap-2">
                                    <Calendar className="size-4" />
                                    {selectedDate}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsQuickAddOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-text font-bold hover:bg-white/10 transition-all border border-white/5"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={createTaskMutation.isPending}
                                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    {createTaskMutation.isPending ? <Loader2 className="size-5 animate-spin" /> : t('calendar.quick_add.create_button')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
