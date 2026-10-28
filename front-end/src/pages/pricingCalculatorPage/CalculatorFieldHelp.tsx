import { useId, useRef } from 'react'
import { faQuestion } from '@fortawesome/free-solid-svg-icons'

export type CalculatorHelp = { explanation: string; example: string; effect: string }

const paths = [faQuestion.icon[4]].flat()
const scale = 12 / faQuestion.icon[1]
const offsetX = (22 - faQuestion.icon[0] * scale) / 2

export default function CalculatorFieldHelp({ label, help }: { label: string; help: CalculatorHelp }) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  return <>
    <button ref={buttonRef} type="button" className="markup-help-button" aria-label={`Entenda: ${label}`}
      aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
      <svg className="markup-help-icon" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <g transform={`translate(${offsetX} 5) scale(${scale})`}>
          {paths.map((path, index) => <path key={index} d={path} fill="currentColor" />)}
        </g>
      </svg>
    </button>
    <dialog ref={dialogRef} className="markup-help-dialog" aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`} onClose={() => buttonRef.current?.focus({ preventScroll: true })}
      onClick={event => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close()
        }
      }}>
      <div className="markup-help-heading">
        <h2 id={`${id}-title`}>{label}</h2>
        <button type="button" className="markup-help-close" aria-label="Fechar explicação" onClick={() => dialogRef.current?.close()}>×</button>
      </div>
      <p id={`${id}-description`}>{help.explanation}</p>
      <h3>Por exemplo</h3>
      <p>{help.example}</p>
      <h3>Como muda o preço?</h3>
      <p>{help.effect}</p>
      <button type="button" className="markup-example markup-help-understood" onClick={() => dialogRef.current?.close()}>Entendi</button>
    </dialog>
  </>
}
