import type { User } from './user'

export interface Message {
  id: string
  text: string
  createdAt: string
  user: User
  userId: string
}

export interface DirectMessage {
  id: string
  text: string
  createdAt: string
  senderId: string
  receiverId: string
  sender: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>
  isRead: boolean
  readAt?: string
}
