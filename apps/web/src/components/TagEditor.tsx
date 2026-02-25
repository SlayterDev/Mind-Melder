import { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  size?: 'sm' | 'md';
  autoFocus?: boolean;
  className?: string;
  onClose?: () => void;
}

export default function TagEditor({
  tags,
  onChange,
  maxTags = 10,
  placeholder = 'Add tag...',
  size = 'md',
  autoFocus = false,
  className,
  onClose,
}: TagEditorProps) {
  const [tagInput, setTagInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onChange([...tags, trimmedTag]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      } else {
        onClose?.();
      }
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={className}>
      <div
        className={`flex flex-wrap items-center ${size === 'sm' ? 'px-2 py-1.5 gap-1.5 rounded border border-gray-700 bg-gray-800/50' : 'input-accent w-full px-3 py-2 gap-2 min-h-[46px]'}`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} className={`flex items-center text-xs ${size === 'sm' ? 'px-2 py-0.5 bg-blue-900/20 border border-blue-700/40 rounded text-blue-300/90 gap-1' : 'badge-accent px-3 py-1 gap-1'}`}>
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => tagInput && addTag(tagInput)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className={`flex-1 bg-transparent border-none outline-none placeholder-gray-500 min-w-[80px] text-gray-200 ${
            size === 'sm' ? 'text-xs' : ''
          }`}
          disabled={tags.length >= maxTags}
          autoFocus={autoFocus}
        />
      </div>
      {tags.length >= maxTags && (
        <p className="text-yellow-500 text-xs mt-1">Maximum {maxTags} tags allowed</p>
      )}
    </div>
  );
}
