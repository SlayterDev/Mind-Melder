import type { BaseEditor } from 'slate';
import type { ReactEditor } from 'slate-react';
import type { HistoryEditor } from 'slate-history';

export type ParagraphElement = { type: 'paragraph'; children: CustomText[] };
export type HeadingOneElement = { type: 'heading-one'; children: CustomText[] };
export type HeadingTwoElement = { type: 'heading-two'; children: CustomText[] };
export type BulletedListElement = { type: 'bulleted-list'; children: ListItemElement[] };
export type NumberedListElement = { type: 'numbered-list'; children: ListItemElement[] };
export type ListItemElement = { type: 'list-item'; children: CustomText[] };
export type CodeBlockElement = { type: 'code-block'; children: CustomText[] };
export type TaskCardElement = {
  type: 'task-card';
  todoId: string;
  children: [{ text: '' }];
};

export type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | BulletedListElement
  | NumberedListElement
  | ListItemElement
  | CodeBlockElement
  | TaskCardElement;

export type CustomText = {
  text: string;
  bold?: true;
  italic?: true;
  code?: true;
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
