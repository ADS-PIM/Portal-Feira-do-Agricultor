import type { ImageAdjustment } from '../../utils/imageCrop'

export { validateEventImage } from '../../utils/eventImageUpload'

export type PendingEventPhoto = {
    id: string
    file: File
    preview: string
    description: string
    source?: File
    adjustment?: ImageAdjustment
    uploadedUrl?: string
    saved?: boolean
}

// Keep confirmed uploads and links when a later photo fails, so a retry resumes
// the same queue without uploading or attaching successful photos again.
export async function savePendingEventPhotos(
    eventId: string,
    photos: PendingEventPhoto[],
    upload: (file: File) => Promise<{ url: string }>,
    attach: (eventId: string, url: string, description: string) => Promise<unknown>,
    onProgress: (photo: PendingEventPhoto, index: number) => void,
): Promise<void> {
    for (const [index, photo] of photos.entries()) {
        if (photo.saved) continue
        onProgress(photo, index)
        photo.uploadedUrl ??= (await upload(photo.file)).url
        await attach(eventId, photo.uploadedUrl, photo.description.trim())
        photo.saved = true
        onProgress(photo, index)
    }
}
