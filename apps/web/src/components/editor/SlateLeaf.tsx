import type { RenderLeafProps } from 'slate-react';

export function SlateLeaf({ attributes, children, leaf }: RenderLeafProps) {
  let content = children;

  if (leaf.bold) {
    content = <strong>{content}</strong>;
  }
  if (leaf.italic) {
    content = <em>{content}</em>;
  }
  if (leaf.code) {
    content = (
      <code className="bg-gray-800 text-green-400 rounded px-1 py-0.5 font-mono text-sm">
        {content}
      </code>
    );
  }

  return <span {...attributes}>{content}</span>;
}
