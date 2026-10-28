import { calculateMarkup } from './pricingCalculator'

export const PRICING_UNITS = {
  kg: { label: 'kg', dimension: 'mass', factor: 1000 },
  g: { label: 'g', dimension: 'mass', factor: 1 },
  l: { label: 'L', dimension: 'volume', factor: 1000 },
  ml: { label: 'mL', dimension: 'volume', factor: 1 },
  unit: { label: 'unidades', dimension: 'count', factor: 1 },
  hour: { label: 'horas', dimension: 'time', factor: 60 },
  minute: { label: 'minutos', dimension: 'time', factor: 1 },
} as const

export type PricingUnit = keyof typeof PRICING_UNITS
export type RecipeIngredient = {
  name: string
  purchasedQuantity: number
  purchasedUnit: PricingUnit | 'package'
  purchaseValue: number
  usedQuantity: number
  usedUnit: PricingUnit
  packageQuantity?: number
  packageUnit?: PricingUnit
}
export type NamedExpense = { name: string; value: number }
export type Equipment = { name: string; value: number; lifeMonths: number }
export type AdvancedPricingInput = {
  productName: string
  producedQuantity: number
  productionTime: number
  timeUnit: 'hour' | 'minute'
  ingredients: RecipeIngredient[]
  monthlyPay: number
  hoursPerDay: number
  daysPerMonth: number
  fixedExpenses: NamedExpense[]
  equipment: Equipment[]
  monthlyRevenue: number
  variableExpenses: NamedExpense[]
  profit: number
}

const nonnegative = (value: number) => Number.isFinite(value) && value >= 0
const positive = (value: number) => Number.isFinite(value) && value > 0

export function calculateIngredient(ingredient: RecipeIngredient) {
  const { purchasedQuantity, purchasedUnit, purchaseValue, usedQuantity, usedUnit } = ingredient
  const unit = purchasedUnit === 'package' ? ingredient.packageUnit : purchasedUnit
  if (!unit || !PRICING_UNITS[unit] || !PRICING_UNITS[usedUnit]
    || !positive(purchasedQuantity) || !positive(usedQuantity) || !nonnegative(purchaseValue)
    || (purchasedUnit === 'package' && !positive(ingredient.packageQuantity ?? 0))) return null
  if (PRICING_UNITS[unit].dimension !== PRICING_UNITS[usedUnit].dimension) return null

  const purchasedBase = purchasedQuantity * PRICING_UNITS[unit].factor
    * (purchasedUnit === 'package' ? ingredient.packageQuantity! : 1)
  const usedBase = usedQuantity * PRICING_UNITS[usedUnit].factor
  const recipeYield = purchasedBase / usedBase
  const cost = purchaseValue / recipeYield
  if (![purchasedBase, usedBase, recipeYield].every(positive) || !nonnegative(cost)) return null
  return { ...ingredient, recipeYield, cost }
}

export function calculateAdvancedPricing(input: AdvancedPricingInput) {
  if (!input.productName.trim() || !positive(input.producedQuantity)
    || !nonnegative(input.productionTime) || !['hour', 'minute'].includes(input.timeUnit)
    || !nonnegative(input.monthlyPay) || !positive(input.hoursPerDay) || input.hoursPerDay > 24
    || !positive(input.daysPerMonth) || input.daysPerMonth > 31
    || !positive(input.monthlyRevenue) || !nonnegative(input.profit)
    || input.ingredients.length === 0) return null

  const ingredients = input.ingredients.map(calculateIngredient)
  if (ingredients.some(item => !item || !item.name.trim())) return null
  if ([...input.fixedExpenses, ...input.variableExpenses].some(item => !item.name.trim() || !nonnegative(item.value))) return null
  if (input.equipment.some(item => !item.name.trim() || !nonnegative(item.value) || !positive(item.lifeMonths))) return null

  const recipeCost = ingredients.reduce((sum, item) => sum + item!.cost, 0)
  const materialCost = recipeCost / input.producedQuantity
  const monthlyProductiveHours = input.hoursPerDay * input.daysPerMonth
  const hourlyRate = input.monthlyPay / monthlyProductiveHours
  const batchHours = input.productionTime / (input.timeUnit === 'minute' ? 60 : 1)
  const timePerUnit = batchHours / input.producedQuantity
  const equipment = input.equipment.map(item => ({ ...item, monthlyDepreciation: item.value / item.lifeMonths }))
  const monthlyDepreciation = equipment.reduce((sum, item) => sum + item.monthlyDepreciation, 0)
  const fixedExpensesTotal = input.fixedExpenses.reduce((sum, item) => sum + item.value, 0)
  const monthlyFixedExpenses = fixedExpensesTotal + monthlyDepreciation
  const variableExpenses = input.variableExpenses.reduce((sum, item) => sum + item.value, 0)
  const values = [recipeCost, materialCost, monthlyProductiveHours, hourlyRate, batchHours, timePerUnit,
    monthlyDepreciation, fixedExpensesTotal, monthlyFixedExpenses, variableExpenses]
  if (!values.every(nonnegative)) return null

  const markup = calculateMarkup({ materialCost, productionHours: timePerUnit, hourlyRate,
    monthlyFixedExpenses, monthlyRevenue: input.monthlyRevenue, variableExpenses, profit: input.profit })
  if (!markup || !nonnegative(markup.price * input.producedQuantity)) return null

  return { ...markup, productName: input.productName.trim(),
    producedQuantity: input.producedQuantity, ingredients: ingredients.map(item => item!), equipment,
    recipeCost, monthlyProductiveHours, timePerUnit, monthlyDepreciation, fixedExpensesTotal,
    batchPrice: markup.price * input.producedQuantity }
}

export type AdvancedPricingResult = NonNullable<ReturnType<typeof calculateAdvancedPricing>>
