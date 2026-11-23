import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import Icon from '../../components/Icon'

export function CalculatorDetails({ title, children }: { title: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [panelHeight, setPanelHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const panelId = `calculator-details-${useId()}`

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const updateHeight = () => setPanelHeight(content.getBoundingClientRect().height)
    const observer = new ResizeObserver(updateHeight)
    observer.observe(content)
    updateHeight()
    return () => observer.disconnect()
  }, [])

  return (
    <section className={`markup-details${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="markup-details-toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(open => !open)}
      >
        <span className="markup-details-title">{title}<Icon name="chevronDown" /></span>
      </button>
      <div id={panelId} className="markup-details-panel" style={{ height: isOpen ? panelHeight : 0 }} inert={!isOpen}>
        <div ref={contentRef} className="markup-details-body">{children}</div>
      </div>
    </section>
  )
}

export function ProductionSummary({ rows }: { rows: [string, string][] }) {
  return (
    <CalculatorDetails title="Resumo da produção">
      <dl className="markup-detail-values">
        {rows.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </CalculatorDetails>
  )
}
