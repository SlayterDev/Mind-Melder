import { Editor, Transforms, Element as SlateElement } from 'slate';
import type { CustomElement } from './types';

type BlockType = CustomElement['type'];

const LIST_TYPES: BlockType[] = ['bulleted-list', 'numbered-list'];

export function isMarkActive(editor: Editor, format: keyof Omit<import('./types').CustomText, 'text'>): boolean {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
}

export function toggleMark(editor: Editor, format: keyof Omit<import('./types').CustomText, 'text'>): void {
  if (isMarkActive(editor, format)) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
}

export function isBlockActive(editor: Editor, type: BlockType): boolean {
  const [match] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === type,
  });
  return !!match;
}

export function toggleBlock(editor: Editor, type: BlockType): void {
  const isActive = isBlockActive(editor, type);
  const isList = (LIST_TYPES as string[]).includes(type);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      (LIST_TYPES as string[]).includes(n.type),
    split: true,
  });

  const newType: BlockType = isActive ? 'paragraph' : isList ? 'list-item' : type;
  Transforms.setNodes<SlateElement>(editor, { type: newType });

  if (!isActive && isList) {
    Transforms.wrapNodes(editor, { type, children: [] } as CustomElement);
  }
}
