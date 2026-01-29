import { Link, useLocation } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';
import { capturesAPI } from '../api/client';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [inboxCount, setInboxCount] = useState(0); // Placeholder for inbox count logic

  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const loadCaptures = async () => {
    try {
      const data = await capturesAPI.listUnorganized();
      setInboxCount(data.length);
    } catch (error) {
      console.error('Failed to load captures:', error);
      setInboxCount(0);
    }
  };

  useEffect(() => {
    loadCaptures();
  }, []);

  const navItems = [
    { path: '/', label: 'Capture', icon: '✏️' },
    { path: '/today', label: 'Today Sheet', icon: '📋' },
    { path: '/inbox', label: 'Inbox', icon: '📥' },
    { path: '/notes', label: 'Notes', icon: '📝' },
    { path: '/todos', label: 'Todos', icon: '✓' },
    { path: '/templates', label: 'Templates', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 shadow-2xl">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-100">Mind Melder</h1>
          <p className="text-sm text-gray-400 mt-1">Quick Capture & AI Organizer</p>
        </div>

        <nav className="mt-6">
          {navItems.map((item) => (
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
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {item.path === '/inbox' && inboxCount > 0 && (
                <span className="badge-accent">
                  {inboxCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
