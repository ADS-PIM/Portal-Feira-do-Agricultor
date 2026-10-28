export const EVENT_IMAGE_MAX_MB = 10
export const EVENT_IMAGE_MAX_BYTES = EVENT_IMAGE_MAX_MB * 1024 * 1024
export const EVENT_IMAGE_TOO_LARGE = `Cada imagem deve ter no máximo ${EVENT_IMAGE_MAX_MB} MB.`

export function validateEventImage(file: Pick<File, 'type' | 'size'>): string | null {
    if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Selecione uma imagem JPG ou PNG.'
    if (file.size === 0) return 'O arquivo está vazio. Selecione outra imagem.'
    if (file.size > EVENT_IMAGE_MAX_BYTES) return EVENT_IMAGE_TOO_LARGE
    return null
}
