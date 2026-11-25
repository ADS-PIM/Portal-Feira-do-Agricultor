// A callback ref also observes agenda items that arrive after the first render.
export function revealOnScroll(detail: HTMLElement | null) {
    if (!detail || !('IntersectionObserver' in window)) return

    const card = detail.closest<HTMLElement>('[data-home-reveal-card]') ?? detail
    const desktop = window.matchMedia('(min-width: 981px)')
    let target = detail
    let observer: IntersectionObserver

    const observe = () => {
        observer?.disconnect()
        target.classList.remove('home-reveal-pending')
        target = desktop.matches ? card : detail
        const current = new IntersectionObserver(entries => {
            if (observer !== current || !entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.15)) return
            current.disconnect()
            desktop.removeEventListener('change', observe)
            target.classList.remove('home-reveal-pending')
            if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
                target.classList.add('home-reveal-in')
            }
        }, { threshold: 0.15, rootMargin: desktop.matches ? '0px 0px -25% 0px' : '0px' })
        observer = current
        target.classList.add('home-reveal-pending')
        observer.observe(target)
    }

    observe()
    desktop.addEventListener('change', observe)
    return () => {
        observer.disconnect()
        desktop.removeEventListener('change', observe)
        target.classList.remove('home-reveal-pending', 'home-reveal-in')
    }
}
