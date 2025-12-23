import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { Column as ColumnType, Task } from '../../types/kanban';

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    onAddTask?: () => void;
    onTaskClick?: (task: Task) => void;
}

export function Column({ column, tasks, onAddTask, onTaskClick }: ColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: { type: 'column', column },
    });

    const taskIds = tasks.map((task) => task.id);

    // Determine status indicator color
    const getStatusColor = (columnName: string) => {
        const name = columnName.toLowerCase();
        if (name.includes('done') || name.includes('complete')) return 'bg-emerald-500';
        if (name.includes('progress') || name.includes('doing')) return 'bg-primary animate-pulse';
        if (name.includes('review')) return 'bg-yellow-500';
        return 'bg-slate-400';
    };

    return (
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
            {/* Column Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${getStatusColor(column.name)}`} />
                    <h3 className="text-slate-200 font-semibold text-sm">{column.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-xs font-medium">
                        {tasks.length}
                        {column.wipLimit && `/${column.wipLimit}`}
                    </span>
                </div>
                <button
                    onClick={onAddTask}
                    className="text-slate-500 hover:text-white transition-colors"
                >
                    <Plus className="size-4" />
                </button>
            </div>

            {/* Tasks Container */}
            <div
                ref={setNodeRef}
                className={`
          flex flex-col gap-3 min-h-[200px] p-2 rounded-xl transition-colors
          ${isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''}
        `}
            >
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => onTaskClick?.(task)}
                        />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="p-8 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-slate-600 text-sm">
                        No tasks
                    </div>
                )}
            </div>

            {/* Add Task Button */}
            <button
                onClick={onAddTask}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all border border-dashed border-white/10"
            >
                <Plus className="size-4" />
                Add Task
            </button>
        </div>
    );
}
