import { useId, useRef, useState, type DragEvent, type Ref } from 'react'
import Icon from '../Icon'
import './ImageDropzone.css'

type Props = {
    title: string
    hint: string
    disabled?: boolean
    multiple?: boolean
    buttonRef?: Ref<HTMLButtonElement>
    onBrowse: () => void
    onFiles: (files: File[]) => void
}

export default function ImageDropzone({ title, hint, disabled = false, multiple = false, buttonRef, onBrowse, onFiles }: Props) {
    const [dragging, setDragging] = useState(false)
    const dragDepth = useRef(0)
    const hintId = useId()
    const hasFiles = (event: DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.types).includes('Files')

    const enter = (event: DragEvent<HTMLDivElement>) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.stopPropagation()
        if (disabled) return
        dragDepth.current += 1
        setDragging(true)
    }

    const leave = (event: DragEvent<HTMLDivElement>) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.stopPropagation()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
    }

    const drop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        dragDepth.current = 0
        setDragging(false)
        if (disabled) return
        const files = Array.from(event.dataTransfer.files)
        if (files.length) onFiles(multiple ? files : files.slice(0, 1))
    }

    return (
        <div className={`image-dropzone${dragging && !disabled ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
            onDragEnterCapture={enter} onDragLeaveCapture={leave}
            onDragOverCapture={event => {
                if (!hasFiles(event)) return
                event.preventDefault()
                event.stopPropagation()
                event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
            }} onDropCapture={drop}>
            <button ref={buttonRef} type="button" className="image-dropzone-trigger" disabled={disabled}
                aria-label={title} aria-describedby={hintId} onClick={onBrowse}>
                <span className="image-dropzone-icon"><Icon name="image" /></span>
                <span className="image-dropzone-copy">
                    <strong>{dragging && !disabled ? 'Solte aqui para anexar' : title}</strong>
                    <span>ou <span className="image-dropzone-link">clique para selecionar</span></span>
                    <small id={hintId}>{hint}</small>
                </span>
            </button>
        </div>
    )
}
