import type { RenderElementProps } from 'slate-react';
import { TaskCardVoid } from './TaskCardVoid';

export function SlateElement({ attributes, children, element }: RenderElementProps) {
  switch (element.type) {
    case 'heading-one':
      return (
        <h1 {...attributes} className="text-2xl font-bold text-white mt-4 mb-2">
          {children}
        </h1>
      );
    case 'heading-two':
      return (
        <h2 {...attributes} className="text-xl font-semibold text-white mt-3 mb-2">
          {children}
        </h2>
      );
    case 'bulleted-list':
      return (
        <ul {...attributes} className="list-disc list-inside space-y-1 my-2 text-gray-200">
          {children}
        </ul>
      );
    case 'numbered-list':
      return (
        <ol {...attributes} className="list-decimal list-inside space-y-1 my-2 text-gray-200">
          {children}
        </ol>
      );
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'code-block':
      return (
        <pre {...attributes} className="bg-gray-800 rounded-lg p-4 my-2 overflow-x-auto">
          <code className="text-green-400 font-mono text-sm">{children}</code>
        </pre>
      );
    case 'task-card':
      return (
        <TaskCardVoid attributes={attributes} element={element}>
          {children}
        </TaskCardVoid>
      );
    default:
      return (
        <p {...attributes} className="text-gray-200 my-1">
          {children}
        </p>
      );
  }
}
