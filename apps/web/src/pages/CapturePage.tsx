import QuickCaptureInput from '../components/QuickCaptureInput';
import { Lightbulb, PenLine } from 'lucide-react';

export default function CapturePage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <PenLine className="w-5 h-5" style={{ color: '#9b8dd4' }} />
            <h2 className="page-title">Quick Capture</h2>
          </div>
          <p className="page-subtitle">
            Jot down thoughts, ideas, and tasks. They'll be organized automatically.
          </p>
        </div>
      </div>

      <QuickCaptureInput variant="textarea" autoFocus />

      <div className="mt-8 sheet-card-inner p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" style={{ color: '#9b8dd4' }} />
          Pro Tips
        </h3>
        <ul className="text-sm text-gray-500 space-y-1.5">
          <li>• Press <kbd className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>Cmd/Ctrl+Enter</kbd> to submit</li>
          <li>• No need to organize — AI will do it for you</li>
          <li>• Check <span className="text-gray-300 font-medium">Inbox</span> to see unorganized captures</li>
          <li>• Click <span className="text-gray-300 font-medium">"Organize Now"</span> in Inbox to process them</li>
        </ul>
      </div>
    </div>
  );
}
