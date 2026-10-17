export type MarkupInput = {
  materialCost: number
  productionHours: number
  hourlyRate: number
  monthlyFixedExpenses: number
  monthlyRevenue: number
  variableExpenses: number
  profit: number
}

// A single dot is a decimal separator ("1.000" means 1). Brazilian thousands
// grouping requires a decimal comma ("1.000,00" means 1000) to avoid ambiguity.
export function parsePricingNumber(value: string): number | null {
  const normalized = value.trim()
  const isDecimal = /^\d+(?:[.,]\d+)?$/.test(normalized)
  const isBrazilianGrouped = /^\d{1,3}(?:\.\d{3})+,\d+$/.test(normalized)
  if (!isDecimal && !isBrazilianGrouped) return null

  const number = Number(
    (isBrazilianGrouped ? normalized.replaceAll('.', '') : normalized).replace(',', '.'),
  )
  return Number.isFinite(number) ? number : null
}

export function calculateMarkup(input: MarkupInput) {
  const {
    materialCost,
    productionHours,
    hourlyRate,
    monthlyFixedExpenses,
    monthlyRevenue,
    variableExpenses,
    profit,
  } = input
  const values = [materialCost, productionHours, hourlyRate, monthlyFixedExpenses, monthlyRevenue, variableExpenses, profit]
  if (values.some((value) => !Number.isFinite(value) || value < 0) || monthlyRevenue <= 0) {
    return null
  }

  const laborCost = productionHours * hourlyRate
  const directCost = materialCost + laborCost
  const fixedPercentage = monthlyFixedExpenses / monthlyRevenue * 100
  const totalPercentage = fixedPercentage + variableExpenses + profit
  if (!Number.isFinite(directCost) || directCost <= 0 || !Number.isFinite(totalPercentage) || totalPercentage >= 100) {
    return null
  }

  const multiplier = 100 / (100 - totalPercentage)
  const price = directCost * multiplier
  const fixedExpensesAmount = price * (fixedPercentage / 100)
  const variableExpensesAmount = price * (variableExpenses / 100)
  const profitAmount = price * (profit / 100)
  if ([multiplier, price, fixedExpensesAmount, variableExpensesAmount, profitAmount].some((value) => !Number.isFinite(value))) {
    return null
  }

  // Keep full precision until display; each percentage is a share of the sale price.
  return {
    ...input,
    fixedPercentage,
    laborCost,
    directCost,
    totalPercentage,
    multiplier,
    price,
    fixedExpensesAmount,
    variableExpensesAmount,
    profitAmount,
  }
}
