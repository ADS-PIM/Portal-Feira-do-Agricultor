import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon, { type IconName } from '../../components/Icon'
import { calculateMarkup, parsePricingNumber, parseProductionHours, type MarkupInput, type ProductionTimeUnit } from '../../utils/pricingCalculator'
import AdvancedPricingCalculator from './AdvancedPricingCalculator'
import PricingBreakEven, { BreakEvenExplanation } from './PricingBreakEven'
import { CalculatorDetails, ProductionSummary } from './CalculatorDetails'
import PercentageField from './PercentageField'
import CalculatorFieldHelp, { type CalculatorHelp } from './CalculatorFieldHelp'
import { CalculatorSteps, CalculatorStepActions } from './CalculatorSteps'
import ProductionTimeUnitField from './ProductionTimeUnitField'
import { calculatorErrors, getCalculatorNumberError } from './calculatorValidation'
import './PricingCalculatorPage.css'

type Field = keyof MarkupInput
type FormValues = Record<Field, string> & { timeUnit: ProductionTimeUnit }
type FieldDefinition = { name: Field; label: string; unit: string; hint: string; placeholder: string }

const calculatorMethods = [
  { id: 'main', label: 'Principal', icon: 'calculator' },
  { id: 'advanced', label: 'Avançada', icon: 'sliders' },
] as const
type CalculatorMethod = typeof calculatorMethods[number]['id']

const initialValues: FormValues = {
  materialCost: '', productionHours: '', hourlyRate: '', monthlyFixedExpenses: '',
  monthlyRevenue: '', variableExpenses: '0', profit: '0', timeUnit: 'hour',
}
const exampleValues: FormValues = {
  materialCost: '30,00', productionHours: '2', hourlyRate: '20,00', monthlyFixedExpenses: '1.000,00',
  monthlyRevenue: '10.000,00', variableExpenses: '5', profit: '30', timeUnit: 'hour',
}
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const preciseDecimal = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 17 })
function formatPercentage(value: number) {
  // Keep a valid denominator from appearing as zero after display rounding.
  const rounded = Number(value.toFixed(4))
  if (value > 0 && rounded === 0) return preciseDecimal.format(Number(value.toPrecision(4)))
  return (value < 100 && rounded === 100 ? preciseDecimal : decimal).format(value)
}
const fieldGroups: { title: string; icon: IconName; fields: FieldDefinition[] }[] = [
  {
    title: 'Produção de uma unidade', icon: 'box', fields: [
      { name: 'materialCost', label: 'Custo de material por unidade', unit: 'R$', placeholder: 'Ex.: 30,00', hint: 'Inclua materiais e embalagem, sem mão de obra.' },
      { name: 'productionHours', label: 'Tempo de produção da unidade', unit: 'horas', placeholder: 'Ex.: 2', hint: '' },
      { name: 'hourlyRate', label: 'Valor da hora', unit: 'R$', placeholder: 'Ex.: 20,00', hint: 'Pagamento pelo seu trabalho, separado do lucro.' },
    ],
  },
  {
    title: 'Seu negócio por mês', icon: 'store', fields: [
      { name: 'monthlyFixedExpenses', label: 'Despesas fixas mensais', unit: 'R$', placeholder: 'Ex.: 1.000,00', hint: 'Inclua aluguel, internet e outras contas do negócio.' },
      { name: 'monthlyRevenue', label: 'Faturamento médio mensal', unit: 'R$', placeholder: 'Ex.: 10.000,00', hint: 'Vendas do mês, antes de pagar as contas.' },
    ],
  },
  {
    title: 'Despesas e lucro sobre a venda', icon: 'percent', fields: [
      { name: 'variableExpenses', label: 'Despesas variáveis', unit: '%', placeholder: 'Ex.: 5', hint: 'Some as taxas e comissões sobre a venda.' },
      { name: 'profit', label: 'Lucro desejado', unit: '%', placeholder: 'Ex.: 30', hint: 'Parte da venda que sobra após todos os custos.' },
    ],
  },
]
const fields = fieldGroups.flatMap((group) => group.fields)
const percentageFields: Field[] = ['monthlyFixedExpenses', 'monthlyRevenue', 'variableExpenses', 'profit']

