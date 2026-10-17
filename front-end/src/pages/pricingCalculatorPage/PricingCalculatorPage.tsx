import { useRef, useState, type FormEvent } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon, { type IconName } from '../../components/Icon'
import { calculateMarkup, parsePricingNumber, type MarkupInput } from '../../utils/pricingCalculator'
import './PricingCalculatorPage.css'

type Field = keyof MarkupInput
type FormValues = Record<Field, string>
type FieldDefinition = { name: Field; label: string; unit: string; hint: string; placeholder: string }

const initialValues: FormValues = {
  materialCost: '', productionHours: '', hourlyRate: '', monthlyFixedExpenses: '0',
  monthlyRevenue: '', variableExpenses: '0', profit: '0',
}
const exampleValues: FormValues = {
  materialCost: '30,00', productionHours: '2', hourlyRate: '20,00', monthlyFixedExpenses: '1.000,00',
  monthlyRevenue: '10.000,00', variableExpenses: '5', profit: '30',
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
      { name: 'materialCost', label: 'Custo de material por unidade', unit: 'R$', placeholder: 'Ex.: 30,00', hint: 'Somente materiais e embalagem. A mão de obra é calculada separadamente.' },
      { name: 'productionHours', label: 'Tempo de produção da unidade', unit: 'horas', placeholder: 'Ex.: 2', hint: 'Tempo gasto para produzir uma unidade.' },
      { name: 'hourlyRate', label: 'Valor da hora', unit: 'R$', placeholder: 'Ex.: 20,00', hint: 'Quanto vale uma hora do seu trabalho.' },
    ],
  },
  {
    title: 'Seu negócio por mês', icon: 'store', fields: [
      { name: 'monthlyFixedExpenses', label: 'Despesas fixas mensais', unit: 'R$', placeholder: 'Ex.: 1.000,00', hint: 'Ex.: aluguel, internet e contas fixas.' },
      { name: 'monthlyRevenue', label: 'Faturamento médio mensal', unit: 'R$', placeholder: 'Ex.: 10.000,00', hint: 'Média de vendas. Deve ser maior que zero.' },
    ],
  },
  {
    title: 'Despesas e lucro sobre a venda', icon: 'percent', fields: [
      { name: 'variableExpenses', label: 'Despesas variáveis', unit: '%', placeholder: 'Ex.: 5', hint: 'Ex.: taxas de venda e comissões.' },
      { name: 'profit', label: 'Lucro desejado', unit: '%', placeholder: 'Ex.: 30', hint: 'Parcela do preço que será seu lucro.' },
    ],
  },
]
const fields = fieldGroups.flatMap((group) => group.fields)
const percentageFields: Field[] = ['monthlyFixedExpenses', 'monthlyRevenue', 'variableExpenses', 'profit']

