import type { ProductionTimeUnit } from '../../utils/pricingCalculator'
import CalculatorFieldHelp from './CalculatorFieldHelp'

const label = 'Medida do tempo de produção'
const help = {
  lead: 'Escolha a medida que combina com o tempo digitado.',
  explanation: 'Para registrar uma hora e meia, use 90 com Minutos ou 1,5 com Horas.',
  example: 'Se você digitou 30 para indicar meia hora de trabalho, escolha Minutos. Com Horas, a calculadora entenderia 30 horas de trabalho.',
  effect: 'Se sua hora vale R$ 20, meia hora de trabalho custa R$ 10. Ao trocar a medida, ajuste também o número para manter o mesmo tempo.',
}

export default function ProductionTimeUnitField({ id, value, onChange }: {
  id: string; value: ProductionTimeUnit; onChange: (value: ProductionTimeUnit) => void
}) {
  return <div className="markup-field markup-time-unit-field">
    <div className="markup-field-heading">
      <label htmlFor={id}>{label}</label>
      <CalculatorFieldHelp label={label} help={help} />
    </div>
    <select className="markup-unit-select" id={id} name="timeUnit" value={value} onChange={event => onChange(event.currentTarget.value as ProductionTimeUnit)}>
      <option value="hour">Horas</option>
      <option value="minute">Minutos</option>
    </select>
  </div>
}
