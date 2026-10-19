export type PendingEventPhoto = {
    id: string
    file: File
    preview: string
    description: string
    uploadedUrl?: string
    saved?: boolean
}

export function validateEventImage(file: Pick<File, 'type' | 'size'>): string | null {
    if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Selecione uma imagem JPG ou PNG.'
    if (file.size === 0) return 'O arquivo está vazio. Selecione outra imagem.'
    if (file.size > 4 * 1024 * 1024) return 'Cada imagem deve ter no máximo 4 MB.'
    return null
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
