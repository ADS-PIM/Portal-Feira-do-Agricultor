import type { CSSProperties, ReactNode } from 'react'
import { parsePricingNumber } from '../../utils/pricingCalculator'

type PercentageFieldProps = {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  hint?: string
  error?: string
  invalid?: boolean
  describedBy?: string
  help?: ReactNode
}

export default function PercentageField({ id, name, label, value, onChange, onBlur, hint, error,
  invalid = false, describedBy, help }: PercentageFieldProps) {
  const number = parsePricingNumber(value) ?? 0
  const sliderValue = Math.max(0, Math.min(100, number))
  const hasError = Boolean(error) || invalid
  const description = [hint && `${id}-hint`, error && `${id}-error`, describedBy].filter(Boolean).join(' ') || undefined

  return (
    <div className="markup-field markup-percentage-field">
      <div className="markup-field-heading">
        <div className="markup-field-label">
          <label htmlFor={`${id}-value`}>{label}</label>
          {help}
        </div>
        <label className={`markup-range-value${hasError ? ' has-error' : ''}`} htmlFor={`${id}-value`}>
          <input id={`${id}-value`} name={name} type="text" inputMode="decimal" enterKeyHint="done"
            maxLength={20} value={value} aria-label={`${label} (%)`} aria-invalid={hasError}
            aria-describedby={description} onFocus={event => event.currentTarget.select()}
            onChange={event => onChange(event.currentTarget.value)} onBlur={onBlur}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }} required />
          <span aria-hidden="true">%</span>
        </label>
      </div>
      <input className="markup-range" id={id} type="range" min="0" max="100" step="any"
        value={sliderValue} aria-label={`${label}: ajustar porcentagem`} aria-valuetext={`${sliderValue}%`}
        aria-invalid={hasError} aria-describedby={description}
        style={{ '--range-fill': `${sliderValue}%` } as CSSProperties}
        onPointerDown={event => event.currentTarget.focus({ preventScroll: true })}
        onChange={event => onChange(String(Number(Number(event.currentTarget.value).toFixed(1))))}
        onKeyDown={event => {
          const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1
            : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0
          if (direction) {
            event.preventDefault()
            onChange(String(Number(Math.max(0, Math.min(100, sliderValue + direction * 0.1)).toFixed(10))))
          }
        }} onBlur={onBlur} />
      {hint && <p id={`${id}-hint`} className="markup-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="markup-error">{error}</p>}
    </div>
  )
}
