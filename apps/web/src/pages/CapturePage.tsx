import QuickCaptureInput from '../components/QuickCaptureInput';
import { Lightbulb } from 'lucide-react';

export default function CapturePage() {
  return (
    <div className="pt-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Quick Capture</h2>
        <p className="text-gray-400">
          Jot down thoughts, ideas, and tasks. They'll be organized automatically.
        </p>
      </div>

      <QuickCaptureInput variant="textarea" autoFocus />

      <div className="mt-8 bg-gray-900/50 border border-gray-800/50 rounded-lg p-4 shadow-lg shadow-black/10">
        <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Pro Tips
        </h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>
            • Press <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs">Cmd/Ctrl+Enter</kbd> to
            submit
          </li>
          <li>• No need to organize - AI will do it for you</li>
          <li>
            • Check <strong>Inbox</strong> to see unorganized captures
          </li>
          <li>
            • Click <strong>"Organize Now"</strong> in Inbox to process them
          </li>
        </ul>
      </div>
    </div>
  );
}
