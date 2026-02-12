import { useState, useEffect } from 'react';
import { templatesAPI } from '../api/client';

interface Template {
  id: string;
  name: string;
  isActive: boolean;
}

interface TemplateSelectorProps {
  value: string | undefined;
  onChange: (templateId: string | undefined) => void;
  className?: string;
}

export default function TemplateSelector({
  value,
  onChange,
  className = '',
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await templatesAPI.list();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Find the active template
  const activeTemplate = templates.find((t) => t.isActive);

  return (
    <div className={className}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        disabled={isLoading}
        className="input-accent appearance-none cursor-pointer text-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%239ca3af%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
      >
        <option value="">
          {activeTemplate ? `Default (${activeTemplate.name})` : 'Default Template'}
        </option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </div>
  );
}
