import { useState } from 'react';
import { Board } from '../../components/kanban/Board';
import { TaskModal } from '../../components/kanban/TaskModal';
import { Filter } from 'lucide-react';
import type { Column, Task } from '../../types/kanban';
import type { TaskDetail } from '../../types/task-detail';

// Mock data for demonstration
const mockColumns: Column[] = [
    {
        id: 'col-1',
        name: 'To Do',
        position: 0,
        color: '#6366f1',
        tasks: [
            {
                id: 'task-1',
                title: 'Design R2 storage bucket structure for user uploads',
                description: 'Plan the folder hierarchy and access patterns for R2',
                priority: 'medium',
                columnId: 'col-1',
                position: 0,
                labels: ['Backend'],
                assigneeName: 'Alex Morgan',
                commentCount: 2,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: 'task-2',
                title: 'Implement JWT rotation logic',
                priority: 'high',
                columnId: 'col-1',
                position: 1,
                labels: ['Auth'],
                attachmentCount: 1,
                assigneeName: 'Sarah J',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
    },
    {
        id: 'col-2',
        name: 'In Progress',
        position: 1,
        color: '#1392ec',
        tasks: [
            {
                id: 'task-3',
                title: 'Integrate Kanban drag-and-drop library',
                description: 'Use @dnd-kit for smooth drag and drop experience',
                priority: 'high',
                columnId: 'col-2',
                position: 0,
                labels: ['Frontend'],
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                subtaskCount: 5,
                subtaskCompleted: 3,
                assigneeName: 'John Doe',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
    },
    {
        id: 'col-3',
        name: 'Review',
        position: 2,
        color: '#8b5cf6',
        tasks: [
            {
                id: 'task-4',
                title: 'Finalize glassmorphism icon set',
                priority: 'medium',
                columnId: 'col-3',
                position: 0,
                labels: ['Design'],
                assigneeName: 'Jane Smith',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
    },
    {
        id: 'col-4',
        name: 'Done',
        position: 3,
        color: '#22c55e',
        tasks: [],
    },
];

// Helper to create mock task detail from basic task
function createMockTaskDetail(task: Task, columnName: string): TaskDetail {
    return {
        ...task,
        status: columnName,
        projectId: 'project-1',
        projectName: 'Cloud Migration',
        subtasks: [
            { id: 'sub-1', taskId: task.id, title: 'Design Token Payload Structure', isCompleted: true, position: 0, createdAt: new Date().toISOString() },
            { id: 'sub-2', taskId: task.id, title: 'Generate RS256 Key Pair', isCompleted: true, position: 1, createdAt: new Date().toISOString() },
            { id: 'sub-3', taskId: task.id, title: 'Implement Worker Signing Logic', isCompleted: false, position: 2, createdAt: new Date().toISOString() },
            { id: 'sub-4', taskId: task.id, title: 'Unit Test Verification Middleware', isCompleted: false, position: 3, createdAt: new Date().toISOString() },
        ],
        comments: [
            {
                id: 'comment-1',
                taskId: task.id,
                userId: 'user-2',
                userName: 'Sarah Jenkins',
                content: 'Make sure to use the RS256 algorithm for signing. We need asymmetric keys for the public verification endpoint.',
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: 'comment-2',
                taskId: task.id,
                userId: 'user-1',
                userName: 'You',
                content: "Got it. I've already generated the keys and stored them in Worker Secrets.",
                createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            },
        ],
        attachments: [
            {
                id: 'att-1',
                taskId: task.id,
                fileName: 'auth_schema_v1.png',
                fileSize: 2.4 * 1024 * 1024,
                mimeType: 'image/png',
                createdAt: new Date().toISOString(),
            },
            {
                id: 'att-2',
                taskId: task.id,
                fileName: 'specs.pdf',
                fileSize: 120 * 1024,
                mimeType: 'application/pdf',
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
        ],
    };
}

export function BoardPage() {
    const [columns] = useState<Column[]>(mockColumns);
    const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);

    const handleTaskMove = (taskId: string, toColumnId: string, newPosition: number) => {
        console.log('Task moved:', { taskId, toColumnId, newPosition });
        // TODO: Call API to persist the move
    };

    const handleTaskClick = (task: Task) => {
        const column = columns.find(c => c.id === task.columnId);
        const taskDetail = createMockTaskDetail(task, column?.name || 'Unknown');
        setSelectedTask(taskDetail);
    };

    const handleAddTask = (columnId: string) => {
        console.log('Add task to column:', columnId);
        // TODO: Open create task modal
    };

    const handleCloseModal = () => {
        setSelectedTask(null);
    };

    const handleUpdateTask = (updates: Partial<TaskDetail>) => {
        console.log('Update task:', updates);
        // TODO: Call API to update task
    };

    const handleAddSubtask = (title: string) => {
        console.log('Add subtask:', title);
        // TODO: Call API to add subtask
    };

    const handleToggleSubtask = (subtaskId: string, completed: boolean) => {
        console.log('Toggle subtask:', { subtaskId, completed });
        // TODO: Call API to toggle subtask
    };

    const handleAddComment = (content: string) => {
        console.log('Add comment:', content);
        // TODO: Call API to add comment
    };

    return (
        <div className="flex flex-col gap-8 h-full">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div className="flex flex-col gap-2">
                    <nav aria-label="Breadcrumb" className="flex gap-2 text-sm mb-1">
                        <a href="#" className="text-slate-400 hover:text-primary transition-colors">
                            Home
                        </a>
                        <span className="text-slate-600">/</span>
                        <a href="#" className="text-slate-400 hover:text-primary transition-colors">
                            Sprints
                        </a>
                        <span className="text-slate-600">/</span>
                        <span className="text-primary font-medium">Sprint 4 Board</span>
                    </nav>
                    <h2 className="text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                        Sprint 4 Board
                    </h2>
                    <p className="text-slate-400 text-sm max-w-2xl">
                        Manage tasks for the cloud migration initiative. Focus on database schema validation and API gateway setup.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {/* Team Avatars */}
                    <div className="flex -space-x-3">
                        {['AM', 'SJ', 'JD', '+2'].map((initials, i) => (
                            <div
                                key={i}
                                className="size-8 rounded-full border-2 border-background-dark bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-[10px] font-bold text-white"
                            >
                                {initials}
                            </div>
                        ))}
                    </div>

                    {/* Filter Button */}
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-sm font-medium transition-all">
                        <Filter className="size-4" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <Board
                columns={columns}
                onTaskMove={handleTaskMove}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
            />

            {/* Task Modal */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    isOpen={true}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateTask}
                    onAddSubtask={handleAddSubtask}
                    onToggleSubtask={handleToggleSubtask}
                    onAddComment={handleAddComment}
                />
            )}
        </div>
    );
}

