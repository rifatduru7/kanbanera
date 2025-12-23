import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

// Date utilities
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarTask {
    id: string;
    title: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
}

// Priority to color mapping
const priorityColors: Record<string, string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
};

// Mock data - will be replaced with API data
const mockTasks: CalendarTask[] = [
    { id: '1', title: 'Sprint Planning', dueDate: '2024-12-23', priority: 'high' },
    { id: '2', title: 'Design Review', dueDate: '2024-12-25', priority: 'medium' },
    { id: '3', title: 'API Integration', dueDate: '2024-12-25', priority: 'high' },
    { id: '4', title: 'Code Review', dueDate: '2024-12-27', priority: 'low' },
    { id: '5', title: 'Deployment', dueDate: '2024-12-30', priority: 'critical' },
];

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

export function CalendarPage() {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    // Get tasks for current month
    const tasksByDate = useMemo(() => {
        const map: Record<string, CalendarTask[]> = {};
        mockTasks.forEach((task) => {
            const date = task.dueDate;
            if (!map[date]) map[date] = [];
            map[date].push(task);
        });
        return map;
    }, []);

    // Navigate months
    const goToPrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    // Generate calendar cells
    const calendarDays = useMemo(() => {
        const days: { day: number; isCurrentMonth: boolean; isToday: boolean; date: string }[] = [];

        // Previous month days
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
            });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            days.push({
                day,
                isCurrentMonth: true,
                isToday,
                date: dateStr,
            });
        }

        // Next month days to fill grid
        const remainingDays = 35 - days.length; // 5 rows * 7 days
        for (let day = 1; day <= remainingDays; day++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            days.push({
                day,
                isCurrentMonth: false,
                isToday: false,
                date: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            });
        }

        return days;
    }, [year, month, daysInMonth, firstDayOfMonth, today]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Calendar Toolbar */}
            <header className="flex-shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-6 py-6 border-b border-border">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="size-8 text-primary" />
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            {MONTHS[month]} {year}
                        </h2>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border">
                        <button
                            onClick={goToPrevMonth}
                            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="size-5" />
                        </button>
                        <button
                            onClick={goToNextMonth}
                            className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white transition-colors"
                        >
                            <ChevronRight className="size-5" />
                        </button>
                    </div>

                    <button
                        onClick={goToToday}
                        className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-primary/20"
                    >
                        Today
                    </button>
                </div>

                {/* View Switcher */}
                <div className="bg-surface p-1 rounded-xl flex border border-border">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'month'
                                ? 'bg-background text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Month
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'week'
                                ? 'bg-background text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Week
                    </button>
                </div>
            </header>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col bg-surface/50 border border-border rounded-xl backdrop-blur-sm overflow-hidden shadow-2xl h-full">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 border-b border-border">
                        {DAYS_OF_WEEK.map((day) => (
                            <div key={day} className="py-3 text-center text-sm font-medium text-slate-400">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-x divide-y divide-border">
                        {calendarDays.map((item, index) => {
                            const dayTasks = tasksByDate[item.date] || [];
                            const displayTasks = dayTasks.slice(0, 3);
                            const remainingCount = dayTasks.length - 3;

                            return (
                                <div
                                    key={index}
                                    className={`group p-2 min-h-[100px] flex flex-col gap-1 cursor-pointer transition-colors ${item.isCurrentMonth
                                            ? 'hover:bg-white/[0.02]'
                                            : 'bg-background/30'
                                        } ${item.isToday ? 'bg-primary/5 relative' : ''}`}
                                >
                                    {/* Today indicator */}
                                    {item.isToday && (
                                        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                                    )}

                                    {/* Day number */}
                                    <span
                                        className={`text-sm font-medium p-1 flex items-center justify-between ${item.isCurrentMonth
                                                ? item.isToday
                                                    ? 'text-primary font-bold'
                                                    : 'text-slate-400'
                                                : 'text-slate-600'
                                            }`}
                                    >
                                        {item.day}
                                        {item.isToday && (
                                            <span className="text-[10px] bg-primary text-white px-1.5 rounded-full">
                                                Today
                                            </span>
                                        )}
                                    </span>

                                    {/* Tasks */}
                                    {displayTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className={`flex items-center gap-2 ${item.isToday
                                                    ? 'bg-primary/20 border border-primary/30'
                                                    : 'bg-surface border border-white/5'
                                                } rounded px-2 py-1 hover:border-primary/50 transition-colors`}
                                        >
                                            <div
                                                className={`size-1.5 rounded-full ${priorityColors[task.priority]} shrink-0`}
                                            />
                                            <span className="text-xs text-slate-200 truncate">{task.title}</span>
                                        </div>
                                    ))}

                                    {/* More indicator */}
                                    {remainingCount > 0 && (
                                        <span className="text-[10px] text-slate-500 pl-1 hover:text-primary hover:underline">
                                            + {remainingCount} more
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
