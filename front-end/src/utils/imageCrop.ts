export type ImageAdjustment = {
    zoom: number
    x: number
    y: number
    aspect: number | null
}

export type AdjustedImage = {
    source: File
    file: File
    adjustment: ImageAdjustment
}

export const clampPosition = (value: number) => Math.max(0, Math.min(1, value))

// Both the preview and export use this rectangle in source-image pixels.
export function getImageCrop(width: number, height: number, adjustment: ImageAdjustment) {
    const aspect = adjustment.aspect ?? width / height
    const zoom = Math.max(1, Math.min(3, adjustment.zoom))
    const cropWidth = Math.min(width, height * aspect) / zoom
    const cropHeight = cropWidth / aspect
    return {
        x: (width - cropWidth) * clampPosition(adjustment.x),
        y: (height - cropHeight) * clampPosition(adjustment.y),
        width: cropWidth,
        height: cropHeight,
    }
}

export async function exportImageCrop(
    image: HTMLImageElement,
    source: File,
    adjustment: ImageAdjustment,
    maxBytes: number,
    maxDimension: number,
): Promise<File> {
    const crop = getImageCrop(image.naturalWidth, image.naturalHeight, adjustment)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.')
    let scale = Math.min(1, maxDimension / Math.max(crop.width, crop.height))
    try {
        for (let attempt = 0; attempt < 5; attempt++) {
            canvas.width = Math.max(1, Math.round(crop.width * scale))
            canvas.height = Math.max(1, Math.round(crop.height * scale))
            context.imageSmoothingEnabled = true
            context.imageSmoothingQuality = 'high'
            context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(result => result ? resolve(result) : reject(new Error('Não foi possível gerar a imagem.')), source.type, 0.94)
            })
            if (blob.size > 0 && blob.size <= maxBytes) {
                const extension = blob.type === 'image/png' ? 'png' : 'jpg'
                return new File([blob], `${source.name.replace(/\.[^.]+$/, '')}-ajustada.${extension}`, { type: blob.type })
            }
            scale *= Math.min(0.8, Math.sqrt(maxBytes / blob.size) * 0.95)
        }
        throw new Error('A imagem ajustada excede o limite de tamanho. Selecione uma imagem menor.')
    } finally {
        canvas.width = 0
        canvas.height = 0
    }
}
