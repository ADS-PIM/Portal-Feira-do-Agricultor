import { useEffect, useState } from 'react'
import { getEventGalleryPage, type EventImage } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'

export const PREVIEW_SIZE = 3
const PAGE_SIZE = 12

function pageStart(index: number) {
    return index < PREVIEW_SIZE ? 0 : PREVIEW_SIZE + Math.floor((index - PREVIEW_SIZE) / PAGE_SIZE) * PAGE_SIZE
}

type GalleryPage = { images: EventImage[]; error?: string }

export function useEventGallery(eventId: string | undefined, selectedIndex: number) {
    const [pages, setPages] = useState<Record<number, GalleryPage>>({})
    const [total, setTotal] = useState(0)
    const [visibleCount, setVisibleCount] = useState(PREVIEW_SIZE)
    const visibleStart = pageStart(visibleCount - 1)
    const selectedStart = pageStart(selectedIndex)

    useEffect(() => {
        if (!eventId) return
        const controller = new AbortController()
        // The viewer can jump straight to the last photo without fetching intervening pages.
        for (const offset of new Set([0, visibleStart, selectedStart])) {
            if (pages[offset]) continue
            void getEventGalleryPage(eventId, offset, offset === 0 ? PREVIEW_SIZE : PAGE_SIZE, controller.signal)
                .then(page => {
                    if (controller.signal.aborted) return
                    setTotal(page.total)
                    setPages(current => ({ ...current, [offset]: { images: page.images } }))
                })
                .catch(error => {
                    if (controller.signal.aborted) return
                    const message = getUserFacingError(error, 'Não foi possível carregar as fotos deste evento.')
                    setPages(current => ({ ...current, [offset]: { images: [], error: message } }))
                })
        }
        return () => controller.abort()
    }, [eventId, pages, selectedStart, visibleStart])

    function retry(offset: number) {
        setPages(current => {
            const updated = { ...current }
            delete updated[offset]
            return updated
        })
    }

    const extraPhotos: EventImage[] = []
    for (let offset = PREVIEW_SIZE; offset < visibleCount; offset += PAGE_SIZE) {
        if (pages[offset]) extraPhotos.push(...pages[offset].images)
    }

    const selectedPage = pages[selectedStart]
    const selectedPhoto = selectedPage?.images[selectedIndex - selectedStart]
    return {
        total, preview: pages[0], extraPhotos, expanded: visibleStart > 0,
        canShowMore: visibleCount < total, lastPage: pages[visibleStart],
        selectedPhoto, selectedError: selectedPage?.error,
        selectedMissing: selectedPage && !selectedPage.error && !selectedPhoto,
        showMore: () => setVisibleCount(count => count + PAGE_SIZE),
        collapse: () => setVisibleCount(PREVIEW_SIZE),
        retryVisible: () => retry(visibleStart),
        retrySelected: () => retry(selectedStart),
    }
}
