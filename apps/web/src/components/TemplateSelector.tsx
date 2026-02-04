import { useState, useEffect } from 'react';
import { templatesAPI } from '../api/client';
import { ChevronDown } from 'lucide-react';

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

export default function TemplateSelector({ value, onChange, className = '' }: TemplateSelectorProps) {
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
    <div className={`relative ${className}`}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={isLoading}
        className="input-accent pr-10 appearance-none cursor-pointer text-sm"
      >
        <option value="">
          {isLoading
            ? 'Loading templates...'
            : activeTemplate
            ? `Default (${activeTemplate.name})`
            : 'Default Template'}
        </option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
