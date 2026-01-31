import type { Template } from 'database';

const defaultTemplatePrompt = `Organize the following captures into structured notes and actionable tasks in manner that helps an IC with frequent context switching.`;

// Default template used when no user templates exist
export const defaultTemplate: Template = {
  id: 'default',
  name: 'Default Template',
  prompt: defaultTemplatePrompt,
  isActive: true,
  userId: 'system',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const templateTools = {
  defaultTemplate,
};
