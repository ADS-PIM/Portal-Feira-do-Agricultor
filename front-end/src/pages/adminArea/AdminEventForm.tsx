import { useEffect, useRef, useState, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import { createEventImage, deleteEventImage, getEventImages, uploadEventBanner, type AdminEvent, type EventImage } from '../../services/eventService'
import { getEventImageProps } from '../../services/eventImageUrl'
import { getUserFacingError } from '../../services/errors'
import { savePendingEventPhotos, validateEventImage, type PendingEventPhoto } from './eventGallery'
import { STATE_LABELS } from './eventFormLabels'
import { EVENT_IMAGE_MAX_BYTES, EVENT_IMAGE_MAX_MB } from '../../utils/eventImageUpload'
import ImageCropDialog from '../../components/ImageEditor/ImageCropDialog'
import type { AdjustedImage, ImageAdjustment } from '../../utils/imageCrop'
import EventLocationPicker from '../../components/Location/EventLocationPicker'
import './AdminEventForm.css'
import '../../components/Calendar/CalendarStatus.css'

export type EventFormValues = {
    title: string
    description: string
    date: string
    startAt: string
    endAt: string
    localAddress: string
    latitude: number | null
    longitude: number | null
    state: AdminEvent['state']
    bannerImage: string | null
}

export type EventSaveSession = {
    eventId: string | null
    banner?: { file: File; url: string }
}

export default function AdminEventForm({ initialValues, eventId, isSaving, error, onClose, onSubmit }: {
    initialValues: EventFormValues
    eventId: string | null
    isSaving: boolean
    error: string | null
    onClose: () => void
    onSubmit: (values: EventFormValues, banner: File | null, session: EventSaveSession, saveGallery: (id: string) => Promise<void>) => Promise<void>
}) {
    const [values, setValues] = useState(initialValues)
    const [bannerFile, setBannerFile] = useState<File | null>(null)
    const [bannerPreview, setBannerPreview] = useState<string | null>(null)
    const [preparedBanner, setPreparedBanner] = useState<AdjustedImage | null>(null)
    const [editingImage, setEditingImage] = useState<{
        target: 'banner' | 'gallery'; source: File; photoId?: string; adjustment?: ImageAdjustment
    } | null>(null)
    const [fileError, setFileError] = useState<string | null>(null)
    const [photos, setPhotos] = useState<PendingEventPhoto[]>([])
    const [existingPhotos, setExistingPhotos] = useState<EventImage[]>([])
    const [galleryLoading, setGalleryLoading] = useState(Boolean(eventId))
    const [galleryError, setGalleryError] = useState<string | null>(null)
    const [reloadGallery, setReloadGallery] = useState(0)
    const [progress, setProgress] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)
    const [photoToDelete, setPhotoToDelete] = useState<string | null>(null)
    const [isDeletingPhoto, setIsDeletingPhoto] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [galleryMessage, setGalleryMessage] = useState('')
    const isBusy = isSaving || isDeletingPhoto
    const session = useRef<EventSaveSession>({ eventId })
    const previews = useRef(new Set<string>())
    const dialog = useRef<HTMLElement>(null)
    const bannerInput = useRef<HTMLInputElement>(null)
    const galleryInput = useRef<HTMLInputElement>(null)
    const addPhotosButton = useRef<HTMLButtonElement>(null)
    const errorBox = useRef<HTMLParagraphElement>(null)
    const photoDeleteDialog = useRef<HTMLDialogElement>(null)
    const keepPhotoButton = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        const popup = photoDeleteDialog.current
        if (photoToDelete) {
            popup?.showModal()
            keepPhotoButton.current?.focus()
        } else {
            popup?.close()
        }
    }, [photoToDelete])

    useEffect(() => {
        const urls = previews.current
        const previousFocus = document.activeElement as HTMLElement | null
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        dialog.current?.focus()
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url))
            document.body.style.overflow = previousOverflow
            previousFocus?.focus()
        }
    }, [])

    useEffect(() => {
        if (!eventId) return
        const controller = new AbortController()
        void getEventImages(eventId, controller.signal).then(images => {
            if (!controller.signal.aborted) setExistingPhotos((images ?? []).filter(image =>
                image.description.trim().toLocaleLowerCase('pt-BR') !== 'banner do evento'))
        }).catch(requestError => {
            if (!controller.signal.aborted) setGalleryError(getUserFacingError(requestError, 'Não foi possível carregar a galeria.'))
        }).finally(() => {
            if (!controller.signal.aborted) setGalleryLoading(false)
        })
        return () => controller.abort()
    }, [eventId, reloadGallery])

    useEffect(() => {
        if (error || validationError) errorBox.current?.focus()
    }, [error, validationError])

    useEffect(() => {
        if (galleryMessage) addPhotosButton.current?.focus()
    }, [galleryMessage])

    const makePreview = (file: File) => {
        const url = URL.createObjectURL(file)
        previews.current.add(url)
        return url
    }
    const revokePreview = (url: string | null) => {
        if (!url) return
        URL.revokeObjectURL(url)
        previews.current.delete(url)
    }
    const chooseBanner = (file?: File) => {
        if (!file) return
        const message = validateEventImage(file)
        setFileError(message)
        if (message) return
        setEditingImage({ target: 'banner', source: file })
    }
    const choosePhotos = (files: FileList | null) => {
        if (!files?.length) return
        const additions: PendingEventPhoto[] = []
        const rejected: string[] = []
        for (const file of Array.from(files)) {
            const message = validateEventImage(file)
            if (message) { rejected.push(`${file.name}: ${message}`); continue }
            additions.push({ id: crypto.randomUUID(), file, preview: makePreview(file), description: '' })
        }
        setFileError(rejected.length ? rejected.join(' ') : null)
        setPhotos(current => [...current, ...additions])
    }
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (isBusy || photoToDelete || editingImage) return
        if (!values.title.trim() || !values.localAddress.trim()) {
            setValidationError('Preencha o nome e o local do evento.'); return
        }
        if (values.startAt >= values.endAt) {
            setValidationError('O horário de término deve ser posterior ao horário de início.'); return
        }
        setValidationError(null)
        setProgress('Salvando evento...')
        await onSubmit({ ...values, title: values.title.trim(), localAddress: values.localAddress.trim() }, bannerFile, session.current, async id => {
            await savePendingEventPhotos(id, photos, uploadEventBanner, createEventImage, (photo, index) => {
                setProgress(`Salvando foto ${index + 1} de ${photos.length}: ${photo.file.name}`)
                setPhotos(current => [...current])
            })
        })
        setProgress('')
    }
    const cover = bannerPreview ?? values.bannerImage

    const applyImage = (result: AdjustedImage) => {
        if (editingImage?.target === 'banner') {
            revokePreview(bannerPreview)
            setBannerFile(result.file)
            setBannerPreview(makePreview(result.file))
            setPreparedBanner(result)
            // A different File must be uploaded even after a previous save failed.
            session.current.banner = undefined
        } else if (editingImage?.target === 'gallery') {
            const photo = photos.find(item => item.id === editingImage.photoId)
            if (photo && !photo.saved) {
                revokePreview(photo.preview)
                const preview = makePreview(result.file)
                setPhotos(current => current.map(item => item.id === photo.id ? {
                    ...item, file: result.file, source: result.source, adjustment: result.adjustment,
                    preview, uploadedUrl: undefined,
                } : item))
            }
        }
        setEditingImage(null)
        setFileError(null)
    }

    const removePhoto = async (id: string) => {
        if (isBusy) return
        setIsDeletingPhoto(true)
        setDeleteError(null)
        setGalleryMessage('')
        try {
            await deleteEventImage(id)
            setExistingPhotos(current => current.filter(photo => photo.id !== id))
            setPhotoToDelete(null)
            setGalleryMessage('Foto excluída da galeria.')
        } catch (requestError) {
            setDeleteError(getUserFacingError(requestError, 'Não foi possível excluir a foto. Tente novamente.'))
        } finally {
            setIsDeletingPhoto(false)
        }
    }

    return (
        <div className="admin-event-modal-backdrop" role="presentation" onMouseDown={event => {
            if (event.target === event.currentTarget && !isBusy && !editingImage) onClose()
        }}>
            <section ref={dialog} tabIndex={-1} className="admin-event-modal admin-event-editor" role="dialog"
                aria-modal="true" aria-labelledby="admin-event-form-title" onKeyDown={event => {
                    if (event.key === 'Escape' && !isBusy && !editingImage) {
                        event.stopPropagation()
                        if (photoToDelete) { setPhotoToDelete(null); setDeleteError(null) }
                        else onClose()
                    }
                    if (event.key !== 'Tab') return
                    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
                        'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), a[href], [tabindex="0"]',
                    )).filter(element => element.getClientRects().length > 0 && !element.closest('fieldset:disabled'))
                    const first = focusable[0], last = focusable.at(-1)
                    if (!first) { event.preventDefault(); return }
                    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
                        event.preventDefault(); last?.focus()
                    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
                        event.preventDefault(); first.focus()
                    }
                }}>
                <header className="admin-event-modal-header">
                    <div>
                        <h2 id="admin-event-form-title">{eventId ? 'Editar evento' : 'Criar evento'}</h2>
                        <p>Organize as informações e as fotos que aparecerão na página do evento.</p>
                    </div>
                    <button type="button" className="admin-event-modal-close" aria-label="Fechar formulário" title="Fechar" disabled={isBusy} onClick={onClose}><Icon name="close" /></button>
                </header>
                <form className="admin-event-form" onSubmit={event => void submit(event)} aria-busy={isBusy}>
                    <div className="admin-event-editor-body">
                        {(error || validationError) && <p ref={errorBox} tabIndex={-1} className="admin-events-alert is-error" role="alert">{validationError || error}</p>}
                        <fieldset className="admin-event-editor-fields" disabled={isBusy}>
                            <legend className="admin-event-visually-hidden">Dados do evento</legend>
                            <div className="admin-event-editor-columns">
                                <div className="admin-event-editor-column">
                                    <section className="admin-event-editor-section" aria-labelledby="event-info-title">
                                        <h3 id="event-info-title">Informações do evento</h3>
                                        <label>Nome do evento <span className="admin-event-required">Obrigatório</span>
                                            <input required value={values.title} placeholder="Ex.: Feira de produtores da região"
                                                onChange={event => setValues(current => ({ ...current, title: event.target.value }))} />
                                        </label>
                                        <label>Descrição <span className="admin-event-optional">Opcional</span>
                                            <textarea rows={3} value={values.description} placeholder="Conte o que os visitantes vão encontrar: produtos, atrações e outras informações."
                                                onChange={event => setValues(current => ({ ...current, description: event.target.value }))} />
                                        </label>
                                    </section>
                                    <section className="admin-event-editor-section" aria-labelledby="event-date-title">
                                        <h3 id="event-date-title">Data e local</h3>
                                        <div className="admin-event-schedule-grid">
                                            <label>Data do evento<input required type="date" value={values.date} onChange={event => setValues(current => ({ ...current, date: event.target.value }))} /></label>
                                            <label>Início<input required type="time" value={values.startAt} onChange={event => setValues(current => ({ ...current, startAt: event.target.value }))} /></label>
                                            <label>Término<input required type="time" value={values.endAt} onChange={event => setValues(current => ({ ...current, endAt: event.target.value }))} /></label>
                                        </div>
                                        <EventLocationPicker address={values.localAddress} latitude={values.latitude} longitude={values.longitude}
                                            disabled={isBusy} onChange={location => setValues(current => ({ ...current,
                                                localAddress: location.address, latitude: location.latitude, longitude: location.longitude }))} />
                                    </section>
                                </div>
                                <div className="admin-event-editor-column admin-event-media-column">
                                    <section className="admin-event-editor-section" aria-labelledby="event-cover-title">
                                        <div><h3 id="event-cover-title">Imagem de capa <span>Opcional</span></h3><p className="admin-event-help">Imagem principal exibida na divulgação do evento.</p></div>
                                        <div className={`admin-event-cover${cover ? ' has-image' : ''}`}>
                                            {cover ? <img {...getEventImageProps(cover, '(max-width: 680px) 90vw, 560px')} alt="Prévia da capa do evento" /> : <div className="admin-event-cover-empty"><Icon name="image" /><span>Adicione uma capa ao evento</span></div>}
                                            {cover && <button type="button" className="admin-event-photo-remove" title="Remover capa" aria-label="Remover imagem de capa" onClick={() => {
                                                revokePreview(bannerPreview); setBannerFile(null); setBannerPreview(null)
                                                setPreparedBanner(null); session.current.banner = undefined
                                                setValues(current => ({ ...current, bannerImage: null }))
                                            }}><Icon name="close" /></button>}
                                        </div>
                                        <div className="admin-event-upload-row">
                                            <button type="button" className="admin-event-upload-button" onClick={() => bannerInput.current?.click()}><Icon name="image" />{cover ? 'Trocar capa' : 'Selecionar capa'}</button>
                                            {preparedBanner && <button type="button" className="admin-event-upload-button" onClick={() => setEditingImage({
                                                target: 'banner', source: preparedBanner.source, adjustment: preparedBanner.adjustment,
                                            })}><Icon name="edit" />Ajustar capa</button>}
                                            <small>JPG ou PNG · até {EVENT_IMAGE_MAX_MB} MB</small>
                                        </div>
                                        <input ref={bannerInput} hidden type="file" accept="image/jpeg,image/png" aria-label="Selecionar imagem de capa" onChange={event => { chooseBanner(event.target.files?.[0]); event.currentTarget.value = '' }} />
                                    </section>
                                    <section className="admin-event-editor-section" aria-labelledby="event-gallery-title">
                                        <div className="admin-event-gallery-heading"><h3 id="event-gallery-title">Galeria de fotos <span>{existingPhotos.length + photos.length}</span></h3>
                                            <button ref={addPhotosButton} type="button" className="admin-event-upload-button" onClick={() => galleryInput.current?.click()}><Icon name="plus" />Adicionar fotos</button>
                                        </div>
                                        <p className="admin-event-help">Selecione várias fotos. JPG ou PNG, até {EVENT_IMAGE_MAX_MB} MB por imagem. As novas fotos serão publicadas ao salvar o evento.</p>
                                        <input ref={galleryInput} hidden type="file" multiple accept="image/jpeg,image/png" aria-label="Selecionar fotos para a galeria" onChange={event => { choosePhotos(event.target.files); event.currentTarget.value = '' }} />
                                        {galleryLoading && <p className="admin-event-help" role="status">Carregando fotos...</p>}
                                        {galleryMessage && <p className="admin-event-help" role="status">{galleryMessage}</p>}
                                        {galleryError && <div className="admin-event-gallery-error" role="alert"><p>{galleryError}</p><button type="button" className="admin-event-upload-button" onClick={() => { setGalleryError(null); setGalleryLoading(true); setReloadGallery(current => current + 1) }}>Tentar novamente</button></div>}
                                        {!galleryLoading && !galleryError && !existingPhotos.length && !photos.length && <div className="admin-event-gallery-empty"><Icon name="image" /><p>Ainda não há fotos na galeria.</p></div>}
                                        {(existingPhotos.length > 0 || photos.length > 0) && <div className="admin-event-gallery-grid">
                                            {existingPhotos.map((photo, index) => <figure key={photo.id} className="admin-event-photo">
                                                <img {...getEventImageProps(photo.imageURL, '(max-width: 680px) 45vw, 240px', 320)} loading="lazy" alt={photo.description || 'Foto do evento'} />
                                                <button type="button" className="admin-event-photo-remove is-delete" title="Excluir foto da galeria"
                                                    aria-label={`Excluir foto ${index + 1}: ${photo.description || 'Foto do evento'}`}
                                                    aria-expanded={photoToDelete === photo.id}
                                                    onClick={() => { setPhotoToDelete(photo.id); setDeleteError(null); setGalleryMessage('') }}>
                                                    <Icon name="trash" />
                                                </button>
                                                <figcaption>{photo.description || 'Foto do evento'}<small>Publicada</small></figcaption>
                                            </figure>)}
                                            {photos.map((photo, index) => <figure key={photo.id} className="admin-event-photo">
                                                <img src={photo.preview} alt={photo.description || `Nova foto ${index + 1}`} />
                                                {!photo.saved && <button type="button" className="admin-event-photo-remove" aria-label={`Remover foto ${index + 1}: ${photo.file.name}`} title="Remover foto selecionada" onClick={() => { revokePreview(photo.preview); setPhotos(current => current.filter(item => item.id !== photo.id)) }}><Icon name="close" /></button>}
                                                <figcaption>
                                                    {!photo.saved && <button type="button" className="admin-event-upload-button admin-event-photo-adjust"
                                                        aria-label={`Ajustar foto ${index + 1}: ${photo.file.name}`} onClick={() => setEditingImage({
                                                            target: 'gallery', photoId: photo.id, source: photo.source ?? photo.file, adjustment: photo.adjustment,
                                                        })}><Icon name="edit" />Prévia e ajuste</button>}
                                                    <label>Legenda (opcional)<input value={photo.description} maxLength={255} disabled={photo.saved} placeholder="Descreva esta foto" onChange={event => setPhotos(current => current.map(item => item.id === photo.id ? { ...item, description: event.target.value } : item))} /></label>
                                                    <small>{photo.saved ? 'Publicada' : 'Nova foto · aguardando salvar'}</small>
                                                </figcaption>
                                            </figure>)}
                                        </div>}
                                    </section>
                                    <fieldset className="admin-event-status-field">
                                        <legend>Status do evento</legend>
                                        <div className="admin-event-status-options">
                                            {(Object.keys(STATE_LABELS) as AdminEvent['state'][]).map(state => (
                                                <button type="button" key={state} aria-pressed={values.state === state}
                                                    className={`admin-event-status-option calendar-status--${state}${values.state === state ? ' is-selected' : ''}`}
                                                    onClick={() => setValues(current => ({ ...current, state }))}>
                                                    <span aria-hidden="true" />{STATE_LABELS[state]}
                                                </button>
                                            ))}
                                        </div>
                                    </fieldset>
                                    {fileError && <div className="admin-event-gallery-error" role="alert"><p>{fileError} Os arquivos inválidos não foram adicionados.</p><button type="button" className="admin-event-upload-button" onClick={() => setFileError(null)}>Entendi</button></div>}
                                </div>
                            </div>
                        </fieldset>
                    </div>
                    <footer className="admin-event-form-actions">
                        <p role="status" aria-live="polite">{isSaving ? progress : 'Ao salvar, as informações ficam disponíveis no mural público.'}</p>
                        <div><button type="button" className="admin-event-button is-secondary" disabled={isBusy} onClick={onClose}>Cancelar</button>
                            <button type="submit" className="admin-event-button is-primary" disabled={isBusy || Boolean(photoToDelete) || Boolean(editingImage)}>{isSaving ? 'Salvando...' : eventId ? 'Salvar alterações' : 'Criar evento'}</button></div>
                    </footer>
                </form>
            </section>
            <dialog ref={photoDeleteDialog} className="admin-event-photo-delete-popup" role="alertdialog"
                aria-labelledby="photo-delete-title" aria-describedby="photo-delete-description" aria-busy={isDeletingPhoto}
                onCancel={event => {
                    event.preventDefault()
                    if (!isDeletingPhoto) { setPhotoToDelete(null); setDeleteError(null) }
                }}
                onClick={event => {
                    if (event.target === event.currentTarget && !isDeletingPhoto) {
                        setPhotoToDelete(null); setDeleteError(null)
                    }
                }}>
                <div className="admin-event-photo-confirm">
                    <span className="admin-event-photo-delete-icon" aria-hidden="true"><Icon name="trash" /></span>
                    <h2 id="photo-delete-title">Excluir foto da galeria?</h2>
                    <p id="photo-delete-description">A remoção é imediata, mesmo se você cancelar a edição do evento.</p>
                    {deleteError && <p className="admin-event-photo-delete-error" role="alert">{deleteError}</p>}
                    <div>
                        <button ref={keepPhotoButton} type="button" className="admin-event-upload-button" disabled={isDeletingPhoto}
                            onClick={() => { setPhotoToDelete(null); setDeleteError(null) }}>Manter foto</button>
                        <button type="button" className="admin-event-upload-button is-danger" disabled={isDeletingPhoto}
                            onClick={() => { if (photoToDelete) void removePhoto(photoToDelete) }}>{isDeletingPhoto ? 'Excluindo...' : 'Excluir foto'}</button>
                    </div>
                </div>
            </dialog>
            {editingImage && <ImageCropDialog source={editingImage.source} variant={editingImage.target}
                maxBytes={EVENT_IMAGE_MAX_BYTES} initialAdjustment={editingImage.adjustment}
                onCancel={() => setEditingImage(null)} onApply={applyImage} />}
        </div>
    )
}
