import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Kanban, Calendar, User } from 'lucide-react';

const navItems = [
    { icon: LayoutDashboard, label: 'Home', href: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', href: '/projects' },
    { icon: Kanban, label: 'Board', href: '/board' },
    { icon: Calendar, label: 'Calendar', href: '/calendar' },
    { icon: User, label: 'Profile', href: '/profile' },
];

export function BottomNav() {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
            {/* Glass background */}
            <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl border-t border-white/10" />

            {/* Navigation items */}
            <div className="relative flex items-center justify-around px-2 py-2 safe-area-bottom">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${isActive
                                    ? 'text-primary'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <div
                                className={`relative p-2 rounded-xl transition-all ${isActive ? 'bg-primary/20' : ''
                                    }`}
                            >
                                <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
                                {isActive && (
                                    <span className="absolute -top-0.5 -right-0.5 size-2 bg-primary rounded-full animate-pulse" />
                                )}
                            </div>
                            <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
