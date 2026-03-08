import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, DotsThree, PencilSimple, Trash, Gear } from '@phosphor-icons/react';
import { TaskCard } from './TaskCard';
import { ColumnSettingsModal } from './ColumnSettingsModal';
import type { Column as ColumnType, Task } from '../../types/kanban';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    onAddTask?: () => void;
    onTaskClick?: (task: Task) => void;
    onUpdateColumn?: (id: string, data: { name: string; wip_limit?: number | null; color?: string }) => void;
    onDeleteColumn?: (id: string) => void;
}

export function Column({ column, tasks, onAddTask, onTaskClick, onUpdateColumn, onDeleteColumn }: ColumnProps) {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(column.name);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRenameSubmit = () => {
        if (editName.trim() && editName.trim() !== column.name) {
            onUpdateColumn?.(column.id, {
                name: editName.trim(),
                wip_limit: column.wipLimit,
                color: column.color
            });
        } else {
            setEditName(column.name);
        }
        setIsEditing(false);
    };
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
        return 'bg-border';
    };

    const statusIndicatorClass = column.color ? '' : getStatusColor(column.name);
    const statusIndicatorStyle = column.color ? { backgroundColor: column.color } : {};

    return (
        <div className="w-[85vw] sm:w-80 flex-shrink-0 flex flex-col gap-4 snap-start">
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 relative">
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                    <div className={`size-2 shrink-0 rounded-full ${statusIndicatorClass}`} style={statusIndicatorStyle} />
                    {isEditing ? (
                        <input
                            type="text"
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') {
                                    setEditName(column.name);
                                    setIsEditing(false);
                                }
                            }}
                            className="bg-surface-alt border border-primary/50 rounded px-1.5 py-0.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary w-full"
                        />
                    ) : (
                        <h3
                            className="text-text font-semibold text-sm truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setIsEditing(true)}
                            title={t('board.click_to_rename')}
                        >
                            {column.name}
                        </h3>
                    )}
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-surface-alt text-text-muted text-xs font-medium">
                        {tasks.length}
                        {column.wipLimit && `/${column.wipLimit}`}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0" ref={menuRef}>
                    <button
                        onClick={onAddTask}
                        className="text-text-muted hover:text-primary p-1 rounded transition-colors"
                        title={t('board.add_task_title')}
                    >
                        <Plus className="size-4" />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-text-muted hover:text-primary p-1 rounded transition-colors"
                        >
                            <DotsThree className="size-5" weight="bold" />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-surface-dark border border-border rounded-lg shadow-xl overflow-hidden z-20 py-1">
                                <button
                                    onClick={() => {
                                        setIsEditing(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt transition-colors text-left"
                                >
                                    <PencilSimple className="size-4 text-text-muted" />
                                    {t('common.edit')}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsSettingsOpen(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-alt transition-colors text-left"
                                >
                                    <Gear className="size-4 text-text-muted" />
                                    {t('board.project_settings')}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        if (tasks.length > 0) {
                                            toast.error(t('board.delete_column_error'));
                                            return;
                                        }
                                        setIsDeleteConfirmOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors text-left"
                                >
                                    <Trash className="size-4" />
                                    {t('common.delete')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
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
                    <div className="p-8 border-2 border-dashed border-border-muted rounded-xl flex items-center justify-center text-text-muted text-sm">
                        {t('board.no_tasks')}
                    </div>
                )}
            </div>

            {/* Add Task Button */}
            <button
                onClick={onAddTask}
                className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-text-muted hover:bg-surface-alt hover:text-text transition-all border border-dashed border-border"
            >
                <Plus className="size-4" />
                {t('board.add_task')}
            </button>
            <ConfirmDialog
                isOpen={isDeleteConfirmOpen}
                title={t('board.confirm_delete_column_title')}
                message={t('board.confirm_delete_column_message', { name: column.name })}
                confirmText={t('common.delete')}
                isDanger={true}
                onCancel={() => setIsDeleteConfirmOpen(false)}
                onConfirm={() => {
                    setIsDeleteConfirmOpen(false);
                    onDeleteColumn?.(column.id);
                }}
            />

            {/* Column Settings Modal */}
            <ColumnSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                column={{
                    id: column.id,
                    name: column.name,
                    color: column.color,
                    wip_limit: column.wipLimit,
                }}
                onUpdate={(data) => {
                    onUpdateColumn?.(column.id, data);
                    setIsSettingsOpen(false);
                }}
            />
        </div>
    );
}
