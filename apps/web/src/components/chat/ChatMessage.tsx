import Markdown from 'react-markdown';
import { Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ChatTaskCards } from './ChatTaskCards';

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCalls?: ToolCall[] | null;
  toolResults?: Array<{ name: string; result: string }>;
  todoIds?: string[];
  isStreaming?: boolean;
}

export function ChatMessage({
  role,
  content,
  toolCalls,
  toolResults,
  todoIds,
  isStreaming,
}: ChatMessageProps) {
  const [toolsExpanded, setToolsExpanded] = useState(false);

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="chat-bubble-user">
          <p className="text-gray-100 whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  if (role === 'assistant') {
    return (
      <div className="flex flex-col gap-2">
        {/* Tool calls section */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="text-sm">
            <button
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-300 transition-colors"
            >
              {toolsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Wrench size={14} />
              <span>
                {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''} used
              </span>
            </button>
            {toolsExpanded && (
              <div className="mt-2 space-y-2 pl-5">
                {toolCalls.map((tc, i) => (
                  <div
                    key={tc.id}
                    className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
                  >
                    <div className="font-mono text-xs text-accent">{tc.name}</div>
                    <pre className="text-xs text-gray-400 mt-1 overflow-x-auto">
                      {JSON.stringify(tc.arguments, null, 2)}
                    </pre>
                    {toolResults && toolResults[i] && (
                      <div className="mt-2 pt-2 border-t border-gray-700/50">
                        <div className="text-xs text-gray-500 mb-1">Result:</div>
                        <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                          {toolResults[i].result.slice(0, 500)}
                          {toolResults[i].result.length > 500 && '...'}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message content */}
        {content && (
          <div className="chat-message-assistant">
            <Markdown>{content}</Markdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-accent/70 animate-pulse ml-0.5" />
            )}
          </div>
        )}

        {/* Todo task cards */}
        {todoIds && todoIds.length > 0 && !isStreaming && <ChatTaskCards todoIds={todoIds} />}
      </div>
    );
  }

  // System or tool messages (usually hidden)
  return null;
}
