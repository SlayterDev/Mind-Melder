import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuickCaptureInput from '../components/QuickCaptureInput';

const queryClient = new QueryClient();

export default function QuickCapturePage() {
  const handleSuccess = () => {
    // Close the quick capture window after successful submission
    window.electronAPI?.closeQuickCapture();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI?.closeQuickCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div
        className="min-h-screen flex items-center"
        style={{ background: 'linear-gradient(to bottom right, rgb(17 24 39), rgb(17 24 39 / 0.95))' }}
      >
        {/* Draggable region for moving the window */}
        <div
          className="absolute top-0 left-0 right-0 h-6"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        <div className="flex-1 flex flex-col items-left w-full">
          <div className="w-full px-3 py-2">
            <QuickCaptureInput
              variant="input"
              placeholder="Quick capture..."
              autoFocus
              onSuccess={handleSuccess}
            />
          </div>

          <div>
            <p className="text-gray-600 text-xs font-mono px-5">Esc to close</p>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
