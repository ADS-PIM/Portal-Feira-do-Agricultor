import { apiFetch } from './api'

export interface BusinessInfo {
    id: string
    instagramAccount: string | null
    whatsappNumber: string | null
    businessEmail: string | null
    businessHours: string | null
    updatedAt: string
}

interface BusinessInfoResponse {
    businessInfo: BusinessInfo | null
}

export async function getBusinessInfo(signal?: AbortSignal): Promise<BusinessInfo | null> {
    const response = await apiFetch<BusinessInfoResponse>('business-info', { signal })
    return response.businessInfo
}
