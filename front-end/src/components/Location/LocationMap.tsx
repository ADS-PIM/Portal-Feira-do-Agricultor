import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react'
import L from 'leaflet'
import type { Coordinates } from '../../utils/eventLocation'
import 'leaflet/dist/leaflet.css'
import './LocationMap.css'

const defaultCenter: L.LatLngTuple = [-5.24, -38.13] // Tabuleiro do Norte, CE

const touchQuery = '(pointer: coarse)'
const isTouchDevice = () => window.matchMedia(touchQuery).matches
const subscribeToTouchDevice = (onChange: () => void) => {
    const query = window.matchMedia(touchQuery)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
}

const pin = L.divIcon({
    className: 'location-map-pin',
    html: '<span></span>',
    iconSize: [30, 38],
    iconAnchor: [15, 38],
})

export default function LocationMap({ coordinates, onSelect, label, editable = false }: {
    coordinates: Coordinates | null
    onSelect?: (point: Coordinates) => void
    label: string
    editable?: boolean
}) {
    const wrapper = useRef<HTMLDivElement>(null)
    const container = useRef<HTMLDivElement>(null)
    const map = useRef<L.Map | null>(null)
    const marker = useRef<L.Marker | null>(null)
    const [tileError, setTileError] = useState(false)
    const [interactionActive, setInteractionActive] = useState(false)
    const touchDevice = useSyncExternalStore(subscribeToTouchDevice, isTouchDevice, () => false)
    const requiresActivation = touchDevice && !editable
    const interactionLocked = requiresActivation && !interactionActive
    const selectPoint = useEffectEvent((point: L.LatLng) => {
        const wrapped = point.wrap()
        onSelect?.({ latitude: Number(Math.max(-90, Math.min(90, wrapped.lat)).toFixed(6)), longitude: Number(wrapped.lng.toFixed(6)) })
    })

    useEffect(() => {
        if (!container.current) return
        const element = container.current
        const instance = L.map(element, { scrollWheelZoom: true }).setView(defaultCenter, 13)
        map.current = instance
        L.control.zoom({ position: 'topright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(instance)
        instance.zoomControl.remove()
        const tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(instance)
        tiles.on('tileerror', () => setTileError(true))
        tiles.on('tileload', () => setTileError(false))
        if (editable) instance.on('click', (event: L.LeafletMouseEvent) => selectPoint(event.latlng))
        const keyHandler = (event: KeyboardEvent) => {
            if (editable && event.key === 'Enter' && event.target === element) {
                event.preventDefault()
                selectPoint(instance.getCenter())
            }
        }
        element.addEventListener('keydown', keyHandler)
        const resize = new ResizeObserver(() => instance.invalidateSize({ pan: false }))
        resize.observe(element)
        return () => {
            resize.disconnect()
            element.removeEventListener('keydown', keyHandler)
            instance.remove()
            map.current = null
            marker.current = null
        }
    }, [editable])

    useEffect(() => {
        const instance = map.current
        if (!instance) return
        const handlers = [instance.dragging, instance.touchZoom, instance.doubleClickZoom,
            instance.scrollWheelZoom, instance.boxZoom, instance.keyboard]
        handlers.forEach(handler => interactionLocked ? handler.disable() : handler.enable())
    }, [interactionLocked, editable])

    useEffect(() => {
        if (!requiresActivation || !interactionActive) return
        const handleOutsidePointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !wrapper.current?.contains(event.target)) {
                setInteractionActive(false)
            }
        }
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setInteractionActive(false)
        }
        document.addEventListener('pointerdown', handleOutsidePointer, true)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('pointerdown', handleOutsidePointer, true)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [requiresActivation, interactionActive])

    const latitude = coordinates?.latitude, longitude = coordinates?.longitude
    useEffect(() => {
        const instance = map.current
        if (!instance) return
        if (latitude === undefined || longitude === undefined) {
            marker.current?.remove()
            marker.current = null
            return
        }
        if (!marker.current) {
            marker.current = L.marker([latitude, longitude], { icon: pin, draggable: editable, title: 'Local do evento', alt: 'Local do evento' }).addTo(instance)
            marker.current.on('dragend', () => {
                if (marker.current) selectPoint(marker.current.getLatLng())
            })
        } else marker.current.setLatLng([latitude, longitude])
        instance.setView([latitude, longitude], Math.max(instance.getZoom(), 15), { animate: false })
    }, [latitude, longitude, editable])

    return <div ref={wrapper} className="location-map-wrapper">
        <div ref={container} className={`location-map${interactionLocked ? ' is-locked' : ''}`} role="region" aria-label={label} inert={interactionLocked} />
        {interactionLocked && <button type="button" className="location-map-activate" onClick={() => setInteractionActive(true)}>
            <span>Toque para interagir com o mapa</span>
        </button>}
        {requiresActivation && interactionActive && <button type="button" className="location-map-lock" onClick={() => setInteractionActive(false)}>
            Bloquear mapa
        </button>}
        {tileError && <p className="location-map-error" role="status">Não foi possível carregar o mapa. Verifique sua conexão. As coordenadas do local foram mantidas.</p>}
    </div>
}
