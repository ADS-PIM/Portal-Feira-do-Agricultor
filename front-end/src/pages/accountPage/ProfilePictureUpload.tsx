import { useRef, useState } from 'react'
import { apiFetch } from '../../services/api'
import { ApiRequestError } from '../../services/errors'
import Icon from '../../components/Icon'

export default function ProfilePictureUpload({ disabled, currentPhoto, onBusyChange, onSaved }: {
    currentPhoto?: string | null
    disabled: boolean
    onBusyChange: (busy: boolean) => void
    onSaved: (url: string | null) => void
}) {
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const input = useRef<HTMLInputElement>(null)

    async function removePhoto() {
        setRemoving(true)
        onBusyChange(true)
        setError('')
        setMessage('')
        try {
            const result = await apiFetch<{ cleanupPending: boolean }>('admin/me/profile-picture', { method: 'DELETE' })
            onSaved(null)
            setFile(null)
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
            setFile(null)
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
        <div className="account-photo-card" role="group" aria-labelledby="account-photo-label" aria-busy={uploading || removing}>
            <div className="account-photo-info">
                <strong title={file?.name}>{file ? file.name : 'Escolha sua foto de perfil'}</strong>
                <small id="account-photo-hint">JPG ou PNG de até 4 MB</small>
            </div>
        <input ref={input} hidden aria-label="Selecionar foto de perfil" id="account-photo" type="file" accept="image/jpeg,image/png" disabled={disabled}
            aria-describedby="account-photo-hint" onChange={event => {
                const selected = event.target.files?.[0] ?? null
                setError(''); setMessage(''); setFile(null)
                if (!selected) return
                if (!['image/jpeg', 'image/png'].includes(selected.type) || selected.size === 0 || selected.size > 4 * 1024 * 1024) {
                    setError('Selecione uma imagem JPG ou PNG de até 4 MB.')
                    event.target.value = ''
                    return
                }
                setFile(selected)
            }} />
            <div className="account-photo-actions">
                <button type="button" className="account-button is-secondary" disabled={disabled} onClick={() => input.current?.click()}>
                    <Icon name="image" />{file ? 'Trocar arquivo' : 'Selecionar foto'}
                </button>
                {file && <button type="button" className="account-button" disabled={disabled} onClick={() => void upload()}>
                    {uploading ? 'Enviando...' : 'Atualizar foto'}
                </button>}
                {currentPhoto && <button type="button" className="account-button is-secondary account-photo-remove" disabled={disabled} onClick={() => void removePhoto()}>
                    <Icon name="trash" />{removing ? 'Removendo...' : 'Remover foto'}
                </button>}
            </div>
        </div>
        {file && <small>A nova foto será salva ao clicar em “Atualizar foto”.</small>}
        {error && <p className="account-feedback is-error" role="alert">{error}</p>}
        {message && <p className="account-feedback" role="status">{message}</p>}
    </div>
}
