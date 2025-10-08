import type { User } from './user'
import type { DirectMessage } from './message'

export interface Conversation {
  id: string
  participantIds: string[]
  participants: User[]
  lastMessageAt: string
  createdAt: string
  updatedAt: string
  messages?: DirectMessage[]
  unreadCount?: number
  hasMore?: boolean
}
