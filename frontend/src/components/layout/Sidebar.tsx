import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderKanban,
    Kanban,
    Settings,
    Users,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

interface NavItem {
    label: string;
    icon: React.ElementType;
    href: string;
    badge?: number;
}

const menuItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Projects', icon: FolderKanban, href: '/projects' },
    { label: 'Kanban Board', icon: Kanban, href: '/board' },
    { label: 'Settings', icon: Settings, href: '/settings' },
];

const teamItems: NavItem[] = [
    { label: 'Members', icon: Users, href: '/members' },
];

interface SidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(isCollapsed);

    const handleToggle = () => {
        setCollapsed(!collapsed);
        onToggle?.();
    };

    return (
        <aside
            className={`
        flex-shrink-0 flex flex-col justify-between glass-panel relative z-20
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-72'}
      `}
        >
            {/* Logo & Brand */}
            <div className="p-6 flex items-center gap-3">
                <div className="relative flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20">
                    <Kanban className="text-white size-6" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col">
                        <h1 className="text-white text-lg font-bold leading-none tracking-tight">
                            Era Kanban
                        </h1>
                        <p className="text-slate-400 text-xs font-medium mt-1">Workspace</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2 px-4 py-2 overflow-y-auto">
                {!collapsed && (
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider px-3 mb-1">
                        Menu
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
                                    ? 'bg-primary/10 text-primary border border-primary/10 shadow-[0_0_15px_rgba(19,146,236,0.1)]'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                ${collapsed ? 'justify-center' : ''}
              `}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon
                                className={`size-5 ${isActive ? '' : 'group-hover:text-primary'}`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            {!collapsed && (
                                <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {!collapsed && (
                    <>
                        <div className="my-2 border-t border-white/5 mx-3" />
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider px-3 mb-1 mt-2">
                            Team
                        </p>
                    </>
                )}

                {teamItems.map((item) => {
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
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                ${collapsed ? 'justify-center' : ''}
              `}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className="size-5 group-hover:text-primary" />
                            {!collapsed && (
                                <span className="text-sm font-medium">{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 mt-auto">
                <div className="glass-panel !bg-white/5 !border-white/5 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="size-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-semibold text-sm">
                        AM
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">Alex Morgan</p>
                                <p className="text-xs text-slate-400 truncate">Pro Plan</p>
                            </div>
                            <ChevronDown className="text-slate-400 size-4" />
                        </>
                    )}
                </div>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={handleToggle}
                className="absolute -right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-30"
            >
                {collapsed ? (
                    <ChevronRight className="size-3" />
                ) : (
                    <ChevronLeft className="size-3" />
                )}
            </button>
        </aside>
    );
}