export default function PricingCalculatorPage() {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof calculateMarkup>>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const numbers = {
    materialCost: parsePricingNumber(values.materialCost),
    productionHours: parsePricingNumber(values.productionHours),
    hourlyRate: parsePricingNumber(values.hourlyRate),
    monthlyFixedExpenses: parsePricingNumber(values.monthlyFixedExpenses),
    monthlyRevenue: parsePricingNumber(values.monthlyRevenue),
    variableExpenses: parsePricingNumber(values.variableExpenses),
    profit: parsePricingNumber(values.profit),
  }
  const errors = Object.fromEntries(fields.map(({ name }) => {
    const value = numbers[name]
    let error = ''
    if (value === null) error = values[name].trim() ? 'Informe um número válido, maior ou igual a zero. Ex.: 1000,50 ou 1.000,50.' : 'Preencha este campo.'
    else if (name === 'monthlyRevenue' && value <= 0) error = 'Informe um faturamento maior que zero.'
    else if ((name === 'variableExpenses' || name === 'profit') && value >= 100) error = 'Informe um percentual menor que 100%.'
    return [name, error]
  })) as Record<Field, string>

  const { materialCost, productionHours, hourlyRate, monthlyFixedExpenses, monthlyRevenue, variableExpenses, profit } = numbers
  const fixedRatio = monthlyFixedExpenses !== null && monthlyRevenue !== null && monthlyRevenue > 0
    ? monthlyFixedExpenses / monthlyRevenue * 100 : null
  const fixedPercentage = fixedRatio !== null && Number.isFinite(fixedRatio) ? fixedRatio : null
  const totalPercentage = fixedPercentage !== null && variableExpenses !== null && profit !== null
    ? fixedPercentage + variableExpenses + profit : null
  const invalidTotal = totalPercentage !== null && totalPercentage >= 100
  const directCost = materialCost !== null && productionHours !== null && hourlyRate !== null
    ? materialCost + productionHours * hourlyRate : null
  if (directCost === 0) errors.materialCost = 'O custo de material mais a mão de obra deve ser maior que zero.'

  const calculated = materialCost !== null && productionHours !== null && hourlyRate !== null && monthlyFixedExpenses !== null
    && monthlyRevenue !== null && variableExpenses !== null && profit !== null
    ? calculateMarkup({ materialCost, productionHours, hourlyRate, monthlyFixedExpenses, monthlyRevenue, variableExpenses, profit }) : null
  const hasFieldErrors = fields.some(({ name }) => Boolean(errors[name]))
  const calculationError = !hasFieldErrors && !invalidTotal && !calculated
    ? 'Os valores informados são grandes demais para calcular. Reduza os valores e tente novamente.' : ''
  const isExample = result !== null && fields.every(({ name }) => values[name] === exampleValues[name])
  const breakdown = result ? [
    { label: 'Materiais', detail: 'Por unidade', amount: result.materialCost, className: 'materials' },
    { label: 'Mão de obra', detail: `${decimal.format(result.productionHours)} ${result.productionHours === 1 ? 'hora' : 'horas'} × ${currency.format(result.hourlyRate)}`, amount: result.laborCost, className: 'labor' },
    { label: 'Despesas fixas', detail: `${formatPercentage(result.fixedPercentage)}% do preço`, amount: result.fixedExpensesAmount, className: 'fixed' },
    { label: 'Despesas variáveis', detail: `${formatPercentage(result.variableExpenses)}% do preço`, amount: result.variableExpensesAmount, className: 'variable' },
    { label: 'Lucro desejado', detail: `${formatPercentage(result.profit)}% do preço`, amount: result.profitAmount, className: 'profit' },
  ] : []

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setResult(calculated)
    const firstInvalid = fields.find(({ name }) => errors[name])?.name
      ?? (invalidTotal ? 'monthlyFixedExpenses' : calculationError ? 'materialCost' : null)
    if (firstInvalid) {
      const input = formRef.current?.elements.namedItem(firstInvalid)
      if (input instanceof HTMLInputElement) input.focus()
    }
  }

  function useExample() {
    setValues(exampleValues)
    setTouched({})
    setSubmitted(false)
    setResult(calculateMarkup(Object.fromEntries(fields.map(({ name }) => [name, parsePricingNumber(exampleValues[name])])) as MarkupInput))
  }

  function clearFields() {
    setValues({
      materialCost: '', productionHours: '', hourlyRate: '', monthlyFixedExpenses: '',
      monthlyRevenue: '', variableExpenses: '', profit: '',
    })
    setTouched({})
    setSubmitted(false)
    setResult(null)
    const input = formRef.current?.elements.namedItem('materialCost')
    if (input instanceof HTMLInputElement) input.focus()
  }

  return (
    <>
      <Header initialActiveLink="#/calculadora" />
      <main className="markup-page">
        <div className="markup-shell">
          <header className="markup-heading">
            <span className="markup-heading-icon"><Icon name="calculator" /></span>
            <div>
              <h1>Calculadora de precificação</h1>
              <p>Valorize seu trabalho. Encontre um preço que cubra seus custos e seu lucro.</p>
            </div>
          </header>

          <div className="markup-layout">
            <section className="markup-form-panel" aria-labelledby="markup-form-title">
              <div className="markup-panel-heading">
                <h2 id="markup-form-title">Vamos calcular?</h2>
                <button className="markup-example" type="button" onClick={useExample}>Usar exemplo</button>
              </div>

              <form ref={formRef} className="markup-form" onSubmit={calculate} autoComplete="off" noValidate>
                {fieldGroups.map((group) => (
                  <fieldset className="markup-field-group" key={group.title}>
                    <legend><Icon name={group.icon} /> {group.title}</legend>
                    {group.fields.map(({ name, label, unit, hint, placeholder }) => {
                      const error = touched[name] || submitted ? errors[name] : ''
                      const hasTotalError = percentageFields.includes(name) && invalidTotal
                      return (
                        <div className="markup-field" key={name}>
                          <label htmlFor={`markup-${name}`}>{label}</label>
                          <div className={`markup-input-wrap${error ? ' has-error' : ''}`}>
                            {unit === 'R$' && <span id={`markup-${name}-unit`}>R$</span>}
                            <input
                              id={`markup-${name}`}
                              name={name}
                              type="text"
                              inputMode="decimal"
                              maxLength={20}
                              value={values[name]}
                              placeholder={placeholder}
                              required
                              aria-invalid={Boolean(error) || hasTotalError}
                              aria-describedby={`markup-${name}-unit markup-${name}-hint${error ? ` markup-${name}-error` : ''}${hasTotalError ? ' markup-total-error' : ''}`}
                              onChange={(event) => {
                                setValues((previous) => ({ ...previous, [name]: event.target.value }))
                                setResult(null)
                              }}
                              onBlur={() => setTouched((previous) => ({ ...previous, [name]: true }))}
                            />
                            {unit !== 'R$' && <span id={`markup-${name}-unit`}>{unit}</span>}
                          </div>
                          <p id={`markup-${name}-hint`} className="markup-hint">{hint}</p>
                          {error && <p id={`markup-${name}-error`} className="markup-error">{error}</p>}
                        </div>
                      )
                    })}
                    {group.icon === 'store' && (
                      <div className="markup-fixed-percentage">
                        <span>Despesas fixas ÷ faturamento × 100</span>
                        <strong>{fixedPercentage !== null ? `${formatPercentage(fixedPercentage)}%` : '—'}</strong>
                      </div>
                    )}
                  </fieldset>
                ))}

                <div className="markup-total-section">
                  <div className={`markup-total${invalidTotal ? ' has-error' : ''}`}>
                    <span>{totalPercentage !== null
                      ? `Fixas ${formatPercentage(fixedPercentage!)}% + variáveis ${formatPercentage(variableExpenses!)}% + lucro ${formatPercentage(profit!)}%`
                      : 'Despesas fixas + variáveis + lucro'}</span>
                    <strong>{totalPercentage !== null ? `${formatPercentage(totalPercentage)}%` : '—'}</strong>
                  </div>
                  {invalidTotal ? (
                    <p id="markup-total-error" className="markup-error" role="alert">A soma deve ficar abaixo de 100%. Revise as despesas, o faturamento ou o lucro desejado.</p>
                  ) : <p className="markup-hint">A soma deve ficar abaixo de 100% para calcular o preço.</p>}
                  {submitted && calculationError && <p className="markup-error" role="alert">{calculationError}</p>}
                </div>
                <div className="markup-form-actions">
                  <button className="markup-submit" type="submit"><Icon name="calculator" /> Calcular preço de venda</button>
                  <button className="markup-clear" type="button" onClick={clearFields}><Icon name="trash" /> Limpar campos</button>
                </div>
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
                  <p>{result ? 'Preço sugerido com os custos e percentuais informados.' : invalidTotal
                    ? 'Ajuste os percentuais para calcular o preço.' : calculated
                      ? 'Clique em calcular para atualizar o preço.' : 'Preencha os campos e clique em calcular para ver seu preço.'}</p>
                </div>
                <div className="markup-multiplier"><span>Multiplicador markup</span><strong>{result ? `${decimal.format(result.multiplier)}×` : '—'}</strong></div>
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
                ) : <p className="markup-empty">Calcule seu preço para ver os materiais, a mão de obra, as despesas e o lucro de cada unidade.</p>}
              </section>
              <p className="markup-local-note"><Icon name="shieldCheck" /><span>Seus valores ajudam a planejar uma venda que remunera seu trabalho e mantém o negócio saudável.</span></p>
            </aside>
          </div>

          <section className="markup-guide" aria-labelledby="markup-guide-title">
            <h2 id="markup-guide-title"><Icon name="information" /> Como chegamos a esse preço</h2>
            <p className="markup-formula">Preço = [(material + horas × valor da hora) × 100] ÷ [100 − ((despesas fixas mensais ÷ faturamento mensal × 100) + variáveis % + lucro %)]</p>
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
          </section>
          <p className="markup-disclaimer">Simulação ilustrativa por unidade. Ajuste os valores à realidade do seu negócio.</p>
        </div>
      </main>
      <Footer />
    </>
  )
}
