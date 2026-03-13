import { useState } from 'react';
import type { Descendant } from 'slate';
import TagEditor from './TagEditor';
import { SlateEditor } from './editor/SlateEditor';
import {
  EMPTY_SLATE_DOCUMENT,
  deserializeFromString,
  serializeToString,
  slateToPlainText,
} from './editor/slateSerializer';

interface NoteFormProps {
  initialTitle?: string;
  initialContent?: string;
  initialSlateValue?: Descendant[];
  initialContentFormat?: 'markdown' | 'slate_json';
  initialTags?: string[];
  onSubmit: (data: {
    title: string;
    content: string;
    contentFormat: 'markdown' | 'slate_json';
    tags?: string[];
  }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export default function NoteForm({
  initialTitle = '',
  initialContent = '',
  initialSlateValue,
  initialContentFormat = 'slate_json',
  initialTags = [],
  onSubmit,
  onCancel,
  submitLabel = 'Save Note',
}: NoteFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve initial editor value:
  // 1. If a parsed Slate document was provided, use it directly
  // 2. If existing content is slate_json, deserialize it
  // 3. If existing content is markdown (or plain text), wrap in a paragraph
  // 4. Otherwise, start empty
  const [editorValue, setEditorValue] = useState<Descendant[]>(() => {
    if (initialSlateValue) return initialSlateValue;
    if (initialContentFormat === 'slate_json' && initialContent) {
      return deserializeFromString(initialContent);
    }
    if (initialContent) {
      // Markdown note being opened for editing — load as plain paragraph
      return [{ type: 'paragraph', children: [{ text: initialContent }] }];
    }
    return EMPTY_SLATE_DOCUMENT;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainText = slateToPlainText(editorValue).trim();
    if (!title.trim() || !plainText) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        content: serializeToString(editorValue),
        contentFormat: 'slate_json',
        tags: tags.length > 0 ? tags : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
      setIsSubmitting(false);
    }
  };

  const isEmpty = slateToPlainText(editorValue).trim().length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="input-accent w-full px-4 py-3"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
        <SlateEditor
          value={editorValue}
          onChange={setEditorValue}
          placeholder="Write your note..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tags <span className="text-gray-500">(press Enter or comma to add)</span>
        </label>
        <TagEditor tags={tags} onChange={setTags} size="md" />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || isEmpty}
          className="btn-accent px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
