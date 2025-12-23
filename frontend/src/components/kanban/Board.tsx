import { useState, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import type { Column as ColumnType, Task } from '../../types/kanban';

interface BoardProps {
    columns: ColumnType[];
    onTaskMove?: (taskId: string, toColumnId: string, newPosition: number) => void;
    onTaskClick?: (task: Task) => void;
    onAddTask?: (columnId: string) => void;
}

export function Board({ columns, onTaskMove, onTaskClick, onAddTask }: BoardProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [localColumns, setLocalColumns] = useState(columns);

    // Update local state when props change
    if (JSON.stringify(columns) !== JSON.stringify(localColumns)) {
        setLocalColumns(columns);
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findColumn = useCallback(
        (taskId: string) => {
            return localColumns.find((col) =>
                col.tasks.some((task) => task.id === taskId)
            );
        },
        [localColumns]
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = active.data.current?.task as Task | undefined;
        if (task) {
            setActiveTask(task);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeColumn = findColumn(activeId);
        const overColumn =
            localColumns.find((col) => col.id === overId) || findColumn(overId);

        if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) {
            return;
        }

        // Move task to new column
        setLocalColumns((prev) => {
            const activeTaskIndex = activeColumn.tasks.findIndex(
                (t) => t.id === activeId
            );
            const activeTaskData = activeColumn.tasks[activeTaskIndex];

            return prev.map((col) => {
                if (col.id === activeColumn.id) {
                    return {
                        ...col,
                        tasks: col.tasks.filter((t) => t.id !== activeId),
                    };
                }
                if (col.id === overColumn.id) {
                    const overTaskIndex = col.tasks.findIndex((t) => t.id === overId);
                    const insertIndex = overTaskIndex >= 0 ? overTaskIndex : col.tasks.length;
                    return {
                        ...col,
                        tasks: [
                            ...col.tasks.slice(0, insertIndex),
                            { ...activeTaskData, columnId: col.id },
                            ...col.tasks.slice(insertIndex),
                        ],
                    };
                }
                return col;
            });
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeColumn = findColumn(activeId);

        if (!activeColumn) return;

        // Same column reorder
        if (activeId !== overId) {
            const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId);
            const overIndex = activeColumn.tasks.findIndex((t) => t.id === overId);

            if (activeIndex !== -1 && overIndex !== -1) {
                setLocalColumns((prev) =>
                    prev.map((col) => {
                        if (col.id === activeColumn.id) {
                            return {
                                ...col,
                                tasks: arrayMove(col.tasks, activeIndex, overIndex),
                            };
                        }
                        return col;
                    })
                );
            }
        }

        // Call API callback for persistence
        const finalColumn = findColumn(activeId);
        if (finalColumn) {
            const taskIndex = finalColumn.tasks.findIndex((t) => t.id === activeId);
            onTaskMove?.(activeId, finalColumn.id, taskIndex);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-6 min-w-max">
                    {localColumns.map((column) => (
                        <Column
                            key={column.id}
                            column={column}
                            tasks={column.tasks}
                            onAddTask={() => onAddTask?.(column.id)}
                            onTaskClick={onTaskClick}
                        />
                    ))}
                </div>
            </div>

            <DragOverlay>
                {activeTask && (
                    <div className="rotate-3 scale-105">
                        <TaskCard task={activeTask} />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
