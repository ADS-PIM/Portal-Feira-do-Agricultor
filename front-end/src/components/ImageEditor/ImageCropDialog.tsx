import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { clampPosition, exportImageCrop, getImageCrop, type AdjustedImage, type ImageAdjustment } from '../../utils/imageCrop'
import './ImageCropDialog.css'

type Props = {
    source: File
    variant: 'profile' | 'banner' | 'gallery'
    initialAdjustment?: ImageAdjustment
    maxBytes: number
    onApply: (result: AdjustedImage) => void
    onCancel: () => void
}

export default function ImageCropDialog({ source, variant, initialAdjustment, maxBytes, onApply, onCancel }: Props) {
    const defaultAspect = variant === 'profile' ? 1 : variant === 'banner' ? 16 / 9 : null
    const [adjustment, setAdjustment] = useState<ImageAdjustment>(initialAdjustment ?? { zoom: 1, x: 0.5, y: 0.5, aspect: defaultAspect })
    const [loaded, setLoaded] = useState<{ image: HTMLImageElement; url: string } | null>(null)
    const [error, setError] = useState('')
    const [exporting, setExporting] = useState(false)
    const popup = useRef<HTMLDialogElement>(null)
    const active = useRef(false)
    const applying = useRef(false)
    const drag = useRef<{ id: number; x: number; y: number; adjustment: ImageAdjustment } | null>(null)
    const titleId = useId()
    const hintId = useId()

    useEffect(() => {
        active.current = true
        const previousFocus = document.activeElement as HTMLElement | null
        const previousOverflow = document.body.style.overflow
        const dialog = popup.current
        document.body.style.overflow = 'hidden'
        dialog?.showModal()
        return () => {
            active.current = false
            dialog?.close()
            document.body.style.overflow = previousOverflow
            if (previousFocus?.isConnected) previousFocus.focus()
        }
    }, [])

    useEffect(() => {
        const url = URL.createObjectURL(source)
        const image = new Image()
        let cancelled = false
        image.onload = () => {
            if (!cancelled) setLoaded({ image, url })
        }
        image.onerror = () => {
            if (!cancelled) setError('Não foi possível abrir esta imagem. Selecione outro arquivo JPG ou PNG.')
        }
        image.src = url
        return () => {
            cancelled = true
            image.onload = null
            image.onerror = null
            URL.revokeObjectURL(url)
        }
    }, [source])

    const width = loaded?.image.naturalWidth ?? 1
    const height = loaded?.image.naturalHeight ?? 1
    const crop = getImageCrop(width, height, adjustment)
    const aspect = crop.width / crop.height
    const canMoveX = width - crop.width > 0.01
    const canMoveY = height - crop.height > 0.01
    const title = variant === 'profile' ? 'Ajustar foto de perfil' : variant === 'banner' ? 'Ajustar capa do evento' : 'Ajustar foto da galeria'

    const moveImage = (event: PointerEvent<HTMLDivElement>) => {
        const start = drag.current
        if (!start || start.id !== event.pointerId || exporting) return
        const bounds = event.currentTarget.getBoundingClientRect()
        setAdjustment({ ...start.adjustment,
            x: canMoveX ? clampPosition(start.adjustment.x - (event.clientX - start.x) * crop.width / bounds.width / (width - crop.width)) : 0.5,
            y: canMoveY ? clampPosition(start.adjustment.y - (event.clientY - start.y) * crop.height / bounds.height / (height - crop.height)) : 0.5,
        })
    }

    const apply = async () => {
        if (!loaded || applying.current) return
        applying.current = true
        setExporting(true)
        setError('')
        try {
            const file = await exportImageCrop(loaded.image, source, adjustment, maxBytes, variant === 'profile' ? 512 : 4096)
            if (active.current) onApply({ source, file, adjustment })
        } catch (failure) {
            if (active.current) setError(failure instanceof Error ? failure.message : 'Não foi possível ajustar a imagem. Tente novamente.')
        } finally {
            applying.current = false
            if (active.current) setExporting(false)
        }
    }

    return createPortal(<dialog ref={popup} className="image-crop-dialog" aria-labelledby={titleId} aria-describedby={hintId}
        aria-busy={exporting} onCancel={event => { event.preventDefault(); if (!applying.current) onCancel() }}
        onKeyDown={event => event.stopPropagation()}>
        <header className="image-crop-header">
            <div><h2 id={titleId}>{title}</h2><p id={hintId}>Arraste a imagem ou use os controles para ajustar o enquadramento.</p></div>
            <button type="button" className="image-crop-close" aria-label="Fechar ajuste de imagem" disabled={exporting} onClick={onCancel}>×</button>
        </header>
        <div className="image-crop-body">
            <div className="image-crop-stage">
                {!loaded && !error && <p role="status">Carregando imagem...</p>}
                {loaded && <div className={`image-crop-viewport${variant === 'profile' ? ' is-circle' : ''}`}
                    style={{ aspectRatio: aspect, width: `min(100%, ${Math.min(340, 280 * aspect)}px, calc(var(--image-crop-height) * ${aspect}))` }}
                    role="img" aria-label="Prévia do enquadramento" onPointerDown={event => {
                        if (exporting || !event.isPrimary || event.button !== 0) return
                        event.currentTarget.setPointerCapture(event.pointerId)
                        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, adjustment }
                    }} onPointerMove={moveImage} onPointerUp={event => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
                        drag.current = null
                    }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}>
                    <img src={loaded.url} alt="" draggable={false} style={{
                        width: `${width / crop.width * 100}%`, height: `${height / crop.height * 100}%`,
                        left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%`,
                    }} />
                    <span className="image-crop-grid" aria-hidden="true" />
                </div>}
            </div>
            <fieldset className="image-crop-controls" disabled={!loaded || exporting}>
                <legend className="image-crop-sr-only">Controles de enquadramento</legend>
                {variant !== 'profile' && <label className="image-crop-format">Formato<select value={adjustment.aspect ?? 'original'} onChange={event => {
                    setAdjustment({ zoom: 1, x: 0.5, y: 0.5, aspect: event.target.value === 'original' ? null : Number(event.target.value) })
                }}><option value={16 / 9}>Horizontal (16:9)</option><option value={1}>Quadrado (1:1)</option><option value="original">Proporção original</option></select></label>}
                <label htmlFor={`${titleId}-zoom`}><span>Zoom <output htmlFor={`${titleId}-zoom`}>{Math.round(adjustment.zoom * 100)}%</output></span>
                    <input id={`${titleId}-zoom`} type="range" min="1" max="3" step="0.01" value={adjustment.zoom} onChange={event => setAdjustment(current => ({ ...current, zoom: Number(event.target.value) }))} /></label>
                <div className="image-crop-position">
                    <label><span>Posição horizontal</span><input type="range" min="0" max="1" step="0.01" value={adjustment.x} disabled={!canMoveX || !loaded || exporting}
                        onChange={event => setAdjustment(current => ({ ...current, x: Number(event.target.value) }))} /></label>
                    <label><span>Posição vertical</span><input type="range" min="0" max="1" step="0.01" value={adjustment.y} disabled={!canMoveY || !loaded || exporting}
                        onChange={event => setAdjustment(current => ({ ...current, y: Number(event.target.value) }))} /></label>
                </div>
                <button type="button" className="image-crop-reset" onClick={() => setAdjustment({ zoom: 1, x: 0.5, y: 0.5, aspect: defaultAspect })}>Restaurar enquadramento</button>
            </fieldset>
            {error && <p className="image-crop-error" role="alert">{error}</p>}
        </div>
        <footer className="image-crop-footer">
            <p>A imagem será enviada ao {variant === 'profile' ? 'clicar em “Salvar foto”' : 'salvar o evento'}.</p>
            <div><button type="button" disabled={exporting} onClick={onCancel}>Cancelar</button>
                <button type="button" className="is-primary" disabled={!loaded || exporting} onClick={() => void apply()}>{exporting ? 'Preparando...' : 'Aplicar ajuste'}</button></div>
        </footer>
    </dialog>, document.body)
}
