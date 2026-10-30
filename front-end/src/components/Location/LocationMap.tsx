import { useEffect, useEffectEvent, useRef, useState } from 'react'
import L from 'leaflet'
import type { Coordinates } from '../../utils/eventLocation'
import 'leaflet/dist/leaflet.css'
import './LocationMap.css'

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
    const container = useRef<HTMLDivElement>(null)
    const map = useRef<L.Map | null>(null)
    const marker = useRef<L.Marker | null>(null)
    const [tileError, setTileError] = useState(false)
    const selectPoint = useEffectEvent((point: L.LatLng) => {
        const wrapped = point.wrap()
        onSelect?.({ latitude: Number(Math.max(-90, Math.min(90, wrapped.lat)).toFixed(6)), longitude: Number(wrapped.lng.toFixed(6)) })
    })

    useEffect(() => {
        if (!container.current) return
        const element = container.current
        const instance = L.map(element, { scrollWheelZoom: false }).setView([-14.24, -51.92], 4)
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

    return <div className="location-map-wrapper">
        <div ref={container} className="location-map" role="region" aria-label={label} />
        {tileError && <p className="location-map-error" role="status">Não foi possível carregar o mapa. Verifique sua conexão. As coordenadas do local foram mantidas.</p>}
    </div>
}
