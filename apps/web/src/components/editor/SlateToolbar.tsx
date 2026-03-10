import { useSlate } from 'slate-react';
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Terminal,
  ListTodo,
} from 'lucide-react';
import { toggleMark, toggleBlock, isMarkActive, isBlockActive } from './editorHelpers';
import type { CustomElement } from './types';

type MarkFormat = 'bold' | 'italic' | 'code';
type BlockType = CustomElement['type'];

interface MarkButtonProps {
  format: MarkFormat;
  icon: React.ReactNode;
  title: string;
}

function MarkButton({ format, icon, title }: MarkButtonProps) {
  const editor = useSlate();
  const active = isMarkActive(editor, format);
  return (
    <button
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        toggleMark(editor, format);
      }}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {icon}
    </button>
  );
}

interface BlockButtonProps {
  type: BlockType;
  icon: React.ReactNode;
  title: string;
}

function BlockButton({ type, icon, title }: BlockButtonProps) {
  const editor = useSlate();
  const active = isBlockActive(editor, type);
  return (
    <button
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        toggleBlock(editor, type);
      }}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {icon}
    </button>
  );
}

interface SlateToolbarProps {
  onInsertTask?: () => void;
}

export function SlateToolbar({ onInsertTask }: SlateToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-700 bg-gray-850 flex-wrap">
      <MarkButton format="bold" icon={<Bold size={15} />} title="Bold (Mod+B)" />
      <MarkButton format="italic" icon={<Italic size={15} />} title="Italic (Mod+I)" />
      <MarkButton format="code" icon={<Code size={15} />} title="Inline Code (Mod+`)" />
      <span className="w-px h-4 bg-gray-700 mx-1" />
      <BlockButton type="heading-one" icon={<Heading1 size={15} />} title="Heading 1" />
      <BlockButton type="heading-two" icon={<Heading2 size={15} />} title="Heading 2" />
      <span className="w-px h-4 bg-gray-700 mx-1" />
      <BlockButton type="bulleted-list" icon={<List size={15} />} title="Bulleted List" />
      <BlockButton type="numbered-list" icon={<ListOrdered size={15} />} title="Numbered List" />
      <BlockButton type="code-block" icon={<Terminal size={15} />} title="Code Block" />
      {onInsertTask && (
        <>
          <span className="w-px h-4 bg-gray-700 mx-1" />
          <button
            title="Insert Task Card (/)"
            onMouseDown={(e) => {
              e.preventDefault();
              onInsertTask();
            }}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <ListTodo size={15} />
          </button>
        </>
      )}
    </div>
  );
}
