import { calculateAdvancedPricing, PRICING_UNITS, type AdvancedPricingInput, type PricingUnit } from '../../utils/advancedPricingCalculator'
import { parsePricingNumber } from '../../utils/pricingCalculator'

export type IngredientDraft = {
  id: string; name: string; purchasedQuantity: string; purchasedUnit: PricingUnit | 'package'
  purchaseValue: string; usedQuantity: string; usedUnit: PricingUnit
  packageQuantity: string; packageUnit: PricingUnit
}
export type ExpenseDraft = { id: string; name: string; value: string }
export type EquipmentDraft = ExpenseDraft & { lifeMonths: string }
export type AdvancedFormValues = {
  productName: string; producedQuantity: string
  productionTime: string; timeUnit: 'hour' | 'minute'
  monthlyPay: string; hoursPerDay: string; daysPerMonth: string
  monthlyRevenue: string; profit: string
  ingredients: IngredientDraft[]; fixedExpenses: ExpenseDraft[]
  equipment: EquipmentDraft[]; variableExpenses: ExpenseDraft[]
}

export const newIngredient = (values: Partial<IngredientDraft> = {}): IngredientDraft => ({
  id: crypto.randomUUID(), name: '', purchasedQuantity: '', purchasedUnit: 'kg',
  purchaseValue: '', usedQuantity: '', usedUnit: 'g', packageQuantity: '', packageUnit: 'hour', ...values,
})
export const newExpense = (): ExpenseDraft => ({ id: crypto.randomUUID(), name: '', value: '' })
export const newEquipment = (): EquipmentDraft => ({ ...newExpense(), lifeMonths: '' })

export function emptyAdvancedForm(): AdvancedFormValues {
  return { productName: '', producedQuantity: '', productionTime: '', timeUnit: 'hour',
    monthlyPay: '', hoursPerDay: '', daysPerMonth: '', monthlyRevenue: '', profit: '0',
    ingredients: [newIngredient()], fixedExpenses: [], equipment: [], variableExpenses: [] }
}

export function exampleAdvancedForm(): AdvancedFormValues {
  return {
    productName: 'Pão recheado', producedQuantity: '2', productionTime: '2', timeUnit: 'hour',
    monthlyPay: '1.600,00', hoursPerDay: '8', daysPerMonth: '20', monthlyRevenue: '10.000,00', profit: '30',
    ingredients: [
      newIngredient({ name: 'Farinha de trigo sem fermento', purchasedQuantity: '1', purchaseValue: '4,80', usedQuantity: '500' }),
      newIngredient({ name: 'Açúcar', purchasedQuantity: '1', purchaseValue: '3,20', usedQuantity: '100' }),
      newIngredient({ name: 'Peito de frango', purchasedQuantity: '1', purchaseValue: '12,00', usedQuantity: '500' }),
      newIngredient({ name: 'Queijo muçarela', purchasedQuantity: '1', purchaseValue: '40,00', usedQuantity: '200' }),
      newIngredient({ name: 'Gás', purchasedQuantity: '1', purchasedUnit: 'package', purchaseValue: '125,00',
        packageQuantity: '320', packageUnit: 'hour', usedQuantity: '4', usedUnit: 'hour' }),
      newIngredient({ name: 'Embalagem', purchasedQuantity: '100', purchasedUnit: 'unit', purchaseValue: '5,00', usedQuantity: '1', usedUnit: 'unit' }),
    ],
    fixedExpenses: [{ ...newExpense(), name: 'Aluguel', value: '800,00' }, { ...newExpense(), name: 'Energia e internet', value: '180,00' }],
    equipment: [{ ...newEquipment(), name: 'Forno', value: '1.200,00', lifeMonths: '60' }],
    variableExpenses: [{ ...newExpense(), name: 'Taxa da maquininha', value: '3' }, { ...newExpense(), name: 'Comissão de venda', value: '2' }],
  }
}

