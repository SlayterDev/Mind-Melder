import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Zap, Clock, Hourglass, GripVertical, Check, ChevronDown, ChevronRight, FileText, Pencil, Save, X,
  Calendar, ThumbsUp, ThumbsDown, Tag
 } from 'lucide-react';
import { capturesAPI } from '../api/client';
import TagEditor from './TagEditor';

type TimeEstimate = 'quick' | 'medium' | 'long' | 'none';

const TIME_ESTIMATE_OPTIONS: { value: TimeEstimate; label: string; icon: typeof Zap }[] = [
  { value: 'quick', label: '<15 min', icon: Zap },
  { value: 'medium', label: '30-60 min', icon: Clock },
  { value: 'long', label: '>90 min', icon: Hourglass },
  { value: 'none', label: 'None', icon: Clock },
];

type FeedbackVote = 'thumbs_up' | 'thumbs_down' | 'none';

interface TaskCardProps {
  todo: {
    id: string;
    content: string;
    status: string;
    timeEstimate?: string;
    dueDate?: string;
    tags?: string[];
    priorityScore?: number;
    description?: string;
    captureId?: string;
    feedbackVote?: FeedbackVote;
    feedbackText?: string;
  };
  showDragHandle?: boolean;
  onToggleComplete: (id: string, status: string) => void;
  onUpdateDueDate?: (id: string, dueDate: string | null) => void;
  onUpdateDescription?: (id: string, description: string) => void;
  onUpdateContent?: (id: string, content: string) => void;
  onUpdateTimeEstimate?: (id: string, timeEstimate: TimeEstimate) => void;
  onSubmitFeedback?: (id: string, vote: FeedbackVote, feedbackText?: string) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
}

