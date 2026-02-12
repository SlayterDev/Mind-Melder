import { useState } from 'react';
import { Check, X, ChevronDown, ChevronRight, Pencil, Save, Calendar, Zap, Clock, Hourglass, Flame, Target, Lightbulb, Package, Trash2 } from 'lucide-react';
import type { TimeEstimate } from '../api/client';

type TodaySheetSection = 'must_do_today' | 'likely_today' | 'opportunistic' | 'overflow' | 'none';

interface TodoCardProps {
  todo: {
    id: string;
    content: string;
    description?: string;
    status: string;
    dueDate?: string;
    completedAt?: string;
    timeEstimate?: TimeEstimate;
    todaySheetSection?: TodaySheetSection;
  };
  onToggleComplete: (id: string, status: string) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
  onUpdateDueDate: (id: string, dueDate: string | null) => void;
  onUpdateTimeEstimate: (id: string, timeEstimate: TimeEstimate) => void;
  onUpdateTodaySheetSection?: (id: string, section: TodaySheetSection) => void;
  onDelete: (id: string) => void;
}

const TIME_ESTIMATE_OPTIONS: { value: TimeEstimate; label: string; icon: typeof Zap }[] = [
  { value: 'quick', label: '<15 min', icon: Zap },
  { value: 'medium', label: '30-60 min', icon: Clock },
  { value: 'long', label: '>90 min', icon: Hourglass },
  { value: 'none', label: 'No estimate', icon: Clock },
];

const TODAY_SHEET_OPTIONS: { value: TodaySheetSection; label: string; icon: typeof Flame }[] = [
  { value: 'must_do_today', label: 'Must do today', icon: Flame },
  { value: 'likely_today', label: 'Likely today', icon: Target },
  { value: 'opportunistic', label: 'Opportunistic', icon: Lightbulb },
  { value: 'overflow', label: 'Overflow', icon: Package },
];

