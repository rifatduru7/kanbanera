import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Search, LayoutGrid, List, Filter, Plus } from 'lucide-react';
import { useProjects } from '../../hooks/useKanbanData';
import { ProjectCard } from '../../components/project/ProjectCard';
import { CreateProjectModal } from '../../components/project/CreateProjectModal';
import { PageLoader } from '../../components/ui/Loading';
import { ErrorDisplay } from '../../components/ui/Error';
import { FirstProjectPrompt } from '../../components/onboarding/FirstProjectPrompt';

export function ProjectsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const navigate = useNavigate();
    const { data, isLoading, isError, refetch } = useProjects();

    const projects = data?.projects ?? [];

    // Filter projects by search
    const filteredProjects = projects.filter((project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return <PageLoader />;
    }

    if (isError) {
        return <ErrorDisplay onRetry={refetch} message="Failed to load projects" />;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Background Gradient */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />

            {/* Header */}
            <header className="flex-shrink-0 z-10 px-6 py-6 md:px-8 border-b border-white/5 bg-background/95 backdrop-blur-xl">
                <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
                    {/* Title Row */}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <FolderOpen className="size-8 text-primary" />
                                <h2 className="text-3xl font-bold text-white tracking-tight">My Projects</h2>
                            </div>
                            <p className="text-text-muted text-sm md:text-base">
                                Manage and track your ongoing projects across all teams.
                            </p>
                        </div>
                    </div>

                    {/* Controls Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                        {/* Search */}
                        <div className="relative w-full md:max-w-md group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="size-5 text-text-muted group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="glass-input w-full py-2.5 pl-10 pr-3 rounded-xl"
                                placeholder="Search projects by name, tag, or owner..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {/* View Toggle */}
                            <div className="bg-surface p-1 rounded-xl flex items-center border border-white/5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                                        ? 'bg-background shadow-sm text-primary'
                                        : 'text-text-muted hover:text-white'
                                        }`}
                                >
                                    <LayoutGrid className="size-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                                        ? 'bg-background shadow-sm text-primary'
                                        : 'text-text-muted hover:text-white'
                                        }`}
                                >
                                    <List className="size-5" />
                                </button>
                            </div>

                            {/* Filter Button */}
                            <button className="p-2.5 h-full rounded-xl bg-surface border border-white/5 text-text-muted hover:text-white hover:bg-surface-hover transition-colors flex items-center justify-center">
                                <Filter className="size-5" />
                            </button>

                            {/* New Project CTA */}
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(19,185,165,0.3)]"
                            >
                                <Plus className="size-5" />
                                <span className="whitespace-nowrap">New Project</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 z-0">
                <div className="max-w-7xl mx-auto">
                    {filteredProjects.length === 0 ? (
                        /* Empty State */
                        searchQuery ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <Search className="size-10 text-text-muted" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No projects found</h3>
                                <p className="text-text-muted mb-6 max-w-md">
                                    Try adjusting your search or filters
                                </p>
                            </div>
                        ) : (
                            <FirstProjectPrompt
                                onCreateProject={() => setIsCreateModalOpen(true)}
                            />
                        )
                    ) : (
                        /* Projects Grid */
                        <div
                            className={`grid gap-6 ${viewMode === 'grid'
                                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                : 'grid-cols-1'
                                }`}
                        >
                            {filteredProjects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    id={project.id}
                                    name={project.name}
                                    description={project.description}
                                    color="#14b8a6" // Default color, can be extended
                                    taskCount={0} // Will be populated from API
                                    memberCount={1}
                                    completedPercent={0}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
