import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { capturesAPI, notesAPI, todosAPI } from '../api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, PenLine, Loader2 } from 'lucide-react';

const NOTE_TRIGGER = 'n:';
const TODO_TRIGGER = 't:';

/** Matches #tag tokens preceded by whitespace or at start of string. */
const TAG_PATTERN = /(^|\s)(#[a-zA-Z0-9_-]+)/g;

/**
 * Matches any `word:` prefix that could be an argument (e.g. `title:my-note `).
 * Static — does not depend on the active trigger.
 */
const ARGUMENT_PATTERN = /^[a-zA-Z0-9-]+:\s/i;

type Chip = {
  kind: 'trigger';
  label: string;
};

function isTodoChip(c: Chip | null): boolean {
  return c !== null && c.label.toLowerCase().startsWith(TODO_TRIGGER);
}

function parseInlineTags(text: string): { text: string; tags: string[] } {
  const tags: string[] = [];
  const cleanedText = text
    .replace(TAG_PATTERN, (_match, _prefix, tag) => {
      tags.push(tag.slice(1)); // remove leading #
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { text: cleanedText, tags: [...new Set(tags)] };
}

function renderHighlightedContent(text: string): React.ReactNode {
  if (!text) return null;
  const nodes: React.ReactNode[] = [];
  // Create a fresh regex instance — TAG_PATTERN is a /g regex and its lastIndex
  // must not be shared across calls (especially in React concurrent renders).
  const regex = new RegExp(TAG_PATTERN.source, TAG_PATTERN.flags);
  let lastIndex = 0;
  let keyIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [, prefix, tag] = match;
    const tagStart = match.index + prefix.length;
    // Plain text up to (and including) the space before the tag.
    if (tagStart > lastIndex) {
      nodes.push(<span key={keyIdx++}>{text.slice(lastIndex, tagStart)}</span>);
    }
    nodes.push(
      <span
        key={keyIdx++}
        className="font-semibold bg-gray-100/15 rounded-md [box-shadow:0_0_0_4px_rgba(243,244,246,0.15)]"
      >
        {tag}
      </span>
    );
    lastIndex = tagStart + tag.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={keyIdx++}>{text.slice(lastIndex)}</span>);
  }

  return nodes.length > 0 ? nodes : null;
}

interface QuickCaptureInputProps {
  variant?: 'textarea' | 'input';
  placeholder?: string;
  autoFocus?: boolean;
  rows?: number;
  onSuccess?: () => void;
}

export default function QuickCaptureInput({
  variant = 'textarea',
  placeholder = 'Type anything...',
  autoFocus = false,
  rows,
  onSuccess,
}: QuickCaptureInputProps) {
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [chip, setChip] = useState<Chip | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Autocomplete state
  const [noteTitles, setNoteTitles] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);

  const triggerPattern = useMemo(() => {
    const escapedTrigger = NOTE_TRIGGER.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedTodoTrigger = TODO_TRIGGER.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`^(?:${escapedTrigger}|${escapedTodoTrigger})\\s`, 'i');
  }, []);

  const removeChip = useCallback(() => {
    setChip(null);
    setShowSuggestions(false);
    setNoteTitles([]);
    setSelectedSuggestionIndex(-1);
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  const selectSuggestion = useCallback((title: string) => {
    const titleArg = title.replace(/\s+/g, '-');
    setChip({ kind: 'trigger', label: `${NOTE_TRIGGER}${titleArg}:` });
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Fetch note titles when note trigger is active
  useEffect(() => {
    // Check if chip is a note trigger (not a todo trigger)
    const isNoteTrigger = chip !== null && chip.label.toLowerCase().startsWith(NOTE_TRIGGER);

    if (!isNoteTrigger) {
      setShowSuggestions(false);
      setNoteTitles([]);
      return;
    }

    // Extract the argument part from the chip label (e.g., "n:my-title" -> "my-title")
    const args = chip.label.split(':').slice(1).filter((s) => s !== '');
    const searchQuery = args.length ? args[0].trim().replace(/-+/g, ' ') : '';

    // Fetch note titles
    const fetchTitles = async () => {
      setIsLoadingTitles(true);
      try {
        const response = await notesAPI.getTitles(searchQuery || undefined);
        setNoteTitles(response.titles);
        setShowSuggestions(response.titles.length > 0);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error('Failed to fetch note titles:', error);
        setNoteTitles([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingTitles(false);
      }
    };

    // Debounce the fetch to avoid too many requests
    const timeoutId = setTimeout(fetchTitles, 300);
    return () => clearTimeout(timeoutId);
  }, [chip]);

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

  const submitCapture = async (data: { content: string; category?: string }) => {
    if (!chip) {
      const { tags } = parseInlineTags(data.content);
      await capturesAPI.create({
        content: data.content,
        metadata: tags.length > 0 ? { tags } : undefined,
      });
      return;
    }

    if (isTodoChip(chip)) {
      const { tags } = parseInlineTags(data.content);
      await todosAPI.create({ content: data.content, tags: tags.length > 0 ? tags : undefined });
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
  };

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [chip, content, createCapture, onSuccess]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (variant === 'textarea' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
      return;
    }

    // Handle autocomplete navigation
    if (showSuggestions && noteTitles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < noteTitles.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }

      if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        const selectedTitle = noteTitles[selectedSuggestionIndex];
        selectSuggestion(selectedTitle);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        return;
      }
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
          setShowSuggestions(false);
          setNoteTitles([]);
        }

        queueMicrotask(() => {
          const input = inputRef.current;
          if (!input) return;
          input.focus();
          input.setSelectionRange(0, 0);
        });
      }
    }
  }, [chip, variant, handleSubmit, showSuggestions, noteTitles, selectedSuggestionIndex, selectSuggestion]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const raw = e.target.value;

    if (!chip && triggerPattern.test(raw)) {
      // New trigger detected
      const match = raw.match(triggerPattern);
      const consumed = match?.[0]?.length || 0;
      const matchedTrigger = match?.[0]?.trim() || NOTE_TRIGGER.trim();

      const nextChip: Chip = { kind: 'trigger', label: matchedTrigger };
      const nextText = raw.slice(consumed);

      setChip(nextChip);
      setContent(nextText);
      return;
    } else if (chip && ARGUMENT_PATTERN.test(raw)) {
      // Argument detected
      const match = raw.match(ARGUMENT_PATTERN);
      const consumed = match?.[0]?.length || 0;

      const updatedChip: Chip = { kind: 'trigger', label: chip.label + match?.[0].trim() };
      const nextText = raw.slice(consumed);

      setChip(updatedChip);
      setContent(nextText);
      return;
    }

    setContent(raw);
  }, [chip, triggerPattern]);

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
          className="flex-1 flex items-center input-accent relative"
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
                <span>{renderHighlightedContent(content)}</span>
              </div>
            )}

            {/* Autocomplete dropdown */}
            {showSuggestions && noteTitles.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {noteTitles.map((title, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectSuggestion(title)}
                    className={`w-full text-left px-4 py-2 font-mono text-sm hover:bg-gray-700 ${
                      index === selectedSuggestionIndex ? 'bg-gray-700' : ''
                    }`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            )}
            {isLoadingTitles && chip && chip.label.toLowerCase().startsWith(NOTE_TRIGGER) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3 z-50">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading note titles...</span>
                </div>
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