const fieldHelp: Record<Field, CalculatorHelp> = {
  materialCost: {
    lead: 'Some os materiais e a embalagem de uma unidade.',
    explanation: 'Se comprou material para vários produtos, conte apenas a parte usada em um deles.',
    example: 'Para fazer um pote de geleia, você usa R$ 4 em ingredientes e R$ 1 em embalagem. Preencha R$ 5.',
    effect: 'Esses R$ 5 entram no custo de cada pote. O tempo de preparo entra no campo de trabalho.',
  },
  productionHours: {
    lead: 'Conte o tempo de uma unidade.',
    explanation: 'Se faz várias de uma vez, divida o tempo de trabalho pela quantidade que ficou pronta para vender.',
    example: 'Você faz 10 potes em 2 horas. Divida 120 minutos por 10 e preencha 12. Na medida, escolha Minutos.',
    effect: 'Se sua hora vale R$ 20, os 12 minutos de preparo acrescentam R$ 4 ao custo de cada pote.',
  },
  hourlyRate: {
    lead: 'Informe o valor de uma hora do seu trabalho.',
    explanation: 'Para estimar esse valor, divida quanto quer receber no mês pelas horas que dedica à produção nesse período.',
    example: 'Se quer receber R$ 1.600 por 80 horas de produção no mês, preencha R$ 20.',
    effect: 'A R$ 20 por hora, meia hora de preparo custa R$ 10. Assim, o preço já inclui seu trabalho antes de calcular o lucro.',
  },
  monthlyFixedExpenses: {
    lead: 'Some as contas mensais do negócio.',
    explanation: 'Inclua gastos como aluguel e internet. Se divide uma conta com sua casa, conte apenas a parte do negócio. Se não houver gastos fixos, informe 0.',
    example: 'Você paga R$ 450 de aluguel pelo espaço de produção e usa R$ 50 de internet no negócio. Preencha R$ 500.',
    effect: 'Se as vendas somam R$ 5.000 por mês, essas contas consomem 10% do faturamento. A calculadora reserva R$ 1 de cada R$ 10 vendidos para pagá-las.',
  },
  monthlyRevenue: {
    lead: 'Use a média das vendas antes de descontar as despesas.',
    explanation: 'Some as vendas de todos os produtos em alguns meses e divida pelo número de meses. O campo precisa de um valor maior que zero.',
    example: 'Se vendeu R$ 4.000 em um mês e R$ 6.000 no seguinte, preencha R$ 5.000.',
    effect: 'A média serve para repartir as contas fixas entre as vendas. Estimar vendas acima do habitual pode deixar pouco dinheiro no preço para pagar essas contas.',
  },
  variableExpenses: {
    lead: 'Some as taxas que incidem sobre a mesma venda.',
    explanation: 'Use os percentuais cobrados pela maquininha, por comissão ou por outra taxa de venda. Se não paga essas taxas, informe 0.',
    example: 'Uma venda tem 3% de taxa da maquininha e 2% de comissão. Preencha 5.',
    effect: 'A cada R$ 20 vendidos, R$ 1 vai para essas taxas. A calculadora inclui essa parcela no preço sugerido.',
  },
  profit: {
    lead: 'Escolha quanto do preço final deve ficar como lucro.',
    explanation: 'Essa é a parte que sobra depois de cobrir materiais, trabalho e despesas.',
    example: 'Se quer guardar R$ 2 de lucro a cada R$ 10 vendidos, preencha 20%.',
    effect: 'Um percentual maior aumenta o preço sugerido. Despesas fixas, taxas e lucro devem somar menos de 100% para que sobre uma parte da venda para materiais e trabalho.',
  },
}

const steps = ['Produção unitaria', fieldGroups[1].title, 'Despesas e lucro']
const stepForField = (name: Field) => fieldGroups.findIndex(group => group.fields.some(field => field.name === name))

