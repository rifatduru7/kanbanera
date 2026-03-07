import { useState, useCallback, useRef, useEffect } from 'react';
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

    // Track drag destination with a ref to avoid stale closure issues
    const dragDestinationRef = useRef<{ columnId: string; position: number } | null>(null);

    // Sync local state with props
    useEffect(() => {
        setLocalColumns(columns);
    }, [columns]);

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

    const findColumnForTask = useCallback(
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
            // Initialize drag destination with current position
            const currentColumn = findColumnForTask(task.id);
            if (currentColumn) {
                const taskIndex = currentColumn.tasks.findIndex(t => t.id === task.id);
                dragDestinationRef.current = { columnId: currentColumn.id, position: taskIndex };
            }
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find current column of dragged task (from local state)
        let sourceColumn: ColumnType | undefined;
        let sourceTaskIndex = -1;

        for (const col of localColumns) {
            const idx = col.tasks.findIndex(t => t.id === activeId);
            if (idx !== -1) {
                sourceColumn = col;
                sourceTaskIndex = idx;
                break;
            }
        }

        if (!sourceColumn) return;

        // Determine target column - could be dropping on a column or a task
        let targetColumn = localColumns.find((col) => col.id === overId);
        let insertPosition = 0;

        if (targetColumn) {
            // Dropping on an empty column or column header
            insertPosition = targetColumn.tasks.length;
        } else {
            // Dropping on a task - find which column contains that task
            for (const col of localColumns) {
                const overTaskIndex = col.tasks.findIndex(t => t.id === overId);
                if (overTaskIndex !== -1) {
                    targetColumn = col;
                    insertPosition = overTaskIndex;
                    break;
                }
            }
        }

        if (!targetColumn) return;

        // Update destination ref
        dragDestinationRef.current = { columnId: targetColumn.id, position: insertPosition };

        // If moving to a different column, update local state for visual feedback
        if (sourceColumn.id !== targetColumn.id) {
            const taskToMove = sourceColumn.tasks[sourceTaskIndex];

            setLocalColumns((prev) => {
                return prev.map((col) => {
                    if (col.id === sourceColumn!.id) {
                        return {
                            ...col,
                            tasks: col.tasks.filter((t) => t.id !== activeId),
                        };
                    }
                    if (col.id === targetColumn!.id) {
                        const newTasks = [...col.tasks];
                        newTasks.splice(insertPosition, 0, { ...taskToMove, columnId: col.id });
                        return {
                            ...col,
                            tasks: newTasks,
                        };
                    }
                    return col;
                });
            });
        } else if (sourceTaskIndex !== insertPosition) {
            // Same column, different position - reorder
            setLocalColumns((prev) =>
                prev.map((col) => {
                    if (col.id === sourceColumn!.id) {
                        return {
                            ...col,
                            tasks: arrayMove(col.tasks, sourceTaskIndex, insertPosition),
                        };
                    }
                    return col;
                })
            );
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active } = event;
        setActiveTask(null);

        const activeId = active.id as string;
        const destination = dragDestinationRef.current;

        // Call API callback with the tracked destination
        if (destination) {
            onTaskMove?.(activeId, destination.columnId, destination.position);
        }

        // Reset destination ref
        dragDestinationRef.current = null;
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
