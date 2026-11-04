import { parsePricingNumber } from '../../utils/pricingCalculator'

export const calculatorErrors = {
  required: 'Preencha este campo.',
  nonnegative: 'Informe um número válido, maior ou igual a zero.',
  positive: 'Informe um número válido, maior que zero.',
  percentage: 'Informe um percentual maior ou igual a zero e menor que 100%.',
  totalPercentage: 'A soma deve ficar abaixo de 100%. Revise as despesas, o faturamento ou o lucro desejado.',
  directCost: 'O custo de material mais a mão de obra deve ser maior que zero.',
  calculation: 'Os valores informados são grandes demais para calcular. Reduza os valores e tente novamente.',
  incompatibleUnits: 'Use medidas compatíveis: kg com g, L com mL, m com cm, unidades com unidades ou horas com minutos.',
  ingredient: 'Adicione pelo menos um insumo.',
  reviewStep: 'Revise os campos indicados nesta etapa.',
} as const

type NumberRules = { positive?: boolean; maximum?: number; percentage?: boolean }

export function getCalculatorNumberError(value: string, { positive = false, maximum, percentage = false }: NumberRules = {}): string {
  if (!value.trim()) return calculatorErrors.required

  const number = parsePricingNumber(value)
  if (percentage) {
    return number === null || number >= 100 ? calculatorErrors.percentage : ''
  }
  if (maximum !== undefined && (number === null || (positive && number <= 0) || number > maximum)) {
    return `Informe um número válido, ${positive ? 'maior que zero' : 'maior ou igual a zero'} e menor ou igual a ${maximum}.`
  }
  if (number === null || (positive && number <= 0)) {
    return positive ? calculatorErrors.positive : calculatorErrors.nonnegative
  }
  return ''
}
