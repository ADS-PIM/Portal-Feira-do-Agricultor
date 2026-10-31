import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
after(() => server.close())
const { calculateIngredient, calculateAdvancedPricing } = await server.ssrLoadModule('/src/utils/advancedPricingCalculator.ts')
const { emptyAdvancedForm, exampleAdvancedForm, evaluateAdvancedForm } = await server.ssrLoadModule('/src/pages/pricingCalculatorPage/advancedPricingForm.ts')
const { calculateMarkup, parseProductionHours } = await server.ssrLoadModule('/src/utils/pricingCalculator.ts')
const almost = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-12, `${actual} != ${expected}`)
const example = () => evaluateAdvancedForm(exampleAdvancedForm())

test('simple calculator converts production minutes to hours before calculating labor and markup', () => {
    const base = { materialCost: 30, hourlyRate: 20, monthlyFixedExpenses: 1000, monthlyRevenue: 10000, variableExpenses: 5, profit: 30 }
    const hours = calculateMarkup({ ...base, productionHours: parseProductionHours('2', 'hour') })
    const minutes = calculateMarkup({ ...base, productionHours: parseProductionHours('120', 'minute') })
    assert.deepEqual(minutes, hours)
    const halfHour = calculateMarkup({ ...base, productionHours: parseProductionHours('30', 'minute') })
    assert.equal(halfHour.productionHours, 0.5)
    assert.equal(halfHour.laborCost, 10)
    almost(halfHour.price, 40 / 0.55)
    assert.equal(parseProductionHours('1,5', 'hour'), parseProductionHours('90', 'minute'))
    assert.equal(parseProductionHours('0', 'minute'), 0)
    for (const value of ['', 'abc', '-30']) assert.equal(parseProductionHours(value, 'minute'), null)
    assert.equal(parseProductionHours('30', 'day'), null)
})

test('the photographed recipe converts purchase/use quantities and keeps precision until display', () => {
    const { result, errors } = example()
    assert.deepEqual(errors, {})
    assert.deepEqual(result.ingredients.map(item => item.recipeYield), [2, 10, 2, 5, 80, 100])
    assert.deepEqual(result.ingredients.map(item => item.cost), [2.4, 0.32, 6, 8, 1.5625, 0.05])
    almost(result.recipeCost, 18.3325)
    almost(result.materialCost, 9.16625)
    assert.equal(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.materialCost), 'R$\u00a09,17')
})

test('labor, depreciation, fixed percentages and markup follow all consolidated steps', () => {
    const { result } = example()
    assert.equal(result.monthlyProductiveHours, 160)
    assert.equal(result.hourlyRate, 10)
    assert.equal(result.timePerUnit, 1)
    assert.equal(result.laborCost, 10)
    assert.equal(result.monthlyDepreciation, 20)
    assert.equal(result.monthlyFixedExpenses, 1000)
    assert.equal(result.fixedPercentage, 10)
    assert.equal(result.variableExpenses, 5)
    almost(result.directCost, 19.16625)
    almost(result.multiplier, 100 / 55)
    almost(result.price, 34.847727272727276)
    almost(result.batchPrice, result.price * 2)
    almost(result.materialCost + result.laborCost + result.fixedExpensesAmount + result.variableExpensesAmount + result.profitAmount, result.price)
    almost(result.profitAmount / result.price, 0.3)
})

test('kg/g, L/mL and hours/minutes conversions agree; incompatible measures are rejected', () => {
    const base = { name: 'Insumo', purchasedQuantity: 1, purchasedUnit: 'kg', purchaseValue: 12, usedQuantity: 500, usedUnit: 'g' }
    assert.equal(calculateIngredient(base).cost, 6)
    assert.equal(calculateIngredient({ ...base, purchasedUnit: 'l', usedUnit: 'ml' }).cost, 6)
    assert.equal(calculateIngredient({ ...base, purchasedUnit: 'hour', usedUnit: 'minute', usedQuantity: 30 }).cost, 6)
    assert.equal(calculateIngredient({ ...base, purchasedUnit: 'kg', usedUnit: 'ml' }), null)
    assert.equal(calculateIngredient({ ...base, purchasedQuantity: 0 }), null)
    assert.equal(calculateIngredient({ ...base, usedQuantity: 0 }), null)
    assert.equal(calculateIngredient({ ...base, purchaseValue: -1 }), null)
    assert.equal(calculateIngredient({ ...base, purchasedQuantity: NaN }), null)
    assert.equal(calculateIngredient({ ...base, purchasedQuantity: Number.MAX_VALUE }), null)
})

