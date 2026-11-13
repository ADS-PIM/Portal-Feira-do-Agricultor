import { useRef, useState } from 'react'
import { apiFetch } from '../../services/api'
import { ApiRequestError } from '../../services/errors'
import Icon from '../../components/Icon'
import ImageDropzone from '../../components/ImageUpload/ImageDropzone'
import ImageCropDialog from '../../components/ImageEditor/ImageCropDialog'
import type { AdjustedImage } from '../../utils/imageCrop'

export default function ProfilePictureUpload({ disabled, currentPhoto, onBusyChange, onSaved }: {
    currentPhoto?: string | null
    disabled: boolean
    onBusyChange: (busy: boolean) => void
    onSaved: (url: string | null) => void
}) {
    const [prepared, setPrepared] = useState<AdjustedImage | null>(null)
    const [editingImage, setEditingImage] = useState<{ source: File; previous?: AdjustedImage } | null>(null)
    const file = prepared?.file ?? null
    const [uploading, setUploading] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const input = useRef<HTMLInputElement>(null)

    const choosePhoto = (selected?: File) => {
        if (!selected || disabled || uploading || removing || editingImage) return
        setError('')
        setMessage('')
        if (!['image/jpeg', 'image/png'].includes(selected.type) || selected.size === 0 || selected.size > 4 * 1024 * 1024) {
            setError('Selecione uma imagem JPG ou PNG de até 4 MB.')
            return
        }
        setEditingImage({ source: selected })
    }

    async function removePhoto() {
        setRemoving(true)
        onBusyChange(true)
        setError('')
        setMessage('')
        try {
            const result = await apiFetch<{ cleanupPending: boolean }>('admin/me/profile-picture', { method: 'DELETE' })
            onSaved(null)
            setPrepared(null)
            if (input.current) input.current.value = ''
            setMessage(result.cleanupPending
                ? 'Foto removida do perfil. Não foi possível excluir o arquivo do armazenamento.'
                : 'Foto de perfil removida com sucesso.')
        } catch {
            setError('Não foi possível remover a foto de perfil. Tente novamente.')
        } finally {
            setRemoving(false)
            onBusyChange(false)
        }
    }

    async function upload() {
        if (!file) return
        setUploading(true)
        onBusyChange(true)
        setError('')
        setMessage('')
        try {
            const result = await apiFetch<{ profile_picture: string; cleanupPending: boolean }>('admin/me/profile-picture', {
                method: 'POST', headers: { 'Content-Type': file.type }, body: file,
            })
            onSaved(result.profile_picture)
            setPrepared(null)
            if (input.current) input.current.value = ''
            setMessage(result.cleanupPending
                ? 'Foto atualizada. Não foi possível excluir o arquivo anterior do armazenamento.'
                : 'Foto de perfil atualizada com sucesso.')
        } catch (requestError) {
            setError(requestError instanceof ApiRequestError && requestError.status === 413
                ? 'A foto deve ter no máximo 4 MB. A foto anterior foi mantida.'
                : 'Não foi possível enviar a nova foto de perfil. A foto anterior foi mantida. Tente novamente.')
        } finally {
            setUploading(false)
            onBusyChange(false)
        }
    }

    return <div className="account-full-width account-photo-upload">
        <span className="account-photo-label" id="account-photo-label">Foto de perfil</span>
        <div className={`account-photo-card${file ? ' has-selection' : ''}`} role="group" aria-labelledby="account-photo-label" aria-busy={uploading || removing}>
            {file && <div className="account-photo-info">
                <strong title={file.name}>{file.name}</strong>
            </div>}
            <ImageDropzone title="Arraste sua foto de perfil aqui" hint="JPG ou PNG de até 4 MB"
                disabled={disabled || uploading || removing || Boolean(editingImage)}
                onBrowse={() => input.current?.click()} onFiles={files => choosePhoto(files[0])} />
            <input ref={input} hidden aria-label="Selecionar foto de perfil" id="account-photo" type="file" accept="image/jpeg,image/png" disabled={disabled}
                onChange={event => {
                    choosePhoto(event.target.files?.[0])
                    event.currentTarget.value = ''
                }} />
            {(prepared || currentPhoto) && <div className="account-photo-actions">
                <div className="account-photo-edit-actions">
                {prepared && <button type="button" className="account-button is-secondary" disabled={disabled}
                    title="Visualizar e ajustar o enquadramento da foto"
                    onClick={() => setEditingImage({ source: prepared.source, previous: prepared })}><Icon name="sliders" />Ajustar foto</button>}
                {currentPhoto && <button type="button" className="account-button is-secondary account-photo-remove" disabled={disabled} onClick={() => void removePhoto()}>
                    <Icon name="trash" />{removing ? 'Removendo...' : file ? 'Remover foto atual' : 'Remover foto'}
                </button>}
                </div>
                {file && <div className="account-photo-save-actions">
                    <button type="button" className="account-button is-secondary account-photo-cancel" disabled={disabled}
                        title="Descartar a nova foto e manter a foto atual"
                        onClick={() => { setPrepared(null); setError(''); setMessage('') }}><Icon name="close" />Cancelar</button>
                    <button type="button" className="account-button account-photo-save" disabled={disabled} onClick={() => void upload()}>
                        <Icon name="check" />{uploading ? 'Salvando...' : 'Salvar foto'}
                    </button>
                </div>}
            </div>}
        </div>
        {error && <p className="account-feedback is-error" role="alert">{error}</p>}
        {message && <p className="account-feedback" role="status">{message}</p>}
        {editingImage && <ImageCropDialog source={editingImage.source} variant="profile" maxBytes={4 * 1024 * 1024}
            initialAdjustment={editingImage.previous?.adjustment} onCancel={() => setEditingImage(null)}
            onApply={result => { setPrepared(result); setEditingImage(null); setError(''); setMessage('') }} />}
    </div>
}
