import { useCallback, useMemo, useState } from 'react';
import { createEditor, Editor, Transforms, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import type { Descendant } from 'slate';
import type { RenderElementProps, RenderLeafProps } from 'slate-react';
import { SlateToolbar } from './SlateToolbar';
import { SlateLeaf } from './SlateLeaf';
import { SlateElement as RenderElement } from './SlateElement';
import { CommandPalette } from './CommandPalette';
import { toggleMark } from './editorHelpers';
import type { TaskCardElement } from './types';

import './types'; // ensure module augmentation is applied

function withTaskCards(editor: ReturnType<typeof createEditor>) {
  const { isVoid } = editor;
  editor.isVoid = (element) =>
    (element as TaskCardElement).type === 'task-card' || isVoid(element);
  return editor;
}

export interface SlateEditorProps {
  value: Descendant[];
  onChange: (value: Descendant[]) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function SlateEditor({ value, onChange, readOnly = false, placeholder }: SlateEditorProps) {
  const editor = useMemo(
    () => withTaskCards(withHistory(withReact(createEditor()))),
    []
  );

  const [showPalette, setShowPalette] = useState(false);
  const [paletteTriggerPath, setPaletteTriggerPath] = useState<number[]>([]);

  const renderElement = useCallback(
    (props: RenderElementProps) => <RenderElement {...props} />,
    []
  );
  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <SlateLeaf {...props} />,
    []
  );

  function isModKey(e: React.KeyboardEvent) {
    return e.ctrlKey || e.metaKey;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (isModKey(e)) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          toggleMark(editor, 'bold');
          return;
        case 'i':
          e.preventDefault();
          toggleMark(editor, 'italic');
          return;
        case '`':
          e.preventDefault();
          toggleMark(editor, 'code');
          return;
      }
    }

    // Slash command: '/' at start of an empty paragraph
    if (e.key === '/' && !showPalette) {
      const { selection } = editor;
      if (selection) {
        const [match] = Editor.nodes(editor, {
          match: (n) =>
            !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'paragraph',
        });
        if (match) {
          const [, path] = match;
          const text = Editor.string(editor, path);
          if (text === '') {
            // Allow the '/' to be inserted first, then open palette
            setTimeout(() => {
              const { selection: sel } = editor;
              if (sel) {
                setPaletteTriggerPath([...sel.anchor.path]);
                setShowPalette(true);
              }
            }, 0);
          }
        }
      }
    }
  }

  function openPaletteFromToolbar() {
    const { selection } = editor;
    if (selection) {
      setPaletteTriggerPath([...selection.anchor.path]);
      setShowPalette(true);
    }
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      <Slate editor={editor} initialValue={value} onChange={onChange}>
        {!readOnly && (
          <SlateToolbar onInsertTask={openPaletteFromToolbar} />
        )}
        <Editable
          className="p-4 min-h-48 text-gray-200 outline-none leading-relaxed"
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder ?? 'Write your note...'}
          readOnly={readOnly}
          onKeyDown={handleKeyDown}
          spellCheck
        />
        {showPalette && (
          <CommandPalette
            editor={editor}
            triggerPath={paletteTriggerPath}
            onClose={() => setShowPalette(false)}
          />
        )}
      </Slate>
    </div>
  );
}
