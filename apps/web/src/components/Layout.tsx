import { Link, useLocation } from 'react-router-dom';
import { ReactNode, useState, useEffect } from 'react';
import { useInboxCount } from '../api/queries';
import { PenLine, CalendarDays, Inbox, FileText, ListChecks, Layers, MessageSquare, Cog, Menu, X, Mic, TrendingUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: inboxCount = 0 } = useInboxCount();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  // Listen for capture created events from Quick Capture window
  useEffect(() => {
    if (!window.electronAPI?.onCaptureCreated) return;

    const unsubscribe = window.electronAPI.onCaptureCreated(() => {
      // Invalidate inbox count when a capture is created
      queryClient.invalidateQueries({ queryKey: ['inboxCount'] });
    });

    return unsubscribe;
  }, [queryClient]);

  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/', label: 'Capture', icon: PenLine },
    { path: '/today', label: 'Today Sheet', icon: CalendarDays },
    { path: '/weekly-review', label: 'Weekly Review', icon: TrendingUp },
    { path: '/inbox', label: 'Inbox', icon: Inbox },
    { path: '/notes', label: 'Notes', icon: FileText },
    { path: '/todos', label: 'Todos', icon: ListChecks },
    { path: '/templates', label: 'Templates', icon: Layers },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/settings', label: 'Settings', icon: Cog },
  ];

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:block w-64 bg-gray-900 border-r border-gray-800 shadow-2xl flex-shrink-0">
        {/* Draggable title bar region for Electron */}
        {isElectron && (
          <div
            className="h-8 w-full"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          />
        )}
        <div className={`p-6 ${isElectron ? 'pt-2' : ''}`}>
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
          {isElectron && (
            <button
              onClick={() => window.electronAPI?.openRecordingWindow()}
              className="flex items-center gap-3 px-6 py-3 transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 w-full"
            >
              <Mic className="w-5 h-5" />
              <span className="font-medium">Record</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-800 z-50">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={isElectron ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
        >
          <h1 className="text-lg font-bold text-gray-100">Mind Melder</h1>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800"
            style={isElectron ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 bg-gray-900 border-l border-gray-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <span className="font-semibold text-gray-200">Menu</span>
          <button
            onClick={closeDrawer}
            className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeDrawer}
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
          {isElectron && (
            <button
              onClick={() => {
                closeDrawer();
                window.electronAPI?.openRecordingWindow();
              }}
              className="flex items-center gap-3 px-6 py-3 transition-all text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 w-full"
            >
              <Mic className="w-5 h-5" />
              <span className="font-medium">Record</span>
            </button>
          )}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0">
        {/* Draggable title bar region for Electron - main content area */}
        {isElectron && (
          <div
            className="hidden md:block h-8 w-full flex-shrink-0 bg-gray-950 z-10"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          />
        )}
        {location.pathname.startsWith('/chat') ? (
          <div className="flex-1 min-h-0">{children}</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="max-w-5xl mx-auto p-4 md:p-8">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}