export default function PricingCalculatorPage() {
  const [activeMethod, setActiveMethod] = useState<CalculatorMethod>('main')
  const tabRefs = useRef<Partial<Record<CalculatorMethod, HTMLButtonElement | null>>>({})
  const [values, setValues] = useState<FormValues>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [step, setStep] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const incompleteSteps = fieldGroups.flatMap((group, index) => group.fields.some(({ name }) => !values[name].trim()) ? [index] : [])
  const numbers = {
    materialCost: parsePricingNumber(values.materialCost),
    productionHours: parseProductionHours(values.productionHours, values.timeUnit),
    hourlyRate: parsePricingNumber(values.hourlyRate),
    monthlyFixedExpenses: parsePricingNumber(values.monthlyFixedExpenses),
    monthlyRevenue: parsePricingNumber(values.monthlyRevenue),
    variableExpenses: parsePricingNumber(values.variableExpenses),
    profit: parsePricingNumber(values.profit),
  }
  const errors = Object.fromEntries(fields.map(({ name }) => [name, getCalculatorNumberError(values[name], {
    positive: name === 'monthlyRevenue',
    percentage: name === 'variableExpenses' || name === 'profit',
  })])) as Record<Field, string>

  const { materialCost, productionHours, hourlyRate, monthlyFixedExpenses, monthlyRevenue, variableExpenses, profit } = numbers
  const fixedRatio = monthlyFixedExpenses !== null && monthlyRevenue !== null && monthlyRevenue > 0
    ? monthlyFixedExpenses / monthlyRevenue * 100 : null
  const fixedPercentage = fixedRatio !== null && Number.isFinite(fixedRatio) ? fixedRatio : null
  const totalPercentage = fixedPercentage !== null && variableExpenses !== null && profit !== null
    ? fixedPercentage + variableExpenses + profit : null
  const invalidTotal = totalPercentage !== null && totalPercentage >= 100
  const directCost = materialCost !== null && productionHours !== null && hourlyRate !== null
    ? materialCost + productionHours * hourlyRate : null
  if (directCost === 0) errors.materialCost = calculatorErrors.directCost

  const calculated = materialCost !== null && productionHours !== null && hourlyRate !== null && monthlyFixedExpenses !== null
    && monthlyRevenue !== null && variableExpenses !== null && profit !== null
    ? calculateMarkup({ materialCost, productionHours, hourlyRate, monthlyFixedExpenses, monthlyRevenue, variableExpenses, profit }) : null
  const hasFieldErrors = fields.some(({ name }) => Boolean(errors[name]))
  const result = !hasFieldErrors ? calculated : null
  const calculationError = !hasFieldErrors && !invalidTotal && !calculated
    ? calculatorErrors.calculation : ''
  const isExample = result !== null && values.timeUnit === exampleValues.timeUnit && fields.every(({ name }) => values[name] === exampleValues[name])
  const breakdown = result ? [
    { label: 'Materiais', detail: 'Por unidade', amount: result.materialCost, className: 'materials' },
    { label: 'Mão de obra', detail: `${decimal.format(result.productionHours)} ${result.productionHours === 1 ? 'hora' : 'horas'} × ${currency.format(result.hourlyRate)}`, amount: result.laborCost, className: 'labor' },
    { label: 'Despesas fixas', detail: `${formatPercentage(result.fixedPercentage)}% do preço`, amount: result.fixedExpensesAmount, className: 'fixed' },
    { label: 'Despesas variáveis', detail: `${formatPercentage(result.variableExpenses)}% do preço`, amount: result.variableExpensesAmount, className: 'variable' },
    { label: 'Lucro desejado', detail: `${formatPercentage(result.profit)}% do preço`, amount: result.profitAmount, className: 'profit' },
  ] : []

  function selectMethod(method: CalculatorMethod) {
    setActiveMethod(method)
    tabRefs.current[method]?.focus()
  }

  function navigateMethods(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % calculatorMethods.length; break
      case 'ArrowLeft': nextIndex = (index - 1 + calculatorMethods.length) % calculatorMethods.length; break
      case 'Home': nextIndex = 0; break
      case 'End': nextIndex = calculatorMethods.length - 1; break
      default: return
    }
    event.preventDefault()
    selectMethod(calculatorMethods[nextIndex].id)
  }

  function updateValue(name: Field, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }))
    setTouched(previous => ({ ...previous, [name]: true }))
  }

  function showStep(target: number, name?: Field) {
    setStep(target)
    requestAnimationFrame(() => {
      const field = name ? formRef.current?.elements.namedItem(name)
        : formRef.current?.querySelector(`fieldset[data-step="${target}"] legend`)
      if (field instanceof HTMLElement) field.focus()
    })
  }

  function goToStep(target: number) {
    setTouched(previous => ({ ...previous, ...Object.fromEntries(fieldGroups[step].fields.map(field => [field.name, true])) }))
    showStep(target)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step < steps.length - 1) {
      goToStep(step + 1)
      return
    }
    const firstInvalid = fields.find(({ name }) => errors[name])?.name
      ?? (invalidTotal ? 'profit' : calculationError ? 'materialCost' : null)
    if (firstInvalid) {
      setTouched(previous => ({ ...previous, [firstInvalid]: true }))
      showStep(stepForField(firstInvalid), firstInvalid)
    }
  }

  function useExample() {
    setValues(exampleValues)
    setTouched({})
    setStep(0)
  }

  function clearFields() {
    setValues(initialValues)
    setTouched({})
    showStep(0, 'materialCost')
  }

  return (
    <>
      <Header initialActiveLink="/calculadora" />
      <main className="markup-page">
        <div className="markup-shell">
          <header className="markup-heading">
            <span className="markup-heading-icon"><Icon name="calculator" /></span>
            <div>
              <h1>Calculadora de precificação</h1>
              <p>Valorize seu trabalho. Encontre um preço que cubra seus custos e seu lucro.</p>
            </div>
          </header>

          <div className="markup-calculator-tabs" role="tablist" aria-label="Metodologia de precificação">
            {calculatorMethods.map((method, index) => (
              <button
                key={method.id}
                ref={(element) => { tabRefs.current[method.id] = element }}
                className="markup-calculator-tab"
                type="button"
                role="tab"
                id={`markup-tab-${method.id}`}
                aria-controls={`markup-panel-${method.id}`}
                aria-selected={activeMethod === method.id}
                tabIndex={activeMethod === method.id ? 0 : -1}
                onClick={() => selectMethod(method.id)}
                onKeyDown={(event) => navigateMethods(event, index)}
              >
                <Icon name={method.icon} />
                <span>{method.label}</span>
              </button>
            ))}
          </div>

          <div
            className="markup-calculator-panel"
            role="tabpanel"
            id="markup-panel-main"
            aria-labelledby="markup-tab-main"
            hidden={activeMethod !== 'main'}
            tabIndex={0}
          >
            <div className="markup-layout">
              <section className="markup-form-panel" aria-labelledby="markup-form-title">
                <div className="markup-panel-heading">
                  <h2 id="markup-form-title">Vamos calcular?</h2>
                  <button className="markup-example" type="button" onClick={useExample}>Usar exemplo</button>
                </div>

                <p className="markup-help-intro">
                  Preencha por etapas. <strong>Toque em ? para ver explicações e exemplos.</strong>
                </p>
                <form ref={formRef} className="markup-form" onSubmit={handleSubmit} autoComplete="off" noValidate>
                  <CalculatorSteps steps={steps} current={step} incompleteSteps={incompleteSteps} onSelect={goToStep} label="Etapas da calculadora simples" />
                  {fieldGroups.map((group, index) => (
                    <fieldset className="markup-field-group" key={group.title} data-step={index} hidden={step !== index}>
                      <legend tabIndex={-1}><Icon name={group.icon} /> {index + 1}. {group.title}</legend>
                      {group.fields.map(({ name, label, unit, hint, placeholder }) => {
                        const error = touched[name] ? errors[name] : ''
                        const hasTotalError = percentageFields.includes(name) && invalidTotal
                        if (unit === '%') return <PercentageField key={name} id={`markup-${name}`} name={name}
                          label={label} value={values[name]} onChange={value => updateValue(name, value)}
                          onBlur={() => setTouched(previous => ({ ...previous, [name]: true }))}
                          hint={hint} error={error} invalid={hasTotalError}
                          describedBy={hasTotalError ? 'markup-total-error' : undefined}
                          help={<CalculatorFieldHelp label={label} help={fieldHelp[name]} />} />
                        const inputField = (
                          <div className="markup-field" key={name}>
                            <div className="markup-field-heading">
                              <label htmlFor={`markup-${name}`}>{label}</label>
                              <CalculatorFieldHelp label={label} help={fieldHelp[name]} />
                            </div>
                            <div className={`markup-input-wrap${error || hasTotalError ? ' has-error' : ''}`}>
                              {unit === 'R$' && <span id={`markup-${name}-unit`}>R$</span>}
                              <input
                                id={`markup-${name}`}
                                name={name}
                                type="text"
                                inputMode="decimal"
                                maxLength={20}
                                value={values[name]}
                                placeholder={name === 'productionHours' && values.timeUnit === 'minute' ? 'Ex.: 30' : placeholder}
                                required
                                aria-invalid={Boolean(error) || hasTotalError}
                                aria-describedby={`markup-${name}-unit${hint && !error && !hasTotalError ? ` markup-${name}-hint` : ''}${error ? ` markup-${name}-error` : ''}${hasTotalError ? ' markup-total-error' : ''}`}
                                onChange={(event) => {
                                  updateValue(name, event.currentTarget.value)
                                }}
                                onBlur={() => setTouched((previous) => ({ ...previous, [name]: true }))}
                              />
                              {unit !== 'R$' && <span id={`markup-${name}-unit`}>{name === 'productionHours' && values.timeUnit === 'minute' ? 'minutos' : unit}</span>}
                            </div>
                            {hint && !error && !hasTotalError && <p id={`markup-${name}-hint`} className="markup-hint">{hint}</p>}
                            {error && <p id={`markup-${name}-error`} className="markup-error">{error}</p>}
                          </div>
                        )
                        return name === 'productionHours' ? (
                          <div className="markup-time-fields markup-measurement-fields" key={name}>
                            {inputField}
                            <ProductionTimeUnitField id="markup-timeUnit" value={values.timeUnit}
                              onChange={timeUnit => setValues(previous => ({ ...previous, timeUnit }))} />
                          </div>
                        ) : inputField
                      })}
                      {group.icon === 'store' && (
                        <>
                          <div className="markup-fixed-percentage">
                            <span>Despesas fixas ÷ faturamento × 100</span>
                            <strong>{fixedPercentage !== null ? `${formatPercentage(fixedPercentage)}%` : '—'}</strong>
                          </div>
                          {monthlyFixedExpenses === 0 && <p id="markup-revenue-effect" className="markup-hint">Sem despesas fixas, o faturamento não altera o preço.</p>}
                        </>
                      )}
                    </fieldset>
                  ))}

                  <div className="markup-total-section" hidden={step !== steps.length - 1}>
                    <div className={`markup-total${invalidTotal ? ' has-error' : ''}`}>
                      <span>{totalPercentage !== null
                        ? `Fixas ${formatPercentage(fixedPercentage!)}% + variáveis ${formatPercentage(variableExpenses!)}% + lucro ${formatPercentage(profit!)}%`
                        : 'Despesas fixas + variáveis + lucro'}</span>
                      <strong>{totalPercentage !== null ? `${formatPercentage(totalPercentage)}%` : '—'}</strong>
                    </div>
                    {invalidTotal ? (
                      <p id="markup-total-error" className="markup-error" role="alert">{calculatorErrors.totalPercentage}</p>
                    ) : <p className="markup-hint">A soma deve ficar abaixo de 100%.</p>}
                    {calculationError && <p className="markup-error" role="alert">{calculationError}</p>}
                  </div>
                  <CalculatorStepActions current={step} count={steps.length} onBack={() => goToStep(step - 1)} onClear={clearFields} />
                </form>
              </section>

              <aside className="markup-result-panel" aria-labelledby="markup-result-title">
                <div className="markup-result-card">
                  <div className="markup-result-heading">
                    <span className="markup-step">SEU RESULTADO</span>
                    {isExample && <span className="markup-example-badge">Exemplo preenchido</span>}
                  </div>
                  <h2 id="markup-result-title">Preço de venda por unidade</h2>
                  <div className="markup-price-area" role="status" aria-live="polite" aria-atomic="true">
                    <strong className="markup-price">{result ? currency.format(result.price) : 'R$ —'}</strong>
                    <p>{result ? 'Preço atualizado com os custos e percentuais informados.' : invalidTotal
                      ? 'Ajuste os percentuais para ver o preço.' : 'Preencha ou corrija os campos necessários para ver seu preço.'}</p>
                  </div>
                  <div className="markup-multiplier"><span>Multiplicador markup</span><strong>{result ? `${decimal.format(result.multiplier)}×` : '—'}</strong></div>
                  <PricingBreakEven result={result} titleId="markup-break-even-title" />
                </div>

                <section className="markup-breakdown" aria-labelledby="markup-breakdown-title">
                  <h3 id="markup-breakdown-title">Para onde vai cada parte do preço?</h3>
                  <p className="markup-hint">Distribuição do valor de uma unidade vendida.</p>
                  {result ? (
                    <>
                      <div className="markup-bar" aria-hidden="true">{breakdown.map((item) => <span key={item.className} className={item.className} style={{ width: `${item.amount / result.price * 100}%` }} />)}</div>
                      <dl>{breakdown.map((item) => (
                        <div key={item.className}>
                          <dt><span className={`markup-dot ${item.className}`} /><span className="markup-breakdown-label">{item.label}<small>{item.detail}</small></span></dt>
                          <dd>{currency.format(item.amount)}</dd>
                        </div>
                      ))}</dl>
                      <div className="markup-breakdown-total"><span>Preço de venda</span><strong>{currency.format(result.price)}</strong></div>
                      <p className="markup-hint">Valores arredondados para duas casas decimais.</p>
                    </>
                  ) : <p className="markup-empty">Preencha os dados para ver os materiais, a mão de obra, as despesas e o lucro de cada unidade.</p>}
                </section>
              </aside>

              <div className="markup-details-stack">
                <ProductionSummary rows={[
                  ['Material por unidade', result ? currency.format(result.materialCost) : 'R$ —'],
                  ['Tempo de trabalho por unidade', result ? `${decimal.format(result.productionHours)} h` : '—'],
                  ['Valor da sua hora', result ? currency.format(result.hourlyRate) : 'R$ —'],
                  ['Mão de obra por unidade', result ? currency.format(result.laborCost) : 'R$ —'],
                  ['Custo-base por unidade', result ? currency.format(result.directCost) : 'R$ —'],
                ]} />
                <CalculatorDetails title="Como chegamos a esse preço">
                  <div className="markup-guide-steps">
                    <div>
                      <h3>Custo direto por unidade</h3>
                      <p>{result ? `${currency.format(result.materialCost)} + (${decimal.format(result.productionHours)} h × ${currency.format(result.hourlyRate)})` : 'Material + (horas × valor da hora)'}</p>
                      <strong>{result ? currency.format(result.directCost) : 'R$ —'}</strong>
                      <p className="markup-hint">Material + mão de obra, sem duplicar custos.</p>
                    </div>
                    <div>
                      <h3>Percentuais sobre a venda</h3>
                      <p>{result ? `${formatPercentage(result.fixedPercentage)}% fixas + ${formatPercentage(result.variableExpenses)}% variáveis + ${formatPercentage(result.profit)}% lucro` : 'Fixas % + variáveis % + lucro %'}</p>
                      <strong>{result ? `${formatPercentage(result.totalPercentage)}%` : '—'}</strong>
                      <p className="markup-hint">{result ? `Fixas = ${currency.format(result.monthlyFixedExpenses)} ÷ ${currency.format(result.monthlyRevenue)} × 100.` : 'Fixas = despesas fixas mensais ÷ faturamento mensal × 100.'}</p>
                    </div>
                    <div>
                      <h3>Preço de venda por unidade</h3>
                      <p>{result ? `(${currency.format(result.directCost)} × 100) ÷ (100 − ${formatPercentage(result.totalPercentage)})` : '(Custo direto × 100) ÷ (100 − percentuais)'}</p>
                      <strong>{result ? currency.format(result.price) : 'R$ —'}</strong>
                      <p className="markup-hint">{result ? `Divisor de ${formatPercentage(100 - result.totalPercentage)}%: a parcela que cobre o custo direto.` : 'A parcela restante do preço cobre o custo direto.'}</p>
                    </div>
                  </div>
                  <p className="markup-formula">Preço = [(material + horas × valor da hora) × 100] ÷ [100 − ((despesas fixas mensais ÷ faturamento mensal × 100) + variáveis % + lucro %)]</p>
                </CalculatorDetails>
                <BreakEvenExplanation result={result} />
              </div>
            </div>
            <p className="markup-disclaimer">Simulação ilustrativa por unidade. Ajuste os valores à realidade do seu negócio.</p>
          </div>

          <div
            className="markup-calculator-panel"
            role="tabpanel"
            id="markup-panel-advanced"
            aria-labelledby="markup-tab-advanced"
            hidden={activeMethod !== 'advanced'}
            tabIndex={0}
          >
            <AdvancedPricingCalculator />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