export default function TaskCard({ todo, showDragHandle = true, onToggleComplete, onUpdateDueDate, onUpdateDescription, onUpdateContent, onUpdateTimeEstimate, onSubmitFeedback, onUpdateTags }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [showDescription, setShowDescription] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [originalCapture, setOriginalCapture] = useState<string | null>(null);
  const [originalCaptureDate, setOriginalCaptureDate] = useState<string | null>(null);
  const [isLoadingCapture, setIsLoadingCapture] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(todo.description || '');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState(todo.content);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showTagEditor, setShowTagEditor] = useState(false);

  const fetchOriginalCapture = async () => {
    if (!todo.captureId || originalCapture) return;
    setIsLoadingCapture(true);
    try {
      const capture = await capturesAPI.get(todo.captureId);
      setOriginalCapture(capture.content);
      setOriginalCaptureDate(capture.createdAt);
    } catch (error) {
      console.error('Failed to fetch capture:', error);
      setOriginalCapture('Failed to load original capture');
    } finally {
      setIsLoadingCapture(false);
    }
  };

  const toggleOriginal = () => {
    if (!showOriginal && !originalCapture) {
      fetchOriginalCapture();
    }
    setShowOriginal(!showOriginal);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleDateBlur = () => {
    if (onUpdateDueDate) {
      onUpdateDueDate(todo.id, selectedDate || null);
    }
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    const initialDate = todo.dueDate
      ? getDateOnly(todo.dueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setSelectedDate(initialDate);
    setShowDatePicker(true);
  };

  const getTimeEstimateDisplay = (estimate: string) => {
    const displays: Record<string, { icon: typeof Zap; label: string }> = {
      quick: { icon: Zap, label: '<15min' },
      medium: { icon: Clock, label: '30-60min' },
      long: { icon: Hourglass, label: '>90min' },
    };
    return displays[estimate];
  };

  // Helper to get date from ISO string without timezone conversion
  const getDateOnly = (isoString: string): Date => {
    // Extract just the date portion (YYYY-MM-DD) and parse as local date
    const datePart = isoString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const isOverdue = todo.dueDate && getDateOnly(todo.dueDate) < getDateOnly(new Date().toISOString()) && todo.status === 'pending';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card group ${isDragging ? 'opacity-50 shadow-2xl' : ''} ${
        todo.status === 'completed' ? 'task-card-completed' : 'task-card-active'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        {showDragHandle && (
          <button
            {...attributes}
            {...listeners}
            className="drag-handle"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(todo.id, todo.status)}
          className={`checkbox-accent ${
            todo.status === 'completed' ? 'checkbox-accent-checked' : 'checkbox-accent-unchecked'
          }`}
          title={todo.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
        >
          {todo.status === 'completed' && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Main content with optional capture icon */}
          <div className="flex items-start gap-2">
            {isEditingContent ? (
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-accent-highlight"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (onUpdateContent) {
                        onUpdateContent(todo.id, editedContent);
                      }
                      setIsEditingContent(false);
                    } else if (e.key === 'Escape') {
                      setEditedContent(todo.content);
                      setIsEditingContent(false);
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onUpdateContent) {
                        onUpdateContent(todo.id, editedContent);
                      }
                      setIsEditingContent(false);
                    }}
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
              <div className="flex-1 relative group/content">
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

            {/* AI Utils */}
            {!isEditingContent && todo.captureId && (
            <div className="flex items-center gap-2 ml-2">
              {/* Feedback Buttons */}
              <button
                onClick={() => {
                  if (onSubmitFeedback) {
                    if (todo.feedbackVote === 'thumbs_up') {
                      onSubmitFeedback(todo.id, 'none');
                    } else {
                      onSubmitFeedback(todo.id, 'thumbs_up');
                      setShowFeedbackInput(false);
                    }
                  }
                }}
                className={`flex-shrink-0 mt-0.5 transition-opacity ${
                  todo.feedbackVote === 'thumbs_up' ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                }`}
                title="Thumbs Up"
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${
                  todo.feedbackVote === 'thumbs_up' ? 'text-green-400' : 'text-gray-400 hover:text-green-400'
                }`} />
              </button>
              <div className="relative group/feedback">
                <button
                  onClick={() => {
                    if (todo.feedbackVote === 'thumbs_down') {
                      // Toggle off
                      if (onSubmitFeedback) {
                        onSubmitFeedback(todo.id, 'none');
                      }
                      setShowFeedbackInput(false);
                      setFeedbackText('');
                    } else {
                      // Show input for feedback text
                      setShowFeedbackInput(true);
                      setFeedbackText(todo.feedbackText || '');
                    }
                  }}
                  className={`flex-shrink-0 mt-0.5 transition-opacity ${
                    todo.feedbackVote === 'thumbs_down' ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                  }`}
                  title={todo.feedbackVote === 'thumbs_down' && todo.feedbackText ? todo.feedbackText : 'Thumbs Down'}
                >
                  <ThumbsDown className={`w-3.5 h-3.5 ${
                    todo.feedbackVote === 'thumbs_down' ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                  }`} />
                </button>
                {/* Tooltip for feedback text */}
                {todo.feedbackVote === 'thumbs_down' && todo.feedbackText && !showFeedbackInput && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover/feedback:opacity-100 transition-opacity pointer-events-none z-10 max-w-xs">
                    {todo.feedbackText}
                  </div>
                )}
              </div>
              {/* Original capture icon - subtle and on the right */}
              <button
                onClick={toggleOriginal}
                className="flex-shrink-0 mt-0.5 opacity-40 hover:opacity-100 transition-opacity"
                title="View original capture"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
            )}
          </div>

          {/* Feedback text input */}
          {showFeedbackInput && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value.slice(0, 100))}
                placeholder="What went wrong? (optional, ESC to cancel)"
                maxLength={100}
                className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-red-500 placeholder-gray-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (onSubmitFeedback) {
                      onSubmitFeedback(todo.id, 'thumbs_down', feedbackText || undefined);
                    }
                    setShowFeedbackInput(false);
                  } else if (e.key === 'Escape') {
                    setShowFeedbackInput(false);
                    setFeedbackText('');
                  }
                }}
              />
              <span className="text-xs text-gray-500">{feedbackText.length}/100</span>
              <button
                onClick={() => {
                  if (onSubmitFeedback) {
                    onSubmitFeedback(todo.id, 'thumbs_down', feedbackText || undefined);
                  }
                  setShowFeedbackInput(false);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowFeedbackInput(false);
                  setFeedbackText('');
                }}
                className="px-2 py-1.5 text-gray-400 hover:text-gray-200 text-xs transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Expanded original capture */}
          {showOriginal && todo.captureId && (
            <div className="mt-3 px-3 py-2 bg-gray-900/40 border border-gray-700/50 rounded text-sm text-gray-400 italic">
              {isLoadingCapture ? (
                <span>Loading original capture...</span>
              ) : (
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Original capture:</div>
                  <p>{originalCapture}</p>
                  {originalCaptureDate &&
                    !Number.isNaN(new Date(originalCaptureDate).getTime()) && (
                      <p className="text-xs text-gray-500">
                        Captured: {new Date(originalCaptureDate).toLocaleString()}
                      </p>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Description section */}
          {todo.description && (
            <div className="mt-3 border-l-2 border-gray-700 pl-3 group/description">
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
              >
                {showDescription ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="font-medium">Details</span>
              </button>
              {showDescription && (
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
                          onClick={() => {
                            if (onUpdateDescription) {
                              onUpdateDescription(todo.id, editedDescription);
                            }
                            setIsEditingDescription(false);
                          }}
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
                      <p className="text-sm text-gray-300 leading-relaxed pr-8">{todo.description}</p>
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

          {/* Metadata Chips */}
          <div className="flex flex-wrap gap-2 mt-3">
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
            {todo.timeEstimate && todo.timeEstimate !== 'none' && !showTimePicker && getTimeEstimateDisplay(todo.timeEstimate) && (() => {
              const display = getTimeEstimateDisplay(todo.timeEstimate!);
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
                        if (onUpdateTimeEstimate) {
                          onUpdateTimeEstimate(todo.id, option.value);
                        }
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

            {/* Due Date */}
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

            {/* Add Due Date Button */}
            {!todo.dueDate && !showDatePicker && (
              <button
                onClick={openDatePicker}
                className="px-2 py-0.5 badge-chip cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Calendar className="w-3 h-3" />
              </button>
            )}

            {/* Date Picker */}
            {showDatePicker && (
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  onBlur={handleDateBlur}
                  autoFocus
                  className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:border-accent-highlight"
                />
              </div>
            )}

            {/* Tags */}
            {!showTagEditor && (!todo.tags || todo.tags.length === 0) && (
              <button
                onClick={() => setShowTagEditor(true)}
                className="px-2 py-0.5 badge-chip cursor-pointer hover:opacity-80 transition-opacity"
                title="Add tags"
              >
                <Tag className="w-3 h-3" />
              </button>
            )}
            {!showTagEditor && todo.tags && todo.tags.length > 0 && (
              <>
                {todo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-blue-900/20 border border-blue-700/40 rounded text-xs text-blue-300/90"
                  >
                    {tag}
                  </span>
                ))}
                <button
                  onClick={() => setShowTagEditor(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5 hover:bg-gray-700 rounded"
                  title="Edit tags"
                >
                  <Pencil className="w-3 h-3 text-gray-400" />
                </button>
              </>
            )}
          </div>

          {/* Tag Editor */}
          {showTagEditor && (
            <div className="flex items-center gap-2 mt-2">
              <TagEditor
                tags={todo.tags || []}
                onChange={(newTags) => onUpdateTags?.(todo.id, newTags)}
                onClose={() => setShowTagEditor(false)}
                size="sm"
                autoFocus
                className="flex-1"
              />
              <button
                onClick={() => setShowTagEditor(false)}
                className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs hover:bg-gray-600 flex-shrink-0"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
