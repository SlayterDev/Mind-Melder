import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { capturesAPI, notesAPI, todosAPI } from '../api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, PenLine, Loader2 } from 'lucide-react';

const NOTE_TRIGGER = 'n:';
const TODO_TRIGGER = 't:';

type Chip = {
  kind: 'trigger';
  label: string;
};

function parseInlineTags(text: string): { text: string; tags: string[] } {
  const tags: string[] = [];
  const cleanedText = text
    .replace(/(^|\s)#([a-zA-Z0-9_-]+)/g, (_match, _prefix, tag) => {
      tags.push(tag);
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { text: cleanedText, tags: [...new Set(tags)] };
}

function renderHighlightedContent(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(#[a-zA-Z0-9_-]+)/g);
  return parts.map((part, i) =>
    /^#[a-zA-Z0-9_-]+$/.test(part)
      ? <span key={i} className="font-semibold">{part}</span>
      : <span key={i}>{part}</span>
  );
}

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
  trigger = NOTE_TRIGGER,
  onSuccess,
}: QuickCaptureInputProps) {
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [chip, setChip] = useState<Chip | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const triggerPattern = useMemo(() => {
    const escapedTrigger = trigger.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedTodoTrigger = TODO_TRIGGER.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`^(?:${escapedTrigger}|${escapedTodoTrigger})\\s`, 'i');
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

  const isTodoChip = (c: Chip | null) =>
    c !== null && c.label.toLowerCase().startsWith(TODO_TRIGGER);

  const submitCapture = async (data: { content: string; category?: string }) => {
    if (!chip) {
      await capturesAPI.create(data);
      return;
    }

    if (isTodoChip(chip)) {
      const { text, tags } = parseInlineTags(data.content);
      await todosAPI.create({ content: text, tags: tags.length > 0 ? tags : undefined });
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
      if (isTodoChip(chip)) return {};
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
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  useEffect(() => {
    if (content === '' && !createCapture.isPending && inputRef.current) {
      inputRef.current.focus();
    }
  }, [content, createCapture.isPending]);

  useEffect(() => {
    if (!createCapture.isPending) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 750);
    return () => clearTimeout(timer);
  }, [createCapture.isPending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const wasTodo = isTodoChip(chip);
      await createCapture.mutateAsync({ content: content.trim() });
      setChip(null);
      setContent('');
      setMessage(wasTodo ? 'success:Todo created!' : 'success:Captured!');
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
      const matchedTrigger = match?.[0]?.trim() || trigger.trim();

      const nextChip: Chip = { kind: 'trigger', label: matchedTrigger };
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
            disabled={createCapture.isPending}
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
              disabled={createCapture.isPending || !content.trim()}
              className="btn-accent px-6 py-2 flex items-center gap-2"
            >
              {showSpinner && <Loader2 className="w-4 h-4 animate-spin" />}
              {showSpinner ? 'Capturing...' : 'Capture'}
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

          <div className="min-w-0 flex-1 relative">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={`${placeholder} (Press Enter to submit)`}
              className="w-full font-mono bg-transparent outline-none text-transparent caret-gray-100 placeholder:text-gray-500"
              disabled={createCapture.isPending}
            />
            {content && (
              <div
                className="absolute inset-0 flex items-center font-mono pointer-events-none overflow-hidden whitespace-nowrap text-gray-100"
                aria-hidden="true"
              >
                {renderHighlightedContent(content)}
              </div>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={createCapture.isPending || !content.trim()}
          className="btn-accent px-5"
        >
          {showSpinner ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />}
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
