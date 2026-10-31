import type { ProductionTimeUnit } from '../../utils/pricingCalculator'
import CalculatorFieldHelp from './CalculatorFieldHelp'

const label = 'Medida do tempo de produção'
const help = {
  explanation: 'Escolha se o tempo de produção foi informado em horas ou minutos. A calculadora converte os minutos para horas antes de calcular a mão de obra.',
  example: '2 horas e 120 minutos representam o mesmo tempo. Para informar uma hora e meia, use 1,5 hora ou 90 minutos.',
  effect: 'A medida determina a duração usada no cálculo. Ao trocar horas por minutos, ajuste também o número para representar o mesmo tempo.',
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
