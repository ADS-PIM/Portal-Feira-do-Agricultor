import { apiFetch } from './api'

export const MESSAGE_SUBJECTS = ['DOUBT', 'SUGGESTION', 'COMPLAINT', 'PARTNERSHIP', 'OTHER'] as const

export type MessageSubject = (typeof MESSAGE_SUBJECTS)[number]

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
