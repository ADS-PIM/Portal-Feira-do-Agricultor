import type { ReactNode } from 'react'
import Icon from '../../components/Icon'

export function CalculatorDetails({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="markup-details">
      <summary><h2>{title}<Icon name="chevronDown" /></h2></summary>
      <div className="markup-details-body">{children}</div>
    </details>
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
