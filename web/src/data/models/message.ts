export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  deleted?: boolean;
}
