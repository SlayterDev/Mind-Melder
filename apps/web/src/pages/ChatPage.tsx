import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { conversationsAPI, type Conversation, type ChatMessage as ApiChatMessage } from '../api/client';
import { getApiUrl } from '../api/config';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ name: string; result: string }>;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load conversations list
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (id) {
      loadMessages(id);
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      // Convert API messages to display format
      const displayMessages: DisplayMessage[] = [];
      for (const msg of data.messages) {
        if (msg.role === 'user') {
          displayMessages.push({
            id: msg.id,
            role: 'user',
            content: msg.content ?? '',
          });
        } else if (msg.role === 'assistant') {
          displayMessages.push({
            id: msg.id,
            role: 'assistant',
            content: msg.content ?? '',
            toolCalls: msg.toolCalls ?? undefined,
          });
        }
        // Skip system and tool messages for display
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
        systemPrompt: 'You are a helpful assistant with access to the user\'s notes, captures, and todos. Use the available tools to search and retrieve information when the user asks about their data.',
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

  const sendMessage = async (content: string) => {
    if (!id || isStreaming) return;

    // Add user message optimistically
    const userMessage: DisplayMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for assistant response
    const assistantMessage: DisplayMessage = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setIsStreaming(true);

    // Track tool calls and results for this response
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];
    const toolResults: Array<{ name: string; result: string }> = [];

    try {
      const response = await fetch(`${getApiUrl()}/conversations/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'token') {
                assistantContent += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    last.content = assistantContent;
                  }
                  return updated;
                });
              } else if (data.type === 'tool_call') {
                toolCalls.push(data.toolCall);
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    last.toolCalls = [...toolCalls];
                  }
                  return updated;
                });
              } else if (data.type === 'tool_result') {
                toolResults.push({ name: data.name, result: data.result });
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    last.toolResults = [...toolResults];
                  }
                  return updated;
                });
              } else if (data.type === 'done') {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    last.id = data.messageId;
                    last.isStreaming = false;
                  }
                  return updated;
                });
              } else if (data.type === 'error') {
                console.error('Stream error:', data.message);
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    last.content = `Error: ${data.message}`;
                    last.isStreaming = false;
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
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          last.content = 'Failed to get response. Please try again.';
          last.isStreaming = false;
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      loadConversations(); // Refresh to update titles/timestamps
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`border-r border-accent/20 bg-gray-900/30 flex flex-col transition-all duration-300 ${
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
              className={`group flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors
                         ${id === conv.id ? 'bg-gray-800/70 border-l-2 border-accent' : ''}`}
              onClick={() => navigate(`/chat/${conv.id}`)}
            >
              <MessageSquare size={16} className="text-gray-500 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-300 truncate">
                {conv.title || 'Untitled'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header with expand button */}
        {sidebarCollapsed && (
          <div className="flex items-center gap-2 p-2 border-b border-accent/20">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