export default function TodoCard({
  todo,
  onToggleComplete,
  onUpdateContent,
  onUpdateDescription,
  onUpdateDueDate,
  onUpdateTimeEstimate,
  onUpdateTodaySheetSection,
  onDelete,
}: TodoCardProps) {
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(todo.content);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(todo.description || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTodaySheetDropdown, setShowTodaySheetDropdown] = useState(false);

  const getTimeEstimateDisplay = (estimate: TimeEstimate) => {
    const displays: Record<string, { icon: typeof Zap; label: string }> = {
      quick: { icon: Zap, label: '<15min' },
      medium: { icon: Clock, label: '30-60min' },
      long: { icon: Hourglass, label: '>90min' },
    };
    return displays[estimate];
  };

  // Helper to get date from ISO string without timezone conversion
  const getDateOnly = (isoString: string): Date => {
    const datePart = isoString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const openDatePicker = () => {
    const initialDate = todo.dueDate
      ? getDateOnly(todo.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setSelectedDate(initialDate);
    setShowDatePicker(true);
  };

  const handleDateBlur = () => {
    onUpdateDueDate(todo.id, selectedDate || null);
    setShowDatePicker(false);
  };

  const handleSaveContent = () => {
    onUpdateContent(todo.id, editedContent);
    setIsEditingContent(false);
  };

  const handleSaveDescription = () => {
    onUpdateDescription(todo.id, editedDescription);
    setIsEditingDescription(false);
  };

  const isOverdue =
    todo.dueDate &&
    getDateOnly(todo.dueDate) < getDateOnly(new Date().toISOString()) &&
    todo.status === 'pending';

  const getTodaySheetDisplay = (section?: TodaySheetSection) => {
    if (!section || section === 'none') return null;
    const option = TODAY_SHEET_OPTIONS.find((opt) => opt.value === section);
    return option;
  };

  const handleTodaySheetChange = (section: TodaySheetSection) => {
    if (onUpdateTodaySheetSection) {
      onUpdateTodaySheetSection(todo.id, section);
      setShowTodaySheetDropdown(false);
    }
  };

  const currentSection = getTodaySheetDisplay(todo.todaySheetSection);

  return (
    <div
      className={`task-card group ${
        todo.status === 'completed' ? 'task-card-completed' : 'task-card-active'
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggleComplete(todo.id, todo.status)}
          className={`checkbox-accent ${
            todo.status === 'completed' ? 'checkbox-accent-checked' : 'checkbox-accent-unchecked'
          }`}
          title={todo.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
        >
          {todo.status === 'completed' && <Check className="w-3 h-3 text-white" />}
        </button>

        <div className="flex-1">
          {/* Title/Content with edit */}
          {isEditingContent ? (
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-accent-highlight"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveContent();
                  } else if (e.key === 'Escape') {
                    setEditedContent(todo.content);
                    setIsEditingContent(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveContent}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditedContent(todo.content);
                    setIsEditingContent(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group/content mb-2">
              <p
                className={`text-gray-100 leading-relaxed pr-8 ${
                  todo.status === 'completed' ? 'line-through text-gray-500' : ''
                }`}
              >
                {todo.content}
              </p>
              <button
                onClick={() => setIsEditingContent(true)}
                className="absolute top-0 right-0 opacity-0 group-hover/content:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                title="Edit title"
              >
                <Pencil className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          )}

          {/* Description section */}
          {todo.description && (
            <div className="mt-3 border-l-2 border-gray-700 pl-3">
              <button
                onClick={() => setExpandedDescription(!expandedDescription)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
              >
                {expandedDescription ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span className="font-medium">Details</span>
              </button>
              {expandedDescription && (
                <div className="mt-2 relative">
                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-accent-highlight resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveDescription}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        >
                          <Save className="w-3 h-3" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditedDescription(todo.description || '');
                            setIsEditingDescription(false);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group/edit">
                      <p className="text-sm text-gray-300 leading-relaxed pr-8">
                        {todo.description}
                      </p>
                      <button
                        onClick={() => setIsEditingDescription(true)}
                        className="absolute top-0 right-0 opacity-0 group-hover/edit:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                        title="Edit description"
                      >
                        <Pencil className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            {/* Time Estimate */}
            {(!todo.timeEstimate || todo.timeEstimate === 'none') && !showTimePicker && (
              <button
                onClick={() => setShowTimePicker(true)}
                className="px-2 py-0.5 badge-chip cursor-pointer hover:opacity-80 transition-opacity"
                title="Set time estimate"
              >
                <Clock className="w-3 h-3" />
              </button>
            )}
            {todo.timeEstimate && todo.timeEstimate !== 'none' && !showTimePicker && (() => {
              const display = getTimeEstimateDisplay(todo.timeEstimate);
              if (!display) return null;
              const Icon = display.icon;
              return (
                <button
                  onClick={() => setShowTimePicker(true)}
                  className="px-2 py-0.5 badge-chip flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Change time estimate"
                >
                  <Icon className="w-3 h-3" />
                  {display.label}
                </button>
              );
            })()}
            {showTimePicker && (
              <div className="relative flex gap-1">
                {TIME_ESTIMATE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = todo.timeEstimate === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        onUpdateTimeEstimate(todo.id, option.value);
                        setShowTimePicker(false);
                      }}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                        isSelected
                          ? 'bg-accent text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {option.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowTimePicker(false)}
                  className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs hover:bg-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Due Date with picker */}
            {!todo.dueDate && !showDatePicker && (
              <button
                onClick={openDatePicker}
                className="px-2 py-0.5 badge-chip cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Calendar className="w-3 h-3" />
              </button>
            )}
            {todo.dueDate && !showDatePicker && (
              <button
                onClick={openDatePicker}
                className={`badge-chip cursor-pointer hover:opacity-80 transition-opacity ${
                  isOverdue ? 'text-red-400 border-red-900 bg-red-950/30' : ''
                }`}
              >
                Due: {getDateOnly(todo.dueDate).toLocaleDateString()}
              </button>
            )}
            {showDatePicker && (
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  onBlur={handleDateBlur}
                  autoFocus
                  className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:border-accent-highlight"
                />
              </div>
            )}
            {todo.completedAt && (
              <span>Completed: {getDateOnly(todo.completedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Today Sheet Dropdown */}
          <div className={`relative ${currentSection ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            <button
              onClick={() => setShowTodaySheetDropdown(!showTodaySheetDropdown)}
              className="text-gray-400 hover:text-accent-highlight text-sm px-3 py-1 rounded hover:bg-gray-800 transition-all flex items-center gap-2"
              title="Add to today sheet"
            >
              {currentSection ? (
                <>
                  {(() => {
                    const Icon = currentSection.icon;
                    return <Icon className="w-4 h-4" />;
                  })()}
                  <span>{currentSection.label}</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Add to today sheet</span>
                </>
              )}
            </button>
            
            {showTodaySheetDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                {TODAY_SHEET_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = todo.todaySheetSection === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleTodaySheetChange(option.value)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        isSelected
                          ? 'bg-accent text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </button>
                  );
                })}
                {currentSection && (
                  <>
                    <div className="border-t border-gray-700 my-1" />
                    <button
                      onClick={() => handleTodaySheetChange('none')}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-400 hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => onDelete(todo.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400
                     transition-all text-sm px-3 py-1 rounded hover:bg-gray-800"
            title="Delete"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
