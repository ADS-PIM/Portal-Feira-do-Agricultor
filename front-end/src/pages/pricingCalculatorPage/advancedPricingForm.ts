import { calculateAdvancedPricing, calculateIngredient, ingredientMeasurementUnit, PRICING_UNITS, type AdvancedPricingInput, type PricingUnit, type PurchaseUnit } from '../../utils/advancedPricingCalculator'
import { parsePricingNumber, type ProductionTimeUnit } from '../../utils/pricingCalculator'
import { calculatorErrors, getCalculatorNumberError } from './calculatorValidation'

export type IngredientDraft = {
  id: string; name: string; purchasedQuantity: string; purchasedUnit: PurchaseUnit
  purchaseValue: string; usedQuantity: string; usedUnit: PricingUnit
  consumptionUnit: ProductionTimeUnit
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
  purchaseValue: '', usedQuantity: '', usedUnit: 'g', consumptionUnit: 'hour', ...values,
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
    productName: 'Produto de exemplo', producedQuantity: '2', productionTime: '2', timeUnit: 'hour',
    monthlyPay: '1.600,00', hoursPerDay: '8', daysPerMonth: '20', monthlyRevenue: '10.000,00', profit: '30',
    ingredients: [
      newIngredient({ name: 'Material A', purchasedQuantity: '1', purchaseValue: '4,80', usedQuantity: '500' }),
      newIngredient({ name: 'Material B', purchasedQuantity: '1', purchaseValue: '3,20', usedQuantity: '100' }),
      newIngredient({ name: 'Material C', purchasedQuantity: '1', purchaseValue: '12,00', usedQuantity: '500' }),
      newIngredient({ name: 'Material D', purchasedQuantity: '1', purchaseValue: '40,00', usedQuantity: '200' }),
      newIngredient({ name: 'Recurso de consumo', purchasedQuantity: '320', purchasedUnit: 'consumption', purchaseValue: '125,00',
        consumptionUnit: 'hour', usedQuantity: '4', usedUnit: 'hour' }),
      newIngredient({ name: 'Embalagem', purchasedQuantity: '100', purchasedUnit: 'package', purchaseValue: '5,00', usedQuantity: '1', usedUnit: 'unit' }),
    ],
    fixedExpenses: [{ ...newExpense(), name: 'Aluguel', value: '800,00' }, { ...newExpense(), name: 'Energia e internet', value: '180,00' }],
    equipment: [{ ...newEquipment(), name: 'Equipamento de produção', value: '1.200,00', lifeMonths: '60' }],
    variableExpenses: [{ ...newExpense(), name: 'Taxa da maquininha', value: '3' }, { ...newExpense(), name: 'Comissão de venda', value: '2' }],
  }
}

export function evaluateAdvancedForm(values: AdvancedFormValues) {
  const errors: Record<string, string> = {}
  const missingFields: string[] = []
  function text(key: string, value: string) {
    if (!value.trim()) missingFields.push(key)
    if (!value.trim()) errors[key] = calculatorErrors.required
    return value.trim()
  }
  function number(key: string, value: string, positive = false, maximum?: number, percentage = false) {
    if (!value.trim()) missingFields.push(key)
    const parsed = parsePricingNumber(value)
    const error = getCalculatorNumberError(value, { positive, maximum, percentage })
    if (error) errors[key] = error
    return parsed ?? NaN
  }
  function expenses(rows: ExpenseDraft[], group: string) {
    return rows.map(row => ({ name: text(`${group}.${row.id}.name`, row.name),
      value: group === 'variableExpenses' ? percentage(`${group}.${row.id}.value`, row.value) : number(`${group}.${row.id}.value`, row.value) }))
  }
  function percentage(key: string, value: string) {
    return number(key, value, false, undefined, true)
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
      const purchasedUnit = ingredientMeasurementUnit(row)
      const compatible = PRICING_UNITS[purchasedUnit].dimension === PRICING_UNITS[row.usedUnit].dimension
      if (!compatible) errors[`${key}.usedUnit`] = calculatorErrors.incompatibleUnits
      return { name: text(`${key}.name`, row.name),
        purchasedQuantity: number(`${key}.purchasedQuantity`, row.purchasedQuantity, true), purchasedUnit: row.purchasedUnit,
        purchaseValue: number(`${key}.purchaseValue`, row.purchaseValue),
        usedQuantity: number(`${key}.usedQuantity`, row.usedQuantity, true), usedUnit: row.usedUnit,
        ...(row.purchasedUnit === 'consumption' ? { consumptionUnit: row.consumptionUnit } : {}) }
    }),
    fixedExpenses: expenses(values.fixedExpenses, 'fixedExpenses'),
    variableExpenses: expenses(values.variableExpenses, 'variableExpenses'),
    equipment: values.equipment.map(row => ({ name: text(`equipment.${row.id}.name`, row.name),
      value: number(`equipment.${row.id}.value`, row.value), lifeMonths: number(`equipment.${row.id}.lifeMonths`, row.lifeMonths, true) })),
  }
  if (values.ingredients.length === 0) errors.ingredients = calculatorErrors.ingredient
  const monthlyDepreciation = input.equipment.reduce((sum, item) => sum + item.value / item.lifeMonths, 0)
  const monthlyFixed = input.fixedExpenses.reduce((sum, item) => sum + item.value, 0) + monthlyDepreciation
  const fixedPercentage = monthlyFixed / input.monthlyRevenue * 100
  const variablePercentage = input.variableExpenses.reduce((sum, item) => sum + item.value, 0)
  const totalPercentage = fixedPercentage + variablePercentage + input.profit
  if (Number.isFinite(totalPercentage) && totalPercentage >= 100 && !errors.profit) {
    errors.profit = calculatorErrors.totalPercentage
  }
  const result = Object.keys(errors).length ? null : calculateAdvancedPricing(input)
  if (!Object.keys(errors).length && !result) {
    const recipeCost = input.ingredients.reduce((sum, item) => sum + (calculateIngredient(item)?.cost ?? NaN), 0)
    const laborCost = (input.productionTime / (input.timeUnit === 'minute' ? 60 : 1) / input.producedQuantity)
      * (input.monthlyPay / (input.hoursPerDay * input.daysPerMonth))
    errors.calculation = recipeCost / input.producedQuantity + laborCost === 0
      ? calculatorErrors.directCost : calculatorErrors.calculation
  }
  return { errors, missingFields, result, input, fixedPercentage, variablePercentage, totalPercentage, monthlyFixed, monthlyDepreciation }
}
