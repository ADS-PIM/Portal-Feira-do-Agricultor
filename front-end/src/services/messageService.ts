import { apiFetch } from './api'

export const MESSAGE_SUBJECTS = ['DOUBT', 'SUGGESTION', 'COMPLAINT', 'PARTNERSHIP', 'OTHER'] as const

export type MessageSubject = (typeof MESSAGE_SUBJECTS)[number]

export interface UserMessage {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  subject: string | null
  message: string | null
  submitDate: string | null
  title: string | null
  isRead: boolean | null
}

export interface CreateMessagePayload {
  name: string
  email: string
  phone?: string
  subject: MessageSubject
  message: string
  title: string
}

export async function createMessage(payload: CreateMessagePayload, signal?: AbortSignal): Promise<void> {
  await apiFetch<{ message: string }>('message/create', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      phone: payload.phone?.trim() || undefined,
    }),
  })
}

export function getUserMessages(signal?: AbortSignal): Promise<UserMessage[] | null> {
  return apiFetch<UserMessage[] | null>('message', { signal })
}

export function markUserMessageAsRead(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`message/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  })
}

export function deleteUserMessage(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`message/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
