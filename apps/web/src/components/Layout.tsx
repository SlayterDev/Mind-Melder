import { Link, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useInboxCount } from '../api/queries';
import { PenLine, CalendarDays, Inbox, FileText, ListChecks, Settings } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: inboxCount = 0 } = useInboxCount();

  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Capture', icon: PenLine },
    { path: '/today', label: 'Today Sheet', icon: CalendarDays },
    { path: '/inbox', label: 'Inbox', icon: Inbox },
    { path: '/notes', label: 'Notes', icon: FileText },
    { path: '/todos', label: 'Todos', icon: ListChecks },
    { path: '/templates', label: 'Templates', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:block w-64 bg-gray-900 border-r border-gray-800 shadow-2xl flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-100">Mind Melder</h1>
          <p className="text-sm text-gray-400 mt-1">Quick Capture & AI Organizer</p>
        </div>

        <nav className="mt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-6 py-3 transition-all
                  ${
                    isActive(item.path)
                      ? 'bg-gray-800 border-l-4 border-accent text-gray-100'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.path === '/inbox' && inboxCount > 0 && (
                  <span className="badge-accent">
                    {inboxCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20 md:pb-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 shadow-2xl z-50">
        <div className="flex justify-around items-center px-2 py-3">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all relative ${
                  isActive(item.path)
                    ? 'text-accent-highlight'
                    : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
                {item.path === '/inbox' && inboxCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: 'rgb(114 97 175 / 0.4)', border: '1px solid rgb(114 97 175 / 0.3)' }}>
                    {inboxCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
