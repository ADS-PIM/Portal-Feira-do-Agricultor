import { apiFetch } from './api'

export interface BusinessInfo {
    id: string
    instagramAccount: string | null
    whatsappNumber: string | null
    businessEmail: string | null
    businessHours: string | null
    description: string | null
    updatedAt: string
}

interface BusinessInfoResponse {
    businessInfo: BusinessInfo | null
}

export type BusinessInfoPayload = {
    instagramAccount: string | null
    whatsappNumber: string | null
    businessEmail: string | null
    businessHours: string
    description?: string | null
}

export async function getBusinessInfo(signal?: AbortSignal): Promise<BusinessInfo | null> {
    const response = await apiFetch<BusinessInfoResponse>('business-info', { signal })
    return response.businessInfo
}

export async function upsertBusinessInfo(payload: BusinessInfoPayload, existing?: string | boolean, signal?: AbortSignal): Promise<void> {
    const method = existing ? 'PATCH' : 'POST'

    await apiFetch<{ message: string }>('business-info', {
        method,
        signal,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}
