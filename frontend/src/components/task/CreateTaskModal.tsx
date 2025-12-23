import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useProjects, useProject, useCreateTask } from '../../hooks/useKanbanData';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultProjectId?: string;
    defaultColumnId?: string;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'bg-green-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

export function CreateTaskModal({ isOpen, onClose, defaultProjectId, defaultColumnId }: CreateTaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '');
    const [selectedColumnId, setSelectedColumnId] = useState(defaultColumnId || '');
    const [dueDate, setDueDate] = useState('');

    const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
    const projects = projectsData?.projects || [];

    // Fetch project details with columns when a project is selected
    const { data: projectData, isLoading: isLoadingProject } = useProject(selectedProjectId);
    const columns = projectData?.columns || [];

    // Auto-select first project when loaded
    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    // Auto-select first column when project data is loaded
    useEffect(() => {
        if (columns.length > 0) {
            setSelectedColumnId(columns[0].id);
        } else {
            setSelectedColumnId('');
        }
    }, [columns]);

    const createTask = useCreateTask(selectedProjectId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !selectedProjectId || !selectedColumnId) return;

        createTask.mutate(
            {
                column_id: selectedColumnId,
                title: title.trim(),
                description: description.trim() || undefined,
                priority,
                due_date: dueDate || undefined,
            },
            {
                onSuccess: () => {
                    setTitle('');
                    setDescription('');
                    setPriority('medium');
                    setDueDate('');
                    onClose();
                },
            }
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
            {/* Modal Card */}
            <div className="relative w-full max-w-[520px] flex flex-col rounded-xl border border-white/10 bg-surface/95 backdrop-blur-md shadow-[0_0_40px_-10px_rgba(19,185,165,0.15)] ring-1 ring-white/5 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h2 className="text-white text-xl font-bold tracking-tight">Add New Task</h2>
                    <button
                        onClick={onClose}
                        className="group text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Task Title */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                            Task Title <span className="text-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg bg-background/50 border border-border text-white placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-base transition-colors"
                            placeholder="e.g., Design landing page mockups"
                            required
                        />
                    </div>

                    {/* Project & Column Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">
                                Project <span className="text-primary">*</span>
                            </label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => {
                                    setSelectedProjectId(e.target.value);
                                    setSelectedColumnId('');
                                }}
                                className="w-full rounded-lg bg-background/50 border border-border text-white focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-base transition-colors appearance-none cursor-pointer"
                                required
                                disabled={isLoadingProjects}
                            >
                                <option value="">Select project</option>
                                {projects.map((project: any) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">
                                Column <span className="text-primary">*</span>
                            </label>
                            <select
                                value={selectedColumnId}
                                onChange={(e) => setSelectedColumnId(e.target.value)}
                                className="w-full rounded-lg bg-background/50 border border-border text-white focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-base transition-colors appearance-none cursor-pointer"
                                required
                                disabled={!selectedProjectId || isLoadingProject}
                            >
                                <option value="">
                                    {isLoadingProject ? 'Loading columns...' : 'Select column'}
                                </option>
                                {columns.map((col: any) => (
                                    <option key={col.id} value={col.id}>
                                        {col.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-lg bg-background/50 border border-border text-white placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary min-h-[84px] p-4 text-base resize-none transition-colors"
                            placeholder="Add details about this task..."
                            rows={3}
                        />
                    </div>

                    {/* Priority & Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">Priority</label>
                            <div className="flex gap-2">
                                {PRIORITY_OPTIONS.map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={`flex-1 cursor-pointer group`}
                                    >
                                        <input
                                            type="radio"
                                            name="priority"
                                            value={opt.value}
                                            checked={priority === opt.value}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className="peer sr-only"
                                        />
                                        <div className={`px-2 py-2 rounded-lg text-center text-xs font-medium border transition-all
                                            ${priority === opt.value
                                                ? `${opt.color} text-white border-transparent`
                                                : 'bg-background/50 text-text-muted border-border hover:border-white/20'
                                            }`}
                                        >
                                            {opt.label}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full rounded-lg bg-background/50 border border-border text-white focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 text-base transition-colors"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all focus:outline-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createTask.isPending || !title.trim() || !selectedProjectId || !selectedColumnId}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-background hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {createTask.isPending && <Loader2 className="size-4 animate-spin" />}
                            Add Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
