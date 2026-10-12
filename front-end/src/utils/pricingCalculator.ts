export type MarkupInput = {
  cost: number
  expenses: number
  taxes: number
  profit: number
}

// Accept either decimal separator, without silently accepting partial numbers.
export function parsePricingNumber(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(normalized)) return null
  const number = Number(normalized.replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

export function calculateMarkup({ cost, expenses, taxes, profit }: MarkupInput) {
  const values = [cost, expenses, taxes, profit]
  const totalPercentage = expenses + taxes + profit
  if (values.some((value) => !Number.isFinite(value) || value < 0) || cost <= 0 || totalPercentage >= 100) {
    return null
  }

  const multiplier = 1 / (1 - totalPercentage / 100)
  const price = cost * multiplier
  if (!Number.isFinite(price)) return null

  // Keep full precision until display; each percentage is a share of the sale price.
  return {
    multiplier,
    price,
    cost,
    totalPercentage,
    expensesAmount: price * expenses / 100,
    taxesAmount: price * taxes / 100,
    profitAmount: price * profit / 100,
  }
}