test('multiple purchased packages account for package contents and batches can consume more than one package', () => {
    const base = { name: 'Embalagem', purchasedQuantity: 2, purchasedUnit: 'package', packageQuantity: 100,
        packageUnit: 'unit', purchaseValue: 10, usedQuantity: 20, usedUnit: 'unit' }
    assert.equal(calculateIngredient(base).recipeYield, 10)
    assert.equal(calculateIngredient(base).cost, 1)
    assert.equal(calculateIngredient({ ...base, packageQuantity: 0 }), null)
    assert.equal(calculateIngredient({ ...base, usedQuantity: 400 }).cost, 20)
})

test('production minutes and hours give the same per-unit labor without double counting the batch', () => {
    const { input, result } = example()
    const fromMinutes = calculateAdvancedPricing({ ...input, productionTime: 120, timeUnit: 'minute' })
    almost(fromMinutes.price, result.price)
    assert.equal(fromMinutes.timePerUnit, 1)
    const fourUnits = calculateAdvancedPricing({ ...input, producedQuantity: 4 })
    almost(fourUnits.price, result.price / 2)
})

test('zero denominators, impossible work schedules and a percentage sum of 100 or more block results', () => {
    const { input } = example()
    for (const overrides of [{ producedQuantity: 0 }, { hoursPerDay: 0 }, { hoursPerDay: 25 }, { daysPerMonth: 0 },
        { daysPerMonth: 32 }, { monthlyRevenue: 0 }, { profit: 85 }, { profit: 86 }, { monthlyPay: Infinity },
        { monthlyPay: -1 }, { productName: ' ' }, { ingredients: [] }, { equipment: [{ name: 'Forno', value: 1200, lifeMonths: 0 }] }]) {
        assert.equal(calculateAdvancedPricing({ ...input, ...overrides }), null, JSON.stringify(overrides))
    }
    assert.ok(calculateAdvancedPricing({ ...input, profit: 84.9 }))
})

test('optional lists can be empty and manual fields accept Brazilian decimal commas with helpful errors', () => {
    const values = exampleAdvancedForm()
    values.fixedExpenses = []
    values.variableExpenses = []
    values.equipment = []
    const { result } = evaluateAdvancedForm(values)
    assert.ok(result)
    assert.equal(result.monthlyFixedExpenses, 0)
    assert.equal(result.monthlyDepreciation, 0)
    const empty = emptyAdvancedForm()
    assert.equal(evaluateAdvancedForm(empty).result, null)
    assert.ok(evaluateAdvancedForm(empty).errors.productName)
    values.producedQuantity = '0'
    assert.match(evaluateAdvancedForm(values).errors.producedQuantity, /maior que zero/)
    values.producedQuantity = '2'
    values.ingredients[0].usedUnit = 'ml'
    assert.match(evaluateAdvancedForm(values).errors[`ingredients.${values.ingredients[0].id}.usedUnit`], /compatíveis/)
})

test('the advanced result equals the existing simple calculator when provided the derived unit costs', () => {
    const { result } = example()
    const simple = calculateMarkup({ materialCost: result.materialCost, productionHours: result.timePerUnit,
        hourlyRate: result.hourlyRate, monthlyFixedExpenses: result.monthlyFixedExpenses,
        monthlyRevenue: result.monthlyRevenue, variableExpenses: result.variableExpenses, profit: result.profit })
    almost(simple.price, result.price)
    almost(simple.multiplier, result.multiplier)
})

test('editable percentages accept decimal commas and identify the field outside the permitted interval', () => {
    const values = exampleAdvancedForm()
    values.profit = '12,5'
    assert.ok(evaluateAdvancedForm(values).result)
    values.variableExpenses[0].value = '100'
    const field = `variableExpenses.${values.variableExpenses[0].id}.value`
    assert.match(evaluateAdvancedForm(values).errors[field], /menor que 100/)
    assert.equal(evaluateAdvancedForm(values).result, null)
    values.variableExpenses[0].value = '3'
    values.profit = '-1'
    assert.ok(evaluateAdvancedForm(values).errors.profit)
    assert.equal(evaluateAdvancedForm(values).result, null)
})

test('revenue changes the fixed-cost percentage and markup; without fixed costs it does not affect price', () => {
    const { input, result } = example()
    const higherRevenue = calculateAdvancedPricing({ ...input, monthlyRevenue: 20000 })
    assert.equal(higherRevenue.fixedPercentage, 5)
    assert.equal(higherRevenue.materialCost, result.materialCost)
    assert.equal(higherRevenue.laborCost, result.laborCost)
    almost(higherRevenue.price, 31.94375)
    assert.ok(higherRevenue.price < result.price)

    const withoutFixed = { ...input, fixedExpenses: [], equipment: [] }
    const originalRevenue = calculateAdvancedPricing(withoutFixed)
    const changedRevenue = calculateAdvancedPricing({ ...withoutFixed, monthlyRevenue: 555555 })
    assert.equal(changedRevenue.fixedPercentage, 0)
    almost(changedRevenue.price, originalRevenue.price)
})
