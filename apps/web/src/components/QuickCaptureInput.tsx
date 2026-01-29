import { useState, useRef, useEffect } from 'react';
import { capturesAPI } from '../api/client';

interface QuickCaptureInputProps {
  variant?: 'textarea' | 'input';
  placeholder?: string;
  autoFocus?: boolean;
  onSuccess?: () => void;
}

export default function QuickCaptureInput({
  variant = 'textarea',
  placeholder = 'Type anything...',
  autoFocus = false,
  onSuccess,
}: QuickCaptureInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      await capturesAPI.create({ content: content.trim() });
      setContent('');
      setMessage('✓ Captured!');
      setTimeout(() => setMessage(''), 2000);

      // Keep focus on input for quick successive captures
      if (inputRef.current) {
        inputRef.current.focus();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to capture'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (variant === 'textarea' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  if (variant === 'textarea') {
    return (
      <div className="sheet-card p-6">
        <form onSubmit={handleSubmit}>
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${placeholder} (Press Cmd/Ctrl+Enter to submit)`}
            className="w-full bg-gray-800 border rounded-lg p-4 text-gray-100 font-mono
                     placeholder-gray-500 resize-none shadow-inner"
            style={{
              borderColor: 'rgb(114 97 175 / 0.2)',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = '0 0 0 2px rgb(114 97 175 / 0.5)';
              e.target.style.borderColor = 'transparent';
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = '';
              e.target.style.borderColor = 'rgb(114 97 175 / 0.2)';
            }}
            rows={6}
            disabled={isSubmitting}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm">
              {message && (
                <span
                  className={`${message.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}
                >
                  {message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="btn-accent px-6 py-2"
            >
              {isSubmitting ? 'Capturing...' : 'Capture'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Input variant (for inline use)
  return (
    <div className="sheet-card p-5">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`${placeholder} (Press Enter to submit)`}
          className="flex-1 input-accent"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="btn-accent px-5"
        >
          {isSubmitting ? '...' : '✏️'}
        </button>
      </form>
      {message && (
        <div
          className={`text-sm mt-2 ${
            message.startsWith('✓') ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
