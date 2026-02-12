import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { capturesAPI, notesAPI } from '../api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, PenLine } from 'lucide-react';

type Chip = {
  kind: 'trigger';
  label: string;
};

interface QuickCaptureInputProps {
  variant?: 'textarea' | 'input';
  placeholder?: string;
  autoFocus?: boolean;
  rows?: number;
  trigger?: string;
  onSuccess?: () => void;
}

export default function QuickCaptureInput({
  variant = 'textarea',
  placeholder = 'Type anything...',
  autoFocus = false,
  rows,
  trigger = 'n:',
  onSuccess,
}: QuickCaptureInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [chip, setChip] = useState<Chip | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const triggerPattern = useMemo(() => {
    const escapedTrigger = trigger.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`^${escapedTrigger}\\s`, 'i');
  }, [trigger]);

  const argumentPattern = useMemo(() => {
    return new RegExp(`^[a-zA-Z0-9-]+:\\s`, 'i');
  }, [trigger]);

  const removeChip = () => {
    setChip(null);
    queueMicrotask(() => inputRef.current?.focus());
  }

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (content === '' && !isSubmitting && inputRef.current) {
      inputRef.current.focus();
    }
  }, [content, isSubmitting]);

  const submitCapture = async (data: { content: string; category?: string }) => {
    if (!chip) {
      await capturesAPI.create(data);
      return;
    }

    const args = chip.label.split(':').slice(1).filter((s) => s !== '');
    let title = args.length ? args[0].trim().replace(/-+/g, ' ') : null;

    if (!title) {
      // Derive title from content: use first line or first 50 chars
      const firstLine = data.content.split('\n')[0];
      title = firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine;
    }

    await notesAPI.append({ title, contentToAppend: data.content });
  }

  const queryClient = useQueryClient();
  const createCapture = useMutation({
    mutationFn: (data: { content: string; category?: string }) => submitCapture(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['inboxCount'] });
      const previous = queryClient.getQueryData<number>(['inboxCount']);
      queryClient.setQueryData<number>(['inboxCount'], (old = 0) => old + 1);
      return { previous };
    },
    onError: (_err, _newItem, context: any) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['inboxCount'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxCount'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCapture.mutateAsync({ content: content.trim() });
      setChip(null);
      setContent('');
      setMessage('success:Captured!');
      setTimeout(() => setMessage(''), 2000);

      // Notify Electron main window if running in Electron
      if (window.electronAPI?.notifyCaptureCreated) {
        await window.electronAPI.notifyCaptureCreated();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setMessage(`error:${error instanceof Error ? error.message : 'Failed to capture'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (variant === 'textarea' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
      return;
    }

    if (!chip) {
      return;
    }

    if (e.key === 'Backspace') {
      const el = e.currentTarget;
      const caret = el.selectionStart || 0;
      const hasSelection = (el.selectionStart ?? 0) !== (el.selectionEnd ?? 0);

      if (caret === 0 && !hasSelection) {
        e.preventDefault();

        const remainingText = chip.label.split(':').slice(0, -2).join(':');
        if (remainingText) {
          setChip({ kind: 'trigger', label: remainingText + ':' });
        } else {
          setChip(null);
        }

        queueMicrotask(() => {
          const input = inputRef.current;
          if (!input) return;
          input.focus();
          input.setSelectionRange(0, 0);
        });
      }
    }
  }, [chip, content, variant, handleSubmit, inputRef]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const raw = e.target.value;

    if (!chip && triggerPattern.test(raw)) {
      // New trigger detected
      const match = raw.match(triggerPattern);
      const consumed = match?.[0]?.length || 0;

      const nextChip: Chip = { kind: 'trigger', label: trigger.trim() };
      const nextText = raw.slice(consumed);

      setChip(nextChip);
      setContent(nextText);
      return;
    } else if (chip && argumentPattern.test(raw)) {
      // Argument detected
      const match = raw.match(argumentPattern);
      const consumed = match?.[0]?.length || 0;

      const updatedChip: Chip = { kind: 'trigger', label: chip.label + match?.[0].trim() };
      const nextText = raw.slice(consumed);

      setChip(updatedChip);
      setContent(nextText);
      return;
    }

    setContent(raw);
  }, [chip, trigger, triggerPattern, argumentPattern]);

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
            rows={rows || 6}
            disabled={isSubmitting}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm">
              {message && (
                <span
                  className={`flex items-center gap-1.5 ${
                    message.startsWith('success:') ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {message.startsWith('success:') && <Check className="w-4 h-4" />}
                  {message.split(':')[1]}
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
        <div
          className="flex-1 flex items-center input-accent"
          onMouseDown={(e) => {
            // Clicking empty space focuses input (but don't steal clicks from chip button).
            if (e.target === e.currentTarget) {
              e.preventDefault();
              inputRef.current?.focus();
            }
          }}
        >
          {chip && (
            <span
              className="inline-flex items-center gap-2 px-3 py-1 mr-2 rounded-full bg-accent text-gray-100 text-sm font-mono"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={removeChip}
                className="hover:text-white"
                aria-label="Remove trigger"
              >
                &times;
              </button>
            </span>
          )}

          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`${placeholder} (Press Enter to submit)`}
            className="min-w-0 flex-1 font-mono bg-transparent outline-none"
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="btn-accent px-5"
        >
          {isSubmitting ? '...' : <PenLine className="w-5 h-5" />}
        </button>
      </form>
      {message && (
        <div
          className={`flex items-center gap-1.5 text-sm mt-2 ${
            message.startsWith('success:') ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {message.startsWith('success:') && <Check className="w-4 h-4" />}
          {message.split(':')[1]}
        </div>
      )}
    </div>
  );
}
