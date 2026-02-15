import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, Pencil, ChevronDown } from 'lucide-react';
import { conversationsAPI, type Conversation } from '../api/client';
import { MAX_CHAT_TODOS } from 'types';
import { getApiUrl } from '../api/config';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ name: string; result: string }>;
  todoIds?: string[];
  isStreaming?: boolean;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const isNearBottomRef = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Keep ref in sync with conversations state
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Load conversations list
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (id) {
      conversationIdRef.current = id;
      loadMessages(id);
    } else {
      conversationIdRef.current = undefined;
      setMessages([]);
      setLoading(false);
    }
    
    // Cleanup: abort any pending stream when conversation changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [id]);

  // Track if user is near bottom (for auto-scroll)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom only when user is near bottom and a new message is added
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]); // Only trigger on new messages, not every token

  const loadConversations = async () => {
    try {
      const data = await conversationsAPI.list();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      const data = await conversationsAPI.get(conversationId);
      // Convert API messages to display format, pairing tool results with assistant messages
      const displayMessages: DisplayMessage[] = [];
      const toolResultsMap = new Map<string, string>();
      const toolTodoIdsMap = new Map<string, string[]>();

      // First pass: collect all tool results and todoIds by toolCallId
      for (const msg of data.messages) {
        if (msg.role === 'tool' && msg.toolCallId && msg.content) {
          toolResultsMap.set(msg.toolCallId, msg.content);
          const meta = msg.metadata as { todoIds?: string[] } | null;
          if (meta?.todoIds) {
            toolTodoIdsMap.set(msg.toolCallId, meta.todoIds);
          }
        }
      }

      // Second pass: build display messages with tool results attached
      for (const msg of data.messages) {
        if (msg.role === 'user') {
          displayMessages.push({
            id: msg.id,
            role: 'user',
            content: msg.content ?? '',
          });
        } else if (msg.role === 'assistant') {
          const toolResults: Array<{ name: string; result: string }> = [];
          const todoIds: string[] = [];

          // Match tool results to this assistant message's tool calls
          if (msg.toolCalls) {
            for (const tc of msg.toolCalls) {
              const result = toolResultsMap.get(tc.id);
              if (result) {
                toolResults.push({ name: tc.name, result });
              }
              const ids = toolTodoIdsMap.get(tc.id);
              if (ids) {
                for (const tid of ids) {
                  if (!todoIds.includes(tid)) todoIds.push(tid);
                }
              }
            }
          }

          displayMessages.push({
            id: msg.id,
            role: 'assistant',
            content: msg.content ?? '',
            toolCalls: msg.toolCalls ?? undefined,
            toolResults: toolResults.length > 0 ? toolResults : undefined,
            todoIds: todoIds.length > 0 ? todoIds.slice(0, MAX_CHAT_TODOS) : undefined,
          });
        }
        // Skip system and tool messages for display (tool results are attached to assistant messages)
      }

      // Move todoIds to the last assistant message in each turn so cards
      // render below the response content, matching the streaming layout.
      for (let i = 0; i < displayMessages.length; i++) {
        const msg = displayMessages[i];
        if (msg.todoIds && msg.toolCalls) {
          // Find the last consecutive assistant message in this turn
          let lastAssistantIdx = i;
          for (let j = i + 1; j < displayMessages.length && displayMessages[j].role === 'assistant'; j++) {
            lastAssistantIdx = j;
          }
          if (lastAssistantIdx !== i) {
            displayMessages[lastAssistantIdx] = {
              ...displayMessages[lastAssistantIdx],
              todoIds: msg.todoIds,
            };
            displayMessages[i] = { ...msg, todoIds: undefined };
          }
        }
      }

      setMessages(displayMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async () => {
    try {
      const conversation = await conversationsAPI.create({
        title: 'New Chat',
      });
      setConversations((prev) => [conversation, ...prev]);
      navigate(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const deleteConversation = async (convId: string) => {
    try {
      await conversationsAPI.delete(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (id === convId) {
        navigate('/chat');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const startEditing = (conv: Conversation) => {
    setEditingConversationId(conv.id);
    setEditingTitle(conv.title || '');
  };

  const saveTitle = async () => {
    if (!editingConversationId) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingConversationId(null);
      return;
    }
    try {
      await conversationsAPI.update(editingConversationId, { title: trimmed });
      setConversations((prev) =>
        prev.map((c) => c.id === editingConversationId ? { ...c, title: trimmed } : c)
      );
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
    setEditingConversationId(null);
  };

  const cancelEditing = () => {
    setEditingConversationId(null);
  };

  const sendMessage = async (content: string) => {
    if (!id || isStreaming) return;
    
    // Store the current conversation ID to check against later
    const currentConversationId = id;

    // Add user message optimistically
    const userMessage: DisplayMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for assistant response
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    const assistantMessage: DisplayMessage = {
      id: tempAssistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(true);

    // Track tool calls and results for this response
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];
    const toolResults: Array<{ name: string; result: string }> = [];
    const toolErrors: Array<{ name: string; error: string }> = [];
    const collectedTodoIds: string[] = [];

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${getApiUrl()}/conversations/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let isDone = false;

      // Use a more conventional loop structure to avoid lint warning
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) {
          isDone = true;
          break;
        }

        // Check if conversation changed during streaming
        if (conversationIdRef.current !== currentConversationId) {
          reader.cancel();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'token') {
                assistantContent += data.content;
                // Update state immutably
                setMessages((prev) => {
                  // Guard: ensure we're still in the same conversation
                  if (conversationIdRef.current !== currentConversationId) {
                    return prev;
                  }
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  const last = updated[lastIndex];
                  if (last?.role === 'assistant' && last.id === tempAssistantId) {
                    // Create new object instead of mutating
                    updated[lastIndex] = {
                      ...last,
                      content: assistantContent,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'tool_call') {
                toolCalls.push(data.toolCall);
                setMessages((prev) => {
                  if (conversationIdRef.current !== currentConversationId) {
                    return prev;
                  }
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  const last = updated[lastIndex];
                  if (last?.role === 'assistant' && last.id === tempAssistantId) {
                    updated[lastIndex] = {
                      ...last,
                      toolCalls: [...toolCalls],
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'tool_result') {
                toolResults.push({ name: data.name, result: data.result });
                if (data.todo_ids) {
                  for (const tid of data.todo_ids) {
                    if (!collectedTodoIds.includes(tid)) {
                      collectedTodoIds.push(tid);
                    }
                  }
                }
                const todoIds = collectedTodoIds.slice(0, MAX_CHAT_TODOS);
                setMessages((prev) => {
                  if (conversationIdRef.current !== currentConversationId) {
                    return prev;
                  }
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  const last = updated[lastIndex];
                  if (last?.role === 'assistant' && last.id === tempAssistantId) {
                    updated[lastIndex] = {
                      ...last,
                      toolResults: [...toolResults],
                      todoIds: todoIds.length > 0 ? todoIds : undefined,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'tool_error') {
                // Handle tool errors
                const errorResult = { name: data.name, result: `Error: ${data.error}` };
                toolErrors.push({ name: data.name, error: data.error });
                toolResults.push(errorResult);
                setMessages((prev) => {
                  if (conversationIdRef.current !== currentConversationId) {
                    return prev;
                  }
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  const last = updated[lastIndex];
                  if (last?.role === 'assistant' && last.id === tempAssistantId) {
                    // Add error to tool results for display
                    updated[lastIndex] = {
                      ...last,
                      toolResults: [...toolResults],
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'done') {
                setMessages((prev) => {
                  if (conversationIdRef.current !== currentConversationId) {
                    return prev;
                  }
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  const last = updated[lastIndex];
                  if (last?.role === 'assistant' && last.id === tempAssistantId) {
                    updated[lastIndex] = {
                      ...last,
                      id: data.messageId,
                      isStreaming: false,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'error') {
                console.error('Stream error:', data.message);
                setMessages((prev) => {
                  if (conversationIdRef.current !== currentConversationId) {
                    return prev;
                  }
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  const last = updated[lastIndex];
                  if (last?.role === 'assistant' && last.id === tempAssistantId) {
                    updated[lastIndex] = {
                      ...last,
                      content: `Error: ${data.message}`,
                      isStreaming: false,
                    };
                  }
                  return updated;
                });
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (error: unknown) {
      // Don't show error if aborted (user navigated away)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to send message:', error);
      setMessages((prev) => {
        if (conversationIdRef.current !== currentConversationId) {
          return prev;
        }
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        const last = updated[lastIndex];
        if (last?.role === 'assistant' && last.id === tempAssistantId) {
          updated[lastIndex] = {
            ...last,
            content: 'Failed to get response. Please try again.',
            isStreaming: false,
          };
        }
        return updated;
      });
    } finally {
      // Only update state if we're still in the same conversation
      if (conversationIdRef.current === currentConversationId) {
        setIsStreaming(false);

        // Auto-generate title if still "New Chat" using latest conversations from ref
        const conv = conversationsRef.current.find(c => c.id === currentConversationId);
        if (conv && conv.title === 'New Chat') {
          conversationsAPI.generateTitle(currentConversationId)
            .then(({ title }) => {
              setConversations(prev =>
                prev.map(c =>
                  c.id === currentConversationId ? { ...c, title } : c
                )
              );
            })
            .catch(err => console.error('Failed to generate title:', err));
        }

        loadConversations(); // Refresh to update titles/timestamps
      }
      // Clear abort controller if it's still the current one
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Mobile Conversations Drawer */}
      <div className="md:hidden">
        {/* Mobile header bar */}
        <div className="flex items-center gap-2 p-2 border-b border-accent/20 bg-gray-900/50">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800/50 transition-colors text-left"
          >
            <MessageSquare size={16} className="text-gray-500 flex-shrink-0" />
            <span className="text-sm truncate flex-1">
              {id ? (conversations.find(c => c.id === id)?.title || 'Chat') : 'Select a conversation'}
            </span>
            <ChevronDown size={16} className={`text-gray-500 transition-transform ${mobileDrawerOpen ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={createConversation}
            className="p-2 rounded-lg text-accent hover:bg-accent/20 transition-colors flex-shrink-0"
            title="New chat"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Mobile drawer content */}
        {mobileDrawerOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-10"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative z-20 max-h-64 overflow-y-auto bg-gray-900 border-b border-accent/20">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-gray-800/50 transition-colors cursor-pointer
                             ${id === conv.id ? 'bg-gray-800/70 border-l-2 border-accent' : ''}`}
                  onClick={() => {
                    navigate(`/chat/${conv.id}`);
                    setMobileDrawerOpen(false);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/chat/${conv.id}`);
                      setMobileDrawerOpen(false);
                    }
                  }}
                  aria-label={`Open conversation: ${conv.title || 'Untitled'}`}
                >
                  <MessageSquare size={16} className="text-gray-500 flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-sm text-gray-300 truncate">
                    {conv.title || 'Untitled'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="p-1 text-gray-500 hover:text-red-400 transition-all"
                    aria-label={`Delete conversation: ${conv.title || 'Untitled'}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">No conversations yet</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex border-r border-accent/20 bg-gray-900/30 flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
        }`}
      >
        <div className="p-4 flex items-center gap-2">
          <button
            onClick={createConversation}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                       bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-colors"
          >
            <Plus size={18} />
            New Chat
          </button>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-gray-800/50 transition-colors cursor-pointer
                         ${id === conv.id ? 'bg-gray-800/70 border-l-2 border-accent' : ''}`}
              onClick={() => navigate(`/chat/${conv.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/chat/${conv.id}`);
                }
              }}
              aria-label={`Open conversation: ${conv.title || 'Untitled'}`}
            >
              <MessageSquare size={16} className="text-gray-500 flex-shrink-0" aria-hidden="true" />
              {editingConversationId === conv.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  onBlur={saveTitle}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  aria-label={`Edit title for conversation: ${conv.title || 'Untitled'}`}
                  className="flex-1 text-sm text-gray-300 bg-gray-800 border border-accent/40 rounded px-1 py-0.5 outline-none focus:border-accent"
                />
              ) : (
                <span className="flex-1 text-sm text-gray-300 truncate">
                  {conv.title || 'Untitled'}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(conv);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-accent transition-all"
                aria-label={`Rename conversation: ${conv.title || 'Untitled'}`}
              >
                <Pencil size={14} aria-hidden="true" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                aria-label={`Delete conversation: ${conv.title || 'Untitled'}`}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header with expand button - desktop only */}
        {sidebarCollapsed && (
          <div className="hidden md:flex items-center gap-2 p-2 border-b border-accent/20">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft size={18} />
            </button>
            <button
              onClick={createConversation}
              className="p-2 rounded-lg text-accent hover:bg-accent/20 transition-colors"
              title="New chat"
            >
              <Plus size={18} />
            </button>
          </div>
        )}

        {id ? (
          <>
            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Loading...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Start a conversation
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    toolCalls={msg.toolCalls}
                    toolResults={msg.toolResults}
                    todoIds={msg.todoIds}
                    isStreaming={msg.isStreaming}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput onSend={sendMessage} disabled={isStreaming} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
