import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    SquaresFour as LayoutDashboard,
    Folder as FolderKanban,
    Kanban,
    GearSix as Settings,
    Users,
    CaretDown as ChevronDown,
    CaretLeft as ChevronLeft,
    CaretRight as ChevronRight,
    CalendarBlank as Calendar,
    ChartBar as BarChart3,
    ShieldCheck as Shield,
    User,
    SignOut,
} from '@phosphor-icons/react';
import { useAuthStore } from '../../stores/authStore';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { BrandLogoMark } from '../ui/BrandLogoMark';

interface NavItem {
    labelKey: string;
    icon: React.ElementType;
    href: string;
}

const menuItems: NavItem[] = [
    { labelKey: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { labelKey: 'nav.projects', icon: FolderKanban, href: '/projects' },
    { labelKey: 'nav.board', icon: Kanban, href: '/board' },
    { labelKey: 'nav.calendar', icon: Calendar, href: '/calendar' },
    { labelKey: 'nav.metrics', icon: BarChart3, href: '/metrics' },
    { labelKey: 'nav.settings', icon: Settings, href: '/settings' },
];

const teamItems: NavItem[] = [
    { labelKey: 'nav.members', icon: Users, href: '/members' },
    { labelKey: 'nav.admin', icon: Shield, href: '/admin' },
];

interface SidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [collapsed, setCollapsed] = useState(isCollapsed);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredTeamItems = teamItems.filter(item =>
        item.href !== '/admin' || user?.role === 'admin'
    );

    const handleToggle = () => {
        setCollapsed(!collapsed);
        onToggle?.();
    };

    return (
        <aside
            className={`
        flex-shrink-0 flex flex-col justify-between glass-panel relative z-20 h-full pt-safe lg:pt-0
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-72'}
      `}
        >
            {/* Logo & Brand */}
            <div className="p-6 flex items-center gap-3">
                <div className="relative flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20">
                    <BrandLogoMark className="text-text size-6" animated={true} />
                </div>
                {!collapsed && (
                    <div className="flex flex-col">
                        <h1 className="text-text text-lg font-bold leading-none tracking-tight">
                            Era Kanban
                        </h1>
                        <p className="text-text-muted text-xs font-medium mt-1">{t('common.workspace')}</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2 px-4 py-2 overflow-y-auto mobile-scroll">
                {!collapsed && (
                    <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider px-3 mb-1">
                        {t('common.menu')}
                    </p>
                )}

                {menuItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/10 shadow-[0_0_15px_rgba(19,146,236,0.05)]'
                                    : 'text-text-muted hover:text-text hover:bg-surface-alt'
                                }
                ${collapsed ? 'justify-center' : ''}
              `}
                            title={collapsed ? t(item.labelKey) : undefined}
                        >
                            <AnimatedIcon
                                icon={Icon}
                                animation={isActive ? 'active' : 'hover'}
                                className={`size-5 ${isActive ? '' : 'group-hover:text-primary'}`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            {!collapsed && (
                                <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                                    {t(item.labelKey)}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {!collapsed && (
                    <>
                        <div className="my-2 border-t border-border-muted mx-3" />
                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider px-3 mb-1 mt-2">
                            {t('common.team')}
                        </p>
                    </>
                )}

                {filteredTeamItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                ${isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-muted hover:text-text hover:bg-surface-alt'
                                }
                ${collapsed ? 'justify-center' : ''}
              `}
                            title={collapsed ? t(item.labelKey) : undefined}
                        >
                            <AnimatedIcon icon={Icon} animation={isActive ? 'active' : 'hover'} className="size-5 group-hover:text-primary" />
                            {!collapsed && (
                                <span className="text-sm font-medium">{t(item.labelKey)}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 mt-auto relative" ref={profileMenuRef}>
                {isProfileMenuOpen && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 glass-panel !bg-surface !border-border-muted rounded-xl p-1.5 shadow-xl shadow-black/20 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {!collapsed && (
                            <>
                                <Link
                                    to="/profile"
                                    onClick={() => setIsProfileMenuOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-colors w-full text-left"
                                >
                                    <User className="size-4" />
                                    {t('profile.title', 'Profile')}
                                </Link>
                                <Link
                                    to="/settings"
                                    onClick={() => setIsProfileMenuOpen(false)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-colors w-full text-left"
                                >
                                    <Settings className="size-4" />
                                    {t('nav.settings', 'Settings')}
                                </Link>
                                <div className="h-px bg-border-muted my-1 mx-1" />
                            </>
                        )}
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors w-full text-left ${collapsed ? 'justify-center' : ''}`}
                            title={collapsed ? t('nav.logout', 'Logout') : undefined}
                        >
                            <AnimatedIcon icon={SignOut} animation="hover" className="size-4" />
                            {!collapsed && t('nav.logout', 'Logout')}
                        </button>
                    </div>
                )}

                <div
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="glass-panel !bg-surface-alt !border-border-muted rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-surface-alt/80 transition-colors"
                >
                    <div className="size-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-semibold text-sm">
                        {user?.fullName ? `${user.fullName.split(' ')[0][0]}${user.fullName.split(' ')[1]?.[0] || ''}`.toUpperCase() : 'U'}
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text truncate">{user?.fullName || t('common.user')}</p>
                                <p className="text-xs text-text-muted truncate capitalize">{t(`common.roles.${user?.role || 'member'}`)}</p>
                            </div>
                            <AnimatedIcon icon={ChevronDown} animation="hover" className={`text-text-muted size-4 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                        </>
                    )}
                </div>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={handleToggle}
                className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-surface border border-border items-center justify-center text-text-muted hover:text-text hover:bg-surface-alt transition-colors z-30 shadow-sm"
            >
                {collapsed ? (
                    <AnimatedIcon icon={ChevronRight} animation="hover" className="size-3" />
                ) : (
                    <AnimatedIcon icon={ChevronLeft} animation="hover" className="size-3" />
                )}
            </button>
        </aside>
    );
}
