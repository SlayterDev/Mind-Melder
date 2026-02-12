import { eq, sql } from 'drizzle-orm';
import {
  conversations,
  chatMessages,
  type Conversation,
  type NewConversation,
  type ChatMessage,
  type NewChatMessage,
} from '../schema/conversations.js';
import type { Database } from '../client.js';

export class ConversationsRepository {
  constructor(private db: Database) {}

  async create(data: NewConversation): Promise<Conversation> {
    const [conversation] = await this.db.insert(conversations).values(data).returning();
    return conversation;
  }

  async findById(id: string): Promise<Conversation | undefined> {
    const [conversation] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async findByUserId(userId: string, limit?: number): Promise<Conversation[]> {
    const query = this.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(sql`${conversations.updatedAt} DESC`);

    return limit !== undefined ? query.limit(limit) : query;
  }

  async update(
    id: string,
    data: Partial<Pick<Conversation, 'title' | 'model' | 'systemPrompt' | 'metadata'>>
  ): Promise<Conversation | undefined> {
    const [conversation] = await this.db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(conversations).where(eq(conversations.id, id));
  }

  async addMessage(data: NewChatMessage): Promise<ChatMessage> {
    const [message] = await this.db.insert(chatMessages).values(data).returning();
    // Update conversation's updatedAt
    await this.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, data.conversationId));
    return message;
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(sql`${chatMessages.createdAt} ASC`);
  }

  async getMessageById(id: string): Promise<ChatMessage | undefined> {
    const [message] = await this.db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return message;
  }

  async deleteMessage(id: string): Promise<void> {
    await this.db.delete(chatMessages).where(eq(chatMessages.id, id));
  }
}