export function evaluateAdvancedForm(values: AdvancedFormValues) {
  const errors: Record<string, string> = {}
  function text(key: string, value: string) {
    if (!value.trim()) errors[key] = 'Preencha este campo.'
    return value.trim()
  }
  function number(key: string, value: string, positive = false, maximum?: number) {
    const parsed = parsePricingNumber(value)
    if (parsed === null) errors[key] = value.trim() ? 'Informe um número válido, como 1.000,50.' : 'Preencha este campo.'
    else if (positive && parsed <= 0) errors[key] = 'Informe um valor maior que zero.'
    else if (maximum !== undefined && parsed > maximum) errors[key] = `Informe um valor de até ${maximum}.`
    return parsed ?? NaN
  }
  function expenses(rows: ExpenseDraft[], group: string) {
    return rows.map(row => ({ name: text(`${group}.${row.id}.name`, row.name),
      value: group === 'variableExpenses' ? percentage(`${group}.${row.id}.value`, row.value) : number(`${group}.${row.id}.value`, row.value) }))
  }
  function percentage(key: string, value: string) {
    const parsed = number(key, value)
    if (parsed >= 100) errors[key] = 'Informe um percentual menor que 100%.'
    return parsed
  }
  const input: AdvancedPricingInput = {
    productName: text('productName', values.productName),
    producedQuantity: number('producedQuantity', values.producedQuantity, true),
    productionTime: number('productionTime', values.productionTime), timeUnit: values.timeUnit,
    monthlyPay: number('monthlyPay', values.monthlyPay), hoursPerDay: number('hoursPerDay', values.hoursPerDay, true, 24),
    daysPerMonth: number('daysPerMonth', values.daysPerMonth, true, 31),
    monthlyRevenue: number('monthlyRevenue', values.monthlyRevenue, true), profit: percentage('profit', values.profit),
    ingredients: values.ingredients.map(row => {
      const key = `ingredients.${row.id}`
      const purchasedUnit = row.purchasedUnit === 'package' ? row.packageUnit : row.purchasedUnit
      const compatible = PRICING_UNITS[purchasedUnit].dimension === PRICING_UNITS[row.usedUnit].dimension
      if (!compatible) errors[`${key}.usedUnit`] = 'Use medidas compatíveis: kg com g, L com mL, ou horas com minutos.'
      return { name: text(`${key}.name`, row.name),
        purchasedQuantity: number(`${key}.purchasedQuantity`, row.purchasedQuantity, true), purchasedUnit: row.purchasedUnit,
        purchaseValue: number(`${key}.purchaseValue`, row.purchaseValue),
        usedQuantity: number(`${key}.usedQuantity`, row.usedQuantity, true), usedUnit: row.usedUnit,
        ...(row.purchasedUnit === 'package' ? { packageQuantity: number(`${key}.packageQuantity`, row.packageQuantity, true), packageUnit: row.packageUnit } : {}) }
    }),
    fixedExpenses: expenses(values.fixedExpenses, 'fixedExpenses'),
    variableExpenses: expenses(values.variableExpenses, 'variableExpenses'),
    equipment: values.equipment.map(row => ({ name: text(`equipment.${row.id}.name`, row.name),
      value: number(`equipment.${row.id}.value`, row.value), lifeMonths: number(`equipment.${row.id}.lifeMonths`, row.lifeMonths, true) })),
  }
  if (values.ingredients.length === 0) errors.ingredients = 'Adicione pelo menos um insumo.'
  const monthlyDepreciation = input.equipment.reduce((sum, item) => sum + item.value / item.lifeMonths, 0)
  const monthlyFixed = input.fixedExpenses.reduce((sum, item) => sum + item.value, 0) + monthlyDepreciation
  const fixedPercentage = monthlyFixed / input.monthlyRevenue * 100
  const variablePercentage = input.variableExpenses.reduce((sum, item) => sum + item.value, 0)
  const totalPercentage = fixedPercentage + variablePercentage + input.profit
  if (Number.isFinite(totalPercentage) && totalPercentage >= 100 && !errors.profit) {
    errors.profit = 'Despesas fixas + taxas + lucro devem somar menos de 100%. Revise os valores e o faturamento.'
  }
  const result = Object.keys(errors).length ? null : calculateAdvancedPricing(input)
  if (!Object.keys(errors).length && !result) errors.calculation = 'Confira os valores: o custo-base deve ser maior que zero e os números precisam permitir um cálculo finito.'
  return { errors, result, input, fixedPercentage, variablePercentage, totalPercentage, monthlyFixed, monthlyDepreciation }
}
