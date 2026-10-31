import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import { getCoordinates, type Coordinates } from '../../utils/eventLocation'
import { getLocationHistory, searchLocations, type EventLocation } from '../../services/locationService'
import { getUserFacingError } from '../../services/errors'
import './EventLocationPicker.css'

const LocationMap = lazy(() => import('./LocationMap'))
type LocationValue = { address: string; latitude: number | null; longitude: number | null }

function LocationResults({ mode, onSelect }: { mode: 'search' | 'history'; onSelect: (location: EventLocation) => void }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<EventLocation[] | null>(null)
    const [loading, setLoading] = useState(mode === 'history')
    const [error, setError] = useState('')
    const request = useRef<AbortController | null>(null)

    useEffect(() => {
        if (mode === 'history') {
            const controller = new AbortController()
            request.current = controller
            void getLocationHistory('', controller.signal).then(items => {
                if (!controller.signal.aborted) setResults(items)
            }).catch(() => {
                if (!controller.signal.aborted) setError('Não foi possível carregar o histórico. Tente novamente.')
            }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
        }
        return () => request.current?.abort()
    }, [mode])

    const search = async () => {
        if (loading) return
        if (mode === 'search' && query.trim().length < 3) { setError('Digite pelo menos 3 caracteres para pesquisar.'); return }
        request.current?.abort()
        const controller = new AbortController()
        request.current = controller
        setLoading(true); setError(''); setResults(null)
        try {
            const items = await (mode === 'history' ? getLocationHistory(query.trim(), controller.signal) : searchLocations(query.trim(), controller.signal))
            if (!controller.signal.aborted) setResults(items)
        } catch (failure) {
            if (!controller.signal.aborted) setError(getUserFacingError(failure, 'A pesquisa está indisponível. Selecione no mapa ou tente novamente.'))
        } finally { if (!controller.signal.aborted) setLoading(false) }
    }

    return <div className="event-location-results-panel">
        <label htmlFor="event-location-search">{mode === 'history' ? 'Pesquisar no histórico' : 'Pesquisar nome ou endereço'}</label>
        <div className="event-location-search-row">
            <input id="event-location-search" value={query} maxLength={200}
                placeholder={mode === 'history' ? 'Nome ou endereço já utilizado' : 'Ex.: Praça da Matriz, cidade e estado'}
                onChange={event => { request.current?.abort(); setLoading(false); setResults(null); setError(''); setQuery(event.target.value) }}
                onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search() } }} />
            <button type="button" className="location-button" disabled={loading} onClick={() => void search()}><Icon name="magnifyingGlass" />Buscar</button>
        </div>
        {mode === 'history' && <p className="location-help">Últimos 30 locais utilizados. Pesquise para encontrar os mais antigos. Novos locais entram aqui ao salvar o evento.</p>}
        {mode === 'search' && <p className="location-help">Inclua a cidade para encontrar o local com mais facilidade. Dados do <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>, pesquisa por Photon.</p>}
        {loading && <p className="location-help" role="status">{mode === 'history' ? 'Carregando locais...' : 'Pesquisando locais...'}</p>}
        {error && <p className="location-error" role="alert">{error}</p>}
        {results?.length === 0 && <p className="location-help" role="status">{mode === 'history' ? 'Nenhum local encontrado no histórico.' : 'Nenhum local encontrado. Tente outro nome ou selecione no mapa.'}</p>}
        {Boolean(results?.length) && <ul className="event-location-results" aria-label={mode === 'history' ? 'Locais do histórico' : 'Resultados da pesquisa'}>
            {results!.map((location, index) => <li key={`${location.latitude}:${location.longitude}:${index}`}>
                <button type="button" onClick={() => onSelect(location)}><Icon name="location" /><span>{location.address}</span><Icon name="chevronRight" /></button>
            </li>)}
        </ul>}
    </div>
}

