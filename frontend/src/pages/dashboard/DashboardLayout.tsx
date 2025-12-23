import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { SearchModal, useSearchModal } from '../../components/ui/SearchModal';
import { FeaturesTourModal, useFeaturesTour } from '../../components/onboarding/FeaturesTourModal';
import { CreateProjectModal } from '../../components/project/CreateProjectModal';
import { Outlet } from 'react-router-dom';


export function DashboardLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(new Date());
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

    const searchModal = useSearchModal();
    const featuresTour = useFeaturesTour();


    // Check if we should show features tour on mount
    useEffect(() => {
        featuresTour.checkAndShow();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefresh = async () => {
        setLastSynced(new Date());
    };

    const handleTourComplete = () => {
        featuresTour.complete();
        // Optionally open create project modal after tour
        setIsCreateProjectOpen(true);
    };

    return (
        <div className="flex h-screen w-full relative">
            {/* Sidebar - Hidden on mobile */}
            <div className="hidden lg:block">
                <Sidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
                {/* Subtle overlay for depth */}
                <div className="absolute inset-0 bg-background-dark/95 pointer-events-none z-0" />

                {/* Header */}
                <Header
                    projectName="Projects"
                    sprintName="Sprint 4"
                    isActive={true}
                    onRefresh={handleRefresh}
                    lastSynced={lastSynced}
                    onSearchClick={searchModal.open}
                />

                {/* Content - Extra bottom padding for mobile nav */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-24 lg:pb-8 z-0 relative">
                    <div className="max-w-7xl mx-auto flex flex-col gap-8">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />

            {/* Global Search Modal (Cmd+K) */}
            <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.close} />

            {/* Features Tour Modal for new users */}
            {featuresTour.isOpen && (
                <FeaturesTourModal
                    onComplete={handleTourComplete}
                    onSkip={featuresTour.skip}
                />
            )}

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={isCreateProjectOpen}
                onClose={() => setIsCreateProjectOpen(false)}
            />
        </div>
    );
}

