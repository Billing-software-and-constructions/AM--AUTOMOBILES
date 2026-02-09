
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, History, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function Layout() {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Billing', path: '/billing', icon: Receipt },
        { label: 'Bill History', path: '/history', icon: History },
    ];

    return (
        <div className="flex h-screen bg-gray-100 print:block print:h-auto print:bg-white">
            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col print:hidden",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b border-slate-800">
                    <h1 className="text-2xl font-bold text-blue-500">AM Auto</h1>
                    <p className="text-xs text-slate-400">Billing System</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={() => {
                            localStorage.removeItem('demo_session');
                            // Also try Supabase signout just in case
                            import('../lib/supabase').then(({ supabase }) => {
                                supabase.auth.signOut().then(() => {
                                    window.location.href = '/#/login';
                                });
                            });
                            // Immediate redirect for demo users
                            if (localStorage.getItem('demo_session') === null) {
                                window.location.href = '/#/login';
                            }
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden print:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto print:w-full print:overflow-visible">
                {/* Mobile Header */}
                <header className="md:hidden bg-white p-4 flex items-center shadow-sm sticky top-0 z-30 print:hidden">
                    <button onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <span className="ml-4 font-bold text-lg">AM Automobiles</span>
                </header>

                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
