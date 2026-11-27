import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { getCalendarYears } from '../../utils/calendarYears'
import Icon from '../Icon'
import './CalendarYearPicker.css'

type Props = {
    id?: string
    label: string
    year: number
    onChange: (year: number) => void
}

export default function CalendarYearPicker({ id, label, year, onChange }: Props) {
    const listId = useId()
    const trigger = useRef<HTMLButtonElement>(null)
    const list = useRef<HTMLSpanElement>(null)
    const prefix = useRef({ text: '', time: 0 })
    const [active, setActive] = useState<number | null>(null)
    const open = active !== null
    const years = getCalendarYears(year)

    useLayoutEffect(() => {
        if (!open) return
        const button = trigger.current!
        const popup = list.current!
        const viewport = window.visualViewport
        const position = () => {
            const rect = button.getBoundingClientRect()
            const top = viewport?.offsetTop ?? 0
            const bottom = top + (viewport?.height ?? document.documentElement.clientHeight)
            // The portal's accessibility controls can zoom the page independently of the viewport.
            const scale = rect.height / button.offsetHeight || 1
            const below = (bottom - rect.bottom) / scale - 8
            const above = (rect.top - top) / scale - 8
            const preferredHeight = 180
            const preferAbove = above > below && below < preferredHeight
            popup.classList.toggle('opens-above', preferAbove)
            const height = `${Math.max(0, Math.floor(Math.min(preferredHeight, preferAbove ? above : below)))}px`
            if (popup.style.maxHeight !== height) popup.style.maxHeight = height
        }
        const dismissOutside = (event: PointerEvent) => {
            if (!button.parentElement?.contains(event.target as Node)) setActive(null)
        }
        position()
        window.addEventListener('resize', position)
        window.addEventListener('scroll', position, true)
        viewport?.addEventListener('resize', position)
        viewport?.addEventListener('scroll', position)
        document.addEventListener('pointerdown', dismissOutside)
        return () => {
            window.removeEventListener('resize', position)
            window.removeEventListener('scroll', position, true)
            viewport?.removeEventListener('resize', position)
            viewport?.removeEventListener('scroll', position)
            document.removeEventListener('pointerdown', dismissOutside)
        }
    }, [open])

    useLayoutEffect(() => {
        const popup = list.current
        const option = popup?.querySelector<HTMLElement>('[data-active]')
        if (!popup || !option) return
        if (option.offsetTop < popup.scrollTop) popup.scrollTop = option.offsetTop
        else if (option.offsetTop + option.offsetHeight > popup.scrollTop + popup.clientHeight) {
            popup.scrollTop = option.offsetTop + option.offsetHeight - popup.clientHeight
        }
    }, [active])

    function select(value: number) {
        setActive(null)
        onChange(value)
    }

    function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
        const current = active ?? year
        const first = years[0]
        const last = years[years.length - 1]
        switch (event.key) {
            case 'ArrowDown': setActive(open ? Math.min(current + 1, last) : year); break
            case 'ArrowUp': setActive(open ? Math.max(current - 1, first) : year); break
            case 'Home': setActive(first); break
            case 'End': setActive(last); break
            case 'Enter':
            case ' ':
                if (active === null) setActive(year)
                else select(active)
                break
            case 'Escape':
                if (!open) return
                setActive(null)
                break
            default: {
                if (!/^\d$/.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) return
                const now = Date.now()
                const text = (now - prefix.current.time < 800 ? prefix.current.text : '') + event.key
                prefix.current = { text, time: now }
                const match = years.find(value => String(value).startsWith(text))
                if (match !== undefined) setActive(match)
            }
        }
        event.preventDefault()
    }

    return (
        <span className="calendar-year-picker">
            <button
                id={id} type="button" role="combobox" className="calendar-year-trigger"
                aria-label={label} aria-expanded={open} aria-controls={open ? listId : undefined}
                aria-activedescendant={open ? `${listId}-${active}` : undefined}
                onClick={() => setActive(open ? null : year)} onKeyDown={handleKey}
                onBlur={() => setActive(null)} ref={trigger}
            >
                {year}<Icon name="chevronDown" />
            </button>
            {open && (
                <span id={listId} role="listbox" aria-label={label} className="calendar-year-list" ref={list}>
                    {years.map(value => (
                        <span
                            key={value} id={`${listId}-${value}`} role="option" aria-selected={value === year}
                            data-active={value === active || undefined}
                            onMouseDown={event => event.preventDefault()} onClick={() => select(value)}
                        >{value}</span>
                    ))}
                </span>
            )}
        </span>
    )
}