function LocationDialog({ value, onClose, onConfirm }: { value: LocationValue; onClose: () => void; onConfirm: (location: EventLocation) => void }) {
    const dialog = useRef<HTMLDialogElement>(null)
    const [point, setPoint] = useState<Coordinates | null>(() => getCoordinates(value.latitude, value.longitude))
    const [address, setAddress] = useState(value.address)
    const [mode, setMode] = useState<'search' | 'history'>('search')
    const [error, setError] = useState('')
    useEffect(() => {
        const popup = dialog.current
        const previousFocus = document.activeElement as HTMLElement | null
        popup?.showModal()
        return () => { popup?.close(); previousFocus?.focus() }
    }, [])
    const confirm = () => {
        if (!point) { setError('Selecione um ponto no mapa, um resultado ou um local do histórico.'); return }
        if (!address.trim()) { setError('Informe o nome ou endereço do local selecionado.'); return }
        onConfirm({ ...point, address: address.trim() })
    }
    return <dialog ref={dialog} className="event-location-dialog" aria-labelledby="event-location-dialog-title"
        onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}
        onKeyDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()}>
        <header className="event-location-dialog-header">
            <h2 id="event-location-dialog-title">Localização do evento</h2>
            <button type="button" className="location-button is-icon" onClick={onClose} aria-label="Fechar localização"><Icon name="close" /></button>
        </header>
        <div className="event-location-dialog-body">
            <div className="event-location-modes" role="group" aria-label="Encontrar localização">
                <button type="button" className="location-button" aria-pressed={mode === 'search'} onClick={() => setMode('search')}><Icon name="magnifyingGlass" />Pesquisar local</button>
                <button type="button" className="location-button" aria-pressed={mode === 'history'} onClick={() => setMode('history')}><Icon name="clock" />Histórico</button>
            </div>
            <LocationResults key={mode} mode={mode} onSelect={location => { setPoint(location); setAddress(location.address); setError('') }} />
            <p className="location-help" id="event-location-map-help">Clique no mapa ou arraste o marcador para ajustar o ponto. Pelo teclado, use as setas para mover o mapa e Enter para marcar o centro.</p>
            <Suspense fallback={<div className="location-map-loading" role="status">Carregando mapa...</div>}>
                <LocationMap coordinates={point} editable label="Selecionar local do evento no mapa" onSelect={coordinates => { setPoint(coordinates); setError('') }} />
            </Suspense>
            <p className="location-help" role="status">{point ? `Ponto selecionado: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}. Confira o endereço abaixo.` : 'Nenhum ponto selecionado.'}</p>
            <label className="event-location-address">Nome do local / endereço
                <input value={address} maxLength={255} placeholder="Ex.: Praça Central, Rua das Flores, 100"
                    onChange={event => setAddress(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); confirm() } }} />
            </label>
            {error && <p className="location-error" role="alert">{error}</p>}
        </div>
        <footer className="event-location-dialog-footer">
            <button type="button" className="location-button" onClick={onClose}>Cancelar</button>
            <button type="button" className="location-button is-primary" onClick={confirm}>Usar esta localização</button>
        </footer>
    </dialog>
}

export default function EventLocationPicker({ address, latitude, longitude, disabled, onChange }: LocationValue & {
    disabled: boolean; onChange: (value: LocationValue) => void
}) {
    const [open, setOpen] = useState(false)
    const point = getCoordinates(latitude, longitude)
    return <div className="event-location-picker">
        <label>Local / endereço
            <input required maxLength={255} value={address} placeholder="Nome do local, rua, número e bairro"
                onChange={event => onChange({ address: event.target.value, latitude, longitude })} />
        </label>
        <div className="event-location-actions">
            <button type="button" className={`event-location-map-button${point ? ' has-location' : ''}`} disabled={disabled} onClick={() => setOpen(true)}>
                <span className="event-location-map-icon"><Icon name="location" /></span>
                <span>{point ? 'Alterar localização' : 'Selecionar no mapa'}</span>
                <Icon name="chevronRight" />
            </button>
            {point && <button type="button" className="event-location-remove" disabled={disabled} aria-label="Remover ponto do mapa" title="Remover ponto do mapa"
                onClick={() => onChange({ address, latitude: null, longitude: null })}><Icon name="trash" /></button>}
        </div>
        {open && <LocationDialog value={{ address, latitude, longitude }} onClose={() => setOpen(false)} onConfirm={location => { onChange(location); setOpen(false) }} />}
    </div>
}
