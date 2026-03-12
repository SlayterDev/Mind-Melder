import { Link, useLocation } from 'react-router-dom';
import { ReactNode, useState, useEffect } from 'react';
import { useInboxCount } from '../api/queries';
import { PenLine, CalendarDays, Inbox, FileText, ListChecks, Layers, MessageSquare, Cog, Menu, X, Mic, TrendingUp, Brain } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

interface LayoutProps {
  children: ReactNode;
}

const primaryNavItems = [
  { path: '/', label: 'Capture', icon: PenLine },
  { path: '/today', label: 'Today Sheet', icon: CalendarDays },
  { path: '/weekly-review', label: 'Weekly Review', icon: TrendingUp },
  { path: '/inbox', label: 'Inbox', icon: Inbox },
  { path: '/notes', label: 'Notes', icon: FileText },
  { path: '/todos', label: 'Todos', icon: ListChecks },
];

const toolNavItems = [
  { path: '/templates', label: 'Templates', icon: Layers },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
];

export default function Layout({ children }: LayoutProps) {
  const { data: inboxCount = 0 } = useInboxCount();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!window.electronAPI?.onCaptureCreated) return;
    const unsubscribe = window.electronAPI.onCaptureCreated(() => {
      queryClient.invalidateQueries({ queryKey: ['inboxCount'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  const NavLink = ({ item, onClick }: { item: { path: string; label: string; icon: React.ElementType }; onClick?: () => void }) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={`
          flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
          ${active
            ? 'bg-white/[0.08] text-white'
            : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.05]'
          }
        `}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-accent' : ''}`} style={active ? { color: '#9b8dd4' } : undefined} />
        <span>{item.label}</span>
        {item.path === '/inbox' && inboxCount > 0 && (
          <span className="ml-auto badge-accent">
            {inboxCount}
          </span>
        )}
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <p className="px-5 mb-1 mt-5 text-[10px] uppercase tracking-widest text-gray-600 font-semibold select-none">
      {label}
    </p>
  );

  return (
    <div className="flex h-full text-gray-100 overflow-hidden" style={{ backgroundColor: '#070b0f' }}>
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0" style={{ backgroundColor: '#0c1117', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
        {/* Electron drag region */}
        {isElectron && (
          <div
            className="h-8 w-full flex-shrink-0"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          />
        )}

        {/* Branding */}
        <div className={`flex items-center gap-2.5 px-4 ${isElectron ? 'py-3' : 'py-5'}`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(114,97,175,0.22)', border: '1px solid rgba(114,97,175,0.28)' }}>
            <Brain className="w-4 h-4" style={{ color: '#9b8dd4' }} />
          </div>
          <span className="text-[15px] font-semibold text-gray-100 tracking-tight">Mind Melder</span>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 pb-2 overflow-y-auto">
          <SectionLabel label="Workspace" />
          <div className="space-y-0.5">
            {primaryNavItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </div>

          <SectionLabel label="Tools" />
          <div className="space-y-0.5">
            {toolNavItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </div>
        </nav>

        {/* Bottom: Settings + Record */}
        <div className="pb-4 pt-2 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <NavLink item={{ path: '/settings', label: 'Settings', icon: Cog }} />
          {isElectron && (
            <button
              onClick={() => window.electronAPI?.openRecordingWindow()}
              className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] w-[calc(100%-16px)]"
            >
              <Mic className="w-4 h-4 flex-shrink-0" />
              <span>Record</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: '#0c1117', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={isElectron ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: 'rgba(114,97,175,0.22)' }}>
              <Brain className="w-3.5 h-3.5" style={{ color: '#9b8dd4' }} />
            </div>
            <span className="text-sm font-semibold text-gray-100">Mind Melder</span>
          </div>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white/[0.06]"
            style={isElectron ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ backgroundColor: '#0c1117', borderLeft: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-sm font-semibold text-gray-300">Navigation</span>
          <button
            onClick={closeDrawer}
            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="py-3">
          <p className="px-5 mb-1 mt-2 text-[10px] uppercase tracking-widest text-gray-600 font-semibold">Workspace</p>
          <div className="space-y-0.5">
            {primaryNavItems.map((item) => (
              <NavLink key={item.path} item={item} onClick={closeDrawer} />
            ))}
          </div>
          <p className="px-5 mb-1 mt-5 text-[10px] uppercase tracking-widest text-gray-600 font-semibold">Tools</p>
          <div className="space-y-0.5">
            {toolNavItems.map((item) => (
              <NavLink key={item.path} item={item} onClick={closeDrawer} />
            ))}
          </div>
          <div className="mt-4 pt-3 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <NavLink item={{ path: '/settings', label: 'Settings', icon: Cog }} onClick={closeDrawer} />
            {isElectron && (
              <button
                onClick={() => {
                  closeDrawer();
                  window.electronAPI?.openRecordingWindow();
                }}
                className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-gray-500 hover:text-gray-200 hover:bg-white/[0.05] w-[calc(100%-16px)]"
              >
                <Mic className="w-4 h-4 flex-shrink-0" />
                <span>Record</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Draggable title bar overlay for Electron */}
      {isElectron && (
        <div
          className="hidden md:block fixed top-0 left-0 right-0 h-8 z-[60]"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0" style={{ backgroundColor: '#070b0f' }}>
        {isElectron && (
          <div
            className="hidden md:block h-8 w-full flex-shrink-0 z-10"
            style={{ WebkitAppRegion: 'drag', backgroundColor: '#070b0f' } as React.CSSProperties}
          />
        )}
        {location.pathname.startsWith('/chat') ? (
          <div className="flex-1 min-h-0">{children}</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="max-w-5xl mx-auto p-4 md:p-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}
