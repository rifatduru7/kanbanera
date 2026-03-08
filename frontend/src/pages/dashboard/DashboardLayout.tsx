import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { SearchModal } from '../../components/ui/SearchModal';
import { FeaturesTourModal } from '../../components/onboarding/FeaturesTourModal';
import { OnboardingComplete } from '../../components/onboarding/OnboardingComplete';
import { CreateProjectModal } from '../../components/project/CreateProjectModal';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../../hooks/useAuth';
import { useFeaturesTour } from '../../hooks/useFeaturesTour';
import { useSearchModal } from '../../hooks/useSearchModal';
import { useTranslation } from 'react-i18next';

export function DashboardLayout() {
    const { t } = useTranslation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(new Date());
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [isOnboardingSuccessOpen, setIsOnboardingSuccessOpen] = useState(false);

    const searchModal = useSearchModal();
    const featuresTour = useFeaturesTour();
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch user on mount if they have an active session
    const { isLoading: isUserLoading } = useCurrentUser();

    // Close mobile sidebar on navigation
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    // Check if we should show features tour on mount
    useEffect(() => {
        featuresTour.checkAndShow();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleRefresh = async () => {
        setLastSynced(new Date());
    };

    const handleTourComplete = () => {
        featuresTour.complete();
        setIsCreateProjectOpen(true);
    };

    const handleProjectCreated = () => {
        setIsOnboardingSuccessOpen(true);
    };

    return (
        <div className="flex h-screen w-full relative">
            {/* Sidebar - Desktop */}
            <div className="hidden lg:block h-full">
                <Sidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <div className={`
                fixed inset-y-0 left-0 z-[70] lg:hidden transition-transform duration-300 ease-in-out transform
                ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar
                    isCollapsed={false}
                    onToggle={() => setIsMobileSidebarOpen(false)}
                />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                {/* Subtle overlay for depth */}
                <div className="absolute inset-0 bg-background/95 pointer-events-none z-0" />

                {/* Header */}
                <Header
                    projectName={t('nav.projects')}
                    sprintName="Sprint 4"
                    isActive={true}
                    onRefresh={handleRefresh}
                    lastSynced={lastSynced}
                    onSearchClick={searchModal.open}
                    onMenuClick={() => setIsMobileSidebarOpen(true)}
                />

                {/* Content - Extra bottom padding for mobile nav */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-32 lg:pb-8 z-0 relative">
                    <div className="max-w-7xl mx-auto flex flex-col gap-8">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />

            {/* Global Search Modal (Cmd+K) */}
            {searchModal.isOpen && <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.close} />}

            {/* Features Tour Modal for new users */}
            {featuresTour.isOpen && (
                <FeaturesTourModal
                    onComplete={handleTourComplete}
                    onSkip={featuresTour.skip}
                />
            )}

            {/* Onboarding Complete Modal */}
            {isOnboardingSuccessOpen && (
                <OnboardingComplete
                    onGoToDashboard={() => {
                        setIsOnboardingSuccessOpen(false);
                        navigate('/dashboard');
                    }}
                    onClose={() => setIsOnboardingSuccessOpen(false)}
                />
            )}

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={isCreateProjectOpen}
                onClose={() => setIsCreateProjectOpen(false)}
                onProjectCreated={handleProjectCreated}
            />
        </div>
    );
}
