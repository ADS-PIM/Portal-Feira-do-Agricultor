import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateMarkup, parsePricingNumber } from '../src/utils/pricingCalculator.ts'

test('reproduces the document example without rounding the multiplier first', () => {
  const result = calculateMarkup({ cost: 30, expenses: 10, taxes: 5, profit: 30 })!
  assert.equal(result.price.toFixed(2), '54.55')
  assert.equal(result.multiplier.toFixed(4), '1.8182')
  assert.ok(Math.abs(result.price - (result.cost + result.expensesAmount + result.taxesAmount + result.profitAmount)) < 1e-10)
  assert.ok(Math.abs(result.profitAmount / result.price - 0.3) < 1e-10)
})

test('zero percentages return the original cost', () => {
  const result = calculateMarkup({ cost: 2.5, expenses: 0, taxes: 0, profit: 0 })!
  assert.equal(result.price, 2.5)
  assert.equal(result.multiplier, 1)
  assert.equal(result.profitAmount, 0)
})

test('rejects totals equal to or greater than 100 percent', () => {
  for (const profit of [85, 90, 100]) {
    assert.equal(calculateMarkup({ cost: 30, expenses: 10, taxes: 5, profit }), null)
  }
})

test('accepts valid percentages near the limit and fractional costs', () => {
  const result = calculateMarkup({ cost: 0.01, expenses: 0, taxes: 0, profit: 99.99 })!
  assert.equal(result.price.toFixed(2), '100.00')
})

test('rejects invalid numeric inputs and overflow', () => {
  const valid = { cost: 30, expenses: 10, taxes: 5, profit: 30 }
  for (const key of ['cost', 'expenses', 'taxes', 'profit']) {
    for (const value of [-1, NaN, Infinity]) {
      assert.equal(calculateMarkup({ ...valid, [key]: value }), null)
    }
  }
  assert.equal(calculateMarkup({ ...valid, cost: 0 }), null)
  assert.equal(calculateMarkup({ ...valid, cost: Number.MAX_VALUE, profit: 80 }), null)
})

test('accepts comma or dot decimals and does not silently parse malformed values', () => {
  for (const value of ['30,50', '30.50', ' 30,50 ']) assert.equal(parsePricingNumber(value), 30.5)
  assert.equal(parsePricingNumber('0'), 0)
  for (const value of ['', ' ', '-5', 'abc', '30reais', '1,2,3', '1.000,00', '1e3', 'Infinity']) {
    assert.equal(parsePricingNumber(value), null)
  }
})
