import { useId, useState } from 'react'
import Icon from '../../components/Icon'

export function CalculatorSteps({ steps, current, incompleteSteps, onSelect, label = 'Etapas da calculadora avançada' }: {
  steps: readonly string[]; current: number; incompleteSteps: readonly number[]; onSelect: (step: number) => void; label?: string
}) {
  const warningId = useId()
  const [visitedSteps, setVisitedSteps] = useState<number[]>([current])
  const highlightedSteps = incompleteSteps.filter(index => current !== index && visitedSteps.includes(index))
  return (
    <nav className="markup-steps" aria-label={label}>
      <p className="markup-step-status" role="status">Etapa {current + 1} de {steps.length}: <strong>{steps[current]}</strong></p>
      <ol className="markup-step-list">
        {steps.map((label, index) => <li key={label}>
          <button className={`markup-step-button${highlightedSteps.includes(index) ? ' is-incomplete' : ''}`} type="button" data-step={index}
            aria-label={`Etapa ${index + 1}: ${label}`} aria-current={current === index ? 'step' : undefined}
            aria-describedby={highlightedSteps.includes(index) ? warningId : undefined}
            onClick={() => {
              setVisitedSteps(previous => previous.includes(index) ? previous : [...previous, index])
              onSelect(index)
            }}>
            <span aria-hidden="true">{index + 1}</span>{label}
          </button>
        </li>)}
      </ol>
      <div aria-live="polite">
        {highlightedSteps.length > 0 && <p id={warningId} className="markup-step-warning">Preencha todos os campos obrigatorio</p>}
      </div>
    </nav>
  )
}

export function CalculatorStepActions({ current, count, onBack, onClear }: {
  current: number; count: number; onBack: () => void; onClear: () => void
}) {
  const last = current === count - 1
  return <div className="markup-step-actions">
    <div className="markup-step-navigation">
      {current > 0 && <button className="markup-step-back" type="button" onClick={onBack}><Icon name="arrowLeft" /> Voltar</button>}
      {!last && <button className="markup-submit" type="submit"><Icon name="arrowRight" /> Próximo</button>}
    </div>
    <button className="markup-clear" type="button" onClick={onClear}><Icon name="trash" /> Limpar campos</button>
  </div>
}
